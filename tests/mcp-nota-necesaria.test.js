const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');

const root=process.env.GRADEHUB_ROOT||path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(root,f),'utf8');

function cargarEndpoint(estado){
  const llamadas=[];
  const contexto={
    console,Response,structuredClone,
    HERRAMIENTAS:[],NOMBRES:['que_necesito_para_aprobar','simular'],
    validarPropuestaPauta:()=>null,
    fetch:async(url,options)=>{
      llamadas.push({url,options});
      return {ok:true,json:async()=>structuredClone(estado)};
    },
    module:{exports:{}},exports:{},
  };
  vm.createContext(contexto);
  vm.runInContext(leer('engine.js'),contexto,{filename:'engine.js'});
  contexto.motorCompartido={gh_crearCalculoRamo:contexto.module.exports.gh_crearCalculoRamo};
  const endpoint=leer('functions/mcp/[[ruta]].js')
    .replace(/^import .*;\s*$/gm,'')
    .replace(/^export /gm,'');
  vm.runInContext(endpoint+'\n;globalThis.__mcp={onRequestPost};',contexto,{filename:'functions/mcp/[[ruta]].js'});
  return {llamadas,llamar:contexto.__mcp.onRequestPost};
}

const nota=(id,valor,slot)=>({id,nombre:id,valor,peso:1,...(slot===undefined?{}:{slot})});
const categoria=(id,peso,notas=[],extra={})=>({id,nombre:id,peso,notas,directNota:true,...extra});
const ramo=(id,categorias,extra={})=>({id,nombre:id,categorias,gates:[],origen:null,...extra});

async function llamar(estado,name,args){
  const servidor=cargarEndpoint(estado);
  const response=await servidor.llamar({
    params:{ruta:['a'.repeat(64)]},
    request:{json:async()=>({jsonrpc:'2.0',id:8,method:'tools/call',params:{name,arguments:args}})},
  });
  const body=await response.json();
  assert.equal(body.error,undefined,body.error&&body.error.message);
  return {...JSON.parse(body.result.content[0].text),isError:body.result.isError===true};
}

async function ejecutar(estado,args){
  const servidor=cargarEndpoint(estado);
  const token='a'.repeat(64);
  const response=await servidor.llamar({
    params:{ruta:[token]},
    request:{json:async()=>({jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'que_necesito_para_aprobar',arguments:args}})},
  });
  const body=await response.json();
  assert.equal(body.error,undefined,body.error&&body.error.message);
  assert.equal(servidor.llamadas.length,1);
  const rpc=JSON.parse(servidor.llamadas[0].options.body);
  assert.deepEqual(Object.keys(rpc),['p_token']);
  assert.equal(rpc.p_token,token);
  return JSON.parse(body.result.content[0].text);
}

(async()=>{
  const laboratorio=ramo('Laboratorio de Dinámica',[
    categoria('Controles',10,[],{slots:5}),
    categoria('Informes',70,[nota('Informe 0',6.5,0)],{slots:6}),
    categoria('Evaluación de pares',20,[],{slots:6}),
  ],{origen:{tenant:'uc',carrera:'ING-PC',ramoKey:'FIS0154'}});
  const privado=ramo('Ramo que no se pidió',[categoria('Secreto',100,[nota('n-secreta',1.2)])]);
  const calculo=await ejecutar({ramos:[laboratorio,privado]},{ramo:'FIS0154'});
  assert.equal(calculo.ramo,'Laboratorio de Dinámica');
  assert.equal(calculo.meta,4);
  assert.ok(Math.abs(calculo.promedioNecesario-3.61)<0.005,`esperaba 3,61 y llegó ${calculo.promedioNecesario}`);
  assert.equal(calculo.factibleEnEscala,true);
  assert.doesNotMatch(JSON.stringify(calculo),/Ramo que no se pidió|Secreto|1\.2/);

  const conDescarte=ramo('Curso con descarte',[
    categoria('Controles',100,[nota('Control 1',2,0),nota('Control 2',5,1)],{slots:3,dropLowest:{count:1}}),
  ]);
  const descarte=await ejecutar({ramos:[conDescarte]},{ramo:'Curso con descarte',meta:4});
  assert.ok(Math.abs(descarte.promedioNecesario-2.9)<1e-6,'el motor debe considerar el descarte y el redondeo final al proyectar la nota pendiente');

  const laboratorioVinculado=ramo('Laboratorio',[categoria('Final',100,[nota('lab',6)])]);
  const catedra=ramo('Dinámica',[categoria('Cátedra',100,[])],{aporta:{ramo:'Laboratorio',peso:30}});
  const vinculado=await ejecutar({ramos:[catedra,laboratorioVinculado]},{ramo:'Dinámica',meta:4});
  assert.ok(Math.abs(vinculado.promedioNecesario-(21.5/7))<1e-6,'el 30% del ramo vinculado debe entrar al cálculo');

  const conCompuerta=ramo('Curso con compuerta',[
    categoria('Examen',50,[nota('Examen',2)]),categoria('Tareas',50,[]),
  ],{gates:[{type:'min_grade_required',catId:'Examen',min:3,cap:3.9,nombre:'Examen'}]});
  const compuerta=await ejecutar({ramos:[conCompuerta]},{ramo:'Curso con compuerta'});
  assert.equal(compuerta.compuertasIncumplidas.length,1);
  assert.equal(compuerta.compuertasIncumplidas[0].tope,3.9);

  // ── Cuánto necesito en ESTA evaluación, con el resto fijo ──────────────
  // Interrogaciones 50 % con 4,0; laboratorio 20 % y examen 30 % pendientes.
  const curso=(inter,extra={})=>ramo('Curso Sintético',[
    categoria('Interrogaciones',50,[nota('Interrogaciones',inter)]),
    categoria('Laboratorio',20,[]),
    categoria('Examen',30,[]),
  ],extra);
  const examen=await llamar({ramos:[curso(4)]},'que_necesito_para_aprobar',{ramo:'Curso Sintético',evaluacion:'Examen',supuestos:[{evaluacion:'Laboratorio',valor:5}]});
  assert.equal(examen.estado,'alcanzable');
  assert.equal(examen.evaluacion,'Examen');
  assert.ok(examen.notaNecesaria>3&&examen.notaNecesaria<3.3,`con el laboratorio en 5,0 el examen pide cerca de 3,2 y llegó ${examen.notaNecesaria}`);
  assert.equal(examen.alcanzaLaMeta,true);
  assert.deepEqual(examen.supuestos,[{evaluacion:'Laboratorio',valor:5,origen:'supuesto'}]);
  // La respuesta es un mínimo de verdad: simular con esa nota alcanza y con
  // una décima menos ya no.
  const justo=Math.ceil(examen.notaNecesaria*10-1e-9)/10;
  const conJusto=await llamar({ramos:[curso(4)]},'simular',{ramo:'Curso Sintético',notas:[{evaluacion:'Laboratorio',valor:5},{evaluacion:'Examen',valor:justo}]});
  const debajo=await llamar({ramos:[curso(4)]},'simular',{ramo:'Curso Sintético',notas:[{evaluacion:'Laboratorio',valor:5},{evaluacion:'Examen',valor:Math.round((justo-0.1)*10)/10}]});
  assert.equal(conJusto.alcanzaLaMeta,true,'con la nota pedida, simular aprueba');
  assert.equal(debajo.alcanzaLaMeta,false,'con una décima menos, simular no aprueba');
  const repartido=await llamar({ramos:[curso(4)]},'que_necesito_para_aprobar',{ramo:'Curso Sintético'});
  assert.notEqual(repartido.promedioNecesario,examen.notaNecesaria,'sin evaluación sigue repartiendo entre todo lo pendiente');

  const conResto=await llamar({ramos:[curso(4)]},'que_necesito_para_aprobar',{ramo:'Curso Sintético',evaluacion:'examen',resto:5});
  assert.ok(Math.abs(conResto.notaNecesaria-examen.notaNecesaria)<1e-9,'«resto» fija lo demás igual que un supuesto');
  assert.equal(conResto.supuestos[0].origen,'resto');

  const falta=await llamar({ramos:[curso(4)]},'que_necesito_para_aprobar',{ramo:'Curso Sintético',evaluacion:'Examen'});
  assert.equal(falta.isError,true);
  assert.match(falta.error,/falta suponer: Laboratorio/);

  // Topes: la compuerta manda aunque el promedio ya alcance.
  const conMinimo=curso(7,{gates:[{type:'min_grade_required',catId:'Examen',min:3.5,cap:3.9,nombre:'Examen'}]});
  const minimo=await llamar({ramos:[conMinimo]},'que_necesito_para_aprobar',{ramo:'Curso Sintético',evaluacion:'Examen',resto:7});
  // El motor cuenta el mínimo con el redondeo oficial: 3,45 ya es 3,5.
  assert.ok(Math.abs(minimo.notaNecesaria-3.45)<0.01,`la compuerta pide 3,5 (3,45 redondeado) en el examen y llegó ${minimo.notaNecesaria}`);
  assert.equal(minimo.compuertasIncumplidas.length,0);
  assert.equal(minimo.alcanzaLaMeta,true);
  const sinMinimo=await llamar({ramos:[curso(7)]},'que_necesito_para_aprobar',{ramo:'Curso Sintético',evaluacion:'Examen',resto:7});
  assert.equal(sinMinimo.estado,'con_cualquier_nota');
  const imposible=await llamar({ramos:[curso(1)]},'que_necesito_para_aprobar',{ramo:'Curso Sintético',evaluacion:'Examen',resto:1});
  assert.equal(imposible.estado,'fuera_de_escala');
  assert.ok(imposible.notaNecesaria>7);

  // Casillas: la pedida queda libre; las otras pendientes, fijas.
  const controles=ramo('Curso con Controles',[
    categoria('Controles',60,[nota('Control 1',4,0)],{slots:3}),
    categoria('Examen',40,[]),
  ]);
  const c3=await llamar({ramos:[controles]},'que_necesito_para_aprobar',{ramo:'Curso con Controles',evaluacion:'Controles',casilla:3,supuestos:[{evaluacion:'Controles',casilla:2,valor:4},{evaluacion:'Examen',valor:4}]});
  // (4 + 4 + x) / 3 × 0,6 + 4 × 0,4 ≥ 3,95 → x ≥ 3,75.
  assert.ok(Math.abs(c3.notaNecesaria-3.75)<0.01,`el tercer control pide 3,75 y llegó ${c3.notaNecesaria}`);
  assert.deepEqual(c3.casillas,[3]);
  const c1=await llamar({ramos:[controles]},'que_necesito_para_aprobar',{ramo:'Curso con Controles',evaluacion:'Controles',casilla:1,resto:4});
  assert.equal(c1.isError,true);
  assert.match(c1.error,/ya tiene nota/);
  const sobreObjetivo=await llamar({ramos:[controles]},'que_necesito_para_aprobar',{ramo:'Curso con Controles',evaluacion:'Examen',supuestos:[{evaluacion:'Examen',valor:5}],resto:4});
  assert.equal(sobreObjetivo.isError,true);
  assert.match(sobreObjetivo.error,/no puede ser también un supuesto/);
  const sobreRendida=await llamar({ramos:[controles]},'que_necesito_para_aprobar',{ramo:'Curso con Controles',evaluacion:'Examen',supuestos:[{evaluacion:'Controles',casilla:1,valor:5}],resto:4});
  assert.equal(sobreRendida.isError,true);
  assert.match(sobreRendida.error,/ya tiene nota/);
  const casillaRara=await llamar({ramos:[controles]},'que_necesito_para_aprobar',{ramo:'Curso con Controles',evaluacion:'Controles',casilla:7,resto:4});
  assert.equal(casillaRara.isError,true);

  // El laboratorio en otro ramo también queda fijo, y su mínimo manda.
  const lab=ramo('Laboratorio',[categoria('Informe final',100,[])]);
  const catedra2=ramo('Dinámica',[categoria('Interrogaciones',70,[nota('Interrogaciones',4.5)]),categoria('Examen',30,[])],{aporta:{ramo:'Laboratorio',peso:30,min:4}});
  const sinLab=await llamar({ramos:[catedra2,lab]},'que_necesito_para_aprobar',{ramo:'Dinámica',evaluacion:'Examen'});
  assert.equal(sinLab.isError,true);
  assert.match(sinLab.error,/Informe final \(Laboratorio\)/);
  const conLab=await llamar({ramos:[catedra2,lab]},'que_necesito_para_aprobar',{ramo:'Dinámica',evaluacion:'Examen',supuestos:[{evaluacion:'Informe final',valor:5}]});
  assert.equal(conLab.estado,'alcanzable');
  assert.equal(conLab.alcanzaLaMeta,true);
  assert.equal(conLab.supuestos[0].ramo,'Laboratorio');
  const labRojo=await llamar({ramos:[catedra2,lab]},'que_necesito_para_aprobar',{ramo:'Dinámica',evaluacion:'Examen',supuestos:[{evaluacion:'Informe final',valor:3}]});
  assert.equal(labRojo.estado,'fuera_de_escala','con el laboratorio bajo su mínimo no hay examen que salve el ramo');

  console.log('OK: el MCP calcula metas con el motor compartido y solo responde por el estado autorizado');
})().catch(error=>{console.error(error);process.exit(1);});
