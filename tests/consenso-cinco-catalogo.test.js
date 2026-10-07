// Con cinco personas que reportan la misma pauta, el consenso se ofrece como
// una del catálogo: aparece en el buscador diciendo cuántos la respaldan y se
// carga al agregar el ramo. Una pauta de programa siempre manda. Los datos son
// sintéticos: se prueba el mecanismo, no el catálogo.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const el=()=>({value:'',innerHTML:'',textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){}});
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),head:{appendChild(){}},querySelector(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{hash:'',pathname:'/'},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);

const pauta=[{nombre:'Prueba',peso:60},{nombre:'Examen',peso:40}];
const fila=(ramo,respaldos)=>({ramo,ramo_key:run(`normName(${JSON.stringify(ramo)})`),estructura:pauta,huella:'h-'+ramo,respaldos});
const porTenant={
  uandes:[fila('Taller Sintético Cinco',5),fila('Taller Sintético Tres',3),fila('Ramo Con Programa',9)],
  fen:[fila('Taller Sintético Cinco',7)],
};
const pedidos=[];
ctx.porTenant=porTenant;ctx.pedidos=pedidos;
run(`currentUser={id:'u'};supabaseClient={rpc:async(n,a)=>{pedidos.push(a.p_tenant);return {data:porTenant[a.p_tenant]||[],error:null};}};
     PRESETS_UANDES['Ramo Con Programa']={evals:[['Solemne única',100]]};
     S.tenant='uandes';S.carrera=null;S.ramos=[];`);

(async()=>{
  // Una caché por universidad: leer FEN primero (el tenant por defecto de una
  // cuenta nueva) no puede dejar ese consenso pegado al elegir la UAndes.
  await run("cargarConsenso('fen')");await run("cargarConsenso('uandes')");await run("cargarConsenso('uandes')");
  assert.deepEqual(pedidos,['fen','uandes'],'una lectura por universidad');
  assert.equal(run("consensoCargado('fen')[0].respaldos"),7);
  assert.equal(run("consensoCargado('uandes').length"),3);

  // Buscador: con 5 aparece, diciendo de dónde viene; con 3 no.
  const buscar=q=>run(`searchCatalog(${JSON.stringify(q)},'uandes',null,1)`);
  const cinco=buscar('Taller Sintético Cinco').find(r=>r.nombre==='Taller Sintético Cinco');
  assert.ok(cinco&&cinco.tienePreset&&cinco.consenso===5,'con 5 respaldos se ofrece como pauta del catálogo');
  ctx.__r=cinco;assert.match(run('obCatalogMeta(__r)'),/pauta de 5 estudiantes/);
  assert.ok(!buscar('Taller Sintético Tres').some(r=>r.nombre==='Taller Sintético Tres'),'con 3 no entra al buscador');
  // La de programa manda: no aparece dos veces ni dice "de estudiantes".
  const prog=buscar('Ramo Con Programa').filter(r=>r.nombre==='Ramo Con Programa');
  assert.equal(prog.length,1);assert.equal(prog[0].consenso,undefined,'una pauta de programa manda sobre el consenso');

  // Al agregar: la pauta entra en el mismo momento, marcada como de estudiantes.
  const r=run("crearRamoDesdeCatalogo('Taller Sintético Cinco',null)");
  assert.equal(JSON.stringify(r.categorias.map(c=>[c.nombre,c.peso])),JSON.stringify([['Prueba',60],['Examen',40]]));
  assert.equal(r.consensoRespaldos,5,'la ficha sabe que viene de 5 estudiantes');
  // Con 3 sigue llenando un ramo vacío (la regla de antes), ahora al tiro.
  assert.equal(run("crearRamoDesdeCatalogo('Taller Sintético Tres',null)").consensoRespaldos,3);
  // Y nunca pisa la de programa.
  const p=run("crearRamoDesdeCatalogo('Ramo Con Programa',null)");
  assert.equal(p.consensoRespaldos,undefined);assert.equal(p.categorias[0].nombre,'Solemne única');
  console.log('OK: con 5 respaldos el consenso se ofrece como pauta del catálogo');
})().catch(e=>{console.error(e);process.exitCode=1;});
