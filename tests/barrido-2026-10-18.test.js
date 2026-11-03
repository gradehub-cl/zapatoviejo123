// Barrido del 2026-10-18. Datos sintéticos.
//
// 1. La Agenda decía "9 evaluaciónes sin fecha".
// 2. El recordatorio .ics de una evaluación sin hora sonaba DOS días antes, a
//    las 15:00, diciendo "Mañana": -P1DT9H son 33 horas antes de las 00:00.
// 3. El agente (MCP) daba como próxima una evaluación que ya tenía nota, y dos
//    pruebas del mismo día no salían por hora como en la Agenda.
// 4. Una casilla con fecha y sin nota contaba como nota: Inicio decía
//    "0% evaluado" y Archivar anunciaba notas que no existen.
// 5. La fecha de una evaluación (.cat-fecha-chip) quedaba en 4,25:1 con el
//    acento turquesa, el de siempre.
// 6. Pizarra y Papel oscuros ponían el texto terciario bajo 4,5:1 sobre muted.
//    Eso lo cubre temas.test.js.
const fs = require('fs'), vm = require('vm'), path = require('path');
const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

function classList(){const c=new Set();return{add(...x){x.forEach(v=>c.add(v));},remove(...x){x.forEach(v=>c.delete(v));},contains(v){return c.has(v);},toggle(){}};}
function el(){let html='';const attrs={};
  const nodo={style:{setProperty(){},removeProperty(){}},classList:classList(),children:[],textContent:'',value:'',dataset:{},
    addEventListener(){},appendChild(h){this.children.push(h);return h;},setAttribute(k,v){attrs[k]=String(v);},removeAttribute(k){delete attrs[k];},getAttribute(k){return attrs[k]||null;},
    querySelector(){return nodo;},querySelectorAll(){return [];},closest(){return null;},focus(){},select(){},click(){},remove(){},clientWidth:400};
  Object.defineProperty(nodo,'innerHTML',{get(){return html;},set(v){html=String(v);this.children=[];}});
  return nodo;}
const ids={};const byId=id=>ids[id]||(ids[id]=el());
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:byId,createElement:el,addEventListener(){},documentElement:el(),querySelector(){return el();},querySelectorAll(){return [];},body:el()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);
vm.runInContext(['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'].map(leer).join('\n'),ctx);
const run=c=>vm.runInContext(c,ctx);

console.log('\n=== Plural de "evaluación" en la Agenda ===');
const sinFecha=n=>run(`agendaSinFechaHTML(Array.from({length:${n}},(_,i)=>({cat:{nombre:'Control '+(i+1)},ramo:{nombre:'Ramo Sintético'}})))`);
chk('dos: "2 evaluaciones sin fecha"', sinFecha(2).includes('2 evaluaciones sin fecha'));
chk('uno: "1 evaluación sin fecha"', sinFecha(1).includes('1 evaluación sin fecha'));
chk('nunca "evaluaciónes"', !/evaluaciónes/.test(sinFecha(9)));

console.log('\n=== Recordatorio .ics: el día anterior a las 9:00 ===');
ctx.__ramos=JSON.stringify([{id:'r1',nombre:'Ramo Sintético',color:'#6d5dd3',creditos:null,origen:null,gates:[],categorias:[
  {id:'c1',nombre:'Prueba sin hora',peso:50,directNota:true,fecha:'2099-11-10',notas:[]},
  {id:'c2',nombre:'Prueba con hora',peso:50,directNota:true,fecha:'2099-11-12',hora:'10:00',notas:[]},
]}]);
run('S.ramos=JSON.parse(__ramos)');
const icsApp=run('buildICS()');
chk('exportar: sin hora, 15 horas antes de las 00:00', /DTSTART;VALUE=DATE:20991110[\s\S]*?TRIGGER:-PT15H/.test(icsApp));
chk('exportar: con hora, 24 horas antes', /DTSTART:20991112T100000[\s\S]*?TRIGGER:-P1D\r?\n/.test(icsApp));
chk('exportar: ya no hay alarmas de 33 horas', !/P1DT9H/.test(icsApp));
const feed=vm.runInNewContext(leer('functions/cal/[token].js').replace(/export async function/,'async function')+';({buildICS})',
  {TextEncoder,console,Date,URL,fetch:async()=>null,Response:class{}});
const icsFeed=feed.buildICS([{ramo:'Ramo Sintético',evaluacion:'Prueba',fecha:'2099-11-10',hora:null,peso:30}]);
chk('feed suscribible: sin hora, 15 horas antes', /TRIGGER:-PT15H/.test(icsFeed) && !/P1DT9H/.test(icsFeed));

console.log('\n=== Conteo de notas: una casilla con fecha no es una nota ===');
ctx.__ramos=JSON.stringify([{id:'r1',nombre:'Ramo Sintético',color:'#6d5dd3',creditos:null,origen:null,gates:[],categorias:[
  {id:'c1',nombre:'Controles',peso:100,slots:3,directNota:true,notas:[
    {id:'n1',nombre:'Control 1',valor:null,peso:1,slot:0,fecha:'2099-11-10'},
    {id:'n2',nombre:'Control 2',valor:null,peso:1,slot:1,fecha:'2099-11-17'},
  ]},
]}]);
run('S.ramos=JSON.parse(__ramos);S.historial=[]');
let confirmacion='';ctx.showConfirm=(t,m)=>{confirmacion=String(m);};
run('confirmArchiveSemester()');
chk('Archivar revisa las casillas vacías sin contarlas como notas', /Falta:/.test(byId('modal-content').innerHTML)&&/Control/.test(byId('modal-content').innerHTML)&&!run('revisionCierreSemestre({actual:true,ramos:S.ramos}).listo'));
run('renderHome()');
const lista=byId('home-ramos');
const html=(lista.children||[]).map(c=>c.innerHTML||'').join('')+lista.innerHTML;
chk('Inicio describe el ramo por sus evaluaciones, no "0% evaluado"', html.includes('1 evaluación') && !html.includes('0% evaluado'));

console.log('\n=== Fecha de la evaluación legible con todos los acentos ===');
const css=leer('styles.css');
const regla=(css.match(/\.cat-fecha-chip\{[^}]*\}/)||[''])[0];
const fondoPct=Number((regla.match(/background:color-mix\(in srgb,var\(--primary\),transparent (\d+)%\)/)||[])[1]);
const textoPct=Number((regla.match(/color:color-mix\(in srgb,var\(--primary\) (\d+)%,var\(--fg\)\)/)||[])[1]);
chk('el texto mezcla el acento con --fg', textoPct>0 && fondoPct>0);
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mezcla=(a,b,pa)=>a.map((x,i)=>x*pa+b[i]*(1-pa));
const lum=c=>{const v=c.map(x=>x/255).map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];};
const contraste=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
const acentos=run('ACENTOS'),fondos=run('FONDOS');
let peor=Infinity,donde='';
for(const [ak,a] of Object.entries(acentos))for(const [fk,f] of Object.entries(fondos))for(const modo of ['claro','oscuro']){
  const primary=rgb(modo==='claro'?a.primary:a.darkPrimary),sup=f[modo];
  const texto=mezcla(primary,rgb(sup.fg),textoPct/100);
  const fondo=mezcla(primary,rgb(sup.card),(100-fondoPct)/100);
  const r=contraste(texto,fondo);if(r<peor){peor=r;donde=`${ak}/${fk}/${modo}`;}
}
chk(`≥4,5:1 en todos los acentos y fondos (peor ${peor.toFixed(2)} en ${donde})`, Number.isFinite(peor) && peor>=4.5);

console.log('\n=== Lo que se toca mide 44 pt ===');
const tactiles=['.topbar-link','.settings-back','.settings-cerrar','.settings-privacy a','.error-brand'];
const bloque=(css.match(/content:"";position:absolute;left:0;right:0;top:50%;height:max\(100%,44px\)/)||[])[0];
const selectores=(css.match(/([^{}]+)\{\s*content:"";position:absolute;left:0;right:0;top:50%;height:max\(100%,44px\)/)||[])[1]||'';
chk('el área invisible de 44 pt existe', !!bloque);
tactiles.forEach(s=>chk(`${s} la usa`, selectores.split(',').map(x=>x.trim()).includes(s+'::after')));
const alto=(css.match(/([^{}]+)\{min-height:44px;\}/g)||[]).join(',');
['.settings-data-actions button','.settings-danger-btn','.horario-importar-link','.s-tenant-btn','.sem-btn','.carrera-opt']
  .forEach(s=>chk(`${s} mide al menos 44 px`, alto.includes(s)));
['preguntas.html','terminos.html','privacidad.html'].forEach(f=>
  chk(`${f}: "Volver a GradeHub" con área de 44 pt`, /\.volver::after\{[^}]*height:max\(100%,44px\)/.test(leer(f))));

(async()=>{
  console.log('\n=== El agente no da por próxima una evaluación con nota ===');
  const ctxMcp={console,Response,structuredClone,Date,Intl,HERRAMIENTAS:[],NOMBRES:['estado_semestre'],validarPropuestaRamos:()=>null,module:{exports:{}},exports:{}};
  const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(new Date());
  const enDias=n=>{const d=new Date(hoy+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const estado={ramos:[{id:'r1',nombre:'Ramo Sintético',gates:[],creditos:10,categorias:[
    {id:'c1',nombre:'Prueba ya corregida',peso:40,fecha:hoy,notas:[{id:'n1',nombre:'Prueba ya corregida',valor:5.5}]},
    {id:'c2',nombre:'Control de la tarde',peso:20,fecha:enDias(5),hora:'16:00',notas:[]},
    {id:'c3',nombre:'Control de la mañana',peso:20,fecha:enDias(5),hora:'08:30',notas:[]},
    {id:'c4',nombre:'Examen',peso:20,fecha:enDias(20),notas:[]},
  ]}]};
  ctxMcp.fetch=async()=>({ok:true,json:async()=>structuredClone(estado)});
  vm.createContext(ctxMcp);
  vm.runInContext(leer('engine.js'),ctxMcp);
  ctxMcp.motorCompartido={gh_crearCalculoRamo:ctxMcp.module.exports.gh_crearCalculoRamo};
  vm.runInContext(leer('functions/mcp/[[ruta]].js').replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'')+';globalThis.__mcp={onRequestPost};',ctxMcp);
  const r=await ctxMcp.__mcp.onRequestPost({params:{ruta:['d'.repeat(64)]},
    request:{json:async()=>({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'estado_semestre',arguments:{dias:30}}})}});
  const datos=JSON.parse((await r.json()).result.content[0].text);
  const proxima=datos.ramos[0].proximaEvaluacion;
  chk('la próxima es el control de la mañana, no la prueba corregida', !!proxima && proxima.evaluacion==='Control de la mañana');
  chk('la prueba corregida sale marcada como rendida', datos.proximas.some(p=>p.evaluacion==='Prueba ya corregida'&&p.rendida===true));
  const mismoDia=datos.proximas.filter(p=>p.fecha===enDias(5)).map(p=>p.evaluacion).join(',');
  chk('el mismo día van por hora', mismoDia==='Control de la mañana,Control de la tarde');

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})();
