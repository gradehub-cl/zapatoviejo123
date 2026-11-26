// Apoyo en la app: los anuncios activos como lista de banners de Inicio
// (Lucas, 2026-11-24). Datos sintéticos escritos acá.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return stub},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{classList:{contains(){return false}},style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
ctx.URL=URL;
vm.createContext(ctx);
['data.js','engine.js','app.js','marketplace.js'].forEach(f=>vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx));
const run=s=>vm.runInContext(s,ctx);
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

const ahora=Date.parse('2026-11-24T15:00:00Z');
ctx.ahora=ahora;
ctx.anuncios=[
  {id:'a1',titulo:'Clase sintética de Cálculo',ramos_siglas:['MAT1620'],precio_clp:12000,publicado_at:'2026-11-20T12:00:00Z',vence_at:'2026-12-20T12:00:00Z',estado:'publicado'},
  {id:'a2',titulo:'Material sintético gratis',tipo:'material',ramos_siglas:['MAT1610'],precio_clp:0,publicado_at:'2026-11-21T12:00:00Z',vence_at:'2026-12-20T12:00:00Z',estado:'publicado'},
  {id:'a3',titulo:'Clase que parte mañana',ramos_siglas:['MAT1620'],precio_clp:9000,publicado_at:'2026-11-25T12:00:00Z',vence_at:'2026-12-20T12:00:00Z',estado:'publicado'},
];
const ids=r=>run(r).map(a=>a.id).sort().join(',');
console.log('\n=== Qué anuncios ===');
chk('lista los activos, pagados y gratis',ids(`anunciosActivosDirectorio(anuncios,'','',{},ahora)`)==='a1,a2');
chk('no lista los que todavía no empiezan',!ids(`anunciosActivosDirectorio(anuncios,'','',{},ahora)`).includes('a3'));
chk('respeta la categoría Material',ids(`anunciosActivosDirectorio(anuncios,'','material',{},ahora)`)==='a2');
chk('respeta la búsqueda',ids(`anunciosActivosDirectorio(anuncios,'MAT1610','',{},ahora)`)==='a2');

console.log('\n=== El banner ===');
const html=run(`bannerDirectorioHTML(anuncios[0])`),inicio=run(`contenidoRecomendacionClase(anuncios[0])`);
chk('es el mismo banner de Inicio',html.includes(inicio.slice(0,inicio.indexOf('<button type="button" class="clase-apoyo-cerrar"'))));
chk('sin la X de ocultar por hoy',!html.includes('clase-apoyo-cerrar'));
chk('se puede abrir',html.includes('class="clase-apoyo-abrir"')&&!/clase-apoyo-abrir"[^>]*tabindex="-1"/.test(html));
chk('dice que es publicidad y se mide como el catálogo',/aria-label="Publicidad: /.test(html)&&/data-catalogo-anuncio="a1"/.test(html));

console.log('\n=== Solo en la app ===');
const src=fs.readFileSync(raiz+'src/marketplace/directorio.js','utf8');
chk('la lista depende de enAppNativa',/enBanners=typeof enAppNativa==='function'&&enAppNativa\(\)/.test(src));
chk('en la web siguen las tarjetas destacadas de siempre',/pagados=enBanners\?\[\]:anunciosDestacadosDirectorio/.test(src));
chk('abrir un banner cuenta la apertura como en Inicio',/registrarInteraccionMedida\(a\.id,'apertura',sigla\)/.test(src));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
if(fail)process.exit(1);
