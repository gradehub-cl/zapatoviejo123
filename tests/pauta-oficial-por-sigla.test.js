// #1090: el programa UC llega a otra carrera por la sigla GUARDADA en el ramo,
// nunca deducida del nombre. Misma sigla = mismo curso (#362). Datos sintéticos.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const raiz=__dirname+'/../',ids=new Map();
const elemento=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return null},dataset:{},children:[],innerHTML:'',textContent:'',value:''});
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>{if(!ids.has(id))ids.set(id,elemento());return ids.get(id)},createElement:elemento,addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},body:elemento(),head:elemento(),documentElement:elemento()},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hostname:'localhost',search:'',hash:''},setTimeout(){},clearTimeout(){},setInterval(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
const J=x=>JSON.stringify(x);
// Los ramos de abajo están fuera de toda malla cargada: se declaran coordinados
// para probar el consenso (la regla de coordinación tiene su propio test).
run("coordinacionRamo=()=>({coordinado:true,fuente:'malla'})");

const COLLEGE='UC-COLLEGE-CIENCIAS-NATURALES-Y-MATEMATICAS';
const OFICIAL=[['Interrogación 1',20],['Interrogación 2',20],['Interrogación 3',20],['Laboratorio',10],['Examen',30]];
const nombresPesos=r=>JSON.parse(JSON.stringify(r.categorias.filter(c=>!c.fueraDePauta).map(c=>[c.nombre,c.peso])));
const normalizar=(carrera,ramos)=>ctx.normalize({tenant:'uc',carrera,onboardingDone:true,ramos:JSON.parse(J(ramos))}).ramos;
const enCuenta=carrera=>run(`S.tenant='uc';S.carrera=${J(carrera)};S.ramos=[]`);

// ─── College + MAT1610 recibe el programa, con sus reglas, y no el consenso ───
enCuenta(COLLEGE);
assert.equal(ctx.findPresetName('Cálculo I','uc',COLLEGE),null,'por nombre solo, College sigue sin programa');
assert.equal(ctx.findPresetName('Cálculo I','uc',COLLEGE,'MAT1610'),'Cálculo I');
const nuevo=ctx.crearRamoDesdeCatalogo('Cálculo I','MAT1610');
assert.deepEqual(nombresPesos(nuevo),OFICIAL,'carga las ponderaciones del programa');
assert.equal(nuevo.sigla,'MAT1610');
assert.ok(nuevo.reglasAusenciaJustificada,'trae la regla de pruebas justificadas');
assert.equal(nuevo.consensoRespaldos,undefined,'no queda como pauta de estudiantes');
assert.ok(run('definicionPresetDelRamo')(nuevo)?.ausenciasJustificadas,'el motor ve ausenciasJustificadas');
// Un ramo vacío ya guardado (sin pauta todavía) se completa al cargar.
const [vacio]=normalizar(COLLEGE,[{id:'v1',nombre:'Cálculo I',sigla:'MAT1610',origen:{tenant:'uc',carrera:COLLEGE,ramoKey:'MAT1610'},categorias:[],gates:[]}]);
assert.deepEqual(nombresPesos(vacio),OFICIAL);
assert.ok(vacio.reglasAusenciaJustificada);
// El consenso no entra donde hay programa esperando.
const cons=[{ramo:'Cálculo I',ramo_key:'MAT1610',estructura:[{nombre:'I1',peso:25},{nombre:'I2',peso:25},{nombre:'Examen',peso:50}],huella:'x',respaldos:9,periodo:run('semester()'),seccion:null}];
const vacioSinCargar={id:'v2',nombre:'Cálculo I',sigla:'MAT1610',origen:{tenant:'uc',carrera:COLLEGE,ramoKey:'MAT1610'},categorias:[],gates:[]};
assert.equal(ctx.ponerConsensoEnRamo(vacioSinCargar,cons),false,'el programa manda sobre el consenso');
assert.equal(vacioSinCargar.consensoRespaldos,undefined);

// ─── ING-PC sigue igual ───
enCuenta('ING-PC');
assert.equal(ctx.findPresetName('Cálculo I','uc','ING-PC'),'Cálculo I');
assert.deepEqual(nombresPesos(ctx.presetRamo('Cálculo I','uc','ING-PC')),OFICIAL);
assert.deepEqual(nombresPesos(ctx.crearRamoDesdeCatalogo('Cálculo I','MAT1610')),OFICIAL);
assert.deepEqual(nombresPesos(ctx.crearRamoDesdeCatalogo('Cálculo I',null)),OFICIAL);

// ─── MAT1100 «Cálculo I» no hereda MAT1610 ───
enCuenta(COLLEGE);
assert.equal(ctx.findPresetName('Cálculo I','uc',COLLEGE,'MAT1100'),null);
assert.equal(ctx.presetRamo('Cálculo I','uc',COLLEGE,undefined,'MAT1100'),null);
const otro=ctx.crearRamoDesdeCatalogo('Cálculo I','MAT1100');
assert.equal(otro.categorias.length,0,'otra sigla es otro curso');
assert.equal(run('definicionPresetDelRamo')(otro),null);
const [otroGuardado]=normalizar(COLLEGE,[{id:'o1',nombre:'Cálculo I',sigla:'MAT1100',origen:{tenant:'uc',carrera:COLLEGE,ramoKey:'MAT1100'},categorias:[],gates:[]}]);
assert.equal(otroGuardado.categorias.length,0);
// Medicina tampoco recibe Cálculo I por nombre.
assert.equal(ctx.findPresetName('Cálculo I','uc','UC-MEDICINA'),null);

// ─── Sin sigla, igual que hoy ───
const sinSigla={id:'s1',nombre:'Cálculo I',origen:{tenant:'uc',carrera:COLLEGE,ramoKey:'calculo i'},categorias:[],gates:[]};
assert.equal(run('definicionPresetDelRamo')(sinSigla),null);
assert.equal(run('pautaPendiente')(sinSigla),null);
assert.equal(normalizar(COLLEGE,[sinSigla])[0].categorias.length,0);
assert.equal(ctx.crearRamoDesdeCatalogo('Cálculo I',null).categorias.length,0);

// ─── Programas no coordinados o por sección siguen solo en su carrera ───
for(const [nombre,sigla,seccion] of [['Revelación y Fe','TTF012',1],['Derecho Penal Parte General II','DER002P',5]]){
  for(const carrera of [COLLEGE,'COM']){
    assert.equal(ctx.findPresetName(nombre,'uc',carrera,sigla),null,`${sigla} en ${carrera}`);
    assert.equal(ctx.presetRamo(nombre,'uc',carrera,undefined,sigla),null);
    const r={id:'x',nombre,sigla,seccion,origen:{tenant:'uc',carrera,ramoKey:sigla},categorias:[],gates:[]};
    assert.equal(run('definicionPresetDelRamo')(r),null,`${sigla} no recibe reglas en ${carrera}`);
  }
}

// ─── Un ramo ya marcado con consenso: nada cambia hasta que acepta ───
const huella=run('huellaPauta')(OFICIAL.map(([nombre,peso])=>({nombre,peso})));
const conNotas=(nombre,peso,notas,slots)=>({id:'c-'+nombre,nombre,peso,directNota:true,ponderaNotas:false,...(slots?{slots}:{}),
  notas:notas.map((valor,i)=>({id:`n-${nombre}-${i}`,nombre:'n',valor,peso:1,...(slots?{slot:i}:{})}))});
// Como lo deja ponerConsensoEnRamo: el reporte trae las casillas del laboratorio.
const marcado={id:'m1',nombre:'Cálculo I',sigla:'MAT1610',color:'#000',origen:{tenant:'uc',carrera:COLLEGE,ramoKey:'MAT1610'},
  categorias:[conNotas('Interrogación 1',20,[5.2]),conNotas('Interrogación 2',20,[4.1]),conNotas('Interrogación 3',20,[]),conNotas('Laboratorio',10,[6.5],3),conNotas('Examen',30,[])],
  gates:[],pautaHuella:huella,consensoRespaldos:4,consensoAportado:'huella-sintetica'};
const notasDe=r=>JSON.parse(JSON.stringify(Object.fromEntries(r.categorias.map(c=>[c.nombre,c.notas.map(n=>n.valor)]))));
const [cargado]=normalizar(COLLEGE,[marcado]);
assert.equal(cargado.consensoRespaldos,4,'al cargar no se le borra la marca');
assert.equal(cargado.consensoAportado,'huella-sintetica');
assert.ok(!cargado.reglasAusenciaJustificada,'al cargar no se le injertan reglas del programa');
assert.equal(run('definicionPresetDelRamo')(cargado),null);
assert.deepEqual(notasDe(cargado),notasDe(marcado));
run('S.ramos=[]');run('S').ramos.push(cargado);
const promedioAntes=ctx.ramoAvg(cargado);
assert.equal(ctx.datosCierreRamo(cargado,[cargado],'2026-2').pauta_origen,'editada','pauta del consenso: no se cuenta como oficial');
const oferta=run('cambioDePauta')(cargado);
assert.ok(oferta,'se le ofrece el programa aunque los pesos coincidan');
assert.equal(oferta.notasFueraDePauta,false);
assert.ok(run('actualizarPauta')('m1'),'la persona acepta');
const aceptado=run('S').ramos[0];
assert.equal(aceptado.consensoRespaldos,undefined,'aceptar deja atrás la marca del consenso');
assert.equal(aceptado.consensoAportado,undefined);
assert.ok(aceptado.reglasAusenciaJustificada,'gana la regla de pruebas justificadas');
assert.deepEqual(notasDe(aceptado),notasDe(marcado),'las notas quedan intactas');
assert.equal(ctx.ramoAvg(aceptado),promedioAntes,'el promedio no se mueve');
assert.equal(run('cambioDePauta')(aceptado),null,'ya no se vuelve a ofrecer');

// ─── pauta_origen al cierre ───
assert.equal(ctx.datosCierreRamo(aceptado,[aceptado],'2026-2').pauta_origen,'oficial','tras aceptar, va como oficial');
const [oficialCollege]=normalizar(COLLEGE,[{id:'v3',nombre:'Cálculo I',sigla:'MAT1610',origen:{tenant:'uc',carrera:COLLEGE,ramoKey:'MAT1610'},categorias:[],gates:[]}]);
assert.equal(ctx.datosCierreRamo(oficialCollege,[oficialCollege],'2026-2').pauta_origen,'oficial','College con el programa intacto deja de ser editada');
oficialCollege.categorias.find(c=>c.nombre==='Examen').peso=40;
assert.equal(ctx.datosCierreRamo(oficialCollege,[oficialCollege],'2026-2').pauta_origen,'editada','si la edita, sigue siendo editada');
const manualSinSigla={id:'s2',nombre:'Cálculo I',origen:{tenant:'uc',carrera:COLLEGE,ramoKey:'calculo i'},categorias:OFICIAL.map(([nombre,peso])=>conNotas(nombre,peso,[])),gates:[],pautaHuella:huella};
assert.equal(ctx.datosCierreRamo(manualSinSigla,[manualSinSigla],'2026-2').pauta_origen,'editada','sin sigla, igual que hoy');

console.log('OK pauta oficial por sigla (#1090)');
