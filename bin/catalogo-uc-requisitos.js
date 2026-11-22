#!/usr/bin/env node
// Lee los requisitos de cursos UC desde catalogo.uc.cl (view=requisitos) y,
// con --subir, los guarda en public.catalogo_uc_requisitos.
//
// Indexación de páginas públicas: robots.txt no bloquea /index.php. Una
// consulta por segundo, identificada como GradeHubBot; sin login, proxies ni
// evasión de bloqueos. Ante un desafío o un cambio de formato se detiene sin
// escribir nada. Nunca borra filas: solo agrega o actualiza.
//
// Una sigla que no existe devuelve la misma página que un curso sin
// requisitos («No tiene» en todo). Por eso solo se leen siglas que sabemos que
// existen: las de la oferta de BuscaCursos.
//
//   node bin/catalogo-uc-requisitos.js --periodo 2027-1        # oferta en Supabase
//   node bin/catalogo-uc-requisitos.js --corrida .cache/buscacursos-uc.json
//   node bin/catalogo-uc-requisitos.js --siglas MAT1610,MAT1620
//   SUPABASE_SECRET_KEY=… node bin/catalogo-uc-requisitos.js --subir [archivo]
//
// La lectura deja .cache/catalogo-uc-requisitos.json; --subir sube ese archivo.
// La clave secreta se lee del entorno y nunca se imprime.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {urlDelProyecto}=require('./catalogo-uc-subir.js');

const UA='GradeHubBot/1.0 (+https://gradehub.cl)';
const CATALOGO='https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=requisitos&sigla=';
const SALIDA=path.join(__dirname,'..','.cache','catalogo-uc-requisitos.json');
const SIGLA_RE=/^[A-Z][A-Z0-9_]{2,11}$/;
const LARGO_MAXIMO=20000,ESPERA_MS=1000,TIMEOUT_MS=15000,MAX_FALLOS_SEGUIDOS=5;
const ENTIDADES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',aacute:'á',eacute:'é',iacute:'í',oacute:'ó',uacute:'ú',ntilde:'ñ',uuml:'ü'};

// El catálogo escribe «Relaci&oacuten» sin punto y coma: se acepta sin él.
const ENTIDAD_SIN_CIERRE_RE=new RegExp('&('+Object.keys(ENTIDADES).sort((a,b)=>b.length-a.length).join('|')+')','gi');
function decodificar(s){
  return String(s).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(m,k)=>{
    if(k[0]==='#')return String.fromCodePoint(parseInt(k.slice(k[1].toLowerCase()==='x'?2:1),k[1].toLowerCase()==='x'?16:10));
    return ENTIDADES[k.toLowerCase()]??m;
  }).replace(ENTIDAD_SIN_CIERRE_RE,(m,k)=>ENTIDADES[k.toLowerCase()]);
}
function textoPlano(html){return decodificar(String(html).replace(/<br\s*\/?>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();}
function valor(t){return !t||/^no tiene$/i.test(t)?null:t;}

function bloqueo(html){
  return /cf-chl-|cf-turnstile|g-recaptcha|h-captcha|<title>\s*(Just a moment|Attention Required)|verify you are human|verifica que eres humano/i.test(html);
}

// Una fila por sigla con los cuatro campos. Si falta alguno, cambió el formato
// y se lanza: preferimos no escribir nada a guardar algo a medias. El largo
// máximo es holgado porque ACT181 escribe entera la combinatoria «3 de 10».
function parsearRequisitos(html,sigla){
  if(bloqueo(html))throw Error('El catálogo presentó un desafío o captcha. Detenido; no se evade ni se escribe nada.');
  const campos={};
  for(const m of String(html).matchAll(/<tr\b[^>]*>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)){
    const etiqueta=textoPlano(m[1]).toLowerCase(),contenido=textoPlano(m[2]);
    if(etiqueta.startsWith('prerrequisitos'))campos.prerrequisitos=contenido;
    else if(etiqueta.startsWith('relaci'))campos.relacion=contenido;
    else if(etiqueta.startsWith('restricciones'))campos.restricciones=contenido;
    else if(etiqueta.startsWith('equivalencias'))campos.equivalencias=contenido;
  }
  const faltan=['prerrequisitos','relacion','restricciones','equivalencias'].filter(k=>campos[k]===undefined);
  if(faltan.length)throw Error(`Cambió el formato del catálogo en ${sigla}: falta ${faltan.join(', ')}. No se escribe nada.`);
  const relacion=valor(campos.relacion);
  if(relacion!==null&&!/^(y|o)$/i.test(relacion))throw Error(`Relación desconocida en ${sigla}: «${relacion}». No se escribe nada.`);
  for(const k of ['prerrequisitos','restricciones','equivalencias'])
    if(campos[k].length>LARGO_MAXIMO)throw Error(`Texto demasiado largo en ${sigla} (${k}). No se escribe nada.`);
  return {sigla,prerrequisitos:valor(campos.prerrequisitos),relacion:relacion&&relacion.toLowerCase(),
    restricciones:valor(campos.restricciones),equivalencias:valor(campos.equivalencias)};
}

function normalizarSiglas(lista){
  return [...new Set((lista||[]).map(s=>String(s||'').trim().toUpperCase()).filter(s=>SIGLA_RE.test(s)))].sort();
}

function siglasDeCorrida(datos){
  if(!datos||datos.version!==1||!Array.isArray(datos.periodos))throw Error('Corrida de BuscaCursos no reconocida.');
  return normalizarSiglas(datos.periodos.flatMap(p=>(p.secciones||[]).map(s=>s.sigla)));
}

function claveAnonDelProyecto(){
  const fuente=fs.readFileSync(path.join(__dirname,'..','app-session.js'),'utf8');
  return (fuente.match(/const SUPABASE_ANON_KEY\s*=\s*'(sb_publishable_[^']+)'/)||[])[1];
}

// La oferta vigente de un período por la RPC pública, de a 1000 filas.
async function siglasDePeriodo(periodo,{url=urlDelProyecto(),clave=claveAnonDelProyecto(),fetch:pedir=fetch}={}){
  if(!/^20\d{2}-[12]$/.test(periodo))throw Error('Período inválido: usa 2027-1 o 2027-2.');
  if(!url||!clave)throw Error('No encontré la URL o la clave pública del proyecto en app-session.js (corre npm run build).');
  const siglas=[];
  for(let desde=0;;desde+=1000){
    const r=await pedir(`${url}/rest/v1/rpc/catalogo_uc_secciones_publicas`,{method:'POST',
      headers:{apikey:clave,'Content-Type':'application/json'},
      body:JSON.stringify({p_periodo:periodo,p_desde:desde}),signal:AbortSignal.timeout(60000)});
    if(!r.ok)throw Error(`Supabase ${r.status} al leer la oferta de ${periodo}.`);
    const filas=await r.json();
    siglas.push(...filas.map(f=>f.sigla));
    if(filas.length<1000)break;
  }
  const lista=normalizarSiglas(siglas);
  if(!lista.length)throw Error(`No hay oferta de ${periodo} en Supabase. Corre primero BuscaCursos.`);
  return lista;
}

async function leerTodas(siglas,{fetch:pedir=fetch,esperar=ms=>new Promise(r=>setTimeout(r,ms)),log=console.log}={}){
  const filas=[];
  let seguidos=0;
  for(const [i,sigla] of siglas.entries()){
    if(i)await esperar(ESPERA_MS);
    let html;
    try{
      const r=await pedir(CATALOGO+encodeURIComponent(sigla),{headers:{'User-Agent':UA},signal:AbortSignal.timeout(TIMEOUT_MS)});
      if(r.status===403||r.status===429)throw Object.assign(Error(`El catálogo respondió ${r.status}. Detenido; no se escribe nada.`),{fatal:true});
      if(!r.ok)throw Error(`HTTP ${r.status}`);
      html=await r.text();
    }catch(e){
      if(e.fatal)throw e;
      seguidos++;
      log(`No se pudo leer ${sigla} (${e.message}).`);
      if(seguidos>=MAX_FALLOS_SEGUIDOS)throw Error(`${seguidos} fallos seguidos. Detenido; no se escribe nada.`);
      continue;
    }
    seguidos=0;
    filas.push(parsearRequisitos(html,sigla));
    if((i+1)%100===0)log(`${i+1}/${siglas.length}`);
  }
  return filas;
}

async function subir(filas,{url=urlDelProyecto(),clave=process.env.SUPABASE_SECRET_KEY,fetch:pedir=fetch,log=console.log}={}){
  if(!clave){log('Falta SUPABASE_SECRET_KEY: no se subió ni modificó nada.');return 0;}
  if(!Array.isArray(filas)||!filas.length)throw Error('No hay filas que subir.');
  for(const f of filas)if(!SIGLA_RE.test(f.sigla))throw Error(`Sigla inválida: ${f.sigla}. No se sube nada.`);
  const leido_en=new Date().toISOString();
  let n=0;
  for(let i=0;i<filas.length;i+=500){
    const lote=filas.slice(i,i+500).map(f=>({sigla:f.sigla,prerrequisitos:f.prerrequisitos,relacion:f.relacion,
      restricciones:f.restricciones,equivalencias:f.equivalencias,leido_en}));
    const r=await pedir(`${url}/rest/v1/catalogo_uc_requisitos?on_conflict=sigla`,{method:'POST',
      headers:{apikey:clave,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(lote),signal:AbortSignal.timeout(60000)});
    if(!r.ok){
      // No imprimir la respuesta remota: puede traer detalles internos.
      const error=await r.json().catch(()=>null);
      if(['PGRST205','42P01'].includes(error?.code))
        throw Error('Falta la tabla. Aplica supabase/catalogo_uc_requisitos.sql y vuelve a ejecutar.');
      throw Error(`Supabase ${r.status} al subir requisitos (lote ${i/500+1}).`);
    }
    n+=lote.length;
  }
  return n;
}

function opcion(args,nombre){const i=args.indexOf(nombre);return i<0?undefined:(args[i+1]??'');}

async function main(args=process.argv.slice(2)){
  if(args.includes('--subir')){
    const archivo=args[args.indexOf('--subir')+1]||SALIDA;
    const datos=JSON.parse(fs.readFileSync(archivo,'utf8'));
    console.log(`Subidas ${await subir(datos.filas)} filas.`);
    return;
  }
  let siglas;
  if(opcion(args,'--siglas')!==undefined)siglas=normalizarSiglas(opcion(args,'--siglas').split(','));
  else if(opcion(args,'--periodo')!==undefined)siglas=await siglasDePeriodo(opcion(args,'--periodo'));
  else siglas=siglasDeCorrida(JSON.parse(fs.readFileSync(opcion(args,'--corrida')||path.join(__dirname,'..','.cache','buscacursos-uc.json'),'utf8')));
  if(!siglas.length)throw Error('No hay siglas que leer.');
  console.log(`Leyendo ${siglas.length} siglas, una por segundo (~${Math.ceil(siglas.length/60)} min).`);
  const filas=await leerTodas(siglas);
  fs.mkdirSync(path.dirname(SALIDA),{recursive:true});
  fs.writeFileSync(SALIDA,JSON.stringify({version:1,leido:new Date().toISOString(),filas},null,1));
  const con=filas.filter(f=>f.prerrequisitos).length;
  console.log(`Listo: ${filas.length} de ${siglas.length} siglas, ${con} con prerrequisitos. Quedó en ${path.relative(process.cwd(),SALIDA)}.`);
}

if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={parsearRequisitos,normalizarSiglas,siglasDeCorrida,siglasDePeriodo,leerTodas,subir,decodificar};
