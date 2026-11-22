// Una distribución (mismos pesos, nombres parecidos) se carga sola en un ramo
// vacío con los mismos umbrales que el consenso: 3+ personas y 60% o más.
// Pasó de verdad (2026-11-21): en Pensamiento Crítico II 19 de 19 daban los
// mismos pesos con nombres escritos distinto y el consenso exacto no se formaba.
// Ramos y pautas sintéticos.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const el={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return true;}},
  appendChild(){},addEventListener(){},setAttribute(){},removeAttribute(){},querySelector(){return null;},querySelectorAll(){return [];}};
const ctx=vm.createContext({console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}})},
  document:{createElement:()=>el,querySelector(){return null;},addEventListener(){},getElementById:()=>el,documentElement:el,body:el},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout(){},clearTimeout(){}});
for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
let ok=0;
const chk=(nombre,fn)=>{fn();ok++;console.log('  OK   '+nombre);};
run("coordinacionRamo=()=>({coordinado:true,fuente:'malla'})");
run("S.tenant='fen';S.onboardingDone=true;currentUser={id:'sintetica'};currentRamoId='r';save=()=>{};renderRamo=()=>{};track=(e)=>{globalThis.__eventos=[...(globalThis.__eventos||[]),e];}");
const S=run('S');
const huella=run('huellaEstructura');
const vacio=()=>({id:'r',nombre:'Ramo sintético',periodo:'2026-2',categorias:[],gates:[]});
// Mismos pesos, nombres escritos de tres maneras: tres huellas distintas.
const a=[{nombre:'Act. Semanal',peso:20},{nombre:'Prueba',peso:40},{nombre:'Examen',peso:40}];
const b=[{nombre:'Actividad semanal',peso:20},{nombre:'Prueba',peso:40},{nombre:'Examen',peso:40}];
const c=[{nombre:'Act Semana',peso:20},{nombre:'Pruebas',peso:40},{nombre:'Examen',peso:40}];
const otra=[{nombre:'Proyecto',peso:50},{nombre:'Examen',peso:50}];
const otra2=[{nombre:'Trabajo',peso:30},{nombre:'Examen',peso:70}];
const fila=(est,respaldos=1)=>({estructura:est,huella:huella(est),respaldos,seccion:null,profe:null,profesor:null,mio:false});
const dists=filas=>run('agruparDistribuciones')(filas,null);
const total=filas=>filas.reduce((s,f)=>s+f.respaldos,0);
const auto=(filas,r=vacio())=>run('distribucionAutomatica')(dists(filas),total(filas),r);

console.log('\n=== Cuándo se carga sola ===');
chk('las tres maneras de escribirla son pautas distintas para el consenso exacto',()=>{
  assert.equal(new Set([a,b,c].map(e=>huella(e))).size,3);
});
chk('3 de 3 con los mismos pesos: se carga',()=>{
  const o=auto([fila(a),fila(b),fila(c)]);
  assert.ok(o);assert.equal(o.respaldos,3);
  assert.equal(JSON.stringify(o.estructura.map(e=>e.peso).sort()),'[20,40,40]');
});
chk('3 de 5 (60% justo): se carga',()=>{assert.ok(auto([fila(a),fila(b),fila(c),fila(otra),fila(otra2)]));});
chk('3 de 6 (50%): no',()=>{assert.equal(auto([fila(a),fila(b),fila(c),fila(otra),fila(otra2),fila([{nombre:'Informe',peso:45},{nombre:'Examen',peso:55}])]),null);});
chk('2 de 2: no, hacen falta tres',()=>{assert.equal(auto([fila(a),fila(b)]),null);});
chk('empate 3 y 3: no',()=>{assert.equal(auto([fila(a),fila(b),fila(c),fila(otra,3)]),null);});
chk('quien dijo «Ahora no» a ese respaldo no la recibe sola',()=>{
  const r=vacio();r.pautaSugerida={descartada:3};
  assert.equal(auto([fila(a),fila(b),fila(c)],r),null);
  r.pautaSugerida={descartada:2};
  assert.ok(auto([fila(a),fila(b),fila(c)],r),'con más respaldo que el descartado, sí');
});
chk('en un ramo no coordinado: no',()=>{
  run("coordinacionRamo=()=>({coordinado:false,fuente:'malla'})");
  try{assert.equal(auto([fila(a),fila(b),fila(c)]),null);}
  finally{run("coordinacionRamo=()=>({coordinado:true,fuente:'malla'})");}
});
chk('si no se sabe si es coordinado: no',()=>{
  run('coordinacionRamo=()=>null');
  try{assert.equal(auto([fila(a),fila(b),fila(c)]),null);}
  finally{run("coordinacionRamo=()=>({coordinado:true,fuente:'malla'})");}
});
chk('una pauta que no suma 100 no se carga',()=>{
  const mala=e=>e.map(x=>x.nombre==='Examen'?{...x,peso:30}:x);
  assert.equal(auto([fila(mala(a)),fila(mala(b)),fila(mala(c))]),null);
});

console.log('\n=== En la ficha ===');
const rpc=filas=>async(nombre)=>nombre==='pautas_sugeridas'?{data:filas}:nombre==='pauta_sugerida'?{data:filas}:{data:[]};
const pintar=async(r,filas,{completas=true}={})=>{
  ctx.__rpc=completas?rpc(filas):async n=>n==='pautas_sugeridas'?{error:{code:'PGRST202'}}:rpc(filas)(n);
  run('supabaseClient={rpc:(...x)=>__rpc(...x)};_consensoPorTenant.clear()');
  S.ramos=[r];
  const boton={addEventListener(){},disabled:false};
  const zona={style:{},innerHTML:'',className:'',querySelector:s=>s.includes('agregar-seccion')?null:boton,querySelectorAll:()=>[]};
  await run('pintarPautaSugerida')(r,zona);
  return zona;
};
(async()=>{
  await (async()=>{
    const r=vacio();
    await pintar(r,[fila(a,2),fila(b),fila(c)]);
    assert.equal(r.categorias.length,3,'el ramo vacío recibe la pauta');
    assert.equal(r.pautaSugerida?.aceptada?.respaldos,4,'queda como sugerencia aceptada, con su respaldo');
    assert.equal(r.consensoRespaldos,undefined,'no se presenta como consenso exacto');
    assert.equal(run('pautaPropiaParaConsenso')(r),false,'no se reenvía como voto propio');
    assert.equal(JSON.stringify(r.categorias.map(c=>c.peso).sort()),'[20,40,40]');
    assert.ok(r.categorias.some(c=>c.nombre==='Act. Semanal'),'el nombre más repetido');
    assert.ok(run('__eventos').includes('pauta_sugerida_automatica'));
    ok++;console.log('  OK   un ramo vacío coordinado la recibe al abrir la ficha');
  })();
  await (async()=>{
    const r=vacio();
    r.categorias=[{id:'x',nombre:'Lo que escribí',peso:100,directNota:true,notas:[{id:'n',valor:5,peso:1}]}];
    await pintar(r,[fila(a),fila(b),fila(c)]);
    assert.equal(r.categorias.length,1);assert.equal(r.categorias[0].nombre,'Lo que escribí');
    ok++;console.log('  OK   un ramo con algo escrito no se toca');
  })();
  await (async()=>{
    const r=vacio();
    const zona=await pintar(r,[fila(a),fila(b),fila(c)],{completas:false});
    assert.equal(r.categorias.length,0,'sin saber cuántos reportaron, no se carga sola');
    assert.notEqual(zona.innerHTML,'','y se sigue ofreciendo con un toque');
    ok++;console.log('  OK   con la RPC anterior (sin el total) solo se sugiere');
  })();
  await (async()=>{
    const r=vacio();
    const zona=await pintar(r,[fila(a),fila(b)]);
    assert.equal(r.categorias.length,0);
    assert.notEqual(zona.innerHTML,'','con dos se sigue sugiriendo');
    ok++;console.log('  OK   con menos de tres, la sugerencia de siempre');
  })();
  await (async()=>{
    const r=vacio();
    ctx.programaSintetico={evals:[['Proyecto',60],['Examen',40]]};
    run("PRESETS_POR_TENANT.fen['Ramo sintético']=programaSintetico");
    try{
      await pintar(r,[fila(a),fila(b),fila(c)]);
      assert.equal(r.categorias.length,0,'el programa oficial manda');
    }finally{run("delete PRESETS_POR_TENANT.fen['Ramo sintético']");}
    ok++;console.log('  OK   con programa oficial no se carga');
  })();
  console.log(`\nPASS: ${ok}   FAIL: 0`);
})().catch(e=>{console.error(e);process.exit(1);});
