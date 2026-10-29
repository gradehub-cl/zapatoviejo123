
// ─── SINCRONIZACIÓN SIN PÉRDIDAS ─────────────────────────────────────────────
// Hasta el 2026-09-29, al abrir la app la nube pisaba la copia local, y cada
// subida reemplazaba el documento entero. Así se perdían notas en dos casos
// reales, reproducidos con las funciones de verdad:
//   1. Una nota anotada sin conexión no alcanzaba a subir. Al reabrir con red,
//      la nube —sin esa nota— reemplazaba la copia local. Abrir la app sin
//      internet ya lo provocaba: supabase-js viene de un CDN que no se cachea,
//      así que la app arranca sin sesión y nada de esa visita se sube.
//   2. Una pestaña abierta desde la mañana subía su copia vieja completa y
//      borraba lo que se había anotado en el celular entremedio.
//
// Ahora cada dispositivo recuerda la última versión de la nube que vio (la
// BASE, en SYNC_BASE_KEY) y la nube lleva un número de versión, `_rev`, DENTRO
// del mismo JSON: no hay columna nueva ni migración, y quien lea `data` (la
// agenda .ics, las estadísticas públicas, los agentes) sigue igual.
//   · Al entrar: si la nube sigue en la versión de la base, nadie más escribió:
//     manda lo local y, si difiere, se sube. Si otro dispositivo escribió, se
//     fusionan las tres copias (base, local, nube).
//   · Al subir: la escritura es condicional ("solo si la nube sigue en mi
//     versión"). Si chocó, se baja la nube, se fusiona y se reintenta.
// La fusión no borra nada que no se haya borrado a propósito: lo agregado en
// cualquiera de los dos lados se queda; lo que un lado borró se va solo si el
// otro no lo tocó; si los dos cambiaron el mismo dato, gana este dispositivo,
// que es lo que la persona tiene en pantalla.
const SYNC_BASE_KEY='gradehub_v1_base';
const clonarSync=x=>x==null?x:JSON.parse(JSON.stringify(x));
// El orden de las claves no cuenta: la copia del disco se carga con
// normalize(JSON.parse(...)) y la nube con normalize({...freshState(),...}), así
// que traen las mismas claves en otro orden. Compararlas como texto las veía
// distintas y cada apertura subía una copia idéntica. El de las listas sí
// cuenta (el orden de los ramos lo elige la persona).
const ordenSync=v=>Array.isArray(v)?v.map(ordenSync)
  :v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=ordenSync(v[k]),o),{}):v;
const igualSync=(a,b)=>JSON.stringify(ordenSync(a))===JSON.stringify(ordenSync(b));
// Qué evaluaciones tiene cada ramo y cuánto pesan: lo que cambia cuando
// normalize() corrige una pauta. No mira notas ni campos que normalize()
// completa por defecto, así un ramo antiguo no se sube en cada arranque.
function firmaEstructuraSync(d){
  const ramos=d&&Array.isArray(d.ramos)?d.ramos:[];
  return JSON.stringify(ramos.map(r=>[r&&r.id,(r&&Array.isArray(r.categorias)?r.categorias:[]).map(c=>[c&&c.id,c&&c.peso])]));
}
const objetoSync=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
function sinRevSync(x){if(!objetoSync(x))return x;const {_rev,...resto}=x;return resto;}
function revSync(x){return objetoSync(x)&&Number.isInteger(x._rev)?x._rev:null;}

// La base se guarda con su dueño: en un navegador compartido, la versión que
// vio otra cuenta no sirve para nada y no debe mezclarse.
//
// Y es la de ESTA pestaña. Dos pestañas del mismo navegador comparten
// localStorage: cuando cada una leía la base de ahí, la que tenía S viejo en
// memoria tomaba la versión que acababa de subir la otra, la escritura
// condicional pasaba y su documento entero borraba la nota ajena, también en
// la nube (issue #579). Ahora cada pestaña recuerda en memoria la versión de
// la que salió su S, y el disco guarda S junto con SU base: el próximo arranque
// compara lo que quedó escrito contra la versión de la que salió, aunque otra
// pestaña haya subido entremedio.
// undefined = esta pestaña todavía no la conoce y la lee del disco.
let _baseSesion;
function leerBaseSync(uid){
  if(_baseSesion!==undefined)return _baseSesion&&_baseSesion.owner===uid?_baseSesion.data:null;
  try{
    const b=JSON.parse(localStorage.getItem(SYNC_BASE_KEY)||'null');
    return b&&b.owner===uid&&objetoSync(b.data)?b.data:null;
  }catch(e){return null;}
}
function guardarBaseSync(uid,data){
  // Copia profunda: S suele compartir objetos con `data` (la nube recién
  // leída, o lo que se acaba de subir) y anotar una nota cambiaría la base.
  _baseSesion=data&&uid?{owner:uid,data:clonarSync(data)}:null;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));}catch(e){}
  escribirBaseEnDisco();
}
// La llama también save(), justo después de escribir S.
function escribirBaseEnDisco(){
  if(_baseSesion===undefined)return;
  try{
    if(_baseSesion)localStorage.setItem(SYNC_BASE_KEY,JSON.stringify(_baseSesion));
    else localStorage.removeItem(SYNC_BASE_KEY);
  }catch(e){}
}
// Quien escribe la base directo en el disco (registro, restaurar una copia
// apartada, cerrar sesión) hace que esta pestaña la vuelva a leer de ahí.
function olvidarBaseSesion(){_baseSesion=undefined;}

// Al entrar con la caché de la misma cuenta. `nube` ya viene normalizada;
// `crudo` es la fila tal como llegó, para revisar sus ids.
function reconciliarAlEntrar(uid,local,nube,crudo){
  const base=leerBaseSync(uid);
  const localSinRev=sinRevSync(local),nubeSinRev=sinRevSync(nube);
  if(igualSync(localSinRev,nubeSinRev))return {estado:nube,subir:false};
  // Se compara el CONTENIDO y no solo `_rev`: una pestaña con la versión
  // anterior de la app todavía abierta escribe sin subir el número.
  if(base&&igualSync(nubeSinRev,sinRevSync(base))){
    // Nadie escribió desde la última vez: lo distinto es de este dispositivo.
    return {estado:local,subir:true};
  }
  if(!base&&!idsCompletosSync(crudo)){
    // Primera vez con este código y una copia vieja con elementos sin id:
    // normalize() les inventa ids distintos en cada lado y fusionar duplicaría
    // notas. Se hace lo de antes: manda la nube.
    return {estado:nube,subir:false};
  }
  const fusion=normalize({...freshState(),...fusionarSync(base,local,nube)});
  return {estado:fusion,subir:!igualSync(sinRevSync(fusion),nubeSinRev)};
}
function idsCompletosSync(doc){
  const idOk=x=>x&&typeof x.id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(x.id);
  const lista=v=>Array.isArray(v)?v:[];
  const ramosOk=rs=>lista(rs).every(r=>idOk(r)&&lista(r.categorias).every(c=>idOk(c)&&lista(c.notas).every(idOk)));
  return objetoSync(doc)&&ramosOk(doc.ramos)&&lista(doc.historial).every(h=>idOk(h)&&ramosOk(h.ramos));
}

// Fusión de tres vías. Sin base (el primer arranque de un dispositivo con este
// código) no se sabe quién cambió qué: se suma lo que exista en cualquiera de
// las dos y, si un mismo dato difiere, manda la nube, como hacía la app antes.
function fusionarSync(base,local,nube){
  const fusion=fusionarValorSync(base||undefined,local,nube,base?'local':'nube');
  // El tipo de cuenta lo puede corregir el servidor. Una copia vieja del
  // teléfono no debe devolver a estudiante una cuenta ya convertida.
  if(objetoSync(fusion)&&objetoSync(nube)&&nube.tipoCuenta==='profesor')fusion.tipoCuenta='profesor';
  return fusion;
}
function fusionarValorSync(b,l,n,gana){
  if(igualSync(l,n))return l;
  if(b!==undefined&&igualSync(l,b))return n;     // solo cambió la nube
  if(b!==undefined&&igualSync(n,b))return l;     // solo cambió este dispositivo
  if(objetoSync(l)&&objetoSync(n))return fusionarObjetoSync(objetoSync(b)?b:{},l,n,gana);
  if(Array.isArray(l)&&Array.isArray(n)&&l.concat(n).some(x=>objetoSync(x)&&typeof x.id==='string'))
    return fusionarListaSync(Array.isArray(b)?b:[],l,n,gana);
  return gana==='local'?l:n;
}
function fusionarObjetoSync(b,l,n,gana){
  const out={};
  for(const k of new Set([...Object.keys(l),...Object.keys(n)])){
    if(k in l&&k in n)out[k]=fusionarValorSync(b[k],l[k],n[k],gana);
    else if(k in l){if(!(k in b&&igualSync(l[k],b[k])))out[k]=l[k];}  // la nube lo quitó sin que acá se tocara: se va
    else if(!(k in b&&igualSync(n[k],b[k])))out[k]=n[k];
  }
  return out;
}
// Ramos, categorías, notas y semestres archivados se emparejan por id. El
// orden es el de este dispositivo; lo que llegó de otro va al final.
function fusionarListaSync(b,l,n,gana){
  const porId=a=>new Map(a.filter(x=>objetoSync(x)&&typeof x.id==='string').map(x=>[x.id,x]));
  const B=porId(b),N=porId(n),vistos=new Set(),out=[];
  for(const x of l){
    if(!objetoSync(x)||typeof x.id!=='string'){out.push(x);continue;}
    vistos.add(x.id);
    if(N.has(x.id))out.push(fusionarValorSync(B.get(x.id),x,N.get(x.id),gana));
    else if(!(B.has(x.id)&&igualSync(x,B.get(x.id))))out.push(x);   // nuevo acá, o editado acá aunque allá se borró
  }
  for(const y of n){
    if(!objetoSync(y)||typeof y.id!=='string'||vistos.has(y.id))continue;
    if(!(B.has(y.id)&&igualSync(y,B.get(y.id))))out.push(y);         // nuevo en otro dispositivo
  }
  return out;
}
