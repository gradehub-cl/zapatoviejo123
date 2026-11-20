// Analítica propia: PostHog (nube de la Unión Europea) servido desde nuestro dominio.
//
// Por qué pasa por acá y no directo a PostHog:
//  - La CSP de _headers ya permite 'self'; no hay que abrir dominios nuevos.
//  - Los bloqueadores cortan los dominios de analítica conocidos y medir
//    retención con la mitad de los computadores fuera no sirve.
//
// Qué NO hace, a propósito:
//  - No reenvía la IP de la persona ni sus cookies: PostHog ve la IP de
//    Cloudflare. El país sale de ahí o no sale; no necesitamos más.
//  - No es un proxy abierto: solo las rutas que usa posthog-js, solo GET, POST
//    y OPTIONS, y el cuerpo acotado.
//  - La librería va fijada a una versión: no corre código que cambie solo.
const LIB='https://cdn.jsdelivr.net/npm/posthog-js@1.446.0/dist/array.no-external.js';
const API='https://eu.i.posthog.com';
const MAX_CUERPO=1024*1024;
const RUTAS_API=[/^e\/?$/,/^i\/v0\/e\/?$/,/^batch\/?$/,/^flags\/?$/,/^array\/phc_[A-Za-z0-9_]{10,80}\/config$/];
const CABECERAS_QUE_PASAN=['content-type','content-encoding','accept','accept-encoding','user-agent','origin'];

export function rutaPermitida(ruta){return RUTAS_API.some(re=>re.test(ruta));}

const vacia=status=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});

export async function reenviarAnalitica(request,ruta,pedir=fetch){
  const metodo=request.method;
  if(ruta==='lib.js'){
    if(metodo!=='GET')return vacia(405);
    const r=await pedir(LIB,{cf:{cacheTtl:86400,cacheEverything:true}});
    if(!r.ok)return vacia(502);
    return new Response(r.body,{status:200,headers:{
      'Content-Type':'application/javascript; charset=utf-8',
      'Cache-Control':'public, max-age=86400',
      'X-Content-Type-Options':'nosniff',
      'Access-Control-Allow-Origin':'*',
    }});
  }
  if(!rutaPermitida(ruta))return vacia(404);
  if(!['GET','POST','OPTIONS'].includes(metodo))return vacia(405);
  const largo=Number(request.headers.get('content-length')||0);
  if(largo>MAX_CUERPO)return vacia(413);
  const destino=new URL(API+'/'+ruta);
  destino.search=new URL(request.url).search;
  const cabeceras=new Headers();
  for(const c of CABECERAS_QUE_PASAN){const v=request.headers.get(c);if(v)cabeceras.set(c,v);}
  // OPTIONS (preflight de la app iOS) también se reenvía: PostHog contesta los
  // permisos CORS para el origen de la app.
  for(const c of ['access-control-request-method','access-control-request-headers']){const v=request.headers.get(c);if(v)cabeceras.set(c,v);}
  let cuerpo;
  if(metodo==='POST'){
    cuerpo=await request.arrayBuffer();
    if(cuerpo.byteLength>MAX_CUERPO)return vacia(413);
  }
  const r=await pedir(destino.toString(),{method:metodo,headers:cabeceras,body:cuerpo,redirect:'manual'});
  const salida=new Headers(r.headers);
  salida.delete('set-cookie');
  salida.set('Cache-Control','no-store');
  return new Response(r.body,{status:r.status,headers:salida});
}

export async function onRequest({request,params}){
  const ruta=[].concat(params.ruta||[]).join('/');
  try{return await reenviarAnalitica(request,ruta);}
  catch(e){return vacia(502);}
}
