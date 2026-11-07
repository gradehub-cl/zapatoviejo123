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
check('sin fechas no hay semana, comienzo, nota que movió ni remontada, y no revienta',()=>{
  const d=datos([ramo('A',[nota('a1',5),nota('a2',6)]),ramo('B',[nota('b1',4)])]);
  assert.equal(d.semana,null);assert.equal(d.primera,null);assert.equal(d.movio,null);assert.equal(d.remontada,null);
  assert.doesNotMatch(JSON.stringify(run('slidesWrapped(datosWrapped(S.ramos),null,"2026-2")')),/NaN|undefined/);
});
check('la remontada exige estar bajo 4,0 a mitad de camino y terminar aprobado',()=>{
  const d=datos([ramo('Cálculo',[nota('c1',3.0,'2026-08-20'),nota('c2',3.4,'2026-09-15'),nota('c3',6.8,'2026-10-20'),nota('c4',6.5,'2026-11-20')])]);
  assert.equal(d.remontada.r.nombre,'Cálculo');assert.equal(d.remontada.mes,'septiembre');
  assert.equal(d.personalidad.id,'remontada');
  const reprobado=datos([ramo('Cálculo',[nota('c1',3.0,'2026-08-20'),nota('c2',3.1,'2026-09-15'),nota('c3',3.2,'2026-10-20')])]);
  assert.equal(reprobado.remontada,null,'no celebra una remontada que no aprobó');
});
check('la nota que movió el promedio se mide cuando todos los ramos tienen nota',()=>{
  const d=datos([ramo('A',[nota('a1',3,'2026-08-20'),nota('a2',4,'2026-10-01')]),ramo('B',[nota('b1',6,'2026-08-25'),nota('b2',6,'2026-09-01')])]);
  assert.equal(d.movio.x.nombre,'a2','no cuenta la primera nota de B, que solo llena un ramo vacío');
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
check('frente al semestre anterior: sube o se mantiene; una baja no aparece',()=>{
  assert.equal(datos([ramo('A',[nota('a1',6)])],[{label:'2026-1',gpa:5.0}]).anterior.delta,1);
  assert.equal(datos([ramo('A',[nota('a1',4)])],[{label:'2026-1',gpa:5.0}]).anterior,null);
  assert.equal(datos([ramo('A',[nota('a1',5)])]).anterior,null,'sin semestre anterior no hay comparación');
});
check('la tarjeta lleva solo el primer nombre; las cifras van con coma',()=>{
  datos([ramo('A',[nota('a1',5.5,'2026-09-01'),nota('a2',6.5,'2026-10-01')])]);
  const slides=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),null,"2026-2")');
  const final=slides.at(-1);assert.equal(final.nombre,'Ana');assert.doesNotMatch(JSON.stringify(slides),/Sintética|Pérez/);
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
  assert.ok(preguntas.length>=2);
  preguntas.forEach(q=>assert.equal(q.pregunta.opciones.filter(o=>o.correcta).length,1,q.titulo));
  assert.equal(slides.find(x=>x.titulo==='¿Cuál fue tu mejor ramo?').pregunta.opciones.find(o=>o.correcta).texto,'A');
  assert.ok(slides.find(x=>x.tipo==='goma'));
  assert.ok(slides.filter(x=>x.prep).length>=slides.length/2);
});
check('un semestre con un ramo reprobado trae ánimo y no compara hacia abajo',()=>{
  datos([ramo('A',[nota('a1',6.5,'2026-09-01'),nota('a2',6.0,'2026-10-01')]),ramo('B',[nota('b1',2.5,'2026-09-08'),nota('b2',3.0,'2026-10-08')])]);
  const d=run('extrasWrapped(datosWrapped(S.ramos),S.ramos,true)');assert.equal(d.reprobados,1);
  const slides=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),{curso:{ramo:"B",mejorQue:12,total:30},uni:{mejorQue:30,total:90}},"2026-2")');
  const animo=slides.find(x=>x.tipo==='animo');assert.ok(animo);assert.match(animo.viz,/Sacaste adelante <b>1<\/b> ramo\./);
  assert.ok(!slides.some(x=>/wrapped-regla/.test(x.viz||'')),'sin percentiles bajo el 50');
  assert.match(slides.find(x=>x.k==='Tu promedio').prep.texto,/no cuenta toda la historia/);
  const bueno=run('slidesWrapped(extrasWrapped(datosWrapped([S.ramos[0]]),[S.ramos[0]],true),{curso:{ramo:"A",mejorQue:80,total:30}},"2026-2")');
  assert.ok(!bueno.some(x=>x.tipo==='animo'));assert.ok(bueno.some(x=>/wrapped-regla/.test(x.viz||'')));
});
check('el video del profe sale solo si está cargado; en la vista previa, su espacio',()=>{
  datos([ramo('A',[nota('a1',5.5,'2026-09-01')])]);
  assert.ok(!run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),null,"2026-2")').some(x=>x.tipo==='video'));
  run('_wrappedVistaPreviaArmando=true');
  const v=run('slidesWrapped(extrasWrapped(datosWrapped(S.ramos),S.ramos,true),null,"2026-2")').find(x=>x.tipo==='video');
  run('_wrappedVistaPreviaArmando=false');
  assert.ok(v);assert.equal(v.video,null);assert.match(run('videoWrapped(null)'),/Aquí va el video del profe/);
  assert.match(run('videoWrapped({src:"/wrapped/p.mp4",subtitulos:"/wrapped/p.vtt",quien:"Profe <b>"})'),/<track kind="captions"[^>]*>.*Profe &lt;b&gt;/s);
  assert.doesNotMatch(run('videoWrapped({src:"/wrapped/p.mp4",quien:"P"})'),/autoplay/);
});
check('cifraWrapped escribe con coma y conserva el signo',()=>{
  assert.match(run('cifraWrapped("+0.3")'),/>\+0,3<\/span>/);
});
