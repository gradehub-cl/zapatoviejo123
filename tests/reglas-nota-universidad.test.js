const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
const root=process.env.GRADEHUB_ROOT||(process.env.GRADEHUB_APP?path.dirname(process.env.GRADEHUB_APP):path.join(__dirname,'..'));
function sandbox(){
  const store=new Map(),elements=new Map();
  const element=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return null},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
  const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,addEventListener(){},documentElement:element(),body:element(),querySelector(){return null},querySelectorAll(){return []}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
  vm.createContext(ctx);
  for(const f of ['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});
  ctx.run=s=>vm.runInContext(s,ctx);return ctx;
}
const note=(id,valor,slot)=>({id,nombre:id,valor,peso:1,...(slot===undefined?{}:{slot})});
const cat=(id,peso,notas=[],extra={})=>({id,nombre:id,peso,notas,directNota:true,...extra});
const course=(id,categorias,extra={})=>({id,nombre:id,categorias,creditos:10,origen:null,gates:[],...extra});

function servidor(r,tenant){
  const estado={ramos:[r],tenant},ctx={console,Response,module:{exports:{}},HERRAMIENTAS:[],NOMBRES:['que_necesito_para_aprobar','simular'],fetch:async()=>({ok:true,json:async()=>structuredClone(estado)})};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/engine.js','utf8'),ctx);ctx.motorCompartido=ctx.module.exports;
  vm.runInContext(fs.readFileSync(root+'/functions/mcp/[[ruta]].js','utf8').replace(/^import .*;\s*$/gm,'').replace(/^export /gm,''),ctx);
  return async(name,args)=>{const response=await ctx.onRequestPost({params:{ruta:['a'.repeat(64)]},request:{json:async()=>({id:1,method:'tools/call',params:{name,arguments:args}})}});const body=await response.json();assert.equal(body.error,undefined);return JSON.parse(body.result.content[0].text);};
}

// Cada universidad declara cómo su promedio se vuelve nota oficial
// (GH_REGLAS_NOTA_POR_TENANT en engine.js). La UAndes aproxima a dos decimales
// y después a uno (Reglamento del Alumno, art. 22): 3,946 → 3,95 → 4,0.
// Las demás siguen con la regla común: a la décima.
//
// El caso es la estructura real de Salud en la UAndes: presentación 70% y
// examen 30%. Presentación 3,7 · 4,2 · 4,0 y examen 3,9 dan 3,94667.
(async()=>{
  const motor=require(root+'/engine.js');
  for(const t of [undefined,null,'fen','uc','uai','toString'])
    assert.deepEqual(motor.gh_reglasNota(t),{grade_scale:{min:1,max:7},rounding:{decimals:1},passing_grade:4},'sin regla propia: la común ('+t+')');
  assert.deepEqual(motor.gh_reglasNota('uandes').rounding,{decimals:1,previo:2});

  const ua=motor.gh_reglasNota('uandes'),comun=motor.gh_reglasNota('uc');
  for(const [bruto,enUA,enComun] of [[3.94667,4.0,3.9],[3.945,4.0,3.9],[3.9449,3.9,3.9],[3.95,4.0,4.0],[3.9499999999999993,4.0,4.0],[6.9451,7.0,6.9],[1.04,1.0,1.0]]){
    assert.equal(motor.gh_notaOficial(bruto,ua),enUA,`UAndes ${bruto}`);
    assert.equal(motor.gh_notaOficial(bruto,comun),enComun,`común ${bruto}`);
  }

  const cerrado=()=>course('Kinesiología sintética',[cat('Presentación',70,[note('p1',3.7),note('p2',4.2),note('p3',4.0)]),cat('Examen',30,[note('ex',3.9)])]);
  const pendiente=()=>course('Kinesiología sintética',[cat('Presentación',70,[note('p1',3.7),note('p2',4.2),note('p3',4.0)]),cat('Examen',30,[])]);
  for(const [tenant,final,aprueba,necesita] of [['uandes',4.0,true,'3.9'],['uc',3.9,false,'4.0'],['fen',3.9,false,'4.0']]){
    const app=sandbox();app.run(`S.tenant=${JSON.stringify(tenant)}`);
    app.r=cerrado();app.run('S.ramos=[r]');
    assert.equal(app.run('notaFinalOficial(ramoAvg(r))'),final,`${tenant}: nota oficial`);
    assert.equal(app.run('fmtPromedio(ramoAvg(r))'),final.toFixed(1),`${tenant}: lo que se ve`);
    assert.equal(app.run('notaAprobadaRamo(r,ramoAvg(r))'),aprueba,`${tenant}: semáforo`);
    // La pregunta que la app existe para responder.
    app.r=pendiente();app.run('S.ramos=[r]');
    assert.equal(app.run('nfNecesaria(notaNecesaria(r,4))'),necesita,`${tenant}: nota necesaria en el examen`);

    // El agente conectado responde lo mismo que la app.
    const llamar=servidor(pendiente(),tenant);
    const r=await llamar('que_necesito_para_aprobar',{ramo:'Kinesiología sintética',meta:4});
    assert.equal(app.run('nfNecesaria('+r.promedioNecesario+')'),necesita,`${tenant}: MCP pide lo mismo`);
    const sim=await llamar('simular',{ramo:'Kinesiología sintética',meta:4,notas:[{evaluacion:'Examen',valor:3.9}]});
    assert.equal(sim.alcanzaLaMeta,aprueba,`${tenant}: MCP aprueba igual que la app`);
  }
  // Sin tenant en el estado, el MCP cae en la regla común, igual que antes.
  const sinTenant=await servidor(cerrado(),undefined)('simular',{ramo:'Kinesiología sintética',meta:4,notas:[{evaluacion:'Examen',valor:3.9}]});
  assert.equal(sinTenant.alcanzaLaMeta,false);
  console.log('OK: cada universidad redondea su nota oficial con su propia regla');
})().catch(e=>{console.error(e);process.exitCode=1;});
