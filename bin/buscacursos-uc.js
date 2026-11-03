#!/usr/bin/env node
// Indexación de páginas públicas para búsqueda. NUNCA usar estos datos para
// entrenar ni ajustar modelos. No login, proxies, captcha ni evasión de bloqueos.
// Referencias MIT: open-source-uc/ramos-uc y kovaxis/buscacursos-dl,
// Copyright (c) 2021 Nicolás Mc Intyre. Aviso MIT completo: docs/buscacursos-uc.md.
// Parser propio: conserva las columnas y nombres de la fuente, sin inferir datos.
/* MIT License — referencias reutilizadas bajo estas condiciones:
Copyright (c) 2021 Nicolás Mc Intyre
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
const fs=require('node:fs'),path=require('node:path');
const UA='GradeHubBot/1.0 (+https://gradehub.cl)',ORIGEN='https://buscacursos.uc.cl';
const ALFABETO='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
const entidades={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',aacute:'á',eacute:'é',iacute:'í',oacute:'ó',uacute:'ú',ntilde:'ñ',uuml:'ü'};
function decodificar(s){return s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi,(m,k)=>k[0]==='#'?String.fromCodePoint(parseInt(k.slice(k[1].toLowerCase()==='x'?2:1),k[1].toLowerCase()==='x'?16:10)):entidades[k]??entidades[k.toLowerCase()]?.toUpperCase()??m);}
function arbolHTML(html){
 const raiz={tag:'root',attrs:{},hijos:[]},pila=[raiz];
 for(const t of html.replace(/<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1>/gi,'').match(/<[^>]*>|[^<]+/g)||[]){
  if(t[0]!=='<'){pila.at(-1).hijos.push(decodificar(t));continue;}
  const cierre=t.match(/^<\/([a-z][\w-]*)/i);if(cierre){const i=pila.findLastIndex(n=>n.tag===cierre[1].toLowerCase());if(i>0)pila.length=i;continue;}
  const inicio=t.match(/^<([a-z][\w-]*)/i);if(!inicio)continue;
  const tag=inicio[1].toLowerCase(),attrs={};
  for(const a of t.slice(inicio[0].length).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[a[1].toLowerCase()]=decodificar(a[2]??a[3]??a[4]);
  const n={tag,attrs,hijos:[]};pila.at(-1).hijos.push(n);
  if(tag==='br')n.hijos.push('\n');
  if(!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag)&&!t.endsWith('/>'))pila.push(n);
 }
 return raiz;
}
function nodos(n,p){return typeof n==='string'?[]:[...(p(n)?[n]:[]),...n.hijos.flatMap(x=>nodos(x,p))];}
function texto(n){return (typeof n==='string'?n:n.hijos.map(texto).join(' ')).replace(/\s+/g,' ').trim();}
function celdas(n){return n.hijos.filter(x=>x.tag==='td');}
function entero(s,campo){if(!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s)))throw Error(`Buscacursos: ${campo} no es un entero (${s.slice(0,40)}). No se escribe nada.`);return Number(s);}
function siNo(s){if(!/^(SI|SÍ|NO)$/i.test(s))throw Error('Buscacursos: cambió una columna SI/NO. No se escribe nada.');return s.toUpperCase()!=='NO';}
function bloqueo(html){
 // El HTML normal incluye jsd/main.js de Cloudflare en segundo plano. No se
 // ejecuta: solo se distingue de una página de desafío que reemplaza resultados.
 return /cf-chl-|cf-turnstile|g-recaptcha|h-captcha|<title>\s*(Just a moment|Attention Required)|verify you are human|verifica que eres humano/i.test(html)
  ||(/challenge-platform/i.test(html)&&!(/resultadosRow(?:Par|Impar)|La búsqueda no produjo resultados\./.test(html)));
}
function opciones(arbol,nombre){const select=nodos(arbol,n=>n.tag==='select'&&n.attrs.name===nombre)[0];return select?nodos(select,n=>n.tag==='option').map(n=>n.attrs.value).filter(Boolean):[];}
function parsearBuscacursos(html){
 if(bloqueo(html))throw Error('Buscacursos presentó un desafío o captcha. Detenido; no se evade ni se escribe nada.');
 const arbol=arbolHTML(html),periodos=opciones(arbol,'cxml_semestre'),unidades=opciones(arbol,'cxml_unidad_academica').filter(x=>/^\d+$/.test(x));
 const seleccion=nodos(arbol,n=>n.tag==='select'&&n.attrs.name==='cxml_semestre')[0];
 const periodoSeleccionado=seleccion?nodos(seleccion,n=>n.tag==='option'&&n.attrs.selected!==undefined)[0]?.attrs.value:null;
 const filas=nodos(arbol,n=>n.tag==='tr'&&/\bresultadosRow(?:Par|Impar)\b/.test(n.attrs.class||''));
 const vacio=/La búsqueda no produjo resultados\./.test(texto(arbol));
 if(!periodos.length||!unidades.length||(!filas.length&&!vacio))throw Error('Buscacursos: HTML o tabla no reconocidos. No se escribe nada.');
 if(filas.length&&!/NRC[^]*Sigla[^]*Profesor[^]*Vacantes[^]*Horario/.test(texto(arbol)))throw Error('Buscacursos: encabezados no reconocidos. No se escribe nada.');
 const secciones=filas.map(f=>{
  const c=celdas(f);if(c.length!==18)throw Error(`Buscacursos: esperaba 18 columnas, recibió ${c.length}. No se escribe nada.`);
  const t=c.map(texto),sigla=t[1];if(!/^[A-Z][A-Z0-9_]{2,11}$/.test(sigla)||!t[9])throw Error('Buscacursos: sigla o nombre no reconocidos.');
  const profesores=nodos(c[10],n=>n.tag==='a').map(texto).filter(Boolean);
  if(!profesores.length&&t[10]&&!/^(\(Sin Profesores\)|Sin informar|Por Fijar|Dirección Docente)$/i.test(t[10]))profesores.push(...t[10].split(/\s*[,;]\s*/));
  const horario=nodos(c[16],n=>n.tag==='tr').map(fila=>{
   const h=celdas(fila).map(texto);if(h.length!==3)throw Error('Buscacursos: cambió el horario.');
   // «:», «L:» y «:8» son campos parciales reales de la fuente, no errores de
   // parseo. Se conserva lo informado y se deja null/[] en lo que falta.
   const m=h[0].match(/^([LMWJVSD](?:-[LMWJVSD])*)?:(\d+(?:,\d+)*)?$/);if(!m)throw Error(`Buscacursos: horario no reconocido (${h[0]}).`);
   return (m[2]?m[2].split(','):[null]).map(modulo=>({dias:m[1]?m[1].split('-'):[],modulo:modulo===null?null:entero(modulo,'módulo'),tipo:h[1],sala:h[2]}));
  }).flat();
  // Nunca convertir un horario no reconocido en una lista vacía silenciosa.
  if(!horario.length&&t[16]&&!/^(Por fijar|Sin horario|No informa)$/i.test(t[16]))throw Error('Buscacursos: horario sin estructura reconocida.');
  const vacantes_total=entero(t[13],'vacantes totales'),vacantes_disponibles=entero(t[14],'vacantes disponibles');
  if(vacantes_disponibles>vacantes_total)throw Error('Buscacursos: vacantes disponibles mayores al total.');
  return {nrc:entero(t[0],'NRC'),sigla,seccion:entero(t[4],'sección'),nombre:t[9],profesores:[...new Set(profesores)],campus:t[11],formato:t[7],creditos:entero(t[12],'créditos'),vacantes_total,vacantes_disponibles,horario,retirable:siNo(t[2]),ingles:siNo(t[3]),aprobacion_especial:siNo(t[5])};
 });
 return {secciones,periodos,periodoSeleccionado,unidades,recortado:/demasiados resultados|primeros\s+\d+\s+resultados/i.test(texto(arbol))||secciones.length>=500};
}
function periodoActual(ahora=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'numeric'}).formatToParts(ahora).map(p=>[p.type,p.value]));
 const y=Number(p.year),m=Number(p.month);return m<=2?`${y-1}-2`:m<=7?`${y}-1`:`${y}-2`;
}
function siguientePeriodo(p){return p.endsWith('-1')?p.slice(0,4)+'-2':String(Number(p.slice(0,4))+1)+'-1';}
function validarPeriodo(p){if(!/^20\d{2}-[12]$/.test(p))throw Error('Período inválido: usa YYYY-1 o YYYY-2.');return p;}
function validarCobertura(secciones,anterior=0){
 if(!secciones.length||!Number.isSafeInteger(anterior)||anterior<0)throw Error('Corrida vacía o referencia inválida. No se escribe nada.');
 if(secciones.length<anterior*.7)throw Error(`Guarda del 70%: llegaron ${secciones.length} de ${anterior} secciones anteriores. No se escribe nada.`);
}
function crearLector({fetch:pedir=fetch,esperar=ms=>new Promise(r=>setTimeout(r,ms)),reloj=Date.now,intervalo=1000}={}){
 let ultima=-Infinity,ocupado=false,consultas=0;
 return {get consultas(){return consultas;},async pedir(url){
  if(ocupado)throw Error('Solo se permite una consulta UC a la vez.');ocupado=true;
  try{for(let intento=0;intento<=3;intento++){
   await esperar(Math.max(0,Math.max(1000,intervalo)-(reloj()-ultima)));ultima=reloj();consultas++;
   let respuesta,html;
   try{respuesta=await pedir(url,{headers:{'User-Agent':UA},redirect:'error',signal:AbortSignal.timeout(60000)});html=await respuesta.text();}
   catch(e){if(intento===3)throw Error(`Buscacursos: fallo de red después de 3 reintentos (${e.name}).`);await esperar(1000*2**intento);continue;}
   if([403,429].includes(respuesta.status)||bloqueo(html))throw Error(`Buscacursos bloqueó el acceso (${respuesta.status}). Detenido, sin reintentar ni evadir.`);
   if(respuesta.ok)return html;
   if(respuesta.status<500||intento===3)throw Error(`Buscacursos respondió ${respuesta.status}. No se escribe nada.`);
   await esperar(1000*2**intento);
  }}finally{ocupado=false;}
 }};
}
function urlBusqueda(periodo,unidad,prefijo=''){
 const u=new URL(ORIGEN);u.searchParams.set('cxml_semestre',periodo);if(unidad!==undefined)u.searchParams.set('cxml_unidad_academica',unidad);if(prefijo)u.searchParams.set('cxml_sigla',prefijo.replaceAll('_',String.fromCharCode(92)+'_'));return u.href;
}
async function recolectar({lector=crearLector(),periodo=null,anteriores={},ahora=new Date(),log=console.log}={}){
 const inicio=Date.now(),actual=periodo?validarPeriodo(periodo):periodoActual(ahora),semilla=parsearBuscacursos(await lector.pedir(urlBusqueda(actual,undefined,'ZZZZZZ999')));
 if(!semilla.periodos.includes(actual)||semilla.periodoSeleccionado!==actual)throw Error(`El período ${actual} todavía no está publicado o la UC devolvió otro. No se escribe nada.`);
 const periodos=[actual];if(!periodo&&semilla.periodos.includes(siguientePeriodo(actual)))periodos.push(siguientePeriodo(actual));
 const resultado={version:1,fuente:ORIGEN,fecha:ahora.toISOString(),consultas:0,duracion_segundos:0,periodos:[]};
 for(const p of periodos){
  const secciones=new Map(),unidades=p===actual?semilla.unidades:parsearBuscacursos(await lector.pedir(urlBusqueda(p,undefined,'ZZZZZZ999'))).unidades;
  async function recorrer(unidad,prefijo=''){
   if(lector.consultas>5000)throw Error('Demasiadas consultas: se detiene sin publicar.');
   const url=urlBusqueda(p,unidad,prefijo);let pagina;
   try{pagina=parsearBuscacursos(await lector.pedir(url));}catch(e){throw Error(`${e.message} Consulta: ${url}`);}
   if(!pagina.periodos.includes(p)||pagina.periodoSeleccionado!==p)throw Error('La UC devolvió otro período. No se escribe nada.');
   // La UC busca por CONTENIDO, no solo al inicio. Cada rama cubre al menos
   // todas las siglas que empiezan por ella; los duplicados de otras posiciones
   // se unen por NRC. No descartar esas filas ni asumir una búsqueda anclada.
   for(const f of pagina.secciones){if(prefijo&&!f.sigla.includes(prefijo))throw Error(`La búsqueda ignoró el filtro ${prefijo}. No se escribe nada. Consulta: ${url}`);secciones.set(f.nrc,{periodo:p,...f});}
   if(pagina.recortado){
    if(pagina.secciones.filter(f=>f.sigla===prefijo).length>=500)throw Error('Una sola sigla supera el límite: no se puede garantizar cobertura.');
    if(prefijo.length>=12)throw Error('Una sigla sigue recortada: no se puede garantizar cobertura.');
    // Incluye todos los caracteres admitidos por sigla, no solo los ya conocidos.
    for(const ch of ALFABETO)await recorrer(unidad,prefijo+ch);
   }
  }
  for(const unidad of unidades){await recorrer(unidad);log(`${p}: unidad ${unidad}, ${secciones.size} secciones acumuladas, ${lector.consultas} consultas.`);}
  const filas=[...secciones.values()].sort((a,b)=>a.nrc-b.nrc);validarCobertura(filas,anteriores[p]||0);
  resultado.periodos.push({periodo:p,secciones:filas});log(`${p}: ${filas.length} secciones, ${unidades.length} unidades revisadas.`);
 }
 resultado.consultas=lector.consultas;resultado.duracion_segundos=Math.round((Date.now()-inicio)/1000);return resultado;
}
function correspondeProgramado(ahora=new Date(),config=require('./buscacursos-uc-config.js')){
 const partes=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(ahora).map(p=>[p.type,p.value]));
 const dia=`${partes.year}-${partes.month}-${partes.day}`;
 return Number(partes.hour)===config.horaDiaria||config.ventanasToma.some(v=>/^\d{4}-\d{2}-\d{2}$/.test(v.desde)&&/^\d{4}-\d{2}-\d{2}$/.test(v.hasta)&&v.desde<=dia&&dia<=v.hasta);
}
async function main(args=process.argv.slice(2)){
 if(args.includes('--programado')){const valor=correspondeProgramado();if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`ejecutar=${valor}\n`);console.log(valor?'Corresponde actualizar.':'Fuera de ventana; no se consulta a la UC.');return;}
 const valor=n=>{const i=args.indexOf(n);if(i<0)return null;if(!args[i+1]||args[i+1].startsWith('--'))throw Error(`Falta valor para ${n}`);return args[i+1];};
 if(args.includes('--comprobar-acceso')){const lector=crearLector(),p=validarPeriodo(valor('--periodo')||periodoActual()),d=parsearBuscacursos(await lector.pedir(urlBusqueda(p,undefined,'FIS1514')));console.log(JSON.stringify({periodo:p,acceso:'permitido',secciones:d.secciones.length,consultas:lector.consultas}));return;}
 for(const a of args.filter(x=>x.startsWith('--')))if(!['--periodo','--salida','--anterior'].includes(a))throw Error(`Opción desconocida: ${a}`);
 const destino=valor('--salida')||'.cache/buscacursos-uc.json',anterior=valor('--anterior');
 const prev=anterior?JSON.parse(fs.readFileSync(anterior,'utf8')):fs.existsSync(destino)?JSON.parse(fs.readFileSync(destino,'utf8')):null;
 const anteriores=prev?.conteos||Object.fromEntries((prev?.periodos||[]).map(p=>[p.periodo,p.secciones.length]));
 const datos=await recolectar({periodo:valor('--periodo'),anteriores});
 fs.mkdirSync(path.dirname(destino),{recursive:true});const temporal=destino+'.tmp';fs.writeFileSync(temporal,JSON.stringify(datos));fs.renameSync(temporal,destino);
 console.log(JSON.stringify({periodos:datos.periodos.map(p=>({periodo:p.periodo,leidas:p.secciones.length})),consultas:datos.consultas,duracion_segundos:datos.duracion_segundos,archivo:destino}));
}
if(require.main===module)main().catch(e=>{console.error(`::error::${e.message}`);process.exitCode=1;});
module.exports={parsearBuscacursos,crearLector,recolectar,validarCobertura,periodoActual,siguientePeriodo,correspondeProgramado,UA,urlBusqueda,main};
