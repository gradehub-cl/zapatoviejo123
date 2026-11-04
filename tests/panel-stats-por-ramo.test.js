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
 assert.deepEqual(filas[0],['Alumno','Ramo','Sigla','Sección','Empezó contigo en este ramo','Promedio del ramo','GradeHub ramo','Sección ramo','Diferencia con el ramo antes','Diferencia con el ramo desde que empezó','Cambio','Estado','Próxima evaluación','Nota necesaria para aprobar','Estudiantes en GradeHub (ramo)','Estudiantes en GradeHub (sección)','Percentil antes','Percentil ahora','Cambio percentil']);assert.equal(filas.length,3);
 assert.equal(filas[1][1],'Álgebra sintética');assert.equal(filas[2][1],'Física sintética');assert.equal(filas[1][4],'2026-09-15');assert.equal(filas[2][4],'2026-10-01');assert.equal(filas[1][10],'2,0');assert.equal(filas[2][10],'-2,0');assert(filas.every(f=>f.length===filas[0].length));
});

test('filtro de ramos sobre la lista: elegir, buscar con Enter y Ver todos',()=>{
 run(`globalThis.otro2={...al,id:'otro2',nombre_visible:'Otra persona',ramos:[{...al.ramos[0],id:'otro2-a'}],inicio_ramos:{'otro2-a':'2026-09-15'}};`);
 assert(!run('graficoAlumnosAntesAhoraHTML(metricasGrupoPanel([otro2],comp))').includes('data-filtro-ramos'),'con un solo ramo no hay filtro');
 const html=run('graficoAlumnosAntesAhoraHTML(metricasGrupoPanel([al,otro2],comp))');
 assert(html.includes('placeholder="Buscar ramo"'));
 const el=(dataset,attrs={})=>({hidden:false,dataset,attrs,setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return k in this.attrs?this.attrs[k]:null;},hasAttribute(k){return k in this.attrs;}});
 const chips=[...html.matchAll(/data-filtro-ramo="([^"]+)" data-nombre="([^"]*)" data-sigla="([^"]*)"/g)].map(m=>el({filtroRamo:m[1],nombre:m[2],sigla:m[3]}));
 const filas=[...html.matchAll(/<li data-ramo-clave="([^"]+)"/g)].map(m=>el({ramoClave:m[1]}));
 assert.equal(chips.length,2,'un botón por ramo, aunque dos alumnos tengan Álgebra');assert.equal(filas.length,3);
 const todos=el({},{'data-filtro-todos':''}),input={value:'',classList:{contains:x=>x==='ah-filtro-buscar'}},aviso={textContent:''};
 const caja={querySelector:s=>s==='[data-filtro-todos]'?todos:s==='.ah-filtro-buscar'?input:s==='.ah-filtro-estado'?aviso:null,querySelectorAll:()=>chips};
 c.__raiz={querySelector:s=>s==='[data-filtro-ramos]'?caja:null,querySelectorAll:s=>s.startsWith('.ah-filas')?filas:chips,contains:()=>true};
 c.__estado={elegidos:new Set(),texto:''};
 const tocar=b=>{c.__ev={target:{closest:()=>b}};return run('tocarFiltroRamosPanel(__ev,__raiz,__estado)');};
 run('aplicarFiltroRamosPanel(__raiz,__estado)');
 assert(filas.every(f=>!f.hidden)&&todos.hidden,'sin elegir se ve todo');
 const fis=chips.find(b=>b.dataset.sigla==='TST102'),alg=chips.find(b=>b.dataset.sigla==='TST101');
 assert(tocar(fis));
 assert.equal(filas.filter(f=>!f.hidden).length,1);assert.equal(fis.getAttribute('aria-pressed'),'true');assert(!todos.hidden);assert.equal(aviso.textContent,'Se ven 1 de 3 filas.');
 input.value='ALGE';c.__ev={type:'input',target:input};run('escribirFiltroRamosPanel(__ev,__raiz,__estado)');
 assert(!alg.hidden&&!fis.hidden,'lo elegido no se esconde al buscar otro');
 input.value='quimica';run('escribirFiltroRamosPanel(__ev,__raiz,__estado)');
 assert(alg.hidden&&!fis.hidden);assert.equal(aviso.textContent,'Ningún otro ramo calza con lo que escribiste.');
 input.value='álge';run('escribirFiltroRamosPanel(__ev,__raiz,__estado)');
 let evitado=false;c.__ev={type:'keydown',key:'Enter',target:input,preventDefault(){evitado=true;}};run('escribirFiltroRamosPanel(__ev,__raiz,__estado)');
 assert(evitado);assert.equal(alg.getAttribute('aria-pressed'),'true');assert.equal(input.value,'','queda listo para buscar otro');assert(filas.every(f=>!f.hidden));
 assert(tocar(fis));assert.equal(filas.filter(f=>!f.hidden).length,2,'quitar un ramo deja solo el otro');
 assert(tocar(todos));assert(filas.every(f=>!f.hidden)&&todos.hidden&&chips.every(b=>b.getAttribute('aria-pressed')==='false'));
 c.__ev={target:{closest:()=>null}};assert.equal(run('tocarFiltroRamosPanel(__ev,__raiz,__estado)'),false,'un toque fuera del filtro sigue abriendo la ficha');
});
test('con más de seis ramos, los botones aparecen al escribir',()=>{
 const el=(sigla)=>({hidden:false,dataset:{filtroRamo:'uc|'+sigla,nombre:'Ramo '+sigla,sigla},attrs:{},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;}});
 const chips=['A1','A2','A3','A4','A5','A6','B7'].map(el),aviso={textContent:''},input={value:''};
 const caja={querySelector:s=>s==='.ah-filtro-buscar'?input:s==='.ah-filtro-estado'?aviso:null,querySelectorAll:()=>chips};
 c.__raiz={querySelector:s=>s==='[data-filtro-ramos]'?caja:null,querySelectorAll:s=>s.startsWith('.ah-filas')?[]:chips};
 c.__estado={elegidos:new Set(['uc|A2']),texto:''};run('aplicarFiltroRamosPanel(__raiz,__estado)');
 assert.deepEqual(chips.filter(b=>!b.hidden).map(b=>b.dataset.sigla),['A2'],'sin escribir, solo lo elegido');
 c.__estado.elegidos.clear();run('aplicarFiltroRamosPanel(__raiz,__estado)');assert.equal(aviso.textContent,'Escribe para buscar entre tus 7 ramos.');
 c.__estado.texto='b7';run('aplicarFiltroRamosPanel(__raiz,__estado)');assert.deepEqual(chips.filter(b=>!b.hidden).map(b=>b.dataset.sigla),['B7']);
});
