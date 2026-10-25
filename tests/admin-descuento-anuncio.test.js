const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
// DOM sintético: se ejecuta pintarPanelAdmin y sus handlers reales.
class Nodo{
  constructor(tag='div',attrs={},parent=null){this.tag=tag;this.attrs=attrs;this.parent=parent;this.children=[];this.listeners={};this.value=attrs.value||'';this.checked=false;this.validity={badInput:false};this.hidden='hidden'in attrs;this.isConnected=true;this.dataset={};for(const[k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
  matches(s){if(s[0]==='['){const m=s.match(/^\[([^=\]]+)(?:=(?:"([^"]*)"|([^\]]+)))?\]$/);return !!m&&m[1]in this.attrs&&(m[2]===undefined&&m[3]===undefined||this.attrs[m[1]]===(m[2]??m[3]));}return s[0]==='#'?this.attrs.id===s.slice(1):s[0]==='.'?(this.attrs.class||'').split(' ').includes(s.slice(1)):this.tag===s;}
  querySelectorAll(s){const partes=s.trim().split(/\s+/);if(partes.length>1)return this.querySelectorAll(partes[0]).flatMap(n=>n.querySelectorAll(partes.slice(1).join(' ')));return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  get elements(){const campos={};for(const n of [...this.querySelectorAll('input'),...this.querySelectorAll('select'),...this.querySelectorAll('textarea')])if(n.attrs.name)campos[n.attrs.name]=n;return campos;}
  closest(s){return this.matches(s)?this:this.parent?.closest(s);}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,f){this.listeners[k]=f;}
  focus(){this.focused=true;}
  remove(){this.isConnected=false;this.parent.children=this.parent.children.filter(c=>c!==this);}
  set innerHTML(html){
    this.querySelectorAll('article').forEach(n=>n.isConnected=false);this.children=[];this.html=html;let p=this;
    for(const m of html.matchAll(/<\/?([\w-]+)([^>]*)>/g)){
      if(m[0][1]==='/'){if(p!==this)p=p.parent;continue;}
      const attrs={};for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[a[1]]=a[2]??'';
      const n=new Nodo(m[1],attrs,p);p.children.push(n);if(n.tag==='option'&&'selected'in attrs)p.value=attrs.value;if(!['input','img','br','hr'].includes(n.tag))p=n;
    }
  }
  get innerHTML(){return this.html;}
}
const root=new Nodo(),calls=[],toasts=[];
const anuncio={id:'a1',titulo:'Clase sintética',estado:'publicado',ramos_siglas:['TEST100'],precio_clp:15000,
 publicado_at:'2026-10-01T12:00:00Z',vence_at:'2099-01-01T12:00:00Z',campana:null,cobros:[],descuento_gradehub_pct:null};
let modo='ok',confirmacion=null,esperar=null;
const profesores=[{user_id:'p1',nombre:'Profesor sintético',estado:'aprobado',anuncios:[anuncio]}];
const ctx={console,Intl,root,Promise,S:{ramos:[]},currentUser:{id:'admin-ficticio'},TENANTS:{uc:{label:'UC'}},
 esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])),
 document:{getElementById:()=>root,addEventListener(){}},showToast:(text,error)=>toasts.push({text,error}),
 showConfirm:(title,text,fn,opts)=>{confirmacion={title,text,fn,opts};},
 supabaseClient:{rpc:async(n,p)=>{
  calls.push({n,p});
  if(n==='admin_panel_clases')return {data:profesores};
  // Este test es del descuento solo: el SQL del código (2026-10-25) no está.
  if(n==='admin_descuento_codigo_anuncio')return {error:{code:'PGRST202',message:'function missing'}};
  if(n!=='admin_descuento_anuncio')return {data:[]};
  if(modo==='sin-sql'||modo==='sin-sql-42883')return {error:{code:modo==='sin-sql'?'PGRST202':'42883',message:'function missing'}};
  if(modo==='sin-red')throw Error('red caída');
  if(p.p_anuncio_id===null)return {data:false};
  if(modo==='false')return {data:false};
  if(modo==='denegado')return {error:{code:'42501',message:'sin acceso'}};
  if(esperar)await esperar;
  anuncio.descuento_gradehub_pct=p.p_pct;return {data:true};
 }}};
vm.createContext(ctx);const run=s=>vm.runInContext(s,ctx);run(fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8'));
const pintar=()=>run('pintarPanelAdmin(root)');
const bloque=()=>root.querySelector('[data-admin-descuento]');
const campo=()=>bloque().querySelector('[data-descuento-pct]');
const guardar=()=>bloque().querySelector('[data-descuento-guardar]');
const quitar=()=>bloque().querySelector('[data-descuento-quitar]');
const mutaciones=()=>calls.filter(c=>c.n==='admin_descuento_anuncio'&&c.p.p_anuncio_id!==null);
(async()=>{
 await pintar();
 assert.match(bloque().innerHTML,/Actual: <b>Sin descuento/);
 assert.equal(campo().value,'');assert.equal(quitar(),null);
 assert.equal(campo().attrs.inputmode,'numeric');assert.equal(campo().attrs.min,'1');assert.equal(campo().attrs.max,'50');
 assert.equal(bloque().querySelectorAll('.accion-principal').length,1);
 assert.equal(mutaciones().length,0,'abrir el panel no edita ningún anuncio');
 assert(calls.filter(c=>c.n==='admin_descuento_anuncio').every(c=>c.p.p_anuncio_id===null&&c.p.p_pct===null));
 for(const value of ['',0,-1,51,2.5,'1e1','no','999999999999999999999']){
  campo().value=String(value);await guardar().listeners.click();
  assert.match(bloque().querySelector('[data-descuento-error]').textContent,/entero entre 1 y 50/);
  assert.equal(campo().attrs['aria-invalid'],'true');assert.equal(campo().focused,true);
 }
 assert.equal(mutaciones().length,0);assert.equal(confirmacion,null,'validar ocurre antes de confirmar');
 campo().listeners.input();assert.equal(campo().attrs['aria-invalid'],undefined);
 campo().value='5';await guardar().listeners.click();
 assert.match(confirmacion.text,/Los estudiantes verán el precio con −5% desde ahora/);
 assert.equal(confirmacion.opts.danger,false);assert.equal(mutaciones().length,0,'espera confirmación para publicado');
 // Descartar el diálogo equivale a cancelar: no se invoca el callback.
 confirmacion=null;assert.equal(anuncio.descuento_gradehub_pct,null);
 await guardar().listeners.click();await confirmacion.fn();confirmacion=null;
 assert.deepEqual(JSON.parse(JSON.stringify(mutaciones().at(-1).p)),{p_anuncio_id:'a1',p_pct:5});
 assert.match(toasts.at(-1).text,/Descuento guardado/);assert.match(bloque().innerHTML,/Actual: <b>5%/);assert(quitar());
 const resumen=root.querySelector('[data-admin-fila]').querySelector('summary');
 assert(resumen.querySelector('.admin-descuento-etiqueta'),'se reconoce el descuento sin abrir');
 assert.match(root.innerHTML,/−5% GradeHub/);
 await quitar().listeners.click();assert.match(confirmacion.text,/precio sin descuento desde ahora/);await confirmacion.fn();confirmacion=null;
 assert.equal(mutaciones().at(-1).p.p_pct,null);assert.equal(quitar(),null);assert.match(toasts.at(-1).text,/Descuento quitado/);
 // Borradores: guardar no exige la confirmación reservada a publicados.
 anuncio.estado='borrador';await pintar();campo().value='50';await guardar().listeners.click();assert.equal(confirmacion,null);assert.equal(anuncio.descuento_gradehub_pct,50);
 campo().value='1';await guardar().listeners.click();assert.equal(anuncio.descuento_gradehub_pct,1,'acepta el extremo inferior');
 // No hay doble envío mientras se espera la respuesta.
 let liberar;esperar=new Promise(r=>{liberar=r;});campo().value='2';const envios=mutaciones().length;
 const primerEnvio=guardar().listeners.click();assert.equal(campo().disabled,true);assert.equal(guardar().disabled,true);assert.equal(quitar().disabled,true);
 await guardar().listeners.click();assert.equal(mutaciones().length,envios+1);liberar();await primerEnvio;esperar=null;
 // Errores reales no se convierten en éxito; se puede volver a intentar.
 for(const fallo of ['false','denegado','sin-red']){
  modo=fallo;campo().value='3';await guardar().listeners.click();assert.equal(toasts.at(-1).error,true);assert.equal(guardar().disabled,false);assert.equal(anuncio.descuento_gradehub_pct,2);
 }
 // Si desaparece la función después de consultar, se retiran las acciones.
 modo='sin-sql';campo().value='4';await guardar().listeners.click();
 assert.match(bloque().innerHTML,/Aplica administradores.sql para editar el descuento desde acá/);assert.equal(guardar(),null);assert.equal(quitar(),null);
 for(const modoSQL of ['sin-sql','sin-sql-42883','sin-red']){
  modo=modoSQL;await pintar();assert.equal(guardar(),null);assert.equal(quitar(),null);
  assert.match(bloque().innerHTML,modoSQL==='sin-red'?/No pudimos comprobar/:/Aplica administradores.sql/);
 }
 assert.equal(anuncio.descuento_gradehub_pct,2);
 assert(calls.every(c=>!/^registrar_/.test(c.n)),'no emite medición');
 console.log('OK descuento admin cliente: valor, etiqueta, validación, foco, confirmar, quitar, no-op, doble envío y SQL ausente');
})().catch(e=>{console.error(e);process.exitCode=1;});
