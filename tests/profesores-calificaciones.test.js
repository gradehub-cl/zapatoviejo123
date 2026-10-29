// Calificaciones de profesores sobre PostgreSQL real en memoria. Solo cuentas y ramos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const db=new PGlite(),u=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const soy=async i=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i?u(i):'']);await db.exec('set role authenticated');};
let periodo;
const ramo=(id,seccion)=>({id,nombre:'Curso sintético',seccion,origen:{tenant:'uc',ramoKey:'TEST101'},categorias:[{nombre:'Control ficticio',peso:100,notas:[{valor:4.7}]}]});
// Cuentas 1-3 y 7 en la sección 1, 4-6 en la 2, 9-11 en la 3; la 8 no tiene ramos.
const seccionDe=i=>i<=3||i===7?1:i<=6?2:i>=9?3:null;
const idDe=i=>'ramo-'+i;
const informar=(i,nombre)=>q('select profesor_docente_informar($1,$2,$3,$4)',[idDe(i),seccionDe(i),periodo,nombre]);
const calificar=(i,estrellas,etiquetas=[],p=periodo)=>q('select profesor_calificar($1,$2,$3,$4,$5)',[idDe(i),seccionDe(i),p,estrellas,etiquetas]);
const estado=async i=>(await q('select * from profesor_calificacion_estado($1,$2,$3)',[idDe(i),seccionDe(i),periodo]))[0];
const cinco=(p=periodo)=>q('select * from profesores_cinco_estrellas($1)',[p]);
(async()=>{try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec('create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb);');
  await db.exec('alter default privileges in schema public grant execute on functions to anon, authenticated;');
  await db.exec(read('supabase/profesores.sql'));
  await db.exec(read('supabase/profesores.sql'));
  periodo=(await q('select profesor_periodo_actual() as p'))[0].p;
  for(let i=1;i<=11;i++){
    await db.query('insert into auth.users(id,email) values($1,$2)',[u(i),`sintetico${i}@example.invalid`]);
    await db.query('insert into user_ramos values($1,$2)',[u(i),JSON.stringify({tenant:'uc',ramos:seccionDe(i)?[ramo(idDe(i),seccionDe(i))]:[]})]);
  }
  const snapshots=await q('select data from user_ramos order by user_id');

  // Antes de decir quién es no se califica; sin consenso sí, y cuenta para el nombre propio.
  await soy(1);
  assert.deepEqual({...await estado(1),etiquetas:null},{docente:null,total:0,promedio:null,etiquetas:null,mi_estrellas:null,mi_etiquetas:null,mi_otro:null,puede_calificar:true,mi_otros:null});
  await assert.rejects(calificar(1,5),/profesor sin informar/);
  await informar(1,'María José Pérez');
  await calificar(1,5,['buena_onda','exigente','buena_onda']);
  let e=await estado(1);
  assert.equal(e.docente,'María José Pérez');assert.equal(e.total,1);assert.equal(e.promedio,null,'una sola no se publica');
  assert.equal(e.mi_estrellas,5);assert.deepEqual(e.mi_etiquetas,['buena_onda','exigente'],'etiquetas sin duplicados');
  assert.deepEqual(await cinco(),[{tenant:'uc',ramo_clave:'test101',seccion:1,periodo,nombre:'María José Pérez'}],
    'las cinco estrellas quedan disponibles para el propio Wrapped sin esperar consenso');
  for(const i of [2,3]){await soy(i);await informar(i,'María José Pérez');}
  for(const i of [4,5,6]){await soy(i);await informar(i,'Maria Jose Perez');}
  for(const i of [9,10,11]){await soy(i);await informar(i,'Ricardo González');}

  // Con el consenso, la calificación previa cuenta; una o dos no publican.
  await soy(1);e=await estado(1);
  assert.equal(e.docente,'María José Pérez');assert.equal(e.puede_calificar,true);
  assert.equal(e.total,1);assert.equal(e.promedio,null);assert.deepEqual(e.etiquetas,[]);
  await calificar(1,5,['buena_onda','exigente']);assert.equal((await estado(1)).total,1,'repetir no suma votos');
  await soy(2);await calificar(2,4,['buena_onda']);
  assert.equal((await estado(2)).mi_estrellas,4,'cada cuenta ve solo la suya');
  assert.equal((await estado(2)).promedio,null,'dos calificaciones no publican');

  // Validación en el servidor; las etiquetas de la clase ya no valen.
  await assert.rejects(calificar(2,6),/calificación inválida/);
  await assert.rejects(calificar(2,0),/calificación inválida/);
  await assert.rejects(calificar(2,3,['buena_onda','exigente','paciente','puntual']),/etiquetas inválidas/);
  await assert.rejects(calificar(2,3,['explica_claro']),/etiquetas inválidas/);
  await assert.rejects(calificar(2,3,[],'2020-1'),/período no vigente/);
  assert.equal((await estado(2)).mi_estrellas,4,'un rechazo no pisa la calificación guardada');

  // Con tres se publica; una etiqueta necesita dos cuentas.
  await soy(3);await calificar(3,3);
  e=await estado(3);
  assert.equal(e.total,3);assert.equal(Number(e.promedio),4);
  assert.deepEqual(e.etiquetas,[{etiqueta:'buena_onda',n:2}]);

  // «Otro»: privado hasta que tres cuentas coinciden, sin tildes ni mayúsculas.
  const otro=(i,texto,etiquetas=[])=>q('select profesor_calificar($1,$2,$3,$4,$5,$6)',[idDe(i),seccionDe(i),periodo,4,etiquetas,texto]);
  await soy(1);await otro(1,'Transmite calma',['buena_onda']);
  assert.equal((await estado(1)).mi_otro,'Transmite calma','la propia se guarda y solo la ve quien la escribió');
  assert(!(await estado(1)).etiquetas.some(x=>x.texto),'con una cuenta no se publica el texto');
  for(const texto of ['Idiota','weón','Profe 123','abcdefghijklmnopqrstu'])await assert.rejects(otro(1,texto),/texto no permitido/);
  await assert.rejects(otro(1,'Transmite calma',['amable','puntual','paciente']),/etiquetas inválidas/,'Otro cuenta dentro del máximo de tres');
  assert.equal((await estado(1)).mi_otro,'Transmite calma','rechazar no pisa lo guardado');
  await otro(1,'abcdefghijklmnopqrst');assert.equal((await estado(1)).mi_otro.length,20,'el límite de 20 se acepta');
  await otro(1,'Transmite calma');
  // Repetir la misma etiqueta en tres semestres no equivale a tres cuentas.
  await db.exec('reset role');
  for(const p of ['2025-1','2025-2']){
    for(const i of [1,2,3])await db.query("insert into profesor_aportes(user_id,tenant,ramo_clave,seccion,periodo,nombre) values($1,'uc','test101',1,$2,'María José Pérez')",[u(i),p]);
    await db.query("insert into profesor_calificaciones(user_id,tenant,ramo_clave,seccion,periodo,estrellas,otro,otros) values($1,'uc','test101',1,$2,4,'Transmite calma',array['Transmite calma'])",[u(1),p]);
  }
  await soy(1);assert(!(await estado(1)).etiquetas.some(x=>x.texto),'el umbral exige cuentas distintas');
  await db.exec("reset role; delete from profesor_calificaciones where periodo in ('2025-1','2025-2'); delete from profesor_aportes where periodo in ('2025-1','2025-2');");
  await soy(2);await otro(2,'TRANSMITE CÁLMA');
  assert(!(await estado(2)).etiquetas.some(x=>x.texto),'con dos cuentas todavía no se publica');
  await soy(3);await otro(3,'transmite calma');
  let escrito=(await estado(3)).etiquetas.find(x=>x.texto);
  assert.equal(escrito.n,3);
  assert.equal(escrito.texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),'transmite calma');
  assert.equal((await estado(3)).mi_otro,'transmite calma');
  await db.exec('reset role');await db.exec(read('supabase/profesores.sql'));
  await soy(1);assert.equal((await estado(1)).mi_otro,'Transmite calma','reaplicar conserva Otro');
  // La llamada antigua sin p_otro sigue funcionando y permite quitarlo.
  await calificar(1,5,['buena_onda','exigente']);assert.equal((await estado(1)).mi_otro,null);
  await soy(2);await calificar(2,4,['buena_onda']);
  await soy(3);await calificar(3,3);assert.equal((await estado(3)).mi_otro,null);
  assert(!(await estado(3)).etiquetas.some(x=>x.texto),'deja de publicarse al bajar del umbral');

  // Hasta tres escritas, dentro del máximo de tres etiquetas en total.
  const otros=(i,textos,etiquetas=[])=>q('select profesor_calificar($1,$2,$3,$4,$5,null,$6)',[idDe(i),seccionDe(i),periodo,4,etiquetas,textos]);
  await soy(1);await otros(1,['Transmite calma',' Clases  claras ','transmite cálma']);
  e=await estado(1);
  assert.deepEqual(e.mi_otros,['Transmite calma','Clases claras'],'sin repetidas ni espacios de más');
  assert.equal(e.mi_otro,'Transmite calma','la app anterior ve la primera');
  await otros(1,['Uno bueno','Dos bueno','Tres bueno']);
  assert.equal((await estado(1)).mi_otros.length,3,'las tres pueden ser escritas');
  await assert.rejects(otros(1,['Uno bueno','Dos bueno'],['amable','puntual']),/etiquetas inválidas/,'tres en total');
  await assert.rejects(otros(1,['Uno bueno','Idiota']),/texto no permitido/);
  assert.equal((await estado(1)).mi_otros.length,3,'rechazar no pisa lo guardado');
  // Cada escrita se publica por separado, con tres cuentas que la escriben.
  await otros(1,['Clases claras','Muy ordenado']);
  for(const i of [2,3]){await soy(i);await otros(i,['clases claras']);}
  assert.deepEqual((await estado(3)).etiquetas.filter(x=>x.texto).map(x=>[x.texto.toLowerCase(),x.n]),[['clases claras',3]]);
  // Una calificación de antes de `otros` (solo `otro`) se copia al reaplicar.
  await db.exec(`reset role; update profesor_calificaciones set otros='{}', otro='Transmite calma' where user_id='${u(2)}'`);
  await db.exec(read('supabase/profesores.sql'));
  await soy(2);assert.deepEqual((await estado(2)).mi_otros,['Transmite calma'],'reaplicar copia el «Otro» antiguo');
  await soy(1);await calificar(1,5,['buena_onda','exigente']);
  await soy(2);await calificar(2,4,['buena_onda']);
  await soy(3);await calificar(3,3);assert.deepEqual((await estado(3)).mi_otros,[]);

  // Junta las secciones del mismo docente en este ramo; otro docente queda aparte.
  await soy(4);await calificar(4,1,['exigente']);
  for(const i of [9,10,11]){await soy(i);await calificar(i,1,['puntual']);}
  await soy(1);e=await estado(1);
  assert.equal(e.total,4);assert.equal(Number(e.promedio),3.3);
  assert.deepEqual(e.etiquetas,[{etiqueta:'buena_onda',n:2},{etiqueta:'exigente',n:2}]);
  await soy(9);e=await estado(9);assert.equal(e.docente,'Ricardo González');assert.equal(e.total,3);assert.equal(Number(e.promedio),1);

  // Quien dijo «es otra persona» califica a la suya, no al publicado.
  await soy(7);await informar(7,'Otra Persona Distinta');await calificar(7,1,['exigente']);
  e=await estado(7);assert.equal(e.docente,'María José Pérez');assert.equal(e.mi_estrellas,1);assert.equal(e.total,4);

  // Semestres anteriores del mismo docente también cuentan.
  await db.exec('reset role');
  for(const i of [5,6,7]){
    await db.query("insert into profesor_aportes values($1,'uc','test101',1,'2025-1','María José Pérez')",[u(i)]);
    await db.query("insert into profesor_calificaciones(user_id,tenant,ramo_clave,seccion,periodo,estrellas) values($1,'uc','test101',1,'2025-1',5)",[u(i)]);
  }
  await soy(1);e=await estado(1);assert.equal(e.total,7);assert.equal(Number(e.promedio),4);

  // Acceso: nada directo a la tabla, nada sin sesión, nada fuera del semestre.
  await assert.rejects(q('select * from profesor_calificaciones'),/permission denied/);
  await assert.rejects(q("update profesor_calificaciones set estrellas=1"),/permission denied/);
  await assert.rejects(q('select profesor_docente_publico($1,$2,1,$3)',['uc','test101',periodo]),/permission denied/);
  await assert.rejects(q('select profesor_etiquetas_validas()'),/permission denied/);
  await soy(8);await assert.rejects(q('select * from profesor_calificacion_estado($1,1,$2)',['ramo-1',periodo]),/no sincronizados/);
  await soy(0);await assert.rejects(estado(1),/sin sesión/);
  await db.exec('reset role; set role anon');
  await assert.rejects(estado(1),/permission denied/);
  await assert.rejects(calificar(1,5),/permission denied/);
  await db.exec('reset role');
  assert.equal((await q("select relrowsecurity from pg_class where oid='public.profesor_calificaciones'::regclass"))[0].relrowsecurity,true);

  // Si el consenso de la sección se cae, cada cuenta ve las estrellas del nombre
  // que informó: se juntan por docente, no por sección.
  await soy(3);await informar(3,'Otra Persona Distinta');
  e=await estado(3);assert.equal(e.docente,'Otra Persona Distinta');assert.equal(e.total,2);assert.equal(e.promedio,null);
  assert.equal(e.puede_calificar,true);assert.equal(e.mi_estrellas,3,'la propia se conserva');
  assert.equal((await q('select * from profesor_docente_estado($1,1,$2)',['ramo-3',periodo]))[0].nombre_publico,null,'la sección ya no publica el nombre');
  await soy(1);e=await estado(1);assert.equal(e.docente,'María José Pérez');assert.equal(e.total,6);assert.notEqual(e.promedio,null);
  await soy(3);await informar(3,'María José Pérez');

  // Un docente que pidió no aparecer deja de publicarse y de recibir calificaciones.
  await db.exec('reset role');
  await db.query("insert into profesor_ocultos(tenant,nombre) values('uc','Ricardo Gonzales')");
  await soy(9);e=await estado(9);
  assert.equal(e.docente,null);assert.equal(e.total,0);
  assert.equal((await q('select * from profesor_docente_estado($1,3,$2)',['ramo-9',periodo]))[0].nombre_publico,null);
  await assert.rejects(calificar(9,5),/profesor oculto/);
  assert.equal((await estado(9)).mi_estrellas,1,'la calificación anterior no se pisa');
  await informar(9,'Ricardo González');assert.equal((await estado(9)).docente,null,'volver a informarlo no lo publica');
  await soy(1);assert.equal((await estado(1)).docente,'María José Pérez','otro docente no se ve afectado');
  await assert.rejects(q('select * from profesor_ocultos'),/permission denied/);
  await assert.rejects(q("insert into profesor_ocultos(tenant,nombre) values('uc','María José Pérez')"),/permission denied/);
  await db.exec('reset role');await db.exec('delete from profesor_ocultos');

  await soy(3);await q('select profesor_calificacion_borrar($1,1,$2)',['ramo-3',periodo]);
  e=await estado(3);assert.equal(e.mi_estrellas,null);assert.equal(e.total,6);
  await db.exec('reset role');await db.query('delete from auth.users where id=$1',[u(2)]);
  assert.equal((await q('select count(*)::int n from profesor_calificaciones where user_id=$1',[u(2)]))[0].n,0);

  // Reaplicar conserva; nada toca datos académicos.
  await db.exec(read('supabase/profesores.sql'));
  assert.equal((await q('select count(*)::int n from profesor_calificaciones'))[0].n,9);
  assert.deepEqual(await q('select data from user_ramos where user_id<>$1 order by user_id',[u(2)]),snapshots.filter((_,i)=>i!==1));

  // Una fila con etiquetas de la lista anterior: al reaplicar pierde las que ya no existen y conserva sus estrellas.
  await db.exec('alter table profesor_calificaciones drop constraint profesor_calificaciones_etiquetas_check');
  await db.query("update profesor_calificaciones set etiquetas='{explica_claro,exigente,harta_carga}' where user_id=$1",[u(4)]);
  await db.exec(read('supabase/profesores.sql'));
  assert.deepEqual((await q('select estrellas,etiquetas from profesor_calificaciones where user_id=$1',[u(4)]))[0],{estrellas:1,etiquetas:['exigente']});
  await assert.rejects(q("update profesor_calificaciones set etiquetas='{explica_claro}' where user_id=$1",[u(4)]),/etiquetas_check/);

  // Las etiquetas de data.js son exactamente las que acepta la tabla.
  const ctx={};vm.createContext(ctx);vm.runInContext(read('data.js')+';this.E=PROFESOR_ETIQUETAS;',ctx);
  const sql=read('supabase/profesores.sql').match(/profesor_etiquetas_validas\(\)[\s\S]*?select array\[([^\]]*)\]/)[1].match(/'([a-z_]+)'/g).map(x=>x.slice(1,-1));
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.E.map(x=>x.id))).sort(),[...sql].sort());

  // Limpieza de #445: aborta con filas, borra si están vacías, no toca lo demás.
  await db.exec("create table public.profesores(id int); insert into public.profesores values(1); create table public.profesor_resenas(id int);");
  await assert.rejects(db.exec(read('supabase/profesores_445_limpieza.sql')),/tiene 1 filas/);
  await db.exec('rollback');
  assert.ok((await q("select to_regclass('public.profesor_resenas') t"))[0].t,'abortar no borra nada');
  await db.exec('delete from public.profesores');
  await db.exec(read('supabase/profesores_445_limpieza.sql'));
  assert.equal((await q("select to_regclass('public.profesores') t"))[0].t,null);
  assert.ok((await q("select to_regclass('public.profesor_calificaciones') t"))[0].t);

  // Wrapped: la preferencia es propia, por semestre y no depende del ramo activo.
  await soy(1);
  const favoritas=await cinco();
  assert.deepEqual(favoritas,[{tenant:'uc',ramo_clave:'test101',seccion:1,periodo,nombre:'María José Pérez'}]);
  await soy(4);assert.deepEqual(await cinco(),[],'una estrella no se selecciona ni aparecen las de otra cuenta');
  await soy(5);assert.deepEqual(await cinco('2025-1'),[
    {tenant:'uc',ramo_clave:'test101',seccion:1,periodo:'2025-1',nombre:'María José Pérez'}
  ],'recupera la sección histórica aunque hoy curse otra');
  assert.deepEqual(await cinco(),[],'no mezcla semestres');
  await soy(8);assert.deepEqual(await cinco(),[],'sin calificaciones devuelve una lista vacía');
  for(const p of [null,'','2026-3','2026-2\n'])await assert.rejects(cinco(p),/período inválido/);
  await soy(0);await assert.rejects(cinco(),/sin sesión/);
  await db.exec('reset role; set role anon');
  await assert.rejects(cinco(),/permission denied/);
  await db.exec('reset role');
  const academico=await q('select * from user_ramos order by user_id');
  await soy(1);await calificar(1,4);assert.deepEqual(await cinco(),[],'bajar a cuatro retira la preferencia');
  await calificar(1,5);assert.deepEqual(await cinco(),favoritas,'volver a cinco la recupera sin duplicar');
  await q('select profesor_calificacion_borrar($1,1,$2)',['ramo-1',periodo]);
  assert.deepEqual(await cinco(),[],'borrar la calificación retira la preferencia');
  await calificar(1,5);
  await informar(1,'Otro Docente Real');
  assert.equal((await cinco())[0].nombre,'Otro Docente Real','usa el nombre propio corregido, no el consenso público');
  await db.exec('reset role');
  await db.exec("insert into profesor_ocultos(tenant,nombre) values('uc','Otro Docente Real')");
  await soy(1);assert.deepEqual(await cinco(),[],'respeta la oposición del docente');
  await db.exec('reset role; delete from profesor_ocultos');
  assert.deepEqual(await q('select * from user_ramos order by user_id'),academico,'seleccionar no cambia notas ni ramos');
  // Tras cambiar de universidad o vaciar el semestre, conserva el contexto original.
  await db.query('update user_ramos set data=$2 where user_id=$1',[u(5),JSON.stringify({tenant:'fen',ramos:[]})]);
  await soy(5);assert.equal((await cinco('2025-1'))[0].tenant,'uc');
  await db.exec('reset role');
  await db.query("insert into profesor_aportes values($1,'uc','otro102',2,'2025-1','Camila Soto')",[u(5)]);
  await db.query("insert into profesor_calificaciones(user_id,tenant,ramo_clave,seccion,periodo,estrellas) values($1,'uc','otro102',2,'2025-1',5)",[u(5)]);
  await soy(5);assert.deepEqual((await cinco('2025-1')).map(x=>[x.ramo_clave,x.nombre]),[
    ['otro102','Camila Soto'],['test101','María José Pérez']
  ],'devuelve todos sus profesores con cinco estrellas, con el contexto de cada ramo');
  await db.exec('reset role');
  const guardadas=await q('select * from profesor_calificaciones order by user_id,periodo');
  await db.exec(read('supabase/profesores.sql'));
  assert.deepEqual(await q('select * from profesor_calificaciones order by user_id,periodo'),guardadas,'reaplicar conserva preferencias existentes');
  await soy(5);assert.equal((await cinco('2025-1')).length,2,'sigue consultable tras reaplicar');
  await assert.rejects(q('select * from profesor_aportes'),/permission denied/);
  await assert.rejects(q('select * from profesor_calificaciones'),/permission denied/);
  await db.exec('reset role');await db.query('delete from auth.users where id=$1',[u(5)]);
  await soy(5);assert.deepEqual(await cinco('2025-1'),[],'borrar la cuenta no deja preferencias huérfanas');
  // La sección no parte las estrellas: dos votos de la 13 y uno de la 14 ya publican,
  // aunque ninguna sección tenga tres para mostrar el nombre. Otro docente queda aparte.
  const otroRamo=(i,seccion)=>({id:'otro-'+i,nombre:'Otro curso sintético',seccion,origen:{tenant:'uc',ramoKey:'TEST202'},categorias:[]});
  const seccion202={20:13,21:13,22:14,23:14};
  await db.exec('reset role');
  for(const [i,s] of Object.entries(seccion202)){
    await db.query('insert into auth.users(id,email) values($1,$2)',[u(i),`sintetico${i}@example.invalid`]);
    await db.query('insert into user_ramos values($1,$2)',[u(i),JSON.stringify({tenant:'uc',ramos:[otroRamo(i,s)]})]);
  }
  const en202=async(i,fn,...args)=>{await soy(Number(i));return q(`select * from ${fn}($1,$2,$3${args.map((_,k)=>',$'+(k+4)).join('')})`,['otro-'+i,seccion202[i],periodo,...args]);};
  await en202(20,'profesor_docente_informar','Pamela Mena');await en202(20,'profesor_calificar',5,[]);
  await en202(21,'profesor_docente_informar','Pamela  Mena');await en202(21,'profesor_calificar',4,[]);
  await en202(23,'profesor_docente_informar','Otro Docente Sintético');await en202(23,'profesor_calificar',1,[]);
  assert.equal((await en202(20,'profesor_calificacion_estado'))[0].promedio,null,'con dos todavía no');
  await en202(22,'profesor_docente_informar','Pamela Mena');await en202(22,'profesor_calificar',3,[]);
  for(const i of [20,22]){
    e=(await en202(i,'profesor_calificacion_estado'))[0];
    assert.equal(e.total,3,'cuenta 13 y 14 juntas');assert.equal(Number(e.promedio),4);
    assert.equal((await en202(i,'profesor_docente_estado'))[0].nombre_publico,null,'el nombre sigue siendo por sección');
  }
  e=(await en202(23,'profesor_calificacion_estado'))[0];assert.equal(e.docente,'Otro Docente Sintético');assert.equal(e.total,1);assert.equal(e.promedio,null);
  console.log('OK calificaciones SQL: consenso, estrellas por docente sin importar la sección, Otro, cinco estrellas privadas para Wrapped, permisos, semestres, cascada y reaplicación');
}finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
