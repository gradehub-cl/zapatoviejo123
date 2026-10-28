// Ficha de ramo: consulta, calificación, contexto y respuestas tardías. Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function elemento(){return {innerHTML:'',textContent:'',hidden:false,isConnected:true,children:new Map(),attrs:{},
  querySelector(s){if(s==='button'&&!this.innerHTML.includes('<button'))return null;if(!this.children.has(s))this.children.set(s,elemento());return this.children.get(s);},
  setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},focus(){}};}
const elements=Object.fromEntries(['ramo-profe','calif-accion','editar-profe'].map(k=>[k,elemento()]));
const raiz=elements['ramo-profe'],boton=elements['calif-accion'];
const r={id:'local-1',seccion:2,nombre:'Ramo sintético',color:'#123456',categorias:[{notas:[{valor:4.7}]}]};
let llamadas=[],respuestas={},toasts=[],ediciones=0;
const ctx={S:{tenant:'uc',ramos:[r]},currentUser:{id:'cuenta-1'},currentRamoId:r.id,
  semester:()=>'2026-2',showToast:t=>toasts.push(t),openEditRamoModal:()=>ediciones++,modalColor:r.color,
  esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  document:{getElementById:id=>elements[id]||null,querySelectorAll:()=>[]},
  supabaseClient:{rpc:async(nombre,args)=>{llamadas.push({nombre,args});return {data:[respuestas[nombre]||{}]};}}};
vm.createContext(ctx);vm.runInContext(read('data.js')+'\n'+read('render-main.js'),ctx);
const plano=x=>JSON.parse(JSON.stringify(x)),base=JSON.stringify(ctx.S);
(async()=>{
  respuestas={profesor_docente_estado:{nombre_publico:null,mi_nombre:null},profesor_calificacion_estado:{total:0,puede_calificar:true}};
  await ctx.renderDocenteRamo(r);
  assert.equal(raiz.innerHTML,'');assert.equal(boton.hidden,false);assert.match(boton.innerHTML,/Calificar profesor/);
  assert.deepEqual(plano(llamadas.map(x=>x.args)),[{p_ramo_id:'local-1',p_seccion:2,p_periodo:'2026-2'},{p_ramo_id:'local-1',p_seccion:2,p_periodo:'2026-2'}]);
  assert.equal(JSON.stringify(ctx.S),base,'no toca notas ni datos académicos');
  respuestas.profesor_docente_estado={nombre_publico:'Lucas José Irarrázaval Bulnes',mi_nombre:'Lucas José Irarrázaval Bulnes'};
  respuestas.profesor_calificacion_estado={total:12,promedio:4.3,mi_estrellas:4,mi_otro:'Amable',puede_calificar:true};
  await ctx.renderDocenteRamo(r);
  assert.match(raiz.innerHTML,/Lucas J\. Irarrázaval/);assert.match(raiz.innerHTML,/4\.3<\/strong>/);
  assert.match(raiz.innerHTML,/aria-label="Profesor Lucas José Irarrázaval Bulnes\. Promedio 4\.3 de 5\. Editar tu calificación"/);
  assert.doesNotMatch(raiz.innerHTML,/Profesor:|12 calificaciones|Amable/);assert.equal(boton.hidden,true,'desaparece después de calificar');
  await ctx.pintarProfesorEditarRamo(r);
  assert.match(elements['editar-profe'].innerHTML,/Lucas J\. Irarrázaval[\s\S]*Tu calificación: 4 de 5/);
  respuestas.profesor_calificacion_estado={total:2,promedio:4.5,puede_calificar:true};
  await ctx.renderDocenteRamo(r);assert.doesNotMatch(raiz.innerHTML,/4\.5/);assert.equal(boton.hidden,false);
  respuestas.profesor_calificacion_estado.puede_calificar=false;
  await ctx.renderDocenteRamo(r);assert.equal(boton.hidden,true);assert.doesNotMatch(raiz.innerHTML,/<button/);
  ctx.supabaseClient.rpc=async()=>({error:{message:'red caída'}});
  await ctx.renderDocenteRamo(r);assert.equal(boton.hidden,false);assert.equal(boton.textContent,'Reintentar');assert(toasts.length);
  ctx.supabaseClient.rpc=async n=>({data:[n==='profesor_docente_estado'?{nombre_publico:'<img src=x onerror=alert(1)>',mi_nombre:null}:{total:0,puede_calificar:true}]});
  await ctx.renderDocenteRamo(r);assert.doesNotMatch(raiz.innerHTML,/<img/);assert(!boton.attrs['aria-label'],'el reintento no deja un nombre accesible obsoleto');
  const resolvers=[];ctx.supabaseClient.rpc=()=>new Promise(resolve=>resolvers.push(resolve));
  const pendiente=ctx.renderDocenteRamo(r);ctx.currentUser={id:'otra-cuenta'};
  resolvers.forEach(resolve=>resolve({data:[{nombre_publico:'No debe aparecer',mi_nombre:'Privado',puede_calificar:true}]}));await pendiente;
  assert.doesNotMatch(raiz.innerHTML,/No debe aparecer|Privado/);
  let consultas=0;ctx.supabaseClient.rpc=async()=>{consultas++;return {data:[]};};
  ctx.currentUser=null;await ctx.renderDocenteRamo(r);assert.equal(raiz.innerHTML,'');assert.equal(boton.hidden,true);
  let secciones=0;ctx.abrirSeccionParaCalificar=()=>secciones++;
  ctx.currentUser={id:'cuenta-1'};r.seccion=null;await ctx.renderDocenteRamo(r);assert.equal(consultas,0);assert.equal(boton.hidden,false);boton.onclick();assert.equal(secciones,1);assert.equal(ediciones,0,'no abre el editor completo');
  ctx.S.ramos=[];assert.equal(ctx.contextoDocente(r),null);
  console.log('OK ficha de profesor: nombre corto, promedio desde 3, sin etiquetas públicas, editar, reintentar, XSS y cambio de cuenta');
})().then(()=>terminado=true,e=>{console.error(e);process.exitCode=1;});
let terminado=false;process.on('exit',()=>{if(!terminado&&!process.exitCode){console.error('el test no terminó');process.exitCode=1;}});
