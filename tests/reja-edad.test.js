// Nadie crea una cuenta sin declarar que tiene la edad mínima.
//
// Desde 2026-11-03 la declaración es el aviso de la entrada («Al continuar
// aceptas… y declaras tener 14 años o más»): el onboarding ya no pregunta la
// edad. Igual se anota con su fecha al terminar el onboarding, porque por ahí
// pasan también las cuentas de Google — y con ella, la aceptación de términos.
//
// 14 y no 13: COPPA pone la línea en 13 para Estados Unidos y la Ley 21.719
// chilena en 14. Se toma la más alta, que cumple las dos.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const src=['data.js','engine.js','app.js','render-agenda.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');
const html=fs.readFileSync(path.join(raiz,'index.html'),'utf8');
const sesion=fs.readFileSync(path.join(raiz,'app-session.js'),'utf8');
const sql=fs.readFileSync(path.join(raiz,'supabase/edad_declarada.sql'),'utf8');

const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelectorAll(){return [];},querySelector(){return stub;},closest(){return null;},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val=e=>vm.runInContext(e,ctx);

let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  ok   '+n);}else{fail++;console.log('  FAIL '+n);}};

const base={generacion:2025,nombre:'Persona Sintética',tenant:'fen',carrera:'IICG',semestre:2};
const app=fs.readFileSync(path.join(raiz,'app.js'),'utf8');
chk('el paso 1 pide el nombre',val('obStepValid')(1,base)===true&&val('obStepValid')(1,{...base,nombre:'  '})===false);
chk('ya no hay ruleta ni aviso de edad',!/ob-edad-ruleta|ob-edad-aviso/.test(html)&&!/obEdad|ruletaEdad|EDAD_MINIMA/.test(app));
const anio=new Date().getFullYear();
chk('la de generación va de 2000 al año actual y parte sin elección',
  val('obGeneracion')===null&&val(`rangoAnios(2000,${anio})[0]`)===2000&&val(`rangoAnios(2000,${anio}).slice(-1)[0]`)===anio);
chk('el final del onboarding devuelve al paso 1 si falta el nombre',
  (()=>{val("selectedTenant='fen';selectedCarrera='IICG';selectedSem=2");
    return val('obPasoIncompleto')()===1;})());
chk('la ruleta de generación está en el paso 1, bajo el nombre',/data-step="1">[\s\S]*id="ob-name"[\s\S]*id="ob-generacion-ruleta"[\s\S]*data-step="2"/.test(html));
const paso1=(html.match(/<div class="ob-step" data-step="1">[\s\S]*?data-step="2"/)||[''])[0].replace(/<!--[\s\S]*?-->/g,'');
chk('el paso 1 no pide fecha de nacimiento ni edad',!!paso1&&!/nacimiento|type="date"|años/i.test(paso1));
chk('la declaración queda registrada con su fecha',/edad_declarada_en:new Date\(\)\.toISOString\(\)/.test(sesion));
chk('y arrastra la aceptación de términos, para las cuentas de Google',
  /async function registrarDeclaracionEdad\([^)]*\)[\s\S]{0,600}registrarAceptacionLegal\(\)/.test(sesion));
chk('completeOnboarding la llama con la generación',/registrarDeclaracionEdad\(\{generacion:obGeneracion\}\);/.test(app));
chk('la columna es aditiva y nullable: no toca las cuentas que ya existen',
  /add column if not exists edad_declarada_en timestamptz;/.test(sql)&&!/not null/i.test(sql));

// El semestre sale de la generación y la fecha (Lucas, 2026-10-12).
const sem=(g,y,m)=>val(`semestreSegunGeneracion(${g},new Date(${y},${m},15))`);
chk('entró en 2026 y es octubre de 2026: 2.º semestre',sem(2026,2026,9)===2);
chk('entró en 2026 y es abril: 1.º',sem(2026,2026,3)===1);
chk('entró en 2025 y es octubre de 2026: 4.º',sem(2025,2026,9)===4);
chk('en el verano cuenta el que empieza en marzo: enero de 2027 → 3.º',sem(2026,2027,0)===3);
chk('quien entra este año y es verano: 1.º',sem(2027,2027,1)===1);
chk('agosto ya es segundo semestre',sem(2026,2026,7)===2&&sem(2026,2026,6)===1);
chk('nunca menos que el 1.º',sem(2030,2026,9)===1);
chk('se muestra y se puede cambiar',/id="ob-sem-calculado"/.test(html)&&/id="sem-grid" hidden/.test(html)&&/mostrarSemestreManual\(\)">Cambiar</.test(fs.readFileSync(path.join(raiz,'app.js'),'utf8')));
chk('la generación se guarda en la cuenta; las anteriores quedan en null',
  val('normalize({ramos:[]}).generacion')===null&&val('normalize({ramos:[],generacion:2024}).generacion')===2024&&val('normalize({ramos:[],generacion:1999}).generacion')===null);

// "Cambiar" pide escribir el semestre o marcar TAV (verano fuera de la UC).
// Desde 2026-11-03 va en el paso 1, bajo el nombre.
const paso1Valido=()=>val('obStepValid')(1,{nombre:'Ana',generacion:val('obGeneracion'),semestre:val('selectedSem'),verano:val('obVerano'),semInvalido:val('obSemInvalido')});
val("obGeneracion=new Date().getFullYear();selectedTenant='uc';selectedCarrera=null;obSemManual=false;obVerano=false;obSemInvalido=false;selectedSem=2");
val("escribirSemestreOnboarding('5')");
chk('escribir 5 deja el 5.º, elegido a mano',val('selectedSem')===5&&val('obSemManual')===true&&paso1Valido()===true);
val("escribirSemestreOnboarding('abc')");
chk('algo que no es un semestre no deja avanzar',val('obSemInvalido')===true&&paso1Valido()===false);
val("escribirSemestreOnboarding('99')");
chk('un número fuera de la carrera tampoco',paso1Valido()===false);
val("escribirSemestreOnboarding('3');alternarVeranoOnboarding()");
chk('marcar TAV deja avanzar y no sugiere ramos de la malla',val('obVerano')===true&&paso1Valido()===true&&val('obRamosActuales()').length===0);
chk('la TAV es de la UC: en las otras se dice Verano',val("nombreVerano('uc')")==='TAV'&&val("nombreVerano('fen')")==='Verano'&&val("nombreVerano('uandes')")==='Verano');
chk('la TAV vale hasta el 1 de marzo siguiente',val("finDeVerano(new Date(2027,0,10))")==='2027-03-01'&&val("finDeVerano(new Date(2026,11,20))")==='2027-03-01');
val("S.verano={hasta:'2027-03-01'}");
chk('en febrero sigue en TAV; en marzo ya no',val("enVerano(new Date(2027,1,27))")===true&&val("enVerano(new Date(2027,2,1))")===false);
chk('se guarda y se limpia lo que no corresponde',
  JSON.stringify(val("normalize({ramos:[],verano:{hasta:'2027-03-01'}}).verano"))==='{"hasta":"2027-03-01"}'&&val("normalize({ramos:[],verano:{hasta:'mañana'}}).verano")===null&&val('normalize({ramos:[]}).verano')===null);
val("obVerano=false;S.verano=null");

// La generación se guarda en el perfil, aparte de la constancia: si su columna
// todavía no existiera, la declaración igual queda registrada. La edad ya no se
// sube; la que guardaron cuentas anteriores no se toca.
const subidas=[];
const ses=vm.createContext({console,Number,Object,Date});
vm.runInContext(sesion.slice(sesion.indexOf('async function registrarDeclaracionEdad'),sesion.indexOf('async function registrarAceptacionLegal'))+
  ';var currentUser={id:"u"};var registrarAceptacionLegal=async()=>{};var supabaseClient={from:()=>({upsert:async d=>{__s.push(d);if("generacion" in d)throw new Error("columna");return {};}})};',
  Object.assign(ses,{__s:subidas}));
vm.runInContext('registrarDeclaracionEdad({edad:19,generacion:2024})',ses).then(()=>{
  chk('la constancia de la declaración se guarda primero, sola',subidas[0]&&'edad_declarada_en' in subidas[0]&&!('generacion' in subidas[0]));
  chk('después la generación, aunque esa subida falle',subidas[1]&&subidas[1].generacion===2024);
  chk('la edad no se sube aunque llegue',subidas.every(s=>!('edad' in s)));
  chk('las columnas siguen aditivas, nullable y con rango',
    /add column if not exists edad smallint check \(edad between 14 and 120\)/.test(sql)&&/add column if not exists generacion smallint check \(generacion between 2000 and 2100\)/.test(sql));
  const priv=fs.readFileSync(path.join(raiz,'privacidad.html'),'utf8');
  chk('la privacidad dice que guardamos la generación y no pedimos la edad',
    /<td>Tu generación/.test(priv)&&/No te pedimos la edad/.test(priv)&&!/<td>Tu edad y tu generación/.test(priv));
  console.log(`\n${ok} ok, ${fail} fail`);
  if(fail)process.exit(1);
});
