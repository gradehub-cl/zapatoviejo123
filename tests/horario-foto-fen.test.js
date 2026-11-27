// Foto del horario de Docencia Web FEN: además de los ramos y la sección, de
// la grilla sale cuándo es cada clase (días arriba, hora de la fila a la
// izquierda), la sala y si es cátedra o ayudantía. Las cajas imitan lo que
// entregó el lector con un pantallazo real (guion pegado a la hora, "SalaP-311"
// sin dos puntos, "Aud" "Price" partido, "(Avy)" por "(AYU)"), pero los
// códigos, ramos, días y salas son inventados: no hay datos de ninguna persona.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const elementos={};
function elemento(){return {innerHTML:'',textContent:'',value:'',disabled:false,checked:true,dataset:{},files:[],style:{setProperty(){}},
  classList:{add(){},remove(){},contains(){return true}},addEventListener(){},appendChild(){},focus(){},setAttribute(){},removeAttribute(){},querySelector(){return null}};}
const get=id=>elementos[id]||(elementos[id]=elemento());
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:get,querySelector:()=>elemento(),querySelectorAll:()=>[],createElement:elemento,addEventListener(){},documentElement:elemento(),body:elemento(),head:{appendChild(){}}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://gradehub.cl',href:'https://gradehub.cl/',pathname:'/',search:'',hash:''},
  history:{replaceState(){}},setTimeout,clearTimeout,requestAnimationFrame(){return 1},cancelAnimationFrame(){},URL};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

const w=(texto,x0,y0,x1,y1)=>({texto,x0,y0,x1,y1});
const grilla=[
  w('LUN',291,238,336,258),w('MAR',698,238,744,258),w('MIE',1106,238,1152,258),w('VIE',1922,238,1968,258),w('SAB',2330,234,2376,258),
  // Filas 1, 2 y 4. La hora de la fila 3 no se leyó.
  w('08:00-',70,358,139,377),w('09:20',146,358,202,377),
  w('09:30-10:50',70,485,202,503),
  w('12:30-13:50',71,733,202,751),
  // ABC1234 sección 4: lunes y martes 09:30 en la misma sala, cátedra.
  w('RAMO',293,430,340,445),w('ENABC1234/04',293,450,423,464),w('SalaP-311',426,450,510,464),w('(CAT)',293,496,338,514),
  w('ENABC1234/04',701,450,831,464),w('Sala:P-311',840,450,924,464),w('(CAT)',701,496,746,514),
  // Viernes 08:00 en "Aud.Price", ayudantía en amarillo.
  w('ENABC1234/04',1925,326,2062,342),w('Sala:Aud',2068,316,2136,350),w('Price',2144,316,2190,350),w('(Avy)',1924,370,1970,390),
  // XYZ5678 en la fila 3, cuya hora falta: va sin horario, no a la fila de al lado.
  w('ENXYZ5678/02',1109,575,1239,589),w('Sala:H-101',1248,575,1334,589),w('(CAT)',1109,621,1154,639),
];

(async()=>{
  console.log('=== La grilla de Docencia Web ===');
  const bloques=run(`[...bloquesDeFotoHorario([{texto:'',palabras:${JSON.stringify(grilla)}}])]`);
  const abc=(bloques.find(([k])=>k==='ENABC1234')||[,[]])[1];
  chk('los días con la misma hora y sala son un solo bloque',abc.some(b=>b.dias.join('')==='LM'&&b.inicio==='09:30'&&b.fin==='10:50'&&b.sala==='P-311'&&b.tipo==='Cátedra'));
  chk('la hora con el guion pegado se lee igual',abc.some(b=>b.dias.join('')==='V'&&b.inicio==='08:00'&&b.fin==='09:20'));
  chk('la sala partida se junta y "(Avy)" es ayudantía',abc.some(b=>b.dias.join('')==='V'&&b.sala==='Aud Price'&&b.tipo==='Ayudantía'));
  chk('nada más que esos dos bloques',abc.length===2);
  chk('sin la hora de su fila, la clase no se corre a otra',!bloques.some(([k])=>k==='ENXYZ5678'));
  chk('sin encabezados de días no se adivina nada',
    run(`bloquesDeFotoHorario([{palabras:${JSON.stringify(grilla.filter(p=>!/^[A-Z]{3}$/.test(p.texto)))}}]).size`)===0);
  chk('la misma clase leída en las dos imágenes no se duplica',
    run(`bloquesDeFotoHorario([{palabras:${JSON.stringify(grilla)}},{palabras:${JSON.stringify(grilla)}}]).get('ENABC1234').length`)===2);

  console.log('\n=== De la foto a los ramos, con su horario ===');
  run(`CREDITOS_POR_TENANT.fen['Ramo de Prueba']=[6,'ABC1234'];CREDITOS_POR_TENANT.fen['Otro de Prueba']=[6,'XYZ5678'];CREDITOS_POR_TENANT.fen['Tercero de Prueba']=[6,'QRS4321'];
    S.tenant='fen';S.ramos=[];globalThis.__g=0;save=()=>{__g++};renderHome=()=>{};openModal=()=>{};closeModal=()=>{};showToast=()=>{};track=()=>{};alAgregarRamo=null;
    const ya=crearRamoDesdeCatalogo('Tercero de Prueba','QRS4321');ya.horario=[{dias:['J'],inicio:'10:00','fin':'11:00',sala:'Mía'}];
    const otro=crearRamoDesdeCatalogo('Otro de Prueba','XYZ5678');otro.categorias=[{id:'c1',nombre:'Prueba',peso:100,notas:[{id:'n1',valor:5.5}]}];`);
  const tercero=grilla.map(p=>p.texto==='ENABC1234/04'&&p.x0===293?{...p,texto:'ENQRS4321/01'}:p);
  run('abrirImportarHorarioBuscacursos()');
  const modal=get('modal-content').innerHTML;
  chk('el modal habla de Docencia Web y de las horas',/Docencia Web/.test(modal)&&/horas de clase/.test(modal)&&/catálogo UChile/.test(modal));
  chk('el ejemplo es un código FEN',/Ej\.: ENMEM1505\/02/.test(modal));
  ctx.__lect=[{texto:'',palabras:tercero}];
  run('leerFotoOcr=async()=>__lect');
  ctx.__input={files:[{type:'image/png',size:1000}],value:'x'};
  await run('leerFotoHorario(__input)');
  chk('propone el ramo nuevo sin el EN, con su sección y su horario',
    run("_horarioUCReconocido.map(r=>r.sigla+'-'+r.seccion+':'+r.horario.length).join()")==='ABC1234-4:2');
  chk('la propuesta muestra los días y horas',/<small>mar 09:30–10:50 · vie 08:00–09:20<\/small>/.test(get('modal-content').innerHTML));
  chk('al que ya tiene horario no se le ofrece otro',run("!_horarioSeccionesUC.some(r=>r.sigla==='QRS4321'&&r.horario)"));
  chk('al que ya está sin horario se le ofrece la sección (sin horario: su fila no se leyó)',
    run("_horarioSeccionesUC.some(r=>r.sigla==='XYZ5678'&&r.seccion===2&&!r.horario)"));
  chk('antes de confirmar no cambia nada',run('__g===0&&S.ramos.length===2'));
  ctx.document.querySelectorAll=sel=>sel==='.horario-ramo-check'?[{checked:true,dataset:{i:'0'}}]
    :sel==='.horario-seccion-check'?run('_horarioSeccionesUC').map((_,i)=>({checked:true,dataset:{i:String(i)}})):[];
  run("globalThis.__notas=JSON.stringify(S.ramos.find(r=>r.sigla==='XYZ5678').categorias)");
  run('aplicarHorarioBuscacursos()');
  const nuevo=run("JSON.stringify(S.ramos.find(r=>r.sigla==='ABC1234'))");
  chk('agrega el ramo con sección y horario',/"seccion":4/.test(nuevo)&&run("S.ramos.find(r=>r.sigla==='ABC1234').horario.length")===2);
  chk('el horario que ya existía queda igual',run("S.ramos.find(r=>r.sigla==='QRS4321').horario[0].sala")==='Mía'&&run("S.ramos.find(r=>r.sigla==='QRS4321').horario.length")===1);
  chk('las notas del ramo existente no se tocan',run("JSON.stringify(S.ramos.find(r=>r.sigla==='XYZ5678').categorias)===__notas")&&run("S.ramos.find(r=>r.sigla==='XYZ5678').seccion")===2);
  chk('guarda una sola vez',run('__g===1'));
  chk('el horario guardado sale en Hoy',run("resumenHorarioClases(S.ramos,new Date('2026-11-17T12:00:00-03:00')).clasesHoy.some(c=>c.sigla==='ABC1234'&&c.inicio==='09:30'&&c.sala==='P-311')"));
  ctx.document.querySelectorAll=()=>[];

  console.log('\n=== Pegar el texto de Docencia Web ===');
  run('abrirImportarHorarioBuscacursos()');
  get('m-horario-texto').value='ENXYZ5678/03 Sala:H-101';get('m-horario-reconocer').disabled=false;
  await run('reconocerHorarioBuscacursos()');
  chk('la barra separa la sección también en lo pegado',run("_horarioSeccionesUC.some(r=>r.sigla==='XYZ5678'&&r.seccion===3)"));

  console.log('\n=== La UC no cambia ===');
  run("S.tenant='uc';S.ramos=[];var CURSOS_UC_FULL=[['MAT1620','Cálculo II',10]];cargarCursosUC=async()=>true;");
  run('abrirImportarHorarioBuscacursos()');
  chk('la UC sigue nombrando Mi UC y su ejemplo',/Mi UC o BuscaCursos/.test(get('modal-content').innerHTML)&&/MAT1610-1/.test(get('modal-content').innerHTML));
  ctx.__lect=[{texto:'',palabras:[...grilla.filter(p=>!/^EN/.test(p.texto)),w('MAT1620-2',293,450,423,464)]}];
  await run('leerFotoHorario(__input)');
  chk('en la UC no se propone horario aunque la foto traiga horas',run("_horarioUCReconocido.length===1&&_horarioUCReconocido[0].horario.length===0"));
  run("S.tenant='uai'");
  chk('una universidad sin formato de horario no abre el importador',run("abrirImportarHorarioBuscacursos()")===undefined&&run("HORARIO_FOTO_POR_TENANT.uai")===undefined);

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
