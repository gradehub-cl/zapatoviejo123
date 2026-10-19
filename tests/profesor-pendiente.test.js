// Los estados de la postulación usan fichas y anuncios sintéticos: ninguna
// cuenta ni nota real entra al test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','marketplace.js'),'utf8');
const ctx={console,Intl,Date,document:{getElementById(){return null;}},
  esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};
vm.createContext(ctx);
vm.runInContext(src,ctx);
const run=s=>vm.runInContext(s,ctx);
function caja(){
  const controles=new Map();
  return {id:'profesor-body',innerHTML:'',
    querySelector(sel){return controles.get(sel)||null;},
    querySelectorAll(sel){return sel==='[data-borrador-pendiente]'
      ?[...controles.values()].filter(c=>c.dataset&&c.dataset.borradorPendiente):[];},
    control(sel,datos={}){const c={dataset:{},eventos:{},addEventListener(tipo,fn){this.eventos[tipo]=fn;},...datos};controles.set(sel,c);return c;}};
}
const borrador={id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',estado:'borrador',titulo:'Álgebra <prueba>'};
ctx.__borrador=borrador;
ctx.__lista={ok:true,anuncios:[borrador]};
ctx.__editor=[];
ctx.__panel=0;
run('misAnunciosClase=async()=>__lista; renderBorradorProfesor=(raiz,anuncio,opciones)=>__editor.push({anuncio,opciones}); renderPanelProfesor=async()=>{__panel++};');

(async()=>{
  const pendiente={estado:'pendiente',solicitado_at:'2026-10-12T15:00:00Z'};
  ctx.__perfil=pendiente;
  run('perfilProfesorActual=async()=>({ok:true,perfil:__perfil})');
  let raiz=caja();ctx.raiz=raiz;
  raiz.control('[data-borrador-pendiente]',{dataset:{borradorPendiente:borrador.id}});
  await run('renderEspacioProfesor(raiz,{titulo:false})');
  assert.match(raiz.innerHTML,/pendiente de revisión/);
  assert.match(raiz.innerHTML,/12 de octubre de 2026/);
  assert.match(raiz.innerHTML,/Tu borrador/);
  assert.match(raiz.innerHTML,/Álgebra &lt;prueba&gt;/);
  assert.doesNotMatch(raiz.innerHTML,/Enviar a revisión/);
  raiz.querySelector('[data-borrador-pendiente]').eventos.click();
  assert.equal(ctx.__editor.length,1);
  assert.equal(ctx.__editor[0].anuncio.id,borrador.id);
  assert.equal(ctx.__editor[0].opciones.pendiente,true);

  ctx.__lista={ok:true,anuncios:[]};
  raiz=caja();ctx.raiz=raiz;raiz.control('#clase-nueva-pendiente');
  await run('renderEspacioProfesor(raiz,{titulo:false})');
  assert.match(raiz.innerHTML,/Preparar anuncio/);
  raiz.querySelector('#clase-nueva-pendiente').eventos.click();
  assert.equal(ctx.__editor[1].anuncio,null);
  assert.equal(ctx.__editor[1].opciones.pendiente,true);

  for(const [estado,mensaje] of [['rechazado','no fue aprobada'],['suspendido','está suspendido']]){
    ctx.__perfil={estado};raiz=caja();ctx.raiz=raiz;
    await run('renderEspacioProfesor(raiz,{titulo:false})');
    assert.match(raiz.innerHTML,new RegExp(mensaje));
    assert.doesNotMatch(raiz.innerHTML,/Preparar anuncio|Seguir preparando/);
  }
  ctx.__perfil={estado:'aprobado'};
  raiz=caja();ctx.raiz=raiz;
  await run('renderEspacioProfesor(raiz,{titulo:false})');
  assert.equal(ctx.__panel,1,'la cuenta aprobada sigue al panel existente');
  assert.equal(ctx.__editor.length,2,'los otros estados no abren el editor');

  console.log('Profesor pendiente: 4 estados y borradores OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
