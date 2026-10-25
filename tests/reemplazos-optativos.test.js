// #628: pautas sintéticas para el mecanismo. El catálogo solo se recorre en la
// regresión final; no aporta los datos de los ejemplos del motor.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return stub;},querySelectorAll(){return [];},dataset:{}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:stub,querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(['data.js','engine.js','app.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n'),ctx);
const run=s=>vm.runInContext(s,ctx);
let ok=0,fail=0;
const chk=(n,c)=>{console.log('  '+(c?'OK  ':'FAIL')+' '+n);if(c)ok++;else fail++;};
const cerca=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<1e-8;
const promedio=r=>{ctx.__ramo=r;return run('ramoAvg(__ramo)');};
const calculo=r=>{ctx.__ramo=r;return run('calculoRamoConCompuertas(__ramo)');};
const cat=(id,peso,valores,extra={})=>({id,nombre:id,peso,notas:valores.map((v,i)=>({id:id+'-'+i,nombre:id+' '+i,valor:v,slot:i,peso:1})),
  ...(valores.length>1?{slots:valores.length}:{}),...extra});
const fixture=(cats,reglas,gates=[])=>({id:'sintetico',nombre:'Ramo sintético',categorias:cats,gates,reemplazosOptativos:reglas});
const sinRegla=r=>({...r,reemplazosOptativos:null});

console.log('=== Mezcla optativa: solo si mejora ===');
const mezcla=(i2,control)=>fixture([cat('I1',20,[5]),cat('I2',28,[i2]),cat('Examen',32,[5]),cat('Tareas',20,[5]),cat('Optativo',0,control==null?[]:[control],{optativa:true})],
  [{tipo:'mezcla',fuenteId:'Optativo',destinosIds:['I2'],rendidasIds:[],fraccion:0.3}]);
chk('sin control optativo, no cambia',cerca(promedio(mezcla(3,null)),promedio(sinRegla(mezcla(3,null)))));
chk('control 7 mezcla 70/30 con I2 de 3',cerca(promedio(mezcla(3,7)),4.776));
chk('control menor no reemplaza',cerca(promedio(mezcla(5,2)),promedio(sinRegla(mezcla(5,2)))));
ctx.__ramo=mezcla(3,7);
chk('la ficha explica cuál nota mejoró sin borrar la ingresada',
  run('reglasCalculadas(__ramo)').some(x=>/Optativo mejora I2.*sin cambiar la nota/.test(x)));
chk('el 0% optativo vacío no impide cerrar el ramo',run('ramoCompletamenteEvaluado(__ramo)')===true);
const faltaI2=mezcla(3,7);faltaI2.categorias[1].notas=[{id:'I2-0',nombre:'I2',valor:null,slot:0,peso:1}];
ctx.__ramo=faltaI2;
const metaConOptativo=run('notaNecesaria(__ramo,5)');
ctx.__ramo=sinRegla(faltaI2);
const metaSinOptativo=run('notaNecesaria(__ramo,5)');
chk(`¿qué necesito? proyecta también el control optativo (${metaConOptativo}/${metaSinOptativo})`,
  metaConOptativo>3.88&&metaConOptativo<3.90&&metaSinOptativo>4.81&&metaSinOptativo<4.83);
faltaI2.categorias[1].notas=[];
ctx.__ramo=faltaI2;
chk('también resuelve una evaluación directa aún sin casilla creada',
  run('notaNecesaria(__ramo,5)')>3.88&&run('notaNecesaria(__ramo,5)')<3.90);

console.log('\n=== Una sola nota: se elige la que realmente mejora ===');
const transporte=(examen)=>fixture([cat('Controles',45,[1,2,3,4,5],{dropLowest:{count:1}}),cat('Memes',20,[4]),cat('Examen',35,[examen])],
  [{tipo:'reemplazo',fuenteId:'Examen',destinosIds:['Controles'],rendidasIds:[]}]);
const t=transporte(6),baseT=promedio(sinRegla(t));
chk('con descarte, reemplaza el segundo peor y no el que se descarta',cerca(baseT,4.475)&&cerca(promedio(t),4.925));
chk('la nota original sigue guardada',t.categorias[0].notas[1].valor===2);
chk('si el examen no mejora, no reemplaza',cerca(promedio(transporte(2)),promedio(sinRegla(transporte(2)))));
const recuperativo=fixture([cat('Controles',30,[2,3]),cat('Solemne',30,[4]),
  cat('Examen',40,[5]),cat('Recuperativo',0,[6],{optativa:true})],
  [{tipo:'reemplazo',fuenteId:'Recuperativo',destinosIds:['Controles','Solemne'],rendidasIds:[],cantidad:'todas'}]);
chk('una fuente recuperativa puede mejorar varias notas sin guardar sustituciones',
  cerca(promedio(recuperativo),5.6)&&recuperativo.categorias[0].notas[0].valor===2&&
  calculo(recuperativo).reemplazosOptativosAplicados.length===3);

console.log('\n=== Condiciones previas y compuertas ===');
const uai=(p1,p2,ex)=>fixture([cat('P1',25,p1==null?[]:[p1]),cat('P2',25,p2==null?[]:[p2]),cat('Examen',30,[ex]),cat('Otros',20,[4])],
  [{tipo:'reemplazo',fuenteId:'Examen',destinosIds:['P1','P2'],rendidasIds:['P1','P2'],minFuente:4.8}]);
chk('UAI: examen 4,7 no habilita el reemplazo',cerca(promedio(uai(2,5,4.7)),promedio(sinRegla(uai(2,5,4.7)))));
chk('UAI: falta una prueba, no reemplaza',cerca(promedio(uai(2,null,6)),promedio(sinRegla(uai(2,null,6)))));
chk('UAI: con ambas y examen 6 mejora solo una prueba',cerca(promedio(uai(2,5,6)),5.35));
const matematicas=fixture([cat('Pruebas',49,[2,4,5]),cat('Controles',21,[4,4,4]),cat('Examen',30,[6])],
  [{tipo:'reemplazo',fuenteId:'Examen',destinosIds:['Pruebas'],rendidasIds:['Pruebas','Controles'],minFuente:4}]);
chk('UAI: reemplaza una sola casilla de las tres pruebas',cerca(promedio(matematicas),5.09));
matematicas.categorias[1].notas.pop();
chk('UAI: sin todos los controles, queda igual',cerca(promedio(matematicas),promedio(sinRegla(matematicas))));
matematicas.reglasAusenciaJustificada={reemplazosCasilla:[{desdeId:'Controles',desdeSlot:2,haciaId:'Examen'}]};
matematicas.ausenciasJustificadas=['__gh_ausencia_Controles_2'];
chk('una nota derivada por inasistencia no cuenta como control rendido',
  cerca(promedio(matematicas),promedio(sinRegla(matematicas))));
const topado=fixture([cat('Pruebas',50,[2]),cat('Examen',50,[6])],
  [{tipo:'reemplazo',fuenteId:'Examen',destinosIds:['Pruebas'],rendidasIds:[]}],
  [{type:'min_grade_required',catId:'Pruebas',min:3,cap:3.9}]);
chk('la compuerta ve la nota reemplazada cuando corresponde',cerca(promedio(topado),6));
const noMejoraPorTope=fixture([cat('Pruebas',50,[2]),cat('Examen',50,[2.9])],
  [{tipo:'reemplazo',fuenteId:'Examen',destinosIds:['Pruebas'],rendidasIds:[]}],
  [{type:'min_grade_required',catId:'Examen',min:3,cap:2}]);
chk('un tope que impide mejorar deja la nota original',cerca(promedio(noMejoraPorTope),2)&&calculo(noMejoraPorTope).notas['Pruebas-0']===2);

console.log('\n=== Declaraciones del catálogo y cuentas anteriores ===');
const opt=run("PRESETS_UC['Métodos de Optimización']"),tra=run("PRESETS_UC['Ingeniería de Sistemas de Transporte']");
const micro=run("PRESETS_UAI['Introducción a la Microeconomía']"),ma=run("PRESETS_UAI['Matemáticas Avanzadas II']");
const pausados=[run("PRESETS_UC['Econometría Aplicada']"),run("PRESETS_UC['Revelación y Fe']")];
chk('UC declara optativo y transporte; sale solo esa deuda de noCalcula',!!opt.reemplazosOptativos&&!!tra.reemplazosOptativos&&
  !(opt.noCalcula||[]).some(x=>/Control optativo/.test(x))&&!(tra.noCalcula||[]).some(x=>/reemplazar la nota de un Control/.test(x)));
chk('UAI declara micro y matemática con umbral y notas rendidas',micro.reemplazosOptativos?.[0].minFuente===4.8&&ma.reemplazosOptativos?.[0].minFuente===4&&
  !(micro.noCalcula||[]).some(x=>/examen de al menos 4,8/.test(x))&&!(ma.noCalcula||[]).some(x=>/UNA prueba/.test(x)));
chk('Econometría y Revelación y Fe permanecen en pausa',pausados.every(d=>!d.reemplazosOptativos&&d.noCalcula?.some(x=>/reemplaz/.test(x))));
chk('FEN conserva la propuesta sin tocar el preset',!run("PRESETS_FEN['Programación para Analítica de Datos'].reemplazosOptativos")&&
  run("PRESETS_FEN['Programación para Analítica de Datos'].noCalcula").some(x=>/recuperativo puede reemplazar/.test(x)));
const presetOpt=run("presetRamo('Métodos de Optimización','uc','ING-PC')");
chk('el control opcional es una evaluación ingresable de 0%, sin inventar peso',
  presetOpt.categorias.some(c=>c.nombre==='Control optativo'&&c.peso===0&&c.optativa===true));
const previo=run("presetRamo('Introducción a la Microeconomía','uai','COM-UAI')");
const existente={id:'viejo',nombre:'Introducción a la Microeconomía',origen:{tenant:'uai',carrera:'COM-UAI'},
  categorias:previo.categorias,gates:previo.gates,pautaHuella:run('huellaPauta') (previo.categorias)};
// La cuenta previa no traía el campo: la regla se resuelve con los ids de sus categorías.
ctx.__existente=existente;
const actualizado=run('normalize({tenant:"uai",ramos:[__existente]}).ramos[0]');
chk('una cuenta existente conserva categorías y recibe solo la regla compatible',
  actualizado.categorias[0].id===existente.categorias[0].id&&
  actualizado.reemplazosOptativos?.[0].destinosIds.includes(existente.categorias[1].id));
const metodosAnterior={id:'viejo-uc',nombre:'Métodos de Optimización',origen:{tenant:'uc',carrera:'ING-PC'},
  categorias:presetOpt.categorias.filter(c=>c.nombre!=='Control optativo'),gates:presetOpt.gates};
metodosAnterior.categorias[1].notas=[{id:'i2-guardada',nombre:'Interrogación 2',valor:4.2}];
metodosAnterior.pautaHuella=run('huellaPauta')(metodosAnterior.categorias);
ctx.__metodosAnterior=metodosAnterior;
const pendiente=run('cambioDePauta(__metodosAnterior)');
chk('el curso UC anterior ofrece incorporar el control, sin tocar su nota',
  pendiente?.cambios.some(x=>x.tipo==='llega'&&x.nombre==='Control optativo')&&
  run('reglasNoCalculadas(__metodosAnterior)').some(x=>/reemplazo optativo.*actualizar/i.test(x))&&
  metodosAnterior.categorias[1].notas[0].valor===4.2);
ctx.__cambioMetodos=pendiente;
run('aplicarCambioDePauta(__metodosAnterior,__cambioMetodos)');
chk('al aceptar, conserva la nota y añade la regla y el campo optativo',
  metodosAnterior.categorias[1].notas[0].valor===4.2&&
  metodosAnterior.categorias.some(c=>c.nombre==='Control optativo'&&c.optativa===true)&&
  metodosAnterior.reemplazosOptativos?.length===1);

const carreras={fen:run('Object.keys(CARRERAS)'),uc:run('Object.keys(CARRERAS_UC)'),uai:run('Object.keys(CARRERAS_UAI)'),uandes:run('Object.keys(CARRERAS_UANDES)')};
let comparadas=0,distintas=[];
for(const [tenant,lista] of Object.entries(carreras))for(const carrera of lista){
  for(const nombre of run(`Object.keys(PRESETS_POR_TENANT[${JSON.stringify(tenant)}])`)){
    ctx.__tenant=tenant;ctx.__carrera=carrera;ctx.__nombre=nombre;
    const p=run('presetRamo(__nombre,__tenant,__carrera)');
    if(!p)continue;
    const r={id:'regresion',nombre,origen:{tenant,carrera},categorias:p.categorias,gates:p.gates||[],
      reemplazosOptativos:p.reemplazosOptativos,reglasAusenciaJustificada:p.reglasAusenciaJustificada,
      bonus:p.bonus,recuperativo:p.recuperativo};
    for(const c of r.categorias){
      if(c.optativa)continue; // No se cumple el requisito de haber rendido el control voluntario.
      const cantidad=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
      c.notas=Array.from({length:cantidad},(_,i)=>({id:`${c.id}-${i}`,nombre:c.nombre,valor:3.7,slot:i,peso:1}));
    }
    const antes=promedio(sinRegla(r)),despues=promedio(r);
    if(!(antes===despues||cerca(antes,despues)||antes===null&&despues===null))distintas.push(`${tenant}/${carrera}/${nombre}: ${antes} → ${despues}`);
    comparadas++;
  }
}
chk(`todas las pautas × carreras sin condición conservan promedio (${comparadas})`,comparadas>100&&distintas.length===0);
if(distintas.length)distintas.slice(0,10).forEach(x=>console.log('       '+x));
console.log(`\nPASS: ${ok}   FAIL: ${fail}`);if(fail)process.exit(1);
