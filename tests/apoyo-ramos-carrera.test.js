// #1102: malla, perfil y trayectoria ficticios. No se leen notas ni se
// escribe S; tarjeta y ficha comparten selección, sin consultas ni eventos.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return nodo()},querySelectorAll(){return []},dataset:{}});
const consultas=[],eventos=[];
const ctx={console,URL,Intl,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
 document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},
 navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},history:{replaceState(){}},
 currentUser:{id:'visor-sintetico'},supabaseClient:{from:()=>{throw Error('no consultar perfiles para filtrar')},rpc:()=>{throw Error('no hay RPC de relevancia')}},track:(...p)=>eventos.push(p)};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','marketplace.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
const pure=(siglas,op)=>{ctx.siglas=siglas;ctx.op=op;return plain(run('ramosRelevantesParaVisor(siglas,op)'));};
const siglas=Object.freeze(['mat 1100',' MAT1610 ','SYN201','SYN202','mat1610']);
let r=pure(siglas,{cursando:[{sigla:'mat 1610'}],historial:[],malla:['SYN201']});
assert.deepEqual(r,{mias:['MAT1610'],otras:['MAT1100','SYN201','SYN202'],criterio:'ramos'},'cursando manda antes que la malla y normaliza sin equivalencias');
r=pure(siglas,{cursando:[],historial:[{ramos:[{sigla:'syn 202'}]}],malla:['SYN201']});assert.deepEqual(r.mias,['SYN202'],'el historial también manda');
r=pure(siglas,{cursando:[{sigla:'INEXISTENTE'}],malla:['syn 201']});assert.deepEqual(r,{mias:['SYN201'],otras:['MAT1100','MAT1610','SYN202'],criterio:'malla'});
assert.deepEqual(pure(siglas,{malla:['SIN-COINCIDENCIA']}),{mias:['MAT1100','MAT1610','SYN201','SYN202'],otras:[],criterio:'universidad'},'mias vacío usa el respaldo');
assert.equal(pure(siglas,{cursando:[{sigla:'MAT1610'}],malla:null}).criterio,'universidad','sin malla disponible conserva el respaldo');
assert.deepEqual(pure([],{malla:['MAT1610']}),{mias:[],otras:[],criterio:'universidad'});
run(`S=normalize({tenant:'uc',carrera:'SYN-ING',ramos:[],historial:[]});
 MALLA_UC['SYN-ING']={1:['Curso del plan sintético','Segundo del plan sintético']};
 CREDITOS_UC['Curso del plan sintético']=[null,'MAT1610'];CREDITOS_UC['Segundo del plan sintético']=[null,'SYN201'];`);
ctx.nombres={MAT1100:'Cálculo I de otra carrera',MAT1610:'Cálculo I de prueba',SYN201:'Segundo del plan',SYN202:'Curso previo',UAI999:'Curso de otra universidad'};
run("nombresRamosParaClases=t=>t==='uc'?Object.fromEntries(Object.entries(nombres).filter(([s])=>s!=='UAI999')):{UAI999:'Curso de otra universidad'}");
ctx.p={id:'perfil-ajeno',nombre_publico:'Apoyo sintético',universidades:['uc','uai'],ramos_siglas:['MAT1100','MAT1610','SYN201','SYN202','UAI999'],anuncios:[]};
const tarjeta=()=>run('tarjetaDirectorioHTML(p)'),perfil=()=>run('perfilPublicoHTML(p,null)'),chips=html=>[...html.matchAll(/<ul class="perfil-apoyo-chips">([\s\S]*?)<\/ul>/g)][0][1];
let html=perfil();assert.match(html,/2 ramos de tu carrera/);assert.match(chips(html),/MAT1610/);assert.doesNotMatch(chips(html),/MAT1100|UAI999/);
assert.match(html,/<details class="perfil-apoyo-otras"><summary>Otras carreras \(2\)<\/summary>/);assert.doesNotMatch(html,/<details[^>]*\bopen\b/,'ambas listas parten cerradas');
assert.match(tarjeta(),/MAT1610 · SYN201/);assert.doesNotMatch(tarjeta(),/MAT1100|UAI999/);
// Las únicas propiedades de un ramo que se permiten leer son las de identidad.
ctx.cursando={sigla:'MAT1610',nombre:'Curso sintético',get categorias(){throw Error('no leer notas')},get promedio(){throw Error('no leer promedio')}};
run('S.ramos=[cursando]');html=perfil();assert.match(html,/1 ramo de tu carrera/);assert.doesNotMatch(chips(html),/SYN201/);assert.match(tarjeta(),/MAT1610/);assert.doesNotMatch(tarjeta(),/SYN201/);
run("S.carrera=null");html=perfil();assert.match(html,/4 ramos en la UC/);assert.match(chips(html),/MAT1100/);assert.doesNotMatch(html,/UAI999/,'el respaldo sigue siendo por universidad');
run("S.carrera='SIN-MALLA'");assert.match(perfil(),/4 ramos en la UC/);
run("S.carrera='SYN-ING';S.ramos=[]");ctx.p.ramos_siglas=['MAT1100'];assert.match(perfil(),/1 ramo en la UC/,'nunca se vacía por no calzar con la carrera');
ctx.p.ramos_siglas=['MAT1100','MAT1610','SYN201','SYN202','UAI999'];
run("perfilProfesorCache={estado:'aprobado',directorio_id:p.id}");assert.match(chips(perfil()),/UAI999/,'el dueño también ve otras universidades');assert.match(tarjeta(),/MAT1100 · MAT1610 · SYN201/);
run('perfilProfesorCache=null');assert.match(run('tarjetaDirectorioHTML(p,{previa:true})'),/MAT1100 · MAT1610 · SYN201/);
assert.match(chips(run('perfilPublicoHTML(p,null,nombres,{previa:true})')),/UAI999/,'la ficha de vista previa no se filtra');
const muchos=Array.from({length:8},(_,i)=>'SYN'+(300+i));ctx.p.ramos_siglas=muchos;ctx.muchos=muchos;for(const sigla of muchos)ctx.nombres[sigla]='Curso sintético '+sigla;
run('S.ramos=muchos.map(sigla=>({sigla}))');html=perfil();assert.match(chips(html),/>\+2<\/li>/);assert.equal((chips(html).match(/<li>SYN/g)||[]).length,6);assert.match(html,/<summary>Ver los 8 ramos<\/summary>/);
assert.equal(consultas.length,0);assert.deepEqual(eventos,[]);
assert.match(run('cabeceraDirectorioHTML()'),/Ordenamos los ramos según tu carrera, en tu dispositivo\. No usamos tus notas ni enviamos esta información\./);
(async()=>{
 // El identificador del dueño viene en la lectura que ya existía; no se agrega
 // una llamada para reconocer la tarjeta ni para calcular la relevancia.
 let antigua=false,permiso=false;
 ctx.supabaseClient.from=()=>({select(c){consultas.push(c);this.c=c;return this},eq(){return this},async maybeSingle(){
  return antigua&&this.c.includes('directorio_id')?{error:{code:permiso?'42501':'42703',message:permiso?'permission denied for table tutor_perfiles':'column tutor_perfiles.directorio_id does not exist'}}:{data:{estado:'aprobado',perfil_publico:false,directorio_id:antigua?undefined:'id-propio'}};
 }});
 await run('cargarPerfilProfesor()');assert.equal(consultas.length,1);ctx.p.id='id-propio';assert.match(chips(perfil()),/8 ramos|SYN300/);assert.equal(run('perfilPropioApoyo(p)'),true);
 antigua=true;consultas.length=0;const viejo=await run('perfilProfesorActual()');assert.equal(viejo.ok,true);assert.equal(consultas.length,2);assert.ok(consultas.every(c=>c.includes('tipo_perfil')),'sin directorio_id conserva las columnas antiguas del perfil');
 permiso=true;consultas.length=0;assert.equal((await run('perfilProfesorActual()')).ok,true);assert.equal(consultas.length,2,'sin permiso de esa columna opcional se conserva la lectura propia anterior');
 console.log('PASS #1102: prioridad actual/historial/malla, respaldo, sin carrera o malla, dueño/previa, tarjeta y ficha, 6+N, notas inaccesibles y filtro sin consultas ni métricas');
})().catch(e=>{console.error(e);process.exitCode=1});
