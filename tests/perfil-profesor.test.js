// Perfil de profesor o empresa, lado del cliente (Lucas, 2026-10-23; base de
// #643). Datos sintéticos. Lo que importa: sin el SQL aplicado la ficha se sigue
// leyendo, lo que se guarda tiene forma, el perfil del estudiante solo lleva a
// links https y nada de lo que escribe el profesor entra como HTML.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
let pruebas=0;
const check=(nombre,cond)=>{assert.ok(cond,nombre);pruebas++;console.log('  OK   '+nombre);};
const pedidos=[];
let faltanColumnas=0,guardado=null;
const tabla={select(campos){pedidos.push(campos);this.campos=campos;return this;},eq(){return this;},
  update(d){guardado=d;return this;},
  async maybeSingle(){
    if(faltanColumnas-->0)return {data:null,error:{code:'42703',message:'column tutor_perfiles.tipo_perfil does not exist'}};
    return {data:guardado?{nombre_publico:guardado.nombre_publico,perfil_publico:guardado.perfil_publico}:{nombre_publico:'Academia Sintética',estado:'aprobado'},error:null};
  }};
const ctx={console,URL,esc,currentUser:{id:'profesor-sintetico'},supabaseClient:{from:()=>tabla,rpc:async()=>({data:[],error:null})}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=s=>vm.runInContext(s,ctx);
const valida=e=>run(`validarPerfilProfesor(${JSON.stringify(e)})`);
const base={nombre_publico:'Academia Sintética',presentacion:'Clases ficticias de cálculo para probar el perfil.'};

(async()=>{
  console.log('\n=== La ficha se lee aunque falte el SQL nuevo ===');
  await run('perfilProfesorActual()');
  check('pide los campos del perfil',pedidos[0].includes('perfil_publico')&&pedidos[0].includes('logo_path'));
  pedidos.length=0;faltanColumnas=1;
  const r=await run('perfilProfesorActual()');
  check('sin panel_alumnos, vuelve a pedir el perfil completo',r.ok&&pedidos.length===2&&!pedidos[1].includes('panel_alumnos')&&pedidos[1].includes('perfil_publico'));
  pedidos.length=0;faltanColumnas=2;
  check('sin las columnas del perfil, con el logo',(await run('perfilProfesorActual()')).ok&&pedidos.length===3&&!pedidos[2].includes('perfil_publico')&&pedidos[2].includes('logo_path'));
  pedidos.length=0;faltanColumnas=3;
  check('y sin el logo, la ficha de siempre',(await run('perfilProfesorActual()')).ok&&pedidos.length===4&&!pedidos[3].includes('logo'));
  check('sin el campo nuevo, el formulario no se arma',!run('tienePerfilCompleto({nombre_publico:"x"})')&&run('tienePerfilCompleto({perfil_publico:false})'));

  console.log('\n=== Lo que se guarda tiene forma ===');
  const ok=valida({...base,tipo_perfil:'empresa',instagram:'@academia.sintetica',sitio_web:'https://ejemplo.cl/academia',
    universidades:['uc','fen','harvard','uc'],ramos:'mat1620, FIS1514 mat1620',perfil_publico:true});
  check('un perfil completo pasa',ok.ok);
  check('el @ de Instagram no se guarda',ok.datos.instagram==='academia.sintetica');
  check('universidades: solo las del marketplace, sin repetir',JSON.stringify(ok.datos.universidades)==='["uc","fen"]');
  check('siglas en mayúscula y sin repetir',JSON.stringify(ok.datos.ramos_siglas)==='["MAT1620","FIS1514"]');
  const vacio=valida(base);
  check('lo opcional vacío se guarda como nada, y el perfil parte privado',vacio.ok&&vacio.datos.instagram===null&&vacio.datos.sitio_web===null
    &&vacio.datos.universidades===null&&vacio.datos.ramos_siglas===null&&vacio.datos.perfil_publico===false&&vacio.datos.tipo_perfil===null);
  check('descripción corta no',valida({...base,presentacion:'corta'}).campo==='presentacion');
  check('sitio sin https no',valida({...base,sitio_web:'http://ejemplo.cl'}).campo==='web');
  check('sitio con usuario dentro no',valida({...base,sitio_web:'https://alguien@ejemplo.cl'}).campo==='web');
  check('javascript: no',valida({...base,sitio_web:'javascript:alert(1)'}).campo==='web');
  check('Instagram con espacios no',valida({...base,instagram:'mi academia'}).campo==='instagram');
  check('más de 20 ramos no',valida({...base,ramos:Array.from({length:21},(_,i)=>'MAT'+(1000+i)).join(',')}).campo==='ramos');
  check('un tipo inventado queda sin tipo',valida({...base,tipo_perfil:'colegio'}).datos.tipo_perfil===null);
  const g=await run(`guardarPerfilProfesor(${JSON.stringify({...base,perfil_publico:true})})`);
  check('guardar manda solo los campos del perfil',g.ok&&Object.keys(guardado).sort().join()==='instagram,nombre_publico,perfil_publico,presentacion,ramos_siglas,sitio_web,tipo_perfil,universidades');
  guardado=null;faltanColumnas=1;
  check('sin el SQL, guardar avisa en vez de fingir',!(await run(`guardarPerfilProfesor(${JSON.stringify(base)})`)).ok);
  faltanColumnas=0;

  console.log('\n=== Lo que ve el estudiante ===');
  run(`catalogoClasesActual=[{id:'a2',titulo:'Otra clase',ramos_siglas:['FIS1514']}]`);
  ctx.__p={nombre_publico:'<img src=x onerror=alert(1)>',presentacion:'<script>x</script>',tipo_perfil:'empresa',instagram:'academia.sintetica',
    sitio_web:'javascript:alert(1)',universidades:['uc'],ramos_siglas:['MAT1620'],logo_path:null,anuncios:['a1','a2','a3']};
  const html=run('perfilPublicoHTML(__p,"a1")');
  check('el nombre y la descripción no entran como HTML',!/<img|<script/.test(html)&&html.includes('&lt;img'));
  check('Instagram va a instagram.com',html.includes('href="https://www.instagram.com/academia.sintetica/"'));
  check('un sitio que no es https no se enlaza',!/javascript:/.test(html)&&!html.includes('Sitio web'));
  check('sus otras clases, sin repetir la que está abierta',html.includes('data-ir-anuncio="a2"')&&!html.includes('data-ir-anuncio="a1"'));
  check('la que no está en este catálogo se cuenta, sin inventarle título',/Y 1 clase publicada más/.test(html));
  check('dice si es academia',html.includes('Academia o empresa'));

  const caja={dataset:{perfil:'privado'},innerHTML:'',isConnected:true};
  ctx.supabaseClient.rpc=async(nombre,args)=>{assert.equal(nombre,'perfil_publico_de_anuncio');return {data:[],error:null};};
  ctx.__caja=caja;await run('mostrarPerfilEnClase(__caja)');
  check('un perfil privado no deja nada en la tarjeta',caja.innerHTML==='');
  const caja2={dataset:{perfil:'sin-sql'},innerHTML:'',isConnected:true};
  ctx.supabaseClient.rpc=async()=>({data:null,error:{code:'PGRST202',message:'Could not find the function'}});
  ctx.__caja=caja2;await run('mostrarPerfilEnClase(__caja)');
  check('sin el SQL aplicado tampoco',caja2.innerHTML==='');
  console.log(`\nPASS: ${pruebas}   FAIL: 0`);
})().catch(e=>{console.error('  FAIL',e.message);process.exitCode=1;});
