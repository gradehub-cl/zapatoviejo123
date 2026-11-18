// El horario completo desde el pantallazo: días, módulos, tipo y sala.
// Acá no corre el lector real: se le pasan las cajas de palabras que entrega
// Tesseract con `blocks:true`, armadas a mano con la forma de la grilla de
// Mi UC (días arriba, módulo y hora a la izquierda, "MAT1620-" con la sección
// debajo). Siglas del catálogo UC, salas y secciones inventadas: no hay datos
// de ninguna persona.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const elementos={};
function elemento(){return {innerHTML:'',textContent:'',value:'',disabled:false,checked:true,dataset:{},files:[],style:{setProperty(){}},hidden:false,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},focus(){},setAttribute(){},removeAttribute(){},
  querySelector(){return null},querySelectorAll(){return []},insertAdjacentElement(){}};}
const get=id=>elementos[id]||(elementos[id]=elemento());
let marcas={};
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:get,querySelector:()=>elemento(),querySelectorAll:s=>marcas[s]||[],createElement:elemento,addEventListener(){},documentElement:elemento(),body:elemento(),head:{appendChild(){}}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://gradehub.cl',href:'https://gradehub.cl/',pathname:'/',search:'',hash:''},
  history:{replaceState(){}},setTimeout,clearTimeout,requestAnimationFrame(){return 1},cancelAnimationFrame(){},URL,Intl,Date};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
const json=x=>JSON.stringify(x);
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

// ── Grilla sintética con la forma de Mi UC ──────────────────────────────────
// 1170 px de ancho (pantallazo de iPhone). Columnas de 190 px desde x=210.
const COL={L:305,M:495,W:685,J:875,V:1065,S:1255};
const FILA={1:300,2:420,3:540,4:660,5:780,6:900,7:1020,8:1140,9:1260};
const HORA={1:'08:20',2:'09:40',3:'11:00',4:'12:20',5:'14:50',6:'16:10',7:'17:30',8:'18:50',9:'20:10'};
const caja=(texto,x,y,ancho=Math.max(18,texto.length*22),alto=30)=>({texto,x0:Math.round(x-ancho/2),y0:Math.round(y-alto/2),x1:Math.round(x+ancho/2),y1:Math.round(y+alto/2)});
function encabezado(dias=['Lunes','Martes','Miércoles','Jueves','Viernes'],claves=['L','M','W','J','V']){
  return dias.map((d,i)=>caja(d,COL[claves[i]],180));
}
function filas(mods=[1,2,3,4,5,6,7,8,9],{numero=true,horaJunta=false}={}){
  return mods.flatMap(m=>[
    ...(numero?[caja(String(m),60,FILA[m]-20,18)]:[]),
    caja(horaJunta?HORA[m]+'-'+HORA[m]:HORA[m],130,FILA[m]+(numero?20:0),horaJunta?140:100),
  ]);
}
// Una celda: la sigla con guion arriba, la sección debajo (no cabe en la línea),
// el tipo y la sala más abajo, como en Mi UC.
function celda(dia,mod,sigla,seccion,tipo,sala){
  const x=COL[dia],y=FILA[mod]-40;
  return [caja(sigla+'-',x,y,170),caja(String(seccion),x+40,y+30,22),
    ...(tipo?[caja(tipo,x,y+62,90)]:[]),...(sala?[caja(sala,x,y+92,90)]:[])];
}
const base=[
  caja('Horario',300,60,160),caja('2026-2',520,60,120),
  ...encabezado(),...filas(),
  ...celda('L',1,'MAT1620',2,'CLAS','K201'),...celda('W',1,'MAT1620',2,'CLAS','K201'),
  ...celda('V',2,'MAT1620',2,'AYUD','B12'),
  ...celda('M',2,'FIS1514',13,'CLAS','BC25'),...celda('J',2,'FIS1514',13,'CLAS','BC25'),
  ...celda('M',5,'IIC1103',11,'LAB','AP101'),...celda('M',6,'IIC1103',11,'LAB','AP101'),
  ...celda('J',4,'TTF012',1,'CLAS',null),
];
const CATALOGO=['MAT1620','FIS1514','IIC1103','TTF012','IIC2233'];
const existe=`x=>${json(CATALOGO)}.includes(x)`;
const leerGrilla=(lecturas,tenant='uc',conCatalogo=true)=>{
  ctx.__lect=lecturas;
  const m=run(`clasesDeFotoHorario(__lect,${conCatalogo?existe:'null'},${json(tenant)})`);
  return Object.fromEntries([...m].map(([k,v])=>[k,v]));
};
const texto=bs=>(bs||[]).map(b=>`${b.dias.join('')} ${b.inicio}-${b.fin} ${b.tipo||'-'} ${b.sala||'-'}`).join(' | ');

console.log('=== La grilla de Mi UC: días, módulos, tipo y sala ===');
let h=leerGrilla([{texto:'',palabras:base}]);
chk('Cálculo II: lunes y miércoles módulo 1 en K201, ayudantía el viernes',
  texto(h.MAT1620)==='LW 08:20-09:30 Cátedra K201 | V 09:40-10:50 Ayudantía B12');
chk('Dinámica: martes y jueves módulo 2',texto(h.FIS1514)==='MJ 09:40-10:50 Cátedra BC25');
chk('un laboratorio de dos módulos son dos bloques, sin inventar el recreo',
  texto(h.IIC1103)==='M 14:50-16:00 Laboratorio AP101 | M 16:10-17:20 Laboratorio AP101');
chk('sin sala leída, el bloque va sin sala',texto(h.TTF012)==='J 12:20-13:30 Cátedra -');
chk('la sección de abajo no se lee como sala',!/\b13\b|\b11\b/.test(texto(h.FIS1514)+texto(h.IIC1103)));
chk('cada bloque es válido para el modelo existente',run(`(${json(Object.values(h).flat())}).every(bloqueHorarioValido)`));
chk('los bloques traen id estable',(()=>{const a=leerGrilla([{palabras:base}]).MAT1620.map(b=>b.id).join();return a===h.MAT1620.map(b=>b.id).join()&&/^horario-/.test(h.MAT1620[0].id);})());

console.log('\n=== Variantes del formato ===');
const abreviado=[...encabezado(['LUN','MAR','MIÉ','JUE','VIE']),...filas(),...celda('W',3,'IIC2233',2,'CLAS','A5')];
chk('días abreviados y con tilde',texto(leerGrilla([{palabras:abreviado}]).IIC2233)==='W 11:00-12:10 Cátedra A5');
const letras=[...encabezado(['L','M','W','J','V']),...filas(),...celda('J',7,'IIC2233',2,'TAL',null)];
chk('días con la letra de la UC (W es miércoles)',texto(leerGrilla([{palabras:letras}]).IIC2233)==='J 17:30-18:40 Taller -');
const soloHora=[...encabezado(),...filas([1,2,3,4,5],{numero:false}),...celda('L',3,'IIC2233',2,'CLAS',null)];
chk('filas solo con la hora de inicio',texto(leerGrilla([{palabras:soloHora}]).IIC2233)==='L 11:00-12:10 Cátedra -');
const horaJunta=[...encabezado(),...filas([1,2,3],{numero:false,horaJunta:true}),...celda('M',2,'IIC2233',2,'CLAS',null)];
chk('hora de inicio y término en una sola palabra',texto(leerGrilla([{palabras:horaJunta}]).IIC2233)==='M 09:40-10:50 Cátedra -');
const conSalaPalabra=[...encabezado(),...filas(),caja('IIC2233-2',COL.V,FILA[8]-40,190),caja('CLAS',COL.V,FILA[8]-10,90),caja('Sala',COL.V-40,FILA[8]+20,70),caja('3',COL.V+30,FILA[8]+20,20)];
chk('"Sala 3": lo que sigue a la palabra Sala es la sala',texto(leerGrilla([{palabras:conSalaPalabra}]).IIC2233)==='V 18:50-20:00 Cátedra 3');
const sinViernes=base.filter(p=>p.texto!=='Viernes');
chk('una columna sin encabezado leído se ubica por el paso entre días',texto(leerGrilla([{palabras:sinViernes}]).MAT1620).includes('V 09:40-10:50 Ayudantía B12'));
const tope=[...encabezado(),...filas(),...celda('M',1,'FIS1514',13,'CLAS',null),...celda('W',2,'FIS1514',13,'CLAS',null),...celda('V',3,'FIS1514',13,'AYUD',null),
  caja('IIC2233-',COL.L,FILA[4]-45,170),caja('2',COL.L+40,FILA[4]-18,22),caja('CLAS',COL.L,FILA[4]+5,90),
  caja('MAT1620-',COL.L,FILA[4]+28,170),caja('2',COL.L+40,FILA[4]+50,22),caja('AYUD',COL.L,FILA[4]+50,90)];
const hTope=leerGrilla([{palabras:tope}]);
chk('dos ramos en la misma celda (tope): cada uno con su tipo',
  texto(hTope.IIC2233)==='L 12:20-13:30 Cátedra -'&&texto(hTope.MAT1620)==='L 12:20-13:30 Ayudantía -');

console.log('\n=== Cuándo no se propone nada ===');
chk('sin encabezado de días no hay horario',Object.keys(leerGrilla([{palabras:base.filter(p=>!/^(Lunes|Martes|Miércoles|Jueves|Viernes)$/.test(p.texto))}])).length===0);
chk('sin filas de módulos no hay horario',Object.keys(leerGrilla([{palabras:base.filter(p=>!/^(\d|\d\d:\d\d)$/.test(p.texto))}])).length===0);
chk('sin cajas (texto de corrido) tampoco',Object.keys(leerGrilla([{texto:'Lunes Martes MAT1620-2 08:20 CLAS K201'}])).length===0);
chk('fuera de la UC no hay módulos oficiales y no se lee la grilla',Object.keys(leerGrilla([{palabras:base}],'fen')).length===0);
chk('una sala con forma de sigla (BC25) no es un ramo',!('BC25' in h)&&!('AP101' in h));
chk('una sigla que no está en el catálogo no se propone',Object.keys(leerGrilla([{palabras:[...encabezado(),...filas(),...celda('L',1,'XYZ9999',1,'CLAS',null)]}])).length===0);
const corrido=base.map(p=>p.texto==='TTF012-'?{...p,x0:p.x0+190,x1:p.x1+190}:p);
const hVotos=leerGrilla([{palabras:base},{palabras:corrido},{palabras:base}]);
chk('con tres lecturas, el bloque que aparece en una sola no entra',texto(hVotos.TTF012)==='J 12:20-13:30 Cátedra -');

// ── De la foto a la revisión y al semestre ─────────────────────────────────
// ── Formato real de «Carga Académica»: el tipo va solo en el color ─────────
// Píxeles sintéticos: fondo blanco, leyenda con su cuadrito de color y cada
// celda pintada con el color de su tipo. Las celdas traen solo sigla-sección.
const ANCHO=1350,ALTO=1500;
function lienzo(){const datos=new Uint8ClampedArray(ANCHO*ALTO*4).fill(255);return {ancho:ANCHO,alto:ALTO,datos};}
function pintar(px,x0,y0,x1,y1,[r,g,b]){for(let y=Math.max(0,y0);y<Math.min(ALTO,y1);y++)for(let x=Math.max(0,x0);x<Math.min(ANCHO,x1);x++){const k=(y*ANCHO+x)*4;px.datos[k]=r;px.datos[k+1]=g;px.datos[k+2]=b;}}
const COLOR={cat:[250,197,115],ayu:[151,203,153],lab:[179,212,244],vacia:[242,244,245]};
function celdaColor(px,dia,mod,color){pintar(px,COL[dia]-92,FILA[mod]-58,COL[dia]+92,FILA[mod]+58,color);}
function soloSigla(dia,mod,sigla,seccion){const x=COL[dia],y=FILA[mod]-40;return [caja(sigla+'-',x,y,170),caja(String(seccion),x,y+30,22)];}
function leyenda(px,colores=COLOR){
  const items=[['Cátedra',colores.cat,120],['Ayudantía',colores.ayu,420],['Laboratorio',colores.lab,760]];
  return items.map(([t,c,x])=>{pintar(px,x-40,85,x-16,109,c);return caja(t,x+60,97,140,24);});
}
function fotoReal({colores=COLOR,conLeyenda=true,sabado=false}={}){
  const px=lienzo();
  pintar(px,210,240,1160,1320,COLOR.vacia);
  const palabras=[caja('2026',120,40,70),caja('Segundo',220,40,120),caja('Semestre',360,40,130),
    ...(conLeyenda?leyenda(px,colores):[]),caja('Módulo',90,180,110),
    ...encabezado(),...(sabado?[caja('Sábad',COL.S,180,80)]:[]),...filas()];
  const poner=(dia,mod,sigla,sec,color)=>{celdaColor(px,dia,mod,color);palabras.push(...soloSigla(dia,mod,sigla,sec));};
  poner('L',4,'MAT1620',2,colores.cat);poner('W',4,'MAT1620',2,colores.cat);poner('V',4,'MAT1620',2,colores.cat);
  poner('J',1,'MAT1620',2,colores.lab);poner('L',5,'MAT1620',2,colores.ayu);
  poner('M',2,'FIS1514',13,colores.cat);
  if(sabado)poner('S',3,'IIC2233',2,colores.cat);
  // La tabla de abajo repite los cursos fuera de la grilla: no crea bloques.
  palabras.push(caja('IIC1103-',115,1400,150),caja('1',115,1430,20));
  return {texto:'2026 Segundo Semestre HORARIO',palabras,pixeles:px};
}
console.log('\n=== Formato real: el tipo sale del color de la celda ===');
let real=leerGrilla([fotoReal()]);
chk('cátedra lunes, miércoles y viernes; laboratorio el jueves; ayudantía el lunes',
  texto(real.MAT1620)==='LWV 12:20-13:30 Cátedra - | L 14:50-16:00 Ayudantía - | J 08:20-09:30 Laboratorio -');
chk('la foto no trae sala: ningún bloque inventa una',Object.values(real).flat().every(b=>b.sala===''));
chk('la tabla de cursos de abajo no crea bloques',!('IIC1103' in real));
const otros={cat:[230,170,60],ayu:[120,190,110],lab:[150,190,240]};
chk('si la foto trae su leyenda, mandan sus colores',texto(leerGrilla([fotoReal({colores:otros})]).FIS1514)==='M 09:40-10:50 Cátedra -');
chk('sin leyenda y con un color que no calza, el bloque va sin tipo',texto(leerGrilla([fotoReal({colores:otros,conLeyenda:false})]).FIS1514)==='M 09:40-10:50 - -');
chk('el sábado cortado («Sábad») igual cuenta',texto(leerGrilla([fotoReal({sabado:true})]).IIC2233)==='S 11:00-12:10 Cátedra -');
chk('el semestre de la foto se lee',run(`periodoDeFotoHorario(${json([{texto:'2026 Primer Semestre'}])})`)==='2026-1'&&run('periodoDeFotoHorario([{texto:"sin fecha"}])')===null);
const conUnos=fotoReal();conUnos.palabras=conUnos.palabras.map(p=>p.texto==='FIS1514-'?{...p,texto:'F1S1514-'}:p);
chk('«F1S1514-» se lee como FIS1514 solo porque existe en el catálogo',texto(leerGrilla([conUnos]).FIS1514)==='M 09:40-10:50 Cátedra -');
chk('sin píxeles (otra versión del lector) no hay tipo, pero sí horario',texto(leerGrilla([{...fotoReal(),pixeles:null}]).FIS1514)==='M 09:40-10:50 - -');
// Caso real (pantallazo de iPhone, 2026-11-15): el cuadrito de «Laboratorio» de la
// leyenda salió desteñido y el celeste de la celda quedaba más cerca del lila del taller.
chk('celeste con leyenda desteñida sigue siendo laboratorio, no taller',
  run('distanciaTinte([179,212,244],[204,225,246])<distanciaTinte([179,212,244],[198,195,247])'));
chk('aunque un cuadrito de la leyenda salga desteñido (30 %, como en el caso real), cada color sigue en su tipo',
  run(`COLORES_TIPO_UC.every(([t,c])=>{const pal=COLORES_TIPO_UC.map(([u,d])=>[u,u===t?d.map(v=>v+(255-v)*0.3):d]);
    return pal.reduce((m,p)=>distanciaTinte(c,p[1])<distanciaTinte(c,m[1])?p:m)[0]===t;})`));

(async()=>{
  console.log('\n=== BuscaCursos pone la sala y los profesores ===');
  run(`S.tenant='uc';_buscacursosNoDisponible=false;globalThis.__rpc=[];supabaseClient={rpc:async(fn,args)=>{__rpc.push([fn,args]);
    if(args.p_sigla==='MAT1620')return {data:[{periodo:'2026-2',sigla:'MAT1620',seccion:2,profesores:['Persona Sintética','Sin informar'],
      horario:[{dias:['L','W','V'],modulo:4,tipo:'CLAS',sala:'K201'},{dias:['J'],modulo:1,tipo:'LAB',sala:'LAB-3'},{dias:['M'],modulo:2,tipo:'CLAS',sala:'SIN SALA'},{dias:['L'],modulo:5,tipo:'CLAS',sala:'B12'},{dias:['S'],modulo:2,tipo:'AYUD',sala:''}]}],error:null};
    if(args.p_sigla==='IIC2233')return {data:[{sigla:'IIC2233',seccion:2,profesores:[],horario:[{dias:['M','J'],modulo:3,tipo:'CLAS',sala:'A5'},{dias:['V'],modulo:9,tipo:'TAL',sala:null},{dias:['L'],modulo:null,tipo:'CLAS',sala:'X'}]}],error:null};
    return {data:[],error:null};}};`);
  ctx.__foto=[fotoReal()];
  const codigosBC=[{sigla:'MAT1620',seccion:2},{sigla:'FIS1514',seccion:13},{sigla:'IIC2233',seccion:2}];
  ctx.__cod=codigosBC;
  let rev=await run(`clasesParaRevisionHorario(__foto,${existe},__cod,null)`);
  const de=sg=>rev.clases.find(c=>c.sigla===sg);
  chk('la consulta va a la RPC pública con período y sigla',run(`__rpc.some(([fn,a])=>fn==='catalogo_uc_secciones_publicas'&&a.p_periodo==='2026-2'&&a.p_sigla==='MAT1620')`));
  chk('la sala sale de BuscaCursos para el bloque que calza',texto(de('MAT1620').bloques).includes('LWV 12:20-13:30 Cátedra K201')&&texto(de('MAT1620').bloques).includes('J 08:20-09:30 Laboratorio LAB-3'));
  chk('día, módulo y tipo siguen siendo los de la foto',texto(de('MAT1620').bloques).includes('L 14:50-16:00 Ayudantía B12'));
  chk('un tipo distinto se avisa, no se corrige en silencio',de('MAT1620').diferencias.includes('lun mód. 5 ayudantía es cátedra en BuscaCursos'));
  chk('lo que BuscaCursos trae y la foto no, se avisa',de('MAT1620').diferencias.includes('BuscaCursos además trae sáb mód. 2 ayudantía'));
  chk('los profesores ocultos («Sin informar») no se muestran',JSON.stringify(de('MAT1620').profesores)==='["Persona Sintética"]');
  chk('«SIN SALA» de BuscaCursos no se guarda como sala',de('MAT1620').diferencias.includes('BuscaCursos además trae mar mód. 2 cátedra')&&!JSON.stringify(rev).includes('SIN SALA'));
  chk('una sección que no está en BuscaCursos queda con la foto, sin sala',texto(de('FIS1514').bloques)==='M 09:40-10:50 Cátedra -');
  chk('un ramo sin grilla en la foto toma el horario de BuscaCursos (módulos válidos)',texto(de('IIC2233').bloques)==='MJ 11:00-12:10 Cátedra A5 | V 20:10-21:20 Taller -');
  chk('con BuscaCursos respondiendo no hay aviso de salas',!rev.avisos.some(a=>/No pudimos traer/.test(a)));
  run(`globalThis.__rcs=ramoConSigla;ramoConSigla=s=>null;_horarioUCReconocido=[{sigla:'MAT1620',nombre:'Cálculo II',seccion:2,marcado:true}];_horarioSeccionesUC=[];_horarioAvisosUC=[];
    _horarioClasesUC=[{sigla:'MAT1620',nombre:'Cálculo II',bloques:[],profesores:['Persona Sintética'],diferencias:['lun mód. 5 ayudantía es cátedra en BuscaCursos'],marcado:true}];pintarRevisionHorarioUC();`);
  chk('la revisión muestra los profesores y lo que no calza',/Profesor según BuscaCursos: Persona Sintética/.test(get('modal-content').innerHTML)&&/No calza con BuscaCursos: lun mód\. 5 ayudantía es cátedra en BuscaCursos/.test(get('modal-content').innerHTML));
  run('ramoConSigla=__rcs');

  run(`_buscacursosNoDisponible=false;supabaseClient={rpc:async()=>({data:[{sigla:'MAT1640',seccion:1,profesores:[],horario:[{dias:['J'],modulo:6,tipo:'LAB',sala:'SIN SALA'}]}],error:null})}`);
  const sinSala=await run(`proponerHorarioDesdeCatalogo({tenant:'uc',sigla:'MAT1640',seccion:1,periodo:'2026-2'})`);
  chk('«SIN SALA» de BuscaCursos no se guarda como sala',!!sinSala&&sinSala.celdas.length===1&&sinSala.celdas[0].sala===''&&sinSala.celdas[0].tipo==='Laboratorio');

  console.log('\n=== Sin BuscaCursos la foto sigue sola ===');
  run(`_buscacursosNoDisponible=false;__rpc=[];supabaseClient={rpc:async(fn,args)=>{__rpc.push(fn);return {data:null,error:{code:'PGRST202',message:'Could not find the function'}};}}`);
  rev=await run(`clasesParaRevisionHorario(__foto,${existe},__cod,null)`);
  chk('la RPC que todavía no existe no rompe nada',!!de('MAT1620')&&texto(de('MAT1620').bloques).startsWith('LWV 12:20-13:30 Cátedra -'));
  chk('avisa que las salas quedan vacías y editables',rev.avisos.some(a=>/No pudimos traer las salas de BuscaCursos/.test(a)));
  const preguntas=run('__rpc.length');
  await run(`proponerHorarioDesdeCatalogo({tenant:'uc',sigla:'MAT1620',seccion:2})`);
  chk('después de saber que no existe, no vuelve a preguntar',run('__rpc.length')===preguntas);
  run(`_buscacursosNoDisponible=false;supabaseClient={rpc:()=>Promise.reject(new Error('sin conexión'))}`);
  chk('sin conexión tampoco',await run(`proponerHorarioDesdeCatalogo({tenant:'uc',sigla:'MAT1620',seccion:2})`)===null);
  run(`supabaseClient=null`);
  chk('sin cliente, null',await run(`proponerHorarioDesdeCatalogo({tenant:'uc',sigla:'MAT1620',seccion:2})`)===null);
  chk('fuera de la UC no consulta',await run(`proponerHorarioDesdeCatalogo({tenant:'fen',sigla:'MAT1620',seccion:2})`)===null);
  ctx.__fotoVieja=[{...fotoReal(),texto:'2026 Primer Semestre'}];
  rev=await run(`clasesParaRevisionHorario(__fotoVieja,${existe},[],null)`);
  chk('una foto de otro semestre se avisa',rev.avisos.some(a=>/período 2026-1/.test(a)));

  console.log('\n=== La revisión: nada se guarda sin confirmar ===');
  run(`S.tenant='uc';S.carrera='ING-PC';globalThis.__g=0;save=()=>{__g++};renderHome=()=>{};openModal=()=>{};closeModal=()=>{};showToast=m=>{globalThis.__toast=m};track=()=>{};
    var CURSOS_UC_FULL=[['MAT1620','Cálculo II',10],['FIS1514','Dinámica',10],['IIC1103','Introducción a la Programación',10],['TTF012','Revelación y Fe',2]];cargarCursosUC=async()=>true;
    S.ramos=[normalize({ramos:[
      {id:'r-mat',nombre:'Cálculo II',sigla:'MAT1620',color:'#7F77DD',categorias:[{id:'c1',nombre:'Interrogaciones',peso:100,notas:[{id:'n1',valor:5.5,peso:1}]}],gates:[],
       horario:horarioDesdeModulos('uc',['V'],[5],{sala:'Z1',tipo:'Cátedra'})},
      {id:'r-fis',nombre:'Dinámica',sigla:'FIS1514',color:'#1D9E75',categorias:[],gates:[]}]}).ramos].flat();`);
  const notasAntes=run('JSON.stringify(S.ramos.map(r=>r.categorias))');
  run('abrirImportarHorarioBuscacursos()');
  ctx.__lect=[{texto:'',palabras:base}];
  await run('reconocerHorarioBuscacursos(__lect)');
  const modal=get('modal-content').innerHTML;
  chk('muestra las clases leídas de cada ramo',/Clases de cada ramo/.test(modal)&&/Lun y mié · 08:20–09:30 · Cátedra · K201/.test(modal)&&/Mar · 14:50–16:00 · Laboratorio · AP101/.test(modal));
  chk('cada ramo tiene su botón Corregir con nombre para VoiceOver',/aria-label="Corregir las clases de Dinámica"/.test(modal));
  chk('el ramo que ya tenía horario va desmarcado y lo dice',run(`(()=>{const r=_horarioClasesUC.find(x=>x.sigla==='MAT1620');return r.reemplaza&&!r.marcado;})()`)&&/Reemplaza el horario que tenías/.test(modal));
  chk('los ramos sin horario van marcados',run(`_horarioClasesUC.filter(x=>x.sigla!=='MAT1620').every(x=>x.marcado)`));
  chk('todavía no cambia nada',run('__g===0&&S.ramos.length===2')&&run('S.ramos[0].horario[0].sala')==='Z1');

  console.log('\n=== Corregir vuelve a la revisión sin guardar ===');
  // La hoja de edición real necesita un DOM: acá se prueba su contrato
  // reemplazando abrirEditorHorario por uno que devuelve lo corregido.
  run(`globalThis.__editor=null;abrirEditorHorario=o=>{__editor=o;};`);
  const iFis=run(`_horarioClasesUC.findIndex(x=>x.sigla==='FIS1514')`);
  run(`corregirClasesRevisionHorario(${iFis})`);
  chk('abre la hoja con las clases leídas y el botón Listo',run('__editor.titulo')==='Clases de Dinámica'&&run('__editor.textoGuardar')==='Listo'&&run('__editor.bloques.length')===1);
  run(`__editor.alGuardar([{...__editor.bloques[0],sala:'BC27'}])`);
  chk('lo corregido queda en la revisión, sin guardar',run(`_horarioClasesUC[${iFis}].bloques[0].sala`)==='BC27'&&run('__g')===0&&/MJ|Mar y jue · 09:40–10:50 · Cátedra · BC27/.test(get('modal-content').innerHTML));
  run(`corregirClasesRevisionHorario(${iFis});__editor.alGuardar([])`);
  chk('si se borran todas las clases, el ramo queda desmarcado',run(`_horarioClasesUC[${iFis}].marcado`)===false);
  run(`corregirClasesRevisionHorario(${iFis});__editor.alGuardar([{id:'x1',dias:['M','J'],inicio:'09:40',fin:'10:50',sala:'BC27',tipo:'Cátedra'}])`);

  console.log('\n=== Aplicar escribe solo el horario ===');
  const i=s=>run(`_horarioUCReconocido.findIndex(r=>r.sigla==='${s}')`),c=s=>run(`_horarioClasesUC.findIndex(r=>r.sigla==='${s}')`);
  marcas={'.horario-ramo-check':[{checked:true,dataset:{i:String(i('IIC1103'))}},{checked:false,dataset:{i:String(i('TTF012'))}}],
    '.horario-seccion-check':[],
    '.horario-clases-check':[{checked:false,dataset:{i:String(c('MAT1620'))}},{checked:true,dataset:{i:String(c('FIS1514'))}},{checked:true,dataset:{i:String(c('IIC1103'))}},{checked:true,dataset:{i:String(c('TTF012'))}}]};
  run('aplicarHorarioBuscacursos()');marcas={};
  chk('el ramo nuevo se agrega con sus clases',run(`(()=>{const r=ramoConSigla('IIC1103');return !!r&&r.horario.length===2&&r.horario[0].tipo==='Laboratorio'&&r.horario[0].sala==='AP101';})()`));
  chk('lo corregido en la revisión es lo que se guarda',run(`ramoConSigla('FIS1514').horario.map(b=>b.dias.join('')+b.sala).join()`)==='MJBC27');
  chk('el horario de un ramo que no se agregó se descarta',run(`!ramoConSigla('TTF012')`));
  chk('el horario desmarcado no se reemplaza',run(`ramoConSigla('MAT1620').horario.map(b=>b.sala).join()`)==='Z1');
  chk('notas y pautas quedan iguales',run('JSON.stringify(S.ramos.filter(r=>r.sigla!=="IIC1103").map(r=>r.categorias))')===notasAntes);
  chk('guarda una sola vez',run('__g')===1);
  chk('el aviso junta todo en una frase',run('__toast')==='1 ramo agregado y 2 horarios guardados desde tu horario');
  chk('«Próxima clase» toma la sala leída',run(`resumenHorarioClases(S.ramos,new Date('2026-11-17T12:00:00Z')).proximaClase.sala`)==='BC27');

  console.log('\n=== Un horario que cambió mientras revisabas no se pisa ===');
  run(`ramoConSigla('MAT1620').horario=[];abrirImportarHorarioBuscacursos()`);
  await run('reconocerHorarioBuscacursos(__lect)');
  run(`ramoConSigla('MAT1620').horario=horarioDesdeModulos('uc',['S'],[1],{sala:'Otro dispositivo'})`);
  marcas={'.horario-clases-check':[{checked:true,dataset:{i:String(c('MAT1620'))}}]};
  run('aplicarHorarioBuscacursos()');marcas={};
  chk('si llegó otro horario por sync, se conserva',run(`ramoConSigla('MAT1620').horario[0].sala`)==='Otro dispositivo');

  console.log('\n=== La semana en la Agenda (Día | Semana | Mes, también en la web) ===');
  run(`enAppNativa=()=>false;agendaVista='semana'`);
  chk('en la web también aparece «Día | Semana | Mes»',run('pintarVistaAgenda()')==='semana'&&get('agenda-vista').hidden===false&&/aria-pressed="true">Semana/.test(get('agenda-vista').innerHTML));
  run(`enAppNativa=()=>true;agendaVista='semana'`);
  chk('en la app, lo mismo',run('pintarVistaAgenda()')==='semana');
  run(`esCuentaProfesor=()=>true`);
  chk('una cuenta de profesor no lo ve',run('pintarVistaAgenda()')==='lista'&&get('agenda-vista').hidden===true);
  run(`esCuentaProfesor=()=>false`);
  run(`ramoConSigla('MAT1620').horario=horarioDesdeModulos('uc',['V'],[5],{sala:'Z1',tipo:'Cátedra'})`);
  const semana=run(`horarioSemanaHTML(S.ramos,new Date('2026-11-17T13:00:00Z'))`);
  chk('lunes a viernes; sin sábado si no hay clases el sábado',/>Lun</.test(semana)&&/>Vie</.test(semana)&&!/>Sáb</.test(semana));
  run(`ramoConSigla('IIC1103').horario.push(...horarioDesdeModulos('uc',['S'],[2],{}))`);
  chk('el sábado aparece cuando hay clases',/>Sáb</.test(run(`horarioSemanaHTML(S.ramos,new Date('2026-11-17T13:00:00Z'))`)));
  chk('cada clase es un botón con todo dicho para VoiceOver',/<button type="button" class="horario-semana-clase"[^>]*aria-label="Dinámica, Martes de 09:40 a 10:50, Cátedra, sala BC27"/.test(semana));
  chk('la sigla se parte entre letras y números, nunca a la mitad',/<b><span>FIS<\/span><span>1514<\/span><\/b>/.test(semana));
  chk('el día de hoy va marcado, con su fecha',/<span class="hoy">Mar<b>17<\/b><\/span>/.test(semana));
  chk('la clase mide al menos 44 pt de alto',[...semana.matchAll(/height:(\d+)px/g)].every(m=>+m[1]>=44));
  chk('el color del ramo es solo la línea lateral, sin semáforo',/--ramo:#1D9E75/.test(semana)&&!/var\(--(red|green|yellow|amber)/.test(semana));
  run(`globalThis.__tope=[{id:'t1',nombre:'A',sigla:'AAA100',color:'#111',horario:horarioDesdeModulos('uc',['L'],[1],{})},{id:'t2',nombre:'B',sigla:'BBB100',color:'#222',horario:horarioDesdeModulos('uc',['L'],[1],{})}]`);
  const tope=run(`horarioSemanaHTML(__tope,new Date('2026-11-17T13:00:00Z'))`);
  chk('dos clases que se topan van lado a lado',/left:calc\(0\*100%\/2\);width:calc\(100%\/2\)/.test(tope)&&/left:calc\(1\*100%\/2\)/.test(tope));
  chk('sin horario no hay grilla',run(`horarioSemanaHTML([{id:'x',nombre:'X',horario:[]}])`)==='');
  run(`S.ramos.forEach(r=>{r.horario=[]});renderHorarioSemana(document.getElementById('agenda-body'))`);
  chk('sin clases invita a subir la foto, con una sola acción principal',/Arma tu horario/.test(get('agenda-body').innerHTML)&&(get('agenda-body').innerHTML.match(/ag-empty-cta/g)||[]).length===1&&/Subir foto del horario/.test(get('agenda-body').innerHTML));
  chk('la vista no guarda nada al pintarse',run('__g')===1);

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
