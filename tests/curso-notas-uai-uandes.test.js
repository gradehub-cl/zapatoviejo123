// Identidad sin sigla y ruta completa del navegador. Datos totalmente sintéticos;
// el mínimo real de cinco se comprueba en profesor-alumnos-sql.test.js con PGlite.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const raiz=path.join(__dirname,'..');
const elemento=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},
  querySelector(){return elemento()},querySelectorAll(){return []},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const almacen=new Map(),ctx={console,setTimeout,clearTimeout,URL,URLSearchParams,
  window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>elemento(),createElement:elemento,addEventListener(){},documentElement:elemento(),body:elemento(),querySelector:()=>elemento(),querySelectorAll:()=>[]},
  localStorage:{getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
  navigator:{},location:{origin:'https://gradehub.cl',pathname:'/',hash:'',search:''},history:{replaceState(){}}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])
  vm.runInContext(fs.readFileSync(path.join(raiz,f),'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
const curso=(tenant,nombre,id)=>({id,nombre,origen:{tenant,ramoKey:nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')},
  gates:[],categorias:[{id:'p-'+id,nombre:'Prueba',peso:100,notas:[{id:'n-'+id,nombre:'Prueba',valor:5,peso:1}]}]});
const uai=curso('uai','Curso Sintético de Álgebra','uai-1');
const uandes=curso('uandes','Curso Sintético de Historia','uandes-1');
ctx.uai=uai;ctx.uandes=uandes;

(async()=>{
  run(`globalThis.__llamadas=[];globalThis.__total=4;
    var currentUser={id:'estudiante-uai'};
    var supabaseClient={rpc:async(nombre,args)=>{
      __llamadas.push({nombre,args});
      return nombre==='curso_posicion'
        ?{data:__total>=5?[{total:__total,mejor_que:75}]:[],error:null}
        :{data:null,error:null};
    }};
    S=normalize({tenant:'uai',tipoCuenta:'estudiante',ramos:[uai]});`);
  assert.equal(run('siglaParaCurso(S.ramos[0],S.tenant)'),null);
  await run('subirNotasCurso()');
  const subidaUai=run(`__llamadas.find(x=>x.nombre==='curso_nota_set')`);
  assert.equal(subidaUai.args.p_sigla,'curso sintetico de algebra');
  assert.equal(subidaUai.args.p_promedio,run('ramoAvg(S.ramos[0])'));
  assert.deepEqual(Object.keys(await run('cargarPosicionesCurso()')),[], 'cuatro personas no muestran comparación');

  run(`currentUser={id:'estudiante-uandes'};S=normalize({tenant:'uandes',tipoCuenta:'estudiante',ramos:[uandes]});__total=5;`);
  await run('subirNotasCurso()');
  const subidaUandes=run(`__llamadas.filter(x=>x.nombre==='curso_nota_set').at(-1)`);
  assert.equal(subidaUandes.args.p_sigla,'curso sintetico de historia');
  assert.equal(subidaUandes.args.p_promedio,run('ramoAvg(S.ramos[0])'));
  assert.equal((await run('cargarPosicionesCurso()'))['uandes-1'].total,5);
  assert.equal(run(`claveRamoCurso({...uai,nombre:'Nombre cambiado'},'uai')`),'curso sintetico de algebra',
    'una cuenta existente conserva la clave de origen al renombrar el ramo');
  assert.equal(run(`claveRamoCurso({...uai,origen:null},'uai')`),'curso sintetico de algebra',
    'una cuenta anterior sin origen usa el nombre normalizado');

  // El profesor puede pertenecer a otra universidad. La consulta usa siempre
  // el tenant y la clave del alumno, y el panel pinta solo los agregados.
  ctx.raiz=elemento();const nodos=new Map();ctx.raiz.querySelector=sel=>{
    if(!nodos.has(sel))nodos.set(sel,elemento());return nodos.get(sel);
  };ctx.alumnos=[{id:'al-uai',nombre_visible:'Alumno UAI',tenant:'uai',ramos:[uai]},
    {id:'al-uandes',nombre_visible:'Alumno UAndes',tenant:'uandes',ramos:[uandes]}];
  run(`S.tenant='uc';S.tipoCuenta='profesor';currentUser={id:'profe'};
    __llamadas=[];__uandesPersonas=4;
    supabaseClient.rpc=async(nombre,args)=>{
      __llamadas.push({nombre,args});
      if(nombre==='codigo_alumnos_profesor')return {data:'ABCDEFGH',error:null};
      if(nombre==='mis_alumnos')return {data:alumnos,error:null};
      if(nombre==='comparacion_ramo_profesor'){
        const n=args.p_tenant==='uai'?5:__uandesPersonas;
        return {data:{ramo:n>=5?{promedio:5,personas:n}:null,evaluaciones:[],categorias:[]},error:null};
      }
      return {data:null,error:null};
    };`);
  await run('renderAlumnosProfesor(raiz)');
  const comparaciones=run(`__llamadas.filter(x=>x.nombre==='comparacion_ramo_profesor').map(x=>x.args)`);
  assert.equal(comparaciones.length,2);
  assert(comparaciones.some(x=>x.p_tenant==='uai'&&x.p_sigla==='CURSO SINTETICO DE ALGEBRA'));
  assert(comparaciones.some(x=>x.p_tenant==='uandes'&&x.p_sigla==='CURSO SINTETICO DE HISTORIA'));
  assert.match(ctx.raiz.innerHTML,/data-ver-alumno="al-uai"/);
  await run("renderAlumnosProfesor(raiz,{alumnoId:'al-uai'})");
  assert.match(nodos.get('#alumnos-ficha-contenido').innerHTML,/GradeHub · 5 personas/);
  await run("renderAlumnosProfesor(raiz,{alumnoId:'al-uandes'})");
  assert.match(nodos.get('#alumnos-ficha-contenido').innerHTML,/GradeHub: aún pocos datos/);
  run('__uandesPersonas=5');
  await run("renderAlumnosProfesor(raiz,{alumnoId:'al-uandes'})");
  assert.match(nodos.get('#alumnos-ficha-contenido').innerHTML,/GradeHub · 5 personas/);
  console.log('OK UAI/UAndes: suben ramoAvg por nombre normalizado y el panel respeta el piso de cinco');
})().catch(e=>{console.error(e);process.exit(1)});
