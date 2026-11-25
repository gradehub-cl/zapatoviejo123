// Eximición propia (solo app): cuando el programa del catálogo no trae una, la
// persona la escribe en «Editar evaluaciones» y se calcula por el mismo camino
// que las del catálogo. Ejemplos con la forma de los que pidió un estudiante
// (NP ≥ 5,0 con I1 e I2 ≥ 4,0; NP ≥ 5,5 y 75 % de asistencia), datos sintéticos.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return stub},querySelectorAll(){return []},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val=n=>vm.runInContext(n,ctx);
vm.runInContext('syncToCloud=function(){};track=function(){};renderRamo=function(){};showToast=function(){};',ctx);
const run=c=>vm.runInContext(c,ctx);
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
vm.runInContext('animarPromedio=function(){};vibrar=function(){};mostrarEcoGpa=function(){};',ctx);
const app=si=>{ctx.window.Capacitor=si?{isNativePlatform:()=>true}:undefined;};
const cerca=(a,b)=>typeof a==='number'&&Math.abs(a-b)<1e-6;
const notas=o=>run(`S.ramos[0].categorias.forEach(c=>{const v=${JSON.stringify(o)}[c.id];c.notas=v==null?[]:[{id:'n'+c.id,nombre:c.nombre,peso:1,valor:v}]});`);
const estado=()=>val('estadoEximicion(S.ramos[0])');

console.log('\n=== Escribir la eximición en el editor ===');
app(true);
run(`S={tenant:'uc',ramos:[{id:'q',nombre:'Química Sintética',categorias:[
  {id:'i1',nombre:'Interrogación 1',peso:25,directNota:true,notas:[]},{id:'i2',nombre:'Interrogación 2',peso:25,directNota:true,notas:[]},
  {id:'ta',nombre:'Talleres',peso:20,directNota:true,notas:[]},{id:'ex',nombre:'Examen',peso:30,directNota:true,notas:[]}],gates:[]}]};currentRamoId='q';`);
val('openPautaManualModal')();
chk('sin regla parte desactivada',val('pautaEximicionDraft.activa')===false);
val('activarEximicion')(true);
chk('al activar sugiere el examen y el resto como presentación',val('pautaEximicionDraft.examen')==='ex'&&val("pautaEximicionDraft.segun.join()")==='i1,i2,ta');
run(`pautaEximicionDraft.minimos=[{clave:'i1',min:'4,0'},{clave:'i2',min:'4,0'}];`);
val('guardarPautaManual')();
chk('guarda la regla por id',val('JSON.stringify(S.ramos[0].eximicionPropia)')==='{"examenId":"ex","segun":["i1","i2","ta"],"min":5,"minimos":[{"catId":"i1","min":4},{"catId":"i2","min":4}]}');

console.log('\n=== Calcula como una del catálogo ===');
notas({i1:5,i2:6,ta:5});
// Presentación (125+150+100)/70 = 5,357.
chk('con 5,36 de presentación puede confirmar',estado().puedeConfirmar===true&&cerca(estado().promedio,375/70));
chk('sin confirmar, el examen sigue pendiente',val('estadoEximicion(S.ramos[0]).activa')===false);
run(`S.ramos[0].eximicionConfirmada=true;`);
chk('confirmada, la final es la presentación',estado().activa===true&&cerca(val('ramoAvg(S.ramos[0])'),375/70));
app(false);
chk('la web calcula lo mismo',cerca(val('ramoAvg(S.ramos[0])'),375/70));
app(true);
notas({i1:3.9,i2:7,ta:7});
chk('I1 con 3,9 no cumple el mínimo por evaluación',estado().activa===false&&estado().razon==='minimo_categoria');
notas({i1:3.95,i2:7,ta:7});
chk('I1 con 3,95 se aproxima a 4,0 y cumple',estado().activa===true);
notas({i1:4.5,i2:5,ta:5.3});
// (112,5+125+106)/70 = 4,907 → 4,9: no alcanza 5,0.
chk('presentación 4,91 (4,9) no alcanza 5,0',estado().activa===false&&estado().razon==='promedio');
notas({i1:4.6,i2:5,ta:5.3});
// (115+125+106)/70 = 4,943 → 4,9.
chk('presentación 4,94 tampoco',estado().activa===false);
notas({i1:4.7,i2:5,ta:5.3});
// (117,5+125+106)/70 = 4,979 → 5,0.
chk('presentación 4,98 se aproxima a 5,0 y cumple',estado().activa===true);
notas({i1:5,i2:6,ta:5,ex:3});
chk('si ya ingresaste el examen, cuenta el examen',estado().activa===false&&estado().razon==='examen_rendido'&&cerca(val('ramoAvg(S.ramos[0])'),(125+150+100+90)/100));

console.log('\n=== Asistencia y cambios de regla ===');
notas({i1:6,i2:6,ta:6});
val('openPautaManualModal')();
run(`pautaEximicionDraft.min='5,5';pautaEximicionDraft.minimos=[];pautaEximicionDraft.asistencia='75';`);
val('guardarPautaManual')();
chk('cambiar la regla pide confirmar de nuevo',!val("'eximicionConfirmada' in S.ramos[0]")&&estado().puedeConfirmar===true);
chk('la confirmación incluye la asistencia',/75 % de asistencia/.test(estado().regla.confirmar||''));
chk('la regla del ramo la menciona',/75 % de asistencia/.test(val("textoEximicionRegla(estadoEximicion(S.ramos[0]))")));

console.log('\n=== Errores ===');
val('openPautaManualModal')();
run(`pautaEximicionDraft.min='9';`);
const antes=val('JSON.stringify(S.ramos[0].eximicionPropia)');
val('guardarPautaManual')();
chk('una presentación fuera de escala no se guarda',val('JSON.stringify(S.ramos[0].eximicionPropia)')===antes&&/presentación/.test(val('pautaDraftError')));
run(`pautaEximicionDraft.min='5,5';pautaEximicionDraft.segun=[];`);
val('guardarPautaManual')();
chk('sin evaluaciones de presentación no se guarda',val('JSON.stringify(S.ramos[0].eximicionPropia)')===antes&&/presentación/.test(val('pautaDraftError')));
run(`pautaEximicionDraft.segun=['i1'];pautaEximicionDraft.asistencia='150';`);
val('guardarPautaManual')();
chk('asistencia fuera de 1–100 no se guarda',val('JSON.stringify(S.ramos[0].eximicionPropia)')===antes&&/asistencia/.test(val('pautaDraftError')));

console.log('\n=== Datos que no calzan no adivinan ===');
run(`S.ramos[0].categorias.push({id:'i1b',nombre:'Interrogación 1',peso:0,directNota:true,notas:[]});`);
chk('con dos evaluaciones del mismo nombre la regla no rige',val('estadoEximicion(S.ramos[0])')===null);
run(`S.ramos[0].categorias.pop();`);
val('openPautaManualModal')();
run(`activarEximicion(false);`);
val('guardarPautaManual')();
chk('desactivarla la borra',!val("'eximicionPropia' in S.ramos[0]")&&val('estadoEximicion(S.ramos[0])')===null);

console.log('\n=== La web no la toca ===');
run(`S.ramos[0].eximicionPropia={examenId:'ex',segun:['i1','i2','ta'],min:5,minimos:[]};`);
app(false);
val('openPautaManualModal')();
chk('en la web no hay borrador',val('pautaEximicionDraft')===null);
val('guardarPautaManual')();
chk('guardar en la web conserva la regla',val("S.ramos[0].eximicionPropia.min")===5);
chk('la web la normaliza sin perderla',val("normalize({tenant:'uc',ramos:S.ramos}).ramos[0].eximicionPropia.min")===5);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
