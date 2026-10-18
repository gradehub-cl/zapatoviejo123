// #697, PR 4: Ajustes muestra solo opciones pertinentes a una cuenta de profesor.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root=__dirname+'/../';
const source=['data.js','engine.js','app.js','app-session.js'].map(f=>fs.readFileSync(root+f,'utf8')).join('\n');

function kit(tipo){
  const ids={};
  function node(){return {innerHTML:'',value:'',textContent:'',dataset:{},style:{setProperty(){}},
    classList:{add(){},remove(){},contains(){return false;}},addEventListener(k,fn){this['on'+k]=fn;},
    setAttribute(){},removeAttribute(){},focus(){},select(){},appendChild(){},
    querySelector(){return null;},querySelectorAll(){return [];}};}
  const get=id=>ids[id]||(ids[id]=node());
  const buttons=()=>[...get('settings-nav-list').innerHTML.matchAll(/data-settings-section="([^"]+)"/g)].map(m=>m[1]);
  const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}})},
    document:{getElementById:get,querySelector:()=>node(),querySelectorAll:()=>[],createElement:node,
      addEventListener(){},documentElement:node(),body:node()},
    localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},
    location:{origin:'',pathname:'',hash:''},setTimeout:fn=>fn(),clearTimeout(){},
    requestAnimationFrame:fn=>fn(),cancelAnimationFrame(){}};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  ctx.__tipo=tipo;
  vm.runInContext(`S=normalize({ramos:[],historial:[],tenant:'fen',userName:'Cuenta sintética',
    ...( __tipo==null?{}:{tipoCuenta:__tipo})});
    currentUser={id:'usuario-sintetico',email:'prueba@example.test'};
    openModal=()=>{};cargarAgentesConectados=()=>{};pintarFeedCalendario=()=>{};
    perfilProfesorConocido=()=>({estado:'aprobado'});`,ctx);
  return {ctx,get,buttons,html:()=>get('modal-content').innerHTML,
    open:section=>vm.runInContext(section?`openSettings('${section}')`:'openSettings()',ctx)};
}

const profesor=kit('profesor');profesor.open();
assert.deepEqual(profesor.buttons(),['perfil','datos','apariencia','sugerencias']);
assert.doesNotMatch(profesor.get('settings-nav-list').innerHTML,/Información académica|Calendario|Agentes conectados|Clases particulares|Canvas|Wrapped|Faltas/);
profesor.get('settings-search').value='carrera';profesor.get('settings-search').oninput();
assert.deepEqual(profesor.buttons(),[]);
assert.match(profesor.get('settings-nav-list').innerHTML,/«correo», «fondo» o «cuenta»/);
profesor.open('academico');
assert.doesNotMatch(profesor.html(),/id="s-tenant-grid"|id="s-sem-grid"/);
profesor.open('datos');
assert.match(profesor.html(),/onclick="confirmarEliminarCuenta\(\)"/);
assert.doesNotMatch(profesor.html(),/settings-compartidos|Tus notas no se tocan/);
profesor.open('perfil');
assert.doesNotMatch(profesor.html(),/saludo de inicio/);
console.log('OK profesor: cuatro secciones, búsqueda y entrada directa sin opciones de estudiante');

for(const tipo of [null,'estudiante']){
  const estudiante=kit(tipo);estudiante.open();
  assert.deepEqual(estudiante.buttons(),['perfil','agentes','datos','profesor','academico','calendario','apariencia','sugerencias']);
  estudiante.open('datos');
  assert.match(estudiante.html(),/settings-compartidos/);
  estudiante.open('academico');
  assert.match(estudiante.html(),/id="s-tenant-grid"/);
}
console.log('OK estudiante antiguo y cuenta mixta aprobada: Ajustes sin cambios');
