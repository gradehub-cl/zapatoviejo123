// Controles reales con servidor simulado: mirar o cancelar no publica nada.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/..',store=new Map(),css={};
function el(){const clases=new Set();return {style:{setProperty(k,v){css[k]=v},removeProperty(k){delete css[k]}},classList:{add(c){clases.add(c)},remove(c){clases.delete(c)},toggle(c,v){if(v)clases.add(c);else clases.delete(c)},contains:c=>clases.has(c)},children:[],appendChild(){},remove(){},addEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{}};}
const ctx={console,setTimeout(){},clearTimeout(){},requestAnimationFrame(){},window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:el,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:'',search:''},history:{replaceState(){}},getComputedStyle:()=>({getPropertyValue:()=>''})};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js','festivos.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),calls=[],confirmaciones=[];
ctx.calls=calls;ctx.confirmaciones=confirmaciones;
run(`S={...freshState(),acento:'turquesa',fondo:'papel'};currentUser={id:'admin-sintetico'};showConfirm=(t,d,fn,o)=>confirmaciones.push({t,d,fn,o});supabaseClient={rpc:async(n,p)=>{calls.push({n,p});return {error:null}}}`);
const antes=run('JSON.stringify(S)'),colores=JSON.stringify(css);
const html=run('temaFestivoAdminHTML()');assert.match(html,/<details class="adu-festivos">/);assert.doesNotMatch(html,/<details[^>]* open|type="radio"/);assert.match(html,/Sin tema/);assert.match(html,/data-elegir-tema="navidad"[^>]*disabled/);assert.match(html,/GradeHub 🎃/);assert.equal(calls.length,0);assert.equal(JSON.stringify(css),colores,'dibujar muestras no cambia el tema');
const paleta=run('paletaTemaFestivo("halloween",false)');paleta.bg='otro';assert.notEqual(run('paletaTemaFestivo("halloween",false).bg'),'otro','la muestra recibe copia, nunca muta la paleta real');
const estado={textContent:''},actual={textContent:'Sin tema'};
const botones=['','halloween','navidad'].map(tema=>({dataset:{elegirTema:tema},disabled:tema==='navidad',attrs:{'aria-pressed':String(!tema)},handlers:{},indicador:{textContent:tema?'':'✓ Actual'},addEventListener(n,fn){this.handlers[n]=fn},setAttribute(k,v){this.attrs[k]=v},querySelector(){return this.indicador}}));
const caja={isConnected:true,disabled:false,querySelector:()=>estado,querySelectorAll:()=>botones};
const raiz={querySelector:s=>s==='[data-admin-tema-festivo]'?caja:s==='[data-tema-festivo-actual]'?actual:null};
ctx.raiz=raiz;run('enlazarTemaFestivoAdmin(raiz)');
(async()=>{
 botones[1].handlers.click();assert.equal(calls.length,0);assert.match(confirmaciones[0].d,/todos, incluso antes de iniciar sesión/);assert.equal(confirmaciones[0].o.focusCancel,true);assert.equal(run('temaFestivo'),null);assert.equal(botones[1].attrs['aria-pressed'],'false');
 // Cancelar = no ejecutar la confirmación. Una nueva elección vuelve a pedirla.
 botones[1].handlers.click();await confirmaciones.at(-1).fn();assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0].p)),{p_tema:'halloween'});assert.equal(run('temaFestivo'),'halloween');assert.equal(botones[1].attrs['aria-pressed'],'true');assert.equal(actual.textContent,'Halloween');assert.equal(caja.disabled,false);
 botones[0].handlers.click();await confirmaciones.at(-1).fn();assert.equal(run('temaFestivo'),null);assert.equal(css['--bg'],run('FONDOS.papel.claro.bg'));assert.equal(css['--primary'],run('ACENTOS.turquesa.primary'));assert.equal(run('JSON.stringify(S)'),antes);
 run(`supabaseClient.rpc=async()=>({error:{code:'PGRST202'}})`);botones[1].handlers.click();await confirmaciones.at(-1).fn();assert.equal(run('temaFestivo'),null);assert.equal(botones[0].attrs['aria-pressed'],'true');assert.match(estado.textContent,/No se guardó/);assert.equal(caja.disabled,false);
 run('supabaseClient=null');botones[1].handlers.click();await confirmaciones.at(-1).fn();assert.match(estado.textContent,/No se guardó/);assert.equal(run('temaFestivo'),null);
 botones[1].handlers.click();run('currentUser={id:"otra-cuenta"}');await confirmaciones.at(-1).fn();assert.equal(calls.length,2,'cambiar de cuenta antes de confirmar no publica');
 run('currentUser={id:"admin-sintetico"}');let resolver;ctx.promesa=()=>new Promise(r=>{resolver=r;calls.push({n:'pendiente'})});run('supabaseClient={rpc:promesa}');botones[1].handlers.click();const guardar=confirmaciones.at(-1).fn();assert.equal(caja.disabled,true);const numero=confirmaciones.length;botones[1].handlers.click();assert.equal(confirmaciones.length,numero,'no duplica mientras guarda');resolver({error:null});await guardar;assert.equal(run('temaFestivo'),'halloween');assert.equal(caja.disabled,false);
 const src=fs.readFileSync(root+'/src/marketplace/admin-estadisticas.js','utf8');assert.ok(src.indexOf('${temaFestivoAdminHTML()}')>src.indexOf('id="admin-reportes-programa"'),'está al final de Usuarios');assert.equal(run('JSON.stringify(S)'),antes);
 console.log('OK: muestras reales, desplegable cerrado, confirmación, cancelar, error/RPC ausente, cuenta cambiada, doble clic y restauración de preferencias; sin SQL');
})().catch(e=>{console.error(e);process.exitCode=1});
