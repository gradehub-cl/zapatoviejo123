// Sigla de cada universidad con su color institucional (Lucas, 2026-11-18).
// Solo color con iniciales: nada de logos. La sigla se lee sobre su fondo.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const ctx={};vm.createContext(ctx);vm.runInContext(leer('data.js')+';this.__T=TENANTS;',ctx);
const T=ctx.__T;
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const contraste=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m);return (x+0.05)/(y+0.05);};
const esperado={fen:'#004B93',uc:'#173F8A',uai:'#1D1E20',uandes:'#E00034',udd:'#005293'};
for(const [code,fondo] of Object.entries(esperado)){
  const t=T[code];assert(t&&t.colores,code+' tiene colores');
  assert.equal(t.colores.fondo,fondo,code+': fondo del manual de marca');
  assert(contraste(t.colores.fondo,t.colores.texto)>=4.5,code+': sigla legible (≥ 4,5:1)');
  assert(/^Universidad |^Pontificia Universidad /.test(t.nombreCompleto),code+': nombre completo');
}
assert.equal(T.uc.colores.texto,'#FEC60D','UC: sigla en amarillo');
// El nombre corto del resto de la app no cambia.
assert.equal(T.uc.name,'U. Católica');assert.equal(T.uandes.name,'U. de los Andes');
const fuente=leer('src/app/identidad.js');
assert(/tenant-badge-color/.test(fuente)&&/--tb-fondo/.test(fuente),'la marca usa los colores');
assert(/nombreCompleto/.test(leer('src/app/catalogo-remoto.js')),'al elegir universidad se ve el nombre completo');
console.log('OK universidades: color institucional legible y nombre completo al elegir');
