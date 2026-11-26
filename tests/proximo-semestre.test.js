// «Arma tu próximo semestre»: aviso de requisitos y horarios. Siglas INVENTADAS
// (TST/QQQ), personas sintéticas y un Supabase de mentira: sin red ni datos
// reales de la oferta.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const elementos={};
function elemento(){return {innerHTML:'',textContent:'',value:'',disabled:false,checked:true,dataset:{},style:{setProperty(){}},
  classList:{add(){},remove(){},contains(){return true}},addEventListener(){},appendChild(){},focus(){},
  setAttribute(){},removeAttribute(){},querySelector(){return null}};}
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>elementos[id]||(elementos[id]=elemento()),querySelector:()=>elemento(),querySelectorAll:()=>[],
    createElement:elemento,addEventListener(){},documentElement:elemento(),body:elemento(),head:{appendChild(){}}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},
  location:{origin:'https://gradehub.cl',pathname:'/',search:'',hash:''},history:{replaceState(){}},
  setTimeout,clearTimeout,requestAnimationFrame(){return 1},cancelAnimationFrame(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.join(raiz,f),'utf8'),ctx,{filename:f});
const toasts=[];
for(const f of ['closeModal','openModal'])if(typeof ctx[f]!=='function')ctx[f]=()=>{};
ctx.showToast=m=>toasts.push(m);
ctx.track=()=>{};
const run=c=>vm.runInContext(c,ctx);
const plano=v=>JSON.parse(JSON.stringify(v));
const pausa=()=>new Promise(r=>setTimeout(r,0));
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

(async()=>{
console.log('\nPeríodo siguiente');
chk('2026-2 → 2027-1',run("periodoSiguiente('2026-2')")==='2027-1');
chk('2027-1 → 2027-2',run("periodoSiguiente('2027-1')")==='2027-2');
chk('fuera de forma: null',run("periodoSiguiente('2027-3')")===null&&run('periodoSiguiente(null)')===null);

console.log('\nQué se le dice por cada estado');
{
  const aviso=ev=>plano(ctx.proximoAvisoRequisito(ev));
  const base={faltan:[],cursando:[],otrasOpciones:false,restriccion:null,texto:'TST1001'};
  chk('cumple: verde',aviso({...base,estado:'cumple'}).tono==='ok');
  const si=aviso({...base,estado:'si_apruebas',cursando:['TST1001','TST1002']});
  chk('si apruebas: amarillo y nombra lo que cursa',si.tono==='borde'&&si.titulo==='Cumples si apruebas TST1001 y TST1002');
  const falta=aviso({...base,estado:'falta',faltan:[{sigla:'TST1001',co:false},{sigla:'QQQ0001',co:true}],otrasOpciones:true});
  chk('falta: rojo y dice qué falta',falta.tono==='falta'&&falta.titulo==='Te falta TST1001 y QQQ0001 (puede ser en paralelo)');
  chk('falta con otras opciones: lo dice',/otras combinaciones/.test(falta.detalle));
  const conRestriccionO=aviso({...base,estado:'falta',faltan:[{sigla:'TST1001',co:false}],restriccion:{texto:'(Programa=Carrera Inventada)',relacion:'o'}});
  chk('falta pero la restricción «o» puede reemplazar: no rojo',conRestriccionO.tono==='borde'&&/O bien cumplir/.test(conRestriccionO.restriccion));
  chk('restricción «y»: además',/^Además pide/.test(aviso({...base,estado:'cumple',restriccion:{texto:'(Créditos>=100)',relacion:'y'}}).restriccion));
  const sinHist=aviso({...base,estado:'sin_historial'});
  chk('sin historial: no dice «te falta», pide cargar semestres',sinHist.tono==='neutro'&&sinHist.accion==='ficha'&&!/falta/i.test(sinHist.titulo));
  chk('ilegible y sin datos no se tiñen',aviso({...base,estado:'ilegible'}).tono==='neutro'&&aviso({...base,estado:'sin_datos'}).tono==='neutro');
}

console.log('\nBuscar ramos');
{
  run("S={...S,tenant:'uc',userName:'Persona Sintética',carrera:null,careerSemestre:3,ramos:[],historial:[]}");
  const r=plano(ctx.proximoResultados('tst2001',ctx.S,[]));
  chk('una sigla escrita se ofrece aunque no esté en la app',r[0]&&r[0].sigla==='TST2001'&&r[0].nombre==='');
  chk('una sigla ya elegida no se repite',!plano(ctx.proximoResultados('TST2001',ctx.S,['TST2001'])).some(x=>x.sigla==='TST2001'));
  chk('texto vacío: nada',plano(ctx.proximoResultados('  ',ctx.S,[])).length===0);
  chk('el nombre pierde la sigla de desambiguación',run("proximoNombreLimpio('Álgebra (TST1289)')")==='Álgebra');
}

console.log('\nSugeridos de la malla');
{
  // Busca una carrera UC real con siglas en su 2° semestre; los ramos son del
  // catálogo público, no de una persona.
  const carrera=run(`Object.keys(mallaFor('uc')).find(c=>((mallaFor('uc')[c]||{})[2]||[]).filter(n=>siglaCatalogoUC(n)).length>=2)`);
  run(`S={...S,tenant:'uc',carrera:${JSON.stringify(carrera)},careerSemestre:1,ramos:[],historial:[]}`);
  const todos=plano(ctx.proximoSugeridos(ctx.S));
  chk('trae ramos del semestre siguiente con sigla',todos.length>=2&&todos.every(x=>/^[A-Z]{2,4}\d{3,4}[A-Z]?$/.test(x.sigla)));
  const primera=todos[0].sigla;
  ctx.__cursando=[{id:'c1',nombre:'Ramo actual',sigla:primera,categorias:[],origen:{tenant:'uc'}}];
  run('S={...S,ramos:__cursando}');
  chk('lo que ya cursa no se sugiere',!plano(ctx.proximoSugeridos(ctx.S)).some(x=>x.sigla===primera));
  chk('lo ya elegido no se sugiere',!plano(ctx.proximoSugeridos({...ctx.S,ramos:[]},[todos[1].sigla])).some(x=>x.sigla===todos[1].sigla));
  chk('sin carrera: nada',plano(ctx.proximoSugeridos({...ctx.S,carrera:null})).length===0);
}

console.log('\nPantalla con Supabase de mentira');
{
  const periodo=run('proximoPeriodo()');
  const req={
    TST2001:{sigla:'TST2001',prerrequisitos:'TST1001 y TST1002',relacion:null,restricciones:null,equivalencias:null},
    TST2002:{sigla:'TST2002',prerrequisitos:'QQQ1000',relacion:null,restricciones:null,equivalencias:null},
    QQQ1000:{sigla:'QQQ1000',prerrequisitos:null,relacion:null,restricciones:null,equivalencias:'(QQQ0999)'},
  };
  let nrc=5000;
  const sec=(sigla,seccion,horario)=>({periodo,nrc:++nrc,sigla,seccion,nombre:'Ramo '+sigla,profesores:['Docente Ficticio'],horario,vigente:true});
  const b=(dias,modulo,tipo='CLAS')=>({dias,modulo,tipo,sala:'SIN SALA'});
  let oferta={
    TST2001:[sec('TST2001',1,[b(['L','W'],2)]),sec('TST2001',2,[b(['M','J'],2)])],
    TST2002:[sec('TST2002',1,[b(['L','W'],2)]),sec('TST2002',2,[b(['L','W'],3),b(['V'],1,'AYU')])],
  };
  const pedidos={req:[],rpc:[]};
  ctx.supabaseClient={
    from:tabla=>({select:()=>({in:(col,lista)=>{pedidos.req.push(lista.slice());return Promise.resolve({data:lista.map(s=>req[s]).filter(Boolean),error:null});}})}),
    rpc:(fn,args)=>{pedidos.rpc.push(args);return Promise.resolve({data:args.p_periodo===periodo?(oferta[args.p_sigla]||[]):[],error:null});},
  };
  const ramo=(sigla,nota)=>({id:'r'+sigla,nombre:'Ramo '+sigla,sigla,creditos:10,avgOverride:nota,categorias:[],origen:{manual:true}});
  ctx.__h=[{id:'h1',label:'2026-1',ramos:[ramo('TST1001',5.5),ramo('QQQ0999',4.2)]}];
  ctx.__r=[{...ramo('TST1002',null),origen:{tenant:'uc'}}];
  run("S={...S,tenant:'uc',userName:'Persona Sintética',carrera:null,careerSemestre:4,historial:__h,ramos:__r}");

  run('abrirProximoSemestre()');
  chk('fuera de la app no se abre',elementos['modal-content']===undefined||!/próximo semestre/.test(elementos['modal-content'].innerHTML));
  ctx.window.Capacitor={isNativePlatform:()=>true};
  run('abrirProximoSemestre()');
  chk('en la app se abre con el período siguiente',/Arma tu próximo semestre/.test(elementos['modal-content'].innerHTML)&&elementos['modal-content'].innerHTML.includes(periodo));
  chk('sin ramos no se puede pedir horarios',elementos['px-ver-horarios'].disabled===true);

  run("proximoAgregar('TST2001','Ramo Uno')");
  chk('mientras carga lo dice',/Revisando prerrequisitos/.test(elementos['px-ramos'].innerHTML));
  await pausa();await pausa();await pausa();
  chk('si cursa lo que falta: «cumples si apruebas»',/Cumples si apruebas TST1002/.test(elementos['px-ramos'].innerHTML));
  run("proximoAgregar('TST2002','Ramo Dos')");
  await pausa();await pausa();await pausa();
  chk('una equivalencia aprobada cuenta como el requisito',/TST2002[\s\S]*Cumples los prerrequisitos/.test(elementos['px-ramos'].innerHTML));
  chk('pidió también las siglas citadas en los requisitos',pedidos.req.some(l=>l.includes('QQQ1000')));
  chk('no vuelve a pedir lo que ya tiene',pedidos.req.flat().filter(s=>s==='TST2001').length===1);
  chk('con ramos ya se puede pedir horarios',elementos['px-ver-horarios'].disabled===false);
  run("proximoAgregar('TST2001','Ramo Uno')");
  chk('no se agrega dos veces',run('_proximo.ramos.length')===2);

  run('proximoVerHorarios()');
  await pausa();await pausa();await pausa();
  const html=elementos['px-horarios'].innerHTML;
  chk('pidió la oferta del período siguiente, por sigla',pedidos.rpc.length===2&&pedidos.rpc.every(a=>a.p_periodo===periodo));
  chk('propone combinaciones sin topes',/Opción 1/.test(html)&&/<table class="px-grilla"/.test(html));
  chk('la mejor junta todo en lunes y miércoles: 2 días',/Opción 1<span class="px-resumen px-num">2 días · 0 ventanas/.test(html));
  chk('muestra NRC para inscribir',/NRC 50\d\d/.test(html));
  const res=plano(run('proximoResultadoActual().resultado'));
  chk('ninguna combinación con tope de cátedra',res.combinaciones.every(c=>!c.avisos.some(a=>a.tipo==='tope')));
  run("proximoAlternarDia('M',null)");
  const conLibre=plano(run('proximoResultadoActual().resultado'));
  chk('con martes libre, TST2001 va lunes y miércoles',conLibre.combinaciones.every(c=>c.ramos.find(r=>r.sigla==='TST2001').secciones[0].seccion===1));
  run("proximoAlternarDia('M',null)");

  ctx.navigator.clipboard={writeText:async t=>{ctx.__copiado=t;}};
  await run('proximoCopiarNRC(0)');
  chk('copia un NRC por ramo',/^TST2001 NRC \d+\nTST2002 NRC \d+$/.test(ctx.__copiado)&&toasts.includes('NRC copiados'));

  // Una opción a la vez, con «Opción N de M» y flechas.
  const totalOpciones=run('proximoResultadoActual().resultado.combinaciones.length');
  chk('muestra solo una opción por pantalla',(html.match(/<section class="px-opcion"/g)||[]).length===1);
  if(totalOpciones>1){
    chk('dice cuántas opciones hay',new RegExp('Opción 1 de '+totalOpciones).test(html));
    run('proximoElegirOpcion(1)');
    chk('la flecha pasa a la opción 2',/Opción 2 de /.test(elementos['px-horarios'].innerHTML)&&run('_proximo.opcion')===1);
    run('proximoElegirOpcion(99)');
    chk('no se pasa de la última',run('_proximo.opcion')===1);
    run("proximoToqueInicio({changedTouches:[{clientX:300,clientY:100}]});proximoToqueFin({changedTouches:[{clientX:120,clientY:110}]})");
    chk('deslizar a la izquierda avanza',run('_proximo.opcion')===Math.min(2,totalOpciones-1));
    run("proximoToqueInicio({changedTouches:[{clientX:100,clientY:100}]});proximoToqueFin({changedTouches:[{clientX:130,clientY:300}]})");
    chk('un gesto vertical no cambia de opción',run('_proximo.opcion')===Math.min(2,totalOpciones-1));
    run("proximoAlternarDia('M',null);proximoAlternarDia('M',null)");
    chk('cambiar el día libre vuelve a la primera opción',run('_proximo.opcion')===0);
  }

  // Compartir: sin hoja de compartir, copia el horario en texto.
  await run('proximoCompartirHorario(0)');
  chk('compartir sin hoja copia el horario con días y NRC',/^Mi horario /.test(ctx.__copiado)&&/Lunes: TST/.test(ctx.__copiado)&&/NRC \d+/.test(ctx.__copiado)&&toasts.includes('Horario copiado'));
  ctx.navigator.share=async d=>{ctx.__compartido=d;};
  await run('proximoCompartirHorario(0)');
  chk('con hoja de compartir manda el texto',ctx.__compartido&&/^Mi horario /.test(ctx.__compartido.text));
  delete ctx.navigator.share;

  // Oferta todavía sin publicar.
  oferta={};
  run("_proximo.secciones.clear();_proximo.ramos=[{sigla:'TST2001',nombre:''}]");
  run('proximoVerHorarios()');
  await pausa();await pausa();await pausa();
  chk('sin oferta: lo dice, no inventa horarios',/todavía no publica la oferta/.test(elementos['px-horarios'].innerHTML)&&!/Opción/.test(elementos['px-horarios'].innerHTML));

  // Falla de red.
  ctx.supabaseClient.rpc=()=>Promise.resolve({data:null,error:{code:'500'}});
  run("_proximo.secciones.clear()");
  run('proximoVerHorarios()');
  await pausa();await pausa();await pausa();
  chk('error de red: ofrece reintentar',/Reintentar/.test(elementos['px-horarios'].innerHTML));

  // Un fallo de prerrequisitos conserva el error hasta que se pida reintentar.
  const fromOriginal=ctx.supabaseClient.from;
  let intentosReq=0,resolverReqAnterior;
  ctx.supabaseClient.from=()=>({select:()=>({in:()=>{
    intentosReq++;
    return intentosReq===1?Promise.resolve({error:{code:'500'}}):new Promise(r=>{resolverReqAnterior=r;});
  }})});
  run("abrirProximoSemestre(true);_proximo.requisitos.clear();_proximo.estadoReq='listo';");
  run("proximoAgregar('TST2002','Ramo Dos')");
  await pausa();
  chk('un fallo se muestra sin reintentos automáticos',intentosReq===1&&/Reintentar/.test(elementos['px-ramos'].innerHTML));
  if(resolverReqAnterior)resolverReqAnterior({data:[],error:null});
  await pausa();
  ctx.supabaseClient.from=fromOriginal;
  await run('proximoActualizarRequisitos()');
  chk('reintentar recupera el aviso de equivalencia',/TST2002[\s\S]*Cumples los prerrequisitos/.test(elementos['px-ramos'].innerHTML));

  // Con una respuesta pendiente, cambiar el día no adelanta el estado final.
  let resolverOferta;
  ctx.supabaseClient.rpc=()=>new Promise(r=>{resolverOferta=r;});
  run("_proximo.ramos=[{sigla:'TST3001',nombre:''}];");
  run('proximoVerHorarios()');
  run("proximoAlternarDia('L',null)");
  chk('sigue mostrando carga al marcar día libre',/Buscando secciones/.test(elementos['px-horarios'].innerHTML));
  resolverOferta({data:[],error:null});
  await pausa();
  chk('el mensaje de oferta vacía aparece solo después de la respuesta',/todavía no publica/.test(elementos['px-horarios'].innerHTML));

  await pausa();
  let resolverRequisitos;
  ctx.supabaseClient.from=()=>({select:()=>({in:()=>new Promise(r=>{resolverRequisitos=r;})})});
  run("abrirProximoSemestre(true);proximoAgregar('TST4001','Ramo anterior')");
  // Otra cuenta en el mismo teléfono no ve lo elegido.
  ctx.currentUser={id:'otra-cuenta-sintetica'};
  run('abrirProximoSemestre()');
  chk('al cambiar de cuenta se olvida lo elegido',run('_proximo.ramos.length')===0);
  resolverRequisitos({data:[],error:null});
  await pausa();
  chk('una consulta anterior no modifica el plan de la otra cuenta',run('_proximo.requisitos.size===0&&_proximo.estadoReq==="listo"'));

  run("S={...S,tenant:'fen'}");
  ctx.currentUser={id:'tercera-cuenta'};
  elementos['modal-content'].innerHTML='';
  run('abrirProximoSemestre()');
  chk('otra universidad: no se abre',elementos['modal-content'].innerHTML==='');
  chk('ni aparece en las herramientas',!plano(run('herramientasInicioDisponibles()')).some(([c])=>c==='proximo'));
  run("S={...S,tenant:'uc'}");
  chk('en la UC aparece en las herramientas',plano(run('herramientasInicioDisponibles()')).some(([c])=>c==='proximo'));
  delete ctx.window.Capacitor;
}

console.log('\nNo toca lo guardado');
{
  const fuente=fs.readFileSync(path.join(raiz,'src/app/proximo-semestre.js'),'utf8');
  chk('no escribe en localStorage ni sincroniza',!/localStorage|syncToCloud|saveState|persist\(/.test(fuente));
  chk('no inserta ni actualiza en Supabase',!/\.from\([^)]*\)[\s\S]{0,40}\.(insert|update|upsert|delete)\(/.test(fuente)&&(fuente.match(/\.from\(/g)||[]).length===1);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
})();
