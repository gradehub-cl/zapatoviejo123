// Fechas desde la fuente de calendario de Canvas UC, en la web (#647).
// 1. La función de Cloudflare no es un proxy abierto: solo esa URL, con sesión,
//    sin redirecciones, con tope de tamaño y sin caché.
// 2. La app empareja por la sigla entre corchetes, convierte la hora UTC al día
//    de Chile y guarda la URL solo en el dispositivo, atada a la cuenta.
// Todo sintético: ni URLs ni calendarios de nadie.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

const URL_OK='https://cursos.canvas.uc.cl/feeds/calendars/user_AbCdEf0123456789XyZw0123456789abcdEFGHij.ics';
const ICS=(eventos)=>['BEGIN:VCALENDAR','VERSION:2.0',...eventos.flatMap(([t,inicio])=>['BEGIN:VEVENT','SUMMARY:'+t,'DTSTART'+inicio,'END:VEVENT']),'END:VCALENDAR'].join('\r\n');

(async()=>{
  console.log('=== La función solo trae esa URL ===');
  const fn=vm.createContext({Response,TextEncoder,TextDecoder,AbortController,setTimeout,clearTimeout,Uint8Array,JSON,console});
  vm.runInContext(leer('functions/canvas-calendario.js').replace(/^export /gm,''),fn);
  const valida=u=>vm.runInContext('urlCanvasValida',fn)(u);
  chk('acepta la fuente de calendario de Canvas UC',valida(URL_OK));
  const malas={'http':URL_OK.replace('https:','http:'),'webcal':URL_OK.replace('https:','webcal:'),
    'otro host':URL_OK.replace('cursos.canvas.uc.cl','cursos.canvas.uc.cl.ejemplo.com'),
    'subdominio ajeno':URL_OK.replace('cursos.','x.cursos.'),'con puerto':URL_OK.replace('.cl/','.cl:8443/'),
    'con usuario':URL_OK.replace('https://','https://a@'),'con parámetros':URL_OK+'?x=1','con fragmento':URL_OK+'#x',
    'la API':'https://cursos.canvas.uc.cl/api/v1/users/self','otra ruta':URL_OK.replace('/feeds/calendars/','/feeds/../api/'),
    'feed de curso':URL_OK.replace('user_','course_'),'sin .ics':URL_OK.replace('.ics',''),'vacía':''};
  const aceptadas=Object.entries(malas).filter(([,u])=>valida(u)).map(([k])=>k);
  chk('rechaza esquemas, hosts, puertos, rutas y parámetros que no son esos'+(aceptadas.length?' (aceptó: '+aceptadas+')':''),!aceptadas.length);

  // fetch falso: Auth de Supabase y Canvas.
  const pedir=({sesion=true,canvas})=>{const llamadas=[];const f=async(url,opt)=>{llamadas.push({url,opt});
    if(url.includes('/auth/v1/user'))return new Response('{}',{status:sesion?200:401});
    return canvas(url,opt);};f.llamadas=llamadas;return f;};
  const pedido=(cuerpo,auth='Bearer eyJhbGciOiJIUzI1NiJ9.sintetico.firma')=>new Request('https://gradehub.cl/canvas-calendario',
    {method:'POST',headers:auth?{Authorization:auth}:{},body:typeof cuerpo==='string'?cuerpo:JSON.stringify(cuerpo)});
  const traer=(req,f)=>vm.runInContext('traerCalendarioCanvas',fn)(req,f);
  const calendario=()=>new Response(ICS([['Tarea 1 [MAT1620-2]',':20261020T025900Z']]),{status:200});

  let f=pedir({canvas:calendario});let r=await traer(pedido({url:URL_OK},null),f);
  chk('sin sesión: 401 y no llama a Canvas',r.status===401&&!f.llamadas.some(x=>x.url.includes('canvas')));
  f=pedir({sesion:false,canvas:calendario});r=await traer(pedido({url:URL_OK}),f);
  chk('con una sesión que Supabase rechaza: 401',r.status===401&&!f.llamadas.some(x=>x.url.includes('canvas')));
  f=pedir({canvas:calendario});r=await traer(pedido({url:'https://ejemplo.com/x.ics'}),f);
  chk('una URL ajena: 400 y no se pide',r.status===400&&!f.llamadas.some(x=>x.url.includes('ejemplo')));
  f=pedir({canvas:calendario});r=await traer(pedido('x'.repeat(3000)),f);
  chk('un cuerpo enorme: 400',r.status===400);
  f=pedir({canvas:calendario});r=await traer(pedido({url:URL_OK}),f);
  const aCanvas=f.llamadas.find(x=>x.url===URL_OK);
  chk('con sesión y la URL buena: devuelve el calendario',r.status===200&&/BEGIN:VCALENDAR/.test(await r.text())&&/text\/calendar/.test(r.headers.get('Content-Type')));
  chk('sin caché y sin seguir redirecciones',r.headers.get('Cache-Control')==='no-store'&&aCanvas&&aCanvas.opt.redirect==='manual');
  r=await traer(pedido({url:URL_OK}),pedir({canvas:()=>new Response(null,{status:302,headers:{Location:'https://ejemplo.com/'}})}));
  chk('una redirección es un error, no se sigue',r.status===502);
  r=await traer(pedido({url:URL_OK}),pedir({canvas:()=>new Response('x'.repeat(600*1024),{status:200})}));
  chk('más de 512 KB: se corta',r.status===502&&/500 KB/.test(await r.text()));
  r=await traer(pedido({url:URL_OK}),pedir({canvas:()=>new Response('<html>login</html>',{status:200})}));
  chk('si no es un calendario, no se devuelve',r.status===502&&!/login/.test(await r.text()));
  r=await traer(pedido({url:URL_OK}),pedir({canvas:()=>new Response('',{status:404})}));
  chk('una URL que Canvas no reconoce lo dice sin repetirla',r.status===502&&!(await r.text()).includes('user_'));
  r=await traer(pedido({url:URL_OK}),pedir({canvas:()=>{throw new Error('abort');}}));
  chk('si Canvas no responde a tiempo: 504',r.status===504);
  chk('el deploy publica la función',/functions\/canvas-calendario\.js/.test(leer('.github/workflows/deploy.yml')));

  console.log('\n=== La app empareja por sigla y con el día de Chile ===');
  const src=['data.js','engine.js','app.js','app-session.js'].map(leer).join('\n');
  const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;},toggle(){}},value:'',innerHTML:'',textContent:'',focus(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelectorAll(){return [];},querySelector(){return stub;},dataset:{}};
  const guardado={};
  const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
    document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:stub,querySelector:()=>stub,querySelectorAll:()=>[],body:stub},
    localStorage:{getItem:k=>k in guardado?guardado[k]:null,setItem:(k,v)=>{guardado[k]=String(v);},removeItem:k=>{delete guardado[k];}},
    navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console,Intl};
  vm.createContext(ctx);vm.runInContext(src,ctx);
  const run=c=>vm.runInContext(c,ctx);
  chk('una entrega a las 23:59 de Chile (02:59 UTC del día siguiente) es del mismo día',run(`fechaChileIcs('20261016T025900Z')`)==='2026-10-15');
  chk('sin Z, la fecha que trae',run(`fechaChileIcs('20261015T235900')`)===null);
  // Pauta de ejemplo escrita acá.
  run(`S.tenant='uc';S.ramos=[{id:'calc',nombre:'Cálculo II',sigla:'MAT1620',gates:[],categorias:[
      {id:'i2',nombre:'Interrogación 2',peso:30,notas:[]},{id:'i3',nombre:'Interrogación 3',peso:30,notas:[]},
      {id:'t',nombre:'Tareas',peso:40,notas:[]}]}]`);
  const eventos=JSON.stringify(run(`parseIcsCalendario(${JSON.stringify(ICS([
    ['Interrogación 2 [2026-2 MAT1620-2 Cálculo II]',':20261016T025900Z'],
    ['I2 - P1 [MAT1620-2]',';VALUE=DATE:20261021'],
    ['Charla de bienvenida [ING1001-1]',';VALUE=DATE:20261018'],
    ['Interrogación 2 [MAT1620-2]',';VALUE=DATE:20260901'],
    ['I3 Cálculo II',';VALUE=DATE:20261110'],
    ['Feriado',';VALUE=DATE:20261012']]))},{inicioCrudo:true})`));
  ctx.__ev=JSON.parse(eventos);
  const props=run(`propuestasCanvasIcs(__ev,new Date(2026,9,12,9))`);
  const de=t=>props.find(p=>p.titulo.startsWith(t));
  chk('la I2 de Cálculo II calza, con la fecha de Chile',de('Interrogación 2')&&de('Interrogación 2').target==='calc|i2|'&&de('Interrogación 2').fecha==='2026-10-15');
  chk('la misma evaluación no recibe dos fechas: la segunda queda sin asignar',de('I2')&&de('I2').target===null);
  chk('un curso que no llevas acá queda fuera',!props.some(p=>/Charla/.test(p.titulo)));
  chk('lo que ya pasó queda fuera',!props.some(p=>p.fecha==='2026-09-01'));
  chk('sin corchetes, se empareja por el nombre del ramo como un .ics',props.some(p=>p.titulo==='I3 Cálculo II'&&p.target==='calc|i3|'));
  chk('un evento suelto que no calza con nada queda fuera',!props.some(p=>p.titulo==='Feriado'));

  console.log('\n=== La URL es secreta: solo en el dispositivo y de esta cuenta ===');
  chk('webcal:// se acepta como la misma URL',run(`normalizarUrlCanvasIcs(${JSON.stringify(' '+URL_OK.replace('https:','webcal:')+' ')})`)===URL_OK);
  chk('una URL ajena no',run(`normalizarUrlCanvasIcs('https://ejemplo.com/feeds/calendars/user_x.ics')`)===null);
  run(`currentUser={id:'u1'};guardarUrlCanvasIcs(${JSON.stringify(URL_OK)})`);
  chk('se guarda para esta cuenta',run('urlCanvasIcsGuardada()')===URL_OK);
  chk('fuera de gradehub_v1 y de S',!JSON.stringify(run('S')).includes('feeds/calendars')&&!String(guardado.gradehub_v1||'').includes('feeds/calendars'));
  run(`currentUser={id:'u2'}`);
  chk('otra cuenta en el mismo navegador no la ve, y se borra',run('urlCanvasIcsGuardada()')===null&&!('gradehub_canvas_ics' in guardado));
  chk('cerrar sesión la borra',/olvidarUrlCanvasIcs\(\)/.test(leer('app-session.js').split('async function cerrarSesion')[1].split('\n}\n')[0]));
  chk('desconectar pide confirmar, con Cancelar a mano',/function desconectarCanvasIcs\(\)\{[^]*showConfirm\([^]*focusCancel:true/.test(leer('app.js')));
  chk('en la app iOS no aparece: ahí está el token',run(`enAppNativa=()=>true;canvasIcsDisponible()`)===false);

  run(`enAppNativa=()=>false;S.tenant='uc';currentUser={id:'u1'};supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'jwt-sintetico'}}})}};icsImportDraft=null`);
  let responder;ctx.fetch=()=>new Promise(r=>responder=r);
  const tardia=run(`importarDesdeCanvasIcs(${JSON.stringify(URL_OK)})`);
  await Promise.resolve();await Promise.resolve();
  run(`currentUser={id:'u2'}`);
  responder(new Response(ICS([['I2 [MAT1620-2]',':20991116T025900Z']])));
  chk('respuesta tardía de otra cuenta no abre ni guarda propuestas',(await tardia)===false&&run('icsImportDraft')===null);
  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
