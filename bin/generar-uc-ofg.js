#!/usr/bin/env node
// Entrada: corrida completa de bin/buscacursos-uc.js (#986), con area_fg.
// No consulta red ni usa nombres de ramos/docentes para identificar OFG.
const fs=require('node:fs'),path=require('node:path');
function generarOFG(datos,periodo){
 if(datos.version!==1||datos.fuente!=='https://buscacursos.uc.cl'||!/^20\d{2}-[12]$/.test(periodo)||!Number.isFinite(Date.parse(datos.fecha)))throw Error('Fuente, fecha o período de Buscacursos no válido.');
 const secciones=datos.periodos?.find(p=>p.periodo===periodo)?.secciones;
 if(!Array.isArray(secciones)||!secciones.length)throw Error('La corrida no contiene ese período completo.');
 const areas=new Map();
 for(const s of secciones){
  if(!/^[A-Z][A-Z0-9_]{2,11}$/.test(s.sigla)||!Object.hasOwn(s,'area_fg')||(s.area_fg!==null&&typeof s.area_fg!=='string'))throw Error('La corrida no incluye Área de FG válida; vuelve a leerla con el parser de #986 actualizado.');
  const area=s.area_fg?.trim();if(!area)continue;
  if(!areas.has(s.sigla))areas.set(s.sigla,new Set());areas.get(s.sigla).add(area);
 }
 if(!areas.size)throw Error('La corrida no contiene áreas: no reemplazar la lista con una vacía.');
 const filas=[...areas].sort(([a],[b])=>a.localeCompare(b,'en')).map(([sigla,lista])=>JSON.stringify(sigla)+':'+JSON.stringify([...lista].sort()));
 return `// Generado por bin/generar-uc-ofg.js. No editar a mano.\n// Fuente: https://buscacursos.uc.cl — Área de FG, período ${periodo}.\n// Lectura: ${new Date(datos.fecha).toISOString()}; ${areas.size} siglas con área informada.\n// No se infiere OFG por nombre ni por pertenecer a una malla.\nconst UC_AREAS_FG={\n${filas.join(',\n')}\n};\n`;
}
if(require.main===module){try{
 const [entrada,periodo,salida]=process.argv.slice(2);if(!entrada||!periodo)throw Error('Uso: node bin/generar-uc-ofg.js <corrida.json> <YYYY-N> [salida.js]');
 const contenido=generarOFG(JSON.parse(fs.readFileSync(entrada,'utf8')),periodo),destino=salida||path.join(__dirname,'../src/data/uc-ofg.js');
 fs.writeFileSync(destino,contenido);console.log('Lista OFG generada desde Área de FG; no se modifican notas ni créditos.');
}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={generarOFG};
