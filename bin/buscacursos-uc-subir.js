#!/usr/bin/env node
// Solo servidor/Actions; secreto en el entorno, jamás en el cliente o en logs.
const fs=require('node:fs'),{randomUUID}=require('node:crypto');
const {filas,busquedaDe}=require('./catalogo-uc-csv.js');
const {urlDelProyecto}=require('./catalogo-uc-subir.js');
const {validarCobertura}=require('./buscacursos-uc.js');
function prepararLotes(datos,{catalogo=filas(),log=console.log}={}){
 if(datos.version!==1||!Array.isArray(datos.periodos)||!datos.periodos.length)throw Error('Corrida no reconocida.');
 const oficiales=new Map(catalogo.map(f=>[f.sigla,f])),divergencias=new Set();
 return datos.periodos.map(p=>{
  validarCobertura(p.secciones);const vistos=new Set();
  const secciones=p.secciones.map(s=>{
   if(s.periodo!==p.periodo||vistos.has(s.nrc))throw Error('Período inconsistente o NRC repetido.');vistos.add(s.nrc);
   const oficial=oficiales.get(s.sigla);
   if(oficial&&oficial.creditos!==s.creditos&&!divergencias.has(s.sigla)){log(`Créditos distintos ${s.sigla}: Buscacursos=${s.creditos}; cursos-uc.js=${oficial.creditos}. Se conservan los del respaldo en el catálogo.`);divergencias.add(s.sigla);}
   return {...s,busqueda:busquedaDe(s.nombre),creditos_catalogo:oficial?oficial.creditos:s.creditos};
  });return {periodo:p.periodo,secciones};
 });
}
async function peticion(url,clave,ruta,{fetch:pedir=fetch,...op}={}){
 const r=await pedir(`${url}/rest/v1/${ruta}`,{...op,headers:{apikey:clave,'Content-Type':'application/json',...op.headers},signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw Error(`Supabase ${r.status} en ${ruta.split('?')[0]}; no se publica la corrida.`);
 return r;
}
async function conteos({url,clave,fetch}){
 const r=await peticion(url,clave,'catalogo_uc_secciones?select=periodo&vigente=eq.true&order=periodo,nrc',{fetch,method:'GET',headers:{Range:'0-999','Range-Unit':'items',Prefer:'count=exact'}});
 const filas=await r.json(),conteos={};for(const f of filas)conteos[f.periodo]=(conteos[f.periodo]||0)+1;
 // La base puede superar el límite REST de 1000: paginar sin perder referencia.
 const total=Number(r.headers.get('content-range')?.split('/')[1]);if(!Number.isSafeInteger(total))throw Error('Supabase no informó el total para la guarda del 70%.');
 if(filas.length>total||(!filas.length&&total>0))throw Error('Referencia incompleta para la guarda del 70%.');
 for(let inicio=filas.length;inicio<total;){const otra=await peticion(url,clave,'catalogo_uc_secciones?select=periodo&vigente=eq.true&order=periodo,nrc',{fetch,method:'GET',headers:{Range:`${inicio}-${inicio+999}`,'Range-Unit':'items'}});const pagina=await otra.json();if(!pagina.length||inicio+pagina.length>total)throw Error('Referencia incompleta para la guarda del 70%.');for(const f of pagina)conteos[f.periodo]=(conteos[f.periodo]||0)+1;inicio+=pagina.length;}
 return {conteos};
}
async function subir({datos,url,clave,fetch,catalogo,log=console.log}){
 if(!clave){log('::notice::Falta SUPABASE_SECRET_KEY: no se subió ni modificó nada.');return [];}
 const periodos=prepararLotes(datos,{catalogo,log}),estado=await conteos({url,clave,fetch});
 // Validar TODOS los períodos antes de escribir el primer lote.
 for(const p of periodos)validarCobertura(p.secciones,estado.conteos[p.periodo]||0);
 const resumen=[];
 for(const p of periodos){const carga_id=randomUUID();
  for(let i=0;i<p.secciones.length;i+=1000){const lote=p.secciones.slice(i,i+1000).map(datos=>({carga_id,periodo:p.periodo,nrc:datos.nrc,datos}));
   await peticion(url,clave,'catalogo_uc_secciones_lotes?on_conflict=carga_id,periodo,nrc',{fetch,method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(lote)});
  }
  const r=await peticion(url,clave,'rpc/catalogo_uc_secciones_consolidar',{fetch,method:'POST',body:JSON.stringify({p_carga_id:carga_id,p_periodo:p.periodo,p_total:p.secciones.length})});resumen.push(await r.json());
 }
 return resumen;
}
async function main(args=process.argv.slice(2)){
 const clave=process.env.SUPABASE_SECRET_KEY;if(!clave){console.log('::notice::Falta SUPABASE_SECRET_KEY: no se subió ni modificó nada.');if(args[0]==='--estado'&&args[1])fs.writeFileSync(args[1],JSON.stringify({conteos:{}}));return;}
 const url=urlDelProyecto();if(args[0]==='--estado'){if(!args[1])throw Error('Falta archivo de estado.');fs.writeFileSync(args[1],JSON.stringify(await conteos({url,clave})));return;}
 const datos=JSON.parse(fs.readFileSync(args[0]||'.cache/buscacursos-uc.json','utf8'));
 console.log(JSON.stringify({resumen:await subir({datos,url,clave}),consultas_uc:datos.consultas,duracion_lectura_segundos:datos.duracion_segundos}));
}
if(require.main===module)main().catch(e=>{console.error(`::error::${e.message}`);process.exitCode=1;});
module.exports={prepararLotes,subir,conteos};
