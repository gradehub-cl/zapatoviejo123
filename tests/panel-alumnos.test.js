// Panel de alumnos: el lado del navegador. Que la app y el SQL emparejen cada
// prueba igual, que el link se guarde y salga de la barra, que compartir parta
// sin nada elegido y que el promedio sea el de ramoAvg. Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {PGlite}=require('@electric-sql/pglite');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function contexto({search='',sesion=false}={}){
  const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
  const almacen=new Map(),historial=[];
  const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
    document:{getElementById:()=>el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
    navigator:{},location:{origin:'https://gradehub.cl',pathname:'/',hash:'',search},
    history:{replaceState:(a,b,url)=>historial.push(url)},URLSearchParams,
    setTimeout:f=>{f();return 1;},clearTimeout(){},console,URL};
  vm.createContext(ctx);
  vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
  vm.runInContext(`var supabaseClient=${sesion?'{rpc:async()=>({data:[],error:null})}':'null'};var currentUser=${sesion?'{id:"u"}':'null'};`,ctx);
  vm.runInContext(leer('marketplace.js'),ctx);
  return {run:c=>vm.runInContext(c,ctx),almacen,historial};
}

(async()=>{
  console.log('=== La app y el SQL emparejan las pruebas igual ===');
  const db=new PGlite();
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec("create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$; create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb not null);");
  await db.exec(leer('supabase/clases_particulares.sql'));
  await db.exec(leer('supabase/curso_posicion.sql'));
  await db.exec(leer('supabase/profesor_alumnos.sql'));
  const a=contexto();
  const nombres=['Interrogación 1','interrogacion  1','INTERROGACIÓN 1',' Control   N°2 ','Examen Final','Año','Ñandú Ü','Pregunta 1 — Parte A','',null];
  let iguales=true;
  for(const n of nombres){
    const sql=(await db.query('select clave_evaluacion($1) c',[n])).rows[0].c;
    const js=a.run(`claveEvaluacionPanel(${JSON.stringify(n)})`);
    if(sql!==js){iguales=false;console.log('    distinto:',JSON.stringify(n),sql,js);}
  }
  chk('misma clave en JS y en SQL para nombres con tildes, mayúsculas y espacios',iguales);
  chk('las tres formas de escribir la I1 son la misma prueba',a.run(`new Set(['Interrogación 1','interrogacion  1','INTERROGACIÓN 1'].map(claveEvaluacionPanel)).size`)===1);

  console.log('\n=== El link del profesor ===');
  chk('un código válido se acepta en mayúsculas',a.run(`codigoProfeValido(' ab3cdefg ')`)==='AB3CDEFG');
  chk('con letras ambiguas (O, I, 0, 1) no',a.run(`codigoProfeValido('ABCDEFG0')`)===null&&a.run(`codigoProfeValido('ABCDEFGI')`)===null);
  chk('el link apunta a gradehub.cl también desde la app iOS',a.run(`linkAlumnosProfesor('AB3CDEFG')`)==='https://gradehub.cl/?profe=AB3CDEFG');
  const b=contexto({search:'?profe=ab3cdefg&x=1'});
  chk('al abrir el link se guarda el código para después del login',b.almacen.get('gradehub_profe_pendiente')==='AB3CDEFG');
  chk('y sale de la barra de direcciones, sin tocar lo demás',b.historial[0]==='/?x=1');
  const c=contexto({search:'?profe=<script>'});
  chk('un código inválido no se guarda',!c.almacen.has('gradehub_profe_pendiente'));
  chk('sin sesión no se ofrece compartir todavía',(await b.run('revisarInvitacionProfesor()'))===false&&b.almacen.get('gradehub_profe_pendiente')==='AB3CDEFG');

  console.log('\n=== Compartir parte sin nada elegido ===');
  const hoja=a.run(`hojaInvitacionProfesorHTML({nombre_publico:'Academia <b>X</b>'},[{id:'r1',nombre:'Cálculo II',sigla:'MAT1620'},{id:'r2',nombre:'Física',sigla:'FIS1514'}],'Cami')`);
  chk('cada ramo es una casilla, ninguna marcada',(hoja.match(/data-compartir-ramo/g)||[]).length===2&&!/checked/.test(hoja));
  chk('el botón Compartir parte deshabilitado',/id="compartir-si" disabled/.test(hoja));
  chk('dice qué ve el profesor y dónde dejar de compartir',/cada nota de esos ramos/.test(hoja)&&/Ajustes → Datos y cuenta/.test(hoja));
  chk('el nombre del profesor va escapado',/Academia &lt;b&gt;X&lt;\/b&gt;/.test(hoja));

  console.log('\n=== Lo que ve el profesor ===');
  a.run(`globalThis.__r={id:'r1',nombre:'Cálculo II',sigla:'MAT1620',color:'#7F77DD',gates:[],categorias:[
    {id:'c1',nombre:'Interrogaciones',peso:60,notas:[{id:'n1',nombre:'Interrogación 1',valor:4.2},{id:'n2',nombre:'Interrogación 2',valor:5.6}]},
    {id:'c2',nombre:'Examen',peso:40,notas:[]}]}`);
  const html=a.run(`ramoPanelHTML(__r,{ramo:{promedio:4.7,personas:23},evaluaciones:[{clave:'interrogacion 1',nombre:'Interrogación 1',promedio:4.6,personas:9}]})`);
  const prom=a.run('fmtPromedio(ramoAvg(ramoParaPanel(__r)))');
  chk('el promedio es el de ramoAvg, el mismo de la app del alumno',html.includes(prom+'<small>promedio</small>'));
  chk('cada nota con su promedio de GradeHub cuando hay',/Interrogación 1<\/td><td>4\.2<\/td><td><span class="panel-alumnos-gh">4\.6<small>9 personas/.test(html));
  chk('y "aún pocos datos" cuando no',/Interrogación 2<\/td><td>5\.6<\/td><td><span class="panel-alumnos-sin">Aún pocos datos/.test(html));
  chk('el ramo completo contra GradeHub, con la etiqueta',/4\.7<small>GradeHub · 23 personas/.test(html));
  chk('las evaluaciones sin nota no aparecen como 1,0',!/Examen<\/td>/.test(html));

  console.log('\n=== Medición sin datos de nadie ===');
  const mk=leer('marketplace.js');
  chk('solo cuenta cuántos ramos o alumnos, nunca nombres ni notas',
    /track\('compartir_con_profesor',\{ramos:n\}\)/.test(mk)&&/track\('panel_alumnos_abierto',\{alumnos:alumnos\.length\}\)/.test(mk));

  console.log('\n=== Lo que no se deshace se confirma (HIG) ===');
  chk('dejar de compartir, quitar alumno y cambiar link usan el diálogo de la app',
    (mk.match(/showConfirm\(/g)||[]).length>=3&&!/Toca de nuevo/.test(mk));
  chk('con Cancelar a mano',(mk.match(/focusCancel:true/g)||[]).length>=3);

  console.log('\n=== Términos y privacidad lo dicen ===');
  const terminos=leer('terminos.html'),privacidad=leer('privacidad.html');
  chk('los términos explican qué ve el profesor y cómo dejar de compartir',
    /Compartir tus notas con un profesor/.test(terminos)&&/dejar de\s+compartir/.test(terminos)&&/al menos cinco personas/.test(terminos));
  chk('y lo que se compromete el profesor',/no las copias, no las publicas/.test(terminos));
  chk('la privacidad ya no dice "con nadie" a secas',/Con nadie, salvo que tú lo decidas/.test(privacidad)&&/Con un profesor, si tú lo eliges/.test(privacidad));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
