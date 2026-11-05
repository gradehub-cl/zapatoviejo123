// Perfiles sintéticos. El editor conserva la compatibilidad de los anuncios.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8');
const ctx={console,URL,esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),currentUser:{id:'p'},supabaseClient:null};
vm.createContext(ctx);vm.runInContext(read('marketplace.js'),ctx);const run=s=>vm.runInContext(s,ctx);
const base={nombre_publico:'Profe sintética',presentacion:'Descripción de una cuenta existente ficticia.',tipo_perfil:'profesor',universidades:['uc'],perfil_publico:true,ramos:'SYN101'};
const val=e=>run(`validarPerfilProfesor(${JSON.stringify(e)})`);
assert(val(base).ok);assert(!('en_directorio' in val(base).datos));
const nuevo={...base,en_directorio:true,categorias:['clases','laboratorio'],etiqueta:'Clases STEM',color_tarjeta:'#ffff00',contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 5678'};
assert(val(nuevo).ok);
for(const [k,v] of [['categorias',[]],['categorias',['malo']],['etiqueta','x'],['etiqueta','Dos\nlíneas'],['color_tarjeta','rojo'],['contacto_valor','+56 123'],['universidades',[]]])assert(!val({...nuevo,[k]:v}).ok,k);
assert(val({...nuevo,en_directorio:false,categorias:[],etiqueta:''}).ok);
for(const color of ['#ffffff','#000000','#ffff00','#00ff00','#777777']){
  const fondo=run(`luminanciaDirectorio('${color}')`),txt=run(`textoTarjetaDirectorio('${color}')`),l=txt==='#000000'?0:1;
  assert((Math.max(fondo,l)+.05)/(Math.min(fondo,l)+.05)>=4.5,color);
}
const a={id:'a',titulo:'Anuncio existente',estado:'publicado',precio_clp:12000,ramos_siglas:['SYN101']};
const antes=run(`JSON.stringify(prepararCatalogoClases([${JSON.stringify(a)}],''))`);
assert.equal(antes,run(`JSON.stringify(prepararCatalogoClases([${JSON.stringify(a)}],''))`));
assert(run('valoracionDirectorioHTML({total:3,promedio:4.7})').includes('4.7 de 5 estrellas'));
for(const estado of [null,{total:0,promedio:null},{total:2,promedio:5},{total:3,promedio:0},{total:3,promedio:8}])
  assert(run(`valoracionDirectorioHTML(${JSON.stringify(estado)})`).includes('Sin valoraciones'));
assert(!run("tarjetaDirectorioHTML({destacado:true},{previa:true})").includes('>Destacado<'),'el espacio superior se reserva para la valoración');
const tarjeta=run("tarjetaDirectorioHTML({nombre_publico:'Academia de ejemplo',etiqueta:'Clases STEM'},{previa:true})");
assert(tarjeta.indexOf('directorio-etiqueta')<tarjeta.indexOf('directorio-nombre'),'Lucas: la etiqueta pequeña va arriba');
assert(tarjeta.indexOf('directorio-nombre')<tarjeta.indexOf('directorio-avatar'),'el logo queda a la derecha del nombre en la misma fila');
assert(run(`tarjetaDirectorioHTML({etiqueta:'<script>',color_tarjeta:'#777777'},{previa:true})`).includes('&lt;script&gt;'));
(async()=>{
  ctx.supabaseClient={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:{code:'42703'}})})};
  const p=await run(`perfilConDirectorio(${JSON.stringify({...base,estado:'aprobado'})})`);
  assert.equal(p.directorioDisponible,false);assert.equal(p.en_directorio,undefined);
  ctx.supabaseClient={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{en_directorio:false,categorias:null},error:null})})};
  assert.equal((await run(`perfilConDirectorio(${JSON.stringify(base)})`)).en_directorio,false);
  assert(read('src/marketplace/perfil-pantalla.js').includes('gradehub:logo-profesor'));
  let resolver;const caja={isConnected:true,innerHTML:'sin datos ajenos'};ctx.caja=caja;
  ctx.perfilProfesorActual=()=>new Promise(r=>resolver=r);const lectura=run('renderPerfilProfesor(caja)');
  ctx.currentUser={id:'otra-cuenta'};resolver({ok:true,perfil:{...base,perfil_publico:true}});await lectura;assert.equal(caja.innerHTML,'sin datos ajenos','no pinta una respuesta de la cuenta anterior');
  ctx.currentUser={id:'p'};run('perfilProfesorCache={nombre_publico:"Cuenta nueva"}');
  ctx.supabaseClient={from:()=>({update(){return this},eq(){return this},select(){return this},maybeSingle:()=>new Promise(r=>resolver=r)})};
  const escritura=run(`guardarPerfilProfesor(${JSON.stringify(base)})`);ctx.currentUser={id:'otra-cuenta'};resolver({data:{nombre_publico:'Cuenta anterior'},error:null});
  assert.equal((await escritura).ok,false);assert.equal(run('perfilProfesorCache.nombre_publico'),'Cuenta nueva','no contamina caché al cambiar cuenta durante el guardado');
  console.log('PASS: validación, contraste ≥4,5, cuenta existente sin SQL, tarjeta compartida y cambio de cuenta');
})().catch(e=>{console.error(e);process.exitCode=1});
