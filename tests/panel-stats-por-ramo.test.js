// Comparación por alumno y ramo: nunca se anulan dos trayectorias distintas.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const c={console,Intl,URL,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://example.invalid',pathname:'/',hash:''}};
vm.createContext(c);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`var currentUser=null,supabaseClient=null;S.tenant='uc';S.ramos=[];
 const prueba=(id,fecha,nota)=>({id:'c-'+id,nombre:'Prueba '+id,peso:25,directNota:true,notas:[{id:'n-'+id,nombre:'Prueba '+id,valor:nota,fecha,peso:1}]});
 const ramo=(id,nombre,sigla,notas,fechas)=>({id,nombre,sigla,creditos:10,gates:[],categorias:notas.map((n,i)=>prueba(id+i,fechas[i],n))});
 const fechasA=['2026-09-01','2026-09-08','2026-09-22','2026-10-01'];
 const fechasB=['2026-09-15','2026-09-25','2026-10-01','2026-10-08'];
 globalThis.al={id:'ejemplo',tenant:'uc',nombre_visible:'Alumno de ejemplo',desde:'2026-09-10',inicio_ramos:{a:'2026-09-15',b:'2026-10-01'},ramos:[ramo('a','Álgebra sintética','TST101',[3,3,5,5],fechasA),ramo('b','Física sintética','TST102',[5,5,3,3],fechasB)]};
 globalThis.comp=(_al,r)=>({ramo:{promedio:4,personas:6},evaluaciones:r.categorias.map(cat=>({clave:claveEvaluacionPanel(cat.notas[0].nombre),promedio:4,personas:6})),categorias:[]});`);

test('un alumno con dos cambios opuestos conserva dos filas independientes',()=>{
 const guardado=run('JSON.stringify(al)'),g=run('metricasGrupoPanel([al],comp)');
 assert.equal(g.alumnos.length,2);assert.equal(g.totalAlumnos,1);assert.equal(g.totalRamos,2);assert.equal(g.conCambio,2);assert.equal(g.mejoraron,1);assert.equal(g.cambioMediana,0,'la mediana sí usa los dos pares, sin anular antes sus cambios');
 const a=g.alumnos.find(m=>m.ramoId==='a'),b=g.alumnos.find(m=>m.ramoId==='b');assert.equal(a.cambio,2);assert.equal(b.cambio,-2);assert.equal(a.desde,'2026-09-15');assert.equal(b.desde,'2026-10-01');assert.equal(b.antes.n,2,'no usa el inicio general del alumno');
 const html=run('antesAhoraGrupoHTML(metricasGrupoPanel([al],comp))');
 assert.equal((html.match(/data-ver-alumno="ejemplo"/g)||[]).length,2);assert(html.includes('Álgebra sintética'));assert(html.includes('Física sintética'));assert(html.includes('TST101'));assert(html.includes('TST102'));assert(html.includes('data-alumno-ramo="a"'));assert(html.includes('data-alumno-ramo="b"'));assert(html.includes('1 alumno en 2 ramos'));assert(html.includes('+2.0'));assert(html.includes('−2.0'));assert(html.includes('15 sep'));assert(html.includes('1 oct'));
 assert.equal(run('JSON.stringify(al)'),guardado);
});

test('el mínimo de comparables se comprueba por cada par, no entre ramos',()=>{
 run('globalThis.poco={...al,ramos:al.ramos.map(r=>({...r,categorias:[r.categorias[0],r.categorias[2],r.categorias[3]]}))};');
 const g=run('metricasGrupoPanel([poco],comp)');assert.equal(g.alumnos.length,2);assert.equal(g.conCambio,0);assert(g.alumnos.every(m=>m.cambio===null));
 const html=run('graficoAlumnosAntesAhoraHTML(metricasGrupoPanel([poco],comp))');assert.equal((html.match(/data-ver-alumno=/g)||[]).length,2);assert(html.includes('Falta 1 evaluación comparable de antes de empezar'));
 const sin=run('graficoAlumnosAntesAhoraHTML(metricasGrupoPanel([poco],()=>null))');assert.equal((sin.match(/data-ver-alumno=/g)||[]).length,2);assert(sin.includes('Faltan evaluaciones comparables antes y ahora'));assert(!sin.includes('NaN'));
});

test('resumen: alumnos y ramos distintos; mediana y mejoraron cuentan pares',()=>{
 run(`globalThis.otro={...al,id:'otro',nombre_visible:'Otra persona',ramos:[{...al.ramos[0],id:'otro-a'}],inicio_ramos:{'otro-a':'2026-09-15'}};`);
 const g=run('metricasGrupoPanel([al,otro],comp)');assert.equal(g.totalAlumnos,2);assert.equal(g.totalRamos,2,'el mismo ramo de dos alumnos no se cuenta como dos ramos');assert.equal(g.conCambio,3);assert.equal(g.mejoraron,2);assert.equal(g.cambioMediana,2);
 const vacio=run('metricasGrupoPanel([],comp)');assert.equal(vacio.alumnos.length,0);assert.equal(vacio.totalAlumnos,0);assert.equal(vacio.totalRamos,0);
});

test('CSV de resumen: dos filas y mismas columnas, incluida Ramo',()=>{
 const filas=run('csvResumenAlumnosPanel([al],comp,null,new Date(2026,10,3))').split('\r\n').map(f=>f.split(';'));
 assert.deepEqual(filas[0],['Alumno','Ramo','Sigla','Sección','Empezó contigo en este ramo','Promedio del ramo','GradeHub ramo','Sección ramo','Diferencia con el ramo antes','Diferencia con el ramo desde que empezó','Cambio','Estado','Próxima evaluación','Nota necesaria para aprobar','Estudiantes en GradeHub (ramo)','Estudiantes en GradeHub (sección)','Método','No preparadas frente a GradeHub','Preparadas frente a GradeHub','Cambio entre grupos']);assert.equal(filas.length,3);
 assert.equal(filas[1][1],'Álgebra sintética');assert.equal(filas[2][1],'Física sintética');assert.equal(filas[1][4],'2026-09-15');assert.equal(filas[2][4],'2026-10-01');assert.equal(filas[1][10],'2,0');assert.equal(filas[2][10],'-2,0');assert(filas.every(f=>f.length===filas[0].length));
});
