// catalogo_uc se actualiza sola cuando cursos-uc.js cambia en main
// (bin/catalogo-uc-subir.js + .github/workflows/catalogo-uc.yml). Sin red: el
// fetch es de mentira y la clave es de prueba.
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..');
const {subir,urlDelProyecto}=require('../bin/catalogo-uc-subir.js');
const {filas}=require('../bin/catalogo-uc-csv.js');
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};

(async()=>{
  const lista=filas();
  const pedidos=[];
  const falso=async(url,op)=>{pedidos.push({url,op,filas:JSON.parse(op.body)});return {ok:true,text:async()=>''};};
  const n=await subir({lista,url:'https://proyecto.supabase.co',clave:'sb_secret_prueba',fetch:falso});

  console.log('\n=== Subida ===');
  chk('todas las filas del generador del CSV', n===lista.length&&pedidos.reduce((s,p)=>s+p.filas.length,0)===lista.length);
  chk('en lotes de a mil', pedidos.length===Math.ceil(lista.length/1000)&&pedidos.every(p=>p.filas.length<=1000));
  chk('upsert por sigla, sin borrar', pedidos.every(p=>p.url==='https://proyecto.supabase.co/rest/v1/catalogo_uc?on_conflict=sigla'
    &&p.op.method==='POST'&&/resolution=merge-duplicates/.test(p.op.headers.Prefer)));
  chk('la clave va en apikey', pedidos[0].op.headers.apikey==='sb_secret_prueba');
  chk('con las columnas de la tabla', JSON.stringify(Object.keys(pedidos[0].filas[0]).sort())==='["busqueda","creditos","nombre","sigla"]');
  chk('los nombres ya corregidos (#730)', lista.some(f=>f.sigla==='FIL2001'&&f.nombre==='Filosofía: ¿Para que?'));

  console.log('\n=== Errores ===');
  let error='';
  try{await subir({lista:lista.slice(0,5),url:'https://x',clave:'k',fetch:async()=>({ok:false,status:401,text:async()=>'Invalid API key'})});}
  catch(e){error=e.message;}
  chk('una respuesta mala falla con su motivo', /401/.test(error)&&/Invalid API key/.test(error));

  console.log('\n=== Configuración ===');
  chk('la URL del proyecto sale de la app', urlDelProyecto()===(fs.readFileSync(path.join(raiz,'app-session.js'),'utf8').match(/const SUPABASE_URL\s*=\s*'([^']+)'/)||[])[1]);
  const wf=fs.readFileSync(path.join(raiz,'.github/workflows/catalogo-uc.yml'),'utf8');
  chk('el workflow corre solo en main cuando cambia cursos-uc.js', /branches: \[main\]/.test(wf)&&/paths: \[cursos-uc\.js\]/.test(wf)&&!/pull_request/.test(wf));
  chk('el secreto vive en un environment, nunca en el código', /environment: supabase/.test(wf)&&/secrets\.SUPABASE_SECRET_KEY/.test(wf)
    &&!/sb_secret_[A-Za-z0-9]{8,}/.test(fs.readFileSync(path.join(raiz,'bin/catalogo-uc-subir.js'),'utf8')));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
