const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('/tmp/gradehub-qa-browser/node_modules/playwright');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
const out=path.join(root,'tests/capturas/pautas-por-seccion');fs.mkdirSync(out,{recursive:true});
for(const modo of ['claro','oscuro']){
const p=await b.newPage({viewport:{width:375,height:1000},reducedMotion:'reduce',timezoneId:'America/Santiago',serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route('**/*',r=>r.request().url()==='http://prueba.test/'?r.fulfill({contentType:'text/html',body:read('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'')}):r.abort());await p.goto('http://prueba.test/');await p.addStyleTag({content:read('styles.css')});const orden=JSON.parse(read('src/orden.json'));
for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])await p.addScriptTag({content:orden[f].map(read).join('\n')});
await p.addScriptTag({content:`var currentUser={id:'cuenta-sintetica-existente'},supabaseClient=null;track=()=>{};showToast=()=>{};save=()=>localStorage.setItem('gradehub_v1',JSON.stringify(S));`});
await p.evaluate(modo=>{
PRESETS_FEN['Ramo de ejemplo']={sigla:'SYN909',periodo:'2026-2',creditos:10,coordinado:false,porSeccion:{5:{evals:[['Prueba',40],['Examen',60]],reglasDelCurso:['Programa sintético 2026-2, sección 5.']},6:{evals:[['Trabajo',70],['Examen',30]]}}};
PROFESORES_PROPUESTOS.fen={'2026-2':{SYN909:{4:'Docente sin pauta',5:'María Ejemplo',6:'Pedro Ejemplo'}}};
S=normalize({tenant:'fen',carrera:'IC',tipoCuenta:'estudiante',onboardingDone:true,modo,userName:'Cuenta sintética',ramos:[]});S.modo=modo;applyTheme();
searchCatalog=()=>[{nombre:'Ramo de ejemplo',sigla:'SYN909',creditos:10,semestre:4,tienePreset:false}];
document.querySelector('.app').classList.add('tab-mode');document.querySelectorAll('.screen').forEach(e=>{e.classList.remove('active');e.hidden=!['screen-home','screen-ramo'].includes(e.id)});document.getElementById('screen-home').classList.add('active');openAddRamoModal();
},modo);
const select=p.locator('.ramo-seccion-selector select');assert.equal(await select.inputValue(),'');
assert.match(await p.locator('.ramo-seccion-selector p').innerText(),/sin sección confirmada/);
await select.selectOption('4');assert.match(await p.locator('.ramo-seccion-selector p').innerText(),/sección 4/);
await select.selectOption('5');assert.equal(await p.locator('.ramo-seccion-selector p').isVisible(),false);
assert((await select.boundingBox()).height>=44);const contrasteSelector=await select.evaluate(e=>{const lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);const a=lum(getComputedStyle(e).color),b=lum(getComputedStyle(e).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});assert(contrasteSelector>=4.5);console.log(modo+' contraste selector '+contrasteSelector.toFixed(2));await p.waitForTimeout(220);
await p.screenshot({path:path.join(out,'selector-375-'+modo+'.png')});
await p.locator('#m-ramo-search').fill('Ramo de ejemplo');await p.locator('.ramo-seccion-selector select').selectOption('5');await p.locator('#m-add-ramo-btn').click();assert.equal(await p.evaluate(()=>S.ramos[0].seccion),5);assert.equal(await p.evaluate(()=>S.ramos[0].categorias.length),2);
await p.evaluate(()=>{const r=S.ramos[0];globalThis.__antes=JSON.stringify(r);globalThis.__id=r.id;r.seccion=6;openRamo(r.id);});
const oferta=p.locator('#pauta-cambio');assert.match(await oferta.innerText(),/Hay pauta de la sección 6/);
for(const boton of await oferta.locator('button').all()){const box=await boton.boundingBox();assert(box.width>=44&&box.height>=44);}
await p.waitForTimeout(300);await oferta.scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'oferta-375-'+modo+'.png')});
const contrastes=await p.evaluate(()=>{const lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);return [...document.querySelectorAll('#pauta-cambio p,#pauta-cambio button')].map(e=>{const a=lum(getComputedStyle(e).color),b=lum(getComputedStyle(document.getElementById('pauta-cambio')).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});});assert(contrastes.every(v=>v>=4.5),contrastes);console.log(modo+' contraste oferta '+contrastes.map(v=>v.toFixed(2)).join('/'));
await p.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await oferta.evaluate(e=>e.getBoundingClientRect().right<=innerWidth),true);await p.evaluate(()=>document.documentElement.style.fontSize='');
await oferta.getByRole('button',{name:'Cargarla',exact:true}).click();assert.match(await p.locator('#confirm-desc').innerText(),/Reemplaza tus evaluaciones/);
await p.locator('#confirm-action').click();assert.equal(await p.evaluate(()=>S.ramos[0].categorias[0].nombre),'Trabajo');
assert.equal(await oferta.isVisible(),false);
// Camino de Calificar: usa completarFechasOficiales antes del respaldo, sin editar esa fuente.
await p.evaluate(()=>{const r=S.ramos[0];r.categorias=[];r.gates=[];r.seccion=null;save();r.seccion=5;completarFechasOficiales(r,{tenant:S.tenant,carrera:S.carrera});save();});
assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('gradehub_v1')).ramos[0].categorias[0].nombre),'Prueba');
assert.deepEqual(errors,[]);await p.close();
}
console.log('PASS navegador: selector nativo 4/5/otra, guardar sección, oferta sin notas, confirmación, 44pt, contraste claro/oscuro, 200%, carga por camino compartido de calificar');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
