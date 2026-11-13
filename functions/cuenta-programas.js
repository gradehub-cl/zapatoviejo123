// Borrado de cuenta con archivos: actúa con la sesión del dueño, sin service key.
const BASE='https://lsulsnswzesyekpsvlql.supabase.co';
const PUBLICA='sb_publishable_JwBMAOR7iHW-gcRdLMGrYw_eCOISwqA';
const respuesta=(estado,msg)=>new Response(JSON.stringify({ok:estado===200,mensaje:msg}),{status:estado,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function borrarCuentaConProgramas(request,pedir=fetch){
 if(request.method!=='POST')return respuesta(405,'Método no permitido');
 const token=/^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(request.headers.get('Authorization')||'');
 if(!token)return respuesta(401,'Inicia sesión para borrar tu cuenta');
 const headers={apikey:PUBLICA,Authorization:'Bearer '+token[1],'Content-Type':'application/json'};
 const corte=new AbortController(),timer=setTimeout(()=>corte.abort(),25000);
 const llamar=(ruta,method='POST',body)=>pedir(BASE+ruta,{method,headers,redirect:'error',signal:corte.signal,...(body!==undefined?{body:JSON.stringify(body)}:{})});
 try{
  const sesion=await llamar('/auth/v1/user','GET');if(!sesion.ok)return respuesta(401,'Inicia sesión para borrar tu cuenta');
  const usuario=await sesion.json();if(!/^[0-9a-f-]{36}$/.test(usuario.id||''))return respuesta(401,'Sesión inválida');
  const carpeta=usuario.id;
  // Sin offset: cada lote se elimina antes de leer el siguiente. Incluye archivos
  // de cargas incompletas, no solo los que tienen una fila confirmada.
  for(let lote=0;lote<100;lote++){
   const lista=await llamar('/storage/v1/object/list/programas','POST',{prefix:carpeta+'/',limit:100,offset:0});
   if(!lista.ok){if(lista.status===404)break;return respuesta(502,'No pudimos borrar tus programas. Tu cuenta se conserva.');}
   const objetos=await lista.json();if(!Array.isArray(objetos))return respuesta(502,'No pudimos verificar tus archivos.');
   if(!objetos.length)break;
   const rutas=objetos.map(o=>o.name).filter(n=>typeof n==='string'&&/^[0-9a-f-]{36}\.pdf$/.test(n)).map(n=>carpeta+'/'+n);
   if(rutas.length!==objetos.length)return respuesta(502,'No pudimos revisar todos tus archivos. Tu cuenta se conserva.');
   const borrado=await llamar('/storage/v1/object/programas','DELETE',{prefixes:rutas});
   if(!borrado.ok)return respuesta(502,'No pudimos borrar tus programas. Tu cuenta se conserva.');
   if(lote===99)return respuesta(503,'Hay muchos archivos. Reintenta para completar el borrado.');
  }
  // El trigger SQL vuelve a comprobar que no haya archivos (incluida una
  // subida concurrente). Nunca se borra una fila de storage.objects por SQL.
  const fin=await llamar('/rest/v1/rpc/eliminar_mi_cuenta','POST',{});
  return fin.ok?respuesta(200,'Cuenta eliminada'):respuesta(502,'No pudimos completar el borrado. Tu cuenta se conserva.');
 }catch{return respuesta(502,'No pudimos completar el borrado. Reintenta.');}
 finally{clearTimeout(timer);}
}
function cors(request){return request.headers.get('Origin')==='capacitor://localhost'?{'Access-Control-Allow-Origin':'capacitor://localhost','Vary':'Origin'}:{};}
export function onRequestOptions({request}){return new Response(null,{status:204,headers:{...cors(request),'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});}
export async function onRequestPost({request}){const r=await borrarCuentaConProgramas(request);return new Response(r.body,{status:r.status,headers:{...Object.fromEntries(r.headers),...cors(request)}});}
