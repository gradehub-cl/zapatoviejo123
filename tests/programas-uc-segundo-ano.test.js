// Transcripción de tres programas históricos entregados por Lucas. Las
// pruebas del mecanismo usan pautas sintéticas escritas aquí, no el catálogo.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const raiz=__dirname+'/../',ids=new Map();
const elemento=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return null},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>{if(!ids.has(id))ids.set(id,elemento());return ids.get(id)},createElement:elemento,addEventListener(){},documentElement:elemento(),body:elemento(),querySelector(){return null},querySelectorAll(){return []}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
const cerca=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
const fecha=new Date('2026-10-28T12:00:00Z');
const esperadas={
 'Introducción a la Economía':{sigla:'ICS1513',periodo:'2025-1',pesos:[20,20,30,15,15],fechas:['2025-04-26','2025-06-06','2025-07-10']},
 'Termodinámica':{sigla:'FIS1523',periodo:'2025-1',pesos:[30,30,40],fechas:['2025-04-07','2025-05-19','2025-06-30']},
 'Electricidad y Magnetismo':{sigla:'FIS1533',periodo:'2026-1',pesos:[30,30,30,10],fechas:['2026-04-17','2026-06-05','2026-07-02']},
};
const defs=run('PRESETS_UC'),registro=JSON.parse(fs.readFileSync(raiz+'docs/programas-uc-2026.json','utf8'));
for(const [nombre,e] of Object.entries(esperadas)){
 const def=defs[nombre],p=ctx.presetRamo(nombre,'uc','ING-PC',fecha);
 assert.ok(p,nombre+' debe ofrecer pauta');assert.equal(def.sigla,e.sigla);
 assert.equal(p.periodo,e.periodo);assert.equal(p.estadoPeriodo,'vencido');
 assert.deepEqual(plain(p.categorias.map(c=>c.peso)),e.pesos);
 assert.ok(p.categorias.every(c=>!c.fecha&&!c.notas.length),'no precarga fechas históricas ni notas');
 assert.deepEqual(plain(def.evals.filter(e=>e[2]?.fecha).map(e=>e[2].fecha)),e.fechas);
 const fuente=registro.programas.find(x=>x.nombre_catalogo===nombre);
 assert.equal(fuente.periodo,e.periodo);assert.equal(fuente.sigla,e.sigla);
 assert.deepEqual(plain(def.evals),fuente.evaluaciones);
 assert.ok(def.reglasDelCurso[0].includes(e.periodo));
 const r={id:'existente',nombre,sigla:e.sigla,origen:{tenant:'uc',carrera:'ING-PC',ramoKey:e.sigla},categorias:[{id:'propia',nombre:'Mi evaluación',peso:100,directNota:true,notas:[{id:'guardada',nombre:'Mi nota',valor:5.8,peso:1,fecha:'2026-11-12',fechaOrigen:'usuario'}]}],gates:[]};
 const antes=JSON.stringify(r.categorias),cargado=ctx.normalize({tenant:'uc',carrera:'ING-PC',ramos:[r]}).ramos[0];
 assert.equal(cargado.categorias.length,1);assert.equal(cargado.categorias[0].id,'propia');
 assert.equal(cargado.categorias[0].peso,100);assert.equal(cargado.categorias[0].notas[0].valor,5.8);
 assert.equal(cargado.categorias[0].notas[0].id,'guardada');assert.equal(cargado.categorias[0].notas[0].fecha,'2026-11-12');
 assert.equal(cargado.aporta,null,'no enlaza un laboratorio a una pauta personalizada al cargar');
 assert.ok(cargado.reemplazosOptativos==null,'no aplica el reemplazo a una pauta personalizada');
 cerca(ctx.ramoAvg(cargado),5.8);assert.equal(JSON.stringify(r.categorias),antes,'tampoco muta el objeto original');
 const info=ctx.infoPeriodoPauta(cargado);assert.equal(info.periodo,e.periodo);assert.equal(info.estadoPeriodo,'vencido');
 // Tener los mismos nombres/pesos tampoco autoriza sumar reglas históricas
 // a una pauta que ya existía, con sus notas o promedios consolidados.
 const coincidente={id:'misma-forma',nombre,sigla:e.sigla,origen:{tenant:'uc',carrera:'ING-PC',ramoKey:e.sigla},categorias:def.evals.map(([nombre,peso],i)=>({id:'c'+i,nombre,peso,directNota:true,notas:[{id:'n'+i,nombre,valor:4+i*.2,peso:1}]})),gates:[]};
 const firma=cats=>plain(cats.map(c=>({id:c.id,peso:c.peso,notas:c.notas.map(({id,nombre,valor,peso})=>({id,nombre,valor,peso}))})));
 const promedioAntes=ctx.ramoAvg(coincidente),previa=firma(coincidente.categorias);
 const misma=ctx.normalize({tenant:'uc',carrera:'ING-PC',ramos:[coincidente]}).ramos[0];
 cerca(ctx.ramoAvg(misma),promedioAntes);
 assert.deepEqual(firma(misma.categorias),previa);
 assert.ok(misma.reemplazosOptativos==null&&misma.reglasAusenciaJustificada==null);
 assert.ok(misma.categorias.every(c=>!c.dropLowest),'no añade descartes a una pauta anterior');
 const vacio=ctx.normalize({tenant:'uc',carrera:'ING-PC',ramos:[{id:'vacio',nombre,sigla:e.sigla,origen:{tenant:'uc',carrera:'ING-PC',ramoKey:e.sigla},categorias:[],gates:[]}]}).ramos[0];
 assert.deepEqual(plain(vacio.categorias.map(c=>c.peso)),e.pesos,'ramo del catálogo sin evaluaciones recibe la pauta');
 assert.ok(vacio.categorias.every(c=>!c.fecha&&!c.notas.length));
 if(def.aporta)assert.deepEqual(plain(vacio.aporta),plain(def.aporta));
}
assert.equal(defs['Introducción a la Economía'].evals.find(e=>e[0]==='Controles')[2].slots,undefined,'no inventa cantidad de controles');
assert.equal(defs['Introducción a la Economía'].evals.find(e=>e[0]==='Proyecto escrito')[2],undefined,'no reparte el proyecto sin fuente');
assert.equal(defs['Electricidad y Magnetismo'].evals.find(e=>e[0]==='Controles')[2].slots,3);
assert.equal(defs['Electricidad y Magnetismo'].evals.find(e=>e[0]==='Controles')[2].dropLowest,undefined,'no elimina el peor sin justificación');
for(const nombre of ['Termodinámica','Electricidad y Magnetismo']){
 const fuente=registro.programas.find(x=>x.nombre_catalogo===nombre);
 assert.deepEqual(plain(defs[nombre].aporta),fuente.aporte_laboratorio);
 assert.ok(fuente.faltantes_y_ambiguedades.some(x=>x.includes('Lucas decidió el 2026-10-28')));
 assert.ok(defs[nombre].noCalcula.some(x=>x.includes('justificada')));
}
assert.equal(defs['Laboratorio de Termodinámica'],undefined,'sin programa no inventa su pauta interna');
assert.equal(defs['Laboratorio de Electricidad y Magnetismo'],undefined);
assert.equal(defs['Ecuaciones Diferenciales'],undefined,'el audio no crea una pauta oficial');
assert.equal(defs['Probabilidades y Estadística'],undefined);
assert.equal(defs['Cálculo III'].evals[0][0],'Evaluaciones sumativas','no reemplaza una pauta existente con un recuerdo');
console.log('OK tres pautas históricas: fuente, períodos, fechas retenidas y cuentas existentes');

// Mecanismo: 70/30 y mínimo, con datos sintéticos y sin leer los presets.
function cat(nombre,peso,valores,extra={}){return {id:nombre,nombre,peso,directNota:true,notas:valores.map((valor,slot)=>({id:nombre+'-'+slot,nombre,valor,slot,peso:1})),...extra};}
function vinculo(notaCatedra,notaLab){
 const r={id:'fisica',nombre:'Física sintética',categorias:[cat('I1',30,[notaCatedra]),cat('I2',30,[notaCatedra]),cat('Examen',40,[notaCatedra])],gates:[],aporta:{ramo:'Laboratorio sintético',peso:30,min:4}};
 const lab={id:'lab',nombre:'Laboratorio sintético',categorias:[cat('Nota laboratorio',100,[notaLab])],gates:[]};
 ctx.fixture=[r,lab];run("S.tenant='uc';S.ramos=fixture");return r;
}
cerca(ctx.ramoAvg(vinculo(5,6)),5.3);
cerca(ctx.ramoAvg(vinculo(3,7)),3);
cerca(ctx.ramoAvg(vinculo(6,3)),3);
cerca(ctx.ramoAvg(vinculo(4,5)),4.3);
cerca(ctx.ramoAvg(vinculo(5,4)),4.7);
cerca(ctx.ramoAvg(vinculo(4,4)),4);
const pendiente=vinculo(5,6);pendiente.categorias.find(c=>c.nombre==='Examen').notas=[];
const necesaria=ctx.notaNecesariaParaAprobar(pendiente).valor;
assert.ok(necesaria>1&&necesaria<=7);
pendiente.categorias.find(c=>c.nombre==='Examen').notas=[{id:'proyectada',valor:Math.ceil((necesaria-1e-9)*10)/10,peso:1}];
assert.ok(ctx.notaFinalOficial(ctx.ramoAvg(pendiente))>=4,'el consejo alcanza también con el vínculo');
console.log('OK 70/30, ambas partes reprobatorias y 4,0 aprobado por decisión de Lucas');

// Mecanismo: controles abiertos con tres descartes, sin inventar su cantidad.
const intro={id:'intro-sintetica',nombre:'Economía sintética',categorias:[cat('I1',20,[2]),cat('I2',20,[3]),cat('Examen',30,[6]),cat('Controles',15,[1,2,3,4,6],{directNota:false,dropLowest:{count:3}}),cat('Proyecto',15,[5])],gates:[]};
ctx.intro=intro;run('S.ramos=[intro]');const guardado=JSON.stringify(intro);
cerca(ctx.ramoAvg(intro),4.3);
const calculo=ctx.calculoRamoConCompuertas(intro);
cerca(calculo.res.breakdown.find(b=>b.id==='Controles').value,5);
assert.equal(calculo.res.drops[0].dropped.length,3);
assert.equal(JSON.stringify(intro),guardado,'los descartes no escriben sobre las notas');
assert.equal(defs['Introducción a la Economía'].reemplazosOptativos,undefined);
assert.ok(defs['Introducción a la Economía'].noCalcula.some(x=>/una sola interrogación/.test(x)));
console.log('OK tres controles descartados sin mutar notas; traspaso de interrogación advertido');
