const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(root,f),'utf8'),nodo={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},addEventListener(){},appendChild(){},querySelector(){return this},querySelectorAll(){return[]},setAttribute(){},removeAttribute(){}};
const ctx={console,crypto:webcrypto,Uint8Array,TextDecoder,Blob,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}})},document:{getElementById:()=>nodo,addEventListener(){},createElement:()=>nodo,documentElement:nodo,body:nodo,querySelector:()=>nodo},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{},currentUser:{id:'00000000-0000-4000-8000-000000000001'}};
vm.createContext(ctx);vm.runInContext(leer('data.js')+'\n'+leer('engine.js')+'\n'+leer('app.js'),ctx);const run=s=>vm.runInContext(s,ctx);
const pdf=new Blob(['%PDF-1.4\n PDF sintético']);
const lector=texto=>({getDocument:()=>({promise:Promise.resolve({numPages:2,getPage:async()=>({getTextContent:async()=>({items:texto?[{str:'Evaluación sintética 100%',transform:[1,0,0,1,10,10]}]:[]})}),destroy(){}})})});
(async()=>{
 const validar=run('validarProgramaPdf');await assert.rejects(validar(new Blob(['esto no es pdf']),lector(true)),/no es un PDF/);
 await assert.rejects(validar({size:10485761},lector(true)),/10 MB/);
 const con=await validar(pdf,lector(true)),sin=await validar(pdf,lector(false));assert.equal(con.paginas,2);assert.equal(con.con_texto,true);assert.equal(sin.con_texto,false,'escaneo aceptado');assert.equal(con.sha256.length,64);
 let llamadas=[],archivos=[],borrados=[],respuesta={id:'envio'},duplicado=false,perder=false;
 ctx.__rpc=async(n,p)=>{llamadas.push({n,p});if(n==='programa_ya_recibido')return {data:duplicado};if(n==='enviar_programa'){if(perder){perder=false;return {error:{message:'respuesta perdida'}};}return {data:respuesta};}return {data:false};};
 run("supabaseClient={rpc:__rpc,storage:{from:()=>({upload:async(r,archivo,o)=>{__archivos.push({r,o});return {data:{path:r}}},remove:async rs=>{__borrados.push(...rs);return {data:[]}}})}}");ctx.__archivos=archivos;ctx.__borrados=borrados;run("currentUser={id:'00000000-0000-4000-8000-000000000001'}");
 const datos={tenant:'udd',carrera:'Carrera sintética',sigla:'SYN100',ramo:'Curso sintético',periodo:'2026-2',ramoId:'ramo'},mandar=run('mandarProgramaPdf');
 duplicado=true;assert.equal((await mandar(pdf,datos,con)).duplicado,true);assert.equal(archivos.length,0,'duplicado detectado antes de subir');
 duplicado=false;const carga={};perder=true;await assert.rejects(mandar(pdf,datos,con,carga),/confirmar/);const ruta=carga.ruta;
 assert.equal((await mandar(pdf,datos,con,carga)).id,'envio');assert.equal(archivos.length,1,'reintento no guarda otro binario');assert.equal(carga.ruta,ruta);assert.equal(borrados.length,0,'respuesta perdida no borra un PDF que pudo quedar aceptado');
 respuesta={duplicado:true};await mandar(pdf,datos,con,{});assert.equal(borrados.length,1,'carrera entre dos subidas elimina la copia propia antes de agradecer');
 assert.equal(run('estadoProgramaTexto')({estado:'pendiente'}),'Programa enviado · en revisión');assert.match(run('estadoProgramaTexto')({estado:'publicado'}),/Publicado/);assert.match(run('estadoProgramaTexto')({estado:'descartado',motivo:'Falta la pauta'}),/No sirvió.*Falta la pauta/);
 // Cuentas sin PDF o SQL todavía ausente siguen por la RPC previa.
 let fetches=0;ctx.fetch=async()=>{fetches++;return {ok:true};};
 ctx.__rpc=async()=>({data:false});run('supabaseClient.rpc=__rpc');assert.equal(await run('borrarProgramasAntesDeCuenta()'),false);assert.equal(fetches,0);
 ctx.__rpc=async()=>({error:{code:'PGRST202'}});run('supabaseClient.rpc=__rpc');assert.equal(await run('borrarProgramasAntesDeCuenta()'),false);
 ctx.__rpc=async()=>({data:true});run("supabaseClient.rpc=__rpc;supabaseClient.auth={getSession:async()=>({data:{session:{access_token:'token-sintetico-sin-cuenta-real'}}})}");assert.equal(await run('borrarProgramasAntesDeCuenta()'),true);assert.equal(fetches,1);
 ctx.fetch=async()=>({ok:false});await assert.rejects(run('borrarProgramasAntesDeCuenta()'),/borrado/);
 console.log('PASS PDF cliente: cabecera/tamaño/texto/escaneo, SHA, duplicado, respuesta perdida, limpieza de carrera, estados, cuenta antigua y borrado fallido');
})().catch(e=>{console.error(e);process.exitCode=1;});
