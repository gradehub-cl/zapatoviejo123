#!/usr/bin/env node
// Semilla de solo datos para el consenso/banco. No publica ni aplica SQL.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const raiz=path.resolve(__dirname,'..');
function pautasCatalogo(){
 const orden=JSON.parse(fs.readFileSync(path.join(raiz,'src/orden.json'),'utf8'));
 const ctx=vm.createContext({});
 vm.runInContext(orden['data.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n'),ctx);
 const datos=vm.runInContext('({presets:PRESETS_POR_TENANT,creditos:CREDITOS_UC,siglas:SIGLAS_UC})',ctx);
 const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(),filas=[];
 for(const [tenant,presets]of Object.entries(datos.presets))for(const [nombre,def]of Object.entries(presets)){
  if(!(Array.isArray(def)?def:def.evals)?.length)continue;
  const siglas=new Set(tenant==='uc'?[datos.creditos[nombre]?.[1],...Object.values(datos.siglas).map(x=>x[nombre])].filter(Boolean):[]);
  const clave=def.sigla||(siglas.size===1?[...siglas][0]:norm(nombre));
  filas.push({tenant,clave,nombre,nombre_norm:norm(nombre),periodo:(!Array.isArray(def)&&def.periodo)||'',definicion:def});
 }
 return JSON.parse(JSON.stringify(filas));
}
if(require.main===module){
 const archivo=path.join(raiz,'supabase/consenso_periodo.sql'),sql=fs.readFileSync(archivo,'utf8');
 const filas=pautasCatalogo(),json=JSON.stringify(filas,null,2).replace(/'/g,"''");
 const semilla="insert into public.pautas_catalogo_registro(tenant,clave,periodo,nombre,nombre_norm,definicion) select tenant,clave,periodo,nombre,nombre_norm,definicion from jsonb_to_recordset('"+json+"'::jsonb) as x(tenant text,clave text,periodo text,nombre text,nombre_norm text,definicion jsonb) on conflict(tenant,clave,periodo) do update set nombre=excluded.nombre,nombre_norm=excluded.nombre_norm,definicion=excluded.definicion;";
 const actualizado=sql.replace(/insert into public\.pautas_catalogo_registro\([\s\S]*?definicion=excluded\.definicion;/,semilla);
 if(!sql.includes('insert into public.pautas_catalogo_registro('))throw Error('No se encontró el bloque de la semilla');
 if(actualizado!==sql)fs.writeFileSync(archivo,actualizado);console.log(filas.length+' pautas registradas; SQL no aplicado');
}
module.exports={pautasCatalogo};
