const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const ids={},store=new Map(),writes=[];let guardados=0;
function el(){return {value:'',innerHTML:'',textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},removeEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return el()},focus(){this.enfocado=true},select(){}};}
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>ids[id]||(ids[id]=el()),createElement:el,addEventListener(){},querySelector(){return el()},querySelectorAll(){return []},documentElement:el(),body:el()},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),set=(key,v)=>{ctx.fixture=v;run(key+'=fixture')};
const cat=(id,peso,nota)=>({id,nombre:id,peso,directNota:true,notas:nota==null?[]:[{id:'n'+id,nombre:id,valor:nota,peso:1}]});
const completo={id:'a',nombre:'Ramo sintético A',creditos:10,categorias:[cat('Prueba',50,5),cat('Examen',50,5)],gates:[]};
const parcial={id:'b',nombre:'Ramo sintético B',creditos:20,categorias:[cat('Prueba',50,6),cat('Examen',50,null)],gates:[]};
function estado(rs){set('S',{...run('freshState()'),tenant:'uc',ramos:JSON.parse(JSON.stringify(rs)),historial:[]});run("currentUser={id:'u'}");}
ctx.save=()=>guardados++;ctx.closeModal=()=>{};ctx.openModal=()=>{};ctx.renderHome=()=>{};ctx.showToast=()=>{};
(async()=>{
 estado([completo,parcial]);const original=JSON.stringify(run('S.ramos'));
 assert.equal(run('cierreWrapped({ramos:S.ramos,actual:true}).listo'),false);
 run('confirmArchiveSemester()');assert(ids['modal-content'].innerHTML.includes('Falta: Examen'));assert(ids['modal-content'].innerHTML.includes('Completar evaluaciones'));
 ids['cierre-oficial-0']=Object.assign(el(),{value:''});ids['cierre-oficial-1']=Object.assign(el(),{value:''});
 run('guardarArchivoRevisado()');assert.equal(run('S.ramos.length'),0);assert.equal(run('S.historial[0].ramos[1].cierreIncompleto'),true);
 assert.equal(run('gpaHistorial(S.historial[0])'),5);assert.equal(run('promedioAcumuladoCierre(S.historial)'),5);assert.equal(run('histRamoAvg(S.historial[0].ramos[1],S.historial[0].ramos)'),null);
 assert.equal(JSON.stringify(run('S.historial[0].ramos.map(r=>r.categorias)')),JSON.stringify(JSON.parse(original).map(r=>r.categorias)));
 assert.equal(run('cierreWrapped({ramos:S.historial[0].ramos,actual:false}).listo'),false);
 run('S.historial[0].ramos[1].categorias[1].notas=[{id:"ex",nombre:"Examen",valor:4,peso:1}]');
 assert.equal(run('gpaHistorial(S.historial[0])'),5,'al completar vuelve a entrar');
 estado([completo,parcial]);run('confirmArchiveSemester()');ids['cierre-oficial-0'].value='4,5';ids['cierre-oficial-1'].value='6';run('guardarArchivoRevisado()');
 assert.equal(run('S.historial[0].ramos[0].notaOficial'),4.5);assert.equal(run('S.historial[0].ramos[0].cierre.calculada'),5);assert.equal(run('S.historial[0].ramos[1].cierreIncompleto'),false);
 assert.equal(run('gpaHistorial(S.historial[0])'),5.5);assert.equal(run('promedioAcumuladoCierre(S.historial)'),5.5);
 assert.equal(run('datosWrapped(S.historial[0].ramos).gpa'),5.5);assert.equal(run('cierreWrapped({ramos:S.historial[0].ramos,actual:false}).listo'),true);
 const normalizado=run('normalize(JSON.parse(JSON.stringify(S)))');assert.equal(normalizado.historial[0].ramos[0].notaOficial,4.5);
 const nube=JSON.parse(JSON.stringify(normalizado));nube.userName='Cambio en otro dispositivo';ctx.nube=nube;ctx.base=JSON.parse(JSON.stringify(normalizado));
 assert.equal(run('fusionarSync(base,S,nube).historial[0].ramos[0].notaOficial'),4.5);
 // El documento que se sube realmente conserva la nota y el cierre; SQL ausente no impide respaldar.
 const calls=[];ctx.cliente={from:()=>({upsert:async fila=>{writes.push(JSON.parse(JSON.stringify(fila)));return {error:null}}}),rpc:async(n,args)=>{calls.push({n,args});return {error:{code:'PGRST202'}}}};run('supabaseClient=cliente');
 assert.equal(await run("subirConVersion('u')"),true);assert.equal(writes[0].data.historial[0].ramos[0].notaOficial,4.5);
 await new Promise(setImmediate);await run('enviarDiscrepanciasCierre()');assert(!run('S.historial[0].ramos[0].cierre.discrepanciaEnviada'));
 ctx.cliente.rpc=async(n,args)=>{calls.push({n,args});return {data:true,error:null}};await run('enviarDiscrepanciasCierre()');
 assert(run('S.historial[0].ramos[0].cierre.discrepanciaEnviada'));assert(!JSON.stringify(calls).includes('categorias'));const count=calls.length;await run('enviarDiscrepanciasCierre()');assert.equal(calls.length,count,'reintento idempotente sin duplicar envío');
 assert(calls.every(c=>Object.keys(c.args).sort().join(',')==='p_calculada,p_huella,p_oficial,p_pauta_origen,p_periodo,p_sigla,p_tenant'));
 // Cuentas previas: mismas evaluaciones, caché y avgOverride. No se migran al leer.
 estado([]);ctx.viejo={id:'h',gpa:5.123,label:'2025-2',ramos:[JSON.parse(JSON.stringify(completo))]};run('S.historial=[viejo]');
 assert.equal(run('gpaHistorial(viejo)'),5.123);assert.equal(run('gpa(viejo.ramos)'),5);assert.equal(run('histRamoAvg(viejo.ramos[0],viejo.ramos)'),5);
 run('viejo.ramos[0].avgOverride=4.3');assert.equal(run('histRamoAvg(viejo.ramos[0],viejo.ramos)'),4.3);
 estado([completo]);run('confirmArchiveSemester()');ids['cierre-oficial-0'].value='8';run('guardarArchivoRevisado()');assert.equal(run('S.ramos.length'),1);assert(ids['cierre-oficial-0'].enfocado);
 const catedra={...completo,nombre:'Cátedra sintética',aporta:{ramo:'Laboratorio sintético',peso:30,min:4}};
 const lab={...parcial,nombre:'Laboratorio sintético',creditos:0};
 estado([catedra,lab]);assert.equal(run('revisionCierreSemestre({actual:true,ramos:S.ramos}).pendientes.length'),2,'el cierre propaga un laboratorio pendiente a su cátedra');
 run('S.ramos[1].notaOficial=6');assert.equal(run('revisionCierreSemestre({actual:true,ramos:S.ramos}).pendientes.length'),0);
 run('S.ramos[1].categorias[0].notas[0].valor=4');
 assert.equal(run('notaRamoParaResumen(S.ramos[0],S.ramos)'),5.3,'la nota oficial del laboratorio participa del vínculo sin cambiar evaluaciones');
 assert.equal(run('S.ramos[1].categorias[0].notas[0].valor'),4);
 const tope={...completo,gates:[{type:'min_grade_required',catId:'Examen',min:4,cap:3.9}],categorias:[cat('Prueba',60,7),cat('Examen',40,3)]};
 estado([tope]);run('confirmArchiveSemester()');ids['cierre-oficial-0'].value='4,2';run('guardarArchivoRevisado()');
 assert.equal(run('S.historial[0].ramos[0].cierre.calculada'),3.9,'la captura conserva el tope real del motor');assert.equal(run('gpaHistorial(S.historial[0])'),4.2);
 const fuente=fs.readFileSync('src/render-main/wrapped-datos.js','utf8');assert(fuente.includes("WRAPPED_DESDE='2026-12-01'"));
 console.log('PASS cierre: pendientes, portal, acumulado, Wrapped, legado, validación y sync real');
})().catch(e=>{console.error(e);process.exit(1)});
