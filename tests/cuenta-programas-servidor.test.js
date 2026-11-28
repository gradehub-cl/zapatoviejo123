const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Response,Request,AbortController,setTimeout,clearTimeout,fetch:()=>{throw Error('No usar red real')}};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../functions/cuenta-programas.js','utf8').replace(/^export /gm,''),c);const borrar=vm.runInContext('borrarCuentaConProgramas',c);
const uid='00000000-0000-4000-8000-000000000001',uuid='00000000-0000-4000-8000-000000000010',token='token-sintetico-de-prueba-sin-cuenta-real';
(async()=>{
 const request=()=>new Request('https://ejemplo.invalid/cuenta-programas',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({user_id:'otra-persona'})});
 let llamadas=[],archivos=[{name:uuid+'.pdf'}],falla=false;
 const pedir=async(url,o)=>{llamadas.push({url,o});if(url.endsWith('/auth/v1/user'))return Response.json({id:uid});if(url.includes('/object/list/'))return Response.json(archivos);if(o.method==='DELETE'){if(falla)return new Response('falló',{status:500});assert.deepEqual(JSON.parse(o.body).prefixes,[uid+'/'+uuid+'.pdf']);archivos=[];return Response.json([]);}return new Response(null,{status:204});};
 assert.equal((await borrar(request(),pedir)).status,200);assert.equal(llamadas.at(-1).url.endsWith('/rpc/eliminar_mi_cuenta'),true);assert.equal(llamadas.some(x=>x.url.includes('otra-persona')),false,'la identidad viene de auth y no del cuerpo');
 archivos=[{name:uuid+'.pdf'}];llamadas=[];falla=true;const error=await borrar(request(),pedir);assert.equal(error.status,502);assert.equal(llamadas.some(x=>x.url.includes('/rpc/')),false,'si no borra binarios conserva cuenta');assert.equal((await error.text()).includes(token),false);
 assert.equal((await borrar(new Request('https://ejemplo.invalid',{method:'POST'}),pedir)).status,401);
 const preflight=vm.runInContext('onRequestOptions',c)({request:new Request('https://ejemplo.invalid',{headers:{Origin:'capacitor://localhost'}})});assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'capacitor://localhost');
 console.log('PASS borrado servidor: sesión propia, ignora usuario externo, Storage antes de cuenta, fallo conserva cuenta, sin tokens en error y CORS nativo');
})().catch(e=>{console.error(e);process.exitCode=1;});

assert.match(fs.readFileSync(__dirname+'/../.github/workflows/deploy.yml','utf8'),/functions\/cuenta-programas[.]js/,'el servidor se incluye en el despliegue');
