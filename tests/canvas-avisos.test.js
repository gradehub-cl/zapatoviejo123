// Puente del iPhone y dos cuentas sintéticas. Usa los bundles y el lector de fechas reales.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');

let probarTexto=false;
class Nodo{
  constructor(tag='div'){
    this.tag=tag;this.children=[];this.dataset={};this.hidden=true;this.attrs={};
    this.textContent='';this.classList={add(){},remove(){},toggle(){},contains(){return false}};
    this.style={setProperty(){},removeProperty(){}};
  }
  appendChild(n){this.children.push(n)}
  append(...hijos){this.children.push(...hijos)}
  prepend(...hijos){this.children.unshift(...hijos)}
  replaceChildren(...hijos){this.children=hijos}
  get childElementCount(){return this.children.length}
  setAttribute(k,v){this.attrs[k]=v}
  getAttribute(k){return this.attrs[k]}
  set innerHTML(html){if(probarTexto)assert.equal(this.id,'modal-content','el lector solo escribe texto');this.html=html}
  removeAttribute(k){delete this.attrs[k]}
  addEventListener(){}
  todos(tag){return this.children.flatMap(n=>[...(n.tag===tag?[n]:[]),...n.todos(tag)])}
}
const nodos=new Map();
function nodo(id){
  if(!nodos.has(id)){const n=new Nodo();n.id=id;nodos.set(id,n)}
  return nodos.get(id);
}
let nativo=true,conectado=true,fallar=false,denegado=false,pausa;
const solicitudes=[],almacen=new Map();
const cursos=[{id:42,course_code:'SYN100-2'},{id:43,course_code:'SYN101-1'}]
  .map(c=>({...c,term:{name:'2026 Segundo Semestre'}}));
const avisos=[
  {title:'Material',texto:'Material <script>falso()</script>'+' de lectura'.repeat(45),posted_at:'2026-11-08T14:00:00Z',recortado:true,url:'https://dominio.invalid'},
  {title:'Fecha <i>I2</i>',texto:'La I2 será el 25 de noviembre.',posted_at:'2026-11-18T14:00:00Z'}
];
const puente={
  estado:async()=>({conectado}),desconectar:async()=>{conectado=false},
  get:async({path,params})=>{
    solicitudes.push(path);
    if(path==='courses')return {data:cursos};
    assert.deepEqual({...params},{only_announcements:'true',per_page:50});
    if(pausa)await pausa;
    if(denegado&&path.includes('/42/'))throw Object.assign(Error('Curso restringido'),{code:401});
    if(fallar)throw Error('Canvas fuera de línea');
    return {data:path.includes('/42/')?avisos:[{title:'Bibliografía',texto:'Ya está en el módulo.',posted_at:'2026-11-12T17:00:00Z'}]};
  }
};
let reloj=Date.parse('2026-11-23T15:00:00Z');
class Fecha extends Date{
  constructor(...args){super(...(args.length?args:[reloj]))}
  static now(){return new Fecha().getTime()}
}
const ctx={console,crypto:webcrypto,TextEncoder,Date:Fecha,Intl,
  window:{Capacitor:{isNativePlatform:()=>nativo,Plugins:{GradeHubCanvas:puente}},addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}})},
  document:{getElementById:nodo,createElement:t=>new Nodo(t),addEventListener(){},documentElement:nodo('html'),body:nodo('body'),querySelector:()=>nodo("seleccion"),querySelectorAll:()=>[]},
  localStorage:{getItem:k=>almacen.get(k),setItem:(k,v)=>almacen.set(k,v),removeItem:k=>almacen.delete(k)},
  navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}};
vm.createContext(ctx);
const run=s=>vm.runInContext(s,ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx,{filename:f});
run(`currentUser={id:'sintetica-a'};S.tenant='uc';S.tipoCuenta='estudiante';
  S.ramos=[{id:'r1',nombre:'Curso A',sigla:'SYN100',seccion:2,categorias:[{id:'i2',nombre:'Interrogación 2',notas:[]}]},
           {id:'r2',nombre:'Curso B',sigla:'SYN101',seccion:1,categorias:[]}];openModal=()=>{};`);
probarTexto=true;
const inicio=nodo('avisos-canvas-inicio'),ficha=nodo('avisos-canvas-ficha');
const verInicio=()=>run("pintarAvisosCanvas('inicio')"),verFicha=()=>run("pintarAvisosCanvas('ficha','r1')");
const boton=(padre,texto)=>padre.todos('button').find(b=>b.textContent===texto);
(async()=>{
  nativo=false;await verInicio();assert.ok(inicio.hidden);
  nativo=true;run("S.tipoCuenta='profesor'");await verFicha();assert.ok(ficha.hidden);
  run("S.tipoCuenta='estudiante'");conectado=false;await verFicha();assert.ok(ficha.hidden);
  assert.equal(solicitudes.length,0);
  conectado=true;await Promise.all([verFicha(),verInicio()]);
  assert.deepEqual(ficha.todos('h4').map(n=>n.textContent),[avisos[1].title,'Material']);
  assert.ok(ficha.todos('p').some(n=>n.textContent.includes('<script>falso()</script>')));
  assert.equal(ficha.todos('a')[0].href,'https://cursos.canvas.uc.cl/courses/42/announcements');
  assert.equal(solicitudes.filter(p=>p.includes('/42/')).length,1);
  boton(inicio,'3 avisos nuevos').onclick();
  assert.deepEqual(nodo('modal-content').todos('h3').map(n=>n.textContent),['Curso A','Curso B']);
  reloj+=5*60000;await verInicio();
  assert.equal(solicitudes.filter(p=>p.includes('/42/')).length,2,'la caché caduca');
  const previo=run('JSON.stringify(S)');
  boton(ficha,'Revisar fecha propuesta').onclick();
  assert.match(nodo('modal-content').html,/Revisa las fechas/);
  assert.equal(run('icsImportDraft[0].target'),'r1|i2|');assert.equal(run('JSON.stringify(S)'),previo);
  boton(ficha,'Ver más').onclick();
  assert.equal(ficha.todos('p').at(-1).textContent,avisos[0].texto);
  const clave='gradehub_canvas_avisos_leidos_sintetica-a';
  assert.match(almacen.get(clave),/^\["[a-f0-9]{64}"\]$/);
  run('limpiarAvisosCanvas(false)');assert.equal(run('icsImportDraft.length'),0);await verInicio();assert.ok(boton(inicio,'2 avisos nuevos'));
  await verFicha();boton(ficha,'Marcar como no leído').onclick();await verInicio();assert.ok(boton(inicio,'3 avisos nuevos'));
  boton(ficha,'Marcar como leído').onclick();
  await run('olvidarCanvasCuenta()');assert.ok(inicio.hidden&&ficha.hidden);assert.ok(!almacen.has(clave));
  conectado=true;fallar=true;await verFicha();assert.match(ficha.todos('p')[0].textContent,/No pudimos/);
  fallar=false;denegado=true;await verInicio();
  assert.ok(boton(inicio,'1 aviso nuevo'),'un permiso denegado en un curso conserva los demás');
  assert.match(inicio.todos('p')[0].textContent,/No pudimos actualizar/);
  denegado=false;let liberar;pausa=new Promise(r=>liberar=r);
  const pendiente=verFicha();await new Promise(setImmediate);
  await run('olvidarCanvasCuenta()');run("currentUser={id:'sintetica-b'}");liberar();await pendiente;
  assert.ok(ficha.hidden);assert.equal(ficha.childElementCount,0);
  await verInicio();assert.ok(inicio.hidden);assert.equal(almacen.size,0);
  console.log('PASS Avisos Canvas: visibilidad, orden, texto seguro, lectura local, caché, salida, revisión y cambio de cuenta');
})().catch(e=>{console.error(e);process.exitCode=1});
