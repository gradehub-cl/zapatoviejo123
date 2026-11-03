// El cambio de controlador no basta: una navegación online puede haber cargado
// el HTML y JS nuevos antes de que termine de activarse ese mismo SW.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const raiz=__dirname+'/../';
const cliente=fs.readFileSync(raiz+'src/app/actualizacion-y-carga-local.js','utf8').split('// ─── CARGA DE LA COPIA LOCAL')[0];
const worker=fs.readFileSync(raiz+'sw.js','utf8');

function entorno({version='aaaaaaa',primera=false,sinCanal=false}={}){
  const swEventos={},eventos={},documentoEventos={},ventanaEventos={},elementos=new Map(),plazos=new Map();
  let reloj=0,temporizador=0,recargas=0,revisiones=0;
  const mediciones=[],peticiones=[];
  function nodo(){return{id:'',children:[],className:'',classList:{add(){}},setAttribute(){},appendChild(hijo){this.children.push(hijo);},remove(){elementos.delete(this.id);}};}
  const cuerpo={appendChild(n){elementos.set(n.id,n);}};
  function controlador(sha,{demorar=false,fallar=false,sinRespuesta=false}={}){
    const manejadores={};
    vm.runInNewContext(worker.replace("'gradehub-dev'",`'gradehub-${sha}'`),{self:{addEventListener:(tipo,fn)=>{manejadores[tipo]=fn;}}});
    Object.assign(swEventos,manejadores);
    return{postMessage(datos,puertos){
      if(fallar)throw new Error('worker terminado');
      const responder=()=>{if(!sinRespuesta)manejadores.message({data:datos,ports:puertos});};
      peticiones.push({responder,datos,puertos});
      if(!demorar)responder();
    }};
  }
  const sw={controller:primera?null:controlador('0000000'),addEventListener:(tipo,fn)=>{eventos[tipo]=fn;},register:async()=>({update:async()=>{revisiones++;}})};
  class Canal{
    constructor(){
      this.port1={closed:false,close(){this.closed=true;}};
      const receptor=this.port1;
      this.port2={close(){},postMessage(data){if(!receptor.closed)receptor.onmessage?.({data});}};
    }
  }
  const documento={currentScript:{src:'https://ejemplo.invalid/app.js?v='+version},getElementById:id=>elementos.get(id)||null,createElement:nodo,body:cuerpo,addEventListener:(tipo,fn)=>{documentoEventos[tipo]=fn;},visibilityState:'visible'};
  vm.runInNewContext(cliente,{
    navigator:{serviceWorker:sw},document:documento,window:{addEventListener:(tipo,fn)=>{ventanaEventos[tipo]=fn;}},
    URL,Date:{now:()=>reloj},MessageChannel:sinCanal?undefined:Canal,console,
    setTimeout:fn=>{plazos.set(++temporizador,fn);return temporizador;},clearTimeout:id=>plazos.delete(id),
    location:{reload(){recargas++;}},track:n=>mediciones.push(n),
  });
  return{
    cambiar(sha,opciones){sw.controller=controlador(sha,opciones);eventos.controllerchange();},
    desconectar(){sw.controller=null;eventos.controllerchange();},
    aviso:()=>elementos.get('toast-update'),peticiones,plazos,swEventos,documento,
    cargar:async()=>{ventanaEventos.load();await Promise.resolve();},
    volver(t){reloj=t;documentoEventos.visibilitychange();},
    get revisiones(){return revisiones;},get recargas(){return recargas;},mediciones,
  };
}

(async()=>{
  let e=entorno();
  assert.equal(e.aviso(),undefined,'abrir no muestra un aviso por tener un controlador anterior');
  e.cambiar('aaaaaaa');
  assert.equal(e.aviso(),undefined,'JS y worker nuevos: no se ofrece actualizar lo que ya está actualizado');
  e=entorno({primera:true});e.cambiar('aaaaaaa');
  assert.equal(e.aviso(),undefined,'la instalación inicial no se anuncia como actualización');
  e.cambiar('bbbbbbb');assert.ok(e.aviso(),'si esa primera página queda abierta, sí reconoce el siguiente deploy');

  e=entorno();e.cambiar('bbbbbbb');
  const aviso=e.aviso();assert.ok(aviso,'página anterior y nuevo worker activo: sí ofrece actualizar');
  assert.equal(e.recargas,0,'no recarga mientras la persona puede estar escribiendo');
  e.cambiar('bbbbbbb');assert.equal(e.aviso(),aviso,'no duplica el aviso');
  aviso.children[0].onclick();assert.equal(e.recargas,1);assert.deepEqual(e.mediciones,['sw_update_accept']);
  e.cambiar('aaaaaaa');assert.equal(e.aviso(),undefined,'retira un aviso si la versión activa ya coincide');

  e=entorno();e.cambiar('bbbbbbb',{demorar:true});const anterior=e.peticiones[0];
  e.cambiar('aaaaaaa');anterior.responder();
  assert.equal(e.aviso(),undefined,'una respuesta tardía no vuelve a mostrar un aviso obsoleto');
  e=entorno();e.cambiar('bbbbbbb',{demorar:true});e.desconectar();e.peticiones[0].responder();
  assert.equal(e.aviso(),undefined,'una respuesta de un controlador desconectado se descarta');

  for(const version of ['dev','__ASSET_VERSION__','', 'no-version']){
    e=entorno({version});e.cambiar('bbbbbbb');assert.equal(e.aviso(),undefined);assert.equal(e.peticiones.length,0);
  }
  for(const sha of ['dev','', 'no-version']){
    e=entorno();e.cambiar(sha);assert.equal(e.aviso(),undefined,'una versión desconocida no demuestra que falte actualizar');
  }
  e=entorno({sinCanal:true});e.cambiar('bbbbbbb');assert.equal(e.aviso(),undefined);
  e=entorno();e.cambiar('bbbbbbb',{fallar:true});assert.equal(e.aviso(),undefined);assert.equal(e.plazos.size,0);
  e=entorno();e.cambiar('bbbbbbb',{demorar:true});
  for(const fn of [...e.plazos.values()])fn();
  e.peticiones[0].responder();assert.equal(e.aviso(),undefined);assert.equal(e.plazos.size,0,'cierra los puertos al agotar el plazo');
  e=entorno();e.cambiar('bbbbbbb',{sinRespuesta:true});
  for(const fn of [...e.plazos.values()])fn();
  assert.equal(e.aviso(),undefined,'un worker antiguo sin este protocolo no produce avisos sin comprobar');

  e=entorno();await e.cargar();e.volver(59999);assert.equal(e.revisiones,0);
  e.volver(60000);assert.equal(e.revisiones,1,'conserva la búsqueda de actualizaciones al volver al primer plano');
  e.documento.visibilityState='hidden';e.volver(120000);assert.equal(e.revisiones,1);

  const respuestas=[];
  e.swEventos.message({data:{tipo:'GH_VERSION'},ports:[{postMessage:d=>respuestas.push(d)}]});
  assert.equal(respuestas[0].version,'0000000','el SW informa el SHA sellado del cache');
  e.swEventos.message({data:{tipo:'OTRO'},ports:[{postMessage(){throw new Error('no debe responder');}}]});
  e.swEventos.message({data:{tipo:'GH_VERSION'},ports:[]});
  assert.ok(worker.includes("const CACHE_NAME = 'gradehub-dev';"),'conserva el marcador del deploy');
  console.log('OK aviso de versión: vigente, anterior, primera visita, respuestas tardías, fallo/plazo, recarga y revisión al volver');
})().catch(error=>{console.error(error);process.exitCode=1;});
