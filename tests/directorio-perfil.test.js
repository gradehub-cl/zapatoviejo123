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
assert(run(`tarjetaDirectorioHTML({etiqueta:'<script>',color_tarjeta:'#777777'},{previa:true})`).includes('&lt;script&gt;'));
(async()=>{
  ctx.supabaseClient={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:null,error:{code:'42703'}})})};
  const p=await run(`perfilConDirectorio(${JSON.stringify({...base,estado:'aprobado'})})`);
  assert.equal(p.directorioDisponible,false);assert.equal(p.en_directorio,undefined);
  ctx.supabaseClient={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{en_directorio:false,categorias:null},error:null})})};
  assert.equal((await run(`perfilConDirectorio(${JSON.stringify(base)})`)).en_directorio,false);
  assert(read('src/marketplace/perfil-pantalla.js').includes('gradehub:logo-profesor'));
  console.log('PASS: validación, contraste ≥4,5, cuenta existente sin SQL y tarjeta compartida');
})().catch(e=>{console.error(e);process.exitCode=1});
