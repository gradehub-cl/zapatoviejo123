// #1072: mismo gpa bruto en Inicio y Estadísticas. No se redondea cada ramo
// antes de promediar, ni se trunca o redondea dos veces para presentarlo.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.GRADEHUB_ROOT||__dirname+'/..',els=new Map();
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],appendChild(){},remove(){},addEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},closest(){return null},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
const get=id=>{if(!els.has(id))els.set(id,el());return els.get(id)};
const ctx={console,setTimeout(){},clearTimeout(){},requestAnimationFrame(){},window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:get,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:'',search:''},history:{replaceState(){}},getComputedStyle:()=>({getPropertyValue:()=>''})};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
const ramo=(id,valor,creditos=10)=>({id,nombre:'Ramo sintético '+id,color:'#888888',creditos,origen:null,gates:[],categorias:[{id:'p'+id,nombre:'Prueba',peso:100,directNota:true,notas:[{id:'n'+id,nombre:'Prueba',valor,peso:1}]}]});
function comprobar(ramos,esperado){ctx.ramos=ramos;run(`S=normalize({...freshState(),onboardingDone:true,tenant:'uc',ramos});cacheEvolucionStats=null;`);const antes=run('JSON.stringify(S)'),bruto=ctx.gpa(ramos),promedios=ramos.map(r=>ctx.ramoAvg(r));run('renderHome();renderStats()');assert.equal(get('home-gpa').innerHTML.replace(/<[^>]+>/g,''),esperado);assert.ok(get('stats-body').innerHTML.includes('class="stats-evolucion-valor">'+esperado+'</div>'));assert.equal(run('seriePromedioNotas(S.ramos).at(-1).valor'),bruto);assert.ok(run('contenidoEvolucionStatsHTML()').includes('Promedio '+esperado));assert.equal(run('JSON.stringify(S)'),antes);assert.deepEqual(ramos.map(r=>ctx.ramoAvg(r)),promedios);return bruto;}
const bruto=comprobar([ramo('a',5.2),ramo('b',5.2898)],'5,24');assert.ok(Math.abs(bruto-5.2449)<1e-12);
assert.equal((ctx.notaFinalOficial(5.2)+ctx.notaFinalOficial(5.2898))/2,5.25,'promediar primero las notas oficiales sería OTRO promedio');
comprobar([ramo('a',5.225)],'5,23');comprobar([ramo('a',5.247)],'5,25');comprobar([ramo('a',5.2,15),ramo('b',5.2898,5)],'5,22');comprobar([ramo('a',5.2,null),ramo('b',5.2898,5)],'5,24');
for(const [v,esperado] of [[5.2449,'5,24'],[5.245,'5,25'],[5.247,'5,25'],[5.225,'5,23'],[1.005,'1,01'],[4,'4,00'],[null,'—'],[NaN,'—'],[Infinity,'—']])assert.equal(ctx.fmtPromedioGeneral(v),esperado);
assert.equal(ctx.fmtPromedio(3.98),'4.0','el formato de nota final de ramo sigue a la décima');assert.equal(ctx.notaFinalOficial(3.98),4);
assert.match(run('hitosEvolucionHTML([{nombre:"P",ramo:"R",nota:5.2,valor:5.225,delta:null}],1)'),/Promedio 5,23/);
console.log('OK #1072: 5,2449→5,24; 5,247→5,25; borde5,225→5,23; Inicio, titular, gráfico y línea de tiempo usan el mismo formato, sin modificar gpa, ramos ni estado');
