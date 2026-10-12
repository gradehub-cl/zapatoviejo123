// Nadie crea una cuenta sin declarar que tiene la edad mínima.
//
// La reja vive en el paso 1 del onboarding y NO en el formulario de correo,
// porque por el onboarding pasan también las cuentas de Google, que nunca ven
// ese formulario. Ese mismo motivo hace que la aceptación de los términos se
// registre ahí: hasta el 2026-09-23 solo se anotaba en el camino del correo, y
// quien entraba con Google quedaba sin constancia.
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

const base={nombre:'Persona Sintética',tenant:'fen',carrera:'IICG',semestre:2};
// Desde #697 la edad se elige en una ruleta que parte vacía («—»).
chk('sin elegir la edad, el paso 1 no se da por válido',val('obStepValid')(1,{...base,edad:null})===false);
chk('con 13 años tampoco',val('obStepValid')(1,{...base,edad:13})===false);
chk('con 14, sí',val('obStepValid')(1,{...base,edad:14})===true&&val('obStepValid')(1,{...base,edad:35})===true);
chk('y la edad sola no basta: falta el nombre',val('obStepValid')(1,{nombre:'',edad:20})===false);
chk('un valor que no es número no cuenta, aunque sea true',val('obStepValid')(1,{...base,edad:true})===false);
chk('la ruleta de edad parte vacía',val('obEdad')===null&&/vacio:'—'/.test(fs.readFileSync(path.join(raiz,'app.js'),'utf8')));
const anio=new Date().getFullYear();
chk('la de generación va de 2000 al año actual y parte en el año actual',
  val('obGeneracion')===anio&&val(`rangoAnios(2000,${anio})[0]`)===2000&&val(`rangoAnios(2000,${anio}).slice(-1)[0]`)===anio);
// obPasoIncompleto es lo que mira completeOnboarding antes de crear la cuenta:
// si la reja no estuviera ahí, el botón se podría saltar.
chk('el final del onboarding devuelve al paso 1 si falta la declaración',
  (()=>{val("selectedTenant='fen';selectedCarrera='IICG';selectedSem=2");
    return val('obPasoIncompleto')()===1;})());

chk('la ruleta de edad está en el paso 1 y la de generación en el paso 4',
  /data-step="1">[\s\S]*id="ob-edad-ruleta"[\s\S]*data-step="2"/.test(html)&&/data-step="4"[\s\S]*id="ob-generacion-ruleta"[\s\S]*data-step="5"/.test(html));
chk('con menos de 14 lo dice',/tienes que tener \$\{EDAD_MINIMA\} años o más/.test(fs.readFileSync(path.join(raiz,'app.js'),'utf8')));
// El paso 1 declara la edad, no la pide: ni campo de fecha de nacimiento ni
// nada que identifique más de lo necesario para saber si alguien puede entrar.
const paso1=(html.match(/<div class="ob-step" data-step="1">[\s\S]*?data-step="2"/)||[''])[0].replace(/<!--[\s\S]*?-->/g,'');
chk('el paso 1 no pide fecha de nacimiento',!!paso1&&!/nacimiento|type="date"/i.test(paso1));
chk('la declaración queda registrada con su fecha',/edad_declarada_en:new Date\(\)\.toISOString\(\)/.test(sesion));
chk('y arrastra la aceptación de términos, para las cuentas de Google',
  /async function registrarDeclaracionEdad\([^)]*\)[\s\S]{0,600}registrarAceptacionLegal\(\)/.test(sesion));
chk('completeOnboarding la llama',/registrarDeclaracionEdad\(\{edad:obEdad,generacion:obGeneracion\}\);/.test(fs.readFileSync(path.join(raiz,'app.js'),'utf8')));
chk('la columna es aditiva y nullable: no toca las cuentas que ya existen',
  /add column if not exists edad_declarada_en timestamptz;/.test(sql)&&!/not null/i.test(sql));

// Edad y generación se guardan en el perfil, aparte de la constancia: si sus
// columnas todavía no existieran, la declaración igual queda registrada.
const subidas=[];
const ses=vm.createContext({console,Number,Object,Date});
vm.runInContext(sesion.slice(sesion.indexOf('async function registrarDeclaracionEdad'),sesion.indexOf('async function registrarAceptacionLegal'))+
  ';var currentUser={id:"u"};var registrarAceptacionLegal=async()=>{};var supabaseClient={from:()=>({upsert:async d=>{__s.push(d);if("edad" in d)throw new Error("columna");return {};}})};',
  Object.assign(ses,{__s:subidas}));
vm.runInContext('registrarDeclaracionEdad({edad:19,generacion:2024})',ses).then(()=>{
  chk('la constancia de la declaración se guarda primero, sola',subidas[0]&&'edad_declarada_en' in subidas[0]&&!('edad' in subidas[0]));
  chk('después edad y generación, aunque esa subida falle',subidas[1]&&subidas[1].edad===19&&subidas[1].generacion===2024);
  chk('las columnas nuevas son aditivas, nullable y con rango',
    /add column if not exists edad smallint check \(edad between 14 and 120\)/.test(sql)&&/add column if not exists generacion smallint check \(generacion between 2000 and 2100\)/.test(sql));
  const priv=fs.readFileSync(path.join(raiz,'privacidad.html'),'utf8');
  chk('la privacidad dice que guardamos edad y generación, y ya no que no guardamos la edad',
    /Tu edad y tu generación/.test(priv)&&!/No guardamos tu edad/.test(priv));
  console.log(`\n${ok} ok, ${fail} fail`);
  if(fail)process.exit(1);
});
