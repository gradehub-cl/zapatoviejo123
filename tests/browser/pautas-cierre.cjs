// QA manual con navegador real: solo fixtures y red externa bloqueada.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const repo=path.resolve(__dirname,'../..');
(async()=>{
const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
const page=await browser.newPage({viewport:{width:375,height:850},reducedMotion:'reduce',serviceWorkers:'block'});const errores=[];page.on('pageerror',e=>errores.push(e.message));
await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='qa.test')return route.abort();const p=path.join(repo,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(p))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(p),contentType:p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream'});});
await page.goto('https://qa.test/');await page.waitForTimeout(400);
const salida=process.env.PAUTAS_CIERRE_CAPTURAS||'/tmp/gradehub-pautas-cierre-qa';fs.mkdirSync(salida,{recursive:true});
await page.evaluate(()=>{
 S.tenant='uc';S.onboardingDone=true;currentUser={id:'cuenta-sintetica'};window.rpcQA=[];
 supabaseClient={storage:{from:()=>({upload:async()=>({data:{},error:null}),createSignedUrl:async()=>{throw Error('Red sintética');}})},rpc:async(n,p)=>{rpcQA.push({n,p});if(n==='admin_pautas_banco')return{data:[{sigla:'SYN100',nombre:'Ramo sintético con un nombre más largo',periodo:'2026-2',periodo_catalogo:null,pauta:{evals:[['Pruebas',60],['Examen',40]]},fuente:null,faltantes:['Documento fuente no registrado'],estado:'en_disputa',nota_interna:'',variantes:[{personas:4,origen:'explicito',seccion:2,estructura:[{nombre:'Pruebas',peso:60},{nombre:'Examen',peso:40}],comentarios:['Comentario de prueba.']}]}],error:null};if(n==='admin_discrepancias_pauta')return{data:[],error:null};if(n==='admin_guardar_pauta_banco')return{data:'id',error:null};return{data:[],error:null};}};
 const rpcBaseQA=supabaseClient.rpc;supabaseClient.rpc=async(n,p)=>{const r=await rpcBaseQA(n,p);if(n==='admin_pautas_banco')r.data.push({...r.data[0],sigla:'SYN200',nombre:'Otra pauta sintética'});return r;};
 document.querySelectorAll('.screen,.auth-overlay,.onboarding-overlay').forEach(e=>e.hidden=true);
 document.getElementById('auth-overlay')?.remove();document.getElementById('onboarding')?.remove();
 const qa=document.createElement('div');qa.id='qa-banco';qa.style='position:fixed;inset:0;overflow:auto;padding:20px;background:var(--bg);z-index:9990;box-sizing:border-box';document.body.append(qa);
});
await page.evaluate(()=>renderAdminPautas(document.getElementById('qa-banco')));
for(const width of [375,1280])for(const modo of ['claro','oscuro'])for(const grande of [false,true]){
 await page.setViewportSize({width,height:900});await page.evaluate(({modo,grande})=>{S.modo=modo;applyTheme();document.documentElement.style.fontSize=grande?'22px':'';},{modo,grande});
 await page.locator('.pautas-banco-fila summary').first().click();if(!await page.locator('.pautas-banco-fila').first().evaluate(e=>e.open))await page.locator('.pautas-banco-fila summary').first().click();
 assert(await page.locator('#qa-banco').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`banco overflow ${width} ${modo} ${grande}`);
 await page.screenshot({path:`${salida}/banco-${width}-${modo}-${grande?'grande':'normal'}.png`});
}
await page.locator('.pautas-banco-fila').nth(1).evaluate(e=>e.open=true);await page.locator('[data-pauta-form] textarea').nth(1).fill('Borrador sin guardar');await page.locator('[data-pauta-form] textarea').first().fill('Nota sintética del equipo');await page.locator('[data-pauta-form] select').first().selectOption('confirmada');await page.locator('[data-pauta-form] input[type=file]').first().setInputFiles({name:'programa.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nDatos completamente sintéticos\n%%EOF')});await page.locator('[data-pauta-form] [type=submit]').first().click();await page.getByText('Revisión guardada').waitFor();assert.equal(await page.locator('[data-pauta-form] textarea').nth(1).inputValue(),'Borrador sin guardar','guardar una ficha conserva el otro borrador');assert(await page.locator('.pautas-banco-fila summary').first().textContent().then(t=>t.includes('Confirmada')));assert.equal(await page.locator('[data-pauta-documento]').count(),1);await page.locator('[data-pauta-documento]').click();await page.waitForTimeout(200);assert.equal(page.context().pages().length,1,'el fallo de red cierra la ventana vacía');
await page.evaluate(()=>{document.getElementById('qa-banco').remove();S.ramos=[{id:'r1',nombre:'Ramo sintético',creditos:10,categorias:[{id:'c1',nombre:'Pruebas',peso:60,directNota:true,notas:[{id:'n1',nombre:'Prueba',valor:5,peso:1}]},{id:'c2',nombre:'Examen',peso:40,directNota:true,notas:[]}],gates:[]}];confirmArchiveSemester();});
for(const width of [375,1280])for(const modo of ['claro','oscuro'])for(const grande of [false,true]){
 await page.setViewportSize({width,height:900});await page.evaluate(({modo,grande})=>{S.modo=modo;applyTheme();document.documentElement.style.fontSize=grande?'22px':'';},{modo,grande});
 assert(await page.locator('#modal .modal-sheet').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`cierre overflow ${width} ${modo} ${grande}`);
 await page.screenshot({path:`${salida}/cierre-${width}-${modo}-${grande?'grande':'normal'}.png`});
}
await page.locator('#cierre-oficial-0').fill('4,7');await page.locator('#form-cierre-semestre [type=submit]').click();await page.waitForTimeout(100);
assert.equal(await page.evaluate(()=>S.historial[0].ramos[0].notaOficial),4.7);assert.equal(await page.evaluate(()=>S.ramos.length),0);
console.log(JSON.stringify({qa:'PASS',capturas:salida,errores}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
