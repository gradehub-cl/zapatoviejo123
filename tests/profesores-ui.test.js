// Docente en la ficha: sin botón de informar suelto, Calificar profesor, errores, XSS y cambio de cuenta. Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function elemento(){return {innerHTML:'',textContent:'',hidden:false,children:new Map(),
  querySelector(s){if(!this.children.has(s))this.children.set(s,elemento());return this.children.get(s);},focus(){}};}
const raiz=elemento(),r={id:'local-1',seccion:2,nombre:'Ramo sintético',categorias:[{notas:[{valor:4.7}]}]};
let llamadas=[],respuestas={};
const ctx={S:{tenant:'uc',ramos:[r],userName:'Persona sintética'},currentUser:{id:'cuenta-1'},currentRamoId:r.id,
  semester:()=>'2026-2',showToast:()=>{},openEditRamoModal:()=>{},
  esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  document:{getElementById:()=>raiz,createElement:()=>elemento()},
  supabaseClient:{rpc:async(nombre,args)=>{llamadas.push({nombre,args});return {data:[respuestas[nombre]||{}]};}}};
vm.createContext(ctx);vm.runInContext(read('data.js')+'\n'+read('render-main.js').replace('const CALIFICAR_PROFESOR_VISIBLE=false;','const CALIFICAR_PROFESOR_VISIBLE=true;'),ctx);
const base=JSON.stringify(ctx.S);
const plano=x=>JSON.parse(JSON.stringify(x));
(async()=>{
  // Sin consenso: pregunta y ofrece calificar; informar suelto ya no aparece.
  respuestas={profesor_docente_estado:{nombre_publico:null,mi_nombre:null},profesor_calificacion_estado:{docente:null,total:0,puede_calificar:true}};
  await ctx.renderDocenteRamo(r);
  assert.match(raiz.innerHTML,/¿Quién te hace clases\?/);
  assert.match(raiz.innerHTML,/Calificar profesor/);
  assert.doesNotMatch(raiz.innerHTML,/Informar profesor|Informar o corregir|Corregir mi aporte/);
  assert.deepEqual(plano(llamadas.map(x=>x.args)),[{p_ramo_id:'local-1',p_seccion:2,p_periodo:'2026-2'},{p_ramo_id:'local-1',p_seccion:2,p_periodo:'2026-2'}]);
  assert.equal(JSON.stringify(ctx.S),base,'no toca ramo, notas ni estado persistido');

  // Con aporte propio y sin consenso, se ve su profesor y que falta coincidencia.
  respuestas.profesor_docente_estado={nombre_publico:null,mi_nombre:'María José Pérez'};
  respuestas.profesor_calificacion_estado={docente:null,total:0,mi_estrellas:4,puede_calificar:true};
  await ctx.renderDocenteRamo(r);
  assert.match(raiz.innerHTML,/Tu profesor: <strong>María José Pérez/);assert.match(raiz.innerHTML,/3 cuentas/);
  assert.match(raiz.innerHTML,/Editar mi calificación/);assert.match(raiz.innerHTML,/Tu calificación: 4 de 5/);

  // Fuera del período vigente no se ofrece calificar.
  respuestas.profesor_calificacion_estado={docente:null,total:0,puede_calificar:false};
  await ctx.renderDocenteRamo(r);assert.doesNotMatch(raiz.innerHTML,/data-calificar/);

  // Un error de lectura ofrece reintentar en vez de simular que no hay profesor.
  ctx.supabaseClient.rpc=async n=>n==='profesor_calificacion_estado'?{error:{message:'red caída'}}:{data:[respuestas[n]]};
  await ctx.renderDocenteRamo(r);
  assert.match(raiz.innerHTML,/Reintentar/);assert.doesNotMatch(raiz.innerHTML,/¿Quién te hace clases/);

  // El nombre de un tercero se escapa antes de mostrarse.
  ctx.supabaseClient.rpc=async n=>({data:[{profesor_docente_estado:{nombre_publico:'<img src=x onerror=alert(1)>',mi_nombre:null},
    profesor_calificacion_estado:{docente:'x',total:0,puede_calificar:true}}[n]]});
  await ctx.renderDocenteRamo(r);assert.match(raiz.innerHTML,/Profesor:/);assert.doesNotMatch(raiz.innerHTML,/<img/);

  // Las respuestas de otra cuenta o de una solicitud anterior no repintan.
  const resolvers=[];ctx.supabaseClient.rpc=()=>new Promise(resolve=>{resolvers.push(resolve);});
  const pendiente=ctx.renderDocenteRamo(r);ctx.currentUser={id:'cuenta-2'};
  assert.equal(resolvers.length,2);
  resolvers.forEach(x=>x({data:[{nombre_publico:'No debe aparecer',mi_nombre:'Privado',docente:'No debe aparecer',puede_calificar:true}]}));await pendiente;
  assert.doesNotMatch(raiz.innerHTML,/No debe aparecer|Privado/);

  // Sin sesión o sin sección no se consulta nada.
  let consultas=0;ctx.supabaseClient.rpc=async()=>{consultas++;return{data:[]};};
  ctx.currentUser=null;await ctx.renderDocenteRamo(r);assert.equal(raiz.innerHTML,'');
  ctx.currentUser={id:'cuenta-1'};r.seccion=null;await ctx.renderDocenteRamo(r);assert.match(raiz.innerHTML,/Agregar sección para calificar/);
  assert.equal(consultas,0);
  ctx.S.ramos=[];assert.equal(ctx.contextoDocente(r),null,'un ramo fuera del semestre no habilita envío');
  console.log('OK docentes UI: Calificar profesor sin informar suelto, aporte propio, errores, XSS y cambio de cuenta');
})().then(()=>{terminado=true;},e=>{console.error(e);process.exitCode=1;});
// Una promesa que nunca se resuelve no puede pasar en silencio.
let terminado=false;process.on('exit',()=>{if(!terminado&&!process.exitCode){console.error('el test no terminó');process.exitCode=1;}});

// Mientras CALIFICAR_PROFESOR_VISIBLE sea false, la ficha no ofrece calificar.
(async()=>{
  const raiz2=elemento();
  const ctx2={...ctx,currentUser:{id:'cuenta-1'},S:{tenant:'uc',ramos:[{id:'local-2',seccion:1}]},currentRamoId:'local-2',
    document:{getElementById:()=>raiz2},supabaseClient:{rpc:async n=>({data:[{profesor_docente_estado:{nombre_publico:'Docente Sintético',mi_nombre:null},
      profesor_calificacion_estado:{docente:'Docente Sintético',total:0,puede_calificar:true}}[n]]})}};
  vm.createContext(ctx2);vm.runInContext(read('data.js')+'\n'+read('render-main.js'),ctx2);
  await ctx2.renderDocenteRamo(ctx2.S.ramos[0]);
  assert.match(raiz2.innerHTML,/Profesor: <strong>Docente Sintético/);
  assert.doesNotMatch(raiz2.innerHTML,/data-calificar|Calificar profesor/);
  // Sin consenso, con aporte propio, sin sección o con error: la ficha no muestra nada.
  ctx2.supabaseClient.rpc=async n=>({data:[{profesor_docente_estado:{nombre_publico:null,mi_nombre:'Mi Docente Sintético'},
    profesor_calificacion_estado:{docente:null,total:0,mi_estrellas:3,puede_calificar:true}}[n]]});
  await ctx2.renderDocenteRamo(ctx2.S.ramos[0]);assert.equal(raiz2.innerHTML,'');
  ctx2.supabaseClient.rpc=async()=>({error:{message:'red caída'}});
  await ctx2.renderDocenteRamo(ctx2.S.ramos[0]);assert.equal(raiz2.innerHTML,'');
  ctx2.S.ramos[0].seccion=null;await ctx2.renderDocenteRamo(ctx2.S.ramos[0]);assert.equal(raiz2.innerHTML,'');
  console.log('OK docentes UI: oculto en producción, solo se ve el docente confirmado');
})().catch(e=>{console.error(e);process.exitCode=1;});
