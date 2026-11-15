// Décimas y bonus que ingresa el estudiante (#631). El mecanismo se prueba con
// pautas escritas acá, no sacadas del catálogo; al final, que los dos presets
// que lo usan lo declaren (buscados por nombre) y ya no lo lleven en noCalcula.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const cerca=(a,b)=>typeof a==='number'&&Math.abs(a-b)<1e-9;

const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;},toggle(){}},value:'',innerHTML:'',textContent:'',focus(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelectorAll(){return [];},querySelector(){return stub;},dataset:{}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:stub,querySelector:()=>stub,querySelectorAll:()=>[],body:stub},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);
vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
const run=c=>vm.runInContext(c,ctx);
ctx.__def=null;
const con=(r)=>{ctx.__r=r;return r;};

// Tres pruebas 25/40/35 y la regla de Principios Ecológicos, escrita acá.
const pruebas=(p1,p2,p3,decimas,extra={})=>({id:'pe',nombre:'Ramo de prueba',gates:extra.gates||[],categorias:[
  {id:'p1',nombre:'Prueba 1',peso:25,notas:p1==null?[]:[{id:'n1',nombre:'Prueba 1',valor:p1}]},
  {id:'p2',nombre:'Prueba 2',peso:40,notas:p2==null?[]:[{id:'n2',nombre:'Prueba 2',valor:p2}]},
  {id:'p3',nombre:'Prueba 3',peso:35,notas:p3==null?[]:[{id:'n3',nombre:'Prueba 3',valor:p3}]}],
  bonus:[{id:'talleres',pregunta:'Décimas de talleres',entrada:'decimas',max:5,destino:'final',si:{catIds:['p1','p2','p3'],mayorQue:4.0}}],
  bonusIngresado:decimas==null?null:{talleres:decimas}});
const prom=r=>{ctx.__r=r;return run('ramoAvg(__r)');};

console.log('=== Décimas a la nota final, con condición ===');
chk('sin décimas anotadas, el promedio es el de siempre (5/4/4 → 4,25)',cerca(prom(pruebas(5,4,4,null)),4.25));
chk('anotar 0 tampoco cambia nada',cerca(prom(pruebas(5,4,4,0)),4.25));
chk('3 décimas con promedio de Pruebas 4,25 → 4,55',cerca(prom(pruebas(5,4,4,3)),4.55));
chk('con promedio de Pruebas en 4,0 justo no suman: tiene que SUPERAR 4,0',cerca(prom(pruebas(4,4,4,3)),4.0));
chk('el tope de 5 décimas manda aunque se anoten más',cerca(prom(pruebas(5,4,4,8)),4.75));
chk('nunca pasa de 7,0',cerca(prom(pruebas(7,7,7,5)),7.0));
chk('con una prueba pendiente, la condición mira las que tienen nota',cerca(prom(pruebas(5,4,null,3)),(1.25+1.6)/0.65+0.3));
chk('una compuerta topa la nota DESPUÉS de las décimas',
  cerca(prom(pruebas(7,7,2.5,5,{gates:[{type:'min_grade_required',catId:'p3',min:3.0,cap:3.9}]})),3.9));

console.log('\n=== Bonus a una categoría por faltas (Dinámica) ===');
const conControles=(controles,faltas,examen=null)=>({id:'di',nombre:'Ramo con controles',gates:[],categorias:[
  {id:'c',nombre:'Controles',peso:50,slots:3,notas:controles.map((v,i)=>({id:'k'+i,nombre:'Controles',valor:v,slot:i}))},
  {id:'e',nombre:'Examen',peso:50,notas:examen==null?[]:[{id:'x',nombre:'Examen',valor:examen}]}],
  bonus:[{id:'talleres',pregunta:'Talleres a los que has faltado',entrada:'faltas',hasta:2,suma:0.5,destino:'c'}],
  bonusIngresado:faltas==null?null:{talleres:faltas}});
const valorCat=(r,id)=>{ctx.__r=r;return run(`calculoRamoConCompuertas(__r).res.breakdown.find(n=>n.id===${JSON.stringify(id)}).value`);};
chk('sin anotar faltas, nadie recibe las 5 décimas por omisión',cerca(valorCat(conControles([4,4,4],null,4),'c'),4.0));
chk('con 2 faltas, Controles 4,0 → 4,5',cerca(valorCat(conControles([4,4,4],2,4),'c'),4.5));
chk('y la final sube lo que pesa Controles (50% de 0,5)',cerca(prom(conControles([4,4,4],2,4)),4.25));
chk('con 3 faltas ya no',cerca(valorCat(conControles([4,4,4],3,4),'c'),4.0));
chk('el promedio de Controles no pasa de 7,0',cerca(valorCat(conControles([6.8,6.8,6.8],0,4),'c'),7.0));

console.log('\n=== "¿Qué nota necesito?" cuenta las décimas ===');
const necesita=r=>{ctx.__r=r;return run('notaNecesaria(__r,4)');};
// Controles 4,0 (50%) y Examen pendiente (50%). Sin bonus: 3,9. Con +0,5 en Controles: 3,4.
chk('sin bonus necesita 3,9 en el examen',cerca(Math.round(necesita(conControles([4,4,4],null))*1000)/1000,3.9));
chk('con las 5 décimas en Controles necesita 3,4',cerca(Math.round(necesita(conControles([4,4,4],0))*1000)/1000,3.4));
// Principios: P1 5, P2 4, P3 pendiente, 5 décimas. Para 5,0: sin décimas haría
// falta ~7,6; con ellas basta que (1,25+1,6+0,35x)/1 + 0,5 llegue a 4,95 → x ≥ 5,57.
const n5=r=>{ctx.__r=r;return run('notaNecesaria(__r,5)');};
chk('con décimas a la final, la meta de 5,0 pide 5,57 y no 7,0',Math.abs(n5(pruebas(5,4,null,5))-((4.45-2.85)/0.35))<0.01);
chk('y sin décimas, sigue pidiendo lo de siempre',Math.abs(n5(pruebas(5,4,null,null))-((4.95-2.85)/0.35))<0.01);

console.log('\n=== Lo que se guarda ===');
chk('lo ingresado se limpia: enteros de 0 a 60, ids simples',
  JSON.stringify(run(`copiarBonusIngresado({talleres:3,raro:-1,mal:2.5,'<x>':1,grande:61})`))==='{"talleres":3}');
chk('una cuenta sin el campo queda en null',run('normalize({ramos:[{id:"a",nombre:"X",categorias:[]}]}).ramos[0].bonusIngresado')===null);
chk('y se conserva al cargar',run('normalize({ramos:[{id:"a",nombre:"X",categorias:[],bonusIngresado:{talleres:2}}]}).ramos[0].bonusIngresado.talleres')===2);
// La regla se resuelve contra las categorías del ramo, por nombre.
ctx.__def={evals:[['Prueba 1',50],['Prueba 2',50]],bonus:[{id:'talleres',entrada:'decimas',max:5,a:'final',si:{evals:['Prueba 1','Prueba 2'],mayorQue:4},ayuda:'x'}]};
const cats=[{id:'a',nombre:'Prueba 1'},{id:'b',nombre:'prueba 2'}];
chk('la regla nombra evaluaciones y se resuelve a sus ids',JSON.stringify(run(`resolverBonus(__def,${JSON.stringify(cats)})[0].si.catIds`))==='["a","b"]');
chk('si la pauta se editó y falta una evaluación, la regla no se carga',run(`resolverBonus(__def,[{id:'a',nombre:'Prueba 1'}])`)===null);

console.log('\n=== Los presets que la usan ===');
const pe=run(`PRESETS_UC['Principios Ecológicos y Medio Ambiente']`),din=run(`PRESETS_UC['Dinámica']`);
chk('Principios Ecológicos declara sus décimas a la final, con la condición del programa',pe&&pe.bonus&&pe.bonus[0].a==='final'&&pe.bonus[0].max===5&&pe.bonus[0].si.mayorQue===4);
chk('y ya no la lleva en noCalcula',!(pe.noCalcula||[]).some(t=>/décimas/.test(t)));
chk('Dinámica declara las 5 décimas a Controles con 2 faltas como máximo',din&&din.bonus&&din.bonus[0].a==='Controles'&&din.bonus[0].hasta===2&&din.bonus[0].suma===0.5);
chk('y ya no la lleva en noCalcula',!(din.noCalcula||[]).some(t=>/5 décimas/.test(t)));
chk('Revelación y Fe suma las décimas a la nota más baja, sin activarlas por omisión',run(`PRESETS_UC['Revelación y Fe']`).bonus.some(b=>b.id==='talleres'&&b.operacion==='sumar'));
// Un ramo ya creado desde el catálogo recibe la regla al cargar, sin sumar nada.
const viejo=run(`(()=>{const p=presetRamo('Principios Ecológicos y Medio Ambiente','uc','ING-PC');
  const r={id:'v',nombre:'Principios Ecológicos y Medio Ambiente',origen:{tenant:'uc',carrera:'ING-PC'},categorias:p.categorias,gates:[]};
  return normalize({tenant:'uc',ramos:[r]}).ramos[0];})()`);
chk('un ramo creado antes recibe la regla al cargar',Array.isArray(viejo.bonus)&&viejo.bonus[0].id==='talleres'&&viejo.bonus[0].destino==='final');
chk('sin sumar nada hasta que se anote',viejo.bonusIngresado===null);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
