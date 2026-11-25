// Anotar puntos en vez de nota (solo app): una evaluación con «Puntaje total»
// recibe los puntos que sacaste y los pasa a nota con su exigencia, o la del
// ramo. La nota que llega al motor es la misma en la web y en la app; los
// puntos quedan guardados solo para mostrar de dónde salió. Datos sintéticos.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return stub},querySelectorAll(){return []},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val=n=>vm.runInContext(n,ctx);
vm.runInContext('syncToCloud=function(){};track=function(){};renderRamo=function(){};showToast=function(){};animarPromedio=function(){};vibrar=function(){};mostrarEcoGpa=function(){};',ctx);
const run=c=>vm.runInContext(c,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const app=si=>{ctx.window.Capacitor=si?{isNativePlatform:()=>true}:undefined;};
const cerca=(a,b)=>typeof a==='number'&&Math.abs(a-b)<1e-6;

console.log('\n=== Configurar el puntaje en «Editar evaluaciones» ===');
app(true);
run(`S={tenant:'uc',ramos:[{id:'r',nombre:'Física Sintética',exigencia:55,categorias:[
  {id:'p1',nombre:'Prueba 1',peso:50,directNota:true,notas:[]},{id:'ex',nombre:'Examen',peso:50,directNota:true,notas:[]}],gates:[]}]};currentRamoId='r';`);
val('openPautaManualModal')();
chk('en la app el borrador trae los campos de puntaje vacíos',val("pautaDraft[0].reglas.puntos")===''&&val("pautaDraft[0].reglas.exigencia")==='');
run(`pautaDraft[0].reglas.puntos='60';pautaDraft[0].reglas.exigencia='60';pautaDraft[1].reglas.puntos='80';`);
val('guardarPautaManual')();
chk('guarda puntaje total y exigencia propia',val("JSON.stringify([S.ramos[0].categorias[0].puntajeTotal,S.ramos[0].categorias[0].exigencia])")==='[60,60]');
chk('sin exigencia propia no guarda la clave',val("S.ramos[0].categorias[1].puntajeTotal===80&&!('exigencia' in S.ramos[0].categorias[1])"));
run(`pautaDraft[0].reglas.puntos='0';`);
val('openPautaManualModal')();run(`pautaDraft[0].reglas.puntos='abc';`);
val('guardarPautaManual')();
chk('un puntaje total inválido no se guarda y avisa',val("S.ramos[0].categorias[0].puntajeTotal")===60&&/puntaje total/.test(val('pautaDraftError')));
val('openPautaManualModal')();run(`pautaDraft[0].reglas.exigencia='120';`);
val('guardarPautaManual')();
chk('una exigencia fuera de 1–99 no se guarda',val("S.ramos[0].categorias[0].exigencia")===60&&/exigencia/.test(val('pautaDraftError')));

console.log('\n=== Leer puntos ===');
const leer=(raw,id)=>val(`JSON.stringify(leerNotaEnCategoria(${JSON.stringify(raw)},S.ramos[0],S.ramos[0].categorias.find(c=>c.id==='${id}')))`);
// 38 de 60 con 60 %: corte 36, 4 + 3·2/24 = 4,25 → 4,3.
chk('38 de 60 con 60 % es 4,3',JSON.parse(leer('38','p1')).valor===4.3);
chk('guarda de qué puntaje salió',JSON.stringify(JSON.parse(leer('38','p1')).puntos)==='{"obtenido":38,"total":60,"exigencia":60}');
// Sin exigencia propia usa la del ramo (55 %): 44 de 80, corte 44 → 4,0.
chk('sin exigencia propia usa la del ramo (44 de 80 con 55 % = 4,0)',JSON.parse(leer('44','ex')).valor===4);
chk('acepta decimales con coma (5,5 de 60 = 1,5)',JSON.parse(leer('5,5','p1')).valor===1.5);
chk('más puntos que el total no vale',JSON.parse(leer('61','p1')).valor===null);
chk('el total exacto es 7,0',JSON.parse(leer('60','p1')).valor===7);
chk('texto que no es número no vale',JSON.parse(leer('4/5','p1')).valor===null);

console.log('\n=== Guardar la nota convertida ===');
run(`setDirectNota('p1','4.3',{obtenido:38,total:60,exigencia:60});`);
chk('la nota del motor es la convertida',val("S.ramos[0].categorias[0].notas[0].valor")===4.3);
chk('la nota recuerda sus puntos',val("JSON.stringify(S.ramos[0].categorias[0].notas[0].puntos)")==='{"obtenido":38,"total":60,"exigencia":60}');
const norm=val("JSON.stringify(normalize({ramos:S.ramos}).ramos?normalize({ramos:S.ramos}).ramos[0].categorias[0].notas[0].puntos:normalize({ramos:S.ramos})[0].categorias[0].notas[0].puntos)");
chk('normalize conserva los puntos al recargar',norm==='{"obtenido":38,"total":60,"exigencia":60}');
run(`setDirectNota('p1','5.0');`);
chk('corregir la nota a mano quita los puntos viejos',val("S.ramos[0].categorias[0].notas[0].valor")===5&&!val("'puntos' in S.ramos[0].categorias[0].notas[0]"));

console.log('\n=== En la web nada cambia ===');
app(false);
chk('en la web no hay puntaje: se lee nota',val("puntajeDeCategoria(S.ramos[0],S.ramos[0].categorias[0])")===null&&JSON.parse(leer('55','p1')).valor===5.5);
val('openPautaManualModal')();
chk('el editor web no trae los campos',val("'puntos' in pautaDraft[0].reglas")===false);
val('guardarPautaManual')();
chk('guardar en la web conserva el puntaje configurado en la app',val("S.ramos[0].categorias[0].puntajeTotal")===60&&val("S.ramos[0].categorias[0].exigencia")===60);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
