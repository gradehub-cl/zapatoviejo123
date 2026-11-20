// PostHog mide retención con el id de la cuenta. Eso solo vale si nunca se
// lleva notas, nombres ni lo que escribe la persona: este test fija las
// perillas que lo garantizan y el proxy que lo sirve desde nuestro dominio.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

const fuente=leer('src/app/analitica.js');
const ctx={location:{hostname:'gradehub.cl',protocol:'https:'},console,setTimeout};
vm.createContext(ctx);vm.runInContext(fuente,ctx);
const cfg=vm.runInContext('configAnaliticaPropia()',ctx);

console.log('\n=== Nada automático ni grabaciones ===');
chk('sin captura automática de clics',cfg.autocapture===false&&cfg.rageclick===false&&cfg.capture_dead_clicks===false&&cfg.capture_heatmaps===false);
chk('sin vistas de página automáticas',cfg.capture_pageview===false&&cfg.capture_pageleave===false);
chk('sin grabación de sesiones ni encuestas',cfg.disable_session_recording===true&&cfg.disable_surveys===true);
chk('no carga código extra de PostHog',cfg.disable_external_dependency_loading===true);
chk('texto enmascarado por si algo se activa',cfg.mask_all_text===true&&cfg.mask_all_element_attributes===true);
chk('perfil solo para cuentas',cfg.person_profiles==='identified_only');
chk('va por nuestro dominio (/ds), no directo a PostHog',cfg.api_host==='/ds'&&!/posthog\.com/.test(cfg.api_host));
chk('en la app con la web adentro apunta a gradehub.cl',
  (()=>{const c2={location:{hostname:'localhost',protocol:'capacitor:'},console,setTimeout};vm.createContext(c2);vm.runInContext(fuente,c2);return vm.runInContext('configAnaliticaPropia()',c2).api_host==='https://gradehub.cl/ds';})());

console.log('\n=== Lo que sale en cada evento ===');
const limpio=vm.runInContext(`limpiarEventoAnalitica({event:'x',properties:{
  $current_url:'https://gradehub.cl/?amigo=pepe#access_token=abc',$referrer:'https://x.cl/a?q=1',$ip:'1.2.3.4',
  $set_once:{$initial_current_url:'https://gradehub.cl/?amigo=pepe'}}})`,ctx);
chk('la URL va sin query ni hash',limpio.properties.$current_url==='https://gradehub.cl/'&&limpio.properties.$referrer==='https://x.cl/a');
chk('las URL iniciales también',limpio.properties.$set_once.$initial_current_url==='https://gradehub.cl/');
chk('sin IP',!('$ip' in limpio.properties));
const ident=(fuente.match(/function identificarAnalitica\(\)\{[\s\S]*?\n\}/)||[''])[0];
chk('identificar manda solo el id y datos agregados',!!ident&&/currentUser\.id/.test(ident)
  &&!/email|correo|nombre|apellido|userName|userApellido|ramos|notas/.test(ident));
chk('cerrar sesión borra la identidad',/function olvidarAnalitica\(\)\{[\s\S]*?ph\.reset\(\)/.test(fuente)
  &&/olvidarAnalitica\(\)/.test(leer('src/app-session/salida-cuenta.js')));
chk('sin clave, PostHog queda apagado',(()=>{const c3={location:{hostname:'gradehub.cl',protocol:'https:'},console,setTimeout};vm.createContext(c3);vm.runInContext(fuente.replace(/const POSTHOG_KEY='[^']*'/,"const POSTHOG_KEY=''"),c3);return vm.runInContext('analiticaPropiaActiva()',c3)===false;})());
chk('localhost y vistas previas no mandan datos',(()=>{const c4={location:{hostname:'localhost',protocol:'http:'},console,setTimeout};vm.createContext(c4);vm.runInContext(fuente.replace(/const POSTHOG_KEY='[^']*'/,"const POSTHOG_KEY='phc_prueba123456'"),c4);return vm.runInContext('analiticaPropiaActiva()',c4)===false;})());
chk('la clave nunca es secreta',!/POSTHOG_KEY='(?!phc_|')/.test(fuente)&&!/phx_/.test(fuente));

console.log('\n=== login y signup: primero identify, después el evento ===');
{
  const c5={location:{hostname:'gradehub.cl',protocol:'https:'},console,setTimeout,
    currentUser:{id:'00000000-0000-4000-8000-000000000001'},S:{tenant:'uc'},
    esCuentaProfesor:()=>false,enAppNativa:()=>true};
  vm.createContext(c5);vm.runInContext(fuente,c5);
  const llamadas=[];
  const ph={identify:id=>llamadas.push(['identify',id]),register:p=>llamadas.push(['register',p]),
    capture:(ev,p)=>llamadas.push(['capture',ev,p])};
  // PostHog todavía no carga: todo queda en la cola.
  vm.runInContext(`registrarEntradaAnalitica('login',{origen:'calculadora'})`,c5);
  chk('sin PostHog cargado, nada se pierde: queda en la cola',llamadas.length===0&&vm.runInContext('_analiticaPropiaCola.length',c5)===2);
  c5.__ph=ph;vm.runInContext('_analiticaPropia=__ph;_analiticaPropiaEstado="lista";_analiticaPropiaCola.splice(0).forEach(f=>f(__ph));',c5);
  const orden=llamadas.map(l=>l[0]==='capture'?l[1]:l[0]).join(',');
  chk('la cola respeta el orden identify → register → login',orden==='identify,register,login');
  const ev=llamadas.find(l=>l[0]==='capture');
  chk('login lleva tenant, tipo de cuenta y plataforma',ev&&ev[2].tenant==='uc'&&ev[2].tipo_cuenta==='estudiante'&&ev[2].plataforma==='ios');
  chk('login conserva el origen de la entrada',ev&&ev[2].origen==='calculadora');
  // Con PostHog ya cargado, el mismo orden y las mismas propiedades.
  llamadas.length=0;c5.S.tenant='uandes';
  vm.runInContext(`registrarEntradaAnalitica('signup')`,c5);
  chk('con PostHog cargado: identify → register → signup',llamadas.map(l=>l[0]==='capture'?l[1]:l[0]).join(',')==='identify,register,signup');
  const sg=llamadas.find(l=>l[0]==='capture');
  chk('signup lleva los datos de la cuenta que entra',sg&&sg[2].tenant==='uandes'&&sg[2].plataforma==='ios'&&!('origen' in sg[2]));
  const reg=llamadas.find(l=>l[0]==='register');
  chk('el evento y register llevan los mismos datos',reg&&JSON.stringify(reg[1])===JSON.stringify({tenant:sg[2].tenant,tipo_cuenta:sg[2].tipo_cuenta,plataforma:sg[2].plataforma}));
  const entrada=leer('src/app-session/entrada-cuenta.js');
  const login=(entrada.match(/async function afterLogin\(\)\{[\s\S]*?\n\}/)||[''])[0];
  const signup=(entrada.match(/async function afterSignup\(\)\{[\s\S]*?\n\}/)||[''])[0];
  chk('afterLogin no manda login antes de cargar la cuenta',!!login&&!/track\('login'/.test(login)&&/cargasAlEntrar\(origen\)/.test(login)
    &&/function cargasAlEntrar\(origen\)\{\s*if\(typeof registrarEntradaAnalitica==='function'\)registrarEntradaAnalitica\('login',origen\)/.test(entrada));
  chk('afterSignup identifica y manda signup solo con la caché ya aislada',!!signup
    &&signup.indexOf("registrarEntradaAnalitica('signup'")>signup.indexOf('aislarCacheEnRegistro(uid)')
    &&signup.indexOf("registrarEntradaAnalitica('signup'")>signup.indexOf('if(!aislamiento)'));
}

console.log('\n=== El proxy /ds ===');
const fn={URL,Headers,Response,console};
vm.createContext(fn);
vm.runInContext(leer('functions/ds/[[ruta]].js').replace(/^export /gm,''),fn);
const permitida=vm.runInContext('rutaPermitida',fn),reenviar=vm.runInContext('reenviarAnalitica',fn);
chk('acepta solo las rutas de posthog-js',['e/','e','i/v0/e/','batch/','flags/','array/phc_abcdefghij12/config'].every(permitida));
chk('rechaza el resto',!['api/surveys/','s/','decide/','../e','array/phc_x/config.js','project/x/person/y',''].some(permitida));
chk('la librería va fijada a una versión',/posthog-js@\d+\.\d+\.\d+\/dist\/array\.no-external\.js/.test(leer('functions/ds/[[ruta]].js')));
(async()=>{
  let pedido=null;
  const pedir=async(url,op)=>{pedido={url,op};return new Response('{}',{status:200,headers:{'set-cookie':'a=b','content-type':'application/json'}});};
  const req=new Request('https://gradehub.cl/ds/e/?compression=gzip-js',{method:'POST',body:'xyz',headers:{
    'content-type':'text/plain','cookie':'sb=1','cf-connecting-ip':'1.2.3.4','x-forwarded-for':'1.2.3.4','authorization':'Bearer t'}});
  const r=await reenviar(req,'e/',pedir);
  chk('reenvía a la nube de la UE con la query',pedido&&pedido.url==='https://eu.i.posthog.com/e/?compression=gzip-js');
  const h=pedido.op.headers;
  chk('no reenvía cookies, IP ni sesión',!h.get('cookie')&&!h.get('cf-connecting-ip')&&!h.get('x-forwarded-for')&&!h.get('authorization'));
  chk('no devuelve cookies de PostHog',!r.headers.get('set-cookie'));
  const grande=new Request('https://gradehub.cl/ds/e/',{method:'POST',body:'x',headers:{'content-length':String(2*1024*1024)}});
  chk('rechaza cuerpos grandes',(await reenviar(grande,'e/',pedir)).status===413);
  chk('rechaza métodos raros',(await reenviar(new Request('https://gradehub.cl/ds/e/',{method:'DELETE'}),'e/',pedir)).status===405);
  chk('ruta desconocida: 404 sin pedir nada',(pedido=null,(await reenviar(new Request('https://gradehub.cl/ds/api/x'),'api/x',pedir)).status===404&&pedido===null));
  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})();
