// La recomendación de Inicio rota al abrir la app y la X la oculta hasta el
// día siguiente, desde el primer cierre. Nunca se guarda en gradehub_v1.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..');
const src=['data.js','engine.js','app.js','app-session.js','marketplace.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelectorAll(){return [];},querySelector(){return stub;},clientWidth:400,dataset:{},click(){}};
const guardado={};
const ctx={
  window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},
  localStorage:{getItem:k=>k in guardado?guardado[k]:null,setItem:(k,v)=>{guardado[k]=String(v);},removeItem:k=>{delete guardado[k];}},
  navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console,
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=n=>vm.runInContext(n,ctx);
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

// Pauta de ejemplo escrita acá, no sacada del catálogo.
const nota=(slot,valor)=>({id:'n'+slot,nombre:'Informe '+slot,slot,valor,peso:1});
const ramo=(id,valores)=>({id,nombre:'Cálculo I',sigla:'MAT1610',origen:{tenant:'uc',ramoKey:'MAT1610'},gates:[],categorias:[
  {id:'informes',nombre:'Informes',peso:70,slots:6,directNota:true,notas:valores.map((v,i)=>nota(i,v))},
  {id:'examen',nombre:'Examen',peso:30,directNota:true,notas:[]}]});
const aviso=(id)=>({id,tenant:'uc',ramos_siglas:['MAT1610'],criterios:{promedioMenorA:4,avanceMinimo:20},estado:'publicado',vence_at:'2099-01-01T00:00:00Z',titulo:'Cálculo I',precio_clp:15000});
const lunes=Date.parse('2026-09-28T09:00:00'),lunesTarde=Date.parse('2026-09-28T16:00:00'),martes=Date.parse('2026-09-29T09:00:00');
ctx.__avisos=[aviso('a1'),aviso('a2')];
const dia=(ramos,estado,t,visita='v1')=>{ctx.__r=ramos;ctx.__e=estado;ctx.__t=t;ctx.__v=visita;return run("recomendacionDelDia(__avisos,__r,'uc',__e,__t,__v)");};
const complicado=[ramo('r1',[3.5,3.5])],bien=[ramo('r1',[5.5,5.5])];

console.log('=== Una por apertura de la app ===');
let r=dia(complicado,{},lunes);
chk('elige una clase cuando el ramo calza',r.sel&&r.sel.anuncio.id==='a1'&&r.sel.ramo.id==='r1');
chk('y anota la franja y cuál fue',r.estado.franja==='2026-09-28-manana'&&r.estado.anuncioId==='a1');
const manana=r.estado;
chk('en la misma visita se mantiene al volver a Inicio',dia(complicado,manana,lunes+3600e3).sel?.anuncio.id==='a1');
// Desde el 2026-09-30 (pedido de Lucas), cada vez que se abre la app sale la
// siguiente de las clases que calzan, no una por mañana y tarde.
chk('al volver a abrir la app, sale la otra',dia(complicado,manana,lunes+3600e3,'v2').sel?.anuncio.id==='a2');
chk('y anota que ya van dos aperturas',dia(complicado,manana,lunes+3600e3,'v2').estado.aperturas===2);
chk('abrir en la tarde también rota',dia(complicado,manana,lunesTarde,'v2').sel?.anuncio.id==='a2');
chk('si sube la nota, desaparece en vez de quedar pegada',dia(bien,manana,lunes).sel===null);
chk('sin un ramo que calce, no hay nada',dia(bien,{},lunes).sel===null);
// Pasó en la prueba del 2026-09-25: Inicio se abrió antes de publicar la clase
// y la clase no apareció hasta el día siguiente.
chk('una franja sin nada que mostrar no queda tomada',(r=>r.sel===null&&!r.estado.franja)(dia(bien,{},lunes)));
ctx.__avisos=[];const vacio=dia(complicado,{},lunes).estado;ctx.__avisos=[aviso('a1'),aviso('a2')];
chk('si la clase se publica más tarde, aparece',dia(complicado,vacio,lunes+3600e3,'v2').sel?.anuncio.id==='a1');
chk('un estado de la versión anterior (una sola vez cerrada) no la descarta',dia(complicado,{dia:'2026-09-28',anuncioId:null,cerradaHoy:true,descartados:['a1']},lunes).sel?.anuncio.id==='a1');

console.log('\n=== Antes de una evaluación, ese ramo va primero (#664) ===');
// Dos ramos que calzan, cada uno con su clase. Química va segundo en el orden
// de la persona; las fechas de su Agenda deciden si pasa adelante.
const conFechas=(id,sigla,{fechaGrupo=null,fechaNota=null,valorConFecha=null}={})=>({id,nombre:'Ramo '+sigla,sigla,origen:{tenant:'uc',ramoKey:sigla},gates:[],categorias:[
  {id:'informes',nombre:'Informes',peso:70,slots:6,directNota:true,notas:[nota(0,3.5),nota(1,3.5),
    ...(fechaNota?[{...nota(2,valorConFecha),fecha:fechaNota}]:[])]},
  {id:'examen',nombre:'Examen',peso:30,directNota:true,fecha:fechaGrupo,notas:[]}]});
const avisoDe=(id,sigla)=>({...aviso(id),ramos_siglas:[sigla]});
ctx.__avisosFecha=[avisoDe('calculo','MAT1610'),avisoDe('quimica','QIM100A')];
const elige=ramos=>{ctx.__rf=ramos;return run(`seleccionarClaseApoyo(__avisosFecha,__rf,'uc',{ahora:${lunes}})?.anuncio.id`);};
const fechaDe=r=>{ctx.__rp=r;return run(`proximaEvaluacionClases(__rp,${lunes})`);};
chk('sin fechas manda el orden de la persona, como antes',elige([conFechas('c','MAT1610'),conFechas('q','QIM100A')])==='calculo');
chk('con el examen de Química en 3 días, va primero Química',
  elige([conFechas('c','MAT1610'),conFechas('q','QIM100A',{fechaGrupo:'2026-10-01'})])==='quimica');
chk('con los dos en la semana, el más cercano',
  elige([conFechas('c','MAT1610',{fechaGrupo:'2026-10-02'}),conFechas('q','QIM100A',{fechaGrupo:'2026-09-29'})])==='quimica');
chk('una evaluación en más de 7 días todavía no cuenta',
  elige([conFechas('c','MAT1610'),conFechas('q','QIM100A',{fechaGrupo:'2026-10-06'})])==='calculo');
chk('la de hoy y la del día 7 sí',fechaDe(conFechas('q','QIM100A',{fechaGrupo:'2026-09-28'}))==='2026-09-28'&&
  fechaDe(conFechas('q','QIM100A',{fechaGrupo:'2026-10-05'}))==='2026-10-05');
chk('una que ya pasó no cuenta',fechaDe(conFechas('q','QIM100A',{fechaGrupo:'2026-09-27'}))===null);
chk('una nota con fecha propia y sin nota cuenta',fechaDe(conFechas('q','QIM100A',{fechaNota:'2026-09-30'}))==='2026-09-30');
chk('si esa nota ya está puesta, no',fechaDe(conFechas('q','QIM100A',{fechaNota:'2026-09-30',valorConFecha:3.5}))===null);
ctx.__lleno={...conFechas('q','QIM100A'),categorias:[{id:'k',nombre:'Control',peso:100,slots:1,fecha:'2026-09-30',notas:[nota(0,3.5)]}]};
chk('un grupo con todas sus casillas con nota no cuenta',run(`proximaEvaluacionClases(__lleno,${lunes})`)===null);
chk('un ramo que no calza no gana por tener fecha',
  elige([conFechas('c','MAT1610'),{...conFechas('q','QIM100A',{fechaGrupo:'2026-10-01'}),categorias:ramo('x',[6.5,6.5]).categorias.map((c,i)=>i?{...c,fecha:'2026-10-01'}:c)}])==='calculo');
chk('no cambia el orden de los ramos guardados',(()=>{const rs=[conFechas('c','MAT1610'),conFechas('q','QIM100A',{fechaGrupo:'2026-10-01'})];elige(rs);return rs[0].id==='c';})());

console.log('\n=== Dos clases del mismo ramo se alternan en cada apertura ===');
// Antes ganaba siempre la publicada último, y la otra casi no salía en Inicio.
let est={},seq=[];
for(const v of ['v1','v2','v3','v4']){const x=dia(complicado,est,lunes,v);seq.push(x.sel?.anuncio.id);est=x.estado;}
chk('abrir cuatro veces: a1, a2, a1, a2',seq.join()==='a1,a2,a1,a2');
chk('dentro de una misma apertura, siempre la misma',dia(complicado,est,lunes+3*3600e3,'v4').sel?.anuncio.id==='a2');
ctx.__r0=complicado[0];ctx.__avisosInv=[aviso('a2'),aviso('a1')];
chk('el orden en que llegan no cambia a quién le toca',
  run(`seleccionarClaseApoyo(__avisosInv,[__r0],'uc',{ahora:${lunes},turno:0})?.anuncio.id`)==='a1');
ctx.__uno=[aviso('solo')];
chk('con una sola clase, sale en todas las aperturas',
  [0,1,2].every(n=>run(`seleccionarClaseApoyo(__uno,[__r0],'uc',{ahora:${lunes},turno:${n}})?.anuncio.id`)==='solo'));

console.log('\n=== La X oculta los anuncios hasta el día siguiente (2026-10-28) ===');
const cerrar=t=>run(`textoCierreClase(descartarRecomendacionClase('a1',${t}))`);
const estadoGuardado=()=>JSON.parse(guardado.gradehub_marketplace_v1);
delete guardado.gradehub_marketplace_v1;
const domingo=Date.parse('2026-09-27T10:00:00');
let e1=dia(complicado,{},domingo).estado;guardado.gradehub_marketplace_v1=JSON.stringify(e1);
chk('verla sin cerrarla no la oculta',!e1.cerrada&&dia(complicado,e1,lunes).sel!==null);
chk('el primer cierre en la mañana avisa que no habrá más anuncios hoy',cerrar(lunes)==='Listo, no te mostramos más anuncios por hoy');
let e2=estadoGuardado();
chk('y no vuelve en lo que queda de mañana, aunque se abra de nuevo',dia(complicado,e2,lunes+3600e3,'v2').sel===null);
chk('tampoco vuelve a las 14:00 del primer día',dia(complicado,e2,Date.parse('2026-09-28T14:00:00'),'v3').sel===null);
chk('ni en la tarde aunque se vuelva a abrir',dia(complicado,e2,lunesTarde,'v4').sel===null);
chk('cerrarla no se reemplaza por otra campaña',dia(complicado,e2,lunesTarde,'otra-visita').sel===null);
chk('antes de medianoche todavía está oculta',dia(complicado,e2,Date.parse('2026-09-28T23:59:59.999'),'v5').sel===null);
const medianoche=Date.parse('2026-09-29T00:00:00');
chk('el cierre vence exactamente a la medianoche, no 24 horas después',e2.ocultaHasta===medianoche);
chk('en la medianoche vuelve incluso sin cambiar de visita',dia(complicado,e2,medianoche,'v5').sel!==null);
chk('al día siguiente en la mañana vuelve',dia(complicado,e2,martes,'v6').sel!==null);
cerrar(martes);
let e4=estadoGuardado();
const martesTarde=Date.parse('2026-09-29T16:00:00'),miercoles=Date.parse('2026-09-30T09:00:00');
chk('y no vuelve en la tarde de ese día',dia(complicado,e4,martesTarde,'v6').sel===null);
chk('al otro día vuelve: nunca se esconde para siempre',dia(complicado,e4,miercoles,'v7').sel!==null);
chk('cerrar la misma clase muchas veces no la descarta',(()=>{cerrar(miercoles);return dia(complicado,estadoGuardado(),Date.parse('2026-10-01T09:00:00'),'v8').sel?.anuncio.id;})()!==undefined);
chk('una campaña nueva también se cierra por todo el día desde la primera vez',
  run(`textoCierreClase(descartarRecomendacionClase('a2',${Date.parse('2026-10-01T10:00:00')}))`)==='Listo, no te mostramos más anuncios por hoy'&&
  dia(complicado,estadoGuardado(),Date.parse('2026-10-01T16:00:00'),'v9').sel===null);
chk('un cierre antiguo sin ocultaHasta se respeta por todo el día',
  dia(complicado,{franja:'2026-09-28-manana',cerrada:true,descartadasDefinitivas:['a1']},lunes,'v9').sel===null&&
  dia(complicado,{franja:'2026-09-28-manana',cerrada:true},lunesTarde,'v9').sel===null&&
  dia(complicado,{franja:'2026-09-28-manana',cerrada:true,descartadasDefinitivas:['a1']},martes,'v9').sel?.anuncio.id==='a1');
const cierreAnterior={franja:'2026-09-28-manana',cerrada:true,ocultaHasta:Date.parse('2026-09-28T14:00:00'),primerCierre:{a1:'2026-09-28'},aperturas:8};
chk('un cierre anterior que vencía a las 14:00 ahora dura hasta mañana',dia(complicado,cierreAnterior,lunesTarde,'v10').sel===null&&dia(complicado,cierreAnterior,medianoche,'v11').sel!==null);
guardado.gradehub_marketplace_v1=JSON.stringify(cierreAnterior);cerrar(martes);
chk('conserva campos guardados y la rotación de versiones anteriores',estadoGuardado().primerCierre.a1==='2026-09-28'&&estadoGuardado().aperturas===8);
cerrar(Date.parse('2026-09-29T23:59:59'));
chk('cerrar justo antes de medianoche no oculta hasta la noche siguiente',dia(complicado,estadoGuardado(),Date.parse('2026-09-30T00:00:00'),'v12').sel!==null);

// La próxima fecha local es robusta a cambio de mes/año y al horario de verano.
const zonaAnterior=process.env.TZ;process.env.TZ='America/Santiago';
for(const [nombre,cierre,retorno] of [
  ['fin de mes','2026-10-31T22:00:00','2026-11-01T00:00:00'],
  ['fin de año','2026-12-31T22:00:00','2027-01-01T00:00:00'],
  ['cambio de hora en abril','2026-04-04T10:00:00','2026-04-05T00:00:00'],
  ['cambio de hora en septiembre','2026-09-05T10:00:00','2026-09-06T00:00:00']]){
  const t=Date.parse(cierre),vuelve=Date.parse(retorno);cerrar(t);const e=estadoGuardado();
  chk(nombre+': sigue oculta antes de cambiar el día',e.ocultaHasta===vuelve&&dia(complicado,e,vuelve-1,'antes').sel===null);
  chk(nombre+': vuelve en el primer instante del día siguiente',dia(complicado,e,vuelve,'despues').sel!==null);
}
if(zonaAnterior===undefined)delete process.env.TZ;else process.env.TZ=zonaAnterior;

console.log('\n=== Dónde vive ===');
chk('se guarda en su propia clave, no en gradehub_v1',!('gradehub_v1' in guardado)&&'gradehub_marketplace_v1' in guardado);
guardado.gradehub_marketplace_v1='{roto';
chk('un valor dañado no rompe Inicio',JSON.stringify(run('leerEstadoMarketplace()'))==='{}');
const mk=fs.readFileSync(path.join(raiz,'marketplace.js'),'utf8'),rm=fs.readFileSync(path.join(raiz,'render-main.js'),'utf8');
const bloque=mk.slice(mk.indexOf('function pintarRecomendacionClase'),mk.indexOf('async function abrirClaseRecomendada'));
const contenido=mk.slice(mk.indexOf('function contenidoRecomendacionClase'),mk.indexOf('function pintarRecomendacionClase'));
chk('la X anuncia el cierre por hoy para lectores de pantalla',/aria-label="Ocultar anuncios por hoy"/.test(contenido));
chk('el banner dice publicidad, igual que la vista previa del profesor',
  /Publicidad · \$\{etiquetaTipoClase\(a\)\}/.test(contenido)&&/'Clase particular'/.test(mk.slice(mk.indexOf('function etiquetaTipoClase'),mk.indexOf('function etiquetaTipoClase')+120))
  &&/contenidoRecomendacionClase\(anuncio\)/.test(bloque));
chk('y no diagnostica',!/reprob|riesgo|mal en|te va mal/i.test(bloque+contenido));
chk('solo Inicio lo pinta',/pintarRecomendacionClase\(c\)/.test(rm.slice(rm.indexOf('function renderHome'),rm.indexOf('function renderRamo')))&&
  !/pintarRecomendacionClase/.test(rm.slice(rm.indexOf('function renderRamo'))));
chk('el alcance se registra como recomendación',/registrarAlcanceAnuncio\(anuncio\.id,'recomendacion'\)/.test(mk));
chk('hay un interruptor para apagarlo',/const RECOMENDACIONES_CLASES_ACTIVAS=/.test(mk));

console.log('\n=== Un ramo con laboratorio vinculado también recibe la recomendación ===');
// Pasó el 2026-09-26 con Dinámica: sus evaluaciones suman 100 (la nota de
// cátedra) y el laboratorio se combina encima con `aporta`, como hace el motor.
// La recomendación esperaba que sumaran 70 y descartaba a todo el que lo cursa.
const catedra={id:'cat',nombre:'Mecánica',sigla:'FIS9999',origen:{tenant:'uc',ramoKey:'FIS9999'},gates:[],
  aporta:{ramo:'Laboratorio de Mecánica',peso:30,min:4.0},categorias:[
  {id:'i1',nombre:'Interrogación 1',peso:40,directNota:true,notas:[{id:'x1',nombre:'Interrogación 1',valor:3.2,peso:1}]},
  {id:'ex',nombre:'Examen',peso:60,directNota:true,notas:[]}]};
const lab={id:'lab',nombre:'Laboratorio de Mecánica',sigla:'FIS9998',origen:{tenant:'uc',ramoKey:'FIS9998'},gates:[],categorias:[
  {id:'inf',nombre:'Informes',peso:100,slots:4,directNota:true,notas:[{id:'y1',nombre:'Informe 1',slot:0,valor:3.5,peso:1}]}]};
ctx.__avisosLab=[{...aviso('mec'),ramos_siglas:['FIS9999']}];
ctx.__ramosLab=[catedra,lab];
chk('la cátedra con laboratorio calza',run("seleccionarClaseApoyo(__avisosLab,__ramosLab,'uc',{ahora:"+lunes+"})")?.ramo.id==='cat');

console.log('\n=== En la grilla, la clase va junto a su ramo en cualquier posición ===');
// Pasó el 2026-09-26: con Dinámica en la última columna la clase se metía
// antes en el DOM, empujaba al ramo a la fila siguiente y quedaba lejos.
const el=()=>{const clases=new Set(),vars={};return {clases,vars,
  classList:{toggle:(c,on)=>{on?clases.add(c):clases.delete(c);}},
  style:{setProperty:(k,v)=>{vars[k]=v;},removeProperty:k=>{delete vars[k];}}};};
const grilla=(n,cols,pos)=>{
  const hijos=Array.from({length:n},el),banner=el();
  ctx.getComputedStyle=()=>({display:'grid',gridTemplateColumns:Array(cols).fill('400px').join(' ')});
  ctx.__c={children:[...hijos.slice(0,pos+1),banner,...hijos.slice(pos+1)]};ctx.__f=hijos[pos];ctx.__b=banner;
  run('colocarRecomendacionEnGrilla(__c,__f,__b)');
  return {f:hijos[pos].vars,b:banner.vars,izq:banner.clases.has('a-la-izquierda')};
};
let g=grilla(6,3,2);
chk('en la última columna, el ramo se queda en su casilla',g.f['--ca-fila']==='1'&&g.f['--ca-col-ramo']==='3');
chk('y la clase toma la de su izquierda, en la misma fila',g.b['--ca-fila']==='1'&&g.b['--ca-col-clase']==='2'&&g.izq);
g=grilla(6,3,4);
chk('en el medio de la segunda fila, la clase va a la derecha',g.f['--ca-fila']==='2'&&g.f['--ca-col-ramo']==='2'&&g.b['--ca-col-clase']==='3'&&!g.izq);
g=grilla(6,2,1);
chk('con dos columnas también',g.f['--ca-col-ramo']==='2'&&g.b['--ca-col-clase']==='1'&&g.b['--ca-fila']==='1');
ctx.getComputedStyle=()=>({display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))'});
ctx.__b=el();run('colocarRecomendacionEnGrilla(__c,__f,__b)');
chk('con la pantalla sin dibujar no adivina columnas',!ctx.__b.vars['--ca-fila']);

console.log('\n=== El contorno del logo se ve igual en Safari ===');
// Safari dibujaba el drop-shadow de 0,8px como un halo borroso (2026-09-26).
const css=fs.readFileSync(path.join(raiz,'styles.css'),'utf8');
chk('el logo no usa filter para su contorno',!/\.logo-contorno[^{]*\{[^}]*filter/.test(css));
chk('lo pinta un canvas y no se vuelve a procesar',/function dibujarContornoLogoClase/.test(mk)&&/dataset\.contorno==='1'/.test(mk));

console.log('\nPASS: '+ok+'   FAIL: '+fail);
process.exit(fail?1:0);
