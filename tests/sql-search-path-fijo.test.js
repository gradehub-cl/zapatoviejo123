// Supabase avisa («function_search_path_mutable») de cada función sin
// search_path fijo. Estas siete eran las que quedaban el 2026-11-26. Ninguna es
// security definer y todas usan solo funciones de pg_catalog, así que la ruta
// vacía no les cambia nada; el test evita que una edición la vuelva a soltar.
const fs=require('fs'),path=require('path');
const sql=f=>fs.readFileSync(path.join(__dirname,'..','supabase',f),'utf8');
const casos=[
  ['calendar_feed.sql','calendar_feed_new_token()'],
  ['profesor_alumnos.sql','clave_evaluacion(p_nombre text)'],
  ['clases_particulares.sql','detalles_clase_validos(d jsonb)'],
  ['clases_particulares.sql','linea_datos_clase_valida(l text[])'],
  ['clases_particulares.sql','rango_canal_alcance(p_canal text)'],
  ['clases_particulares.sql','tarifa_campana_clp(p_concepto text)'],
  ['permisos_tablas_base.sql','touch_updated_at()'],
];
let ok=0,fail=0;
for(const [archivo,firma] of casos){
  const texto=sql(archivo),inicio=texto.indexOf('create or replace function public.'+firma);
  // La cabecera va desde la firma hasta el cuerpo; ahí tiene que estar la ruta.
  const cabecera=inicio<0?'':texto.slice(inicio,texto.indexOf('$$',inicio));
  const bien=/set search_path\s*=\s*''/.test(cabecera);
  console.log(`  ${bien?'OK  ':'FAIL'} ${firma} fija su search_path`);
  bien?ok++:fail++;
}
console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
