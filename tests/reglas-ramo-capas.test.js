// Pautas y programas sintéticos; motor, editor y guardado reales, sin presetRamo.
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const ids={},almacen=new Map();
const el=()=>({innerHTML:'',value:'',dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){}});
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:id=>ids[id]??=el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:el,querySelectorAll:()=>[]},localStorage:{getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,v),removeItem:k=>almacen.delete(k)},sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://ejemplo.test',pathname:'/',hash:'',search:''},history:{replaceState(){}},setTimeout(){},clearTimeout(){},URL};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(leer(f),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run(`JSON.stringify(${s})`));
run(`enAppNativa=()=>true;S.tenant='fen';S.onboardingDone=true;S.tipoCuenta='estudiante';
 PRESETS_FEN['Curso de capas sintético']={periodo:'2026-2',evals:[['E1',20],['E2',20],['E3',30],['Examen',30]],eximicion:{evaluacion:'Examen',segun:['E1','E2','E3'],min:5.95,promedio:'simple',notaExamen:'maxima',maxInasistencias:6,ignoraDescartes:true},reglasDelCurso:['Sin justificativo dentro de 48 h, la evaluación vale 1,0.']};
 globalThis.curso={id:'capas',nombre:'Curso de capas sintético',origen:{tenant:'fen',carrera:null},faltas:{activo:true,cantidad:6,limite:10},categorias:[['e1','E1',20],['e2','E2',20],['e3','E3',30],['ex','Examen',30]].map(([id,nombre,peso])=>({id,nombre,peso,directNota:true,notas:nombre==='Examen'?[]:[{id:'n'+id,valor:6,peso:1}]})),gates:[]};S.ramos=[curso];`);
const antes=json('curso');let html=run('reglasRamoHTML(curso)');
assert(run('estadoEximicion(curso).activa'));assert.match(html,/5,95 de presentación y hasta 6 faltas/);assert.match(html,/Hoy tienes 6,0: estás eximido/);
assert.match(html,/Del programa 2026-2/);assert.match(html,/Cómo se reparte/);assert.match(html,/70 %/);assert.match(html,/30 %/);assert(!/<details[^>]*\bopen\b/.test(html),'citas y subpesos plegados');
assert.match(html,/Sin justificativo dentro de 48 h/);assert.match(html,/La app no la aplica automáticamente/);assert.deepEqual(json('curso'),antes,'renderizar no modifica notas ni reglas');
run('curso.faltas.cantidad=7');assert(!run('estadoEximicion(curso).activa'));assert.match(run('reglasRamoHTML(curso)'),/falta cumplir o registrar la asistencia/);
run("curso.faltas.cantidad=6;curso.categorias.find(c=>c.id==='e1').notas[0].valor=4");assert(!run('estadoEximicion(curso).activa'));assert(!/estás eximido/.test(run('reglasRamoHTML(curso)')));
run(`globalThis.manual={id:'manual',nombre:'Propio',origen:null,categorias:[{id:'pr',nombre:'Pruebas',peso:60,slots:3,pesosCasillas:[1,2,1],directNota:true,notas:[{id:'npr',valor:7,slot:0}]},{id:'ex',nombre:'Examen',peso:40,directNota:true,notas:[{id:'nex',valor:2.9}]}],gates:[{type:'min_grade_required',catId:'ex',min:3,cap:3.9,origen:'editor'}]};S.ramos=[manual];`);
assert.equal(run('ramoAvg(manual)'),3.9);html=run('reglasRamoHTML(manual)');assert.match(html,/bajo 3/);assert.match(html,/topada en 3,9/);assert.match(html,/Hoy el motor aplica/);assert.match(html,/De tu pauta/);assert(!/Del programa 2026-2/.test(html));
assert.match(html,/15 %/);assert.match(html,/30 %/,'subpesos 15/30/15 desde 1/2/1');
run(`manual.bonus=[{id:'texto',pregunta:'Presenté un texto',destino:'grupo',entrada:'confirmacion',operacion:'promediar',valor:7,catIds:['pr'],etapa:'previa',ayuda:'El texto promedia un 7,0 con la menor nota.'}];manual.bonusConfirmado={texto:true};`);
html=run('reglasRamoHTML(manual)');assert.match(html,/[Pp]romedia un 7,0/);assert.match(html,/con tope 7,0/);assert.match(html,/El texto promedia un 7,0/);
run(`globalThis.limpio={id:'sin',nombre:'Propio sin reglas',categorias:[{id:'p',nombre:'Prueba',peso:100,directNota:true,notas:[]}],gates:[]};`);assert.equal(run('reglasRamoHTML(limpio)'),'');
run('manual.consensoRespaldos=7');assert.match(run('reglasRamoHTML(manual)'),/Reportada por 7 estudiantes/);
run('enAppNativa=()=>false');assert.equal(run('reglasRamoHTML(manual)'),'','web intacta');run('enAppNativa=()=>true');
// Leer/usar Canvas solo cambia el borrador. Cancelar/reabrir lo descarta.
run(`currentRamoId='sin';S.ramos=[limpio];openModal=()=>{};closeModal=()=>{};showToast=()=>{};renderRamo=()=>{};track=()=>{};informarAportePauta=()=>{};
 openPautaManualModal();canvasProgramaRamo.set('sin',{archivo:'Programa sintético.docx',resultado:{estado:'propuesta',filas:[{nombre:'Prueba',peso:100}],reglas:['La asistencia mínima es 75 %.']}});showConfirm=(t,d,f)=>f();usarProgramaCanvas();`);
assert.equal(run('limpio.programaCanvas'),undefined);run('openPautaManualModal()');assert.equal(run('pautaProgramaCanvasDraft'),null,'cancelar no deja fuente en otro borrador');
run(`canvasProgramaRamo.set('sin',{archivo:'Programa sintético.docx',resultado:{estado:'propuesta',filas:[{nombre:'Prueba',peso:100}],reglas:['La asistencia mínima es 75 %.','<img src=x onerror=alert(1)>']}});usarProgramaCanvas();guardarPautaManual();`);
assert.equal(json('limpio.programaCanvas').archivo,'Programa sintético.docx');html=run('reglasRamoHTML(limpio)');assert.match(html,/De “Programa sintético.docx” en Canvas/);assert(!html.includes('<img'),'escapa citas sin inyectar HTML');assert.match(html,/no aplica esta condición al promedio/);
const meta=json('limpio.programaCanvas');run('save()');
run(`_mostrarJsonManual=texto=>globalThis.__exportado=texto;exportarDatos();document.getElementById('import-text').value=__exportado;confirmarImportar();limpio=S.ramos.find(r=>r.id==='sin');`);assert.deepEqual(json('limpio.programaCanvas'),meta,'exportar/importar reales conservan la cita');assert.match(almacen.get('gradehub_v1'),/Programa sintético/);
run(`globalThis.recargado=normalize(JSON.parse(localStorage.getItem('gradehub_v1')));`);assert.deepEqual(json('recargado.ramos.find(r=>r.id==="sin").programaCanvas'),meta);
run(`globalThis.copia=JSON.parse(JSON.stringify(recargado));copia.historial=[{id:'h',label:'2026-1',ramos:copia.ramos}];copia=normalize(copia)`);assert.deepEqual(json('copia.historial.find(h=>h.id==="h").ramos.find(r=>r.id==="sin").programaCanvas'),meta);
const fusionar=run('fusionarObjetoSync'),remoto=json('limpio'),local=JSON.parse(JSON.stringify(remoto));local.categorias.find(c=>c.id==='p').notas.push({id:'nueva',valor:5});const fusion=fusionar(remoto,local,remoto,'local');assert.deepEqual(JSON.parse(JSON.stringify(fusion.programaCanvas)),meta,'sync conserva fuente con una nota nueva');
assert.equal(run(`copiarProgramaCanvas(${JSON.stringify({...meta,archivo:'Otro.docx'})})`),null,'una fusión parcial no atribuye citas a otro archivo');
run("limpio.categorias.find(c=>c.id==='p').peso=90");assert.match(run('reglasRamoHTML(limpio)'),/Pauta editada después de importar/);
const maxima=run(`crearProgramaCanvas('a'.repeat(500),Array(100).fill('b'.repeat(999)),limpio)`);assert(maxima.archivo.length<=160&&maxima.citas.length===4&&maxima.citas.every(c=>c.length<=220));
run('delete limpio.programaCanvas');assert.equal(run('reglasRamoHTML(limpio)'),'','cuenta sin campo sigue sin reglas');
console.log('PASS reglas: eximición activa/inactiva, compuerta, bonus, curso, reparto, consenso, web y Canvas guardado/recarga/sync');
// Lucas, 2026-11-22: en la ficha de la app las reglas van plegadas, como en la web.
{const ficha=leer('src/render-main/ficha-ramo.js');assert(!/reglasRamoHTML\(/.test(ficha),'la ficha no abre «Reglas del ramo»');assert.match(ficha,/class="reglas-toggle"/);}
