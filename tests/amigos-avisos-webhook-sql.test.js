// El disparador que manda avisos_salientes a la Edge Function avisos-push.
const fs=require('fs'),assert=require('assert/strict');
const sql=fs.readFileSync(__dirname+'/../supabase/amigos_avisos_webhook.sql','utf8');
let ok=0;const chk=(n,c)=>{assert.ok(c,n);ok++;console.log('  OK   '+n);};
chk('el secreto sale de Vault, nunca va en el archivo',/vault\.decrypted_secrets where name = 'avisos_push_secreto'/.test(sql)&&!/[0-9a-f]{32,}/.test(sql));
chk('sin secreto no llama a nada',/if s is null then return new;/.test(sql));
chk('security definer con search_path vacío',/security definer\s+set search_path = ''/.test(sql));
chk('nadie fuera del servidor puede llamarla',/revoke all on function public\.avisos_salientes_llamar\(\) from public, anon, authenticated;/.test(sql));
chk('mismo cuerpo que espera la función',/'type', 'INSERT', 'table', 'avisos_salientes'/.test(sql)&&/'record', to_jsonb\(new\)/.test(sql));
chk('reaplicable',/create or replace function/.test(sql)&&/drop trigger if exists avisos_push/.test(sql));
console.log(`\nPASS: ${ok}   FAIL: 0`);
