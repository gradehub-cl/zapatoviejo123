// Panel de alumnos: el lado del navegador. Que la app y el SQL emparejen cada
// prueba igual, que el link se guarde y salga de la barra, que compartir parta
// sin nada elegido y que el promedio sea el de ramoAvg. Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function contexto({search='',sesion=false}={}){
  const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
  const almacen=new Map(),historial=[];
  const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
    document:{getElementById:()=>el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
    navigator:{},location:{origin:'https://gradehub.cl',pathname:'/',hash:'',search},
    history:{replaceState:(a,b,url)=>historial.push(url)},URLSearchParams,
    setTimeout:f=>{f();return 1;},clearTimeout(){},console,URL};
  vm.createContext(ctx);
  vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
  vm.runInContext(`var supabaseClient=${sesion?'{rpc:async()=>({data:[],error:null})}':'null'};var currentUser=${sesion?'{id:"u"}':'null'};`,ctx);
  vm.runInContext(leer('marketplace.js'),ctx);
  return {run:c=>vm.runInContext(c,ctx),almacen,historial};
}

(async()=>{
  console.log('=== La app y el SQL emparejan las pruebas igual ===');
  const db=new PGlite();
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec("create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$; create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb not null);");
  await db.exec(leer('supabase/clases_particulares.sql'));
  await db.exec(leer('supabase/curso_posicion.sql'));
  await db.exec(leer('supabase/profesor_alumnos.sql'));
  const a=contexto();
  const nombres=['Interrogación 1','interrogacion  1','INTERROGACIÓN 1',' Control   N°2 ','Examen Final','Año','Ñandú Ü','Pregunta 1 — Parte A','',null];
  let iguales=true;
  for(const n of nombres){
    const sql=(await db.query('select clave_evaluacion($1) c',[n])).rows[0].c;
    const js=a.run(`claveEvaluacionPanel(${JSON.stringify(n)})`);
    if(sql!==js){iguales=false;console.log('    distinto:',JSON.stringify(n),sql,js);}
  }
  chk('misma clave en JS y en SQL para nombres con tildes, mayúsculas y espacios',iguales);
  chk('las tres formas de escribir la I1 son la misma prueba',a.run(`new Set(['Interrogación 1','interrogacion  1','INTERROGACIÓN 1'].map(claveEvaluacionPanel)).size`)===1);

  console.log('\n=== El link del profesor ===');
  chk('un código válido se acepta en mayúsculas',a.run(`codigoProfeValido(' ab3cdefg ')`)==='AB3CDEFG');
  chk('con letras ambiguas (O, I, 0, 1) no',a.run(`codigoProfeValido('ABCDEFG0')`)===null&&a.run(`codigoProfeValido('ABCDEFGI')`)===null);
  chk('el link apunta a gradehub.cl también desde la app iOS',a.run(`linkAlumnosProfesor('AB3CDEFG')`)==='https://gradehub.cl/?profe=AB3CDEFG');
  const invitacion=contexto();
  invitacion.run(`navigator.share=async payload=>{globalThis.__compartido=payload};`);
  const url='https://gradehub.cl/?profe=AB3CDEFG';
  chk('la hoja del sistema recibe el link y texto sin notas ni nombres',
    (await invitacion.run(`compartirInvitacionAlumnos(${JSON.stringify(url)})`))==='compartido'&&
    invitacion.run('__compartido.url')===url&&
    /eliges los ramos/.test(invitacion.run('__compartido.text'))&&
    !/4[,\.]0|Alumno de prueba/.test(invitacion.run('__compartido.text')));
  invitacion.run(`navigator.share=undefined;navigator.clipboard={writeText:async texto=>{globalThis.__copiado=texto}};`);
  chk('sin hoja del sistema se copia el mensaje sugerido y el link',
    (await invitacion.run(`compartirInvitacionAlumnos(${JSON.stringify(url)})`))==='copiado'&&
    invitacion.run('__copiado').endsWith('\n'+url));
  invitacion.run(`navigator.share=async()=>{const e=new Error('cancelado');e.name='AbortError';throw e};globalThis.__copiado=null;`);
  chk('cancelar la hoja no copia sin permiso',
    (await invitacion.run(`compartirInvitacionAlumnos(${JSON.stringify(url)})`))==='cancelado'&&invitacion.run('__copiado')===null);
  const b=contexto({search:'?profe=ab3cdefg&x=1'});
  chk('al abrir el link se guarda el código para después del login',b.almacen.get('gradehub_profe_pendiente')==='AB3CDEFG');
  chk('y sale de la barra de direcciones, sin tocar lo demás',b.historial[0]==='/?x=1');
  const c=contexto({search:'?profe=<script>'});
  chk('un código inválido no se guarda',!c.almacen.has('gradehub_profe_pendiente'));
  chk('sin sesión no se ofrece compartir todavía',(await b.run('revisarInvitacionProfesor()'))===false&&b.almacen.get('gradehub_profe_pendiente')==='AB3CDEFG');

  console.log('\n=== Compartir parte sin nada elegido ===');
  const hoja=a.run(`hojaInvitacionProfesorHTML({nombre_publico:'Academia <b>X</b>'},[{id:'r1',nombre:'Cálculo II',sigla:'MAT1620'},{id:'r2',nombre:'Física',sigla:'FIS1514'}],'Cami')`);
  chk('cada ramo es una casilla, ninguna marcada',(hoja.match(/data-compartir-ramo/g)||[]).length===2&&!/checked/.test(hoja));
  chk('el botón Compartir parte deshabilitado',/id="compartir-si" disabled/.test(hoja));
  chk('dice qué ve el profesor y dónde dejar de compartir',/cada nota de esos ramos/.test(hoja)&&/Ajustes → Datos y cuenta/.test(hoja));
  chk('el nombre del profesor va escapado',/Academia &lt;b&gt;X&lt;\/b&gt;/.test(hoja));

  console.log('\n=== Lo que ve el profesor ===');
  a.run(`globalThis.__r={id:'r1',nombre:'Cálculo II',sigla:'MAT1620',color:'#7F77DD',gates:[],categorias:[
    {id:'c1',nombre:'Interrogaciones',peso:60,notas:[{id:'n1',nombre:'Interrogación 1',valor:4.2},{id:'n2',nombre:'Interrogación 2',valor:5.6}]},
    {id:'c2',nombre:'Examen',peso:40,notas:[]}]}`);
  const html=a.run(`ramoPanelHTML(__r,{ramo:{promedio:4.7,personas:23},
    evaluaciones:[{clave:'interrogacion 1',nombre:'Interrogación 1',promedio:4.6,personas:9}],
    categorias:[{clave:'interrogaciones',nombre:'Interrogaciones',promedio:4.4,personas:31}]})`);
  const prom=a.run('fmtPromedio(ramoAvg(ramoParaPanel(__r)))');
  chk('el promedio es el de ramoAvg, el mismo de la app del alumno',html.includes(prom+'<small>promedio</small>'));
  const catProm=a.run(`(()=>{const r=ramoParaPanel(__r);const b=calculoRamoConCompuertas(r);return fmtPromedio(b.res.breakdown.find(n=>n.id==='c1').value);})()`);
  chk('las notas van agrupadas en su categoría, con el promedio del motor',
    new RegExp('Interrogaciones<small>2 notas</small></td><td>'+catProm.replace('.','\\.')+'</td><td><span class="panel-alumnos-gh">4\\.4<small>31 personas').test(html));
  chk('cada nota debajo, con su comparación cuando el nombre calza',/panel-alumnos-nota"><td>Interrogación 1<\/td><td>4\.2<\/td><td><span class="panel-alumnos-gh">4\.6<small>9 personas/.test(html));
  chk('y "—" cuando no, sin repetir "aún pocos datos"',/Interrogación 2<\/td><td>5\.6<\/td><td><span class="panel-alumnos-sin">—/.test(html));
  chk('el ramo completo contra GradeHub, con la etiqueta',/4\.7<small>GradeHub · 23 personas/.test(html));
  chk('las categorías sin notas no aparecen',!/Examen/.test(html));
  // Como Martín: notas renombradas ("1", "(Falté)"). Igual se comparan por categoría.
  const renombradas=a.run(`ramoPanelHTML({id:'r9',nombre:'Contabilidad',sigla:'EAA1210',gates:[],categorias:[
    {id:'k1',nombre:'Controles',peso:30,notas:[{id:'a',nombre:'1',valor:7},{id:'b',nombre:'(Falté)',valor:1}]},
    {id:'k2',nombre:'Solemne',peso:70,notas:[{id:'c',nombre:'Pero perro',valor:4.4}]}]},
    {ramo:null,evaluaciones:[],categorias:[{clave:'controles',promedio:4.9,personas:12},{clave:'solemne',promedio:4.1,personas:12}]})`);
  chk('con notas renombradas, la comparación sale igual por categoría',
    /Controles<small>2 notas<\/small><\/td><td>[^<]+<\/td><td><span class="panel-alumnos-gh">4\.9/.test(renombradas));
  chk('una categoría de una sola nota es una sola fila, con el nombre de la categoría',
    /panel-alumnos-cat"><td>Solemne<\/td><td>4\.4<\/td><td><span class="panel-alumnos-gh">4\.1/.test(renombradas)&&!/Pero perro/.test(renombradas));

  console.log('\n=== Próxima evaluación de cada alumno (#663) ===');
  // Hoy es el 12 de octubre. I1 ya tiene nota; I2 es el 15. Pautas escritas acá.
  a.run(`globalThis.__hoy=new Date(2026,9,12,10);
    globalThis.__conI2=(i1,pesoI1=50,fechaI2='2026-10-15')=>({id:'p',nombre:'Cálculo II',sigla:'MAT1620',gates:[],categorias:[
      {id:'i1',nombre:'Interrogación 1',peso:pesoI1,fecha:'2026-09-20',notas:[{id:'a',nombre:'Interrogación 1',valor:i1}]},
      {id:'i2',nombre:'Interrogación 2',peso:100-pesoI1,fecha:fechaI2,notas:[]}]})`);
  const prox=(...args)=>a.run(`proximaEvaluacionPanel(ramoParaPanel(__conI2(${args.map(x=>JSON.stringify(x)).join(',')})),__hoy)`);
  let p=prox(3.0);
  chk('la próxima es la que viene con fecha y sin nota',p&&p.evaluacion==='Interrogación 2'&&p.fecha==='2026-10-15');
  chk('con un 3,0 en la I1 (50/50) necesita 4,9 para ir con 4',p.necesita==='4.9');
  chk('es lo mismo que calcula la app del alumno (notaParaIrConCuatro)',
    a.run(`notaParaIrConCuatro(agendaEvents([ramoParaPanel(__conI2(3.0))]).find(e=>e.pending)).nota`)===p.necesita);
  chk('con un 7,0 va con 4 con cualquier nota',prox(7.0).margen===true&&prox(7.0).necesita===null);
  chk('con un 1,0 que pesa 70%, con esta sola no alcanza',prox(1.0,70).inalcanzable===true);
  chk('una evaluación que ya pasó no es la próxima',prox(3.0,50,'2026-10-01')===null);
  chk('hoy sí cuenta',prox(3.0,50,'2026-10-12')?.fecha==='2026-10-12');
  const hp=a.run(`ramoPanelHTML(__conI2(3.0),null,__hoy)`);
  chk('la ficha del alumno lo dice: evaluación, fecha y nota necesaria',
    /Próxima: <b>Interrogación 2<\/b> · 15 oct<\/span><span>necesita <b>4,9<\/b> para ir con 4/.test(hp));
  chk('sin fechas por venir, no aparece nada',!/panel-alumnos-proxima/.test(a.run(`ramoPanelHTML(__conI2(3.0,50,'2026-10-01'),null,__hoy)`)));
  chk('agendaEvents sin argumento sigue usando los ramos de la persona',a.run('S.ramos=[__conI2(3.0)];agendaEvents().length')===2&&a.run('(S.ramos=[],agendaEvents().length)')===0);

  console.log('\n=== El ramo vinculado se busca entre los ramos del alumno ===');
  // El profesor también tiene su Laboratorio de Dinámica (un 1,0). Antes, la
  // Dinámica del alumno se combinaba con ese laboratorio y no con el suyo.
  a.run(`globalThis.__din={id:'d',nombre:'Dinámica',sigla:'FIS1514',aporta:{ramo:'Laboratorio de Dinámica',peso:30,min:4.0},gates:[],categorias:[
      {id:'i',nombre:'Interrogaciones',peso:100,notas:[{id:'x',nombre:'Interrogación 1',valor:5.0}]}]};
    globalThis.__lab=v=>({id:'l'+v,nombre:'Laboratorio de Dinámica',sigla:'FIS0154',gates:[],categorias:[{id:'k',nombre:'Laboratorios',peso:100,notas:[{id:'y',nombre:'Lab 1',valor:v}]}]});
    globalThis.__alDin={id:'ad',nombre_visible:'Dani',tenant:'uc',ramos:[__din,__lab(6.0)]};
    S.ramos=[__lab(1.0)];`);
  const propio=a.run(`ramoAvg(ramoParaPanel(__din),undefined,[ramoParaPanel(__din),ramoParaPanel(__lab(6.0))])`);
  const conElDelProfe=a.run(`ramoAvg(ramoParaPanel(__din))`);
  chk('el caso existe: con el laboratorio del profesor el promedio cambia',Math.abs(propio-conElDelProfe)>0.5);
  chk('la ficha del alumno usa su propio laboratorio',
    a.run(`alumnosPanelHTML([__alDin],()=>null)`).includes(`${a.run(`fmtPromedio(${propio})`)}<small>promedio`));
  chk('el resumen también',Math.abs(a.run(`resumenAlumnosPanel([__alDin],()=>null).find(g=>g.sigla==='FIS1514').promedio`)-propio)<1e-9);
  chk('y el archivo para Excel',a.run(`csvAlumnosPanel([__alDin],()=>null)`).split('\r\n')[1].split(';')[6]===a.run(`fmtPromedio(${propio})`).replace('.',','));
  chk('buscar "dinámica" no cambia su promedio aunque esconda el laboratorio',
    a.run(`alumnosPanelHTML(filtrarAlumnosPanel([__alDin],'dinámica'),()=>null)`).includes(`${a.run(`fmtPromedio(${propio})`)}<small>promedio`));
  chk('sin laboratorio compartido, no toma el del profesor',
    Math.abs(a.run(`resumenAlumnosPanel([{...__alDin,ramos:[__din]}],()=>null)[0].promedio`)-a.run(`ramoAvg(ramoParaPanel(__din),undefined,[ramoParaPanel(__din)])`))<1e-9);
  a.run('S.ramos=[]');

  console.log('\n=== Cada alumno con las reglas de nota de su universidad ===');
  // 3,892 y 4,0 en 50/50: promedio bruto 3,946. La UAndes redondea a la
  // centésima y después a la décima (4,0); la regla común, directo (3,9).
  a.run(`globalThis.__borde=(id)=>({id,nombre:'Ramo de borde',sigla:'TST100',gates:[],categorias:[
    {id:'a',nombre:'Prueba 1',peso:50,notas:[{id:'x',nombre:'Prueba 1',valor:3.892}]},
    {id:'b',nombre:'Prueba 2',peso:50,notas:[{id:'y',nombre:'Prueba 2',valor:4.0}]}]});
    globalThis.__al=(tenant)=>({id:'al-'+tenant,nombre_visible:'Alumno '+tenant,tenant,ramos:[__borde('r-'+tenant)]})`);
  const ve=(profe,alumno)=>a.run(`(S.tenant=${JSON.stringify(profe)},alumnosPanelHTML([__al(${JSON.stringify(alumno)})],()=>null))`);
  chk('profesor UC, alumno UAndes: ve 4,0, como el alumno en su app',/4\.0<small>promedio/.test(ve('uc','uandes')));
  chk('profesor UAndes, alumno UC: ve 3,9, no un aprobado que no es',/3\.9<small>promedio/.test(ve('uandes','uc')));
  chk('misma universidad: igual que antes',/3\.9<small>promedio/.test(ve('uc','uc'))&&/4\.0<small>promedio/.test(ve('uandes','uandes')));
  chk('la universidad del profesor queda como estaba',a.run(`(S.tenant='uc',alumnosPanelHTML([__al('uandes')],()=>null),S.tenant)`)==='uc');
  chk('y también si algo falla adentro',a.run(`(()=>{S.tenant='uc';try{conUniversidadPanel('uandes',()=>{throw new Error('x')});}catch(e){}return S.tenant;})()`)==='uc');
  const resCruce=a.run(`(S.tenant='uc',resumenAlumnosPanel([__al('uandes'),__al('uc')],()=>null))`);
  chk('el resumen no mezcla universidades en un mismo grupo',resCruce.length===2&&resCruce.every(g=>g.alumnos===1));
  chk('y cuenta el semáforo con la regla de cada uno',
    resCruce.find(g=>g.tenant==='uandes').semaforo.warn===1&&resCruce.find(g=>g.tenant==='uc').semaforo.bad===1);
  const csvCruce=a.run(`(S.tenant='uc',csvAlumnosPanel([__al('uandes')],()=>null))`).split('\r\n')[1].split(';');
  chk('el Excel también: 4,0 para el alumno UAndes',csvCruce[6]==='4,0');
  a.run(`S.tenant='uc'`);

  console.log('\n=== Antes y ahora: el cálculo (#697) ===');
  // Empezó con el profesor el 15 de septiembre. Dos pruebas antes, dos después
  // y una tarea sin fecha. El curso: I1 4,0 · C1 4,5 · I2 4,6 · C2 4,5.
  a.run(`globalThis.__ev=(id,nombre,fecha,valor)=>({id:'c'+id,nombre,peso:20,fecha,notas:[{id:'n'+id,nombre,valor}]});
    globalThis.__antesAhora={id:'aa',nombre_visible:'Ana',tenant:'uc',desde:'2026-09-15T15:00:00Z',ramos:[{id:'ra',nombre:'Cálculo II',sigla:'MAT1620',gates:[],categorias:[
      __ev(1,'Interrogación 1','2026-09-01',3.0),__ev(2,'Control 1','2026-09-08',3.5),
      __ev(3,'Interrogación 2','2026-10-01',5.0),__ev(4,'Control 2','2026-10-08',5.5),
      {id:'ct',nombre:'Tarea',peso:20,notas:[{id:'nt',nombre:'Tarea',valor:6.0}]}]}]};
    globalThis.__cursoAA=()=>({ramo:{promedio:4.5,personas:30},evaluaciones:[
      {clave:'interrogacion 1',promedio:4.0,personas:9},{clave:'control 1',promedio:4.5,personas:9},
      {clave:'interrogacion 2',promedio:4.6,personas:9},{clave:'control 2',promedio:4.5,personas:9}],categorias:[]})`);
  const m=a.run('metricasAlumnoPanel(__antesAhora,__cursoAA)');
  const cerca1=(x,y)=>typeof x==='number'&&Math.abs(x-y)<1e-9;
  chk('cada evaluación con fecha cae antes o después del día que empezó',m.antes.n===2&&m.ahora.n===2&&m.desde==='2026-09-15');
  chk('la sin fecha queda fuera y se cuenta',m.sinFecha===1);
  chk('antes iba 1,0 bajo el curso; ahora 0,7 sobre el curso',cerca1(m.antes.diferencia,-1.0)&&cerca1(m.ahora.diferencia,0.7));
  chk('subió 1,7 respecto del curso',cerca1(m.cambio,1.7));
  chk('aprobación: 0 de 2 antes, 2 de 2 ahora',m.antes.aprobacion===0&&m.ahora.aprobacion===1);
  chk('promedio: 3,25 antes y 5,25 ahora',cerca1(m.antes.promedio,3.25)&&cerca1(m.ahora.promedio,5.25));
  chk('con la fecha de inicio corregida, cambia el corte',a.run(`metricasAlumnoPanel(__antesAhora,__cursoAA,{inicio:'2026-09-05'}).antes.n`)===1);
  // Un alumno con una sola evaluación comparable de un lado no tiene "cambio".
  a.run(`globalThis.__poco={...__antesAhora,id:'pp',nombre_visible:'Beto',ramos:[{...__antesAhora.ramos[0],categorias:__antesAhora.ramos[0].categorias.slice(0,3)}]}`);
  chk('con menos de 2 evaluaciones a un lado, no se inventa un cambio',a.run('metricasAlumnoPanel(__poco,__cursoAA).cambio')===null);
  chk('sin promedio del curso, la evaluación cuenta para el promedio pero no para la diferencia',
    a.run('metricasAlumnoPanel(__antesAhora,()=>null)').ahora.nComparadas===0&&a.run('metricasAlumnoPanel(__antesAhora,()=>null)').ahora.n===2);
  const g=a.run('metricasGrupoPanel([__antesAhora,__poco],__cursoAA)');
  chk('el grupo: 1 de 1 con datos mejoró, mediana 1,7',g.conCambio===1&&g.mejoraron===1&&cerca1(g.cambioMediana,1.7));
  chk('y junta aprobación y sin fecha de todos',g.antes.n===4&&g.ahora.n===3&&g.sinFecha===1);
  chk('la aprobación usa la regla de nota de la universidad del alumno',
    a.run(`(()=>{const x={...__antesAhora,tenant:'uandes',ramos:[{...__antesAhora.ramos[0],categorias:[__ev(9,'Interrogación 3','2026-10-20',3.946)]}]};return metricasAlumnoPanel(x,()=>null).ahora.aprobacion;})()`)===1
    &&a.run(`(()=>{const x={...__antesAhora,tenant:'uc',ramos:[{...__antesAhora.ramos[0],categorias:[__ev(9,'Interrogación 3','2026-10-20',3.946)]}]};return metricasAlumnoPanel(x,()=>null).ahora.aprobacion;})()`)===0);

  chk('la fecha que corrigió el profesor manda sobre cuándo compartió',
    a.run(`metricasAlumnoPanel({...__antesAhora,inicio:'2026-09-05'},__cursoAA).antes.n`)===1);
  chk('una fecha sin hora es ese mismo día, no el anterior',a.run(`diaLocalPanel('2026-09-01')`)==='2026-09-01'
    &&/Empezó contigo el <b>1 sep<\/b>/.test(a.run(`alumnosPanelHTML([{...__antesAhora,inicio:'2026-09-01'}],()=>null)`))
    &&a.run(`metricasAlumnoPanel({...__antesAhora,inicio:'2026-09-08'},__cursoAA).antes.n`)===1);
  const linea=a.run(`alumnosPanelHTML([{...__antesAhora,inicio:null}],()=>null)`);
  chk('cada alumno dice desde cuándo, y se puede cambiar',/Empezó contigo el <b>15 sep<\/b> · el día que compartió/.test(linea)&&/data-inicio-alumno="aa"/.test(linea));
  chk('si el profesor la corrigió, no dice "el día que compartió"',!/el día que compartió/.test(a.run(`alumnosPanelHTML([{...__antesAhora,inicio:'2026-09-05'}],()=>null)`)));

  console.log('\n=== Antes y ahora: la pantalla (#697) ===');
  const gh=a.run('antesAhoraGrupoHTML(metricasGrupoPanel([__antesAhora,__poco],__cursoAA))');
  chk('las tres cifras del grupo: respecto del curso, mejoraron y aprobación',
    /ah-cifra-valor">\+1\.7</.test(gh)&&/ah-cifra-valor">1 de 1</.test(gh)&&/0% → 100%/.test(gh));
  chk('dice con cuántas evaluaciones y cuántas sin fecha no cuentan',/Con 7 evaluaciones con fecha; 1 sin fecha no cuentan/.test(gh));
  chk('y advierte que no prueba que sea por las clases',/No prueba que la mejora sea por tus clases/.test(gh));
  const ah=a.run('antesAhoraAlumnoHTML(metricasAlumnoPanel(__antesAhora,__cursoAA))');
  chk('cada alumno: subió 1.7, antes 1.0 bajo y ahora 0.7 sobre el curso',
    /Subió 1\.7 respecto del curso/.test(ah)&&/Antes: 1\.0 bajo el curso/.test(ah)&&/Ahora: 0\.7 sobre el curso/.test(ah));
  chk('el gráfico es una imagen con su resumen y un punto por evaluación comparable',
    /<svg class="ah-grafico"[^>]*role="img"[^>]*aria-label="Diferencia con el curso en 4 evaluaciones/.test(ah)&&(ah.match(/class="ah-punto"/g)||[]).length===4&&/empezó/.test(ah));
  chk('y la lista con las mismas cifras, para quien no ve el gráfico',/Ver sus evaluaciones/.test(ah)&&(ah.match(/<tr><td>/g)||[]).length===4);
  chk('con pocos datos lo dice, sin inventar un cambio',/Aún pocos datos para comparar/.test(a.run('antesAhoraAlumnoHTML(metricasAlumnoPanel(__poco,__cursoAA))')));
  chk('nada de esto usa los colores del semáforo',!/panel-resumen-(good|warn|bad)|--green|--red|--yellow/.test(gh+ah));

  console.log('\n=== Antes y ahora en el Excel (#697) ===');
  const csvAA=a.run('csvAlumnosPanel([__antesAhora],__cursoAA)').split('\r\n').map(l=>l.split(';'));
  const filaDe=ev=>csvAA.find(f=>f[4]===ev);
  chk('cada evaluación con su fecha y si fue antes o desde que empezó',
    filaDe('Interrogación 1')[10]==='2026-09-01'&&filaDe('Interrogación 1')[11]==='antes'&&filaDe('Interrogación 2')[11]==='desde que empezó');
  chk('y su diferencia con el curso, con coma decimal',filaDe('Interrogación 1')[12]==='-1,0'&&filaDe('Interrogación 2')[12]==='0,4');
  chk('una nota sin fecha lo dice',filaDe('Tarea')[11]==='sin fecha'&&filaDe('Tarea')[10]==='');
  chk('las columnas de antes siguen en su lugar',filaDe('Interrogación 1')[5]==='3,0');

  console.log('\n=== Resumen por ramo (#667) ===');
  // Tres alumnos en Cálculo II (uno sin notas, uno que escribió la prueba en
  // minúsculas) y uno en Física. Pautas escritas acá.
  a.run(`globalThis.__calc=(id,i1,i2)=>({id,nombre:'Cálculo II',sigla:'MAT1620',gates:[],categorias:[
    {id:'c1',nombre:'Interrogaciones',peso:60,notas:[{id:'n1',nombre:i1[0],valor:i1[1]},...(i2?[{id:'n2',nombre:'Interrogación 2',valor:i2}]:[])]},
    {id:'c2',nombre:'Examen',peso:40,notas:[]}]});
    globalThis.__grupo=[
      {id:'a1',nombre_visible:'Ana',tenant:'uc',ramos:[__calc('r1',['Interrogación 1',6.0],5.6)]},
      {id:'a2',nombre_visible:'Beto',tenant:'uc',ramos:[__calc('r2',['interrogacion 1',3.0],3.4),{id:'f',nombre:'Física',sigla:'FIS1514',gates:[],categorias:[{id:'k',nombre:'Controles',peso:100,notas:[{id:'x',nombre:'Control 1',valor:4.5}]}]}]},
      {id:'a3',nombre_visible:'Caro',tenant:'uc',ramos:[{id:'r3',nombre:'Cálculo II',sigla:'MAT1620',gates:[],categorias:[{id:'c1',nombre:'Interrogaciones',peso:100,notas:[]}]}]}];
    globalThis.__res=resumenAlumnosPanel(__grupo,(al,r)=>r.sigla==='MAT1620'?{ramo:{promedio:4.7,personas:23},
      evaluaciones:[{clave:'interrogacion 1',promedio:4.6,personas:9}],categorias:[{clave:'interrogaciones',promedio:4.4,personas:31}]}:null)`);
  const res=a.run('__res');
  const calc=res[0];
  chk('un grupo por ramo, el con más alumnos primero',res.length===2&&calc.sigla==='MAT1620'&&calc.alumnos===3&&res[1].sigla==='FIS1514');
  const esperado=a.run(`(ramoAvg(ramoParaPanel(__grupo[0].ramos[0]))+ramoAvg(ramoParaPanel(__grupo[1].ramos[0])))/2`);
  chk('el promedio es el simple entre los ramoAvg de quienes tienen nota',Math.abs(calc.promedio-esperado)<1e-9&&calc.conNotas===2);
  const niveles=a.run(`[nivelRamo(ramoParaPanel(__grupo[0].ramos[0]),ramoAvg(ramoParaPanel(__grupo[0].ramos[0]))),nivelRamo(ramoParaPanel(__grupo[1].ramos[0]),ramoAvg(ramoParaPanel(__grupo[1].ramos[0])))]`);
  chk('el semáforo cuenta con nivelRamo, y el sin notas va aparte',niveles[0]==='good'&&niveles[1]==='bad'&&
    calc.semaforo.good===1&&calc.semaforo.bad===1&&calc.semaforo.warn===0&&calc.semaforo.neutral===1);
  const i1=calc.categorias[0].evaluaciones.find(e=>e.clave==='interrogacion 1');
  chk('la misma prueba escrita distinto se junta',i1&&i1.alumnos===2&&Math.abs(i1.promedio-4.5)<1e-9);
  chk('las categorías sin notas no aparecen',calc.categorias.length===1&&calc.categorias[0].nombre==='Interrogaciones');
  const rh=a.run('resumenAlumnosPanelHTML(__res)');
  chk('compara el ramo, la categoría y la prueba con GradeHub',/4\.7<small>GradeHub · 23 personas/.test(rh)&&/4\.4<small>31 personas/.test(rh)&&/4\.6<small>9 personas/.test(rh));
  const rhCalc=rh.split('Física')[0];
  chk('el semáforo dice aprobando, reprobando y sin notas, con su color',
    /panel-resumen-good">1 aprobando/.test(rhCalc)&&/panel-resumen-bad">1 reprobando/.test(rhCalc)&&/>1 sin notas</.test(rhCalc)&&!/al borde/.test(rhCalc));
  chk('y un 4,5 va al borde',/panel-resumen-warn">1 al borde/.test(rh));
  chk('y advierte que comparar no dice por qué',/no dice por qué/.test(rh));
  chk('cada ramo es un desplegable de al menos 44 pt',/class="panel-resumen-ramo"/.test(rh)&&/\.panel-resumen-ramo summary\{[^}]*min-height:44px/.test(leer('styles.css')));

  console.log('\n=== Buscador de alumnos ===');
  a.run(`globalThis.__al=[
    {id:'a1',nombre_visible:'Camila Pérez',tenant:'uc',ramos:[{id:'r1',nombre:'Cálculo II',sigla:'MAT1620'},{id:'r2',nombre:'Dinámica',sigla:'FIS1514'}]},
    {id:'a2',nombre_visible:'Tomás',tenant:'uc',ramos:[{id:'r3',nombre:'Álgebra Lineal',sigla:'MAT1203'}]},
    {id:'a3',nombre_visible:'Ignacia',tenant:'uc',ramos:[]}]`);
  const ids=t=>a.run(`filtrarAlumnosPanel(__al,${JSON.stringify(t)}).map(x=>x.id+':'+x.ramos.map(r=>r.id).join(',')).join(' ')`);
  chk('sin texto se ven todos, igual que antes',ids('   ')==='a1:r1,r2 a2:r3 a3:');
  chk('por nombre, sin tildes ni mayúsculas, con todos sus ramos',ids('camila perez')==='a1:r1,r2'&&ids('TOMAS')==='a2:r3');
  chk('por ramo, solo con el ramo que calza',ids('dinamica')==='a1:r2'&&ids('álgebra')==='a2:r3');
  chk('por sigla, también un trozo',ids('mat1')==='a1:r1 a2:r3'&&ids('fis1514')==='a1:r2');
  chk('si nadie calza, la lista queda vacía',ids('química')==='');
  chk('no cambia la lista original',a.run('__al[0].ramos.length')===2);
  const lista=a.run(`alumnosPanelHTML([{id:'x"1',nombre_visible:'<img src=x>',ramos:[]}],()=>null)`);
  chk('el nombre que eligió el alumno va escapado',/&lt;img src=x&gt;/.test(lista)&&!/<img/.test(lista));

  console.log('\n=== Exportar a Excel ===');
  a.run(`globalThis.__exp=[
    {id:'e1',nombre_visible:'Pérez, "Cami"',tenant:'uc',ramos:[__r]},
    {id:'e2',nombre_visible:'=HYPERLINK("http://x")',tenant:'uc',ramos:[{id:'r8',nombre:'Física; Lab',sigla:'FIS0154',gates:[],categorias:[]}]}]`);
  const csv=a.run(`csvAlumnosPanel(__exp,(al,r)=>r.id==='r1'?{ramo:{promedio:4.7,personas:23},
    evaluaciones:[{clave:'interrogacion 1',promedio:4.6,personas:9}],categorias:[{clave:'interrogaciones',promedio:4.44,personas:31}]}:null)`);
  const lineas=csv.split('\r\n');
  chk('un negativo puro llega como número; el resto que parece fórmula, no',a.run("celdaCsvPanel('-1,0')")==='-1,0'&&a.run("celdaCsvPanel('-1+1')")==="'-1+1"&&a.run("celdaCsvPanel('=1')")==="'=1");
  chk('una fila de títulos con las columnas acordadas',
    lineas[0]==='Alumno;Ramo;Sigla;Categoría;Evaluación;Nota;Promedio del ramo;GradeHub evaluación;GradeHub categoría;GradeHub ramo;Fecha;Antes o desde que empezó;Diferencia con el curso');
  chk('una fila por evaluación con nota, y una por ramo sin notas',lineas.length===4);
  chk('comas y comillas en el nombre van entre comillas, dobladas',
    lineas[1].startsWith('"Pérez, ""Cami""";Cálculo II;MAT1620;Interrogaciones;Interrogación 1;4,2;'));
  chk('decimales con coma y el promedio del ramo es el de ramoAvg',
    lineas[1].split(';')[6]===a.run('fmtPromedio(ramoAvg(ramoParaPanel(__r)))').replace('.',','));
  chk('GradeHub por evaluación, categoría y ramo, redondeado como en la app',lineas[1].split(';').slice(7,10).join(';')==='4,6;4,4;4,7');
  chk('una prueba sin comparación deja su celda vacía',/;Interrogación 2;5,6;[^;]*;;4,4;4,7;/.test(lineas[2]));
  chk('un nombre que parece fórmula no llega a Excel como fórmula',lineas[3].startsWith(`"'=HYPERLINK(""http://x"")"`));
  chk('un punto y coma en el ramo va entre comillas',lineas[3].includes(';"Física; Lab";FIS0154;'));
  chk('el ramo sin notas sale igual, con las celdas vacías',lineas[3].endsWith(';FIS0154'+';'.repeat(10)));
  const mk=leer('marketplace.js');
  chk('exportar pide confirmar con el recordatorio de los términos',
    /showConfirm\('Exportar notas'/.test(mk)&&/no lo publiques ni se lo pases a nadie/.test(mk));

  console.log('\n=== El panel en su propia pestaña (#697) ===');
  const appSrc=leer('app.js'),htmlSrc=leer('index.html'),mkSrc=leer('marketplace.js');
  chk('un profesor aprobado tiene Clases y Alumnos',/conProfesor\?\['profesor','alumnos'\]/.test(appSrc)&&/tab==='alumnos'[^\n]*renderAlumnosTab\(\)/.test(appSrc));
  chk('la pestaña y su botón existen, ocultos hasta que corresponda',/id="screen-alumnos" class="screen" hidden/.test(htmlSrc)&&/id="nav-alumnos"[^>]*aria-label="Alumnos" hidden/.test(htmlSrc));
  chk('Clases ya no lleva la sección de alumnos',!/Ver mis alumnos/.test(mkSrc)&&!/clase-alumnos/.test(mkSrc));
  chk('en la pestaña no hay "Volver": si falla, se ofrece reintentar',/volver\?'Volver':'Reintentar'/.test(mkSrc));

  console.log('\n=== Medición sin datos de nadie ===');
  chk('solo cuenta cuántos ramos o alumnos, nunca nombres ni notas',
    /track\('compartir_con_profesor',\{ramos:n\}\)/.test(mk)&&/track\('panel_alumnos_abierto',\{alumnos:alumnos\.length\}\)/.test(mk)
    &&/track\('panel_alumnos_exportado',\{alumnos:lista\.length\}\)/.test(mk));

  console.log('\n=== Lo que no se deshace se confirma (HIG) ===');
  chk('dejar de compartir, quitar alumno y cambiar link usan el diálogo de la app',
    (mk.match(/showConfirm\(/g)||[]).length>=3&&!/Toca de nuevo/.test(mk));
  chk('con Cancelar a mano',(mk.match(/focusCancel:true/g)||[]).length>=3);

  console.log('\n=== Términos y privacidad lo dicen ===');
  const terminos=leer('terminos.html'),privacidad=leer('privacidad.html');
  chk('los términos explican qué ve el profesor y cómo dejar de compartir',
    /Compartir tus notas con un profesor/.test(terminos)&&/dejar de\s+compartir/.test(terminos)&&/al menos cinco personas/.test(terminos));
  chk('y lo que se compromete el profesor, también con lo que descarga',
    /Puedes descargarlas para tu propio\s+seguimiento, pero no las publicas/.test(terminos)&&/borras lo que hayas\s+descargado/.test(terminos));
  chk('el alumno sabe al compartir que el profesor puede descargarlas',
    /puede descargarlas para hacerte seguimiento/.test(hoja)&&/puede descargarlas en un\s+archivo/.test(privacidad));
  chk('la privacidad ya no dice "con nadie" a secas',/Con nadie, salvo que tú lo decidas/.test(privacidad)&&/Con un profesor, si tú lo eliges/.test(privacidad));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
