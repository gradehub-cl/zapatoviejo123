// El cambio de controlador no basta: una navegación online puede haber cargado
// el HTML y JS nuevos antes de que termine de activarse ese mismo SW.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const raiz=__dirname+'/../';
const cliente=fs.readFileSync(raiz+'src/app/actualizacion-y-carga-local.js','utf8').split('// ─── CARGA DE LA COPIA LOCAL')[0];
const worker=fs.readFileSync(raiz+'sw.js','utf8');

function entorno({version='aaaaaaa',primera=false,sinCanal=false,reloj0=0}={}){
  const swEventos={},eventos={},documentoEventos={},ventanaEventos={},elementos=new Map(),plazos=new Map();
  let reloj=reloj0,temporizador=0,recargas=0,revisiones=0;const estado={formulario:false};
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
  const documento={currentScript:{src:'https://ejemplo.invalid/app.js?v='+version},getElementById:id=>elementos.get(id)||null,createElement:nodo,body:cuerpo,addEventListener:(tipo,fn)=>{documentoEventos[tipo]=fn;},visibilityState:'visible',activeElement:null};
  vm.runInNewContext(cliente,{
    navigator:{serviceWorker:sw},document:documento,window:{addEventListener:(tipo,fn)=>{ventanaEventos[tipo]=fn;}},
    URL,Date:{now:()=>reloj},MessageChannel:sinCanal?undefined:Canal,console,
    setTimeout:fn=>{plazos.set(++temporizador,fn);return temporizador;},clearTimeout:id=>plazos.delete(id),
    location:{reload(){recargas++;}},track:(n,d)=>mediciones.push(d?n+':'+d.motivo:n),cambiosSinGuardarNav:()=>estado.formulario,
  });
  return{
    cambiar(sha,opciones){sw.controller=controlador(sha,opciones);eventos.controllerchange();},
    desconectar(){sw.controller=null;eventos.controllerchange();},
    peticiones,plazos,swEventos,documento,estado,ventanaEventos,
    reloj(t){reloj=t;},
    tocar(){ventanaEventos.pointerdown();},
    salir(){documento.visibilityState='hidden';documentoEventos.visibilitychange();},
    entrar(){documento.visibilityState='visible';documentoEventos.visibilitychange();},
    cargar:async()=>{ventanaEventos.load();await Promise.resolve();},
    volver(t){reloj=t;documentoEventos.visibilitychange();},
    get revisiones(){return revisiones;},get recargas(){return recargas;},mediciones,
  };
}

(async()=>{
  // Recién abierta y sin tocar nada: se actualiza al tiro.
  let e=entorno();
  e.cambiar('aaaaaaa');assert.equal(e.recargas,0,'JS y worker nuevos: no recarga lo que ya está actualizado');
  e=entorno({primera:true});e.cambiar('aaaaaaa');
  assert.equal(e.recargas,0,'la instalación inicial no se trata como actualización');
  e.cambiar('bbbbbbb');assert.equal(e.recargas,1,'si esa primera página queda abierta, sí reconoce el siguiente deploy');
  e=entorno();e.cambiar('bbbbbbb');assert.equal(e.recargas,1);assert.deepEqual(e.mediciones,['sw_update_auto:al_abrir']);
  assert.equal(e.documento.getElementById('toast-update'),null,'ya no hay botón de actualizar');

  // Usándola: espera a que salga o vuelva, y nunca a mitad de algo.
  e=entorno();e.tocar();e.cambiar('bbbbbbb');
  assert.equal(e.recargas,0,'mientras la usa no recarga');
  e.salir();assert.equal(e.recargas,1,'al salir de la app se actualiza');assert.deepEqual(e.mediciones,['sw_update_auto:al_salir']);
  e=entorno({reloj0:0});e.reloj(20000);e.cambiar('bbbbbbb');
  assert.equal(e.recargas,0,'pasados 15 s desde que abrió, ya no recarga sin aviso aunque no haya tocado');
  e.entrar();assert.equal(e.recargas,1,'al volver a la app se actualiza');
  e=entorno();e.tocar();e.cambiar('bbbbbbb');e.documento.activeElement={tagName:'INPUT'};
  e.salir();assert.equal(e.recargas,0,'con el cursor en un campo no recarga');
  for(const fn of [...e.plazos.values()])fn();assert.equal(e.recargas,0);
  e.documento.activeElement=null;e.entrar();assert.equal(e.recargas,1,'recarga en la siguiente ocasión segura');
  e=entorno();e.tocar();e.cambiar('bbbbbbb');e.estado.formulario=true;
  e.salir();e.entrar();assert.equal(e.recargas,0,'con un formulario a medias no recarga');
  e.estado.formulario=false;e.salir();assert.equal(e.recargas,1);
  e=entorno();e.tocar();e.cambiar('bbbbbbb');e.cambiar('aaaaaaa');e.salir();
  assert.equal(e.recargas,0,'si la versión activa vuelve a coincidir, ya no hay nada que recargar');

  e=entorno();e.tocar();e.cambiar('bbbbbbb',{demorar:true});const anterior=e.peticiones[0];
  e.cambiar('aaaaaaa');anterior.responder();e.salir();
  assert.equal(e.recargas,0,'una respuesta tardía no deja una recarga obsoleta');
  e=entorno();e.cambiar('bbbbbbb',{demorar:true});e.desconectar();e.peticiones[0].responder();
  assert.equal(e.recargas,0,'una respuesta de un controlador desconectado se descarta');

  for(const version of ['dev','__ASSET_VERSION__','', 'no-version']){
    e=entorno({version});e.cambiar('bbbbbbb');assert.equal(e.recargas,0);assert.equal(e.peticiones.length,0);
  }
  for(const sha of ['dev','', 'no-version']){
    e=entorno();e.cambiar(sha);assert.equal(e.recargas,0,'una versión desconocida no demuestra que falte actualizar');
  }
  e=entorno({sinCanal:true});e.cambiar('bbbbbbb');assert.equal(e.recargas,0);
  e=entorno();e.cambiar('bbbbbbb',{fallar:true});assert.equal(e.recargas,0);assert.equal(e.plazos.size,0);
  e=entorno();e.cambiar('bbbbbbb',{demorar:true});
  for(const fn of [...e.plazos.values()])fn();
  e.peticiones[0].responder();assert.equal(e.recargas,0);assert.equal(e.plazos.size,0,'cierra los puertos al agotar el plazo');
  e=entorno();e.cambiar('bbbbbbb',{sinRespuesta:true});
  for(const fn of [...e.plazos.values()])fn();
  assert.equal(e.recargas,0,'un worker antiguo sin este protocolo no recarga sin comprobar');

  e=entorno();await e.cargar();e.volver(59999);assert.equal(e.revisiones,0);
  e.volver(60000);assert.equal(e.revisiones,1,'conserva la búsqueda de actualizaciones al volver al primer plano');
  e.documento.visibilityState='hidden';e.volver(120000);assert.equal(e.revisiones,1);

  const respuestas=[];
  e.swEventos.message({data:{tipo:'GH_VERSION'},ports:[{postMessage:d=>respuestas.push(d)}]});
  assert.equal(respuestas[0].version,'0000000','el SW informa el SHA sellado del cache');
  e.swEventos.message({data:{tipo:'OTRO'},ports:[{postMessage(){throw new Error('no debe responder');}}]});
  e.swEventos.message({data:{tipo:'GH_VERSION'},ports:[]});
  assert.ok(worker.includes("const CACHE_NAME = 'gradehub-dev';"),'conserva el marcador del deploy');
  console.log('OK actualización automática: al abrir, al salir y al volver; nunca con un campo activo o un formulario a medias; respuestas tardías, fallo/plazo y revisión al volver');
})().catch(error=>{console.error(error);process.exitCode=1;});
