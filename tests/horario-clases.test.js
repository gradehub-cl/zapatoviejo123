// Horario de clases: opcional por ramo, se edita en la ficha, se ve como
// semana en la Agenda y se puede leer de un pantallazo de Mi UC. No toca ningún
// promedio, y las cuentas anteriores (sin horario) cargan igual. Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function elemento(){let html='';const n={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},children:[],value:'',checked:false,textContent:'',dataset:{},hidden:false,className:'',
 addEventListener(){},appendChild(h){this.children.push(h);return h},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return n},querySelectorAll(){return[]},focus(){},select(){},remove(){},click(){},
 insertAdjacentHTML(pos,h){html=pos==='afterbegin'?String(h)+html:html+String(h);}};
 Object.defineProperty(n,'innerHTML',{get(){return html},set(v){html=String(v);this.children=[]}});return n;}

const ids={};const porId=id=>ids[id]||(ids[id]=elemento());
let checks={};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:porId,createElement:elemento,addEventListener(){},documentElement:elemento(),querySelector:()=>elemento(),querySelectorAll:sel=>checks[sel]||[],body:elemento(),head:{appendChild(){}}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout,console,URL};
vm.createContext(ctx);
vm.runInContext(['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'].map(leer).join('\n'),ctx);
const run=c=>vm.runInContext(c,ctx);
run(`globalThis.__guardados=0;save=function(){__guardados++};track=function(){};closeModal=function(){};openModal=function(){};showToast=function(){};renderHome=function(){};`);

const RAMO={id:'r1',nombre:'Cálculo Sintético',color:'#7F77DD',categorias:[{id:'c1',nombre:'Prueba',peso:100,notas:[{id:'n1',valor:5.5}]}],gates:[]};
const json=x=>JSON.stringify(x);

console.log('=== Cuentas anteriores y lo que se guarda ===');
let d=run(`normalize({ramos:[${json(RAMO)}]})`);
chk('un ramo sin horario queda con []',Array.isArray(d.ramos[0].horario)&&d.ramos[0].horario.length===0);
chk('y su promedio no cambia',run(`ramoAvg(${json(d.ramos[0])})`)===5.5);
const norm=h=>run(`normalize({ramos:[${json({...RAMO,horario:h})}]})`).ramos[0].horario;
chk('un bloque válido se conserva tal cual',json(norm([{dia:1,inicio:'08:20',fin:'09:30',sala:'B12',tipo:'catedra'}]))==='[{"dia":1,"inicio":"08:20","fin":"09:30","sala":"B12","tipo":"catedra"}]');
chk('lo inválido se descarta, no se corrige',norm([{dia:0,inicio:'08:20',fin:'09:30'},{dia:2,inicio:'8:20',fin:'09:30'},{dia:3,inicio:'10:00',fin:'09:00'},{dia:7,inicio:'08:20',fin:'09:30'},'x',null]).length===0);
chk('un tipo desconocido queda sin tipo y la sala vacía, sin sala',json(norm([{dia:2,inicio:'09:40',fin:'10:50',sala:'  ',tipo:'clase'}]))==='[{"dia":2,"inicio":"09:40","fin":"10:50","sala":null,"tipo":null}]');
chk('duplicados fuera y ordenado por día y hora',json(norm([{dia:3,inicio:'08:20',fin:'09:30'},{dia:1,inicio:'11:00',fin:'12:10'},{dia:1,inicio:'08:20',fin:'09:30'},{dia:1,inicio:'08:20',fin:'09:30'}]).map(b=>b.dia+b.inicio))==='["108:20","111:00","308:20"]');
chk('algo que no es lista es []',norm('lunes').length===0&&norm({dia:1}).length===0);
chk('con horario el promedio es el mismo',run(`ramoAvg(normalize({ramos:[${json({...RAMO,horario:[{dia:1,inicio:'08:20',fin:'09:30'}]})}]}).ramos[0])`)===5.5);

console.log('\n=== Sincronizar no lo pierde ===');
const base={ramos:[{...RAMO}]};
const local={ramos:[{...RAMO,horario:[{dia:1,inicio:'08:20',fin:'09:30',sala:null,tipo:null}]}]};
const nube={ramos:[{...RAMO,nombre:'Cálculo Sintético II'}]};
const fusion=run(`fusionarSync(${json(base)},${json(local)},${json(nube)})`);
chk('el horario de este dispositivo y el cambio de otro se juntan',fusion.ramos[0].horario.length===1&&fusion.ramos[0].nombre==='Cálculo Sintético II');
const viejo=run(`fusionarSync(${json(local)},${json(local)},${json({ramos:[{...local.ramos[0],categorias:[]}]})})`);
chk('un dispositivo que no conoce el campo no lo borra',viejo.ramos[0].horario.length===1);

console.log('\n=== Editar clases en la ficha ===');
run(`S={ramos:[normalize({ramos:[${json(RAMO)}]}).ramos[0]],userName:'',careerSemestre:1,carrera:null,tenant:'uc',onboardingDone:true,historial:[],sortMode:'manual'};currentRamoId='r1';renderRamo=function(){};renderAgenda=function(){};__guardados=0;`);
run('abrirClasesRamo()');
const hoja=()=>porId('modal-content').innerHTML;
chk('la hoja ofrece días y módulos UC, no horas sueltas',/aria-label="Lunes"/.test(hoja())&&/Módulo 8/.test(hoja())&&!/id="m-clase-inicio"/.test(hoja()));
chk('en la UC el miércoles es W',/>W</.test(hoja()));
run('alternarDiaClase(1);alternarDiaClase(3);elegirModuloClase(1);');
chk('el módulo muestra su hora',/8:20–9:30/.test(hoja()));
porId('m-clase-sala').value='B12';
chk('agregar pone un bloque por día',run('agregarClaseEdit()')===true&&run('_clasesEdit.bloques.length')===2);
chk('y todavía no guarda nada',run('__guardados===0&&S.ramos[0].horario.length===0'));
run('alternarDiaClase(4);');
porId('m-clase-sala').value='';
chk('con un día pero sin módulo, Guardar avisa y no guarda',run('guardarClasesRamo()')===false&&/Elige el módulo/.test(hoja())&&run('__guardados')===0);
run('elegirModuloClase(3);elegirTipoClase("ayudantia");');
chk('lo que quedó escrito se guarda junto con la lista',run('guardarClasesRamo()')===true&&run('S.ramos[0].horario.length')===3&&run('__guardados')===1);
chk('el jueves quedó como ayudantía del módulo 3',run(`S.ramos[0].horario.some(b=>b.dia===4&&b.inicio==='11:00'&&b.tipo==='ayudantia'&&b.sala===null)`));
chk('el lunes conserva la sala',run(`S.ramos[0].horario.find(b=>b.dia===1).sala==='B12'`));
run('abrirClasesRamo();quitarClaseEdit(0);closeModal();');
chk('Cancelar no cambia nada',run('S.ramos[0].horario.length')===3);
run(`S.tenant='fen';abrirClasesRamo();`);
chk('sin módulos de la universidad se escriben las horas',/id="m-clase-inicio"/.test(hoja())&&!/Módulo/.test(hoja())&&/>Mi</.test(hoja()));
run(`alternarDiaClase(2);`);
porId('m-clase-inicio').value='10:00';porId('m-clase-fin').value='09:00';
chk('una hora de término anterior se rechaza',run('agregarClaseEdit()')===false&&/después de la de inicio/.test(hoja()));
run(`closeModal();S.tenant='uc';`);

console.log('\n=== La ficha del ramo ===');
run(`globalThis.__g=gruposHorario(S.ramos[0].horario);`);
chk('lunes y miércoles con la misma hora y sala van juntos',run(`__g.some(g=>g.dias.join()==='1,3'&&g.inicio==='08:20')`));
chk('el texto de los días se lee natural',run(`listaDiasTexto([1,3])`)==='Lunes y miércoles'&&run(`listaDiasTexto([1,3,5])`)==='Lunes, miércoles y viernes');

console.log('\n=== La semana en la Agenda ===');
run(`agendaEvents=function(){return [{fecha:fechasSemanaActual(new Date(2026,9,7))[3],ramo:S.ramos[0]}];};`);
const body=porId('agenda-body');
run(`agendaVista='horario';renderHorarioAgenda(document.getElementById('agenda-body'),new Date(2026,9,7));`);
const selector=run('agendaVistaHTML()');
chk('hay selector Evaluaciones / Horario, fuera de la lista',/data-agenda-vista="evaluaciones"/.test(selector)&&/aria-pressed="true" data-agenda-action="vista" data-agenda-vista="horario"/.test(selector)&&!/data-agenda-vista/.test(body.innerHTML));
chk('la grilla tiene las clases con su sala',/role="table"/.test(body.innerHTML)&&/B12/.test(body.innerHTML)&&(body.innerHTML.match(/class="hor-bloque"/g)||[]).length===3);
chk('sin sábado si no hay clases el sábado',/--dias:5/.test(body.innerHTML));
chk('el miércoles 7 de octubre está marcado como hoy',/aria-label="Miércoles, hoy, 1 evaluación"/.test(body.innerHTML));
chk('cada clase abre su ramo',/data-agenda-action="ver-ramo" data-ramo-id="r1"/.test(body.innerHTML));
chk('la fila dice el módulo y la hora',/<b>1<\/b><small>8:20<\/small>/.test(body.innerHTML));
chk('el subtítulo cuenta las clases',/3 clases a la semana · hoy 1/.test(porId('agenda-sub').textContent));
run(`S.ramos[0].horario=[];renderHorarioAgenda(document.getElementById('agenda-body'),new Date(2026,9,7));`);
chk('sin horario, en la UC invita a subir el pantallazo',/Arma tu horario/.test(body.innerHTML)&&/data-agenda-action="subir-horario"/.test(body.innerHTML));

console.log('\n=== Leer el horario de un pantallazo ===');
// Cajas como las de un pantallazo de Mi UC: días arriba, horas a la izquierda,
// cada celda con la sigla y el tipo debajo. Siglas del catálogo UC; nada personal.
const col={1:300,2:500,3:700,4:900,5:1100};
const fila={1:200,2:300,3:400,4:500};
const caja=(texto,x,y,w=150,h=30)=>({texto,x0:x-w/2,y0:y-h/2,x1:x+w/2,y1:y+h/2});
const palabras=[
  caja('Lunes',col[1],100,90),caja('Martes',col[2],100,90),caja('Miércoles',col[3],100,120),caja('Jueves',col[4],100,90),caja('Viernes',col[5],100,90),
  caja('08:20',120,fila[1],80),caja('09:40',120,fila[2],80),caja('11:00',120,fila[3],80),caja('12:20',120,fila[4],80),
  caja('MAT1620-3',col[1],fila[1]-15),caja('CLAS',col[1],fila[1]+20,60),
  caja('MAT1620-3',col[3],fila[1]-15),caja('CLAS',col[3],fila[1]+20,60),
  caja('FIS1514-2',col[2],fila[2]-15),caja('AYUD',col[2],fila[2]+20,60),
  caja('IIC1103-1',col[4],fila[3]-15),
  caja('2026-2',120,40,80),
];
let clases=run(`clasesDeFotoHorario([{texto:'',palabras:${json(palabras)}}],null,'uc')`);
const bl=s=>(clases.get(s)||[]).map(b=>`${b.dia}${b.inicio}${b.tipo||''}`).join(' ');
chk('Cálculo II: lunes y miércoles módulo 1, cátedra',bl('MAT1620')==='108:20catedra 308:20catedra');
chk('Dinámica: martes módulo 2, ayudantía',bl('FIS1514')==='209:40ayudantia');
chk('sin tipo leído, el bloque va sin tipo',bl('IIC1103')==='411:00');
chk('la hora del bloque es la del módulo',run(`clasesDeFotoHorario([{palabras:${json(palabras)}}],null,'uc').get('FIS1514')[0].fin`)==='10:50');
const sinDias=palabras.filter(p=>!/^(Lunes|Martes|Miércoles|Jueves|Viernes)$/.test(p.texto));
chk('sin encabezado de días no se propone ningún horario',run(`clasesDeFotoHorario([{palabras:${json(sinDias)}}],null,'uc').size`)===0);
chk('sin cajas (texto de corrido) tampoco',run(`clasesDeFotoHorario([{texto:'Lunes Martes MAT1620-3 08:20'}],null,'uc').size`)===0);
chk('fuera de la UC no hay módulos y no se lee la grilla',run(`clasesDeFotoHorario([{palabras:${json(palabras)}}],null,'fen').size`)===0);
const otra=palabras.map(p=>p.texto==='IIC1103-1'?{...p,texto:'IIC1103-1',x0:p.x0+200,x1:p.x1+200}:p);
chk('con dos lecturas que no coinciden, el bloque dudoso no entra',
  run(`clasesDeFotoHorario([{palabras:${json(palabras)}},{palabras:${json(otra)}},{palabras:${json(palabras)}}],null,'uc').get('IIC1103').length`)===1);

console.log('\n=== Del pantallazo al semestre ===');
run(`S.tenant='uc';S.carrera='ING-PC';S.ramos=[normalize({ramos:[{id:'r9',nombre:'Cálculo II',sigla:'MAT1620',color:'#7F77DD',categorias:[],gates:[],horario:[{dia:5,inicio:'14:50',fin:'16:00'}]}]}).ramos[0]];__guardados=0;
  var CURSOS_UC_FULL=[['MAT1620','Cálculo II',10],['FIS1514','Dinámica',10],['IIC1103','Introducción a la Programación',10]];cargarCursosUC=async()=>true;`);
run('abrirImportarHorarioBuscacursos()');
(async()=>{
  await run(`reconocerHorarioBuscacursos([{texto:'',palabras:${json(palabras)}}])`);
  const modal=porId('modal-content').innerHTML;
  chk('ofrece guardar el horario',/Guardar el horario de tus clases/.test(modal));
  chk('el ramo que ya tenía otro horario va desmarcado',/horario-clases-check" data-i="0"\/>/.test(modal)&&/reemplaza el que tenías/.test(modal));
  chk('los ramos nuevos van marcados',run(`_horarioClasesUC.filter(r=>!r.reemplaza).map(r=>r.sigla).sort().join()`)==='FIS1514,IIC1103');
  chk('antes de confirmar no cambia nada',run('__guardados===0&&S.ramos.length===1&&S.ramos[0].horario[0].dia===5'));
  const iDin=run(`_horarioClasesUC.findIndex(r=>r.sigla==='FIS1514')`);
  const iProg=run(`_horarioClasesUC.findIndex(r=>r.sigla==='IIC1103')`);
  const iRamo=s=>run(`_horarioUCReconocido.findIndex(r=>r.sigla==='${s}')`);
  checks={'.horario-ramo-check':[{checked:true,dataset:{i:String(iRamo('FIS1514'))}},{checked:false,dataset:{i:String(iRamo('IIC1103'))}}],
    '.horario-clases-check':[{checked:false,dataset:{i:'0'}},{checked:true,dataset:{i:String(iDin)}},{checked:true,dataset:{i:String(iProg)}}]};
  run('aplicarHorarioBuscacursos()');
  checks={};
  chk('se agrega el ramo marcado con su horario',run(`(()=>{const r=ramoConSigla('FIS1514');return !!r&&r.horario.length===1&&r.horario[0].tipo==='ayudantia';})()`));
  chk('el horario de un ramo desmarcado no tiene dónde ir y se descarta',run(`!ramoConSigla('IIC1103')`));
  chk('el horario desmarcado no se reemplaza',run(`ramoConSigla('MAT1620').horario.length===1&&ramoConSigla('MAT1620').horario[0].dia===5`));
  chk('guarda una sola vez',run('__guardados===1'));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
