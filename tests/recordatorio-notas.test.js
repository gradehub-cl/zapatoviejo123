// Pautas propias; la fecha de evaluación no implica que ya haya sido rendida.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const store=new Map(),writes=[];
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},dataset:{},value:'',innerHTML:'',addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return[]}}),stub=el();
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}})},document:{getElementById:()=>stub,createElement:el,documentElement:stub,body:stub,addEventListener(){},querySelector(){return null},querySelectorAll(){return[]}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{writes.push(k);store.set(k,v)},removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','render-main.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
writes.length=0;
const run=s=>vm.runInContext(s,ctx),hoy=new Date(2026,10,3,12);ctx.hoy=hoy;
const nota=(id,fecha,valor=null)=>({id,nombre:id,fecha,valor,peso:1});
const ramo=(id,notas)=>({id,nombre:'Ramo '+id,creditos:10,categorias:[{id:'c-'+id,nombre:'Pruebas',peso:100,directNota:true,slots:3,notas}]});
function preparar(ramos){ctx.ramos=ramos;run("S={tenant:'uc',tipoCuenta:'estudiante',ramos,historial:[]};var currentUser=null");}
const listado=()=>JSON.parse(run('JSON.stringify(recordatoriosNotasFaltantes(hoy).map(e=>({ramo:e.ramo.id,nota:e.nota?.id,fecha:e.fecha})))'));
preparar([ramo('a',[nota('seis','2026-10-28')])]);assert.equal(listado().length,0,'6 días: todavía no');
preparar([ramo('a',[nota('siete','2026-10-27')])]);assert.equal(listado().length,0,'7 días exactos: todavía no');
preparar([ramo('a',[nota('ocho','2026-10-26')])]);assert.equal(listado().length,1,'8 días: aparece');
const modelo=run('JSON.stringify(S)');run('recordatoriosNotasFaltantes(hoy)');assert.equal(run('JSON.stringify(S)'),modelo);assert.deepEqual(writes,[],'leer no guarda S ni descartes');
run('S.ramos[0].categorias[0].notas[0].valor=5');assert.equal(listado().length,0,'con nota no aparece');
preparar([ramo('a',[nota('sin-fecha',null)])]);assert.equal(listado().length,0,'sin fecha no infiere nada');
preparar([ramo('a',[nota('invalida','2026-02-30')])]);assert.equal(listado().length,0,'no normaliza una fecha inexistente');
preparar([ramo('a',[nota('futura','2026-12-01')])]);assert.equal(listado().length,0);
preparar([ramo('a',[nota('segunda','2026-10-20'),nota('tercera','2026-10-22'),nota('primera','2026-10-10')])]);assert.deepEqual(listado().map(x=>x.nota),['primera'],'una por ramo, la más antigua');
run("S.tipoCuenta='profesor'");assert.equal(listado().length,0,'cuenta de profesor, incluso no aprobada');run("S.tipoCuenta='estudiante'");
for(const final of [{cierre:{tenant:'uc'}},{notaOficial:5},{avgOverride:5}]){Object.assign(ctx.ramos[0],final);assert.equal(listado().length,0,'ramo cerrado');for(const k of Object.keys(final))delete ctx.ramos[0][k];}
preparar([{id:'cerrado-justificado',nombre:'Pauta propia cerrada',categorias:[
 {id:'control',nombre:'Control',peso:20,directNota:true,fecha:'2026-10-10',notas:[]},
 {id:'examen',nombre:'Examen',peso:80,directNota:true,notas:[nota('final','2026-10-15',5)]}],
 reglasAusenciaJustificada:{traspasos:[{desdeId:'control',haciaId:'examen'}],rezagos:[],reemplazos:[]},ausenciasJustificadas:['control']}]);
assert.equal(listado().length,0,'el motor también reconoce el cierre con ausencia justificada');
preparar([ramo('a',[])]);run("S.ramos[0].categorias[0].fecha='2026-10-26'");assert.equal(listado().length,1,'fecha guardada en la pauta también sirve');
preparar(Array.from({length:5},(_,i)=>ramo(String(i),[nota('n'+i,'2026-10-'+(10+i))])));assert.deepEqual(listado().map(x=>x.ramo),['0','1','2'],'máximo tres, sin depender del orden de Inicio');
// Descartar una evaluación no abre el ramo, no guarda notas ni repone otro aviso.
preparar([ramo('a',[nota('ocho','2026-10-26')])]);run('var items=recordatoriosNotasFaltantes(hoy)');
let quitada=false,foco=false,abre=0;const anotar={},descartar={};const fila={dataset:{recordatorioNota:run('items[0].clave')},querySelector:s=>s.includes('anotar')?anotar:descartar,closest:()=>({querySelector:()=>({focus(){foco=true}})}),remove(){quitada=true}};
ctx.caja={querySelectorAll:()=>[fila]};run('montarRecordatoriosNotasHome(caja,items)');descartar.onclick({stopPropagation(){}});
assert(quitada&&foco);assert.equal(listado().length,0,'descartada');assert.deepEqual(writes,['gradehub_recordatorios_notas_descartados_v1']);
run('recordatoriosNotasSesion.clear()');assert.equal(listado().length,0,'se conserva después de recargar la sesión');
run("S.ramos[0].categorias[0].notas[0].fecha='2026-10-25'");assert.equal(listado().length,0,'el descarte pertenece a la evaluación, no a su fecha');
run("currentUser={id:'otra-cuenta-sintetica'}");assert.equal(listado().length,1,'otra cuenta del dispositivo no hereda el descarte');
run("var html=recordatorioNotaHTML(recordatoriosNotasFaltantes(hoy)[0])");assert.match(run('html'),/Anotar/);assert.doesNotMatch(run('html'),/class="[^"]*(?:good|warn|bad)|--(?:red|green|yellow)/,'no usa semáforo');
const css=fs.readFileSync(__dirname+'/../styles.css','utf8');assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{#home-ramos \.home-nota-faltante/);
console.log('PASS: 6/7/8 días, fecha explícita, con nota, descartes locales por cuenta/evaluación, más antigua, máximo tres y profesor/cerrado');
