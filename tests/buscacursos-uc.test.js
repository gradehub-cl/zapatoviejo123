// HTML público mínimo y cuentas SQL sintéticas. Nunca red en npm test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {parsearBuscacursos:parsear,crearLector,recolectar,validarCobertura,periodoActual,siguientePeriodo,correspondeProgramado,UA,urlBusqueda}=require('../bin/buscacursos-uc');
const {prepararLotes,subir,conteos}=require('../bin/buscacursos-uc-subir');
const {busquedaDe}=require('../bin/catalogo-uc-csv');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const dinamica=read('bin/fixtures/buscacursos-dinamica.html'),fisica=read('bin/fixtures/buscacursos-fisica.html'),vacio=read('bin/fixtures/buscacursos-vacio.html');
const base=parsear(dinamica).secciones[0];
const f={...base,periodo:'2026-2',nrc:1,sigla:'TST100',nombre:'Prueba sintética II',profesores:['Pérez María José','Docente Visible'],horario:[{dias:['L','W'],modulo:2,tipo:'CLAS',sala:'K201'}]};
const conDatos=(secciones=[f])=>({version:1,periodos:[{periodo:'2026-2',secciones}]});
(async()=>{
 assert.deepEqual(base.horario,[{dias:['L','W'],modulo:2,tipo:'CLAS',sala:'K201'},{dias:['J'],modulo:6,tipo:'AYU',sala:'B11'},{dias:['V'],modulo:2,tipo:'TAL',sala:'B14'}]);
 assert.deepEqual(parsear(dinamica.replace('TAL\n','LAB\n')).secciones[0].horario.map(h=>h.tipo),['CLAS','AYU','LAB']);
 assert.deepEqual(parsear(fisica).secciones[0].profesores,['Caprile Paola','Sanchez Beatriz']);
 assert(parsear(fisica).secciones.some(s=>s.horario.some(h=>h.tipo==='LAB')));
 const sin=dinamica.replace(/<a href="\?cxml_semestre=2026-2&amp;cxml_profesor=[^]*?<\/a>/,'(Sin Profesores)');
 assert.deepEqual(parsear(sin).secciones[0].profesores,[]);
 assert.equal(parsear(dinamica.replace('>2</td>\n<td style="font-size:13px;text-align:center;"><a','>0</td>\n<td style="font-size:13px;text-align:center;"><a')).secciones[0].vacantes_disponibles,0);
 assert.deepEqual(parsear(vacio).secciones,[]);
 for(const h of ['<html>Error</html>',dinamica.replace(/resultadosRowPar/g,'nuevaClase'),'<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/orchestrate"></script>',dinamica.replace('L-W:2','viernes a las dos')])assert.throws(()=>parsear(h));
 assert.equal(parsear(dinamica.replace('L-W:2',':')).secciones[0].horario[0].modulo,null);
 assert.deepEqual(parsear(dinamica.replace('L-W:2','L-M-W-J-V-S-D:')).secciones[0].horario[0].dias,['L','M','W','J','V','S','D']);
 assert.equal(parsear(dinamica+'<script>var x="/cdn-cgi/challenge-platform/scripts/jsd/main.js";</script>').secciones.length,1,'detección pasiva no es un desafío que reemplaza resultados');
 assert.throws(()=>validarCobertura(Array(69).fill(f),100),/70%/);assert.doesNotThrow(()=>validarCobertura(Array(70).fill(f),100));assert.throws(()=>validarCobertura([],0));
 assert.equal(periodoActual(new Date('2027-01-15T12:00Z')),'2026-2');assert.equal(periodoActual(new Date('2027-03-01T12:00Z')),'2027-1');assert.equal(siguientePeriodo('2026-2'),'2027-1');
 assert.equal(new URL(urlBusqueda('2026-2','20','E_')).searchParams.get('cxml_sigla'),'E'+String.fromCharCode(92)+'_','guion bajo literal, no comodín SQL');
 assert.equal(correspondeProgramado(new Date('2026-11-03T06:17Z')) ,true);assert.equal(correspondeProgramado(new Date('2026-11-03T08:17Z')),false);
 assert.equal(correspondeProgramado(new Date('2027-01-05T14:17Z'),{horaDiaria:3,ventanasToma:[{desde:'2027-01-05',hasta:'2027-01-06'}]}),true);
 let reloj=0,veces=0;const instantes=[],esperas=[];
 const lector=crearLector({reloj:()=>reloj,esperar:async ms=>{reloj+=ms;esperas.push(ms)},fetch:async(url,op)=>{assert.equal(op.headers['User-Agent'],UA);instantes.push(reloj);veces++;return {ok:veces!==1,status:veces===1?503:200,text:async()=>dinamica}}});
 await lector.pedir('https://buscacursos.uc.cl/');await lector.pedir('https://buscacursos.uc.cl/');assert.equal(lector.consultas,3);assert(instantes.slice(1).every((n,i)=>n-instantes[i]>=1000));assert(esperas.includes(1000));
 for(const [status,html] of [[403,'no'],[429,'no'],[200,'<title>Just a moment</title>']]){let llamadas=0;const l=crearLector({esperar:async()=>{},fetch:async()=>{llamadas++;return{ok:status===200,status,text:async()=>html}}});await assert.rejects(l.pedir('https://buscacursos.uc.cl/'),/Detenido/);assert.equal(llamadas,1);}
 let fallos=0;await assert.rejects(crearLector({esperar:async()=>{},fetch:async()=>{fallos++;throw Error('red')}}).pedir('x'),/3 reintentos/);assert.equal(fallos,4,'una consulta y como máximo tres reintentos');
 const unaUnidad=h=>h.replace(/<select name="cxml_unidad_academica"[^]*?<\/select>/,'<select name="cxml_unidad_academica"><option value="3">Física</option></select>');
 let consultas=0;
 const recorrido=await recolectar({periodo:'2026-2',log:()=>{},lector:{get consultas(){return consultas},pedir:async u=>{consultas++;const p=new URL(u).searchParams,pref=p.get('cxml_sigla');return unaUnidad(pref==='ZZZZZZ999'?vacio:!pref?dinamica+'Sólo se muestran los primeros 500 resultados.':pref==='F'?dinamica:vacio)}}});
 assert.equal(recorrido.periodos[0].secciones.length,1);assert.equal(consultas,39,'una semilla, una unidad recortada y 37 particiones, sin cuota por sección');
 // También acepta coincidencias interiores; no asume prefijo al leer una hoja.
 const interior=await recolectar({periodo:'2026-2',log:()=>{},lector:{consultas:40,pedir:async u=>{const pref=new URL(u).searchParams.get('cxml_sigla');return unaUnidad(pref==='ZZZZZZ999'?vacio:!pref?dinamica+'Sólo se muestran los primeros 500 resultados.':['F','I','S'].includes(pref)?dinamica:vacio)}}});assert.equal(interior.periodos[0].secciones.length,1);
 const publicada=(h,p)=>unaUnidad(h).replace('<option value="2026-2"  selected="selected">','<option value="2027-1" '+(p==='2027-1'?'selected="selected"':'')+'>2027 Primer Semestre</option><option value="2026-2" '+(p==='2026-2'?'selected="selected"':'')+'>');
 const ambos=await recolectar({ahora:new Date('2026-11-03T12:00Z'),log:()=>{},lector:{consultas:4,pedir:async u=>{const parametros=new URL(u).searchParams;return publicada(parametros.get('cxml_sigla')?vacio:dinamica,parametros.get('cxml_semestre'));}}});assert.deepEqual(ambos.periodos.map(p=>p.periodo),['2026-2','2027-1']);
 await assert.rejects(recolectar({periodo:'2026-2',anteriores:{'2026-2':100},log:()=>{},lector:{consultas:2,pedir:async u=>unaUnidad(new URL(u).searchParams.get('cxml_sigla')?vacio:dinamica)}}),/70%/);
 let aviso='';const preparados=prepararLotes(conDatos(),{catalogo:[{sigla:'TST100',creditos:8}],log:s=>aviso=s});assert.equal(preparados[0].secciones[0].busqueda,busquedaDe(f.nombre));assert.equal(preparados[0].secciones[0].creditos_catalogo,8);assert(/Créditos distintos/.test(aviso));
 const pedidos=[];const falso=async(url,op)=>{pedidos.push({url,op});return {ok:true,status:200,headers:new Headers({'content-range':'*/0'}),json:async()=>op.method==='GET'?[]:{leidas:1001}}};
 const muchos=conDatos(Array.from({length:1001},(_,i)=>({...f,nrc:i+1})));await subir({datos:muchos,url:'https://sintetico.invalid',clave:'secreto-sintetico',fetch:falso,catalogo:[],log:()=>{}});
 const lotes=pedidos.filter(p=>p.url.includes('lotes?'));assert.deepEqual(lotes.map(p=>JSON.parse(p.op.body).length),[1000,1]);assert(pedidos.at(-1).url.endsWith('rpc/catalogo_uc_secciones_consolidar'));assert(pedidos.every(p=>p.op.headers.apikey==='secreto-sintetico'));
 const antes=pedidos.length;await subir({datos:conDatos(),clave:null,log:()=>{}});assert.equal(pedidos.length,antes);
 let escrituras=0;await assert.rejects(subir({datos:conDatos(),url:'https://sintetico.invalid',clave:'k',catalogo:[],log:()=>{},fetch:async(url,op)=>{if(op.method!=='GET')escrituras++;return{ok:true,headers:new Headers({'content-range':'0-9/10'}),json:async()=>Array(10).fill({periodo:'2026-2'})}}}),/70%/);assert.equal(escrituras,0);
 let paginas=0;const paginado=await conteos({url:'https://sintetico.invalid',clave:'k',fetch:async(url,op)=>{const inicio=Number(op.headers.Range.split('-')[0]);paginas++;return{ok:true,headers:new Headers({'content-range':`${inicio}-${Math.min(inicio+99,1000)}/1001`}),json:async()=>Array(Math.min(100,1001-inicio)).fill({periodo:'2026-2'})}}});assert.equal(paginado.conteos['2026-2'],1001);assert.equal(paginas,11,'respeta un límite REST menor a 1000, sin saltar filas');

 const db=new PGlite();try{
  await db.exec(read('bin/supabase-stubs.sql'));
  await db.exec('create table user_ramos(user_id uuid primary key references auth.users(id),data jsonb);create table catalogo_uc(sigla text primary key,nombre text not null,creditos integer,busqueda text not null);alter table catalogo_uc enable row level security;');
  await db.exec(read('supabase/profesores.sql'));const sql=read('supabase/catalogo_uc_secciones.sql');await db.exec(sql);await db.exec(sql);
  const q=async(s,a=[])=>(await db.query(s,a)).rows;
  await db.exec("insert into catalogo_uc values('TST100','Prueba sintética',8,'prueba sintetica');insert into profesor_ocultos(tenant,nombre) values('uc','María José Pérez');set role service_role;");
  let id=0;async function preparar(secciones){const carga=`00000000-0000-0000-0000-${String(++id).padStart(12,'0')}`;for(const datos of prepararLotes(conDatos(secciones),{catalogo:[],log:()=>{}})[0].secciones)await q('insert into catalogo_uc_secciones_lotes(carga_id,periodo,nrc,datos) values($1,$2,$3,$4)',[carga,'2026-2',datos.nrc,JSON.stringify(datos)]);return carga;}
  const diez=Array.from({length:10},(_,i)=>({...f,nrc:i+1})),carga=await preparar(diez);
  let r=(await q('select catalogo_uc_secciones_consolidar($1,$2,$3) as r',[carga,'2026-2',10]))[0].r;assert.equal(r.nuevas,10);assert.equal(r.cambiadas,0);assert.equal((await q('select creditos from catalogo_uc'))[0].creditos,8);
  await db.exec('reset role;set role anon');await assert.rejects(q('select * from catalogo_uc_secciones'),/permission denied/);await assert.rejects(q('select * from catalogo_uc_secciones_lotes'),/permission denied/);await assert.rejects(q('select catalogo_uc_secciones_consolidar($1,$2,$3)',[carga,'2026-2',10]),/permission denied/);
  let publico=await q("select * from catalogo_uc_secciones_publicas('2026-2','TST100')");assert.equal(publico.length,10);assert.deepEqual(publico[0].profesores,['Sin informar','Docente Visible'],'oculta incluso con apellidos antes del nombre');
  assert(!JSON.stringify(publico).includes('Pérez'));await db.exec('reset role;set role authenticated');await assert.rejects(q('insert into catalogo_uc_secciones select * from catalogo_uc_secciones'),/permission denied/);assert.equal((await q("select count(*)::int as n from catalogo_uc_secciones_publicas('2026-2')"))[0].n,10);
  await db.exec('reset role;set role service_role');const snapshot=await q('select * from catalogo_uc_secciones order by nrc');
  const pocos=await preparar(diez.slice(0,6));await assert.rejects(q('select catalogo_uc_secciones_consolidar($1,$2,6)',[pocos,'2026-2']),/70%/);assert.deepEqual(await q('select * from catalogo_uc_secciones order by nrc'),snapshot);
  const incompleto=await preparar(diez.slice(0,7));await assert.rejects(q('select catalogo_uc_secciones_consolidar($1,$2,8)',[incompleto,'2026-2']),/incompletos/);
  const siete=await preparar(diez.slice(0,7).map((r,i)=>i? r:{...r,vacantes_disponibles:0}));r=(await q('select catalogo_uc_secciones_consolidar($1,$2,7) as r',[siete,'2026-2']))[0].r;assert.equal(r.cambiadas,1);assert.equal(r.dejaron_de_estar,3);assert.equal((await q('select count(*)::int as n from catalogo_uc_secciones'))[0].n,10,'las bajas se conservan');
  const igual=await preparar(diez.slice(0,7).map((r,i)=>i?r:{...r,vacantes_disponibles:0}));r=(await q('select catalogo_uc_secciones_consolidar($1,$2,7) as r',[igual,'2026-2']))[0].r;assert.equal(r.cambiadas,0);assert.equal(r.nuevas,0);
  await db.exec('reset role');await db.exec(sql);await db.exec('set role anon');assert.equal((await q("select count(*)::int as n from catalogo_uc_secciones_publicas('2026-2')"))[0].n,7,'reaplicar conserva datos y filtrado');
 }finally{await db.close();}
 const wf=read('.github/workflows/buscacursos-uc.yml');assert(/environment: supabase/.test(wf)&&/contents: read/.test(wf)&&/cancel-in-progress: false/.test(wf));assert(wf.includes("github.ref == 'refs/heads/main'"));
 console.log('OK: parser real, horarios, vacantes, cero resultados, particiones, ritmo/bloqueos, guarda 70%, búsqueda compartida, lotes atómicos, RLS y docentes ocultos');
})().catch(e=>{console.error(e);process.exitCode=1});
