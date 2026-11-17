// Prueba local de viabilidad; NO lector de producción, red, cron ni Supabase.
// Estructura observada en la página oficial UAndes el 2026-11-12:
// https://www.uandes.cl/estudiantes/informacion-academica/calendario-academico/
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function muestraCalendario(html){
 const eventos=[...html.matchAll(/<article\b([^>]*)>/gi)].map(m=>Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]]))).filter(a=>(a.class||'').split(/\s+/).includes('cal-source-event'));
 if(!eventos.length)throw Error('Estructura desconocida; no sustituir datos anteriores');
 return eventos.filter(a=>a['data-scope']==='public'&&['informacion-academica','feriados','toma-de-ramos'].includes(a['data-category'])).map(a=>{
  const fecha=a['data-date'],titulo=a['data-title'];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha||'')||!Number.isFinite(Date.parse(fecha))||new Date(fecha).toISOString().slice(0,10)!==fecha||!titulo)throw Error('Fecha o título inválido');
  return {fecha,titulo:titulo.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;/g,"'"),categoria:a['data-category']};
 });
}
if(require.main===module){
 const html=fs.readFileSync(path.join(__dirname,'../tests/fixtures/fuentes/calendario-uandes-sintetico.html'),'utf8'),eventos=muestraCalendario(html);
 assert.deepEqual(eventos.map(e=>e.fecha),['2099-03-01','2099-03-02']);
 assert.equal(eventos[0].titulo,'Inicio sintético & revisión');
 assert(!JSON.stringify(eventos).includes('gestión interna'));
 assert.throws(()=>muestraCalendario('<html>Sin estructura</html>'),/desconocida/);
 assert.throws(()=>muestraCalendario(html.replace('2099-03-01','2099-02-30')),/inválido/);
 console.log('PASS prueba local: estructura HTML, fecha ISO, entidades, exclusión interna/social y fallo ante cambios. Sin red.');
}
module.exports={muestraCalendario};
