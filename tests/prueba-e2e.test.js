// Las pruebas contra el proyecto de PRUEBA de Supabase (bin/prueba-e2e.js) crean
// y borran cuentas: lo primero que se prueba es que jamás corran contra
// producción. Sin red: lo que necesita Supabase lo prueba el workflow `prueba`.
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const raiz=path.join(__dirname,'..');
const m=require('../bin/prueba-e2e.js');
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const correr=env=>spawnSync(process.execPath,[path.join(raiz,'bin/prueba-e2e.js')],{env:{PATH:process.env.PATH,...env},encoding:'utf8'});

console.log('\n=== Nunca contra producción ===');
const prod=m.urlProduccion();
chk('reconoce la URL de producción, con o sin / final', /^https:\/\/\w+\.supabase\.co$/.test(prod)&&m.mismoProyecto(prod,prod+'/')&&m.mismoProyecto(prod.toUpperCase(),prod));
const r=correr({PRUEBA_SUPABASE_URL:prod,PRUEBA_PUBLISHABLE_KEY:'x',PRUEBA_SECRET_KEY:'y'});
chk('con la URL de producción se niega antes de tocar nada', r.status===1&&/producción/.test(r.stderr));
const wf=fs.readFileSync(path.join(raiz,'.github/workflows/prueba.yml'),'utf8');
chk('el workflow tampoco aplica SQL ni copia el esquema hacia producción', (wf.match(/PRUEBA_DB_URL apunta a producción/g)||[]).length===2);
chk('la copia de producción es solo de definiciones, sin filas', /pg_dump" "\$PRODUCCION_DB_URL" --schema-only/.test(wf));
chk('y espera aprobación: va en su propio environment', /environment: produccion-esquema/.test(wf));

console.log('\n=== Sin configurar no rompe ===');
const s=correr({});
chk('avisa y termina bien', s.status===0&&/Falta configurar el proyecto de prueba/.test(s.stdout));

console.log('\n=== Qué revisa el borrado de cuenta ===');
const t=m.tablasDePersonas().map(x=>x.tabla+'.'+x.columna);
chk('las tres históricas', ['user_ramos.user_id','profiles.id','catalog_reports.user_id'].every(x=>t.includes(x)));
chk('las del repo con llave a auth.users', ['user_feedback.user_id','errores_app.user_id','visitas_diarias.user_id','curso_notas.user_id'].every(x=>t.includes(x)));
chk('todas las columnas de una tabla, no solo la primera', t.includes('profesor_alumnos.tutor_id')&&t.includes('profesor_alumnos.alumno_id'));

console.log('\n=== Lo que cubre ===');
const e2e=fs.readFileSync(path.join(raiz,'bin/prueba-e2e.js'),'utf8');
chk('aislamiento, sync condicional, contraseña y borrado', ['B no lee lo de A','no pisa si otro dispositivo escribió antes','la anterior ya no entra','quedó sin filas de la cuenta'].every(x=>e2e.includes(x)));
chk('las cuentas falsas se borran siempre, aunque algo falle', /finally \{\s*for \(const id of personas\) await admin\.auth\.admin\.deleteUser/.test(e2e));
chk('correos de prueba, nunca de personas', /@ejemplo\.test/.test(e2e)&&!/@gmail|@uc\.cl|@fen\.uchile/.test(e2e));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
