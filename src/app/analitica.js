// ─── ANALYTICS ───────────────────────────────────────────────────────────────
// Google Analytics 4. El script va en index.html; si no cargó, esto no hace nada.
//
// REGLA: acá NUNCA van datos del usuario. Ni notas, ni nombres de ramos o
// evaluaciones, ni nada que escriba él. Solo conteos, banderas y el tenant.
// Queremos saber si la app se usa, no qué le fue mal a quién.
// tests/analitica.test.js falla si alguien manda una clave prohibida.
function track(event, params){
  try{ if(typeof gtag==='function') gtag('event', event, params||{}); }catch(e){}
}
