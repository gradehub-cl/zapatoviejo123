// La pestaña Amigos (src/app/amigos-pantalla.js): cuándo aparece, dónde va y
// que se olvide al cerrar sesión. Sin red: el cliente de Supabase es simulado.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const html=fs.readFileSync(raiz+'index.html','utf8'),css=fs.readFileSync(raiz+'styles.css','utf8');
const nuevo=()=>({style:{setProperty(){},removeProperty(){}},hidden:false,dataset:{},checked:false,addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},querySelector(){return null;},querySelectorAll(){return [];},insertAdjacentHTML(){}});
const elementos={},el=id=>(elementos[id]=elementos[id]||nuevo());
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:el,createElement:nuevo,addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;},classList:{add(){},remove(){},contains(){return false;}}},body:nuevo()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console,gtag(){},
  requestAnimationFrame(){return 0;},cancelAnimationFrame(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);
// Lo nuevo va solo a la app hasta el lanzamiento: el harness hace de app nativa.
run(`window.Capacitor={isNativePlatform:()=>true};`);
run(`renderHome=()=>{};renderStats=()=>{};renderAgenda=()=>{};renderPerfil=()=>{};renderAmigos=()=>{};esAdministrador=()=>false;track=()=>{};`);
let ok=0;const chk=(n,c)=>{assert.ok(c,n);ok++;console.log('  OK   '+n);};
const cuenta=tipo=>{run(`S=normalize(Object.assign(freshState(),{onboardingDone:true${tipo?`,tipoCuenta:'${tipo}'`:''}}));perfilProfesorCache=null;`);};
const cliente=resp=>run(`currentUser={id:'00000000-0000-4000-8000-000000000001'};supabaseClient={rpc:async(n)=>(${resp})(n)};`);

(async()=>{
  console.log('\n=== Aparece solo cuando el SQL está aplicado ===');
  cuenta();run('recalcularNavTabs()');
  chk('sin preguntar todavía, las pestañas de siempre',run('NAV_TABS.join()')==='home,agenda,stats,perfil');
  cliente(`n=>({data:null,error:{message:'Could not find the function public.amigos_estado'}})`);
  await run('cargarAmigos()');run('recalcularNavTabs()');
  chk('si la función no existe, nada cambia',run('NAV_TABS.join()')==='home,agenda,stats,perfil'&&el('nav-amigos').hidden===true);
  cliente(`n=>({data:{username:null,comparte_horario:true,recibidas:0},error:null})`);
  await run('cargarAmigos()');run('recalcularNavTabs()');
  chk('con el SQL, Amigos va al medio',run('NAV_TABS.join()')==='home,agenda,amigos,stats,perfil'&&el('nav-amigos').hidden===false&&el('screen-amigos').hidden===false);
  chk('son cinco pestañas, lo que recomienda la HIG',run('NAV_TABS.length')===5);
  run(`window.Capacitor=undefined;recalcularNavTabs()`);
  chk('en la web no aparece: lo nuevo va solo a la app',!run('NAV_TABS').includes('amigos'));
  run(`window.Capacitor={isNativePlatform:()=>true};recalcularNavTabs()`);

  console.log('\n=== Grupos y notas se sondean aparte ===');
  chk('con su SQL, grupos y notas quedan disponibles',run('amigosGruposDisponible')===true&&run('amigosNotasDisponible')===true&&run('Array.isArray(amigosGruposCache)'));
  cliente(`n=>n==='amigos_estado'?{data:{username:'ana_s',recibidas:1},error:null}:n==='mis_grupos'?{data:[{id:'g1',nombre:'Estudio',estado:'invitado',miembros:2,invitado_por:'beto_ej'}],error:null}:{data:null,error:{message:'Could not find the function'}}`);
  await run('cargarAmigos()');
  chk('sin amigos_notas.sql, no se ofrece compartir notas',run('amigosGruposDisponible')===true&&run('amigosNotasDisponible')===false);
  chk('la sección Grupos muestra la invitación',/Estudio/.test(run('seccionGruposHTML()'))&&/grupo-aceptar/.test(run('seccionGruposHTML()')));
  const nav=el('nav-amigos'),icono=nuevo(),marca={textContent:''};
  nav.querySelector=sel=>sel==='.nav-icon'?icono:null;nav.setAttribute=(k,v)=>{nav['_'+k]=v;};
  ctx.document.createElement=()=>Object.assign(marca,nuevo());
  run('pintarInsigniaAmigos()');ctx.document.createElement=nuevo;
  chk('la insignia suma solicitudes e invitaciones a grupos',nav['_aria-label']==='Amigos, 2 pendientes'&&marca.textContent==='2');
  chk('bajo el grupo, quiénes están, como WhatsApp',run(`lineaGrupo({estado:'miembro',miembros:5,nombres:['Beto','Dani']})`)==='Tú, Beto, Dani y 2 más'
    &&run(`lineaGrupo({estado:'invitado',miembros:2,nombres:['Dani','Gabi']})`)==='Dani y Gabi'&&run(`listaNombres(['Beto'])`)==='Beto');
  chk('el avatar del grupo son dos iniciales superpuestas',/pila/.test(run(`avatarGrupoHTML(['Beto','Dani'])`))&&!/pila/.test(run(`avatarGrupoHTML([])`)));
  cliente(`n=>n==='amigos_estado'?{data:{username:'ana_s'},error:null}:{data:null,error:{message:'Could not find the function'}}`);
  await run('cargarAmigos()');
  chk('sin amigos_grupos.sql, no hay sección Grupos',run('amigosGruposDisponible')===false&&run('seccionGruposHTML()')==='');

  console.log('\n=== Ficha de grupo ===');
  run(`amigosGruposDisponible=true;amigosGruposCache=[{id:'g1',nombre:'Estudio & repaso',estado:'miembro',miembros:2}];
    amigosListaCache=[];S.ramos=[];`);
  chk('sin amigos se conservan los grupos existentes y no se ofrece crear otro',
    /Estudio &amp; repaso/.test(run('seccionGruposHTML()'))&&!/grupo-nuevo/.test(run('seccionGruposHTML()')));
  run(`amigosListaCache=[{estado:'amigos',username:'beto_ej',nombre:'Beto'}];`);
  chk('con amigos aparece la acción para crear y el selector tiene etiquetas',
    /Crear grupo/.test(run('seccionGruposHTML()'))&&/role="status"[\s\S]*<label class="amigos-elegir"/.test(run('elegirAmigosHTML([])')));
  run(`var abrirModalOriginal=openModal;openModal=()=>{};
    pintarGrupo('g1',[{username:'ana_ej',yo:true,creador:true,estado:'miembro'},{username:'beto_ej',nombre:'Beto',estado:'miembro'},
      {username:'carla_ej',nombre:'Carla',estado:'invitado'}]);openModal=abrirModalOriginal;`);
  const ficha=el('modal-content').innerHTML;
  chk('la ficha cuenta solo integrantes y separa las invitaciones pendientes',
    /<h2 class="modal-title grupo-titulo">Estudio &amp; repaso<\/h2>/.test(ficha)
    &&/2 personas/.test(ficha)&&ficha.indexOf('Beto')<ficha.indexOf('Invitaciones pendientes')
    &&ficha.indexOf('Invitaciones pendientes')<ficha.indexOf('Carla'));
  chk('sin dos horarios la ficha explica por qué faltan coincidencias',
    /al menos dos horarios/.test(ficha)&&!/Todos libres a la vez/.test(ficha));
  el('modal').classList.contains=()=>false;
  run("amigosDisponibleCache=true;amigosGrupoDetalle=null;currentTab='amigos';");
  cliente("()=>({error:{message:'No disponible'}})");
  await run("abrirGrupo('g1')");
  chk('un fallo ofrece reintentar dentro de Amigos',/Reintentar/.test(el('amigos-body').innerHTML));
  cliente("()=>new Promise(r=>setTimeout(()=>r({data:[],error:null}),10))");
  const detallePendiente=run("abrirGrupo('g1')");run('volverDeGrupo()');await detallePendiente;
  chk('volver durante la carga descarta su respuesta',run('amigosGrupoDetalle')===null);
  const filas=[{username:'ana',yo:true,estado:'miembro'},{username:'beto',nombre:'Beto',estado:'miembro'},{username:'dani',nombre:'Dani',estado:'invitado'}];
  ctx.filasPrueba=filas;
  cliente("n=>({data:n==='grupo_detalle'?filasPrueba:[],error:null})");
  await run("abrirGrupo('g1')");
  // Lucas, 2026-11-22: la cabecera no repite «2 personas» y la invitación va en su subtítulo (la ficha la abre).
  chk('entra a actividad con dos miembros y una invitación aparte',/Lo que viene/.test(el('amigos-body').innerHTML)&&/Tú y Beto · 1 invitación/.test(el('amigos-body').innerHTML)&&!/2 personas/.test(el('amigos-body').innerHTML)&&!/Cambiar nombre|Salir del grupo/.test(el('amigos-body').innerHTML));
  chk('la invitación se ve en la cabecera, que abre la ficha',el('amigos-body').innerHTML.includes('data-amigos="grupo-info"'));
  run('amigosCalendarioDisponible=true');
  ctx.solicitudesCalendario=[];
  run("supabaseClient.rpc=async(n,args)=>{if(n==='grupo_calendario')solicitudesCalendario.push(args);return {data:n==='grupo_detalle'?filasPrueba:[]};}");
  await run('cargarActividadGrupo(amigosGrupoDetalle)');
  chk('el grupo lee los mismos 60 días que permite anotar y aclara el período vacío',ctx.solicitudesCalendario[0].p_dias===60&&el('amigos-body').innerHTML.includes('próximos 60 días'));
  run("openModal=()=>{};pintarGrupo('g1',filasPrueba);openModal=abrirModalOriginal;");
  const info=el('modal-content').innerHTML;
  chk('los integrantes y las invitaciones se encuentran antes de los horarios',info.indexOf('Integrantes')<info.indexOf('Invitaciones pendientes')&&info.indexOf('Invitaciones pendientes')<info.indexOf('Horarios libres'));
  run("openModal=()=>{};pintarGrupo('g1',[{username:'beto_ej',estado:'miembro'}]);openModal=abrirModalOriginal;");
  chk('si todos los amigos ya están en el grupo la ficha omite Invitar amigos',!el('modal-content').innerHTML.includes('data-amigos="grupo-invitar"'));
  run("openModal=()=>{};amigosListaCache=[{estado:'enviada',username:'dani'}];abrirMiembroGrupo('g1','dani');openModal=abrirModalOriginal;");
  chk('una amistad solicitada no se puede solicitar por segunda vez',el('modal-content').innerHTML.includes('Solicitud de amistad enviada')&&!el('modal-content').innerHTML.includes('grupo-agregar-amigo'));
  chk('volver desde un integrante abre otra vez la información del grupo',el('modal-content').innerHTML.includes('data-amigos="grupo-info"'));
  filas[2].estado='miembro';await run('cargarActividadGrupo(amigosGrupoDetalle)');
  chk('al aceptar cambian la cabecera y el resumen de la lista',/Tú, Beto y Dani/.test(el('amigos-body').innerHTML)&&!/· 1 invitación/.test(el('amigos-body').innerHTML)&&run('lineaGrupo(amigosGruposCache[0])')==='Tú, Beto y Dani'&&!/invitación pendiente/.test(el('amigos-body').innerHTML));
  run('volverDeGrupo()');
  const prueba={tipo:'prueba',fecha:'2099-01-10',inicio:'09:00',titulo:'Prueba 1',detalle:'SYN101',username:'beto',nombre:'Beto'};
  const eventos=ctx.eventosGrupo([prueba,{...prueba},{...prueba,username:'ana',yo:true},{...prueba,inicio:'10:00'},{...prueba,detalle:'SYN102'}]);
  chk('las pruebas agrupan solo mismo ramo, nombre, día y hora y cada persona aparece una vez',eventos.length===3&&eventos.find(e=>e.personas.length===2)?.detalle==='SYN101');
  console.log('\n=== Lo que se publica de las notas ===');
  run(`S.ramos=[{id:'r1',nombre:'Curso Sintético',sigla:'syn101',categorias:[{id:'c1',nombre:'Controles',peso:50,notas:[{id:'n1',valor:6.0}]},{id:'c2',nombre:'Examen',peso:50,notas:[{id:'n2',valor:null}]}],horario:[]},
    {id:'r2',nombre:'Sin sigla',categorias:[],horario:[]}];`);
  const pub=JSON.parse(run('JSON.stringify(resumenNotasAmigos(S.ramos))'));
  chk('solo sigla, nombre, promedio, % evaluado y nivel; nunca notas sueltas',pub.length>=1&&Object.keys(pub[0]).sort().join()==='avance,nivel,nombre,promedio,sigla'&&pub[0].sigla==='SYN101');
  chk('el promedio sale del motor (6,0 con la mitad evaluada)',pub[0].promedio===6&&pub[0].avance===50&&pub[0].nivel==='good');
  chk('el chip del amigo usa el semáforo y coma decimal',/amigo-nota good/.test(run(`notaAmigoHTML({promedio:6.1,nivel:'good'},{nombre:'Beto'})`))&&/6,1/.test(run(`notaAmigoHTML({promedio:6.1,nivel:'good'},{nombre:'Beto'})`))&&/Sin notas/.test(run(`notaAmigoHTML({promedio:null},{})`)));
  chk('cada subida a la nube actualiza lo compartido',/programarPublicarNotasAmigos\(\)/.test(fs.readFileSync(raiz+'src/app-session/sync-escritura.js','utf8')));
  chk('compartir notas es un interruptor y parte apagado',/id="amigos-notas" type="checkbox" role="switch"\$\{amigosNotasComparte\?' checked':''\}/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8')));

  console.log('\n=== Como Instagram ===');
  run('amigosGruposDisponible=false;amigosGruposCache=null');
  run(`amigosEstadoCache={username:'ana_s'};amigosListaCache=[{id:'x1',username:'beto_ej',nombre:'Beto',estado:'amigos'},{id:'x2',username:'dani99',nombre:'Dani',estado:'amigos'}];
    amigosHorariosCache=new Map([['x1',normalizarRamosAmigo([{nombre:'Uno',sigla:'SYN1',horario:[{dias:['L'],inicio:'08:00',fin:'10:00'},{dias:['L'],inicio:'12:00',fin:'13:00'}]}])],
                                 ['x2',normalizarRamosAmigo([{nombre:'Dos',sigla:'SYN2',horario:[{dias:['L'],inicio:'09:00',fin:'11:00'}]}])]]);`);
  const lunes11=`new Date('2026-11-16T11:00:00-03:00')`;
  const hist=run(`historiasAmigosHTML(amigosListaCache,${lunes11})`);
  // Lunes 11:00: Beto tiene clase a las 12 (libre); Dani terminó a las 11 (ya no está en la u).
  chk('historias: quién está hoy en la u, con anillo si está libre',/Beto/.test(hist)&&!/Dani/.test(hist)&&/historia-anillo libre/.test(hist));
  chk('historias: sin nadie en la u, no hay fila',run(`historiasAmigosHTML(amigosListaCache,new Date('2026-11-16T20:00:00-03:00'))`)==='');
  chk('las cifras para Perfil cuentan solo amistades aceptadas',run('JSON.stringify(cifrasAmigos())')==='{"amigos":2,"grupos":null}');
  chk('lo tuyo ya no está en Amigos: vive en Perfil',!/cabeceraPerfilAmigosHTML|Editar username|ir-amigos/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8')));
  chk('cambiar el username: el límite de 30 días se dice antes',run(`proximoCambioUsername('2026-11-10T00:00:00Z',new Date('2026-11-20T00:00:00Z'))`)!==null&&run(`proximoCambioUsername('2026-10-01T00:00:00Z',new Date('2026-11-20T00:00:00Z'))`)===null);
  chk('el admin ve una tarjeta por cuenta, con sus denuncias juntas',(()=>{const g=JSON.parse(run(`JSON.stringify(gruposDenunciasUsuarios([{id:1,username:'malo',username_actual:'malo',motivo:'acoso',detalle:'x',created_at:'2026-11-19'},{id:2,username:'malo',username_actual:'malo',motivo:'spam',detalle:null,created_at:'2026-11-18'},{id:3,username:'otro',username_actual:'otro',motivo:'spam',created_at:'2026-11-20'}]))`));
    return g.length===2&&g[0].total===2&&g[0].motivos.join()==='acoso,spam'&&!/user_id|denunciante/.test(JSON.stringify(g));})());

  run(`S.tenant='uc';`);
  chk('ramos en común solo dentro de la misma universidad',run(`ramosEnComunAmigo({universidad:'uai'},[{nombre:'X',sigla:'SYN101'}]).length`)===0&&run(`mismaUAmigo({universidad:'uc'})`)===true);

  console.log('\n=== Calendario del grupo ===');
  run(`S.ramos=[{id:'r1',nombre:'Curso Sintético',sigla:'SYN101',horario:[],categorias:[{id:'c1',nombre:'Prueba 1',peso:40,fecha:'2099-01-10',notas:[{id:'n1',valor:null}]},
    {id:'c2',nombre:'Control',peso:20,fecha:'2020-01-01',notas:[{id:'n2',valor:5.5}]}]}];`);
  const pr=JSON.parse(run('JSON.stringify(resumenPruebasAmigos(S.ramos))'));
  chk('se comparten solo pruebas por venir de acá a 60 días, sin notas ni pesos',pr.length===0&&!/peso|valor|5\.5/.test(JSON.stringify(pr)));
  run(`S.ramos[0].categorias[0].fecha=new Date(Date.now()+5*864e5).toISOString().slice(0,10);`);
  const pr2=JSON.parse(run('JSON.stringify(resumenPruebasAmigos(S.ramos))'));
  chk('una prueba en 5 días sí, con ramo, sigla, nombre y fecha',pr2.length===1&&Object.keys(pr2[0]).sort().join()==='fecha,hora,nombre,ramo,sigla'&&pr2[0].nombre==='Prueba 1');
  chk('el hilo agrupa las reservas por día y abre su detalle',(()=>{const h=run(`calendarioGrupoHTML('g1',[{tipo:'reserva',id:'r1',username:'b',nombre:'Beto',yo:false,fecha:'2099-01-10',inicio:'14:00',fin:'16:00',titulo:'Sala B-12'},
    {tipo:'reserva',id:'r2',username:'a',nombre:'Ana',yo:true,fecha:'2099-01-10',inicio:'10:00',fin:'11:00',titulo:'Sala 3'}])`);
    return (h.match(/<h3>/g)||[]).length===1&&(h.match(/data-amigos="grupo-reserva"/g)||[]).length===2&&!h.includes('reserva-borrar');})());
  chk('el código de la sala se ve en la reserva, escapado',(()=>{const h=run(`calendarioGrupoHTML('g1',[{tipo:'reserva',id:'r1',username:'b',nombre:'Beto',yo:false,fecha:'2099-01-10',inicio:'14:00',fin:'16:00',titulo:'Sala B-12',detalle:'4821<b>'},
    {tipo:'reserva',id:'r2',username:'a',nombre:'Ana',yo:true,fecha:'2099-01-10',inicio:'10:00',fin:'11:00',titulo:'Sala 3',detalle:null}])`);
    return (h.match(/cal-codigo/g)||[]).length===1&&/Código <b>4821&lt;b&gt;<\/b>/.test(h);})());
  chk('el formulario de sala pide el código y lo manda solo si hay',/id="amigos-reserva-codigo"/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8'))&&/\.\.\.\(codigo\?\{p_codigo:codigo\}:\{\}\)/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8'))&&/Código de la sala <b>/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8')));

  chk('la semana del amigo se mira, no se edita: sin botones',(()=>{const h=run(`semanaAmigoHTML({universidad:'uc'},normalizarRamosAmigo([{nombre:'Uno',sigla:'SYN1',horario:[{dias:['L'],inicio:'08:00',fin:'10:00'}]}]))`);
    return /horario-semana/.test(h)&&!/<button/.test(h)&&/role="img"/.test(h);})());

  console.log('\n=== Widget «Hoy en la u» ===');
  run(`amigosListaCache=[{id:'x1',username:'beto_ej',nombre:'Beto Ejemplo',estado:'amigos'},{id:'x2',username:'dani99',nombre:null,estado:'amigos'},{id:'x3',username:'eli',nombre:'Eli',estado:'enviada'}];
    amigosHorariosCache=new Map([['x1',normalizarRamosAmigo([{nombre:'Uno',sigla:'SYN1',horario:[{dias:['L'],inicio:'08:00',fin:'10:00',sala:'K201'},{dias:['L'],inicio:'12:00',fin:'13:00',sala:null,noVoy:true}]}])],
      ['x2',normalizarRamosAmigo([{nombre:'Dos',sigla:'SYN2',horario:[]}])]]);`);
  const w=JSON.parse(run(`JSON.stringify(resumenAmigosParaWidget(new Date('2026-11-16T07:00:00-03:00')))`));
  chk('el widget recibe solo nombre de pila, inicial y horas; nunca ramos ni notas',w.version===1&&w.total===2&&w.amigos.length===1&&w.amigos[0].nombre==='Beto'&&w.amigos[0].inicial==='B'
    &&Object.keys(w.amigos[0].bloques[0]).sort().join()==='fecha,finAt,inicioAt,sala'&&!/SYN1|Uno|nota|promedio/.test(JSON.stringify(w)));
  chk('las clases «no voy» no llegan al widget',w.amigos[0].bloques.every(b=>!/T15:00/.test(b.inicioAt))&&w.amigos[0].bloques.filter(b=>b.fecha==='2026-11-16').length===1);
  chk('al cerrar sesión se borra el horario de los amigos del widget',/borrarAmigosWidget\(\);/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8').match(/function olvidarAmigos\(\)\{[\s\S]*?\n\}/)[0])
    &&/removeObject\(forKey: Self\.claveAmigos\)/.test(fs.readFileSync(raiz+'ios/App/App/WidgetsPlugin.swift','utf8')));
  chk('tocar el widget abre Amigos o la ficha del amigo',/amigos\|amigo\)/.test(fs.readFileSync(raiz+'src/app/ios-widgets.js','utf8')));
  chk('el widget está registrado en el paquete',/HoyEnLaUWidget\(\)/.test(fs.readFileSync(raiz+'ios/App/GradeHubWidgets/GradeHubWidgets.swift','utf8')));

  console.log('\n=== Avisos push ===');
  const salida=fs.readFileSync(raiz+'src/app-session/salida-cuenta.js','utf8');
  chk('cerrar sesión olvida este iPhone antes de cerrar la sesión',salida.indexOf('olvidarAvisosAmigos')>0&&salida.indexOf('olvidarAvisosAmigos')<salida.indexOf('auth.signOut()'));
  run(`amigosAvisosDisponible=true;`);
  chk('la tarjeta «¿Te avisamos?» sale solo si hay con quién y no se respondió',/Te avisamos/.test(run('preguntarAvisosHTML(true)'))&&run('preguntarAvisosHTML(false)')===''&&(()=>{run(`amigosAvisosDisponible=false;`);return run('preguntarAvisosHTML(true)')==='';})());
  run(`window.Capacitor=undefined;_pluginWidgets=undefined;`);
  chk('en la web no hay avisos',run('pluginAvisosAmigos()')===null);
  run(`window.Capacitor={isNativePlatform:()=>true};_pluginWidgets=undefined;`);
  chk('tocar el aviso usa el mismo camino que los widgets',/UIApplication\.shared\.open\(url\)/.test(fs.readFileSync(raiz+'ios/App/App/WidgetsPlugin.swift','utf8'))&&/GradeHubAvisosPlugin\(\)/.test(fs.readFileSync(raiz+'ios/App/App/MainViewController.swift','utf8')));
  chk('el permiso de push es de desarrollo en Xcode y de producción al publicar',/aps-environment/.test(fs.readFileSync(raiz+'ios/App/App/App.entitlements','utf8'))&&/GRADEHUB_APS_ENV\[config=Release\] = production/.test(fs.readFileSync(raiz+'ios/App/Firma.xcconfig','utf8')));

  console.log('\n=== Solo estudiantes ===');
  cuenta('profesor');run('recalcularNavTabs()');
  chk('una cuenta de profesor no tiene Amigos',!run('NAV_TABS').includes('amigos')&&el('nav-amigos').hidden===true);
  cuenta();run('recalcularNavTabs()');

  console.log('\n=== Se olvida al cerrar sesión ===');
  run('olvidarAmigos();recalcularNavTabs()');
  chk('quien entra después no hereda la pestaña ni la ficha de grupo',!run('NAV_TABS').includes('amigos')&&run('amigosEstadoCache')===null&&run('amigosGrupoDetalle')===null);
  chk('cerrar sesión llama a olvidarAmigos',/olvidarAmigos\(\)/.test(fs.readFileSync(raiz+'src/app-session/salida-cuenta.js','utf8')));
  chk('entrar pregunta una vez, sin bloquear',/cargarAmigos\(\)\s*\n\s*\.then\(/.test(fs.readFileSync(raiz+'src/app-session/entrada-cuenta.js','utf8')));
  // Una respuesta que llega después de cerrar sesión no revive la pestaña.
  cliente(`n=>new Promise(r=>setTimeout(()=>r({data:{username:'x'},error:null}),20))`);
  const p=run('cargarAmigos()');run('olvidarAmigos()');await p;
  chk('una respuesta tardía de la cuenta anterior se descarta',run('amigosVisible()')===false);

  console.log('\n=== Al día sin cerrar la app ===');
  // Antes, si alguien te agregaba, no lo veías hasta cerrar y abrir la app.
  const llamadas=[];
  cliente(`n=>{globalThis.__llamadas.push(n);return n==='amigos_estado'?{data:{username:'ana_s',recibidas:globalThis.__recibidas},error:null}
    :n==='mis_amistades'?{data:Array.from({length:globalThis.__recibidas},(_,i)=>({id:'r'+i,username:'sol_'+i,estado:'recibida'})),error:null}
    :n==='amigos_horarios'||n==='mis_grupos'?{data:[],error:null}:{data:null,error:{message:'Could not find the function'}}}`);
  ctx.__llamadas=llamadas;ctx.__recibidas=0;
  await run('cargarAmigos()');run(`currentTab='home';_amigosRefrescadoAt=Date.now();amigosListaCache=[];`);
  llamadas.length=0;await run('revisarAmigos()');
  chk('fuera de la pestaña, la revisión pregunta solo estado y grupos',llamadas.sort().join()==='amigos_estado,mis_grupos');
  chk('sin nada nuevo no hay insignia',run('pendientesAmigos()')===0);
  ctx.__recibidas=1;llamadas.length=0;await run('revisarAmigos()');
  chk('una solicitud nueva aparece en la insignia sin reabrir',run('pendientesAmigos()')===1&&nav['_aria-label']==='Amigos, 1 pendiente');
  chk('y se trae la lista para que al abrir ya esté',llamadas.includes('mis_amistades')&&run('amigosListaCache.length')===1);
  let pintadas=0;ctx.__pintar=()=>pintadas++;run(`pintarAmigos=()=>globalThis.__pintar();currentTab='amigos';`);
  llamadas.length=0;await run('revisarAmigos()');
  chk('en la pestaña Amigos la revisión trae todo',llamadas.includes('mis_amistades')&&llamadas.includes('amigos_horarios'));
  chk('si nada cambió, no se repinta (no salta el scroll)',pintadas===0);
  ctx.__recibidas=2;await run('revisarAmigos()');
  chk('si cambió, se repinta solo',pintadas===1&&run('amigosListaCache.length')===2);
  run(`showToast=()=>{globalThis.__avisos++;}`);ctx.__avisos=0;
  cliente(`n=>({data:null,error:{message:'Failed to fetch'}})`);await run('revisarAmigos()');
  chk('sin red, la revisión automática no muestra errores',ctx.__avisos===0);
  run(`currentTab='home';`);
  chk('volver a la app revisa al tiro',/visibilitychange[\s\S]{0,120}revisarAmigos\(\)/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8'))
    &&/addListener\('resume',\(\)=>\{if\(Date\.now\(\)-_amigosRevisadoAt>5e3\)revisarAmigos\(\);\}\)/.test(fs.readFileSync(raiz+'src/app-session/oauth-y-recuperacion.js','utf8')));
  run('olvidarAmigos()');
  chk('al cerrar sesión se deja de revisar',run('_amigosTimer')===null&&run('_amigosFirma')===null);

  console.log('\n=== El link de invitación abre la app ===');
  ctx.URL=URL;const guardados=[];const setOriginal=ctx.sessionStorage.setItem;ctx.sessionStorage.setItem=(k,v)=>guardados.push([k,v]);
  chk('gradehub.cl/?amigo= se recibe y se guarda para «Agregar»',run(`recibirLinkAmigo('https://gradehub.cl/?amigo=Beto_Ej')`)===true&&guardados.at(-1)[1]==='beto_ej');
  chk('con @ también',run(`recibirLinkAmigo('https://gradehub.cl/?amigo=%40ana.s')`)===true&&guardados.at(-1)[1]==='ana.s');
  chk('otro dominio, otra ruta o un username raro no',[`'https://otro.cl/?amigo=beto'`,`'https://gradehub.cl/x?amigo=beto'`,`'https://gradehub.cl/?amigo=a'`,`'https://gradehub.cl/?amigo=<b>'`,`'https://gradehub.cl/'`,`'cl.gradehub.app://amigos'`,`null`].every(x=>run(`recibirLinkAmigo(${x})`)===false));
  ctx.sessionStorage.setItem=setOriginal;
  chk('la app lo atiende antes que los widgets y después del login con Apple/Google',/startsWith\(VUELTA_NATIVA\)\)volverDeOAuthNativo\(url\);\n\s*else if\(typeof recibirLinkAmigo==='function'&&recibirLinkAmigo\(url\)\)return;/.test(fs.readFileSync(raiz+'src/app-session/oauth-y-recuperacion.js','utf8')));
  chk('la app declara el dominio asociado',/<string>applinks:gradehub\.cl<\/string>/.test(fs.readFileSync(raiz+'ios/App/App/App.entitlements','utf8')));

  console.log('\n=== Mensajes ===');
  chk('los del SQL se muestran con mayúscula',run(`mensajeErrorAmigos({message:'ese username ya está ocupado'})`)==='Ese username ya está ocupado');
  chk('los técnicos no llegan a la persona',run(`mensajeErrorAmigos({message:'relation "public.usernames" does not exist'})`)==='No se pudo conectar. Intenta de nuevo.');
  chk('el link de invitación lleva el username',run(`linkAmigo('ana.s')`)==='https://gradehub.cl/?amigo=ana.s');

  console.log('\n=== Pantalla ===');
  const barra=html.slice(html.indexOf('<nav class="bottom-nav"'),html.indexOf('</nav>',html.indexOf('<nav class="bottom-nav"')));
  const orden=[...barra.matchAll(/id="nav-([a-z]+)"/g)].map(m=>m[1]);
  chk('el botón va entre Agenda y Estadísticas',orden.indexOf('amigos')===orden.indexOf('agenda')+1&&orden.indexOf('stats')===orden.indexOf('amigos')+1);
  chk('parten ocultos en el HTML',/<div id="screen-amigos" class="screen" hidden>/.test(html)&&/id="nav-amigos"[^>]*hidden/.test(html));
  chk('la pantalla entra al carrusel y respeta movimiento reducido',/\.app\.tab-mode #screen-amigos,/.test(css)&&/\.app\.tab-mode #screen-amigos\[hidden\]/.test(css)&&/\.app\.tab-mode\.dragging #screen-amigos,/.test(css));
  chk('filas y botones de al menos 44 px',/\.amigo-fila\{[^}]*min-height:64px/.test(css)&&/\.amigos-invitar,\.amigo-boton\{[^}]*min-height:44px/.test(css));
  chk('compartir horario es un interruptor',/id="amigos-compartir" type="checkbox" role="switch"/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8')));
  console.log(`\nPASS: ${ok}   FAIL: 0`);
})().catch(e=>{console.error(e);console.log(`\nPASS: ${ok}   FAIL: 1`);process.exit(1);});
