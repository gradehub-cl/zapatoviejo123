const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ctx={esc:s=>String(s),criteriosClaseValidos:()=>true,costoCampanaClase:()=>({agotada:false})};vm.createContext(ctx);
const s=fs.readFileSync(__dirname+'/../src/marketplace/metricas-anuncios.js','utf8');vm.runInContext(s.slice(s.indexOf('// Denominador agregado solo')),ctx);
ctx.a={criterios:{promedioMenorA:5.5,avanceMinimo:20}};ctx.p={activos:100,activos_ramo:50,vieron:4,abrieron:2,contactaron:1,desde:'2026-11-01',hasta:'2026-11-04'};
let html=vm.runInContext('publicoAdminAnuncioHTML(a,p)',ctx);assert(html.includes('8,0%'));assert(html.includes('4,0%'));assert(html.includes('2,0%'));assert(html.includes('Causas posibles'));assert(html.includes('la X'));assert(!html.includes('ring'));assert.equal((html.match(/<progress /g)||[]).length,4);
ctx.p.vieron=50;assert(!vm.runInContext('publicoAdminAnuncioHTML(a,p)',ctx).includes('Causas posibles'));ctx.p.activos_ramo=0;assert(!vm.runInContext('publicoAdminAnuncioHTML(a,p)',ctx).includes('Infinity'));assert(vm.runInContext('publicoAdminAnuncioHTML(a,null)',ctx).includes('no disponible'));
(async()=>{ctx.supabaseClient={rpc:async()=>({error:{code:'PGRST202'}})};assert.equal(await vm.runInContext('publicoAdminAnuncio(a)',ctx),null);console.log('OK barras paralelas, base común, umbral, cero y SQL ausente');})().catch(e=>{console.error(e);process.exitCode=1});
