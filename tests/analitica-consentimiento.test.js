const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const app=fs.readFileSync(__dirname+'/../app.js','utf8');
const bootstrap=(html.match(/<script id="analytics-bootstrap">([\s\S]*?)<\/script>/)||[])[1];
assert(bootstrap,'la analítica necesita una puerta de consentimiento, no un script remoto al entrar');
assert(!/<script\b[^>]*src="https:\/\/www.googletagmanager.com/.test(html),'no cargar Google antes de consentir');
function visita(valor,falloStorage=false){
  const guardado=new Map(valor?[['gradehub_analitica_v1',valor]]:[]),scripts=[],eventos={};
  let recargas=0;
  const ctx={window:{addEventListener:(tipo,fn)=>eventos[tipo]=fn},
    location:{origin:'https://ejemplo.invalid',pathname:'/',search:'?token=privado',hash:'#access_token=privado',reload(){recargas++;}},
    localStorage:{getItem:k=>{if(falloStorage)throw Error('bloqueado');return guardado.get(k)||null;},setItem:(k,v)=>{if(falloStorage)throw Error('bloqueado');guardado.set(k,v);}},
    document:{createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}},Date};
  ctx.window.location=ctx.location;vm.createContext(ctx);vm.runInContext(bootstrap,ctx);
  vm.runInContext(app.match(/function track\(event, params\)\{[\s\S]*?\n\}/)[0],ctx);
  return {ctx,scripts,guardado,eventos,get recargas(){return recargas;},run:s=>vm.runInContext(s,ctx)};
}
for(const dato of [null,'corrupto',JSON.stringify({aceptada:false,version:'2026-10-29'}),JSON.stringify({aceptada:true,version:'antigua'})]){
  const v=visita(dato);v.run("track('ramo_add',{del_catalogo:true})");
  assert.equal(v.scripts.length,0);assert(!v.ctx.window.dataLayer,'sin consentimiento no hay cola para enviar más tarde');
}
const bloqueada=visita(null,true);assert.equal(bloqueada.scripts.length,0);
const v=visita();v.run('cambiarConsentimientoAnalitica(true)');
assert.equal(v.scripts.length,1);assert.equal(v.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-TS791S6PDM');
v.run("track('ramo_add',{del_catalogo:true})");
assert(v.ctx.window.dataLayer.some(e=>e[0]==='event'&&e[1]==='ramo_add'));
assert(!JSON.stringify(v.ctx.window.dataLayer).includes('privado'),'no enviar fragmentos, consultas ni referrer privados');
assert.equal(JSON.parse(v.guardado.get('gradehub_analitica_v1')).aceptada,true);
const anterior=v.ctx.window.dataLayer.length;
v.run('cambiarConsentimientoAnalitica(false)');v.run("track('ramo_add')");
assert.equal(v.ctx.window.dataLayer.length,anterior,'revocar no manda ni siquiera otro evento de consentimiento');
assert.equal(v.recargas,1,'recargar elimina los listeners automáticos del tercero');
assert.equal(visita(v.guardado.get('gradehub_analitica_v1')).scripts.length,0);
const otra=visita(JSON.stringify({aceptada:true,version:'2026-10-29'}));
otra.eventos.storage({key:'gradehub_analitica_v1',newValue:JSON.stringify({aceptada:false,version:'2026-10-29'})});
assert.equal(otra.recargas,1,'revocación en otra pestaña también detiene el tercero');
assert(![...v.guardado.keys()].some(k=>k==='gradehub_v1'),'la preferencia no modifica las notas');
console.log('Analítica: consentimiento previo, revocación y aislamiento de URLs OK');
