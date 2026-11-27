// Funciones que solo tienen sentido con sesión: nadie sin cuenta debería poder
// llamarlas. En producción `anon` podía ejecutarlas (aviso
// «anon_security_definer_function_executable» de Supabase, 2026-11-26) porque
// los archivos se lo quitaban a `public` o a nadie, y Supabase le da a `anon`
// su propio permiso por defecto. No exponían datos —todas filtran por
// auth.uid()—, pero el permiso sobraba.
const fs=require('fs'),path=require('path');
const sql=f=>fs.readFileSync(path.join(__dirname,'..','supabase',f),'utf8');
const casos=[
  ['calendar_feed.sql','calendar_feed_token()'],
  ['calendar_feed.sql','calendar_feed_revoke()'],
  ['agente_mcp.sql','crear_codigo_agente()'],
  ['agente_mcp.sql','listar_agentes()'],
  ['agente_mcp.sql','revocar_agente(uuid)'],
  ['curso_posicion.sql','curso_nota_set(text, text, numeric)'],
  ['curso_posicion.sql','curso_posicion(text, text)'],
];
const literal=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let ok=0,fail=0;
const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);c?ok++:fail++;};
for(const [archivo,firma] of casos){
  const texto=sql(archivo),f=literal(firma);
  chk(`${firma}: se le quita a public y a anon`,new RegExp(`revoke all on function public\\.${f}\\s+from public, anon;`).test(texto));
  chk(`${firma}: queda para authenticated y no se le devuelve a anon`,
    new RegExp(`grant execute on function public\\.${f}\\s+to authenticated;`).test(texto)
    &&!new RegExp(`grant execute on function public\\.${f}\\s+to[^;]*anon`).test(texto));
}
// El revoke tiene que ir antes del grant: al revés, el archivo le quitaría el
// permiso también a authenticated cada vez que se corre de nuevo.
for(const archivo of [...new Set(casos.map(c=>c[0]))]){
  const texto=sql(archivo);
  const mal=casos.filter(c=>c[0]===archivo).filter(([,firma])=>{
    const r=texto.lastIndexOf('revoke all on function public.'+firma),g=texto.lastIndexOf('grant execute on function public.'+firma);
    return r<0||g<0||r>g;
  });
  chk(`${archivo}: cada revoke va antes de su grant`,mal.length===0);
}
console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
