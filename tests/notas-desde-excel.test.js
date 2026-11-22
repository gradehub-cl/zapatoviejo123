// Notas pegadas desde Excel: leer celdas, calzar con la pauta propia del ramo
// y guardar sin pisar nada. Ramos, siglas y notas INVENTADOS.
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
// Sync y pantallas viven en otros bundles: acá basta con que no fallen.
for(const f of ['syncToCloud','renderHome','closeModal','openModal','showToast'])if(typeof ctx[f]!=='function')ctx[f]=()=>{};
const run=c=>vm.runInContext(c,ctx);
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const plano=v=>JSON.parse(JSON.stringify(v));
const extraer=t=>plano(ctx.excelExtraer(t));
const T='\t';

const cat=(id,nombre,peso,extra={})=>({id,nombre,peso,ponderaNotas:false,directNota:true,notas:[],...extra});
const ramos=()=>[
  {id:'r1',nombre:'Cálculo Inventado',sigla:'TST1001',categorias:[cat('c11','Interrogación 1',20),cat('c12','Interrogación 2',20),cat('c13','Examen',40),cat('c14','Laboratorio',20,{slots:3})]},
  {id:'r2',nombre:'Física Ficticia',sigla:'QQQ2002',categorias:[cat('c21','Controles',30,{slots:4}),cat('c22','Prueba 1',30),cat('c23','Prueba 2',40)]},
];
const calzar=(texto,rs)=>plano(ctx.excelCalzar(ctx.excelExtraer(texto),rs));

console.log('\nLeer celdas pegadas');
{
  const larga=extraer(['Ramo'+T+'Evaluación'+T+'Nota','Cálculo Inventado'+T+'I1'+T+'5,4','Física Ficticia'+T+'C2'+T+'6.1'].join('\n'));
  chk('forma larga: ramo, evaluación y nota',larga.length===2&&larga[0].ramo==='Cálculo Inventado'&&larga[0].evaluacion==='I1'&&larga[0].valor===5.4&&larga[1].valor===6.1);
  const bloques=extraer(['Cálculo Inventado','I1'+T+'5,4','Examen'+T+'4,0','','Física Ficticia','Prueba 1'+T+'3,8'].join('\n'));
  chk('bloques: el título manda sobre las filas de abajo',bloques.length===3&&bloques[1].ramo==='Cálculo Inventado'&&bloques[2].ramo==='Física Ficticia');
  const ancha=extraer(['Ramo'+T+'I1'+T+'I2'+T+'Examen','Cálculo Inventado'+T+'5,4'+T+''+T+'6,0','Física Ficticia'+T+'4,1'+T+'4,4'].join('\n'));
  chk('ancha: el encabezado da las evaluaciones',ancha.length===4&&ancha[1].evaluacion==='Examen'&&ancha[1].valor===6&&ancha[3].ramo==='Física Ficticia');
  const varias=extraer('Laboratorio'+T+'5,0'+T+'6,2'+T+'5,8');
  chk('varias notas de lo mismo en una fila',varias.length===3&&varias.every(n=>n.evaluacion==='Laboratorio'&&n.ramo===null));
  chk('con punto y coma también',extraer('Cálculo Inventado;I1;5,4').length===1);
  const ruido=extraer(['I1'+T+'20%'+T+'5,4','I2'+T+'54','Examen'+T+'0,4','Fecha'+T+'12/10'].join('\n'));
  chk('porcentajes, enteros de dos cifras y fechas no son notas',ruido.length===1&&ruido[0].valor===5.4);
  chk('notas fuera de 1 a 7 no entran',extraer('I1'+T+'8,0\nI2'+T+'0,5').length===0);
  chk('texto vacío',extraer('').length===0&&extraer(null).length===0);
}

console.log('\nCalzar evaluaciones');
{
  const k=t=>plano(ctx.excelClave(t));
  chk('«I1» es interrogación 1',JSON.stringify(k('I1'))==='{"tipo":"interrogacion","numero":1}');
  chk('«Int. 2» e «Interrogación 2» son lo mismo',JSON.stringify(k('Int. 2'))===JSON.stringify(k('Interrogación 2')));
  chk('«Controles» es control sin número',JSON.stringify(k('Controles'))==='{"tipo":"control","numero":null}');
  chk('«Ex» es examen',k('Ex').tipo==='examen');
  chk('una «s» sola no es solemne',k('S').tipo!=='solemne');
  const rs=ramos();
  const c=calzar(['Cálculo Inventado'+T+'I1'+T+'5,4','Cálculo Inventado'+T+'Ex'+T+'4,5','Cálculo Inventado'+T+'Lab 2'+T+'6,0'].join('\n'),rs);
  chk('I1 va a Interrogación 1',c[0].estado==='lista'&&c[0].catId==='c11');
  chk('Ex va a Examen',c[1].catId==='c13');
  chk('Lab 2 va a la casilla 2 de Laboratorio',c[2].catId==='c14'&&c[2].casilla===2);
  const f=calzar('Física Ficticia'+T+'C3'+T+'6,5',rs);
  chk('C3 va a la casilla 3 de Controles',f[0].catId==='c21'&&f[0].casilla===3);
  const sin=calzar('Cálculo Inventado'+T+'Tarea extra'+T+'7,0',rs);
  chk('lo que no calza queda para elegir',sin[0].estado==='sin_evaluacion'&&sin[0].ramoId==='r1');
  chk('I3 no existe: no se inventa',calzar('Cálculo Inventado'+T+'I3'+T+'5,0',rs)[0].estado==='sin_evaluacion');
}

console.log('\nCalzar ramos');
{
  const rs=ramos();
  chk('por sigla',calzar('TST1001'+T+'I1'+T+'5,0',rs)[0].ramoId==='r1');
  chk('sin tildes ni mayúsculas',calzar('CALCULO INVENTADO'+T+'I1'+T+'5,0',rs)[0].ramoId==='r1');
  chk('un nombre más corto que lo contiene',calzar('Física'+T+'Prueba 1'+T+'5,0',rs)[0].ramoId==='r2');
  chk('un ramo que no está',calzar('Química Imaginaria'+T+'I1'+T+'5,0',rs)[0].estado==='sin_ramo');
  chk('sin ramo y con dos ramos: no adivina',calzar('I1'+T+'5,0',rs)[0].estado==='sin_ramo');
  chk('sin ramo y con uno solo: es ese',calzar('I1'+T+'5,0',[rs[0]])[0].ramoId==='r1');
  const dos=[{id:'a',nombre:'Taller Inventado I',categorias:[]},{id:'b',nombre:'Taller Inventado II',categorias:[]}];
  chk('dos parecidos: no adivina',calzar('Taller Inventado'+T+'I1'+T+'5,0',dos)[0].estado==='sin_ramo');
}

console.log('\nGuardar sin pisar');
{
  const rs=ramos();
  rs[0].categorias[0].notas=[{id:'n1',nombre:'Interrogación 1',valor:6.0,peso:1}];
  ctx.__rs=rs;
  const c=ctx.excelCalzar(ctx.excelExtraer(['Cálculo Inventado'+T+'I1'+T+'3,0','Cálculo Inventado'+T+'I2'+T+'5,5',
    'Cálculo Inventado'+T+'Laboratorio'+T+'5,0'+T+'6,0','Física Ficticia'+T+'C2'+T+'4,8'].join('\n')),rs);
  const r=plano(ctx.excelAplicar(c,rs));
  chk('la nota que ya existía se queda como estaba',rs[0].categorias[0].notas.length===1&&rs[0].categorias[0].notas[0].valor===6);
  chk('cuenta cuántas no se tocaron',r.ocupadas===1&&r.puestas===4);
  chk('I2 se guarda',rs[0].categorias[1].notas[0].valor===5.5);
  const lab=rs[0].categorias[3].notas.map(n=>n.slot+':'+n.valor).join(' ');
  chk('dos de Laboratorio sin número: primera y segunda casilla',lab==='0:5 1:6');
  chk('C2 en la casilla 2 de Controles',rs[1].categorias[0].notas[0].slot===1&&rs[1].categorias[0].notas[0].valor===4.8);
  chk('no cambia la pauta',rs[0].categorias.map(x=>x.peso).join()==='20,20,40,20'&&rs[0].categorias.length===4);
  const otra=plano(ctx.excelAplicar(c,rs));
  chk('aplicar de nuevo no pisa: solo llena la casilla libre que quedaba',otra.puestas===1&&rs[0].categorias[1].notas.length===1&&rs[0].categorias[3].notas.length===3);
}

console.log('\nPantalla');
{
  run(`S={...S,tenant:'uc',userName:'Persona Sintética',ramos:${JSON.stringify(ramos())},historial:[]}`);
  chk('fuera de la app no se ofrece',run('excelOfertaOnboardingHTML()')==='');
  ctx.window.Capacitor={isNativePlatform:()=>true};
  chk('en la app es un enlace discreto',/class="ob-excel-enlace"/.test(run('excelOfertaOnboardingHTML()')));
  chk('sin ramos con pauta no se ofrece',run(`(()=>{const g=S.ramos;S.ramos=[{id:'x',nombre:'Sin pauta',categorias:[]}];const h=excelOfertaOnboardingHTML();S.ramos=g;return h;})()`)==='');
  delete ctx.window.Capacitor;
  elementos['m-excel-texto']=elemento();elementos['m-excel-aviso']=elemento();
  run('abrirNotasDesdeExcel()');
  elementos['m-excel-texto'].value='Cálculo Inventado\tI1\t5,4\nCálculo Inventado\tTarea extra\t7,0\nQuímica Imaginaria\tI1\t4,0';
  run('revisarNotasDesdeExcel()');
  const html=elementos['modal-content'].innerHTML;
  chk('muestra adónde va cada nota',/Interrogación 1/.test(html)&&/\(I1\)/.test(html)&&/5,4/.test(html));
  chk('lo que no calza se puede asignar',/Elige dónde va/.test(html)&&/<select id="m-excel-cat-1"/.test(html));
  chk('avisa el ramo que no está',/Química Imaginaria/.test(html));
  chk('el botón dice cuántas guarda',/Guardar 1 nota</.test(html));
  run('abrirNotasDesdeExcel(true)');
  const vuelta=elementos['modal-content'].innerHTML;
  chk('«Atrás» conserva lo pegado',/>Cálculo Inventado\tI1\t5,4\nCálculo Inventado\tTarea extra\t7,0\nQuímica Imaginaria\tI1\t4,0<\/textarea>/.test(vuelta));
  chk('y deja «Revisar» activo',!/id="m-excel-leer" disabled/.test(vuelta));
  run('revisarNotasDesdeExcel()');
  run(`asignarNotaExcel(1,'c13')`);
  chk('al asignar, suma al botón',/Guardar 2 notas/.test(elementos['modal-content'].innerHTML));
  const antes=run('JSON.stringify(S.ramos[1])');
  run('guardarNotasDesdeExcel()');
  run('abrirNotasDesdeExcel(true)');
  chk('después de guardar no queda nada pegado',/><\/textarea>/.test(elementos['modal-content'].innerHTML));
  chk('guarda lo revisado',run('S.ramos[0].categorias[0].notas[0].valor')===5.4&&run('S.ramos[0].categorias[2].notas[0].valor')===7);
  chk('no toca otros ramos',run('JSON.stringify(S.ramos[1])')===antes);
  run(`excelTextoPegado='algo de antes'`);
  run('abrirNotasDesdeExcel()');
  chk('abrir desde el enlace parte en blanco',/><\/textarea>/.test(elementos['modal-content'].innerHTML)&&/id="m-excel-leer" disabled/.test(elementos['modal-content'].innerHTML));
  elementos['m-excel-texto'].value='solo texto sin notas';
  run('revisarNotasDesdeExcel()');
  chk('sin notas, explica qué copiar',/No encontramos notas/.test(elementos['m-excel-aviso'].textContent));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
