#!/usr/bin/env node
// Semilla de solo datos para el consenso/banco. No publica ni aplica SQL.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const raiz=path.resolve(__dirname,'..');
function datosCatalogo(){
 const orden=JSON.parse(fs.readFileSync(path.join(raiz,'src/orden.json'),'utf8'));
 const ctx=vm.createContext({});
 vm.runInContext(orden['data.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n'),ctx);
 // Se evalúa la misma puerta del cliente; este archivo no ejecuta carga ni sync.
 vm.runInContext(fs.readFileSync(path.join(raiz,'src/app/persistencia-y-normalizacion.js'),'utf8'),ctx);
 return {datos:vm.runInContext('({presets:PRESETS_POR_TENANT,creditos:CREDITOS_UC,siglas:SIGLAS_UC})',ctx),resolver:vm.runInContext('definicionDeSeccion',ctx)};
}
function registroPautas(datos,resolver){
 const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(),filas=[],retirar=[];
 for(const [tenant,presets]of Object.entries(datos.presets))for(const [nombre,def]of Object.entries(presets)){
  const siglas=new Set(tenant==='uc'?[datos.creditos[nombre]?.[1],...Object.values(datos.siglas).map(x=>x[nombre])].filter(Boolean):[]);
  const clave=def.sigla||(siglas.size===1?[...siglas][0]:norm(nombre));
  const periodo=(!Array.isArray(def)&&def.periodo)||'';
  const secciones=def.coordinado===false&&def.porSeccion?Object.keys(def.porSeccion).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=999).sort((a,b)=>a-b):[null];
  if(def.coordinado===false)retirar.push({tenant,clave});
  for(const seccion of secciones){
   const propia=resolver(def,seccion);
   if(!(Array.isArray(propia)?propia:propia.evals)?.length)continue;
   filas.push({tenant,clave:seccion==null?clave:clave+'-'+seccion,nombre,nombre_norm:norm(nombre),periodo,definicion:propia});
  }
 }
 return JSON.parse(JSON.stringify({filas,retirar}));
}
function pautasCatalogo(){const {datos,resolver}=datosCatalogo();return registroPautas(datos,resolver).filas;}
function semillaSQL(registro){
 const json=v=>JSON.stringify(v).replace(/'/g,"''");
 const filas=('['+'\n'+registro.filas.map(f=>JSON.stringify(f)).join(',\n')+'\n'+']').replace(/'/g,"''");
 return `-- BEGIN REGISTRO_GENERADO\n-- Solo retira la clave antigua sin sección; no borra reportes ni pautas propias.\ndelete from public.pautas_catalogo_registro p using jsonb_to_recordset('${json(registro.retirar)}'::jsonb) as x(tenant text,clave text) where p.tenant=x.tenant and p.clave=x.clave;\ninsert into public.pautas_catalogo_registro(tenant,clave,periodo,nombre,nombre_norm,definicion) select tenant,clave,periodo,nombre,nombre_norm,definicion from jsonb_to_recordset('${filas}'::jsonb) as x(tenant text,clave text,periodo text,nombre text,nombre_norm text,definicion jsonb) on conflict(tenant,clave,periodo) do update set nombre=excluded.nombre,nombre_norm=excluded.nombre_norm,definicion=excluded.definicion;\n-- END REGISTRO_GENERADO`;
}
if(require.main===module){
 const archivo=path.join(raiz,'supabase/consenso_periodo.sql'),sql=fs.readFileSync(archivo,'utf8');
 const {datos,resolver}=datosCatalogo(),registro=registroPautas(datos,resolver);
 const bloque=sql.includes('-- BEGIN REGISTRO_GENERADO')?/-- BEGIN REGISTRO_GENERADO[\s\S]*?-- END REGISTRO_GENERADO/:/insert into public\.pautas_catalogo_registro\([\s\S]*?definicion=excluded\.definicion;/;
 if(!bloque.test(sql))throw Error('No se encontró el bloque de la semilla');
 const actualizado=sql.replace(bloque,()=>semillaSQL(registro));
 if(actualizado!==sql)fs.writeFileSync(archivo,actualizado);console.log(registro.filas.length+' pautas registradas; SQL no aplicado');
}
module.exports={pautasCatalogo,registroPautas,semillaSQL,datosCatalogo};
