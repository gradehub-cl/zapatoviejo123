// #1073: pautas propias, sin presetRamo(). Un único cálculo para promedio,
// avance, simulador, compuertas y vínculo; las cuentas completas no cambian.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.GRADEHUB_ROOT||__dirname+'/..';
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const ctx={console,setTimeout(){},clearTimeout(){},requestAnimationFrame(){},window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:el,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:'',search:''},history:{replaceState(){}},getComputedStyle:()=>({getPropertyValue:()=>''})};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),copy=structuredClone;
const cerca=(a,b)=>assert.ok(typeof a==='number'&&Math.abs(a-b)<1e-9,`esperaba ${b}; llegó ${a}`);
const n=(id,valor,slot)=>({id,nombre:id,valor,peso:1,...(slot===undefined?{}:{slot})});
const cat=(id,peso,notas=[],extra={})=>({id,nombre:id,peso,directNota:true,notas,...extra});
const curso=(id,categorias,extra={})=>({id,nombre:id,creditos:10,origen:null,gates:[],categorias,...extra});
function activar(ramos,tenant='uc'){ctx.ramos=ramos;run(`S={...freshState(),tenant:${JSON.stringify(tenant)},ramos};`);}
function base(lab=7){return curso('Sintético',[cat('I1',20,[n('i1',4)]),cat('I2',20),cat('Laboratorio',10,[n('l1',lab,0)],{slots:3}),cat('Examen',50)]);}
function llenar(r,v){const c=copy(r);for(const g of c.categorias){const slots=g.slots||1;for(let i=0;i<slots;i++)if(!g.notas.some(n=>g.slots?n.slot===i&&Number.isFinite(n.valor):Number.isFinite(n.valor)))g.notas.push(n(g.id+'-p'+i,v,g.slots?i:undefined));}return c;}
function comprobarMeta(r){activar([r]);const v=ctx.notaNecesaria(r);if(v===null||v>7)return;const completo=llenar(r,v+.0000001);activar([completo]);assert.ok(ctx.notaFinalOficial(ctx.ramoAvg(completo))>=4);activar([r]);assert.match(ctx.simNotaNecesaria(r,4).texto,v<=1?/asegurado/:/necesitas/);}
let r=base();activar([r]);const antes=JSON.stringify(r);
cerca(ctx.ramoAvg(r),31/7);cerca(100-ctx.ramoProgress(r).pending,70/3);assert.equal(ctx.ramoProgress(r).pct,23);
cerca(ctx.estadoParaNotaNecesaria(r).pendiente,23/30);cerca(ctx.gpa([r]),ctx.ramoAvg(r));
cerca(run('seriePromedioNotas(S.ramos).at(-1).valor'),ctx.gpa([r]));
cerca(run('simState={};simAusencias={};ramoAvg(simProjectedRamo(S.ramos[0]))'),ctx.ramoAvg(r));
assert.equal(JSON.stringify(r),antes);comprobarMeta(r);
r=base(1);activar([r]);cerca(ctx.ramoAvg(r),25/7);
const directa=curso('Sin casillas',[cat('Prueba',20,[n('p',5)]),cat('Examen',80)]);activar([directa]);cerca(ctx.ramoAvg(directa),5);assert.equal(ctx.ramoProgress(directa).pct,20);
r=base();r.categorias.find(c=>c.id==='Laboratorio').slots=4;r.categorias.find(c=>c.id==='Laboratorio').pesosCasillas=[3,1,1,1];activar([r]);cerca(ctx.ramoAvg(r),4.6);cerca(100-ctx.ramoProgress(r).pending,25);comprobarMeta(r);
r=curso('Descarte',[cat('Trabajo',70,[n('t',6)]),cat('Controles',30,[n('c0',1,0),n('c1',5,1)],{slots:3,dropLowest:{count:1}})]);activar([r]);cerca(ctx.ramoAvg(r),16/3);assert.equal(ctx.calculoRamoConCompuertas(r).res.drops.length,0);cerca(ctx.ramoProgress(r).pct,90);comprobarMeta(r);
r.categorias.find(c=>c.id==='Controles').notas.push(n('c2',3,2));activar([r]);cerca(ctx.ramoAvg(r),5.4);assert.equal(ctx.ramoProgress(r).pct,100);assert.equal(ctx.calculoRamoConCompuertas(r).res.drops[0].dropped[0].id,'c0');
const abierta=copy(r);delete abierta.categorias.find(c=>c.id==='Controles').slots;abierta.categorias.find(c=>c.id==='Controles').notas.pop();activar([abierta]);cerca(ctx.ramoAvg(abierta),5.7);assert.equal(ctx.ramoProgress(abierta).pct,100);
const topado=base(2);topado.gates=[{type:'min_grade_required',catId:'Laboratorio',min:4,cap:2.5}];activar([topado]);cerca(ctx.ramoAvg(topado),2.5);assert.ok(ctx.gatesActivas(topado).some(g=>g.cap===2.5));comprobarMeta(topado);
// Reglamento implícito y reglas del editor: el menor tope sigue mandando.
for(const [cap,esperado] of [[3.9,2.9],[2.5,2.5]]){const udd=curso('UDD sintético',[cat('Pruebas',60,[n('p',6,0)],{slots:3}),cat('Examen',40,[n('e',2.9)])],{gates:[{type:'min_grade_required',catId:'Pruebas',min:6.5,cap,origen:'editor'}]});activar([udd],'udd');cerca(ctx.ramoAvg(udd),esperado);assert.ok(ctx.notaNecesaria(udd)>7);assert.match(ctx.simNotaNecesaria(udd,4).texto,/no alcanzas/);}
// Vínculo: el 30% externo con una de tres notas solo aporta un 10% conocido.
const lab=curso('Laboratorio vinculado',[cat('Informes',100,[n('l',3,0)],{slots:3})],{creditos:0});
const main=curso('Cátedra',[cat('Prueba',100,[n('p',6)])],{aporta:{ramo:lab.nombre,peso:30}});activar([main,lab]);cerca(ctx.ramoAvg(main),5.625);assert.equal(ctx.ramoProgress(main).pct,80);
main.aporta.min=4;cerca(ctx.ramoAvg(main),3);delete main.aporta.min;
lab.categorias[0].notas.push(n('l1',3,1),n('l2',3,2));activar([main,lab]);assert.equal(ctx.ramoAvg(main),6*.7+3*.3);assert.equal(ctx.ramoProgress(main).pct,100);
// Completas: identidad exacta, incluso con pesos desiguales, descartes y topes.
for(let i=0;i<25;i++){
 const completa=llenar(base(1+i%7),1+i%7);completa.categorias.find(c=>c.id==='Laboratorio').pesosCasillas=[1.5,1,2];if(i%2)completa.categorias.find(c=>c.id==='Laboratorio').dropLowest={count:1};
 activar([completa]);const tree=ctx.ramoToStructure(completa),legacy=copy(tree);legacy.children.forEach(c=>delete c.partial_weight);
 assert.equal(ctx.calculateFinalGrade(tree,ctx.gradesOf(completa)).raw,ctx.calculateFinalGrade(legacy,ctx.gradesOf(completa)).raw);assert.equal(ctx.ramoProgress(completa).pct,100);
}
// #1080: una fuente con casillas incompletas no recibe mejoras ni exime antes.
const regla={evaluacion:'Examen',segun:['Primera','Segunda','Tercera'],min:5.95,promedio:'simple',maxInasistencias:6,notaExamen:'maxima',ignoraDescartes:true,requiereConfirmacion:false};
const calc=require(root+'/engine.js').gh_crearCalculoRamo({normName:s=>s.toLowerCase(),copiarRecuperativo:()=>null,definicionPresetDelRamo:()=>({eximicion:regla}),tenant:()=> 'uc',ramos:()=>[]});
const beneficios=curso('Beneficios',[cat('Primera',20,[n('a',6,0)],{slots:3}),cat('Segunda',20,[n('b',6)]),cat('Tercera',30,[n('c',6)]),cat('Examen',30)],{faltas:{activo:true,cantidad:6},bonus:[{id:'texto',entrada:'confirmacion',destino:'grupo',catIds:['Primera','Segunda','Tercera'],operacion:'promediar',valor:7,etapa:'previa'},{id:'talleres',entrada:'decimas',destino:'grupo',catIds:['Primera','Segunda','Tercera','Examen'],operacion:'sumar',etapa:'final'}],bonusConfirmado:{texto:true},bonusIngresado:{talleres:2}});
let b=calc.calculoRamoConCompuertas(beneficios);assert.equal(b.res.eximiciones[0].activa,false);assert.ok(b.res.mejoras.every(m=>m.pendiente));
const terminadas=copy(beneficios);terminadas.categorias.find(c=>c.id==='Primera').notas.push(n('a1',6,1),n('a2',6,2));b=calc.calculoRamoConCompuertas(terminadas);assert.equal(b.res.eximiciones[0].activa,true);assert.equal(b.res.emptyLeaves.length,0);assert.equal(b.res.coverage,1);cerca(calc.ramoAvg(terminadas),6.34);assert.equal(calc.notaNecesaria(terminadas),null);
console.log('OK #1073: casillas, pesos, descarte al completar, topes, vínculo, metas, simulación, evolución y beneficios #1080; pauta propia intacta');
