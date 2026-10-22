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
  const avisoAprobado='Te invitaron a compartir notas con un profesor. Al entrar, tú elegirás los ramos; no verá tus otros ramos ni tu correo.';
  chk('registro y onboarding conservan el mismo contexto aprobado',
    leer('index.html').split(avisoAprobado).length===3&&
    leer('app-session.js').includes("mostrarContextoInvitacionProfesor();"));
  b.run(`globalThis.__avisos={
    'auth-invitacion-profesor':{hidden:true},'ob-invitacion-profesor':{hidden:true}};
    document.getElementById=id=>__avisos[id]||null;
    mostrarContextoInvitacionProfesor();`);
  chk('un link válido muestra el aviso antes y después de crear la cuenta',
    b.run('!__avisos["auth-invitacion-profesor"].hidden&&!__avisos["ob-invitacion-profesor"].hidden'));
  b.run('olvidarProfePendiente()');
  chk('al cancelar o terminar de compartir, el aviso desaparece',
    b.run('__avisos["auth-invitacion-profesor"].hidden&&__avisos["ob-invitacion-profesor"].hidden'));
  const sinInvitacion=contexto();
  sinInvitacion.run(`globalThis.__avisos={
    'auth-invitacion-profesor':{hidden:false},'ob-invitacion-profesor':{hidden:false}};
    document.getElementById=id=>__avisos[id]||null;
    mostrarContextoInvitacionProfesor();`);
  chk('quien llega sin link ve el registro normal',
    sinInvitacion.run('__avisos["auth-invitacion-profesor"].hidden&&__avisos["ob-invitacion-profesor"].hidden'));
  const sinRed=contexto({search:'?profe=AB3CDEFG',sesion:true});
  sinRed.run(`S.onboardingDone=true;showToast=texto=>{globalThis.__aviso=texto};
    supabaseClient={rpc:async()=>({data:null,error:{code:'NETWORK'}})};`);
  chk('un error de red conserva el link y dice cómo reintentar',
    (await sinRed.run('revisarInvitacionProfesor()'))===false&&
    sinRed.almacen.get('gradehub_profe_pendiente')==='AB3CDEFG'&&
    /Recarga GradeHub/.test(sinRed.run('__aviso')));
  sinRed.run(`supabaseClient={rpc:async()=>({data:[{nombre_publico:'Profesora sintética'}],error:null})};
    abrirHojaInvitacionProfesor=()=>{globalThis.__abierta=true};`);
  chk('cuando vuelve la conexión se puede retomar la misma invitación',
    (await sinRed.run('revisarInvitacionProfesor()'))===true&&sinRed.run('__abierta')===true);
  const excepcion=contexto({search:'?profe=AB3CDEFG',sesion:true});
  excepcion.run(`S.onboardingDone=true;showToast=()=>{};supabaseClient={rpc:async()=>{throw Error('sin red')}};`);
  chk('una excepción de red tampoco borra el link',
    (await excepcion.run('revisarInvitacionProfesor()'))===false&&
    excepcion.almacen.get('gradehub_profe_pendiente')==='AB3CDEFG');
  const invalido=contexto({search:'?profe=AB3CDEFG',sesion:true});
  invalido.run(`S.onboardingDone=true;showToast=()=>{};supabaseClient={rpc:async()=>({data:[],error:null})};`);
  chk('un código realmente inexistente sí deja de quedar pendiente',
    (await invalido.run('revisarInvitacionProfesor()'))===false&&
    !invalido.almacen.has('gradehub_profe_pendiente'));

  console.log('\n=== Compartir parte sin nada elegido ===');
  const hoja=a.run(`hojaInvitacionProfesorHTML({nombre_publico:'Academia <b>X</b>'},[{id:'r1',nombre:'Cálculo II',sigla:'MAT1620'},{id:'r2',nombre:'Física',sigla:'FIS1514'}],'Cami')`);
  chk('cada ramo es una casilla, ninguna marcada',(hoja.match(/data-compartir-ramo/g)||[]).length===2&&!/checked/.test(hoja));
  chk('el botón Compartir parte deshabilitado',/id="compartir-si" disabled/.test(hoja));
  chk('dice qué ve el profesor y dónde dejar de compartir',/cada nota de esos ramos/.test(hoja)&&/Ajustes → Datos y cuenta/.test(hoja));
  chk('el nombre del profesor va escapado',/Academia &lt;b&gt;X&lt;\/b&gt;/.test(hoja));
  const sinRamos=a.run(`hojaInvitacionProfesorHTML({nombre_publico:'Profe de prueba'},[],'Cami')`);
  chk('sin ramos la hoja ofrece una sola acción para continuar',
    /Primero agrega un ramo/.test(sinRamos)&&/id="compartir-agregar">Agregar ramo/.test(sinRamos)&&
    !/id="compartir-si"|id="compartir-nombre"/.test(sinRamos));
  const nuevo=contexto({search:'?profe=AB3CDEFG',sesion:true});
  nuevo.run(`S.onboardingDone=true;S.ramos=[];currentUser={id:'alumno-sintetico'};
    globalThis.__botones={};globalThis.__caja={innerHTML:'',querySelector(s){return __botones[s]||null}};
    for(const s of ['#compartir-no','#compartir-agregar'])__botones[s]={addEventListener(tipo,fn){this[tipo]=fn}};
    document.getElementById=()=>__caja;openModal=()=>{};track=()=>{};
    openAddRamoModal=(fn,cancel)=>{globalThis.__alGuardar=fn;globalThis.__alCancelar=cancel};
    revisarInvitacionProfesor=()=>{globalThis.__vuelta=(globalThis.__vuelta||0)+1};
    abrirHojaInvitacionProfesor('AB3CDEFG',{nombre_publico:'Profe de prueba'});
    __botones['#compartir-agregar'].click();`);
  chk('Agregar ramo abre el editor y retoma la invitación tras guardarlo',
    nuevo.run('typeof __alGuardar')==='function'&&
    (nuevo.run('__alGuardar()'),nuevo.run('__vuelta'))===1);
  nuevo.run('__alCancelar()');
  chk('Cancelar el editor vuelve a la selección, sin compartir nada',nuevo.run('__vuelta')===2);
  nuevo.run(`currentUser={id:'otra-cuenta'};__alGuardar()`);
  chk('un cambio de cuenta impide reabrir la invitación anterior',nuevo.run('__vuelta')===2);
  const agregar=contexto();
  agregar.run(`S.ramos=[];save=()=>{};track=()=>{};renderHome=()=>{};showToast=()=>{};
    crearRamoDesdeCatalogo=()=>({nombre:'Ramo sintético',categorias:[]});
    alAgregarRamo=()=>{globalThis.__catalogoVolvio=true};
    alCancelarAgregarRamo=()=>{globalThis.__cierreInesperado=true};
    addFromCatalog('Ramo sintético',null);
    globalThis.__callbackConsumido=alAgregarRamo===null;
    alAgregarRamo=()=>{globalThis.__manualVolvio=true};
    alCancelarAgregarRamo=()=>{globalThis.__cierreInesperado=true};
    document.getElementById=id=>id==='m-ramo-search'?{value:'Ramo sintético'}:
      ({classList:{remove(){}},querySelector(){return null}});
    findPresetName=()=>null;creditosDe=()=>null;uid=()=> 'ramo-sintetico';
    nextRamoColor=()=> '#777777';consensoAlAgregar=()=>{};
    confirmAddRamo();`);
  chk('agregar desde catálogo o a mano ejecuta el regreso una sola vez',
    agregar.run('__catalogoVolvio&&__manualVolvio&&__callbackConsumido&&alAgregarRamo===null&&!globalThis.__cierreInesperado'));
  agregar.run(`alCancelarAgregarRamo=()=>{globalThis.__cancelado=(globalThis.__cancelado||0)+1};closeModal();closeModal()`);
  chk('cerrar el editor llama la vuelta una sola vez',agregar.run('__cancelado')===1);
  const editada=a.run(`hojaInvitacionProfesorHTML({nombre_publico:'Academia X'},
    [{id:'r1',nombre:'Cálculo II'},{id:'r2',nombre:'Física'}],'Cami',
    {nombre_visible:'Cami',ramos:['r2']})`);
  chk('al reabrir solo aparece marcado el ramo que ya comparte',
    /value="r2" data-compartir-ramo checked/.test(editada)&&
    /value="r1" data-compartir-ramo>/.test(editada));
  chk('editar dice Guardar cambios y conserva la salida Cancelar',
    /Guardar cambios/.test(editada)&&/id="compartir-no">Cancelar/.test(editada));
  const deNuevo=contexto({search:'?profe=AB3CDEFG',sesion:true});
  deNuevo.run(`S.onboardingDone=true;
    supabaseClient={rpc:async nombre=>nombre==='profesor_por_codigo'
      ?{data:[{nombre_publico:'Academia X'}],error:null}
      :{data:{nombre_visible:'Cami',ramos:['r2']},error:null}};
    abrirHojaInvitacionProfesor=(...args)=>{globalThis.__hoja=args};`);
  chk('la cuenta conectada recibe su selección guardada',
    (await deNuevo.run('revisarInvitacionProfesor()'))===true&&
    deNuevo.run('__hoja[2].ramos.join()')==='r2');
  const sinSql=contexto({search:'?profe=AB3CDEFG',sesion:true});
  sinSql.run(`S.onboardingDone=true;
    supabaseClient={rpc:async nombre=>nombre==='profesor_por_codigo'
      ?{data:[{nombre_publico:'Academia X'}],error:null}
      :{data:null,error:{code:'PGRST202'}}};
    abrirHojaInvitacionProfesor=(...args)=>{globalThis.__hoja=args};`);
  chk('sin el SQL nuevo se conserva la hoja anterior',
    (await sinSql.run('revisarInvitacionProfesor()'))===true&&
    sinSql.run('__hoja[2]')===null);
  const falloRed=contexto({search:'?profe=AB3CDEFG',sesion:true});
  falloRed.run(`S.onboardingDone=true;
    supabaseClient={rpc:async nombre=>nombre==='profesor_por_codigo'
      ?{data:[{nombre_publico:'Academia X'}],error:null}
      :{data:null,error:{code:'NETWORK'}}};
    abrirHojaInvitacionProfesor=()=>{globalThis.__abierta=true};`);
  chk('un error de red no abre una hoja vacía que reemplace ramos',
    (await falloRed.run('revisarInvitacionProfesor()'))===false&&
    falloRed.almacen.get('gradehub_profe_pendiente')==='AB3CDEFG'&&
    falloRed.run('globalThis.__abierta')===undefined);

  console.log('\n=== El consentimiento durante el envío ===');
  const envio=contexto({sesion:true});
  envio.run(`currentUser={id:'alumno-sintetico'};S.ramos=[{id:'r1',nombre:'Cálculo'},{id:'r2',nombre:'Física'}];
    globalThis.__nodo=(valor='')=>({value:valor,textContent:'Compartir',disabled:false,hidden:true,checked:false,
      eventos:{},addEventListener(tipo,fn){this.eventos[tipo]=fn}});
    globalThis.__ui={si:__nodo(),nombre:__nodo('Ana'),no:__nodo(),error:__nodo(),r1:__nodo('r1'),r2:__nodo('r2')};
    __ui.r1.checked=true;
    globalThis.__caja={innerHTML:'',querySelector(s){return ({'#compartir-si':__ui.si,'#compartir-nombre':__ui.nombre,
      '#compartir-no':__ui.no,'#compartir-error':__ui.error})[s]||null},querySelectorAll(){return [__ui.r1,__ui.r2]}};
    document.getElementById=()=>__caja;openModal=()=>{};closeModal=()=>{globalThis.__cerrado=true};
    showToast=t=>{globalThis.__aviso=t};track=(evento,datos)=>{globalThis.__medida={evento,datos}};
    compartirConProfesor=(codigo,nombre,ramos)=>{globalThis.__enviado={codigo,nombre,ramos};
      return new Promise(res=>{globalThis.__resolver=res})};
    abrirHojaInvitacionProfesor('AB3CDEFG',{nombre_publico:'Profe de prueba'});`);
  const pendiente=envio.run('__ui.si.eventos.click()');
  chk('se congela la selección, el nombre y Cancelar mientras se envía',
    envio.run('__ui.si.disabled&&__ui.nombre.disabled&&__ui.no.disabled&&__ui.r1.disabled&&__ui.r2.disabled&&__ui.si.textContent===\'Compartiendo…\''));
  envio.run(`__ui.nombre.value='Nombre cambiado';__ui.r1.checked=false;__ui.r2.checked=false;
    __resolver({ok:true})`);
  await pendiente;
  chk('el servidor recibe la selección original y el aviso describe lo enviado',
    envio.run('__enviado.nombre')==='Ana'&&envio.run('__enviado.ramos.join()')==='r1'&&
    /1 ramo\./.test(envio.run('__aviso'))&&envio.run('__medida.datos.ramos')===1);
  envio.run(`__ui.r1.checked=true;__ui.nombre.value='Ana';__ui.si.textContent='Compartir';
    abrirHojaInvitacionProfesor('AB3CDEFG',{nombre_publico:'Profe de prueba'})`);
  const falloEnvio=envio.run('__ui.si.eventos.click()');
  envio.run(`__resolver({ok:false,error:'No pudimos compartir.'})`);
  await falloEnvio;
  chk('si falla, se puede corregir y reintentar sin perder la selección',
    envio.run(`!__ui.si.disabled&&!__ui.nombre.disabled&&!__ui.no.disabled&&!__ui.r1.disabled&&
      __ui.r1.checked&&__ui.si.textContent==='Compartir'&&!__ui.error.hidden`));
  envio.run(`__aviso=null;__cerrado=false;abrirHojaInvitacionProfesor('AB3CDEFG',{nombre_publico:'Profe de prueba'})`);
  const cambioCuenta=envio.run('__ui.si.eventos.click()');
  envio.run(`currentUser={id:'otra-cuenta'};__resolver({ok:true})`);
  await cambioCuenta;
  chk('la respuesta de una sesión anterior no cierra la hoja de otra cuenta',
    envio.run('__aviso===null&&__cerrado===false'));

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
  const dinamicaPendiente=a.run(`datosFilaAlumnoPanel({...__alDin,ramos:[{
    ...__din,categorias:[
      {id:'d1',nombre:'Prueba 1',peso:50,notas:[{id:'dn1',nombre:'Prueba 1',valor:5.0}]},
      {id:'d2',nombre:'Prueba 2',peso:50,fecha:'2026-10-15',notas:[]}]},__lab(6.0)]},new Date(2026,9,12))`);
  chk('la exigencia de Dinámica usa el laboratorio del alumno, no el del profesor',
    dinamicaPendiente.proxima&&dinamicaPendiente.proxima.necesita<7.05&&
    a.run("S.ramos[0].id==='l1'"));
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
  chk('cada ramo dice desde cuándo, y se puede cambiar',/Empezó contigo el <b>15 sep<\/b> · el día que compartió/.test(linea)&&/data-inicio-alumno="aa" data-inicio-ramo="ra"/.test(linea));
  chk('si el profesor la corrigió, no dice "el día que compartió"',!/el día que compartió/.test(a.run(`alumnosPanelHTML([{...__antesAhora,inicio:'2026-09-05'}],()=>null)`)));

  const ah0=()=>a.run('antesAhoraAlumnoHTML(metricasAlumnoPanel(__antesAhora,__cursoAA))');
  console.log('\n=== Cuándo empezó, ramo por ramo (Salva Ramos, 2026-10-20) ===');
  // Ana empezó Cálculo II el 15 de septiembre (el día que compartió) y Física
  // recién el 5 de octubre. Física: control 1 el 1 de octubre, control 2 el 10.
  a.run(`globalThis.__dos={...__antesAhora,ramos:[__antesAhora.ramos[0],{id:'rf',nombre:'Física',sigla:'FIS1514',gates:[],categorias:[
      __ev(5,'Control 1','2026-10-01',4.0),__ev(6,'Control 2','2026-10-10',6.0)]}],inicio_ramos:{rf:'2026-10-05'}}`);
  const md=a.run('metricasAlumnoPanel(__dos,()=>null)');
  const ladoDe=(nombre,ramo)=>md.evaluaciones.find(e=>e.evaluacion===nombre&&e.ramo===ramo).lado;
  chk('cada ramo corta en su propia fecha',ladoDe('Control 1','Física')==='antes'&&ladoDe('Control 2','Física')==='ahora'
    &&ladoDe('Interrogación 2','Cálculo II')==='ahora'&&ladoDe('Control 1','Cálculo II')==='antes');
  chk('sin fecha por ramo, se lee igual que antes',a.run(`metricasAlumnoPanel({...__antesAhora,inicio_ramos:{}},__cursoAA).antes.n`)===2);
  chk('la fecha general que ya existía sigue valiendo para un ramo sin fecha propia',
    a.run(`metricasAlumnoPanel({...__dos,inicio:'2026-09-05'},()=>null).evaluaciones.filter(e=>e.ramo==='Cálculo II'&&e.lado==='antes').length`)===1
    &&a.run(`metricasAlumnoPanel({...__dos,inicio:'2026-09-05'},()=>null).evaluaciones.find(e=>e.evaluacion==='Control 1'&&e.ramo==='Física').lado`)==='antes');
  chk('una fecha guardada de un ramo que no está no rompe nada',a.run(`metricasAlumnoPanel({...__antesAhora,inicio_ramos:{otro:'2026-01-01'}},__cursoAA).antes.n`)===2);
  const fichaDos=a.run('alumnosPanelHTML([__dos],()=>null)');
  chk('la ficha muestra la fecha de cada ramo con su botón',/data-inicio-ramo="ra"/.test(fichaDos)&&/data-inicio-ramo="rf"/.test(fichaDos)
    &&/Empezó contigo el <b>5 oct<\/b><\/span>/.test(fichaDos)&&/aria-label="Cambiar cuándo empezó en Física"/.test(fichaDos));
  // Cada ramo conserva su fecha: una sola marca de "empezó" mentiría.
  const curso2=`()=>({evaluaciones:[{clave:'interrogacion 1',promedio:4.0,personas:9},{clave:'control 1',promedio:4.5,personas:9},
    {clave:'interrogacion 2',promedio:4.6,personas:9},{clave:'control 2',promedio:4.5,personas:9}],categorias:[]})`;
  const grafDos=a.run(`antesAhoraAlumnoHTML(metricasAlumnoPanel(__dos,${curso2}))`);
  chk('con fechas distintas, hay una marca de cada serie, fechas en la leyenda y puntos de antes huecos',
    !/class="ah-inicio"/.test(grafDos)&&(grafDos.match(/class="ah-marca-ramo ah-serie-/g)||[]).length===2
    &&/Cálculo II · desde el 15 sep/.test(grafDos)&&/Física · desde el 5 oct/.test(grafDos)
    &&(grafDos.match(/ah-punto ah-antes/g)||[]).length===3&&/Los puntos huecos son de antes/.test(grafDos));
  chk('la descripción accesible incluye el inicio de ambos ramos',
    /aria-label="[^"]*Cálculo II · desde el 15 sep; Física · desde el 5 oct/.test(grafDos));
  const mismoInicio=a.run(`antesAhoraAlumnoHTML(metricasAlumnoPanel({...__dos,inicio_ramos:{rf:'2026-09-15'}},${curso2}))`);
  chk('con todos los ramos iniciados el mismo día conserva la marca única',
    /class="ah-inicio"/.test(mismoInicio)&&!/class="ah-marca-ramo/.test(mismoInicio));
  const grafTres=a.run(`antesAhoraAlumnoHTML(metricasAlumnoPanel({...__dos,ramos:[...__dos.ramos,
    {id:'rt',nombre:'Taller',gates:[],categorias:[__ev(7,'Interrogación 1','2026-09-03',3),__ev(8,'Interrogación 2','2026-09-17',5)]}],
    inicio_ramos:{rf:'2026-10-05',rt:'2026-09-15'}},${curso2}))`);
  const marcasTres=grafTres.match(/<line class="ah-marca-ramo[^>]+>/g)||[];
  chk('dos ramos que empiezan el mismo día conservan marcas distinguibles y la fecha en la leyenda',
    marcasTres.length===3&&marcasTres[0].match(/x1="([^"]+)/)[1]!==marcasTres[2].match(/x1="([^"]+)/)[1]
    &&/Cálculo II · desde el 15 sep/.test(grafTres)&&/Taller · desde el 15 sep/.test(grafTres));
  chk('con un ramo, la descripción accesible usa la fecha corregida de ese ramo',
    /aria-label="[^"]*empezó el 5 sep/.test(a.run(`antesAhoraAlumnoHTML(metricasAlumnoPanel({...__antesAhora,inicio_ramos:{ra:'2026-09-05'}},__cursoAA))`)));
  chk('con un solo corte, la marca de siempre y ningún punto hueco',/class="ah-inicio"/.test(ah0())&&!/ah-antes/.test(ah0()));
  const csvDos=a.run('csvAlumnosPanel([__dos],()=>null)').split('\r\n').map(l=>l.split(';'));
  chk('el Excel dice cuándo empezó en cada ramo, en una columna al final',csvDos[0][13]==='Empezó contigo en este ramo'
    &&csvDos.find(f=>f[1]==='Física')[13]==='2026-10-05'&&csvDos.find(f=>f[1]==='Cálculo II')[13]==='2026-09-15'
    &&csvDos.find(f=>f[1]==='Física'&&f[4]==='Control 1')[11]==='antes');

  console.log('\n=== Por sección (Salva Ramos, 2026-10-20) ===');
  a.run(`globalThis.__sec3={seccion:3,ramo:{promedio:5.2,personas:6},evaluaciones:[{clave:'interrogacion 1',promedio:3.5,personas:6}],categorias:[{clave:'interrogacion 1',promedio:3.5,personas:6}]}`);
  const fichaSec=a.run(`ramoPanelHTML({...__antesAhora.ramos[0],seccion:3},__sec3)`);
  chk('con su sección: el promedio de la sección y la columna dice "Su sección"',
    /5\.2<small>Sección 3 · 6 personas<\/small>/.test(fichaSec)&&/<th>Su sección<\/th>/.test(fichaSec)&&/3\.5<small>6 personas/.test(fichaSec));
  const fichaSin=a.run(`ramoPanelHTML(__antesAhora.ramos[0],SIN_SECCION_PANEL)`);
  chk('sin sección declarada: "no disponible", sin cifras ni "aún pocos datos"',
    /No disponible<small>sin sección<\/small>/.test(fichaSin)&&!/pocos datos|personas<\/small>/.test(fichaSin)&&/<th>Su sección<\/th>/.test(fichaSin));
  chk('la comparación con todo GradeHub queda como estaba',
    /4\.5<small>GradeHub · 30 personas/.test(a.run(`ramoPanelHTML(__antesAhora.ramos[0],__cursoAA())`))&&/<th>GradeHub<\/th>/.test(a.run(`ramoPanelHTML(__antesAhora.ramos[0],__cursoAA())`)));
  const fichaSinAl=a.run(`alumnosPanelHTML([__antesAhora],()=>SIN_SECCION_PANEL)`);
  chk('un alumno sin sección en ningún ramo: el antes y ahora lo dice',/Por sección: no disponible, no declaró su sección/.test(fichaSinAl));
  chk('y sin sección no hay diferencia que inventar',a.run('metricasAlumnoPanel(__antesAhora,()=>SIN_SECCION_PANEL).ahora.nComparadas')===0);
  const grupoSec=a.run(`antesAhoraGrupoHTML(metricasGrupoPanel([__antesAhora,__poco],__cursoAA),{seccion:true,sinSeccion:1})`);
  chk('el grupo dice "Respecto de su sección" y cuántos no la declararon',
    /Respecto de su sección/.test(grupoSec)&&/su misma sección en GradeHub/.test(grupoSec)&&/1 alumno no declaró su sección en algún ramo/.test(grupoSec)&&!/Respecto del curso/.test(grupoSec));
  const control=a.run('comparaPanelHTML(true)');
  chk('el control: dos opciones, la elegida marcada para VoiceOver',/role="group" aria-label="Comparar con"/.test(control)
    &&/data-compara="seccion" aria-pressed="true">Su sección/.test(control)&&/data-compara="gradehub" aria-pressed="false">Todo GradeHub/.test(control));
  chk('si el navegador no deja guardar la elección, parte en todo GradeHub',
    a.run(`(()=>{const g=globalThis.localStorage;Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('bloqueado')}});
      const r=comparaSeccionGuardado();guardarComparaSeccion(true);Object.defineProperty(globalThis,'localStorage',{configurable:true,value:g,writable:true});return r;})()`)===false);
  const csvSec=a.run(`csvAlumnosPanel([{...__antesAhora,ramos:[{...__antesAhora.ramos[0],seccion:3}]},{...__poco,ramos:[{...__poco.ramos[0],id:'rp'}]}],__cursoAA,
    (al,r)=>Number.isInteger(r.seccion)?__sec3:SIN_SECCION_PANEL)`).split('\r\n').map(l=>l.split(';'));
  const filaSec=csvSec.find(f=>f[0]==='Ana'&&f[4]==='Interrogación 1'),filaSin=csvSec.find(f=>f[0]==='Beto');
  chk('el Excel suma la sección y sus promedios al final',filaSec[14]==='3'&&filaSec[15]==='3,5'&&filaSec[17]==='5,2'&&filaSec[7]==='4,0');
  chk('y dice "no declarada" cuando falta',filaSin[14]==='no declarada'&&filaSin[15]===''&&filaSin[17]==='');
  const mkSec=leer('marketplace.js');
  chk('por sección consulta con p_seccion y el resumen por ramo sigue contra todo GradeHub',
    /p_seccion:Number\(seccion\)/.test(mkSec)&&/resumenAlumnosPanel\(alumnos,compGeneral\)/.test(mkSec)
    &&/exportarAlumnosPanel\(paraExportar,compGeneral,compSeccion,formato\)/.test(mkSec));

  console.log('\n=== Un alumno con varios ramos (2026-10-21) ===');
  const fichaVarios=a.run(`alumnosPanelHTML([__dos],()=>null)`);
  chk('la fila muestra el estado de cada ramo, con su nombre',
    /panel-alumnos-fila-estados/.test(fichaVarios)&&/aria-label="Cálculo II: [a-z ]+">Cálculo II · /.test(fichaVarios)&&/aria-label="Física: [a-z ]+">Física · /.test(fichaVarios));
  chk('con un ramo, la fila dice ramo y estado con el mismo semáforo',
    /panel-alumnos-fila-estados/.test(a.run(`alumnosPanelHTML([__antesAhora],()=>null)`))
    &&/aria-label="Cálculo II: [a-z ]+">Cálculo II · (Aprobando|Al borde|Reprobando|Sin notas)</.test(a.run(`alumnosPanelHTML([__antesAhora],()=>null)`)));
  chk('con varios ramos, cada uno parte plegado y se abre con su flecha',
    (fichaVarios.match(/<details class="panel-alumnos-ramo" data-ramo="r[af]">/g)||[]).length===2&&/<summary class="panel-alumnos-ramo-cabeza">/.test(fichaVarios));
  chk('con un solo ramo, parte abierto',/<details class="panel-alumnos-ramo" data-ramo="ra" open>/.test(a.run(`alumnosPanelHTML([__antesAhora],()=>null)`)));
  const graf2=a.run(`antesAhoraAlumnoHTML(metricasAlumnoPanel(__dos,${curso2}))`);
  chk('el gráfico dibuja una línea por ramo, cada una con su serie',
    /<g class="ah-serie-0"><path class="ah-linea"/.test(graf2)&&/<g class="ah-serie-1">/.test(graf2)&&(graf2.match(/class="ah-linea"/g)||[]).length>=1);
  chk('y una leyenda con nombre y fecha de cada ramo: el color solo no basta',
    /<p class="ah-leyenda"><span class="ah-serie-0"><i aria-hidden="true"><\/i>Cálculo II · desde el 15 sep<\/span><span class="ah-serie-1"><i aria-hidden="true"><\/i>Física · desde el 5 oct<\/span>/.test(graf2)
    &&/aria-label="Diferencia con el curso en \d+ evaluaciones de 2 ramos/.test(graf2));
  const nombreLargo=a.run(`ramoPanelHTML({...__antesAhora.ramos[0],nombre:'Introducción a la Programación'},__cursoAA())`);
  chk('el ramo largo no se trunca y sus cifras quedan antes de la flecha',
    /panel-alumnos-ramo-resumen/.test(nombreLargo)&&/Introducción a la Programación/.test(nombreLargo)
    &&nombreLargo.indexOf('Introducción a la Programación')<nombreLargo.indexOf('panel-alumnos-ramo-cifras'));
  chk('con un ramo no hay leyenda',!/ah-leyenda/.test(ah0()));
  const css=leer('styles.css');
  chk('las series no usan los colores del semáforo',!/\.ah-serie-\d\{--serie:var\(--(green|yellow|red|primary)/.test(css));
  chk('solo gira la flecha de lo abierto, no la de todo lo que hay adentro',
    /\.panel-alumnos-alumno\[open\]>summary::after,\.panel-alumnos-alumno details\[open\]>summary::after\{transform:rotate\(90deg\)/.test(css)
    &&!/\.panel-alumnos-alumno\[open\] summary::after/.test(css));
  chk('la hoja del alumno pide los ramos en que toma clases con ese profesor',
    /Elige los ramos en que tomas clases con \$\{esc\(profe\.nombre_publico\)\}/.test(leer('marketplace.js')));

  console.log('\n=== Antes y ahora: la pantalla (#697) ===');
  const gh=a.run('antesAhoraGrupoHTML(metricasGrupoPanel([__antesAhora,__poco],__cursoAA))');
  chk('las tres cifras del grupo: respecto del curso, mejoraron y aprobación',
    /ah-cifra-valor">\+1\.7</.test(gh)&&/ah-cifra-valor">1 de 1</.test(gh)&&/0% → 100%/.test(gh));
  chk('dice con cuántas evaluaciones y cuántas sin fecha no cuentan',/Con 7 evaluaciones con fecha; 1 evaluación sin fecha no cuenta/.test(gh));
  const unaFecha=a.run(`antesAhoraGrupoHTML({alumnos:[{}],antes:{n:0,promedio:null,aprobacion:null},ahora:{n:1,promedio:4,aprobacion:1},sinFecha:0,cambioMediana:null,conCambio:0,mejoraron:0})`);
  chk('con una evaluación usa singular',/Con 1 evaluación con fecha/.test(unaFecha));
  chk('y advierte que no prueba que sea por las clases',/No prueba que la mejora sea por tus clases/.test(gh));
  const ah=ah0();
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
  chk('un alumno abre su detalle; con varios, la lista parte compacta',
    /class="panel-alumnos-alumno" open/.test(lista)&&
    !/class="panel-alumnos-alumno" open/.test(a.run(`alumnosPanelHTML(__al,()=>null)`)));
  chk('la lista compacta indica visualmente qué fila se despliega',
    /\.panel-alumnos-alumno summary::after\{content:'›'/.test(leer('styles.css')));
  console.log('\n=== Estado y prioridad visibles sin abrir al alumno ===');
  const riesgo=contexto();
  riesgo.run(`globalThis.__hoyRiesgo=new Date(2026,9,12,10);
    globalThis.__ramoRiesgo=(id,nota)=>({id,nombre:'Cálculo sintético',sigla:'TST100',gates:[],categorias:[
      {id:id+'-i1',nombre:'Prueba 1',peso:50,notas:nota===null?[]:[{id:id+'-n1',nombre:'Prueba 1',valor:nota}]},
      {id:id+'-i2',nombre:'Prueba 2',peso:50,fecha:'2026-10-15',notas:[]}]});
    globalThis.__grupoRiesgo=[
      {id:'ap',nombre_visible:'Aprobado',tenant:'uc',ramos:[__ramoRiesgo('ap',6.0)]},
      {id:'sn',nombre_visible:'Sin notas',tenant:'uc',ramos:[__ramoRiesgo('sn',null)]},
      {id:'ab',nombre_visible:'Al borde',tenant:'uc',ramos:[__ramoRiesgo('ab',4.5)]},
      {id:'rp',nombre_visible:'Reprobando',tenant:'uc',ramos:[__ramoRiesgo('rp',2.0)]}];
    S.tenant='uc';S.ramos=[__ramoRiesgo('profesor',7.0)];globalThis.__ramosProfesor=S.ramos;`);
  const filasRiesgo=riesgo.run('alumnosPanelHTML(__grupoRiesgo,()=>null,__hoyRiesgo)');
  chk('ordena por necesidad real: reprobando, al borde, aprobando, sin notas',
    ['Reprobando','Al borde','Aprobado','Sin notas'].map(n=>filasRiesgo.indexOf(`<b>${n}</b>`))
      .every((p,i,ps)=>p>=0&&(i===0||ps[i-1]<p)));
  chk('cada fila trae estado semántico, próxima prueba y cuánto necesita',
    /panel-resumen-bad[^>]*>Cálculo sintético · Reprobando/.test(filasRiesgo)&&
    /panel-resumen-warn[^>]*>Cálculo sintético · Al borde/.test(filasRiesgo)&&
    /panel-resumen-good[^>]*>Cálculo sintético · Aprobando/.test(filasRiesgo)&&
    (filasRiesgo.match(/class="panel-alumnos-fila-proxima">Próxima: <b>Prueba 2<\/b>/g)||[]).length===4&&
    /Para aprobar: 5,9 en lo pendiente/.test(filasRiesgo));
  chk('sin notas no se inventa una exigencia personal',
    /Aún sin notas para calcular cuánto necesita/.test(filasRiesgo));
  const sinFecha=riesgo.run(`alumnosPanelHTML([{id:'sf',nombre_visible:'Sin fecha',tenant:'uc',ramos:[
    {id:'sf-r',nombre:'Ramo sin fecha',gates:[],categorias:[
      {id:'sf-i1',nombre:'Prueba 1',peso:50,notas:[{id:'sf-n1',nombre:'Prueba 1',valor:3.0}]},
      {id:'sf-i2',nombre:'Talleres',peso:50,slots:2,notas:[]}]}]}],()=>null,__hoyRiesgo)`);
  chk('sin fecha futura, la fila conserva cuánto necesita en lo pendiente',
    /Sin próxima evaluación con fecha/.test(sinFecha)&&/Para aprobar Ramo sin fecha: [\d,]+ en lo pendiente/.test(sinFecha));
  chk('el cálculo no deja los ramos del alumno en la cuenta del profesor',
    riesgo.run('S.ramos===__ramosProfesor&&S.tenant===\'uc\''));
  const quizLiviano=riesgo.run(`(globalThis.__quizAlumno={id:'quiz',nombre_visible:'Quiz liviano',tenant:'uc',ramos:[
    {id:'q',nombre:'Ramo sintético',gates:[],categorias:[
      {id:'conocido',nombre:'Prueba 1',peso:75,notas:[{id:'c',nombre:'Prueba 1',valor:3.8}]},
      {id:'quiz',nombre:'Quiz',peso:5,fecha:'2026-10-15',notas:[]},
      {id:'final',nombre:'Examen',peso:20,slots:2,notas:[]}]}]},datosFilaAlumnoPanel(__quizAlumno,__hoyRiesgo))`);
  const urgente=riesgo.run('datosFilaAlumnoPanel(__grupoRiesgo[3],__hoyRiesgo)');
  chk('un quiz liviano no parece más grave por pedir mucho en esa sola nota',
    quizLiviano.proxima.pesaPoco&&Number(quizLiviano.proxima.cuatro.nota)>6&&
    quizLiviano.proxima.necesita<5&&quizLiviano.prioridad<urgente.prioridad);
  const uniRiesgo=riesgo.run(`(S.tenant='uc',datosFilaAlumnoPanel({id:'ua',nombre_visible:'UAndes',tenant:'uandes',ramos:[
    {id:'ua1',nombre:'Ramo sintético',gates:[],categorias:[
      {id:'u1',nombre:'Prueba 1',peso:50,notas:[{id:'un1',nombre:'Prueba 1',valor:3.892}]},
      {id:'u2',nombre:'Prueba 2',peso:50,notas:[{id:'un2',nombre:'Prueba 2',valor:4.0}]}]}]},__hoyRiesgo))`);
  chk('el semáforo aplica el redondeo del alumno UAndes',uniRiesgo.nivel==='warn'&&riesgo.run('S.tenant')==='uc');
  console.log('\n=== Jerarquía del panel a 1, 4 y 6 alumnos ===');
  const pantallaAlumnos=leer('index.html').split('id="screen-alumnos"')[1].split('id="screen-admin"')[0];
  // El título de la pantalla va en la barra, como en iOS, y es el encabezado
  // de la página (Lucas, 2026-10-22: el título grande no iba con nada).
  chk('la barra dice Alumnos y es el único título principal',
    /<h1 class="brand-word"[^>]*>Alumnos<\/h1>/.test(pantallaAlumnos)&&!/>GradeHub</.test(pantallaAlumnos));
  for(const n of [1,4,6]){
    a.run(`globalThis.__alumnosVista=Array.from({length:${n}},(_,i)=>({id:'a'+i,nombre_visible:'Alumno '+(i+1),tenant:'uc',ramos:[]}));
      globalThis.__raizVista={innerHTML:'',querySelector:()=>({addEventListener(){},querySelectorAll(){return []}})};
      supabaseClient={rpc:async nombre=>nombre==='codigo_alumnos_profesor'?{data:'AB3CDEFG',error:null}:{data:__alumnosVista,error:null}};`);
    await a.run('renderAlumnosProfesor(__raizVista)');
    const vista=a.run('__raizVista.innerHTML');
    chk(`${n} alumnos: la lista compacta aparece primero y las cifras se cargan al abrir su vista`,
      vista.indexOf('<h2>Conectados</h2>')<vista.indexOf('Alumno 1')&&
      /data-ver-alumno="a0"/.test(vista)&&!/data-alumno="a0"|Cómo van tus alumnos/.test(vista));
    chk(`${n} alumnos: vistas relacionadas sin poner Invitar en el control segmentado`,
      /data-panel-vista="lista"/.test(vista)&&/data-panel-vista="grupo"/.test(vista)&&
      (n>1)===/data-panel-vista="ramos"/.test(vista)&&
      /id="alumnos-ir-invitar"/.test(vista)&&!/data-panel-vista="invitar"/.test(vista));
    chk(`${n} alumnos: sin título grande ni ceja dentro del panel`,
      !/<h1|TU ESPACIO DE PROFESOR|profesor-hig-cabecera/.test(vista));
  }
  const compacta=a.run(`alumnosPanelHTML([__antesAhora],__cursoAA,new Date(),{soloFilas:true})`);
  chk('la fila compacta conserva estado y próxima evaluación sin construir tablas ni gráfico',
    /data-ver-alumno="aa"/.test(compacta)&&/Cálculo II · /.test(compacta)
    &&!/panel-alumnos-notas|ah-grafico|data-quitar-alumno|<details/.test(compacta));
  a.run(`globalThis.__panelNodos={};
    globalThis.__nodoPanel=()=>({hidden:false,innerHTML:'',textContent:'',value:'',dataset:{},handlers:{},
      addEventListener(tipo,fn){this.handlers[tipo]=fn},querySelectorAll(){return []},
      setAttribute(nombre,valor){this[nombre]=valor},focus(){this.enfocado=true}});
    globalThis.__tabsPanel=['lista','grupo','ramos'].map(v=>({...__nodoPanel(),dataset:{panelVista:v}}));
    globalThis.__compPanel=['gradehub','seccion'].map(v=>({...__nodoPanel(),dataset:{compara:v}}));
    globalThis.__compPanelFicha=['gradehub','seccion'].map(v=>({...__nodoPanel(),dataset:{compara:v}}));
    globalThis.__raizPanel={innerHTML:'',scrollIntoView(){},querySelector(sel){
      if(!__panelNodos[sel])__panelNodos[sel]=__nodoPanel();
      if(sel==='.panel-alumnos-vistas')__panelNodos[sel].querySelectorAll=()=>__tabsPanel;
      if(sel==='#alumnos-compara-wrap .panel-alumnos-compara')__panelNodos[sel].querySelectorAll=()=>__compPanel;
      if(sel==='#alumnos-ficha-compara-wrap .panel-alumnos-compara')__panelNodos[sel].querySelectorAll=()=>__compPanelFicha;
      return __panelNodos[sel];}};
    globalThis.__muchos=Array.from({length:51},(_,i)=>({id:'p'+i,nombre_visible:'Persona '+(i+1),tenant:'uc',ramos:[]}));
    supabaseClient={rpc:async nombre=>nombre==='codigo_alumnos_profesor'?{data:'AB3CDEFG',error:null}:{data:__muchos,error:null}};`);
  await a.run('renderAlumnosProfesor(__raizPanel)');
  const inicial51=a.run('__raizPanel.innerHTML');
  const htmlFicha=inicial51.match(/<section class="panel-alumnos-vista panel-alumnos-ficha" id="alumnos-vista-ficha" hidden>([\s\S]*?)<\/section>/)?.[1]||'';
  chk('la ficha pone ‹ Lista, nombre sintético y comparación en ese orden',
    /id="alumnos-ficha-volver"/.test(htmlFicha)&&/id="alumnos-ficha-titulo"/.test(htmlFicha)&&
    /Todo GradeHub/.test(htmlFicha)&&/Su sección/.test(htmlFicha)&&
    htmlFicha.indexOf('id="alumnos-ficha-volver"')<htmlFicha.indexOf('id="alumnos-ficha-titulo"')&&
    htmlFicha.indexOf('id="alumnos-ficha-titulo"')<htmlFicha.indexOf('Todo GradeHub'));
  chk('Lista y Cómo van conservan el control sobre sus vistas',
    inicial51.indexOf('id="alumnos-compara-wrap"')<inicial51.indexOf('id="alumnos-vista-lista"')&&
    inicial51.indexOf('id="alumnos-compara-wrap"')<inicial51.indexOf('id="alumnos-vista-grupo"'));
  chk('con 51 alumnos muestra 50 filas compactas y no precarga fichas ni resúmenes',
    (inicial51.match(/data-ver-alumno="p\d+"/g)||[]).length===50
    &&!/data-alumno="p\d+"|Cómo van tus alumnos|Resumen por ramo/.test(inicial51)
    &&/id="alumnos-mas"/.test(inicial51));
  a.run(`__panelNodos['#alumnos-mas'].handlers.click()`);
  chk('Mostrar 50 más añade la fila 51 y luego se esconde',
    (a.run(`__panelNodos['#alumnos-lista'].innerHTML`).match(/data-ver-alumno="p\d+"/g)||[]).length===51
    &&a.run(`__panelNodos['#alumnos-mas'].hidden`)===true);
  a.run(`__panelNodos['#alumnos-lista'].handlers.click({target:{closest:()=>({dataset:{verAlumno:'p50'},focus(){}})}})`);
  chk('al abrir un alumno, la lista se oculta y solo se construye su ficha',
    a.run(`__panelNodos['#alumnos-vista-lista'].hidden`)===true&&
    a.run(`__panelNodos['#alumnos-vista-ficha'].hidden`)===false&&
    a.run(`__panelNodos['#alumnos-compara-wrap'].hidden`)===true&&
    a.run(`__panelNodos['#alumnos-ficha-titulo'].textContent`)==='Persona 51'&&
    /data-quitar-alumno="p50"/.test(a.run(`__panelNodos['#alumnos-ficha-contenido'].innerHTML`)));
  await a.run(`__compPanelFicha[1].handlers.click()`);
  chk('la comparación de la ficha actualiza también el control de Lista',
    a.run(`__compPanelFicha[1]['aria-pressed']`)==='true'&&
    a.run(`__compPanel[1]['aria-pressed']`)==='true'&&
    a.almacen.get('gh_panel_compara')==='seccion');
  a.run(`__panelNodos['#alumnos-ficha-volver'].handlers.click()`);
  chk('volver restaura la lista sin perder el tramo mostrado',
    a.run(`__panelNodos['#alumnos-vista-lista'].hidden`)===false&&
    a.run(`__panelNodos['#alumnos-compara-wrap'].hidden`)===false&&
    (a.run(`__panelNodos['#alumnos-lista'].innerHTML`).match(/data-ver-alumno="p\d+"/g)||[]).length===51);
  a.run(`__tabsPanel[1].handlers.click()`);
  chk('Cómo van se carga solo al abrir su vista',
    a.run(`__panelNodos['#alumnos-vista-grupo'].hidden`)===false&&
    /Cómo van tus alumnos/.test(a.run(`__panelNodos['#alumnos-vista-grupo'].innerHTML`)));
  a.run(`__tabsPanel[2].handlers.click()`);
  chk('Por ramo muestra su resumen sin cambiar la comparación del grupo',
    a.run(`__panelNodos['#alumnos-vista-ramos'].hidden`)===false&&
    /Resumen por ramo/.test(a.run(`__panelNodos['#alumnos-vista-ramos'].innerHTML`))&&
    a.run(`__panelNodos['#alumnos-compara-wrap'].hidden`)===true);
  a.run(`__panelNodos['#alumnos-ir-invitar'].handlers.click()`);
  chk('Invitar abre el link en su propia vista y ofrece volver',
    a.run(`__panelNodos['#alumnos-vista-invitar'].hidden`)===false&&
    a.run(`__panelNodos['.panel-alumnos-vistas'].hidden`)===true&&
    /id="alumnos-compartir"/.test(inicial51));
  a.run(`__panelNodos['#alumnos-invitacion-volver'].handlers.click()`);
  a.run(`__panelNodos['#alumnos-buscar'].value='Persona 51';__panelNodos['#alumnos-buscar'].handlers.input()`);
  chk('buscar filtra entre los 51 en el navegador y reinicia la paginación',
    /data-ver-alumno="p50"/.test(a.run(`__panelNodos['#alumnos-lista'].innerHTML`))&&
    (a.run(`__panelNodos['#alumnos-lista'].innerHTML`).match(/data-ver-alumno=/g)||[]).length===1&&
    a.run(`__panelNodos['#alumnos-cuenta'].textContent`)==='1 de 51');
  a.run(`__panelNodos['#alumnos-buscar'].value='';__panelNodos['#alumnos-buscar'].handlers.input();
    showConfirm=(titulo,mensaje,accion)=>{globalThis.__mensajeExportar=mensaje;globalThis.__accionExportar=accion};
    globalThis.__elegirArchivoReal=elegirArchivoAlumnosPanel;
    elegirArchivoAlumnosPanel=accion=>{globalThis.__elegirArchivo=accion};
    exportarAlumnosPanel=(lista,comp,sec,formato)=>{globalThis.__exportados=lista.map(al=>al.id);globalThis.__formatoExportado=formato};`);
  const visiblesExportar=[...a.run(`__panelNodos['#alumnos-lista'].innerHTML`).matchAll(/data-ver-alumno="([^"]+)"/g)].map(x=>x[1]);
  await a.run(`__panelNodos['#alumnos-exportar'].handlers.click()`);
  a.run(`__elegirArchivo('detalle')`);
  a.run(`__accionExportar()`);
  // La paginación es de la pantalla, no del archivo: con 51 alumnos y 50
  // filas pintadas, el Excel trae a los 51, partiendo en el orden de la lista.
  chk('el Excel trae a todos los que calzan con la búsqueda, en el orden de la lista',
    visiblesExportar.length===50&&a.run('__exportados.length')===51&&
    a.run('__exportados.slice(0,50).join(",")')===visiblesExportar.join(',')&&
    /51 alumnos/.test(a.run('__mensajeExportar'))&&a.run('__formatoExportado')==='detalle');
  a.run(`__panelNodos['#alumnos-buscar'].value='Persona 51';__panelNodos['#alumnos-buscar'].handlers.input()`);
  await a.run(`__panelNodos['#alumnos-exportar'].handlers.click()`);
  a.run(`__elegirArchivo('resumen')`);
  a.run(`__accionExportar()`);
  chk('con una búsqueda escrita, el resumen solo trae los que calzan',a.run('__exportados.join(",")')==='p50'&&/1 alumno/.test(a.run('__mensajeExportar'))&&a.run('__formatoExportado')==='resumen');
  a.run(`elegirArchivoAlumnosPanel=__elegirArchivoReal`);
  a.run(`__panelNodos['#alumnos-buscar'].value='';__panelNodos['#alumnos-buscar'].handlers.input()`);
  const pagina300=a.run(`alumnosPanelHTML(Array.from({length:300},(_,i)=>({id:'m'+i,nombre_visible:'Alumno '+i,tenant:'uc',ramos:[]})),()=>null,new Date(),{soloFilas:true,limite:50})`);
  chk('con 300 alumnos el HTML inicial sigue limitado a 50 filas sin fichas completas',
    (pagina300.match(/data-ver-alumno=/g)||[]).length===50&&!/<details|data-quitar-alumno/.test(pagina300));

  console.log('\n=== Cambio de cuenta durante la carga del panel ===');
  const cambio=contexto({sesion:true});
  cambio.run(`S.tipoCuenta='profesor';S.onboardingDone=true;
    globalThis.__raizSesion={innerHTML:'',isConnected:true,querySelector:()=>({addEventListener(){},querySelectorAll(){return []}})};
    globalThis.__resolverAlumnos=null;
    supabaseClient={rpc:nombre=>nombre==='codigo_alumnos_profesor'
      ?Promise.resolve({data:'AB3CDEFG',error:null})
      :nombre==='mis_alumnos_ejemplo'?Promise.resolve({data:false,error:null})
      :new Promise(resolve=>{__resolverAlumnos=resolve})};
    currentUser={id:'profesor-uno'};
    globalThis.__cargaSesion=renderAlumnosProfesor(__raizSesion);`);
  cambio.run(`currentUser={id:'profesor-dos'};
    __raizSesion.innerHTML='<p>Panel de la cuenta nueva</p>';
    __resolverAlumnos({data:[{id:'alumno-anterior',nombre_visible:'Alumno anterior',tenant:'uc',ramos:[]}],error:null});`);
  await cambio.run('__cargaSesion');
  chk('una respuesta del profesor anterior no pinta sus alumnos en la cuenta nueva',
    cambio.run('__raizSesion.innerHTML')==='<p>Panel de la cuenta nueva</p>');
  const comparacion=contexto({sesion:true});
  comparacion.run(`S.tipoCuenta='profesor';S.onboardingDone=true;
    globalThis.__raizComparacion={innerHTML:'',isConnected:true,querySelector:()=>({addEventListener(){},querySelectorAll(){return []}})};
    globalThis.__resolverComparacion=null;
    currentUser={id:'profesor-uno'};
    supabaseClient={rpc:nombre=>nombre==='codigo_alumnos_profesor'
      ?Promise.resolve({data:'AB3CDEFG',error:null})
      :nombre==='mis_alumnos_ejemplo'?Promise.resolve({data:false,error:null})
      :nombre==='mis_alumnos'
        ?Promise.resolve({data:[{id:'alumno-anterior',nombre_visible:'Alumno anterior',tenant:'uc',
          ramos:[{id:'ramo',nombre:'Cálculo',sigla:'MAT100',categorias:[]}]}],error:null})
        :new Promise(resolve=>{__resolverComparacion=resolve})};
    globalThis.__cargaComparacion=renderAlumnosProfesor(__raizComparacion);`);
  // Unas vueltas de promesas: la carga también pregunta por alumnos_ejemplo.
  for(let i=0;i<10;i++)await Promise.resolve();
  chk('el panel pide la comparación solo tras recibir los ramos',
    comparacion.run('typeof __resolverComparacion')==='function');
  comparacion.run(`currentUser={id:'profesor-dos'};
    __raizComparacion.innerHTML='<p>Panel de la cuenta nueva</p>';
    __resolverComparacion({data:null,error:null});`);
  await comparacion.run('__cargaComparacion');
  chk('una comparación tardía tampoco restaura alumnos de otra sesión',
    comparacion.run('__raizComparacion.innerHTML')==='<p>Panel de la cuenta nueva</p>');
  const perfil=contexto({sesion:true});
  perfil.run(`S.tipoCuenta='profesor';currentUser={id:'profesor-uno'};
    globalThis.__resolverPerfil=null;globalThis.__panelAbierto=0;
    perfilProfesorConocido=()=>undefined;
    cargarPerfilProfesor=()=>new Promise(resolve=>{__resolverPerfil=resolve});
    esProfesorAprobado=()=>true;
    renderAlumnosProfesor=()=>{__panelAbierto++};
    globalThis.__cargaPerfil=renderAlumnosTab();
    currentUser={id:'profesor-dos'};__resolverPerfil();`);
  await perfil.run('__cargaPerfil');
  chk('una ficha de profesor tardía no abre Alumnos después de cambiar de cuenta',
    perfil.run('__panelAbierto')===0);

  console.log('\n=== Alumnos de ejemplo (2026-10-22) ===');
  const ej=contexto({sesion:true});
  ej.run(`S.tipoCuenta='profesor';S.onboardingDone=true;currentUser={id:'profesor-ejemplo'};
    globalThis.__llamadasEj=[];globalThis.__activoEj=true;
    globalThis.__raizEj={innerHTML:'',isConnected:true,querySelector:()=>({addEventListener(){},querySelectorAll(){return []},hidden:false,innerHTML:''})};
    supabaseClient={rpc:(nombre,args)=>{__llamadasEj.push(nombre);
      if(nombre==='codigo_alumnos_profesor')return Promise.resolve({data:'AB3CDEFG',error:null});
      if(nombre==='mis_alumnos_ejemplo')return Promise.resolve({data:__activoEj,error:null});
      if(nombre==='mis_alumnos')return Promise.resolve({data:[],error:null});
      return Promise.resolve({data:null,error:{message:'no debería llamarse'}});}};`);
  const datosEj=ej.run('datosEjemploAlumnosPanel(new Date(2026,9,22))');
  chk('arma alumnos sintéticos, marcados como ejemplo, con ramos y notas',
    datosEj.alumnos.length>0&&datosEj.alumnos.every(al=>/\(ejemplo\)$/.test(al.nombre_visible)&&al.tenant==='uc')
    &&datosEj.alumnos.some(al=>al.ramos.some(r=>(r.categorias||[]).some(c=>(c.notas||[]).length))));
  chk('las notas inventadas son de 1 a 7 y ninguna es del futuro',
    datosEj.alumnos.flatMap(al=>al.ramos).flatMap(r=>r.categorias||[]).flatMap(c=>c.notas||[])
      .every(n=>n.valor>=1&&n.valor<=7&&n.fecha<='2026-10-22'));
  chk('las fechas van relativas a hoy: un año después siguen sin ser futuras',
    ej.run(`datosEjemploAlumnosPanel(new Date(2027,9,22)).alumnos.flatMap(al=>al.ramos).flatMap(r=>r.categorias||[]).flatMap(c=>c.notas||[]).every(n=>n.fecha<='2027-10-22'&&n.fecha>='2027-08-01')`));
  chk('la comparación de ejemplo respeta el piso de cinco',
    ej.run(`(()=>{const d=datosEjemploAlumnosPanel(new Date(2026,9,22));const sig=claveRamoCurso(d.alumnos[0].ramos[0],'uc');
      const c=comparacionEjemploPanel(d,sig),s=comparacionEjemploPanel(d,sig,999);
      return !!c.ramo&&c.ramo.personas>=5&&c.evaluaciones.every(e=>e.personas>=5)&&s.ramo===null&&s.evaluaciones.length===0;})()`));
  await ej.run('renderAlumnosProfesor(__raizEj)');
  const vistaEj=ej.run('__raizEj.innerHTML');
  chk('con el modo activo, el panel muestra a los alumnos de ejemplo con la franja',
    /class="panel-alumnos-ejemplo" role="note"><b>Ejemplo<\/b>/.test(vistaEj)&&/\(ejemplo\)/.test(vistaEj));
  chk('sin exportar: un Excel de mentira no tiene para qué salir',!/id="alumnos-exportar"/.test(vistaEj));
  chk('el link de invitación sigue siendo el real',/AB3CDEFG/.test(vistaEj));
  chk('nada de los alumnos de ejemplo se pide ni se escribe en la base',
    ej.run('__llamadasEj').every(n=>['codigo_alumnos_profesor','mis_alumnos','mis_alumnos_ejemplo'].includes(n)));
  chk('cambiar una fecha o quitar a un alumno queda en memoria',
    ej.run(`(()=>{const d=ejemploAlumnosPanel.datos,al=d.alumnos[0],r=al.ramos[0];let ok=true;
      return rpcEjemploPanel(d,'fijar_inicio_ramo_alumno',{p_id:al.id,p_ramo:r.id,p_inicio:'2026-09-01'}).then(x=>{ok=ok&&x.data===true&&al.inicio_ramos[r.id]==='2026-09-01';
        return rpcEjemploPanel(d,'quitar_alumno',{p_id:al.id});}).then(x=>ok&&x.data===true&&!d.alumnos.some(y=>y.id===al.id));})()`));
  ej.run(`__activoEj=false;__llamadasEj=[];`);
  await ej.run('renderAlumnosProfesor(__raizEj)');
  chk('si el administrador lo apaga, al volver a la pestaña está el panel real',
    !/panel-alumnos-ejemplo|\(ejemplo\)/.test(ej.run('__raizEj.innerHTML')));
  ej.run(`supabaseClient.rpc=(nombre)=>nombre==='mis_alumnos_ejemplo'?Promise.resolve({data:null,error:{message:'function does not exist'}})
    :nombre==='codigo_alumnos_profesor'?Promise.resolve({data:'AB3CDEFG',error:null}):Promise.resolve({data:[],error:null});`);
  await ej.run('renderAlumnosProfesor(__raizEj)');
  chk('sin el SQL aplicado, el panel sigue siendo el real',!/panel-alumnos-ejemplo/.test(ej.run('__raizEj.innerHTML')));
  const mkEj=leer('marketplace.js');
  chk('el administrador lo activa por profesor aprobado, desde su ficha',
    /data-admin-ejemplo="\$\{esc\(p\.user_id\)\}"/.test(mkEj)&&/llamar\('admin_fijar_alumnos_ejemplo',\{p_user_id:id,p_activo:!activo\}/.test(mkEj));

  console.log('\n=== Exportar a Excel ===');
  a.run(`globalThis.__exp=[
    {id:'e1',nombre_visible:'Pérez, "Cami"',tenant:'uc',ramos:[__r]},
    {id:'e2',nombre_visible:'=HYPERLINK("http://x")',tenant:'uc',ramos:[{id:'r8',nombre:'Física; Lab',sigla:'FIS0154',gates:[],categorias:[]}]}]`);
  const csv=a.run(`csvAlumnosPanel(__exp,(al,r)=>r.id==='r1'?{ramo:{promedio:4.7,personas:23},
    evaluaciones:[{clave:'interrogacion 1',promedio:4.6,personas:9}],categorias:[{clave:'interrogaciones',promedio:4.44,personas:31}]}:null)`);
  const lineas=csv.split('\r\n');
  chk('un negativo puro llega como número; el resto que parece fórmula, no',a.run("celdaCsvPanel('-1,0')")==='-1,0'&&a.run("celdaCsvPanel('-1+1')")==="'-1+1"&&a.run("celdaCsvPanel('=1')")==="'=1");
  chk('una fila de títulos con las columnas acordadas',
    lineas[0]==='Alumno;Ramo;Sigla;Categoría;Evaluación;Nota;Promedio del ramo;GradeHub evaluación;GradeHub categoría;GradeHub ramo;Fecha;Antes o desde que empezó;Diferencia con el curso;Empezó contigo en este ramo;Sección;Sección evaluación;Sección categoría;Sección ramo');
  chk('una fila por evaluación con nota, y una por ramo sin notas',lineas.length===4);
  chk('comas y comillas en el nombre van entre comillas, dobladas',
    lineas[1].startsWith('"Pérez, ""Cami""";Cálculo II;MAT1620;Interrogaciones;Interrogación 1;4,2;'));
  chk('decimales con coma y el promedio del ramo es el de ramoAvg',
    lineas[1].split(';')[6]===a.run('fmtPromedio(ramoAvg(ramoParaPanel(__r)))').replace('.',','));
  chk('GradeHub por evaluación, categoría y ramo, redondeado como en la app',lineas[1].split(';').slice(7,10).join(';')==='4,6;4,4;4,7');
  chk('una prueba sin comparación deja su celda vacía',/;Interrogación 2;5,6;[^;]*;;4,4;4,7;/.test(lineas[2]));
  chk('un nombre que parece fórmula no llega a Excel como fórmula',lineas[3].startsWith(`"'=HYPERLINK(""http://x"")"`));
  chk('un punto y coma en el ramo va entre comillas',lineas[3].includes(';"Física; Lab";FIS0154;'));
  chk('el ramo sin notas sale igual, con las celdas vacías',lineas[3].endsWith(';FIS0154'+';'.repeat(11)+';no declarada;;;'));
  const resumen=a.run(`csvResumenAlumnosPanel([{...__dos,nombre_visible:'=Ana',ramos:[
    __dos.ramos[0],{...__dos.ramos[1],seccion:undefined,categorias:[...__dos.ramos[1].categorias,
      {id:'pendiente',nombre:'Control 3',peso:20,fecha:'2026-11-01',notas:[{id:'sin-nota',nombre:'Control 3',valor:null}]}]}]}],
    (al,r)=>r.id==='ra'?__cursoAA():{ramo:{promedio:4.8,personas:4},evaluaciones:[],categorias:[]},
    (al,r)=>r.id==='ra'?{ramo:{promedio:4.9,personas:6}}:{ramo:{promedio:5.2,personas:4}},
    new Date('2026-10-22T12:00:00Z'))`);
  const filasResumen=resumen.split('\r\n').map(l=>l.split(';'));
  chk('resumen tiene una fila por alumno y ramo, con todas las columnas pedidas',
    filasResumen.length===3&&filasResumen[0].join(';')==='Alumno;Ramo;Sigla;Sección;Empezó contigo en este ramo;Promedio del ramo;GradeHub ramo;Sección ramo;Diferencia con el curso antes;Diferencia con el curso desde que empezó;Cambio;Estado;Próxima evaluación;Nota necesaria para aprobar');
  chk('dos ramos del mismo alumno conservan fechas y comparaciones propias',
    filasResumen[1][4]==='2026-09-15'&&filasResumen[2][4]==='2026-10-05'&&
    filasResumen[1][8]==='-1,0'&&filasResumen[1][9]==='0,7'&&filasResumen[1][10]==='1,7'&&
    filasResumen[2][10]===''&&filasResumen[2][3]==='no declarada');
  chk('promedio usa ramoAvg; con cuatro personas no aparece comparación',
    filasResumen[1][5]===a.run('fmtPromedio(ramoAvg(ramoParaPanel(__dos.ramos[0])))').replace('.',',')&&
    filasResumen[1][6]==='4,5'&&filasResumen[1][7]==='4,9'&&filasResumen[2][6]===''&&filasResumen[2][7]==='');
  chk('nombre parecido a fórmula queda inerte y próxima evaluación se incluye',
    filasResumen[1][0]==="'=Ana"&&filasResumen[2][12]==='Control 3');
  const sinNotas=a.run(`csvResumenAlumnosPanel([{id:'vacio',nombre_visible:'Sin notas',tenant:'uc',desde:'2026-09-01',ramos:[
    {id:'rv',nombre:'Ramo vacío',gates:[],categorias:[]}]}],()=>null)`);
  const filaVacia=sinNotas.split('\r\n')[1].split(';');
  chk('un ramo sin notas también aparece, sin inventar promedio ni cambio',
    sinNotas.split('\r\n').length===2&&filaVacia.length===14&&filaVacia[3]==='no declarada'&&
    filaVacia[4]==='2026-09-01'&&filaVacia[5]===''&&filaVacia[10]===''&&filaVacia[11]==='Sin notas');
  a.run(`globalThis.__getElementOriginal=document.getElementById;
    globalThis.__opciones=['detalle','resumen'].map(formato=>({dataset:{exportarPanel:formato},handlers:{},addEventListener(t,fn){this.handlers[t]=fn}}));
    globalThis.__cancelarOpcion={handlers:{},addEventListener(t,fn){this.handlers[t]=fn}};
    globalThis.__cajaOpcion={innerHTML:'',querySelector:s=>s==='#alumnos-exportar-cancelar'?__cancelarOpcion:null,
      querySelectorAll:()=>__opciones};
    document.getElementById=id=>id==='modal-content'?__cajaOpcion:null;
    openModal=()=>{globalThis.__hojaAbierta=true};closeModal=()=>{globalThis.__hojaAbierta=false};
    elegirArchivoAlumnosPanel(formato=>{globalThis.__opcionElegida=formato});`);
  chk('hoja ofrece dos archivos relacionados y se puede cancelar',
    /Detalle por evaluación/.test(a.run('__cajaOpcion.innerHTML'))&&
    /Resumen por alumno/.test(a.run('__cajaOpcion.innerHTML'))&&
    a.run('__hojaAbierta')===true);
  a.run(`__opciones[1].handlers.click()`);
  chk('elegir resumen cierra la hoja antes de confirmar',a.run('__opcionElegida')==='resumen'&&a.run('__hojaAbierta')===false);
  a.run(`document.getElementById=__getElementOriginal`);
  const mk=leer('marketplace.js');
  chk('exportar pide confirmar con el recordatorio de los términos',
    /showConfirm\('Exportar notas'/.test(mk)&&/no lo publiques ni se lo pases a nadie/.test(mk));
  chk('ambos archivos llevan BOM y protegen cada celda',/new Blob\(\['\\ufeff'\+csv\]/.test(mk)&&/filas\.map\(f=>f\.map\(celdaCsvPanel\)/.test(mk));
  const salida=contexto();
  salida.run(`globalThis.Blob=class {constructor(parts,opts){this.parts=parts;this.type=opts.type;globalThis.__blobCsv=this}};
    globalThis.URL={createObjectURL:()=>'/archivo',revokeObjectURL(){}};
    document.createElement=()=>({click(){globalThis.__descargado=this.download},remove(){}});
    document.body.appendChild=()=>{};track=()=>{};showToast=()=>{};
    globalThis.__alExportable=[{id:'x',nombre_visible:'Persona sintética',tenant:'uc',desde:'2026-09-01',ramos:[
      {id:'r',nombre:'Ramo sintético',gates:[],categorias:[]}]}];`);
  await salida.run(`exportarAlumnosPanel(__alExportable,()=>null,null,'resumen')`);
  chk('la descarga del resumen lleva BOM, tipo CSV y nombre propio',
    salida.run('__blobCsv.parts[0]').startsWith('\ufeffAlumno;Ramo;')&&
    salida.run('__blobCsv.type')==='text/csv;charset=utf-8'&&
    /gradehub-alumnos-resumen-\d{4}-\d{2}-\d{2}\.csv/.test(salida.run('__descargado')));
  await salida.run(`exportarAlumnosPanel(__alExportable,()=>null)`);
  chk('el archivo de detalle conserva su nombre y encabezado',
    salida.run('__blobCsv.parts[0]').startsWith('\ufeffAlumno;Ramo;Sigla;Categoría;Evaluación;Nota;')&&
    /^gradehub-alumnos-\d{4}-\d{2}-\d{2}\.csv$/.test(salida.run('__descargado')));

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
