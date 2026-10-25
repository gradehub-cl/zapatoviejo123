// El mismo editor en modo admin: comandos reales con DOM y anuncios sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','marketplace.js'),'utf8');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ad={id:'00000000-0000-0000-0000-000000000904',estado:'publicado',tipo:'clase',tenant:'uc',ramos_siglas:['TEST100'],titulo:'Clase sintética de cálculo',descripcion:'Descripción de la clase completamente ficticia',precio_clp:15000,modalidad:'individual',ubicacion:'online',contacto_tipo:'whatsapp',contacto_valor:'56900000000',criterios:{promedioMenorA:5,avanceMinimo:20},descuento_gradehub_pct:5,codigo_descuento:'PRUEBA'};
let vuelta=0,modo='ok';const calls=[],toasts=[],confirmaciones=[];
const ctx={console,Intl,Promise,S:{tenant:'uc'},currentUser:{id:'admin-sintetico'},esc,document:{getElementById(){return null;},addEventListener(){}},showToast:t=>toasts.push(t),showConfirm:(t,d,fn,o)=>confirmaciones.push({t,d,fn,o}),supabaseClient:{rpc:async(n,p)=>{calls.push({n,p});if(modo==='throw')throw Error('offline');if(modo==='sin-sql')return {error:{code:'PGRST202'}};return {data:p?.p_anuncio_id===null||modo==='no-op'?false:true};}}};
vm.createContext(ctx);vm.runInContext(src,ctx);const run=s=>vm.runInContext(s,ctx);
function elemento(){return {value:'',files:[],hidden:false,disabled:false,isConnected:true,textContent:'',listeners:{},dataset:{},attrs:{},addEventListener(t,f){this.listeners[t]=f;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},focus(){this.focused=true;},scrollIntoView(){},querySelectorAll(){return [];},querySelector(){return null;}};}
function editor(a=ad){
 const form=elemento(),estado=elemento(),els={};
 const raiz={innerHTML:'',querySelector(s){return s==='#profesor-borrador'?form:els[s]||null;}};
 form.reportValidity=()=>true;
 // El HTML decide si el control existe. No inventamos campaña, envío ni Storage.
 form.querySelector=s=>s==='.profesor-estado'?estado:(raiz.innerHTML.includes(`id="${s.slice(1)}"`)?els[s]||null:null);
 for(const k of ['titulo','descripcion','precio','pack','modalidad','modalidad-otra','ubicacion','ubicacion-otra','contacto-tipo','contacto','tenant','siglas','promedio','avance','guardar','enviar','volver','flyer','dias','inicio','fin','tope','reintentar-campana'])els['#pr-'+k]=elemento();
 Object.entries({titulo:a.titulo,descripcion:a.descripcion,precio:String(a.precio_clp),modalidad:'individual',ubicacion:'online','contacto-tipo':'whatsapp',contacto:'56900000000',tenant:'uc',siglas:'TEST100',promedio:'5',avance:'20'}).forEach(([k,v])=>els['#pr-'+k].value=v);
 ctx.raiz=raiz;ctx.ad=a;ctx.volver=async()=>{vuelta++;};
 run("renderBorradorProfesor(raiz,ad,{admin:true,profesor:{nombre:'Docente <sintético>'},volverAdmin:volver})");
 els['#pr-titulo'].value=a.titulo+' corregido';
 return {raiz,form,estado,els,guardar:()=>els['#pr-guardar'].listeners.click()};
}
const tick=()=>new Promise(setImmediate);
(async()=>{
 run('capasColumnasClase=4');
 let e=editor();
 assert.match(e.raiz.innerHTML,/Editando el anuncio de Docente &lt;sintético&gt;/);
 assert.match(e.raiz.innerHTML,/id="pr-volver"[\s\S]*?Anuncios/);
 assert.equal((e.raiz.innerHTML.match(/class="accion-principal"/g)||[]).length,1);
 assert.match(e.raiz.innerHTML,/Guardar cambios/);
 for(const t of ['id="pr-enviar"','3. Tu campaña','id="pr-dias"','id="pr-tope"','Qué publicas','type="file"','Quitar flyer guardado','id="pr-logo"'])assert(!e.raiz.innerHTML.includes(t),t);
 for(const t of ['vista-solo-cel','vista-catalogo','El flyer y el logo'])assert(e.raiz.innerHTML.includes(t),t);
 await e.els['#pr-volver'].listeners.click();assert.equal(vuelta,1);
 e=editor();e.form.listeners.input();e.els['#pr-volver'].listeners.click();assert.equal(vuelta,1);assert.match(confirmaciones.at(-1).t,/Salir sin guardar/);await confirmaciones.at(-1).fn();assert.equal(vuelta,2);
 confirmaciones.length=0;calls.length=0;e=editor();
 e.els['#pr-contacto'].value='invalido';await e.guardar();assert.equal(calls.length,0);assert.match(e.estado.textContent,/WhatsApp/);assert.equal(e.els['#pr-contacto'].focused,true);
 e.els['#pr-contacto'].value='56900000000';await e.guardar();
 assert.equal(calls.length,0,'no escribe antes de confirmar');assert.equal(confirmaciones.at(-1).d,'Los estudiantes verán los cambios al tiro.');
 await confirmaciones.at(-1).fn();assert.equal(calls.length,1);assert.equal(calls[0].n,'admin_editar_anuncio');assert.equal(calls[0].p.p_anuncio_id,ad.id);
 assert.deepEqual(Object.keys(calls[0].p.p_datos),['titulo'],'solo el campo editado, sin cambiar criterios heredados ni tipo');
 assert.equal(vuelta,3);assert.equal(toasts.at(-1),'Anuncio actualizado');
 for(const estadoAd of ['borrador','en_revision','pausado']){calls.length=0;confirmaciones.length=0;e=editor({...ad,estado:estadoAd});await e.guardar();assert.equal(confirmaciones.length,0);assert.equal(calls[0].n,'admin_editar_anuncio');}
 e=editor({...ad,estado:'borrador',tipo:'material'});await e.guardar();assert(!('tipo' in calls.at(-1).p.p_datos),'conserva clase/material sin selector');
 e=editor({...ad,estado:'borrador',modalidad:'otra',modalidad_otra:'Grupo pequeño'});e.els['#pr-modalidad'].value='grupal';await e.guardar();assert.equal(calls.at(-1).p.p_datos.modalidad,'grupal');assert.equal(calls.at(-1).p.p_datos.modalidad_otra,null,'mantiene coherencia con Otra');
 const nSinCambios=calls.length;e=editor({...ad,estado:'borrador'});e.els['#pr-titulo'].value=ad.titulo;await e.guardar();assert.equal(calls.length,nSinCambios);assert.match(e.estado.textContent,/No hay cambios/);
 for(const m of ['throw','sin-sql','no-op']){modo=m;e=editor({...ad,estado:'borrador'});const v=vuelta;await e.guardar();assert.equal(vuelta,v);assert.equal(e.els['#pr-guardar'].disabled,false);assert(e.estado.textContent.length>20);}
 modo='ok';
 // Disponibilidad: sin RPC no aparece el botón; la prueba nunca tiene ID real.
 const caja=elemento(),boton=elemento();caja.dataset.adminEdicion=ad.id;caja.querySelector=()=>boton;
 ctx.cajaRoot={querySelectorAll:()=>[caja],querySelector:()=>null};ctx.profesores=[{nombre:'Profesor sintético',anuncios:[ad]}];ctx.volver=async()=>{};
 for(const m of ['sin-sql','throw']){modo=m;caja.innerHTML='';await run('enlazarEdicionAdmin(cajaRoot,profesores,volver)');assert.equal(caja.innerHTML,'');}
 modo='ok';await run('enlazarEdicionAdmin(cajaRoot,profesores,volver)');assert.match(caja.innerHTML,/Editar anuncio/);assert.equal(calls.at(-1).p.p_anuncio_id,null);assert.equal(JSON.stringify(calls.at(-1).p.p_datos),'{}');
 // El profesor recibe la fecha y abre el anuncio actualizado antes del acuse.
 const aviso=elemento(),ver=elemento(),fila=elemento(),detalle=elemento(),summary=elemento(),pendientes=elemento();
 aviso.dataset.avisoEdicion=ad.id;ver.dataset.verEdicion=ad.id;fila.dataset.profesorAnuncio=ad.id;let quitado=false,preview=null;
 aviso.remove=()=>{quitado=true;};pendientes.children=[aviso];fila.querySelector=s=>s==='summary'?summary:detalle;detalle.querySelector=()=>preview;detalle.prepend=p=>preview=p;
 ctx.document.createElement=()=>elemento();
 const root={innerHTML:'',querySelectorAll(s){return s==='[data-ver-edicion]'?[ver]:s==='[data-aviso-edicion]'?[aviso]:s==='[data-profesor-anuncio]'?[fila]:[];},querySelector(s){return s==='.clases-pendientes'?pendientes:null;}};
 ctx.root=root;ctx.ad={...ad,estado:'en_revision'};let errorAcuse=true;
 ctx.supabaseClient.rpc=async(n,p)=>{calls.push({n,p});if(n==='mis_anuncios_editados_gradehub')return {data:[{anuncio_id:ad.id,accion_id:15,editado_at:'2026-10-25T12:00:00Z'},{anuncio_id:'otro',accion_id:99,editado_at:'2026-10-25T12:00:00Z'}]};if(n==='marcar_edicion_anuncio_vista')return errorAcuse?{error:{code:'OFFLINE'}}:{data:true};return {data:[]};};
 await run("renderPanelProfesor(root,[ad],{cabecera:()=>'',salida:()=>''})");
 assert.match(root.innerHTML,/GradeHub editó tu anuncio/);assert.match(root.innerHTML,/25 de octubre de 2026/);assert(!root.innerHTML.includes('data-ver-edicion="otro"'));
 assert.equal(quitado,false);ver.listeners.click();await tick();assert.equal(fila.open,true);assert.match(preview.innerHTML,/Descripción de la clase completamente ficticia/);assert.equal(quitado,false,'sin acuse el aviso se conserva');
 errorAcuse=false;await fila.listeners.toggle();await tick();assert.equal(quitado,true);
 assert.equal(calls.at(-1).n,'marcar_edicion_anuncio_vista');assert.equal(calls.at(-1).p.p_accion_id,15);
 const n=calls.length;await fila.listeners.toggle();assert.equal(calls.length,n,'un anuncio visto no repite acuses');
 console.log('OK editor admin: editor compartido, solo RPC comercial, confirmar, volver, errores, compatibilidad y aviso privado');
})().catch(e=>{console.error(e);process.exitCode=1;});
