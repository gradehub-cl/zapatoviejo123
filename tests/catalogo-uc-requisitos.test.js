// Lector de requisitos de catalogo.uc.cl. Sin red: el HTML imita la forma de
// la página (revisada el 2026-11-21) con siglas INVENTADAS, y el fetch es de
// mentira. La clave es de prueba.
const {parsearRequisitos,normalizarSiglas,siglasDeCorrida,leerTodas,subir,decodificar}=require('../bin/catalogo-uc-requisitos.js');
let ok=0,fail=0;const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const lanza=(f,re)=>{try{f();return false;}catch(e){return re.test(e.message);}};

const pagina=({pre='No tiene',rel='No tiene',res='No tiene',eq='No tiene'}={})=>`<html><head><style>.x{}</style></head><body>
<div class="contentpane"><div class="componentheading"><h1>Prerrequisitos y Restricciones</h1></div>
<div class='bloque'><table class="tablesorter tablesorter-blue">
<tr class="ui-widget-content even"><td><strong>Prerrequisitos</strong></td><td>&nbsp;&nbsp;<span>${pre}</span></td></tr>
<tr class="ui-state-default odd"><td><strong>Relaci&oacuten entre prerrequisitos <br/> y restricciones </strong> </td><td valign=top>&nbsp;&nbsp;<span>${rel}</span></td></tr>
<tr class="ui-widget-content even"><td><strong>Restricciones</strong> </td><td>&nbsp;&nbsp;<span>${res}</span></td></tr>
</table></div><div class="componentheading"><h1>Equivalencias</h1></div>
<div class='bloque'><table class="tablesorter tablesorter-blue">
<tr class="ui-state-default odd"><td><strong>Equivalencias</strong></td><td width="60%">&nbsp;&nbsp;<span>${eq}</span></td></tr>
</table></div></div></body></html>`;

(async()=>{
  console.log('\n=== Leer la página ===');
  const a=parsearRequisitos(pagina({pre:'(TST1001 y TST1002) o QQQ2000',rel:'o',res:'(Programa=Carrera Inventada)',eq:'(TST0901 o QQQ0901)'}),'TST3000');
  chk('prerrequisitos tal cual',a.prerrequisitos==='(TST1001 y TST1002) o QQQ2000');
  chk('relación sin el &oacute; con punto y coma',a.relacion==='o');
  chk('restricciones y equivalencias',a.restricciones==='(Programa=Carrera Inventada)'&&a.equivalencias==='(TST0901 o QQQ0901)');
  const b=parsearRequisitos(pagina(),'TST1001');
  chk('«No tiene» queda null',b.prerrequisitos===null&&b.relacion===null&&b.restricciones===null&&b.equivalencias===null);
  chk('correquisito intacto',parsearRequisitos(pagina({pre:'FIS0001(c) y TST1001'}),'X').prerrequisitos==='FIS0001(c) y TST1001');
  chk('relación en mayúscula se normaliza',parsearRequisitos(pagina({rel:'Y'}),'X').relacion==='y');
  chk('decodifica entidades con y sin ;',decodificar('Relaci&oacuten &amp; Programaci&oacute;n')==='Relación & Programación');

  console.log('\n=== Si algo cambia, no escribe ===');
  chk('falta una fila: cambió el formato',lanza(()=>parsearRequisitos(pagina().replace(/<tr[^]*?Restricciones[^]*?<\/tr>/,''),'X'),/Cambió el formato.*restricciones/));
  chk('página vacía: cambió el formato',lanza(()=>parsearRequisitos('<html></html>','X'),/Cambió el formato/));
  chk('relación desconocida',lanza(()=>parsearRequisitos(pagina({rel:'quizás'}),'X'),/Relación desconocida/));
  chk('captcha: se detiene',lanza(()=>parsearRequisitos('<div class="cf-turnstile"></div>','X'),/desafío o captcha/));
  chk('una combinatoria larga como la de ACT181 entra',parsearRequisitos(pagina({pre:'(TST1001 y TST1002 y TST1003) o '.repeat(80)+'TST1004'}),'X').prerrequisitos.length>2300);
  chk('texto absurdo de largo',lanza(()=>parsearRequisitos(pagina({pre:'TST1001 o '.repeat(2100)}),'X'),/demasiado largo/));

  console.log('\n=== Qué siglas leer ===');
  chk('normaliza, filtra y ordena',JSON.stringify(normalizarSiglas([' tst1002','TST1001','TST1001','no es sigla',null,'Z1']))==='["TST1001","TST1002"]');
  const corrida={version:1,periodos:[{periodo:'2027-1',secciones:[{sigla:'TST1002'},{sigla:'TST1001'},{sigla:'TST1002'}]}]};
  chk('de una corrida de BuscaCursos, sin repetir',siglasDeCorrida(corrida).join()==='TST1001,TST1002');
  chk('una corrida rara se rechaza',lanza(()=>siglasDeCorrida({version:2}),/no reconocida/));

  console.log('\n=== Lectura con red de mentira ===');
  const pedidos=[],esperas=[];
  const resp=(status,html='')=>({ok:status>=200&&status<300,status,text:async()=>html});
  const filas=await leerTodas(['TST1001','TST1002'],{log(){},esperar:async ms=>esperas.push(ms),
    fetch:async(url,op)=>{pedidos.push({url,op});return resp(200,pagina({pre:url.endsWith('TST1002')?'TST1001':'No tiene'}));}});
  chk('una página por sigla',filas.length===2&&filas[1].prerrequisitos==='TST1001');
  chk('se identifica como GradeHubBot',pedidos.every(p=>/^GradeHubBot\//.test(p.op.headers['User-Agent'])));
  chk('la ruta pública de requisitos',pedidos[0].url==='https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=requisitos&sigla=TST1001');
  chk('espera un segundo entre consultas',esperas.length===1&&esperas[0]===1000);
  let error='';
  try{await leerTodas(['TST1001','TST1002'],{log(){},esperar:async()=>{},fetch:async()=>resp(429)});}catch(e){error=e.message;}
  chk('un 429 detiene todo',/429.*Detenido/.test(error));
  error='';let intentos=0;
  try{await leerTodas(['A001','B001','C001','D001','E001','F001'].map(s=>'TST'+s.slice(1)+s[0]),{log(){},esperar:async()=>{},fetch:async()=>{intentos++;return resp(500);}});}catch(e){error=e.message;}
  chk('cinco fallos seguidos detienen todo',/5 fallos seguidos/.test(error)&&intentos===5);
  const salteadas=await leerTodas(['TST1001','TST1002'],{log(){},esperar:async()=>{},fetch:async url=>url.endsWith('TST1001')?resp(500):resp(200,pagina())});
  chk('un fallo suelto se salta y sigue',salteadas.length===1&&salteadas[0].sigla==='TST1002');

  console.log('\n=== Subida ===');
  const subidas=[];
  const muchas=Array.from({length:1203},(_,i)=>({sigla:'TST'+String(1000+i),prerrequisitos:null,relacion:null,restricciones:null,equivalencias:null}));
  const n=await subir(muchas,{url:'https://proyecto.supabase.co',clave:'sb_secret_prueba',log(){},
    fetch:async(url,op)=>{subidas.push({url,op,filas:JSON.parse(op.body)});return {ok:true,status:201};}});
  chk('todas, en lotes de 500',n===1203&&subidas.length===3&&subidas.every(s=>s.filas.length<=500));
  chk('upsert por sigla, sin borrar',subidas.every(s=>s.url==='https://proyecto.supabase.co/rest/v1/catalogo_uc_requisitos?on_conflict=sigla'&&s.op.method==='POST'&&/merge-duplicates/.test(s.op.headers.Prefer)));
  chk('las columnas de la tabla',JSON.stringify(Object.keys(subidas[0].filas[0]).sort())==='["equivalencias","leido_en","prerrequisitos","relacion","restricciones","sigla"]');
  chk('la clave va en apikey',subidas[0].op.headers.apikey==='sb_secret_prueba');
  const avisos=[];
  chk('sin clave no sube nada',await subir(muchas,{url:'https://x',clave:'',log:m=>avisos.push(m),fetch:async()=>{throw Error('no debería llamar');}})===0&&/no se subió/.test(avisos[0]));
  error='';
  try{await subir(muchas.slice(0,2),{url:'https://x',clave:'k',log(){},fetch:async()=>({ok:false,status:404,json:async()=>({code:'PGRST205'})})});}catch(e){error=e.message;}
  chk('sin tabla dice qué SQL aplicar',/catalogo_uc_requisitos\.sql/.test(error));
  error='';
  try{await subir(muchas.slice(0,2),{url:'https://x',clave:'k',log(){},fetch:async()=>({ok:false,status:401,json:async()=>({message:'detalle interno'})})});}catch(e){error=e.message;}
  chk('un error no imprime la respuesta remota',/401/.test(error)&&!/detalle interno/.test(error));
  error='';
  try{await subir([{sigla:'mal'}],{url:'https://x',clave:'k',log(){},fetch:async()=>({ok:true})});}catch(e){error=e.message;}
  chk('una sigla inválida no se sube',/Sigla inválida/.test(error));

  console.log(`\n${ok} OK, ${fail} FAIL`);
  if(fail)process.exit(1);
})();
