// Programas inventados para Canvas y huella de la salida CLI anterior al cambio.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),dir=path.join(__dirname,'fixtures','programas-sinteticos');
const ctx=vm.createContext({});
for(const f of ['src/engine/programa-pauta.js','src/app/canvas-programa.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const archivos=fs.readdirSync(dir).filter(f=>f.endsWith('.txt'));
assert(archivos.length>=25);
for(const f of archivos){
  const texto=fs.readFileSync(path.join(dir,f),'utf8'),esperado=JSON.parse(fs.readFileSync(path.join(dir,f.replace('.txt','.json'))));
  const obtenido=JSON.parse(JSON.stringify(ctx.pautaDesdeProgramaCanvas({texto},'SYN100')));
  const resumen={estado:obtenido.estado,filas:obtenido.filas.map(x=>[x.nombre,x.peso,x.cantidad]),propuestas:obtenido.propuestas||[],revisar:(obtenido.revisar||[]).map(x=>x.cita)};
  assert.deepEqual(resumen,esperado,f);
  for(const p of [...resumen.propuestas,...obtenido.revisar||[]])assert(texto.split('\n').includes(p.cita),f+' cita literal');
}
const cli=require('../bin/proponer-pautas-uc');
const filas=['catalogo-uc','catalogo-uc-benchmark'].flatMap(d=>{
  const base=path.join(__dirname,'fixtures',d);
  return fs.readdirSync(base).filter(f=>f.endsWith('.html')).sort().map(f=>{
    const e=cli.extraerEstructura(cli.decodificarCatalogo(fs.readFileSync(path.join(base,f))),{courseCode:f.slice(0,-5)});
    return [d,f,e.status,e.total,e.filas];
  });
});
assert.equal(filas.length,35);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(filas)).digest('hex'),'2707486f846d98a6268d0d8c677f94b6fc39afa00d8ed852369c6c0125984d85');
console.log('PASS '+archivos.length+' programas sintéticos y salida de pesos idéntica para los 35 programas del catálogo congelado');
