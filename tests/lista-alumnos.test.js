// La Lista de Alumnos: una fila por alumno y ramo, con el motor real y pautas
// escritas acá, sin datos de estudiantes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return nodo()},querySelectorAll(){return []},dataset:{}});
const ctx={console,setTimeout,clearTimeout,Intl,URL,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
 document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},
 navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},history:{replaceState(){}}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','marketplace.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const ahora=new Date(2026,10,5,12);ctx.__ahora=ahora;
const cat=(id,peso,valor,fecha)=>({id,nombre:id,peso,directNota:true,fecha,notas:valor==null?[]:[{id:'n-'+id,nombre:id,valor,peso:1}]});
const ramo=(id,nombre,cats,extra={})=>({id,nombre,sigla:id.toUpperCase(),origen:null,creditos:10,gates:[],categorias:cats,...extra});
ctx.__alumnos=[
 {id:'a',nombre_visible:'Bien y mal',tenant:'uc',ramos:[
   ramo('r1','Ramo alto',[cat('P1',100,6.5)],{seccion:2}),
   ramo('r2','Ramo bajo',[cat('P1',50,2),cat('P2',50,null,'2026-11-08')])]},
 {id:'b',nombre_visible:'Sin nada',tenant:'uc',ramos:[ramo('r3','Ramo vacío',[cat('P1',100,null,'2026-12-20')])]},
 {id:'c',nombre_visible:'Ya no comparte',tenant:'uc',ramos:[]}];
run('S=normalize({tenant:"uc",tipoCuenta:"profesor",ramos:[],historial:[]});globalThis.__f=filasListaPanel(__alumnos,__ahora);');
const filas=run('__f.map(f=>({al:f.al.id,r:f.r&&f.r.id,avg:f.avg,prioridad:f.prioridad,semana:f.enSemana,proxima:f.proxima&&f.proxima.evaluacion,necesita:f.necesita}))');
const de=id=>filas.find(f=>f.r===id);
assert.equal(filas.length,4,'una fila por alumno y ramo, y quien ya no comparte sigue en la lista');
assert.equal(filas[0].r,'r2','lo que pide apoyo va primero');
assert.notEqual(de('r1').prioridad,de('r2').prioridad,'cada ramo tiene su propia urgencia');
assert.equal(de('r2').proxima,'P2');assert.equal(de('r2').semana,true);
assert.equal(de('r3').semana,false,'lo de más de 7 días no cuenta como esta semana');
assert.equal(de('r3').avg,null);
const cuenta=e=>run(`filtrarListaPanel(__f,${JSON.stringify(e)}).length`);
assert.equal(cuenta({tab:'todos'}),4);assert.equal(cuenta({tab:'apoyo'}),1);assert.equal(cuenta({tab:'semana'}),1);assert.equal(cuenta({tab:'sin'}),2);
assert.equal(cuenta({ramo:'R1'}),1,'el ramo filtra por sigla');
assert.equal(cuenta({tab:'apoyo',ramo:'R1'}),0,'los filtros se combinan');
const pestanas=run("pestanasListaHTML(__f,{tab:'todos',ramo:'R1'})");
assert.match(pestanas,/Todos<span>1<\/span>/,'las pestañas cuentan dentro del ramo elegido');
assert.match(run("ramosListaHTML(__f,{ramo:'R2'})"),/value="R2" selected>Ramo bajo</);
const html=run('filasListaHTML(__f)');
assert.match(html,/data-ver-alumno="a" data-alumno-ramo="r2"/,'la fila abre la ficha en su ramo');
assert.match(html,/Ya no tiene los ramos que te compartió/);
assert.match(html,/Sección 2/);
assert.doesNotMatch(html.match(/al-promedio">[\s\S]*?<\/b>/g).join(''),/\d\.\d/,'coma decimal en el promedio');
assert.equal(run('filasListaHTML(__f,1).match(/data-ver-alumno=/g).length'),1,'la paginación limita lo que se pinta');
// El Excel: lo que calza con la lista, sin perder el contexto del alumno.
const exporta=run("alumnosDeFilasPanel(filtrarListaPanel(__f,{tab:'apoyo'})).map(a=>({id:a.id,ramos:a.ramos.map(r=>r.id),todos:a.todosLosRamos.length}))");
assert.equal(JSON.stringify(exporta),JSON.stringify([{id:'a',ramos:['r2'],todos:2}]));
assert.equal(run('alumnosDeFilasPanel(__f).length'),3,'un alumno con dos filas sale una vez');
// Una fila que ya no alcanza se dice, sin inventar una nota sobre 7.
ctx.__fila={al:ctx.__alumnos[0],r:{id:'x'},ramo:{nombre:'Ramo',seccion:null},avg:2,nivel:'bad',necesita:8.2,motivo:'',proxima:null};
assert.match(run('filaListaHTML(__fila)'),/No alcanza/);assert.doesNotMatch(run('filaListaHTML(__fila)'),/8,2/);
console.log('PASS lista de alumnos: fila por ramo, prioridad, filtros, ficha, coma decimal y Excel');
