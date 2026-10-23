// Material de apoyo (Lucas, 2026-10-23): al publicar se elige entre clase
// particular y material. Datos sintéticos escritos acá.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return stub},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
ctx.URL=URL; // los links de contacto se arman con URL
vm.createContext(ctx);
['data.js','engine.js','app.js','marketplace.js'].forEach(f=>vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx));
const run=s=>vm.runInContext(s,ctx);
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const base=extra=>({tenant:'uc',ramos_siglas:['MAT1620'],criterios:{promedioMenorA:7,avanceMinimo:0},titulo:'Guía sintética de Cálculo',
  descripcion:'Ejercicios resueltos sintéticos para la interrogación 1.',precio_clp:5000,contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 5678',...extra});
ctx.base=base;

console.log('\n=== Al guardar ===');
const mat=run(`validarBorradorClase(base({tipo:'material',modalidad:'individual',ubicacion:'online',pack_clases:'4'}),{MAT1620:'Cálculo II'})`);
chk('un material se guarda como material',mat.ok&&mat.datos.tipo==='material');
chk('sin formato, lugar ni pack, aunque el formulario los traiga',mat.ok&&mat.datos.modalidad===null&&mat.datos.ubicacion===null&&mat.datos.pack_clases===null);
const clase=run(`validarBorradorClase(base({modalidad:'individual'}),{MAT1620:'Cálculo II'})`);
chk('sin tipo es una clase, como todo lo anterior',clase.ok&&clase.datos.tipo==='clase'&&clase.datos.modalidad==='individual');
chk('un material pagado puede llevar un link',run(`validarBorradorClase(base({tipo:'material',contacto_tipo:'enlace',contacto_valor:'https://ejemplo.cl/guia'}),{MAT1620:'Cálculo II'})`).ok);
const claseLink=run(`validarBorradorClase(base({contacto_tipo:'enlace',contacto_valor:'https://ejemplo.cl/guia'}),{MAT1620:'Cálculo II'})`);
chk('una clase pagada sigue solo con WhatsApp',!claseLink.ok&&/WhatsApp/.test(claseLink.error));
const matInsta=run(`validarBorradorClase(base({tipo:'material',contacto_tipo:'instagram',contacto_valor:'@ejemplo'}),{MAT1620:'Cálculo II'})`);
chk('un material pagado no lleva Instagram y lo dice',!matInsta.ok&&/WhatsApp o un link/.test(matInsta.error));
chk('el material dice «Link para conseguirlo»',JSON.stringify(run(`opcionesContactoClase(5000,'material')`))===JSON.stringify([['whatsapp','WhatsApp'],['enlace','Link para conseguirlo']]));

console.log('\n=== En el catálogo ===');
run(`globalThis.__lista=[{id:'c',tipo:'clase',precio_clp:15000,ubicacion:'online',ramos_siglas:['MAT1620']},{id:'m',tipo:'material',precio_clp:5000,ramos_siglas:['MAT1620']},{id:'v',precio_clp:15000,ramos_siglas:['MAT1620']}]`);
const ids=tipo=>run(`filtrarPrecioCatalogoClases(__lista,{tipo:'${tipo}'}).anuncios.map(a=>a.id).join()`);
chk('el filtro de material muestra solo material',ids('material')==='m');
chk('el de clases incluye las que no tienen tipo',ids('clase')==='c,v');
chk('sin filtro, todo',ids('')==='c,m,v');
const tarjeta=run(`tarjetaCatalogoClase({id:'m',tipo:'material',titulo:'Guía sintética',descripcion:'Ejercicios resueltos sintéticos.',precio_clp:5000,ramos_siglas:['MAT1620'],contacto_tipo:'enlace',contacto_valor:'https://ejemplo.cl/guia'},{abierta:true})`);
chk('la tarjeta dice que es material de apoyo',/Publicidad · Material de apoyo/.test(tarjeta));
chk('su precio es uno, sin «por clase»',/\$5\.000<\/strong>/.test(tarjeta)&&!/por clase/.test(tarjeta));
chk('y el botón dice «Conseguir el material»',/Conseguir el material/.test(tarjeta));
chk('una clase se ve igual que antes',/Publicidad · Clase particular/.test(run(`tarjetaCatalogoClase({id:'c',titulo:'Clase sintética',descripcion:'Clase sintética.',precio_clp:15000,ramos_siglas:['MAT1620'],contacto_tipo:'whatsapp',contacto_valor:'+56912345678'})`)));
chk('el WhatsApp de un material parte diciendo que es un material',/vi tu material «Guía»/.test(run(`mensajeContactoClase({tipo:'material',titulo:'Guía'})`)));
chk('el filtro aparece en el catálogo',/id="catalogo-tipo"[\s\S]*Clase particular[\s\S]*Material de apoyo/.test(run('cabeceraCatalogoClasesHTML()')));

console.log('\n=== En el formulario ===');
const mk=fs.readFileSync(raiz+'marketplace.js','utf8');
chk('el selector «Qué publicas» solo aparece si el servidor ya guarda el tipo',/capasColumnasClase>=4\|\|esMaterialClase\(anuncio\)\?`<fieldset class="profesor-tipo"/.test(mk));
chk('formato, dónde y pack van en un bloque que se esconde con material',/<div class="profesor-solo-clase" id="pr-solo-clase"/.test(mk)&&/soloClase\.hidden=material/.test(mk));
chk('sin el SQL, un material no se guarda como clase: se avisa',/sin-material/.test(mk));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
