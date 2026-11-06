const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={esc:s=>String(s),preparacionRamoPanel:al=>al.preparacion,percentilesPanelHTML:()=>'<div>Percentiles</div>',
  conSignoPanel:n=>(n>0?'+':'')+n,unDecimalPanel:n=>String(n)};
vm.createContext(ctx);
const src=fs.readFileSync(__dirname+'/../src/marketplace/alumnos-preparacion.js','utf8');
vm.runInContext(src.slice(src.indexOf('function gruposParecidosFormularioHTML')),ctx);
const run=s=>vm.runInContext(s,ctx);
const al={id:'al',preparacion:{evaluaciones:[
  {nota_id:'n1',nota:3,fecha:'2026-09-01',nombre:'I1'},{nota_id:null,nombre:'I2'},
  {nota_id:'n2',nota:4,fecha:'2026-09-02',nombre:'Ambigua',ambigua:true},
]}};
const r={id:'r'};
const formulario=run('gruposParecidosFormularioHTML')(al,r);
assert.match(formulario,/Alumnos que partieron igual/);
assert.match(formulario,/value="n1"/);
assert.doesNotMatch(formulario,/>I2<|value="n2"/);
const datos={disponible:true,propios:{n:6,inicial:3,posterior:5,cambio:2},
  gradehub:{n:5,inicial:3,posterior:4,cambio:1},metodos:['manual']};
const resultado=run('gruposParecidosResultadoHTML');
assert.match(resultado(datos),/No demuestra/);
const chico=resultado({...datos,gradehub:{...datos.gradehub,n:4}});
assert.match(chico,/Prueba con un rango más amplio/);
assert.doesNotMatch(chico,/4 estudiantes|Nota de partida|Percentiles/);
assert.match(resultado({...datos,propios:{...datos.propios,n:1}}),/· 1 estudiante</,'el umbral protege al grupo externo');
assert.doesNotMatch(resultado({disponible:false}),/Nota de partida/);

const controles=[{value:'n1'},{value:'2.5'},{value:'3.5'},{disabled:false}];
const listeners={};
const form={elements:{base:controles[0],minimo:controles[1],maximo:controles[2]},
  reportValidity:()=>true,querySelectorAll:()=>controles,addEventListener:(e,fn)=>{listeners[e]=fn;}};
const salida={innerHTML:'',textContent:''};
const panel={querySelector:s=>s==='form'?form:salida};
let conectada=true,editando=false,llamadas=0,responder;
const caja={querySelector:()=>panel,contains:()=>conectada};
run('enlazarGruposParecidos')(caja,al,r,(nombre,args)=>{
  llamadas++;
  assert.equal(nombre,'grupos_parecidos_profesor');
  assert.deepEqual(JSON.parse(JSON.stringify(args)),{p_id:'al',p_ramo:'r',p_nota_base:'n1',p_min:2.5,p_max:3.5});
  return new Promise(resolve=>{responder=resolve;});
},()=>!editando,()=>!editando);
const enviar=()=>listeners.submit({preventDefault(){}});
(async()=>{
  editando=true;
  await enviar();
  assert.equal(llamadas,0,'respeta la edición de marcas');
  editando=false;
  let pendiente=enviar();
  assert(controles.every(c=>c.disabled));
  await enviar();
  assert.equal(llamadas,1,'una sola consulta en vuelo');
  responder({error:{code:'PGRST202'}});
  await pendiente;
  assert.match(salida.textContent,/no está disponible/);
  assert(controles.every(c=>!c.disabled));
  pendiente=enviar();
  responder({error:{code:'500'}});
  await pendiente;
  assert.match(salida.textContent,/Vuelve a intentarlo/);
  pendiente=enviar();
  conectada=false;
  responder({data:datos});
  await pendiente;
  assert.equal(salida.innerHTML,'','la respuesta no pinta un panel repintado');
  console.log('OK partida, privacidad, error, edición de marcas y respuesta obsoleta');
})().catch(e=>{console.error(e);process.exitCode=1;});
