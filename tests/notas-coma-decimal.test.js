// Toda nota que GradeHub MUESTRA va con coma decimal: «5,7» (Martín, 2026-11-14).
// Antes Inicio decía «5,2» arriba y «5.0» en cada ramo, según qué tan nuevo era
// el código que la pintaba.
//
// Mostrar no es calcular. Este test cuida las tres cosas que podían romperse:
//  1. Un formateador de presentación que vuelva a devolver punto.
//  2. El viaje nota mostrada → campo editable → guardado: la coma que se ve en
//     un campo tiene que leerse como la misma nota, no como otra.
//  3. El resumen de los widgets de iOS, que es DATO: Swift lo lee con
//     Locale en_US_POSIX y su formato (punto) no cambia.
// Todo sintético, con la pauta escrita acá.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js']
  .map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');

function elemento(){
  let html='';const atributos={};
  const nodo={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;},toggle(){}},children:[],value:'',textContent:'',dataset:{},checked:false,
    addEventListener(){},appendChild(h){this.children.push(h);return h;},setAttribute(k,v){atributos[k]=v;},removeAttribute(k){delete atributos[k];},getAttribute(k){return atributos[k]||null;},
    querySelector(){return nodo;},querySelectorAll(){return [];},closest(){return null;},contains(){return false;},focus(){},select(){},remove(){},click(){},clientWidth:400};
  Object.defineProperty(nodo,'innerHTML',{get(){return html;},set(v){html=String(v);this.children=[];}});
  return nodo;
}
const ids={};const porId=id=>ids[id]||(ids[id]=elemento());
const ctx={
  window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:elemento,addEventListener(){},documentElement:elemento(),querySelector(){return elemento();},querySelectorAll(){return [];},body:elemento()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},
  setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,getComputedStyle:()=>({getPropertyValue:()=>''}),console,URL,
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=code=>vm.runInContext(code,ctx);
run('save=()=>{};track=()=>{};closeModal=()=>{};openModal=()=>{};showToast=()=>{};syncToCloud=()=>{};animarPromedio=()=>{};mostrarEcoGpa=()=>{};');
let ok=0,fail=0;
const chk=(nombre,cond,detalle)=>{console.log(`  ${cond?'OK  ':'FAIL'} ${nombre}${cond||!detalle?'':' → '+detalle}`);if(cond)ok++;else fail++;};

// Pauta sintética: casillas fijas, nota directa, lista abierta con centésimas,
// un examen pendiente con mínimo, un segundo ramo reprobando y un semestre archivado.
function sembrar(){
  run(`S={...freshState(),tenant:'uc',onboardingDone:true,userName:'Prueba',ramos:normalize({ramos:[
   {id:'a',nombre:'Cálculo Sintético',color:'#7F77DD',creditos:10,gates:[{type:'min_grade_required',catId:'ex',min:3.5,cap:3.9,nombre:'Examen'}],categorias:[
    {id:'co',nombre:'Controles',peso:30,directNota:true,slots:3,notas:[{id:'c0',nombre:'Control 1',slot:0,valor:5.14,peso:1},{id:'c1',nombre:'Control 2',slot:1,valor:6,peso:1}]},
    {id:'i1',nombre:'Interrogación 1',peso:30,directNota:true,notas:[{id:'x',nombre:'Interrogación 1',valor:3.2,peso:1,fecha:'2026-09-10'}]},
    {id:'ta',nombre:'Tareas',peso:10,notas:[{id:'t1',nombre:'Tarea 1',valor:6.5,peso:1},{id:'t2',nombre:'Tarea 2',valor:4.75,peso:1}]},
    {id:'ex',nombre:'Examen',peso:30,directNota:true,fecha:'2026-12-01',notas:[]}]},
   {id:'b',nombre:'Física Sintética',color:'#1D9E75',creditos:10,gates:[],categorias:[
    {id:'p1',nombre:'Prueba 1',peso:50,directNota:true,notas:[{id:'y',nombre:'Prueba 1',valor:2.8,peso:1}]},
    {id:'p2',nombre:'Prueba 2',peso:50,directNota:true,fecha:'2026-11-20',notas:[]}]}]}).ramos,
   historial:[{id:'h1',label:'2026-1',gpa:5.45,ramos:[{id:'hr',nombre:'Álgebra Sintética',color:'#333',creditos:10,gates:[],categorias:[
    {id:'hc',nombre:'Final',peso:100,directNota:true,notas:[{id:'hn',nombre:'Final',valor:5.45,peso:1}]}]}]}]};currentRamoId='a';openCats={};`);
}
sembrar();

console.log('\n=== Los formateadores de presentación devuelven coma ===');
const casos=[
  ['nf(5.7)','5,7'],['nf(5.25,2)','5,25'],['nf(4)','4,0'],['fmt(6)','6,0'],['fmt(null)','·'],
  ['fmtPromedio(5.66)','5,7'],['fmtPromedio(null)','·'],['nfNecesaria(3.80357)','3,9'],['nfNecesaria(null)','·'],
  ['fmtNota(5.14)','5,14'],['fmtNota(5.1)','5,1'],['textoCalificacionNota({valor:5.5})','5,5'],
  ['fmtPromedioExacto(3.9499)','3,949'],['fmtPromedioGeneral(5.42)','5,4'],['fmtDiferenciaPromedio(0.04)','0,04'],
  ['textoNotaSombra(4.2)','4,2'],['simConComa((4.5).toFixed(1))','4,5'],
];
casos.forEach(([expr,esperado])=>{const v=run(expr);chk(`${expr} → «${esperado}»`,v===esperado,`dio «${v}»`);});
// Ningún valor de la escala, a centésimas, sale con punto de un formateador de pantalla.
const DE_PANTALLA=['nf','fmt','fmtPromedio','nfNecesaria','fmtNota','fmtPromedioExacto','fmtPromedioGeneral'];
const conPunto=[];
for(let c=100;c<=700;c++)DE_PANTALLA.forEach(f=>{const t=run(`${f}(${c/100})`);if(typeof t!=='string'||t.includes('.')||!/^\d,\d{1,3}$/.test(t))conPunto.push(`${f}(${c/100})=«${t}»`);});
chk('de 1,00 a 7,00 ningún formateador de pantalla devuelve punto',conPunto.length===0,conPunto.slice(0,4).join(' · '));

console.log('\n=== Las variantes de dato siguen con punto y dicen lo mismo ===');
const distintos=[];
for(let c=100;c<=700;c++){const v=c/100;
  [['nfDato','nf'],['fmtPromedioDato','fmtPromedio'],['nfNecesariaDato','nfNecesaria']].forEach(([dato,pantalla])=>{
    const d=run(`${dato}(${v})`),p=run(`${pantalla}(${v})`);
    if(!/^\d\.\d$/.test(d)||!Number.isFinite(Number(d))||d.replace('.',',')!==p)distintos.push(`${dato}(${v})=«${d}» vs «${p}»`);});}
chk('nfDato, fmtPromedioDato y nfNecesariaDato: punto, legibles con Number() e iguales a lo mostrado',distintos.length===0,distintos.slice(0,3).join(' · '));

console.log('\n=== En pantalla no queda ninguna nota con punto ===');
// Texto visible (sin etiquetas) y los atributos que se leen o se editan.
function notasConPunto(){
  const malos=new Set();
  Object.entries(ids).forEach(([id,e])=>[e.innerHTML,e.textContent,...e.children.map(c=>c.innerHTML||'')].forEach(h=>{
    h=String(h);
    (h.replace(/<[^>]*>/g,' ').match(/.{0,20}(?<![\d.,])\d\.\d+(?![\d.]).{0,10}/g)||[]).forEach(m=>malos.add(id+': '+m.trim()));
    (h.match(/(value|aria-label|aria-valuetext|placeholder|data-nota|data-lectura|title)="[^"]*(?<![\d.,])[1-7]\.\d[^"]*"/g)||[]).forEach(m=>malos.add(id+' @ '+m.slice(0,80)));
  }));
  return [...malos];
}
const comasVisibles=()=>Object.values(ids).reduce((n,e)=>{const h=e.innerHTML+' '+e.children.map(c=>c.innerHTML||'').join(' ');
  return n+(h.replace(/<[^>]*>/g,' ').match(/\d,\d/g)||[]).length+(h.match(/ value="\d,\d/g)||[]).length;},0);
[['Inicio','renderHome()'],['la ficha del ramo','renderRamo()'],['Estadísticas','renderStats()'],['Agenda','(agendaVista="evaluaciones",renderAgenda())'],
 ['el simulador del ramo','openSimuladorModal()'],['el simulador del semestre','openSimGlobalModal()'],
 ['corregir un ramo del historial',"openEditHistRamoModal('h1','hr')"],['editar un semestre del historial',"openRenombrarHistModal('h1')"]].forEach(([nombre,paso])=>{
  Object.values(ids).forEach(e=>{e.innerHTML='';e.textContent='';});
  let error=null;try{run(paso);}catch(e){error=e.message;}
  const malos=notasConPunto();
  chk(`${nombre}: se dibuja, muestra notas y ninguna con punto`,error===null&&malos.length===0&&comasVisibles()>0,error||malos.slice(0,4).join(' · ')||'no mostró ninguna nota');
});

console.log('\n=== Nota mostrada → campo editable → guardado ===');
// Cualquier nota válida, como se ve en su campo, vuelve a leerse como la misma.
const otras=[];
for(let c=100;c<=700;c++){const v=c/100,t=run(`textoCalificacionNota({valor:${v}})`),leida=run(`parseNota(${JSON.stringify(t)})`);if(leida!==v)otras.push(`${v} se muestra «${t}» y se lee ${leida}`);}
chk('de 1,00 a 7,00: lo que muestra un campo se lee como la misma nota',otras.length===0,otras.slice(0,3).join(' · '));
// La ficha de verdad: se toma cada campo como quedó dibujado y se dispara su
// propio onchange con ese mismo texto, que es lo que pasa al tocarlo y salir.
sembrar();run('renderRamo()');
const fichaHTML=porId('cat-list').children.map(x=>x.innerHTML).join('\n');
const campos=[...fichaHTML.matchAll(/<input class="eval-row-input[^>]*? value="([^"]*)"[^>]*? onchange="([^"]*)"/g)].map(m=>({valor:m[1],guardar:m[2].replace(/&#39;|&#x27;/g,"'")}));
chk('la ficha dibuja las cinco notas en campos editables, con coma',campos.length===5&&campos.every(c=>/^\d,\d{1,2}$/.test(c.valor)),campos.map(c=>c.valor).join(' '));
chk('las centésimas se muestran completas (5,14 y 4,75)',campos.some(c=>c.valor==='5,14')&&campos.some(c=>c.valor==='4,75'));
const fotoNotas=()=>run('JSON.stringify(S.ramos.map(r=>r.categorias.map(c=>c.notas)))');
const antesDeEditar=fotoNotas(),promedioAntes=run('ramoAvg(S.ramos[0])');
campos.forEach(c=>{ctx.__campo={value:c.valor};run(`(function(){${c.guardar}}).call(__campo)`);});
chk('guardar cada campo tal como se ve no cambia ninguna nota ni su fecha de edición',fotoNotas()===antesDeEditar);
chk('ni el promedio del ramo',run('ramoAvg(S.ramos[0])')===promedioAntes);
// Y escribir una nota nueva con coma guarda esa nota.
run("setSlotNota('co',2,'6,3')");
chk('escribir «6,3» en la casilla vacía guarda 6.3',run("S.ramos[0].categorias[0].notas.find(n=>n.slot===2).valor")===6.3);
run('renderRamo()');
chk('y vuelve a mostrarse «6,3»',/value="6,3"/.test(porId('cat-list').children.map(x=>x.innerHTML).join('\n')));
// La hoja de editar una nota de una lista abierta.
sembrar();run("openEditNotaModal('ta','t2')");
const hoja=(porId('modal-content').innerHTML.match(/id="m-nota-val" value="([^"]*)"/)||[])[1];
chk('la hoja de editar muestra «4,75»',hoja==='4,75',`mostró «${hoja}»`);
porId('m-nota-val').value=hoja;porId('m-nota-name').value='Tarea 2';
run("confirmEditNota('ta','t2')");
chk('guardarla sin tocar el número deja 4.75',run("S.ramos[0].categorias.find(c=>c.id==='ta').notas.find(n=>n.id==='t2').valor")===4.75);
// Historial: el promedio final corregido a mano.
run("openEditHistRamoModal('h1','hr')");
const histMostrado=(porId('modal-content').innerHTML.match(/id="m-hist-avg" value="([^"]*)"/)||[])[1];
porId('m-hist-avg').value=histMostrado;run("confirmEditHistRamo('h1','hr')");
chk('historial: el promedio mostrado con coma se guarda como ese mismo número',/^\d,\d$/.test(histMostrado||'')&&run("S.historial[0].ramos[0].avgOverride")===Number(histMostrado.replace(',','.')),`mostró «${histMostrado}»`);
// Simulador del semestre: el campo parte con la nota real y se puede reescribir igual.
sembrar();run('simGlobalState={};renderSimGlobalList()');
const simMostrado=(porId('simg-list').innerHTML.match(/class="simg-val [^"]*"[^>]*? value="([^"]*)"/)||[])[1];
run(`simGlobalSet('a',${JSON.stringify(simMostrado)})`);
chk('simulador del semestre: «'+simMostrado+'» se lee como la nota que mostraba',/^\d,\d$/.test(simMostrado||'')&&run("simGlobalState.a")===Number(simMostrado.replace(',','.')));
chk('y simular no guarda nada',fotoNotas()===antesDeEditar);

console.log('\n=== El resumen de los widgets de iOS conserva su formato ===');
sembrar();
const w=run('resumenParaWidgets(new Date(2026,10,14,12))');
const esDato=t=>typeof t==='string'&&/^\d\.\d$/.test(t);
chk('promedio general y de cada ramo son números, no texto',typeof w.promedio.oficial==='number'&&w.ramos.length===2&&w.ramos.every(r=>typeof r.promedio==='number'));
chk('el rango de Estadísticas va como «d.d», con punto',esDato(w.estadisticas.rango.piso)&&esDato(w.estadisticas.rango.techo),JSON.stringify(w.estadisticas.rango));
chk('la nota necesaria del ramo más exigente va con punto',esDato(w.estadisticas.exigente.necesitas),String(w.estadisticas.exigente.necesitas));
const conNota=w.agenda.filter(e=>e.necesitas!==null);
chk('«para ir con 4» en la agenda va con punto',conNota.length>0&&conNota.every(e=>esDato(e.necesitas)),JSON.stringify(w.agenda.map(e=>e.necesitas)));
chk('son los mismos valores que muestra la pantalla, solo cambia el separador',
  w.estadisticas.rango.piso.replace('.',',')===run('nf(proyeccionSemestre(S.ramos).piso)')&&
  w.estadisticas.exigente.necesitas.replace('.',',')===run('nfNecesaria(Math.max(1,loQueFaltaPorRamo(S.ramos)[0].necesita))'));
// Recorre el resumen entero: ningún texto que sea una cifra lleva coma.
const conComa=[];(function ver(x,ruta){if(typeof x==='string'){if(/^[+-]?\d+,\d+$/.test(x))conComa.push(ruta+'=«'+x+'»');}
  else if(x&&typeof x==='object')Object.entries(x).forEach(([k,v])=>ver(v,ruta+'.'+k));})(w,'resumen');
chk('ninguna cifra del resumen lleva coma decimal',conComa.length===0,conComa.join(' · '));

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail?1:0);
