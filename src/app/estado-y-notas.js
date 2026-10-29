
// ─── ESTADO ──────────────────────────────────────────────────────────────────
let S={ramos:[],userName:'',careerSemestre:1,carrera:null,tenant:'fen',onboardingDone:false,historial:[],sortMode:'manual',modo:'sistema',acento:'turquesa',fondo:'neutro'};
let currentRamoId=null,openCats={},selectedSem=1,selectedCarrera=null,selectedCarreraNombre=null,carreraFiltro='',modalColor=COLORS[0];
let openHist={};

let _toastTimer=null;
function showToast(msg,isError=false){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.style.background=isError?'var(--red)':'var(--fg)';
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}
// ¿Está disponible localStorage? (en sandbox/preview o navegación privada puede estar bloqueado)
let _storageOK=true;
try{const k='__fen_test__';localStorage.setItem(k,'1');localStorage.removeItem(k);}
catch(e){_storageOK=false;}

function save(){
  // Se sella acá y no solo al cargar: un ramo agregado en esta sesión, o uno
  // cuya sigla recién se pudo resolver porque el catálogo terminó de bajarse al
  // buscar, quedan con el dato guardado en el momento en que se supo, sin
  // esperar a la próxima visita.
  (S.ramos||[]).forEach(r=>sellarDatosCatalogo(r));
  if(_storageOK){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(S));
      // S y la base de esta pestaña viajan juntas (ver leerBaseSync).
      if(typeof escribirBaseEnDisco==='function')escribirBaseEnDisco();
    }catch(e){
      const lleno = e && (e.name==='QuotaExceededError' || e.code===22 || e.code===1014 || /quota|exceeded/i.test(e.message||''));
      if(lleno){
        // showToast escribe con textContent: un <svg> acá salía como texto.
        showToast('El navegador se quedó sin espacio. Tus cambios se respaldan en la nube, pero no en este dispositivo.',true);
      }else{
        // localStorage dejó de estar disponible → seguimos en memoria + nube, sin spamear
        _storageOK=false;
        console.warn('localStorage no disponible:',e);
      }
    }
  }
  syncToCloud();
  publicarResumenWidgets();
  // Una pauta que la persona acaba de terminar también puede sumar al
  // consenso durante esta visita; no necesita cerrar y volver a entrar.
  if(!_suspenderAportePautas&&typeof currentUser!=='undefined'&&currentUser&&typeof supabaseClient!=='undefined'&&supabaseClient&&S.onboardingDone){
    clearTimeout(_aportePautasTimer);
    _aportePautasTimer=setTimeout(()=>{aportarPautasAlCatalogo().catch(()=>{});},1200);
  }
}
let _aportePautasTimer=null;
let _suspenderAportePautas=false;
let _aportePautasEnCurso=null;
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
// Los ids se interpolan dentro de atributos onclick ("toggleCat('<id>')"), así
// que un id con comillas se sale de la llamada y el resto se ejecuta como JS.
// `uid()` solo produce [a-z0-9], pero un id NO siempre lo genera la app: al
// importar un respaldo se conserva el que venga en el JSON, y `esExportValido`
// solo comprueba que `ramos` sea un arreglo. Pegar un respaldo ajeno bastaba
// para ejecutar código con la sesión de Supabase en localStorage.
//
// Se saneia en la frontera: un id que no calce se reemplaza por uno nuevo. Es
// preferible a escapar en cada uno de los 30 sitios de render, porque olvidar
// uno vuelve a abrir el agujero entero.
// La expresión va adentro a propósito: `normalize` se ejecuta al cargar los
// datos, antes de que este trozo del archivo se haya evaluado, y un `const`
// externo estaría en zona muerta temporal. Reventaría el arranque de la app.
function idSeguro(v){return (typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v))?v:uid();}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// Redondea a 2 decimales para evitar errores de punto flotante en comparaciones
function r2(n){return Math.round(n*100)/100;}
// La nota final oficial se redondea a una décima antes de decidir su estado:
// 3,94 queda en 3,9 y 3,95 pasa a 4,0. `r2` sigue disponible para porcentajes y
// cuentas intermedias; no se usa para contradecir la nota que ve la persona.
// Es la misma `gh_notaOficial` del motor, con las reglas de la universidad de
// la cuenta (GH_REGLAS_NOTA_POR_TENANT): en la UAndes 3,946 → 3,95 → 4,0. Lleva
// el margen de punto flotante: un 3,95 exacto que llega como 3,9499999… es 4,0.
function notaFinalOficial(n){return n===null||isNaN(n)?null:gh_notaOficial(Number(n),gh_reglasNota(S.tenant));}
// La nota que necesitas se redondea HACIA ARRIBA, nunca al más cercano.
//
// Con `nf()` la app podía decirte un número menor al que de verdad hace falta:
// si necesitabas 3,80357 mostraba "3,8", y 3,8 no alcanza. Lucas lo pilló en
// Dinámica — la ficha decía 3,7, simuló 3,7 en todo y sacó 3,9.
//
// Es el peor error posible en la pregunta que la app existe para responder: no
// se equivoca avisando de más, se equivoca dejándote reprobar mientras te dice
// que vas bien. Media décima de más nunca hace daño; media décima de menos sí.
//
// La calculadora ya lo hacía —"nunca una nota menor a la que calcula el
// motor"— y el resto de la app no. El epsilon evita que un 3,7000000001 de
// punto flotante se muestre como 3,8.
function nfNecesaria(n){
  if(n===null||n===undefined||isNaN(n))return '\u00b7';
  return (Math.ceil((Number(n)-1e-9)*10)/10).toFixed(1);
}
function nivelNota(n){
  const v=notaFinalOficial(n);
  if(v===null)return'neutral';
  return v>=5.0?'good':v>=4.0?'warn':'bad';
}
function notaAprobada(n){return nivelNota(n)==='warn'||nivelNota(n)==='good';}
function fmtPromedio(n){
  const v=notaFinalOficial(n);return v===null?'·':v.toFixed(1);
}
// El semáforo conserva sus categorías: una nota bajo 4,0 no puede parecerse a
// una aprobada. Dentro de cada categoría sí graduamos el color para que 1,0 y
// 3,9, por ejemplo, no se sientan igual de urgentes.
function colorClass(n){return nivelNota(n);}
function notaHue(n){
  const v=Math.max(1,Math.min(7,Number(n)));
  // Tres bandas semánticas, con saltos visibles al aprobar (4,0) y al salir
  // de la zona de riesgo (5,0). 1,0→0° rojo; 4,0→48° ámbar; 6,0→142° verde.
  //
  // El verde llega a su tope en 6,0, no en 7,0: un 7 es excepcional, y
  // reservarle el mejor verde dejaba a todas las notas que sí se sacan los
  // estudiantes en verdes apagados. De 6,0 a 7,0 el color se queda arriba.
  if(v<4)return(v-1)*18/3;
  if(v<5)return 48+(v-4)*12;
  return 105+Math.min(v-5,1)*37;
}
function notaUrgente(n){return Number(n)<=1.05;}
function notaPerfecta(n){return Number(n)>=6.95;}
function claseNotaEspecial(n){return notaUrgente(n)?' grade-urgent':notaPerfecta(n)?' grade-perfect':'';}
function getColor(n){
  if(n===null||isNaN(n))return'var(--fg3)';
  if(notaUrgente(n))return'hsl(352 100% var(--grade-urgent-light))';
  // El 7,0 NO cambia de matiz: se queda en el verde de aprobado, más vivo. El
  // oro que tenía antes era hsl(43…), el mismo matiz exacto que el ámbar de "al
  // borde" (#ffc94d es hue 42°), así que la nota perfecta se pintaba del color
  // del peligro. El adorno dorado ahora va en un anillo alrededor, en styles.css:
  // rodea el número pero nunca lo colorea, y por eso no puede confundirse con un
  // estado.
  if(notaPerfecta(n))return'hsl(142 92% var(--grade-perfect-light))';
  const h=notaHue(notaFinalOficial(n)).toFixed(1);
  return`hsl(${h} 84% ${luzNotaLegible(Number(h))})`;
}
// Una sola luminosidad para todos los matices no se lee igual: a 30% el rojo da
// 5,6:1 sobre blanco y el ámbar o el verde de un 4,5 apenas 3,1:1 sobre
// Pizarra (HIG: texto ≥ 4,5:1). Cada matiz baja en claro —o sube en oscuro— lo
// justo para llegar a 4,5:1 sobre las superficies de todos los fondos; el matiz,
// y con él lo que significa el color, no cambia. Sigue leyendo --grade-light,
// así el número cambia solo cuando el sistema pasa de claro a oscuro:
// --grade-claro vale 1 en claro y 0 en oscuro, y anula el límite que no toca.
const _luzNota=new Map();
function luzNotaLegible(h){
  if(_luzNota.has(h))return _luzNota.get(h);
  const lin=x=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};
  const lum=rgb=>0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2]);
  const rgbHsl=l=>{const s=0.84,L=l/100,a=s*Math.min(L,1-L),k=m=>(m+h/30)%12;
    return [0,8,4].map(m=>Math.round(255*(L-a*Math.max(-1,Math.min(k(m)-3,9-k(m),1)))));};
  const superficies=modo=>Object.values(FONDOS).flatMap(f=>['bg','bg2','card'].map(s=>{const c=f[modo][s];return lum([1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));}));
  const legible=(l,modo)=>{const y=lum(rgbHsl(l));return superficies(modo).every(z=>(Math.max(y,z)+0.05)/(Math.min(y,z)+0.05)>=4.55);};
  let claro=30,oscuro=62;
  while(claro>0&&!legible(claro,'claro'))claro=Math.round((claro-0.5)*10)/10;
  while(oscuro<100&&!legible(oscuro,'oscuro'))oscuro=Math.round((oscuro+0.5)*10)/10;
  let luz='var(--grade-light)';
  if(claro<30)luz=`min(${luz}, calc(${claro}% + (1 - var(--grade-claro)) * 100%))`;
  if(oscuro>62)luz=`max(${luz}, calc(${oscuro}% - var(--grade-claro) * 100%))`;
  _luzNota.set(h,luz);
  return luz;
}
function fmt(n){return n===null?'·':n.toFixed(1);}
// Formato numérico con 1 decimal por defecto (usa punto, no coma)
function nf(n,dec){return n.toFixed(dec==null?1:dec);}
