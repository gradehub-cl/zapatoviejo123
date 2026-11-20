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

  console.log('\n=== Lo que se publica de las notas ===');
  run(`S.ramos=[{id:'r1',nombre:'Curso Sintético',sigla:'syn101',categorias:[{id:'c1',nombre:'Controles',peso:50,notas:[{id:'n1',valor:6.0}]},{id:'c2',nombre:'Examen',peso:50,notas:[{id:'n2',valor:null}]}],horario:[]},
    {id:'r2',nombre:'Sin sigla',categorias:[],horario:[]}];`);
  const pub=JSON.parse(run('JSON.stringify(resumenNotasAmigos(S.ramos))'));
  chk('solo sigla, nombre, promedio, % evaluado y nivel; nunca notas sueltas',pub.length>=1&&Object.keys(pub[0]).sort().join()==='avance,nivel,nombre,promedio,sigla'&&pub[0].sigla==='SYN101');
  chk('el promedio sale del motor (6,0 con la mitad evaluada)',pub[0].promedio===6&&pub[0].avance===50&&pub[0].nivel==='good');
  chk('el chip del amigo usa el semáforo y coma decimal',/amigo-nota good/.test(run(`notaAmigoHTML({promedio:6.1,nivel:'good'},{nombre:'Beto'})`))&&/6,1/.test(run(`notaAmigoHTML({promedio:6.1,nivel:'good'},{nombre:'Beto'})`))&&/Sin notas/.test(run(`notaAmigoHTML({promedio:null},{})`)));
  chk('cada subida a la nube actualiza lo compartido',/programarPublicarNotasAmigos\(\)/.test(fs.readFileSync(raiz+'src/app-session/sync-escritura.js','utf8')));
  chk('compartir notas es un interruptor y parte apagado',/id="amigos-notas" type="checkbox" role="switch"\$\{amigosNotasComparte\?' checked':''\}/.test(fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8')));

  console.log('\n=== Solo estudiantes ===');
  cuenta('profesor');run('recalcularNavTabs()');
  chk('una cuenta de profesor no tiene Amigos',!run('NAV_TABS').includes('amigos')&&el('nav-amigos').hidden===true);
  cuenta();run('recalcularNavTabs()');

  console.log('\n=== Se olvida al cerrar sesión ===');
  run('olvidarAmigos();recalcularNavTabs()');
  chk('quien entra después no hereda la pestaña',!run('NAV_TABS').includes('amigos')&&run('amigosEstadoCache')===null);
  chk('cerrar sesión llama a olvidarAmigos',/olvidarAmigos\(\)/.test(fs.readFileSync(raiz+'src/app-session/salida-cuenta.js','utf8')));
  chk('entrar pregunta una vez, sin bloquear',/cargarAmigos\(\)\s*\n\s*\.then\(/.test(fs.readFileSync(raiz+'src/app-session/entrada-cuenta.js','utf8')));
  // Una respuesta que llega después de cerrar sesión no revive la pestaña.
  cliente(`n=>new Promise(r=>setTimeout(()=>r({data:{username:'x'},error:null}),20))`);
  const p=run('cargarAmigos()');run('olvidarAmigos()');await p;
  chk('una respuesta tardía de la cuenta anterior se descarta',run('amigosVisible()')===false);

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
