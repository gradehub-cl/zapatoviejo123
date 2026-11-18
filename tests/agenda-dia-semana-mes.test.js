// Agenda Día | Semana | Mes (2026-11-18): vistas, día en orden, evaluaciones
// sobre el horario y grilla del mes. Solo datos sintéticos.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=process.env.GRADEHUB_ROOT||path.join(__dirname,'..');
const src=['data.js','engine.js','app.js','render-agenda.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');
const elementos=new Map();
function nodo(id){return {id,hidden:false,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},dataset:{},
  innerHTML:'',textContent:'',value:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},appendChild(){},addEventListener(){},
  querySelector(){return null},querySelectorAll(){return []},closest(){return null},contains(){return false}};}
const get=id=>{if(!elementos.has(id))elementos.set(id,nodo(id));return elementos.get(id);};
const almacen=new Map();
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}}),scrollBy(){}},
  document:{getElementById:get,createElement:()=>nodo(''),addEventListener(){},documentElement:nodo('html'),querySelector:()=>null,querySelectorAll:()=>[],body:nodo('body')},
  localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
  navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=s=>vm.runInContext(s,ctx);let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

// «Hoy» = miércoles 18 de noviembre de 2026, 9:47 en Chile.
const AHORA="new Date('2026-11-18T12:47:00Z')";
const estado={tenant:'uc',ramos:[
  {id:'calc',nombre:'Cálculo <II>',color:'#3b82f6',gates:[],horario:[
    {id:'b1',dias:['L','W','V'],inicio:'08:20',fin:'09:30',tipo:'Cátedra',sala:'B12'}],
   categorias:[
    {id:'c4',nombre:'Control 4',peso:20,directNota:true,fecha:'2026-11-18',hora:'10:00',notas:[]},
    {id:'ex',nombre:'Examen',peso:50,directNota:true,fecha:'2026-12-02',hora:'09:00',notas:[]},
    {id:'i1',nombre:'Interrogación 1',peso:30,directNota:true,fecha:'2026-09-10',notas:[{id:'n1',nombre:'Interrogación 1',valor:5,peso:1}]}]},
  {id:'prog',nombre:'Programación',color:'#a3e635',gates:[],horario:[
    {id:'b2',dias:['W'],inicio:'16:10',fin:'17:20',tipo:'Laboratorio',sala:'Lab 3'},
    {id:'b3',dias:['W'],inicio:'14:50',fin:'16:00',tipo:'Ayudantía',noVoy:true}],
   categorias:[
    {id:'t3',nombre:'Tarea 3',peso:40,directNota:true,fecha:'2026-11-18',notas:[]},
    {id:'t4',nombre:'Tarea 4',peso:30,directNota:true,fecha:'2026-11-21',notas:[]},
    {id:'ex2',nombre:'Examen',peso:30,directNota:true,fecha:'2026-11-20',hora:'18:30',notas:[]}]}]};
run(`S=normalize(${JSON.stringify(estado)});currentTab='agenda';esCuentaProfesor=()=>false;`);

console.log('\n=== Vistas ===');
chk('parte en Día',run('agendaVista')==='dia');
chk('pinta «Día | Semana | Mes» con Día marcado',run('pintarVistaAgenda()')==='dia'&&/aria-pressed="true">Día/.test(get('agenda-vista').innerHTML)&&/>Semana</.test(get('agenda-vista').innerHTML)&&/>Mes</.test(get('agenda-vista').innerHTML));
chk('no depende de la app: en la web también',run('enAppNativa=()=>false;pintarVistaAgenda()')==='dia'&&get('agenda-vista').hidden===false);
run("agendaVista='algo-raro'");
chk('una vista desconocida vuelve a Día',run('pintarVistaAgenda()')==='dia');
run('esCuentaProfesor=()=>true');
chk('el profesor sigue con la lista, sin pestañas',run('pintarVistaAgenda()')==='lista'&&get('agenda-vista').hidden===true);
run('esCuentaProfesor=()=>false');

console.log('\n=== Día ===');
let dia=run(`diaAgendaHTML('2026-11-18',${AHORA})`);
chk('«Se rinde hoy» con las dos evaluaciones del día',/Se rinde hoy/.test(dia)&&/Control 4/.test(dia)&&/Tarea 3/.test(dia));
chk('«Necesitas» dice que es el promedio en lo pendiente',/Necesitas<\/small><b>[\d,]+<\/b><small>en lo pendiente/.test(dia));
const orden=[...dia.matchAll(/class="agenda-dia-(?:fila|ahora)[^"]*"[^>]*>(?:\s*<span class="agenda-dia-hora">([^<]+)<\/span>)?/g)].map(m=>m[1]||'ahora');
chk('el día va en orden: clase 08:20, ahora, control 10:00, ayudantía, laboratorio, tarea sin hora',
  JSON.stringify(orden)===JSON.stringify(['08:20','ahora','10:00','14:50','16:10','Sin hora']));
chk('la clase a la que no va se marca, sin borrarla',/agenda-dia-fila no-voy[^>]*data-horario-bloque="b3"/.test(dia)&&/No vas/.test(dia));
chk('el nombre del ramo se escapa',/Cálculo &lt;II&gt;/.test(dia)&&!/Cálculo <II>/.test(dia));
chk('cada evaluación abre la ficha con la acción de siempre',/data-agenda-action="ver-ramo" data-ramo-id="calc"/.test(dia));
const otro=run(`diaAgendaHTML('2026-11-20',${AHORA})`);
chk('otro día: «Ese día», sin línea de ahora',/Ese día/.test(otro)&&!/agenda-dia-ahora/.test(otro));
run('S.ramos[1].categorias[1].fecha="2026-11-10"');
chk('lo pendiente sale solo hoy',/Fecha pasada sin nota|Revisar fecha/.test(run(`diaAgendaHTML('2026-11-18',${AHORA})`))&&!/Fecha pasada sin nota|Revisar fecha/.test(run(`diaAgendaHTML('2026-11-20',${AHORA})`)));
run('S.ramos[1].categorias[1].fecha="2026-11-21"');
const sabado=run(`diaAgendaHTML('2026-11-21',${AHORA})`);
chk('un día sin clases muestra igual su evaluación sin hora',/Tarea 4/.test(sabado)&&/Sin hora/.test(sabado));
const domingo=run(`diaAgendaHTML('2026-11-22',${AHORA})`);
chk('un día vacío lo dice y ofrece lo próximo',/Nada agendado este día/.test(domingo)&&/Lo próximo: Examen · Cálculo &lt;II&gt;/.test(domingo));
run(`renderDiaAgenda(document.getElementById('agenda-body'),${AHORA})`);
chk('el título es la fecha y el resumen cuenta lo del día (sin la clase a la que no va)',get('agenda-title').textContent==='Miércoles 18 de noviembre'&&get('agenda-sub').textContent==='2 evaluaciones · 2 clases');
chk('en hoy no aparece «Hoy» para volver',!/data-agenda-nav="0"/.test(get('agenda-body').innerHTML));
run(`agendaDiaOffset=2;renderDiaAgenda(document.getElementById('agenda-body'),${AHORA})`);
chk('en otro día aparece «Hoy»',/data-agenda-nav="0"/.test(get('agenda-body').innerHTML)&&get('agenda-title').textContent==='Viernes 20 de noviembre');
run('agendaDiaOffset=0');

console.log('\n=== Semana ===');
const eventos='agendaEvents()';
let semana=run(`horarioSemanaHTML(S.ramos,${AHORA},{eventos:${eventos}})`);
chk('la cabecera trae la fecha de cada día',/>Lun<b>16<\/b>/.test(semana)&&/<span class="hoy">Mié<b>18<\/b>/.test(semana));
chk('la evaluación con hora va en su día, como bloque',(semana.match(/class="horario-semana-eval"/g)||[]).length===2&&/Control 4<\/b><span>10:00/.test(semana)&&/Examen<\/b><span>18:30/.test(semana));
chk('la sin hora va en la franja «Día»',/horario-semana-todo-dia/.test(semana)&&/horario-semana-chip[^>]*>Tarea 3</.test(semana));
chk('sábado aparece porque tiene una evaluación; domingo no',/>Sáb<b>21<\/b>/.test(semana)&&!/>Dom</.test(semana));
chk('el rango de horas incluye la evaluación de las 18:30',/>19:00</.test(semana));
chk('los bloques de evaluación miden al menos 44 pt',[...semana.matchAll(/horario-semana-eval"[^>]*height:(\d+)px/g)].every(m=>+m[1]>=44));
chk('el texto sobre el color se elige por contraste',/--ramo:#3b82f6;--ramo-texto:#111113/.test(semana)&&run("textoSobreColorAgenda('#1f2937')")==='#ffffff'&&run("textoSobreColorAgenda('#a3e635')")==='#111113'&&run("textoSobreColorAgenda('rojo')")==='');
const siguiente=run(`horarioSemanaHTML(S.ramos,${AHORA},{eventos:${eventos},semana:2})`);
chk('dos semanas más: sus fechas, sin «hoy» y con el examen del 2',/>Lun<b>30<\/b>/.test(siguiente)&&!/class="hoy"/.test(siguiente)&&/Examen<\/b><span>09:00/.test(siguiente));
chk('sin clases ni evaluaciones no hay grilla',run(`horarioSemanaHTML([{id:'x',nombre:'X',horario:[]}],${AHORA},{eventos:[]})`)==='');
chk('sin clases pero con evaluaciones, igual se ven',/horario-semana-eval/.test(run(`horarioSemanaHTML([],${AHORA},{eventos:${eventos}})`)));
chk('rango de la semana',run("rangoSemanaAgenda('2026-11-16')")==='16 – 20 de noviembre'&&run("rangoSemanaAgenda('2026-11-30')")==='30 de noviembre – 4 de diciembre');

console.log('\n=== Mes ===');
run("agendaMesOffset=0;agendaMesSel=null");
let mes=run(`mesAgendaHTML(${AHORA})`);
chk('noviembre 2026, empieza el lunes 26 de octubre',/Noviembre 2026/.test(mes)&&/data-mes-dia="2026-10-26"/.test(mes)&&!/data-mes-dia="2026-12-07"/.test(mes));
chk('hoy marcado y seleccionado',/class="agenda-mes-dia hoy" data-mes-dia="2026-11-18" aria-pressed="true"/.test(mes));
const dia18=mes.match(/data-mes-dia="2026-11-18"[^>]*>[\s\S]*?<\/button>/)[0];
chk('un punto por evaluación, del color del ramo',(dia18.match(/<i style/g)||[]).length===2&&/#3b82f6/.test(dia18)&&/#a3e635/.test(dia18));
chk('el día dice cuántas evaluaciones tiene',/aria-label="Miércoles 18 de noviembre, 2 evaluaciones, hoy"/.test(mes));
chk('abajo, lo del día elegido',/agenda-mes-detalle[\s\S]*Control 4/.test(mes)&&/agenda-mes-detalle[\s\S]*Tarea 3/.test(mes));
run("agendaMesSel='2026-11-22'");
chk('un día sin nada lo dice',/Sin evaluaciones este día/.test(run(`mesAgendaHTML(${AHORA})`)));
run("agendaMesOffset=1;agendaMesSel=null");
mes=run(`mesAgendaHTML(${AHORA})`);
chk('diciembre: elige el 1 y ofrece volver a hoy',/Diciembre 2026/.test(mes)&&/data-mes-dia="2026-12-01" aria-pressed="true"/.test(mes)&&/data-agenda-nav="0"/.test(mes));
run("agendaMesOffset=0;agendaMesSel=null");
chk('sin evaluaciones con fecha no hay grilla',run(`(()=>{const g=S;S={...S,ramos:[]};const h=mesAgendaHTML(${AHORA});S=g;return h;})()`)==='');
run("agendaVista='mes';renderAgenda()");
chk('Mes es la grilla arriba y la lista de siempre abajo',/class="agenda-mes"/.test(get('agenda-body').innerHTML)&&/Tus prioridades|Después/.test(get('agenda-body').innerHTML));

console.log('\n=== Se recuerda la vista ===');
almacen.set('gh_agenda_vista','semana');
const nuevo=vm.createContext({...ctx});vm.runInContext(src,nuevo);
chk('al volver, abre en la última vista elegida',vm.runInContext('agendaVista',nuevo)==='semana');
chk('no toca gradehub_v1',![...almacen.keys()].includes('gradehub_v1'));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
