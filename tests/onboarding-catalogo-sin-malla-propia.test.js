// No tener malla propia no elimina el catálogo de toda la universidad.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const elementos=new Map(),scripts=[];
const el=()=>({value:'',innerHTML:'',textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){}});
const porId=id=>{if(!elementos.has(id))elementos.set(id,el());return elementos.get(id);};
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:el,addEventListener(){},documentElement:el(),body:el(),head:{appendChild:s=>scripts.push(s)},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{
  run("selectedTenant='uai';selectedCarrera=null;selectedCarreraNombre='Otra carrera';selectedSem=1;obRamos=[];");
  run('renderObCoursePicker()');
  assert.match(porId('ob-course-picker').innerHTML,/id="ob-course-search"/,'UAI sin malla propia puede buscar en la universidad');
  porId('ob-course-search').value='Materia ajena';run("renderObCourseResults('Materia ajena')");
  assert.equal(scripts.length,1,'pide las mallas de la universidad aunque carrera sea null');
  assert.equal(scripts[0].src,'mallas-uai.js');
  run("const MALLAS_UAI_EXTRA={'CARRERA-AJENA':{1:['Materia ajena']}};");scripts[0].onload();await Promise.resolve();
  assert.match(porId('ob-course-results').innerHTML,/Materia ajena/);
  const fila=run("searchCatalog('Materia ajena','uai',null,1)[0]");
  assert.equal(fila.propio,false);assert.equal(fila.semestre,0,'no inventa el semestre de la carrera propia');
  for(const tenant of ['uc','fen','uandes']){
    run(`selectedTenant='${tenant}';selectedCarrera=null;obRamos=[];renderObCoursePicker();`);
    assert.match(porId('ob-course-picker').innerHTML,/id="ob-course-search"/,tenant+' sin carrera igual busca en su universidad');
    assert.match(porId('ob-course-picker').innerHTML,/obToggleManual/,'siempre permite ingreso manual');
  }
  // Paso 3: sin catálogo, el campo para escribir la carrera va abierto y con
  // su propio texto; con catálogo, «Otra carrera» no aparece en la web.
  run("selectedTenant='usach';initCarreraGrid();");
  assert.equal(porId('ob-otra-carrera').open,true,'sin catálogo, el campo de carrera va abierto');
  assert.equal(porId('ob-otra-carrera').hidden,false);
  assert.equal(porId('ob-carrera-sub').textContent,'Escribe el nombre de tu carrera.');
  run("selectedTenant='uai';initCarreraGrid();");
  assert.equal(porId('ob-otra-carrera').hidden,true,'con catálogo y en la web, «Otra carrera» no se muestra');
  assert.equal(porId('ob-otra-carrera').open,false,'al cambiar a una con catálogo, vuelve cerrado');
  assert.match(porId('ob-carrera-sub').textContent,/^Busca tu carrera/);
  console.log('OK: buscador universitario independiente de la malla propia y salida manual');
})().catch(e=>{console.error(e);process.exitCode=1;});
