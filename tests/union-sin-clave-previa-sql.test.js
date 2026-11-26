// Toma de cuenta al unir Google o Apple a una cuenta de correo creada por otro
// (reproducida en producción el 2026-11-23). El SQL vive en el repo y se aplica
// a mano: estos chequeos fijan lo que no puede cambiar sin que nadie lo note.
const assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync(__dirname+'/../supabase/union_sin_clave_previa.sql','utf8');
const codigo=sql.split('\n').filter(l=>!/^\s*--/.test(l)).join('\n');
const cuerpo=(codigo.match(/as \$\$([\s\S]*?)\$\$/)||[])[1]||'';
const casos=[
  ['corre después de insertar una identidad, no en cada ingreso',()=>assert.match(codigo,/after insert on auth\.identities\s+for each row/i)],
  ['solo con Google o Apple',()=>assert.match(cuerpo,/new\.provider not in \('google', 'apple'\)[\s\S]*?return new;/)],
  ['solo si la cuenta ya tenía identidad de correo',()=>assert.match(cuerpo,/provider = 'email' and i\.id <> new\.id/)],
  ['borra la contraseña de ese usuario y nada más',()=>assert.match(cuerpo,/update auth\.users\s+set encrypted_password = ''\s+where id = new\.user_id/)],
  ['cierra solo las sesiones de ese usuario',()=>assert.match(cuerpo,/delete from auth\.sessions where user_id = new\.user_id;/)],
  ['no toca cuentas fuera del disparador (no es retroactivo)',()=>{
    const fuera=codigo.replace(/as \$\$[\s\S]*?\$\$/,'');
    assert.doesNotMatch(fuera,/\b(update|delete)\b/i);
  }],
  ['security definer con search_path vacío y sin permisos para clientes',()=>{
    assert.match(codigo,/security definer\s+set search_path = ''/);
    assert.match(codigo,/revoke all on function public\.gh_union_sin_clave_previa\(\) from public, anon, authenticated;/);
  }],
  ['reaplicable',()=>{assert.match(codigo,/create or replace function/);assert.match(codigo,/drop trigger if exists gh_union_sin_clave_previa on auth\.identities;/);}],
];
let fallos=0;
for(const [n,f] of casos){try{f();console.log('OK: '+n);}catch(e){fallos++;console.error('FAIL: '+n+' — '+e.message);}}
if(fallos)process.exitCode=1;
