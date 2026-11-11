// Revisión del panel de profesor de Salva Ramos (2026-11-07): búsqueda por
// sigla, «Alumnos que partieron igual» en el ejemplo, Atrás del navegador y el
// anuncio a medias. Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []}});
const historial=[];
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},navigator:{},location:{origin:'https://gradehub.cl',pathname:'/',hash:'',search:''},
  history:{state:null,replaceState(s){this.state=s;historial.push(['replace',s]);},pushState(s){this.state=s;historial.push(['push',s]);}},
  URLSearchParams,setTimeout:f=>{f();return 1;},clearTimeout(){},console,URL};
vm.createContext(ctx);
vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
vm.runInContext('var supabaseClient=null;var currentUser=null;',ctx);
vm.runInContext(leer('marketplace.js'),ctx);
const run=c=>vm.runInContext(c,ctx);

// «Ver alumnos» de Ramos busca por la sigla. Se resuelve con la universidad
// del alumno: el profesor puede no tener una, o tener otra.
for(const propia of [null,'uai']){
  const n=run(`S.tenant=${JSON.stringify(propia)};filtrarAlumnosPanel([{id:'a',nombre_visible:'Ana',tenant:'uc',ramos:[{id:'r',nombre:'Cálculo II'}]}],'mat1620').length`);
  assert.equal(n,1,`la sigla calza con el profesor en ${propia}`);
}
assert.equal(run(`filtrarAlumnosPanel([{id:'a',nombre_visible:'Ana',tenant:'uc',ramos:[{id:'r',nombre:'Cálculo II'}]}],'FIS1514').length`),0);

// «Alumnos que partieron igual» responde en el ejemplo con la forma del SQL.
const grupos=run(`(()=>{const d=datosEjemploAlumnosPanel(new Date(2026,10,7));
  return d.alumnos.flatMap(al=>al.ramos.map(r=>{const n=r.categorias.flatMap(c=>c.notas)[0];
    return gruposParecidosEjemploPanel(d,{p_id:al.id,p_ramo:r.id,p_nota_base:n.id,p_min:Math.max(1,n.valor-.6),p_max:Math.min(7,n.valor+.6)});}));})()`);
assert(grupos.length>=6&&grupos.every(g=>g.disponible),'cada alumno inventado tiene con quién compararse');
assert(grupos.every(g=>g.propios.n>=1&&g.gradehub.n>=5&&Number.isFinite(g.propios.cambio)&&Number.isFinite(g.gradehub.cambio_percentil)),'el control respeta el piso de cinco');
assert.match(run(`gruposParecidosResultadoHTML(${JSON.stringify(grupos[0])})`),/Tus alumnos del rango[\s\S]*Resto de GradeHub del rango/);
const fuera=run(`(()=>{const d=datosEjemploAlumnosPanel(new Date(2026,10,7)),al=d.alumnos[0],r=al.ramos[0];
  return gruposParecidosEjemploPanel(d,{p_id:al.id,p_ramo:r.id,p_nota_base:r.categorias[0].notas[0].id,p_min:6.9,p_max:7});})()`);
assert.equal(fuera.disponible,false,'un rango sin el alumno no inventa grupo');
run(`globalThis.__sinBase=rpcEjemploPanel(datosEjemploAlumnosPanel(),'grupos_parecidos_profesor',{p_id:'nadie',p_ramo:'x',p_nota_base:'x',p_min:1,p_max:7})`);
assert(run('__sinBase').then,'responde como el cliente de Supabase');

// Atrás del navegador: la primera vista reemplaza la entrada de la página,
// cada vista nueva agrega una y repetir la actual no agrega nada.
run(`marcarVistaNav('alumnos','resumen');marcarVistaNav('alumnos','resumen');marcarVistaNav('alumnos','ramos');marcarVistaNav('alumnos','lista','ficha:a1');`);
assert.deepEqual(JSON.parse(JSON.stringify(historial)),[['replace',{nav:'alumnos',vista:'resumen'}],['push',{nav:'alumnos',vista:'ramos'}],['push',{nav:'alumnos',vista:'ficha:a1'}]]);

// Un anuncio a medias no se pierde por cambiar de pestaña: volver a Clases
// sin pedir vista lo deja; pedir una vista se la pasa al formulario.
run(`globalThis.__pedidas=[];globalThis.__repintado=0;
  document.getElementById=id=>id==='profesor-body'?{querySelector:s=>s==='#profesor-borrador'?{}:null}:null;
  renderEspacioProfesor=async()=>{__repintado++;};vistasPanelNav.profesor=v=>__pedidas.push(v);`);
(async()=>{
  await run('renderProfesor()');
  run(`vistaPendienteNav.profesor='anuncios'`);
  await run('renderProfesor()');
  assert.deepEqual(JSON.parse(run('JSON.stringify(__pedidas)')),['anuncios']);
  assert.equal(run('__repintado'),0,'el formulario no se reemplaza');

  // Lo que se sacó o cambió de texto.
  const mk=leer('marketplace.js');
  assert(!/<summary>Cambiar alumno|data-fap-buscar/.test(mk),'sin «Cambiar alumno» en la ficha');
  assert(/placeholder="Buscar alumno o ramo"/.test(mk),'el buscador dice que también busca ramos');
  assert(!/Marcar evaluaciones o pedir notas/.test(mk),'Por completar no promete lo que no hace');
  console.log('OK panel-revision-profesor');
})().catch(e=>{console.error(e);process.exit(1);});
