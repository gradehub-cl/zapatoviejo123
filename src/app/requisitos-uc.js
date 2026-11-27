// ─── REQUISITOS UC ───────────────────────────────────────────────────────────
// Lee los prerrequisitos que publica el catálogo UC (catalogo.uc.cl,
// view=requisitos) y dice si alguien los cumple con su historial. Es para la
// toma de ramos en «Arma tu próximo semestre», solo en la app.
//
// Solo AVISA, nunca bloquea: la que decide es la UC, y hay convalidaciones,
// casos por malla y excepciones que no vemos. Por eso:
// - Las restricciones (programa, créditos) no se evalúan: se muestran tal cual.
//   Con relación «o», cumplir la restricción reemplaza a los prerrequisitos.
// - Sin semestres anteriores con sigla no se dice «te falta»: sería decirle a
//   alguien de cuarto año que le falta Cálculo I. Se pide pegar el avance.
// - Un texto que no se entiende no se adivina: queda «ilegible» con el texto.
//
// Formato del catálogo (revisado el 2026-11-21 con MAT1620, IIC2133, ICS2523,
// FIS1514 e IIC2343):
//   prerrequisitos  «(IIC1253 y IIC2233) o ICS2122», «FIS0154(c) y MAT1610»
//   relación        «y», «o» o «No tiene»
//   restricciones   «(Programa=Lic en Ing Cs de Datos) o (…)» o «No tiene»
//   equivalencias   «(FIS1513 o ICE1513 o ICE1514)» o «No tiene»
// «(c)» es correquisito: vale haberlo aprobado o tomarlo el mismo semestre.
//
// El motor es puro salvo `requisitosDesdeEstado`, que lee S. No toca el DOM,
// la red ni `gradehub_v1`.
const REQ_TOKEN_RE=/\s*(?:([A-Za-z]{2,4}[0-9]{3,4}[A-Za-z]?)(\s*\(\s*c\s*\))?|(\()|(\))|([^\s()]+))/y;
const REQ_SIGLAS_RE=/(?<![A-Za-z0-9])[A-Za-z]{2,4}[0-9]{3,4}[A-Za-z]?(?![A-Za-z0-9])/g;
const REQ_ORDEN={ok:0,si_apruebas:1,falta:2};

function requisitosTextoLimpio(texto){
  const t=String(texto??'').replace(/&nbsp;| /gi,' ').replace(/\s+/g,' ').trim();
  return !t||/^no tiene$/i.test(t)?'':t;
}

// Tokens: {sigla,co} | 'y' | 'o' | '(' | ')'. null si aparece algo que no es
// sigla ni conector: mejor «ilegible» que una regla inventada.
function requisitosTokens(texto){
  const t=requisitosTextoLimpio(texto),out=[];
  REQ_TOKEN_RE.lastIndex=0;
  while(REQ_TOKEN_RE.lastIndex<t.length){
    const m=REQ_TOKEN_RE.exec(t);
    if(!m)return null;
    if(m[1])out.push({sigla:m[1].toUpperCase(),co:!!m[2]});
    else if(m[3])out.push('(');
    else if(m[4])out.push(')');
    else{
      const w=m[5].toLowerCase();
      if(w!=='y'&&w!=='o')return null;
      out.push(w);
    }
  }
  return out;
}

// «y» amarra más que «o», como en el catálogo. Nodos del mismo tipo se aplanan.
// Devuelve {arbol}: null es «sin prerrequisitos». Devuelve null si no se pudo leer.
function requisitosLeer(texto){
  const tokens=requisitosTokens(texto);
  if(tokens===null)return null;
  if(!tokens.length)return {arbol:null};
  let i=0;
  const unir=(tipo,partes)=>partes.length===1?partes[0]:{tipo,partes:partes.flatMap(p=>p.tipo===tipo?p.partes:[p])};
  const factor=()=>{
    const t=tokens[i];
    if(t&&typeof t==='object'){i++;return {tipo:'curso',sigla:t.sigla,co:t.co};}
    if(t==='('){
      i++;
      const e=expr();
      if(!e||tokens[i]!==')')return null;
      i++;
      return e;
    }
    return null;
  };
  const cadena=(tipo,sub)=>()=>{
    const partes=[sub()];
    if(!partes[0])return null;
    while(tokens[i]===tipo){
      i++;
      const p=sub();
      if(!p)return null;
      partes.push(p);
    }
    return unir(tipo,partes);
  };
  const termino=cadena('y',factor);
  const expr=cadena('o',termino);
  const arbol=expr();
  return arbol&&i===tokens.length?{arbol}:null;
}

function requisitosSiglasDe(texto){
  return [...new Set((requisitosTextoLimpio(texto).match(REQ_SIGLAS_RE)||[]).map(s=>s.toUpperCase()))];
}

// Equivalencias en las dos direcciones y a un solo paso: si MAT1620 dice que
// equivale a MAT1512, un MAT1512 aprobado cuenta como MAT1620 y al revés. No
// se encadenan (A≡B y B≡C no hace A≡C): eso ya sería interpretar al catálogo.
function requisitosEquivalencias(filas){
  const mapa=new Map();
  const agregar=(a,b)=>{if(a===b)return;if(!mapa.has(a))mapa.set(a,new Set());mapa.get(a).add(b);};
  for(const f of filas||[]){
    const sigla=f&&typeof f.sigla==='string'?f.sigla.trim().toUpperCase():'';
    if(!sigla)continue;
    for(const otra of requisitosSiglasDe(f.equivalencias)){agregar(sigla,otra);agregar(otra,sigla);}
  }
  return mapa;
}

function requisitosTiene(sigla,conjunto,equivalencias){
  if(!conjunto||!conjunto.size)return false;
  if(conjunto.has(sigla))return true;
  const eq=equivalencias&&equivalencias.get(sigla);
  return !!eq&&[...eq].some(s=>conjunto.has(s));
}

// Cada nodo vale 'ok', 'si_apruebas' (lo estás cursando: cumples si lo
// apruebas) o 'falta'. En un «o» se elige la opción más cercana a cumplirse.
function requisitosNodo(n,c){
  if(n.tipo==='curso'){
    if(requisitosTiene(n.sigla,c.aprobadas,c.equivalencias))return {estado:'ok',faltan:[],cursando:[]};
    if(n.co&&requisitosTiene(n.sigla,c.enPlan,c.equivalencias))return {estado:'ok',faltan:[],cursando:[]};
    if(requisitosTiene(n.sigla,c.cursando,c.equivalencias))return {estado:'si_apruebas',faltan:[],cursando:[n.sigla]};
    return {estado:'falta',faltan:[{sigla:n.sigla,co:n.co}],cursando:[]};
  }
  const hijos=n.partes.map(p=>requisitosNodo(p,c));
  if(n.tipo==='y'){
    const peor=hijos.reduce((a,h)=>REQ_ORDEN[h.estado]>REQ_ORDEN[a]?h.estado:a,'ok');
    return {estado:peor,otrasOpciones:hijos.some(h=>h.otrasOpciones),
      faltan:peor==='falta'?hijos.flatMap(h=>h.faltan):[],
      cursando:peor==='ok'?[]:hijos.flatMap(h=>h.cursando)};
  }
  const costo=h=>REQ_ORDEN[h.estado]*1000+h.faltan.length*10+h.cursando.length;
  const mejor=hijos.reduce((a,h)=>costo(h)<costo(a)?h:a);
  return {...mejor,otrasOpciones:mejor.estado!=='ok'&&hijos.length>1};
}

// fila: {sigla, prerrequisitos, relacion, restricciones, equivalencias}, la
// forma de la tabla del catálogo. contexto: Sets de siglas `aprobadas`,
// `cursando` (este semestre) y `enPlan` (lo que eligió para el próximo), el
// mapa de `requisitosEquivalencias` y `conHistorial`.
//
// estado: 'sin_datos' | 'sin_requisitos' | 'ilegible' | 'sin_historial' |
//         'cumple' | 'si_apruebas' | 'falta'
function evaluarRequisitosUC(fila,contexto={}){
  const sigla=fila&&typeof fila.sigla==='string'?fila.sigla.trim().toUpperCase():null;
  if(!sigla)return {sigla:null,estado:'sin_datos',faltan:[],cursando:[],otrasOpciones:false,restriccion:null,texto:''};
  const texto=requisitosTextoLimpio(fila.prerrequisitos);
  const textoRestriccion=requisitosTextoLimpio(fila.restricciones);
  const relacion=requisitosTextoLimpio(fila.relacion).toLowerCase();
  const restriccion=textoRestriccion?{texto:textoRestriccion,relacion:relacion==='o'||relacion==='y'?relacion:null}:null;
  const base={sigla,faltan:[],cursando:[],otrasOpciones:false,restriccion,texto};
  const leido=requisitosLeer(texto);
  if(!leido)return {...base,estado:'ilegible'};
  if(!leido.arbol)return {...base,estado:'sin_requisitos'};
  if(!contexto.conHistorial)return {...base,estado:'sin_historial'};
  const r=requisitosNodo(leido.arbol,{
    aprobadas:contexto.aprobadas||new Set(),cursando:contexto.cursando||new Set(),
    enPlan:contexto.enPlan||new Set(),equivalencias:contexto.equivalencias||new Map()});
  return {...base,estado:r.estado==='ok'?'cumple':r.estado,
    faltan:r.faltan,cursando:[...new Set(r.cursando)],otrasOpciones:!!r.otrasOpciones};
}

// La sigla UC de un ramo guardado. Lo que llega desde el avance o la ficha
// trae `origen:{manual:true}` sin universidad, y `siglaReporteUC` lo descarta
// por no tener `origen.tenant`: ahí manda la universidad de la cuenta.
function requisitosSiglaUC(r,tenantCuenta){
  if(!r)return null;
  const tenant=(r.origen&&r.origen.tenant)||(r.cierre&&r.cierre.tenant)||tenantCuenta;
  if(tenant!=='uc')return null;
  return siglaConForma(r.sigla)||siglaReporteUC(r.origen&&r.origen.tenant?r:{...r,origen:undefined});
}

// Lo que ya aprobó, desde los semestres archivados: nota final oficial igual
// o sobre la de aprobación de la universidad del ramo. Las convalidaciones que
// el avance descarta no están: por eso esto avisa y no bloquea.
// Un ramo archivado sin nota final (se archivó antes de la última nota) no
// está aprobado ni reprobado: va en `pendientes` y se trata como cursando.
// La toma de ramos llega antes que las últimas notas (Lucas, 2026-11-23).
function requisitosAprobadasDelHistorial(historial,tenantCuenta){
  const aprobadas=new Set(),pendientes=new Set();
  let conSigla=false;
  for(const h of historial||[]){
    const ramos=(h&&h.ramos)||[];
    for(const r of ramos){
      const sigla=requisitosSiglaUC(r,tenantCuenta);
      if(!sigla)continue;
      conSigla=true;
      const nota=notaRamoParaResumen(r,ramos);
      if(nota===null||nota===undefined||!Number.isFinite(nota)){pendientes.add(sigla);continue;}
      const reglas=gh_reglasNota((r.origen&&r.origen.tenant)||(r.cierre&&r.cierre.tenant)||'uc');
      if(gh_notaOficial(nota,reglas)>=reglas.passing_grade)aprobadas.add(sigla);
    }
  }
  aprobadas.forEach(x=>pendientes.delete(x));
  return {aprobadas,pendientes,conHistorial:conSigla};
}

function requisitosDesdeEstado(estado){
  const e=estado||S;
  const {aprobadas,pendientes,conHistorial}=requisitosAprobadasDelHistorial(e.historial,e.tenant);
  const cursando=new Set([...pendientes,...(e.ramos||[]).map(r=>requisitosSiglaUC(r,e.tenant)).filter(Boolean)]);
  // En el primer semestre de la carrera no hay semestres pasados que cargar:
  // lo que cursa basta para decir «cumples si apruebas MAT1610».
  const primerSemestre=Number(e.careerSemestre)===1&&cursando.size>0;
  return {aprobadas,cursando,conHistorial:conHistorial||primerSemestre};
}
