// Fechas desde la fuente de calendario de Canvas (UC y FEN): web, Android y FEN en iPhone (#647).
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
const URL_FEN=URL_OK.replace('cursos.canvas.uc.cl','canvas.fen.uchile.cl');
const ICS=(eventos)=>['BEGIN:VCALENDAR','VERSION:2.0',...eventos.flatMap(([t,inicio])=>['BEGIN:VEVENT','SUMMARY:'+t,'DTSTART'+inicio,'END:VEVENT']),'END:VCALENDAR'].join('\r\n');

(async()=>{
  console.log('=== La función solo trae esa URL ===');
  const fn=vm.createContext({Response,TextEncoder,TextDecoder,AbortController,setTimeout,clearTimeout,Uint8Array,JSON,console});
  vm.runInContext(leer('functions/canvas-calendario.js').replace(/^export /gm,''),fn);
  const valida=u=>vm.runInContext('urlCanvasValida',fn)(u);
  chk('acepta la fuente de calendario de Canvas UC',valida(URL_OK));
  chk('acepta la de Canvas FEN',valida(URL_FEN));
  const fenMalas=['https://canvas.fen.uchile.cl.ejemplo.com/feeds/calendars/user_AbCdEf0123456789XyZw.ics',
    'https://x.canvas.fen.uchile.cl/feeds/calendars/user_AbCdEf0123456789XyZw.ics','https://canvas.uchile.cl/feeds/calendars/user_AbCdEf0123456789XyZw.ics',
    'https://canvasXfenXuchileXcl/feeds/calendars/user_AbCdEf0123456789XyZw.ics',URL_FEN+'?x=1',URL_FEN.replace('user_','course_')];
  chk('y nada parecido a la FEN',!fenMalas.some(valida));
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
  // La app de iPhone llama desde capacitor://localhost; nadie más recibe CORS.
  const desde=(origen,metodo='POST')=>new Request('https://gradehub.cl/canvas-calendario',{method:metodo,
    headers:{Origin:origen,Authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.sintetico.firma'},body:metodo==='POST'?JSON.stringify({url:URL_FEN}):undefined});
  r=await traer(desde('capacitor://localhost','OPTIONS'),pedir({canvas:calendario}));
  chk('el preflight de la app de iPhone: 204 con CORS para Authorization',r.status===204&&r.headers.get('Access-Control-Allow-Origin')==='capacitor://localhost'
    &&/Authorization/.test(r.headers.get('Access-Control-Allow-Headers')||'')&&/POST/.test(r.headers.get('Access-Control-Allow-Methods')||''));
  f=pedir({canvas:calendario});r=await traer(desde('capacitor://localhost'),f);
  chk('la app de iPhone recibe el calendario y puede leerlo',r.status===200&&r.headers.get('Access-Control-Allow-Origin')==='capacitor://localhost'&&f.llamadas.some(x=>x.url===URL_FEN));
  r=await traer(desde('capacitor://localhost'),pedir({sesion:false,canvas:calendario}));
  chk('y también lee el error, sin sesión válida no pasa',r.status===401&&r.headers.get('Access-Control-Allow-Origin')==='capacitor://localhost');
  const ajenas=await Promise.all(['https://ejemplo.com','null','capacitor://localhost.ejemplo.com'].map(o=>traer(desde(o,'OPTIONS'),pedir({canvas:calendario}))));
  chk('otro origen no recibe CORS',ajenas.every(x=>!x.headers.get('Access-Control-Allow-Origin')));
  r=await traer(new Request('https://gradehub.cl/canvas-calendario'),pedir({canvas:calendario}));
  chk('un GET: 405',r.status===405);
  chk('la función atiende el preflight',/export async function onRequest\(/.test(leer('functions/canvas-calendario.js')));
  const dato=vm.runInContext(leer('data.js')+';CANVAS_ICS_POR_TENANT',vm.createContext({console}));
  chk('la función acepta justo los Canvas de CANVAS_ICS_POR_TENANT',Object.keys(dato).join()==='uc,fen'
    &&Object.values(dato).every(c=>valida(URL_OK.replace('cursos.canvas.uc.cl',c.host)))
    &&(leer('functions/canvas-calendario.js').match(/\(\?:([^)]*)\)\\\/feeds/)||[])[1].split('|').length===Object.keys(dato).length);
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
  const zonaOriginal=process.env.TZ;
  try{
    process.env.TZ='Pacific/Kiritimati';
    const hoyEnChile=run(`propuestasCanvasIcs(__ev,new Date('2026-10-16T01:00:00Z'))`);
    chk('en otra zona horaria, mantiene la fecha y el día de corte de Chile',hoyEnChile.some(p=>p.target==='calc|i2|'&&p.fecha==='2026-10-15'));
  }finally{
    if(zonaOriginal===undefined)delete process.env.TZ;
    else process.env.TZ=zonaOriginal;
  }

  console.log('\n=== FEN: su Canvas, su sigla sin EN ===');
  run(`S.tenant='fen';S.ramos=[{id:'mm2',nombre:'Métodos Matemáticos II',sigla:'MEM1505',gates:[],categorias:[
      {id:'c1',nombre:'Control 1',peso:50,notas:[]},{id:'ex',nombre:'Examen',peso:50,notas:[]}]}]`);
  ctx.__evFen=JSON.parse(JSON.stringify(run(`parseIcsCalendario(${JSON.stringify(ICS([
    ['Control 1 [ENMEM1505-02]',':20261016T025900Z'],
    ['Examen [MEM1505]',';VALUE=DATE:20261201'],
    ['Taller [ENECO1505-01]',';VALUE=DATE:20261020']]))},{inicioCrudo:true})`)));
  const fen=run(`propuestasCanvasIcs(__evFen,new Date(2026,9,12,9))`);
  chk('[ENMEM1505-02] calza con MEM1505, con la fecha de Chile',fen.some(p=>p.target==='mm2|c1|'&&p.fecha==='2026-10-15'));
  chk('sin el EN también calza',fen.some(p=>p.target==='mm2|ex|'&&p.fecha==='2026-12-01'));
  chk('otro curso de la FEN queda fuera',!fen.some(p=>/Taller/.test(p.titulo)));
  run(`currentUser={id:'u1'};enAppNativa=()=>false`);
  chk('una cuenta FEN ve el calendario de Canvas',run('canvasIcsDisponible()')===true);
  chk('en la app con el plugin (solo UC), la FEN sigue con el calendario',run(`(()=>{const pc=pluginCanvas;pluginCanvas=()=>({});const r=canvasIcsDisponible();pluginCanvas=pc;return r;})()`)===true);
  chk('una universidad sin Canvas no lo ve',run(`(()=>{S.tenant='uai';const r=canvasIcsDisponible();S.tenant='fen';return r;})()`)===false);
  {
    let html='';const cajaFen={set innerHTML(h){html=h;}};
    const gid=ctx.document.getElementById;ctx.document.getElementById=id=>id==='s-canvas-ics'?cajaFen:stub;
    run('pintarCanvasIcsAjustes()');
    chk('Ajustes nombra Canvas FEN y su dirección, no la UC',/En Canvas FEN abre/.test(html)&&/https:\/\/canvas\.fen\.uchile\.cl\/feeds/.test(html)&&!/uc\.cl|Canvas UC/.test(html));
    let aviso={...stub,textContent:''};ctx.document.getElementById=id=>id==='s-canvas-ics-estado'?aviso:stub;
    stub.value=URL_OK;await run('conectarCanvasIcs()');
    chk('una cuenta FEN que pega la URL de la UC recibe el error con su dirección',/Canvas FEN/.test(aviso.textContent)&&/canvas\.fen\.uchile\.cl/.test(aviso.textContent));
    stub.value='';ctx.document.getElementById=gid;
  }
  run(`S.tenant='uc'`);

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
  chk('en la app con Canvas nativo no aparece: ahí está el token',run(`const pc=pluginCanvas;pluginCanvas=()=>({});const r=canvasIcsDisponible();pluginCanvas=pc;r`)===false);

  run(`enAppNativa=()=>false;S.tenant='uc';currentUser={id:'u1'};supabaseClient={auth:{getSession:async()=>({data:{session:{access_token:'jwt-sintetico'}}})}};icsImportDraft=null`);
  let responder;ctx.fetch=()=>new Promise(r=>responder=r);
  const tardia=run(`importarDesdeCanvasIcs(${JSON.stringify(URL_OK)})`);
  await Promise.resolve();await Promise.resolve();
  run(`currentUser={id:'u2'}`);
  responder(new Response(ICS([['I2 [MAT1620-2]',':20991116T025900Z']])));
  chk('respuesta tardía de otra cuenta no abre ni guarda propuestas',(await tardia)===false&&run('icsImportDraft')===null);

  ctx.fetch=async()=>new Response(ICS([]));
  let estadoVisible={...stub,textContent:''};
  const caja={set innerHTML(html){estadoVisible={...stub,textContent:''};}};
  ctx.document.getElementById=id=>id==='s-canvas-ics-estado'?estadoVisible:id==='s-canvas-ics'?caja:stub;
  stub.value=URL_OK;
  await run('conectarCanvasIcs()');
  chk('conectar un calendario vacío lo guarda y explica que no hay fechas próximas',run('urlCanvasIcsGuardada()')===URL_OK&&/no tiene fechas próximas/.test(estadoVisible.textContent));
  await run('actualizarDesdeCanvasIcs()');
  chk('actualizar un calendario vacío mantiene el aviso',/no tiene fechas próximas/.test(estadoVisible.textContent));

  console.log('\n=== En el iPhone: la FEN con calendario, la UC con su token ===');
  let pidioA=null;ctx.fetch=async u=>{pidioA=u;return new Response(ICS([]));};
  await run('actualizarDesdeCanvasIcs()');
  chk('en la web pide a /canvas-calendario, el mismo origen',pidioA==='/canvas-calendario');
  // La app de la App Store: capacitor://localhost y el plugin de Canvas UC.
  ctx.location.protocol='capacitor:';run(`__pc=pluginCanvas;pluginCanvas=()=>({});S.tenant='fen'`);
  chk('una cuenta FEN en el iPhone ve el calendario',run('canvasIcsDisponible()')===true);
  pidioA=null;await run('actualizarDesdeCanvasIcs()');
  chk('y lo pide a gradehub.cl',pidioA==='https://gradehub.cl/canvas-calendario');
  run(`S.tenant='uc'`);
  chk('una cuenta UC en el iPhone sigue con su token, sin calendario',run('canvasIcsDisponible()')===false&&run('canvasDisponible()')===true);
  delete ctx.location.protocol;run(`pluginCanvas=__pc`);
  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
