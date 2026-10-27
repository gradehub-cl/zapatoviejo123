// Calificación del profesor en la ficha: umbral de 3, escape, payload y cuentas existentes. Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function elemento(){return {innerHTML:'',textContent:'',hidden:false,children:new Map(),
  querySelector(s){if(!this.children.has(s))this.children.set(s,elemento());return this.children.get(s);},
  appendChild(el){this.form=el;},focus(){}};}
const raiz=elemento(),r={id:'local-1',seccion:2,nombre:'Ramo sintético',categorias:[{notas:[{valor:4.7}]}]};
const llamadas=[];let respuestas={};
const ctx={S:{tenant:'uc',ramos:[r]},currentUser:{id:'cuenta-1'},currentRamoId:r.id,semester:()=>'2026-2',showToast:()=>{},
  esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  document:{getElementById:()=>raiz,createElement:()=>elemento()},
  supabaseClient:{rpc:async(nombre,args)=>{llamadas.push({nombre,args});return {data:[respuestas[nombre]||{}]};}}};
vm.createContext(ctx);vm.runInContext(read('data.js')+'\n'+read('render-main.js'),ctx);
const plano=x=>JSON.parse(JSON.stringify(x));
(async()=>{
  // Bajo 3 no hay promedio ni etiquetas, aunque el servidor mandara algo.
  let html=ctx.htmlResumenCalificacion({docente:'X',total:2,promedio:4.5,etiquetas:[{etiqueta:'exigente',n:2}],puede_calificar:true});
  assert.doesNotMatch(html,/4\.5|Exigente/);assert.match(html,/desde 3/);assert.match(html,/Calificar al profesor/);
  html=ctx.htmlResumenCalificacion({docente:'X',total:0,puede_calificar:false});
  assert.match(html,/Todavía nadie/);assert.doesNotMatch(html,/data-calificar/,'fuera de período no se ofrece calificar');
  html=ctx.htmlResumenCalificacion({docente:'X',total:12,promedio:'4.25',etiquetas:[{etiqueta:'explica_claro',n:5},{etiqueta:'<img src=x>',n:4}],mi_estrellas:4,puede_calificar:true});
  assert.match(html,/4\.3<\/strong>/);assert.match(html,/12 calificaciones en este ramo/);assert.match(html,/Explica claro/);
  assert.doesNotMatch(html,/<img/,'una etiqueta desconocida no se pinta');
  assert.match(html,/Tu calificación: 4 de 5/);assert.match(html,/Editar mi calificación/);
  assert.doesNotMatch(html,/verde|rojo|aprobado|reprobado/,'no usa el semáforo');

  // El payload lleva solo el contexto de la sección, las estrellas y etiquetas conocidas.
  const contexto=ctx.contextoDocente(r);
  assert.deepEqual(plano(ctx.payloadCalificacion(contexto,5,['exigente','exigente','inventada','explica_claro','da_feedback','harta_carga'])),
    {p_ramo_id:'local-1',p_seccion:2,p_periodo:'2026-2',p_estrellas:5,p_etiquetas:['exigente','explica_claro','da_feedback']});

  // La ficha pide calificaciones solo con docente confirmado, sin tocar datos guardados.
  const base=JSON.stringify(ctx.S);
  respuestas={profesor_docente_estado:{nombre_publico:null,mi_nombre:null}};
  await ctx.renderDocenteRamo(r);
  assert.ok(!llamadas.some(x=>x.nombre==='profesor_calificacion_estado'),'sin consenso no se consulta');
  respuestas={profesor_docente_estado:{nombre_publico:'Docente Sintético',mi_nombre:null},
    profesor_calificacion_estado:{docente:'Docente Sintético',total:3,promedio:3,etiquetas:[],puede_calificar:true}};
  await ctx.renderDocenteRamo(r);await new Promise(x=>setImmediate(x));
  const pedida=llamadas.find(x=>x.nombre==='profesor_calificacion_estado');
  assert.deepEqual(plano(pedida.args),{p_ramo_id:'local-1',p_seccion:2,p_periodo:'2026-2'});
  assert.match(raiz.querySelector('.docente-calificacion').innerHTML,/3\.0<\/strong>/);
  assert.match(raiz.innerHTML,/Profesor:/,'el docente sigue igual');
  // Un error de lectura ofrece reintentar en vez de simular que no hay calificaciones.
  ctx.supabaseClient.rpc=async n=>n==='profesor_calificacion_estado'?{error:{message:'red caída'}}:{data:[respuestas[n]]};
  await ctx.renderDocenteRamo(r);await new Promise(x=>setImmediate(x));
  assert.match(raiz.querySelector('.docente-calificacion').innerHTML,/Reintentar/);
  assert.doesNotMatch(raiz.querySelector('.docente-calificacion').innerHTML,/Todavía nadie/);
  assert.equal(JSON.stringify(ctx.S),base,'no toca ramo, notas ni estado persistido');
  console.log('OK calificaciones UI: umbral de 3, escape, payload mínimo, errores y cuentas existentes');
})().catch(e=>{console.error(e);process.exitCode=1;});
