// Calendario Canvas UC: sesión verificada, host/ruta cerrados, sin registros.
const SUPABASE_URL='https://lsulsnswzesyekpsvlql.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_JwBMAOR7iHW-gcRdLMGrYw_eCOISwqA';
const MAX_BYTES=512*1024,MAX_CUERPO=2000,ESPERA_MS=8000;
export function urlCanvasValida(url){
  return typeof url==='string'&&/^https:\/\/cursos\.canvas\.uc\.cl\/feeds\/calendars\/user_[A-Za-z0-9]{20,80}\.ics$/.test(url);
}
const respuesta=(body,status,tipo='application/json')=>new Response(tipo==='application/json'?JSON.stringify(body):body,{status,headers:{'Content-Type':tipo,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error=(mensaje,status)=>respuesta({error:mensaje},status);
async function leerAcotado(r,limite,signal){
  if(!r.body)return '';
  const reader=r.body.getReader(),partes=[];let total=0;
  const cancelar=()=>{void reader.cancel().catch(()=>{});};
  signal.addEventListener('abort',cancelar,{once:true});
  try{
    for(;;){
      if(signal.aborted)throw new Error('plazo');
      const {done,value}=await reader.read();
      if(signal.aborted)throw new Error('plazo');
      if(done)break;
      total+=value.byteLength;
      if(total>limite){await reader.cancel();return null;}
      partes.push(value);
    }
    const bytes=new Uint8Array(total);let i=0;
    for(const parte of partes){bytes.set(parte,i);i+=parte.byteLength;}
    return new TextDecoder().decode(bytes);
  }finally{signal.removeEventListener('abort',cancelar);reader.releaseLock();}
}
export async function traerCalendarioCanvas(request,pedir=fetch){
  if(request.method!=='POST')return error('Método no permitido.',405);
  const auth=/^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(request.headers.get('Authorization')||'');
  if(!auth)return error('Inicia sesión en GradeHub.',401);
  const corte=new AbortController(),reloj=setTimeout(()=>corte.abort(),ESPERA_MS);
  try{
    const sesion=await pedir(SUPABASE_URL+'/auth/v1/user',{redirect:'manual',signal:corte.signal,headers:{apikey:SUPABASE_ANON_KEY,Authorization:'Bearer '+auth[1]}});
    if(sesion.body)await sesion.body.cancel();
    if(sesion.status!==200)return error('Inicia sesión en GradeHub.',401);
    const crudo=await leerAcotado(request,MAX_CUERPO,corte.signal);
    if(crudo===null)return error('Pedido inválido.',400);
    let url;try{url=JSON.parse(crudo)?.url;}catch{return error('Pedido inválido.',400);}
    if(!urlCanvasValida(url))return error('Esa no es la URL de la fuente de calendario de Canvas UC.',400);
    const r=await pedir(url,{redirect:'manual',signal:corte.signal,headers:{Accept:'text/calendar'}});
    if(r.status!==200){if(r.body)await r.body.cancel();return error('Canvas no reconoce esa URL o no respondió bien. Cópiala de nuevo desde Fuente de calendario.',502);}
    const texto=await leerAcotado(r,MAX_BYTES,corte.signal);
    if(texto===null)return error('Tu calendario de Canvas supera 500 KB.',502);
    if(!/^BEGIN:VCALENDAR\r?$/m.test(texto)||!/^END:VCALENDAR\r?$/m.test(texto))return error('Canvas no devolvió un calendario.',502);
    return respuesta(texto,200,'text/calendar; charset=utf-8');
  }catch{return error('No pudimos leer Canvas a tiempo. Intenta de nuevo.',504);}
  finally{clearTimeout(reloj);}
}
export async function onRequestPost({request}){return traerCalendarioCanvas(request);}
