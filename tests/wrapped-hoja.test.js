// Wrapped 2026-2 («la hoja de respuestas»): las historias nuevas salen solo
// cuando hay datos, con el motor de siempre. Datos sintéticos, pauta adentro.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
process.env.TZ='America/Santiago';
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
function el(){const n={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;}},dataset:{},innerHTML:'',
  addEventListener(){},appendChild(h){return h;},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return el();},querySelectorAll(){return [];},focus(){},remove(){}};return n;}
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>el(),createElement:el,addEventListener(){},removeEventListener(){},documentElement:el(),querySelector(){return el();},querySelectorAll(){return [];},body:el()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);
const nota=(id,valor,fecha)=>({id,nombre:id,valor,fecha});
const ramo=(nombre,notas)=>({id:nombre,nombre,color:'#000',gates:[],categorias:[{id:nombre+'c',nombre:'Pruebas',peso:100,notas}]});
const datos=(ramos,historial=[])=>{ctx.__r=ramos;run(`S={...freshState(),tenant:'uc',userName:'Ana Sintética Pérez',historial:${JSON.stringify(historial)},ramos:__r}`);
  return run('extrasWrapped(datosWrapped(S.ramos),S.ramos,true)');};
const check=(n,f)=>{f();console.log('  OK   '+n);};

check('la semana pesada sale desde tres evaluaciones en la misma semana',()=>{
  const d=datos([ramo('A',[nota('a1',5,'2026-09-14'),nota('a2',5,'2026-09-15'),nota('a3',6,'2026-09-18'),nota('a4',6,'2026-10-20')])]);
  assert.equal(d.semana.k,3);assert.equal(d.semana.lunes,'2026-09-14');
  assert.equal(datos([ramo('A',[nota('a1',5,'2026-09-14'),nota('a2',5,'2026-09-25')])]).semana,null);
});
check('la semana usa el calendario y el cierre reúne las acciones',()=>{
  datos([ramo('A',[nota('a1',6,'2026-09-14'),nota('a2',6.4,'2026-09-15'),nota('a3',6.8,'2026-09-18')]),
    ramo('B',[nota('b1',4.4,'2026-09-16'),nota('b2',4.9,'2026-10-02'),nota('b3',4.6,'2026-11-18')])]);
  const s=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos),null,"2026-2")');
  const semana=s.find(x=>x.forma==='objeto');
  assert.ok(semana&&!semana.big&&/<b>4<\/b> evaluaciones/.test(semana.titulo));
  assert.equal(s.at(-1).tipo,'final');assert.doesNotMatch(JSON.stringify(s),/El ramo que más costó/);
});
check('sin fechas no hay semana, comienzo, nota que movió ni remontada, y no revienta',()=>{
  const d=datos([ramo('A',[nota('a1',5),nota('a2',6)]),ramo('B',[nota('b1',4)])]);
  assert.equal(d.semana,null);assert.equal(d.remontada,null);
  assert.doesNotMatch(JSON.stringify(run('slidesWrapped(datosWrapped(S.ramos),null,"2026-2")')),/NaN|undefined/);
});
check('la remontada exige estar bajo 4,0 a mitad de camino y terminar aprobado',()=>{
  const d=datos([ramo('Cálculo',[nota('c1',3.0,'2026-08-20'),nota('c2',3.4,'2026-09-15'),nota('c3',6.8,'2026-10-20'),nota('c4',6.5,'2026-11-20')])]);
  assert.equal(d.remontada.r.nombre,'Cálculo');assert.equal(d.remontada.mes,'septiembre');
  assert.equal(d.personalidad.id,'remontada');
  const reprobado=datos([ramo('Cálculo',[nota('c1',3.0,'2026-08-20'),nota('c2',3.1,'2026-09-15'),nota('c3',3.2,'2026-10-20')])]);
  assert.equal(reprobado.remontada,null,'no celebra una remontada que no aprobó');
});
check('la personalidad sigue el orden de la tabla y la elegida va entre las cinco alternativas',()=>{
  const siete=datos([ramo('A',[nota('a1',7,'2026-08-20'),nota('a2',7,'2026-09-20'),nota('a3',6,'2026-10-20')])]);
  assert.equal(siete.personalidad.id,'siete');
  const parejo=datos([ramo('A',[nota('a1',5.0,'2026-08-20'),nota('a2',5.2,'2026-09-20'),nota('a3',5.1,'2026-10-20')])]);
  assert.equal(parejo.personalidad.id,'parejo');
  for(const p of [siete.personalidad,parejo.personalidad]){
    assert.equal(p.opciones.length,5);assert.ok(p.opciones.some(o=>o.id===p.id));assert.equal(p.opciones['ABCDE'.indexOf(p.letra)].id,p.id);
  }
});
check('las revelaciones dibujan datos reales: días de la semana, antes y después, curva y semestre anterior',()=>{
  const sem=datos([ramo('A',[nota('a1',5,'2026-09-14'),nota('a2',5,'2026-09-16'),nota('a3',6,'2026-09-16'),nota('a4',6,'2026-10-20')])]).semana;
  assert.deepEqual(Array.from(sem.dias),[1,0,2,0,0,0,0]);
  assert.match(run(`semanaWrapped(${JSON.stringify(sem.dias)})`),/dia tope/,'el miércoles, con dos, va resaltado');
  assert.doesNotMatch(run('semanaWrapped([1,1,1,0,0,0,0])'),/tope/,'con una por día no se resalta ninguno');
  const rem=datos([ramo('Cálculo',[nota('c1',3.0,'2026-08-20'),nota('c2',3.4,'2026-09-15'),nota('c3',6.8,'2026-10-20'),nota('c4',6.5,'2026-11-20')])]).remontada;
  assert.equal(rem.serie.length,4);assert.equal(rem.serie[rem.iMinimo],rem.minimo);assert.ok(rem.iMinimo>=1,'la curva parte desde la segunda nota');
  assert.doesNotMatch(run(`curvaWrapped(${JSON.stringify(rem.serie.slice(1))},${rem.iMinimo-1},${rem.final})`),/NaN/);
});
check('con pocos datos no repite ni inventa: primera=mejor, un solo ramo',()=>{
  const uno=datos([ramo('A',[nota('a1',5.5,'2026-09-01')])]);
  const s=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),null,"2026-2",null)');
  assert.ok(!s.some(x=>x.k==='Tu primera nota fue un'),'la primera nota es la mejor: la cuenta la goma');
  assert.deepEqual(Array.from(s,x=>x.tipo),['umbral','ramos','final']);
  assert.ok(!JSON.stringify(s).includes('ramo estrella')&&!JSON.stringify(s).includes('Ramo estrella'),'con un ramo no hay estrella');
  assert.ok(uno);
});
check('pulido tras la revisión en el iPhone: desempate, goma, empuje y útiles',()=>{
  const html=run('rankingWrapped([{nombre:"A",avg:6.42},{nombre:"B",avg:6.38},{nombre:"C",avg:4.9}])');
  assert.match(html,/6,42[\s\S]*6,38[\s\S]*4,9</,'los empatados con un decimal llevan el segundo; el resto, uno');
  const goma=run('gomaWrapped("7,0",false)');
  assert.match(goma,/hoja-goma pantalla/);assert.match(goma,/hoja-goma-btn/,'Borrar de una sigue para VoiceOver');
  assert.equal(run('gomaWrapped("7,0",false)'),goma,'el escondite es el mismo en cada apertura');
  assert.doesNotMatch(run('gomaWrapped("7,0",true)'),/canvas/);
  const emp=run('empujeWrapped("7,0",5.1,5.4)');
  assert.doesNotMatch(emp,/NaN/);assert.match(emp,/--desde:[\d.]+%;--hasta:[\d.]+%/);assert.match(emp,/>5,1<[\s\S]*>5,4</);
  for(const k of ['sacapuntas','gastado','regla','avion'])assert.match(run(`hojaObjeto("${k}")`),new RegExp(`data-obj="${k}"`));
});
check('la tarjeta lleva solo el primer nombre; las cifras van con coma',()=>{
  datos([ramo('A',[nota('a1',5.5,'2026-09-01'),nota('a2',6.5,'2026-10-01')])]);
  const slides=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),null,"2026-2")');
  const final=slides.at(-1);assert.equal(final.nombre,undefined);assert.doesNotMatch(JSON.stringify(slides),/Sintética|Pérez/);
  assert.doesNotMatch(JSON.stringify(slides.map(s=>String(s.big||'').replace(/<[^>]*>/g,''))),/\d\.\d/);
});
// Lucas, 2026-11-07: cada historia se prepara, hay preguntas y un semestre
// malo se cuenta con cuidado.
check('las alternativas numéricas son cuatro, distintas y con una sola correcta',()=>{
  for(const n of [1,2,3,7,13,40]){
    const o=run(`alternativasWrapped(${n})`);
    assert.equal(o.length,4,n);assert.equal(new Set(o.map(x=>x.texto)).size,4,n);
    assert.equal(JSON.stringify(o.filter(x=>x.correcta).map(x=>x.texto)),JSON.stringify([String(n)]));assert.ok(o.every(x=>Number(x.texto)>=1));
  }
  assert.notEqual(run('alternativasWrapped(12)').findIndex(x=>x.correcta),run('alternativasWrapped(13)').findIndex(x=>x.correcta));
});
check('las preguntas tienen la correcta entre sus alternativas y casi todo se prepara',()=>{
  datos([ramo('A',[nota('a1',5.5,'2026-09-01'),nota('a2',6.5,'2026-10-01')]),ramo('B',[nota('b1',4.8,'2026-09-08'),nota('b2',5.1,'2026-10-08')])]);
  const slides=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),null,"2026-2")');
  const preguntas=slides.filter(x=>x.tipo==='pregunta');
  assert.equal(preguntas.length,1);
  preguntas.forEach(q=>assert.equal(q.pregunta.opciones.filter(o=>o.correcta).length,1,q.titulo));
  assert.ok(slides.find(x=>x.tipo==='goma'));
  assert.ok(slides.filter(x=>x.prep).length>=2);
});
check('un semestre con un ramo reprobado trae ánimo y no compara hacia abajo',()=>{
  datos([ramo('A',[nota('a1',6.5,'2026-09-01'),nota('a2',6.0,'2026-10-01')]),ramo('B',[nota('b1',2.5,'2026-09-08'),nota('b2',3.0,'2026-10-08')])]);
  const d=run('extrasWrapped(datosWrapped(S.ramos),S.ramos,true)');assert.equal(d.reprobados,1);
  const slides=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),{curso:{ramo:"B",mejorQue:12,total:30},uni:{mejorQue:30,total:90}},"2026-2")');
  const animo=slides.find(x=>x.tipo==='animo');assert.ok(animo);assert.match(animo.viz,/Sacaste adelante <b>1<\/b> ramo\./);
  assert.ok(!slides.some(x=>/wrapped-regla/.test(x.viz||'')),'sin percentiles bajo el 50');
  assert.match(slides.find(x=>x.tipo==='promedio').prep.texto,/no cuenta toda la historia/);
  const bueno=run('slidesWrapped(extrasWrapped(datosWrapped([S.ramos[0]]),[S.ramos[0]],true),{curso:{ramo:"A",mejorQue:80,total:30}},"2026-2")');
  assert.ok(!bueno.some(x=>x.tipo==='animo'));assert.ok(!bueno.some(x=>/wrapped-regla/.test(x.viz||'')));
});
check('el recado: video de un profe bien calificado y nada más; sin video no se habla del recado',()=>{
  datos([ramo('A',[nota('a1',5.5,'2026-09-01')])]);
  run("S.ramos[0].seccion=3");
  const armar=r=>{ctx.__rec=r;return run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),null,"2026-2",__rec)');};
  for(const r of [null,undefined,{calificaciones:2,video:null}])assert.ok(!armar(r).some(x=>x.tipo==='video'),JSON.stringify(r));
  const con=armar({calificaciones:1,video:{src:'https://ejemplo.invalid/v.mp4',quien:'Profe <b>',ramo:'Ramo A'}});
  const v=con.find(x=>x.tipo==='video');assert.equal(v.k,'Un recado de Profe &lt;b&gt;');assert.ok(!v.sinCalificar);
  assert.ok(con.at(-1).accion,'quien ya calificó igual puede calificar a otro profe');
  const sin=armar({calificaciones:0,video:null});
  assert.ok(!sin.some(x=>x.tipo==='video'),'son pocos videos: a quien no calificó no se le promete uno');
  assert.equal(sin.filter(x=>x.accion).length,1,'la invitación a calificar sale una vez');
  assert.match(run('videoWrapped({src:null,quien:"tu profe"})'),/Aquí va el video del profe/);
  assert.match(run('videoWrapped({src:null,fallo:true,quien:"P"})'),/No pudimos cargar el video/);
  assert.match(run('videoWrapped({src:"https://ejemplo.invalid/p.mp4",quien:"P"})'),/p\.mp4#t=0\.1/,'sin póster, iPhone pinta el primer cuadro');
  assert.doesNotMatch(run('videoWrapped({src:"https://ejemplo.invalid/p.mp4",poster:"https://ejemplo.invalid/p.jpg",quien:"P"})'),/#t=/);
  assert.match(run('programarWrapped.toString()'),/s\.tipo==='video'\)\)\)return/,'el recado nunca avanza solo');
  assert.match(run('videoWrapped({src:"https://ejemplo.invalid/p.mp4",subtitulos:"https://ejemplo.invalid/p.vtt",quien:"Profe <b>"})'),/<track kind="captions"[^>]*>.*Profe &lt;b&gt;/s);
  assert.doesNotMatch(run('videoWrapped({src:"https://ejemplo.invalid/p.mp4",quien:"P"})'),/autoplay/);
  assert.match(fs.readFileSync(raiz+'_headers','utf8'),/media-src 'self' https:\/\/lsulsnswzesyekpsvlql\.supabase\.co;/);
});
check('cifraWrapped escribe con coma y conserva el signo',()=>{
  assert.match(run('cifraWrapped("+0.3")'),/>\+0,3<\/span>/);
});
check('volver por Anterior, flecha, toque o índice repite la introducción y la revelación',()=>{
  const nodos=new Map(),eventos=new Map(),ov=el();
  ov.addEventListener=(tipo,fn)=>eventos.set(tipo,fn);
  ov.querySelector=selector=>{
    if(!nodos.has(selector))nodos.set(selector,{...el(),hidden:true,getBoundingClientRect:()=>({left:0,width:300})});
    return nodos.get(selector);
  };
  ctx.document.createElement=()=>ov;
  ctx.document.body.children=[];
  ctx.DOMParser=class{
    parseFromString(html){return {body:{textContent:html.replace(/<[^>]*>/g,'')}};}
  };
  ctx.document.visibilityState='hidden'; // El reloj no avanza durante la prueba.
  const click=(selector,dataset={},clientX=0)=>eventos.get('click')({
    target:{closest:s=>s===selector?{dataset}:null},clientX
  });
  const boton=paso=>click('[data-paso]',{paso:String(paso)});
  const caja=ov.querySelector('.wrapped-slide');
  run(`montarWrapped([
    {prep:{texto:'La introducción de prueba'},titulo:'El dato de prueba',big:'6,3'},
    {titulo:'Otra historia'}
  ],{vistaPrevia:true})`);
  try{
    const comprobarHistoria=()=>{
      assert.equal(caja.dataset.fase,'prep');
      assert.match(caja.innerHTML,/La introducción de prueba/);
      assert.doesNotMatch(caja.innerHTML,/El dato de prueba/);
      boton(1);
      assert.equal(caja.dataset.fase,'revela');
      assert.match(caja.innerHTML,/El dato de prueba/);
      assert.match(caja.innerHTML,/6,3/);
    };
    comprobarHistoria();
    for(const volver of [
      ()=>boton(-1),
      ()=>run('teclaWrapped({key:"ArrowLeft"})'),
      ()=>click('.wrapped-slide',{},15),
      ()=>{click('.wrapped-indice-btn');click('[data-ir]',{ir:'0'});}
    ]){
      boton(1);
      assert.match(caja.innerHTML,/Otra historia/);
      volver();
      comprobarHistoria();
    }
  }finally{
    run('cerrarWrapped(true)');
    ctx.document.createElement=el;
    delete ctx.document.visibilityState;
    delete ctx.document.body.children;
    delete ctx.DOMParser;
  }
});

check('dos ramos con pocas notas tienen una hoja de nombres y un cierre sin cifras',()=>{
  datos([ramo('A',[nota('a',5)]),ramo('B',[nota('b',4)])]);
  for(const valor of ['normal','inválida']){
    if(valor==='inválida')run('S.ramos[0].categorias[0].notas[0].valor=NaN;S.ramos[0].notaOficial=5');
    const s=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos),null,"2026-2")');
    assert.deepEqual(Array.from(s,x=>x.tipo),['umbral','ramos','final']);
    assert.equal(s.at(-1).big,null);
    assert.doesNotMatch(JSON.stringify(s),/NaN|undefined|\b0 notas\b/);
  }
});
check('la personalidad sigue en la hoja y solo cuatro historias ofrecen compartir',()=>{
  const d=datos(run('ramosVistaPreviaWrapped()'));
  const slides=ctx.slidesWrapped(d,{curso:{ramo:'Ramo de prueba',mejorQue:82,total:39}},'2026-2');
  const apodo=slides.find(s=>s.pregunta?.opciones.some(o=>o.texto===d.personalidad.nombre&&o.correcta));
  assert.ok(apodo);assert.equal(apodo.compartible,undefined);
  assert.ok(slides.indexOf(apodo)>slides.findIndex(s=>s.tipo==='promedio'));
  assert.deepEqual(Array.from(slides.filter(s=>s.compartible),s=>s.compartible[0]),
    ['La vuelta del semestre','Mi mejor nota','Mi marca en la regla','Mi semestre']);
  assert.equal(slides.at(-1).compartible[1],'Entregué mi hoja.');
  const reprobado=run('ramosVistaPreviaWrapped()');
  reprobado[3].categorias[0].notas.forEach(n=>n.valor=3.3);
  const dificil=ctx.slidesWrapped(datos(reprobado),null,'2026-2');
  assert.ok(dificil.some(s=>s.tipo==='animo'));
  assert.deepEqual(Array.from(dificil.filter(s=>s.compartible),s=>s.compartible[0]),['La vuelta del semestre','Mi mejor nota','Mi semestre']);
});
check('el cierre con dos notas distingue una reprobación real de tener pocos datos',()=>{
  const rs=run('ramosVistaPreviaWrapped()').slice(0,2);
  rs.forEach(r=>r.categorias[0].notas.splice(1));
  const original=datos(rs);
  assert.equal(original.reprobados,1);assert.ok(original.gpa>=4);
  assert.match(ctx.slidesWrapped(original,null,'2026-2').at(-1).sub,/Lo que te llevas/);
  rs[0].categorias[0].notas[0].valor=5;
  const aprobado=datos(rs);
  assert.equal(aprobado.reprobados,0);
  assert.equal(ctx.slidesWrapped(aprobado,null,'2026-2').at(-1).sub,'Ahora sí, guarda el lápiz.');
});
check('avance puro: malla con créditos completos, mínimo dos ramos identificados y sin duplicados',()=>{
  const m={1:['Uno','Lab'],2:['Dos','Uno'],3:['Tres']};
  const c={Uno:[10,'A'],Lab:[0,'L'],Dos:[5,'B'],Tres:[10,'C']};
  const avanzar=(m,c,ids)=>ctx.avanceCreditosWrapped(m,c,new Set(ids));
  assert.equal(avanzar(null,c,['A','B']),null);
  assert.equal(avanzar(m,{Uno:c.Uno},['A','B']),null);
  assert.equal(avanzar(m,c,['A','L','ajeno']),null);
  assert.deepEqual({...avanzar(m,c,['A','B','ajeno'])},{total:25,aprobados:15});
  assert.equal(avanzar(m,c,['A','B','C']).aprobados,25);
});
check('el cálculo conserva los créditos del plan pero el avance no sale en 2026-2',()=>{
  run('S=freshState();S.tenant="uc"');
  const uno={...ramo('Cálculo I',[nota('i',5)]),sigla:'MAT1610',creditos:999};
  const dos={...ramo('Cálculo II',[nota('ii',6)]),sigla:'MAT1620',creditos:999};
  const otro={...ramo('Álgebra Lineal',[nota('al',6)]),sigla:'MAT1203',origen:{tenant:'fen'}};
  const archivo={label:'2026-1',ramos:[uno,otro]};
  const avance=(rs,hs,t='uc',c='ING-PC')=>ctx.avanceMallaWrapped(rs,hs,t,c);
  assert.equal(avance([uno],[archivo]),null,'recursado una sola vez');
  assert.equal(avance([uno,dos],[archivo],'uai','COM'),null,'carrera sin tabla autorizada');
  const a=avance([dos],[archivo]);assert.equal(a.aprobados,20);
  datos([uno,dos]);ctx.__avance=a;
  assert.equal(run('slidesWrapped({...datosWrapped(S.ramos),avance:__avance},null,"2026-2").some(s=>s.tipo==="avance")'),false);
  dos.categorias[0].peso=50;assert.equal(avance([dos],[archivo]),null,'pauta a medio cerrar');
  dos.notaOficial=3;assert.equal(avance([dos],[archivo]),null,'reprobación oficial');
});

check('las fechas imposibles no generan una semana ni un relato de remontada',()=>{
  const d=datos([ramo('A',[nota('a',3,'2026-09-31'),nota('b',3,'2026-09-31'),nota('c',7,'2026-09-31')])]);
  assert.equal(d.semana,null);assert.equal(d.remontada,null);
});
check('la entrada anticipada de vista previa exige el permiso de administración',()=>{
  ctx.esAdministrador=()=>false;run('abrirWrappedVistaPrevia()');assert.equal(run('_wrapped'),null);
});
