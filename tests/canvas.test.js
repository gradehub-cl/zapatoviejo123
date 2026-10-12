// Canvas UC en la app iOS (#648): el token vive solo en el llavero del iPhone,
// el plugin solo hace GET a un host y a rutas fijas, y lo que trae entra por las
// mismas revisiones del horario y del .ics. Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function contexto(nativa){
  const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
  const window={addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})};
  if(nativa)window.Capacitor={isNativePlatform:()=>true,Plugins:{GradeHubCanvas:{estado:async()=>({conectado:true})}}};
  const ctx={window,document:{getElementById:()=>el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},
    setTimeout:f=>{f();return 1;},clearTimeout(){},console,URL};
  vm.createContext(ctx);
  vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
  return c=>vm.runInContext(c,ctx);
}

console.log('=== Qué ramos se proponen ===');
const run=contexto(true);
run(`S.tenant='uc';globalThis.__cursos=[
  {id:1,course_code:'MAT1620-2',name:'Calculo II',term:{name:'2026 Segundo Semestre'}},
  {id:2,course_code:'FIS1514-13',name:'Dinamica',term:{name:'2026 Segundo Semestre'}},
  {id:3,course_code:'MAT1610-8',name:'Calculo I',term:{name:'2026 Primer Semestre'}},
  {id:4,course_code:'VRA4000-9',name:'Integridad Academica',term:{name:'2026 Segundo Semestre'}},
  {id:5,course_code:'MAT1620L',name:'Laboratorio de Cálculo II',term:{name:'Período predeterminado'}}]`);
const del=run(`cursosCanvasDelSemestre(__cursos,new Date(2026,9,9)).map(c=>c.sigla+'-'+c.seccion).join()`);
chk('solo los del semestre actual con código de ramo',del==='MAT1620-2,FIS1514-13,VRA4000-9');
chk('un curso sin sección (MAT1620L) no se propone',!/MAT1620L/.test(del));
chk('en marzo se toman los del primer semestre',run(`cursosCanvasDelSemestre(__cursos,new Date(2026,2,9)).map(c=>c.sigla).join()`)==='MAT1610');
chk('salen como texto para la revisión del horario, que verifica cada sigla en el catálogo',
  run(`codigosCanvasTexto(cursosCanvasDelSemestre(__cursos,new Date(2026,9,9)))`)==='MAT1620-2, FIS1514-13, VRA4000-9');

console.log('\n=== Qué fechas se proponen ===');
run(`S.ramos=normalize({ramos:[{id:'r1',nombre:'Cálculo II',sigla:'MAT1620',color:'#000',gates:[],categorias:[
  {id:'i1',nombre:'Interrogación 1',peso:25,notas:[]},{id:'i2',nombre:'Interrogación 2',peso:25,notas:[]},
  {id:'ex',nombre:'Examen',peso:50,notas:[]}]}]}).ramos;
  globalThis.__tareas=[
    {name:'I2-P1',due_at:'2026-10-20T19:00:00Z'},{name:'I2-P2',due_at:'2026-10-20T19:00:00Z'},{name:'I2-P3',due_at:'2026-10-20T19:00:00Z'},
    {name:'EX-P1',due_at:'2026-12-01T13:00:00Z'},
    {name:'Tarea 1',due_at:'2026-10-15T03:00:00Z'},
    {name:'I1-P1',due_at:'2026-09-10T19:00:00Z'},
    {name:'Sin fecha'}]`);
const fechas=run(`fechasCanvas(__tareas,S.ramos[0],new Date(2026,9,9)).map(f=>f.titulo+'@'+f.fecha+'>'+(f.target||'-'))`);
chk('una interrogación subida por pregunta es una sola fecha',fechas.filter(f=>f.startsWith('I2 ')).length===1);
chk('la I2 calza con su evaluación',fechas.some(f=>/^I2 · Cálculo II@2026-10-20>r1\|i2\|$/.test(f)));
chk('el examen también',fechas.some(f=>/^EX · Cálculo II@2026-12-01>r1\|ex\|$/.test(f)));
chk('lo que no calza queda para elegir a mano',fechas.some(f=>/^Tarea 1 · Cálculo II@.*>-$/.test(f)));
chk('lo que ya pasó o no tiene fecha no se propone',!fechas.some(f=>/I1|Sin fecha/.test(f)));

console.log('\n=== Solo en la app, solo UC ===');
const web=contexto(false);
chk('en la web no aparece',web(`S.tenant='uc';canvasDisponible()`)===false);
chk('en la app sí, para la UC',run(`canvasDisponible()`)===true&&run(`S.tenant='fen';canvasDisponible()`)===false);
const app=leer('app.js');
chk('Ajustes lo muestra solo si está disponible',/\$\{canvasDisponible\(\)\?`[\s\S]{0,120}Canvas UC/.test(app));
chk('el token se valida antes de mandarlo',run(`TOKEN_CANVAS_RE.test('1234~'+'a'.repeat(64))`)===true&&run(`TOKEN_CANVAS_RE.test('hola')`)===false);
// Solo la parte iOS (el token). La de la web, que sí guarda su URL en el
// dispositivo, tiene su propio test: tests/canvas-calendario.test.js.
const canvasJs=app.slice(app.indexOf('// ─── CANVAS UC (app iOS'),app.indexOf('// ─── CANVAS UC EN LA WEB'));
chk('el token no se guarda en el navegador ni en S',!/localStorage|S\.\w+\s*=.*token|syncToCloud/.test(canvasJs));
chk('la medición solo lleva conteos',/track\('canvas_ramos',\{encontrados:cursos\.length,faltan:faltan\.length\}\)/.test(app)&&!/track\('canvas[^)]*token/.test(app));
chk('desconectar se confirma con el diálogo de la app',/showConfirm\('Desconectar Canvas'/.test(app));

console.log('\n=== Lado nativo ===');
const sw=leer('ios/App/App/CanvasPlugin.swift');
chk('el token va al llavero, solo en este dispositivo',/kSecClassGenericPassword/.test(sw)&&/kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly/.test(sw));
chk('solo GET',/httpMethod = "GET"/.test(sw)&&!/httpMethod = "(POST|PUT|DELETE|PATCH)"/.test(sw));
chk('un solo host, también al seguir páginas',/cursos\.canvas\.uc\.cl\/api\/v1\//.test(sw)&&/url\.host == "cursos\.canvas\.uc\.cl"/.test(sw));
chk('rutas en lista cerrada',/\^\(users\/self\|courses\|courses\/\[0-9\]\{1,12\}\/assignments\)\$/.test(sw));
chk('un token rechazado se borra',/codigo == 401[\s\S]{0,40}borrarToken/.test(sw));
chk('la web nunca vuelve a leer el token: no hay método que lo devuelva',!/resolve\(\[[^\]]*"token"/.test(sw));
chk('el plugin se registra y el archivo está en el target',/registerPluginInstance\(GradeHubCanvasPlugin\(\)\)/.test(leer('ios/App/App/MainViewController.swift'))
  &&(leer('ios/App/App.xcodeproj/project.pbxproj').match(/CanvasPlugin\.swift in Sources \*\/ = /g)||[]).length===1);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
