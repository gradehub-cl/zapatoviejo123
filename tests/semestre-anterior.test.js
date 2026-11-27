// Alguien que llega a GradeHub en cuarto semestre tiene tres años de notas que la
// app no vio. Sin poder cargarlos, su promedio de carrera empieza en blanco y la
// app le sirve la mitad: lleva el semestre en curso, pero no sabe cómo va.
//
// No se le piden las evaluaciones de cada ramo —nadie recuerda las ponderaciones
// de algo que cursó hace dos años— sino la nota final, que es lo único que sí
// tiene a mano. Se guarda como `avgOverride`, el mismo mecanismo con el que ya se
// corrige a mano el promedio de un ramo archivado.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const app=fs.readFileSync(process.env.GRADEHUB_APP||raiz+'app.js','utf8');
const render=fs.readFileSync(raiz+'render-main.js','utf8');
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

// Se prueba de verdad, con la app entera cargada y datos sintéticos: es lo único
// que separa un promedio correcto de uno con un 9,5 adentro.
const stub={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},focus(){},querySelectorAll(){return []},
  value:'',innerHTML:'',textContent:'',dataset:{}};
const campos={};
const campo=id=>campos[id]||(campos[id]={...stub,attrs:{},enfocado:false,
  setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},focus(){this.enfocado=true;}});
const ctx={console,Intl,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:campo,createElement:()=>stub,addEventListener(){},
    documentElement:stub,body:stub,querySelector:()=>stub,querySelectorAll:()=>[]},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},
  setTimeout,clearTimeout};
vm.createContext(ctx);
for(const [f,src] of [['data.js',fs.readFileSync(raiz+'data.js','utf8')],['engine.js',fs.readFileSync(raiz+'engine.js','utf8')],['app.js',app]])
  vm.runInContext(src,ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);
run(`S.tenant='uc';__toasts=[];
  save=()=>{};track=()=>{};closeModal=()=>{};renderHome=()=>{};renderStats=()=>{};
  showToast=(t,err)=>__toasts.push({t,err:!!err});`);
const nota=v=>run('notaSemestreAnterior('+JSON.stringify(v)+')');
// Arma el paso de notas y guarda. Devuelve el historial que quedó.
const guardar=(historial,anio,periodo,ramos)=>{
  for(const k of Object.keys(campos))delete campos[k];
  ctx.__h=historial;ctx.__r=ramos;
  run(`S.historial=__h;__toasts=[];
    histManual={label:etiquetaSemestre(${anio},'${periodo}'),anio:${anio},periodo:'${periodo}',paso:2,
      ramos:__r.map(([nombre,nota])=>({nombre,creditos:10,nota}))};
    guardarSemestreAnterior();`);
  return JSON.parse(run('JSON.stringify(S.historial)'));
};

console.log('=== La nota final se valida contra la escala ===');
chk('acepta una nota normal', nota('5.5')===5.5);
chk('acepta coma decimal, que es como se escribe acá', nota('5,5')===5.5);
chk('acepta los extremos', nota('1')===1 && nota('7')===7);
chk('rechaza sobre 7', nota('9.5')===null && nota('9')===null);
chk('rechaza bajo 1', nota('0.5')===null);
chk('rechaza lo que no es número', nota('abc')===null && nota('')===null);
// Igual que en la ficha y en el resto de la app: el parser es uno solo.
chk('"65" vale 6,5, como en el resto de la app', nota('65')===6.5 && nota('65')===run('parseNota("65")'));
chk('"77" sigue siendo un error, como en el resto de la app', nota('77')===null);

console.log('\n=== Una nota mala no deja guardar nada ===');
{
  const h=guardar([{id:'a',label:'2026-1',gpa:5,ramos:[{id:'x',nombre:'Sintético',creditos:10,avgOverride:5,categorias:[]}]}],
    2024,'2',[['Física Sintética','9'],['Química Sintética','5,0']]);
  chk('el historial queda igual', h.length===1 && h[0].id==='a');
  const t=run('__toasts');
  chk('avisa con error y nombra el ramo', t.length===1 && t[0].err && /Física Sintética/.test(t[0].t) && !/agregado/.test(t[0].t));
  chk('marca el campo y lo enfoca', campos['m-hist-nota-0'].attrs['aria-invalid']==='true' && campos['m-hist-nota-0'].enfocado);
  chk('no marca el que está bien', !campos['m-hist-nota-1'] || !campos['m-hist-nota-1'].attrs['aria-invalid']);
  run(`actualizarNotaSemestreAnterior(0,'6,0')`);
  chk('al corregirla se desmarca', !campos['m-hist-nota-0'].attrs['aria-invalid']);
}
{
  const h=guardar([],2024,'2',[['Física Sintética','65'],['Química Sintética','']]);
  chk('"65" se guarda como 6,5 y el ramo en blanco se ignora',
    h.length===1 && h[0].ramos.length===1 && h[0].ramos[0].avgOverride===6.5 && h[0].ramos[0].nombre==='Física Sintética');
}

console.log('\n=== Un semestre viejo no queda arriba de uno más nuevo ===');
{
  const h=guardar([{id:'a',label:'2026-1',gpa:5,ramos:[{id:'x',nombre:'Sintético',creditos:10,avgOverride:5,categorias:[]}]}],
    2024,'2',[['Física Sintética','6,0']]);
  chk('2024-2 entra después de 2026-1', JSON.stringify(h.map(x=>x.label))==='["2026-1","2024-2"]');
  ctx.__h=h;
  chk('el semestre anterior de Inicio sigue siendo 2026-1', run('ultimoHistorialConGpa(__h).label')==='2026-1');
  chk('lo que ya estaba no se toca', h[0].id==='a' && h[0].gpa===5);
  const h2=guardar(h,2026,'2',[['Física Sintética','6,0']]);
  chk('uno más nuevo sí queda primero', JSON.stringify(h2.map(x=>x.label))==='["2026-2","2026-1","2024-2"]');
}

console.log('\n=== El semestre se guarda como historial de verdad ===');
chk('se guarda el promedio final por ramo, no evaluaciones inventadas',
  /avgOverride:r\.valor/.test(app) && /categorias:\[\]/.test(app));
chk('entra al historial con su gpa', /insertarEnHistorial\(S\.historial,\{[\s\S]{0,200}gpa:gpa\(ramos\)/.test(app));
// Un ramo sin nota no aporta al promedio: guardarlo lo dejaría en el historial
// como si estuviera pendiente de algo.
chk('solo se guardan los ramos con nota', /const conNota=notasValidasSemestreAnterior\(\)/.test(app));

console.log('\n=== Se puede llegar a la pantalla ===');
// Si el botón solo apareciera con historial existente, quien más lo necesita
// —el que llega sin ninguno— no lo vería nunca.
chk('el botón está en el historial y no depende de que ya haya semestres',
  /openSemestreAnteriorModal\(\)/.test(render) && /stats-hist-vacio/.test(render));
// Y también en Ajustes, que es donde alguien va a buscar "cómo registro lo que ya
// cursé" cuando no está mirando sus estadísticas.
chk('y también se llega desde Ajustes', /openSemestreAnteriorModal\(\)/.test(app));

console.log('\n=== Los botones de acción se ven clickeables ===');
// `--border` sobre `--muted` los dejaba fundidos con el fondo: se leían como un
// recuadro informativo. Es el borde más tenue de la paleta sobre el fondo casi
// igual al de la tarjeta.
const css=fs.readFileSync(raiz+'styles.css','utf8');
const regla=(css.match(/\.settings-data-actions button\{[^}]*\}/)||[''])[0];
chk('usan el borde marcado, no el tenue', /--border2/.test(regla) && !/1px solid var\(--border\)/.test(regla));
chk('y reaccionan al apuntar', /\.settings-data-actions button:hover/.test(css));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
