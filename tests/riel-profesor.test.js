// Navegación de profesor con cuentas y alumnos sintéticos. No usa el catálogo.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const raiz=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(raiz,'app.js'),'utf8');
const html=fs.readFileSync(path.join(raiz,'index.html'),'utf8');
const css=fs.readFileSync(path.join(raiz,'styles.css'),'utf8');
const mk=fs.readFileSync(path.join(raiz,'marketplace.js'),'utf8');
const inicio=app.indexOf('const NAV_TABS_BASE=');
const fin=app.indexOf('// Salir de un ramo',inicio);
assert(inicio>=0&&fin>inicio);

function nodo(id){
  const attrs=new Map(),clases=new Set();
  return {id,hidden:false,dataset:{},style:{},children:[],
    classList:{add:n=>clases.add(n),remove:n=>clases.delete(n),contains:n=>clases.has(n)},
    setAttribute:(n,v)=>attrs.set(n,String(v)),removeAttribute:n=>attrs.delete(n),getAttribute:n=>attrs.get(n)||null,
    querySelectorAll(){return this.children;}};
}
const elementos=new Map(),get=id=>{if(!elementos.has(id))elementos.set(id,nodo(id));return elementos.get(id);};
for(const grupo of ['profesor','alumnos']){
  const vistas=grupo==='profesor'?['anuncios','perfil','crear']:['lista','grupo','ramos','invitar'];
  get('nav-subitems-'+grupo).children=vistas.map(v=>{
    const b=nodo(grupo+'-'+v);b.dataset['subnav'+(grupo==='profesor'?'Profesor':'Alumnos')]=v;return b;
  });
}
const almacen=new Map(),llamadas=[];
const ctx={console,JSON,Object,localStorage:{getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,v)},
  cuenta:{profesor:false,aprobado:false,admin:false},ancho:false,nativa:false,
  window:{addEventListener(){},matchMedia:()=>({get matches(){return ctx.ancho;}})},
  document:{getElementById:get,querySelector:s=>s==='[data-subnav-alumnos="ramos"]'
    ?get('nav-subitems-alumnos').children[2]:null,
    documentElement:{classList:{contains:()=>ctx.nativa}}},
  esCuentaProfesor:()=>ctx.cuenta.profesor,esProfesorAprobado:()=>ctx.cuenta.aprobado,
  esAdministrador:()=>ctx.cuenta.admin,
  renderHome(){},renderStats(){},renderAgenda(){},renderAdmin(){},
  renderProfesor:v=>llamadas.push(['profesor',v]),renderAlumnosTab:v=>llamadas.push(['alumnos',v]),track(){}};
vm.createContext(ctx);
vm.runInContext(app.slice(inicio,fin),ctx,{filename:'app.js'});
const run=s=>vm.runInContext(s,ctx);

assert.match(html,/id="nav-grupo-profesor" hidden[\s\S]*?id="nav-subitems-profesor" hidden/);
assert.match(html,/id="nav-grupo-alumnos" hidden[\s\S]*?id="nav-subitems-alumnos" hidden/);
assert.match(css,/\.nav-subitems\{display:none!important;\}/);
assert.match(css,/html:not\(\.app-nativa\) \.nav-subitems:not\(\[hidden\]\)/);
assert.match(css,/\.nav-subitems button\{[^}]*min-height:44px/);
assert.match(css,/prefers-reduced-motion:reduce\)\{\.nav-grupo-flecha\{transition:none/);

run('recalcularNavTabs()');
assert.equal(get('nav-grupo-profesor').hidden,true,'estudiante puro no ve Clases');
assert.equal(get('nav-grupo-alumnos').hidden,true,'estudiante puro no ve Alumnos');
assert.equal(get('nav-home').hidden,false,'Inicio del estudiante no cambia');

ctx.cuenta={profesor:true,aprobado:false,admin:false};
run('recalcularNavTabs()');
assert.equal(get('nav-grupo-profesor').hidden,false);
assert.equal(get('nav-subitems-profesor').hidden,true,'pendiente solo ve la pantalla de estado');
run("tocarGrupoProfesor('profesor')");
assert.equal(run('currentTab'),'profesor');

ctx.ancho=true;ctx.cuenta.aprobado=true;
run('recalcularNavTabs()');
run("showTab('profesor')");
assert.equal(get('nav-profesor').getAttribute('aria-expanded'),'true');
assert.equal(get('nav-subitems-profesor').hidden,false);
assert.equal(get('nav-subitems-profesor').children[0].getAttribute('aria-current'),'page');
run("tocarGrupoProfesor('profesor')");
assert.equal(get('nav-profesor').getAttribute('aria-expanded'),'false');
assert.equal(get('nav-subitems-profesor').hidden,true);
run("showTab('alumnos',false,{vista:'lista'})");
assert.equal(get('nav-subitems-profesor').hidden,true,'el otro grupo conserva su estado plegado');
run("showTab('profesor')");
assert.equal(get('nav-subitems-profesor').hidden,false,'el grupo activo abre al entrar');
run("tocarGrupoProfesor('profesor')");
assert.equal(get('nav-profesor').getAttribute('aria-expanded'),'false');
run("tocarGrupoProfesor('profesor')");
assert.equal(get('nav-profesor').getAttribute('aria-expanded'),'true');
assert.equal(JSON.parse(almacen.get('gh_riel_profesor_grupos')).profesor,true);

const alumnos=[{id:'sintetico-1'},{id:'sintetico-2'}];
run('mostrarPorRamoEnRiel(1)');
assert.equal(get('nav-subitems-alumnos').children[2].hidden,true);
ctx.alumnos=alumnos;run('mostrarPorRamoEnRiel(alumnos.length)');
assert.equal(get('nav-subitems-alumnos').children[2].hidden,false);
run("showTab('alumnos',false,{vista:'grupo'})");
assert.deepEqual(llamadas.at(-1),['alumnos','grupo']);
assert.equal(get('nav-subitems-alumnos').children[1].getAttribute('aria-current'),'page');
run("marcarSubitemProfesor('alumnos','ramos')");
assert.equal(get('nav-subitems-alumnos').children[2].getAttribute('aria-current'),'page');
run("marcarSubitemProfesor('alumnos','ficha')");
assert.equal(get('nav-subitems-alumnos').children[0].getAttribute('aria-current'),'page');

ctx.ancho=false;run('actualizarModoRielProfesor()');
assert.equal(get('nav-subitems-alumnos').hidden,true,'barra inferior sin submenú');
assert.equal(get('nav-alumnos').getAttribute('aria-expanded'),null,'VoiceOver no anuncia expansión en móvil');
assert.equal(get('nav-alumnos').getAttribute('aria-current'),'page');
assert.match(mk,/Resumen por ramo: disponible en el computador\./);
assert.match(mk,/if\(nombre==='ramos'\)paneles\.ramos\.innerHTML=rielAncho/);

ctx.ancho=true;ctx.nativa=true;run('actualizarModoRielProfesor()');
assert.equal(get('nav-subitems-alumnos').hidden,true,'la app iOS tampoco despliega submenús');

ctx.nativa=false;ctx.cuenta={profesor:false,aprobado:true,admin:true};
run('recalcularNavTabs()');
assert.equal(get('nav-home').hidden,false,'la cuenta mixta conserva Inicio');
assert.equal(get('nav-grupo-profesor').hidden,false,'la cuenta mixta conserva Clases');
assert.equal(get('nav-admin').hidden,false,'el administrador conserva Administración');

// El subítem de Clases abre la sección o dispara la acción existente, sin
// crear otra ruta de guardado de anuncios.
(async()=>{
  let creaciones=0,perfiles=0;
  const cuerpo={querySelector:s=>s==='#clase-nueva'?{click(){creaciones++}}
    :s==='#clases-perfil'?{scrollIntoView(){perfiles++}}:null};
  const clase={currentUser:{id:'profesor-sintetico'},supabaseClient:{},currentTab:'profesor',
    document:{getElementById:()=>cuerpo},renderEspacioProfesor:async()=>{},marcarSubitemProfesor(){}};
  vm.createContext(clase);
  const a=mk.indexOf('let versionRenderProfesor=');
  const b=mk.indexOf('async function openEspacioProfesor()',a);
  assert(a>=0&&b>a);
  vm.runInContext(mk.slice(a,b),clase);
  await vm.runInContext("renderProfesor('crear')",clase);
  await vm.runInContext("renderProfesor('perfil')",clase);
  assert.equal(creaciones,1,'Crear anuncio usa la acción que ya existe');
  assert.equal(perfiles,1,'Tu perfil va a la sección de Clases');
  console.log('OK riel profesor: cuentas, expansión, vistas, móvil, iOS y accesibilidad');
})().catch(e=>{console.error(e);process.exitCode=1;});
