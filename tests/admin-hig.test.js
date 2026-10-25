const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
// DOM mínimo para ejecutar handlers sobre el HTML generado.
class Nodo{
  constructor(tag='div',attrs={},parent=null){this.tag=tag;this.attrs=attrs;this.parent=parent;this.children=[];this.listeners={};this.value=attrs.value||'';this.checked=false;this.validity={badInput:false};this.hidden='hidden'in attrs;this.isConnected=true;this.dataset={};for(const[k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
  matches(s){if(s[0]==='['){const m=s.match(/^\[([^=\]]+)(?:=(?:"([^"]*)"|([^\]]+)))?\]$/);return !!m&&m[1]in this.attrs&&(m[2]===undefined&&m[3]===undefined||this.attrs[m[1]]===(m[2]??m[3]));}return s[0]==='#'?this.attrs.id===s.slice(1):s[0]==='.'?(this.attrs.class||'').split(' ').includes(s.slice(1)):this.tag===s;}
  querySelectorAll(s){const partes=s.trim().split(/\s+/);if(partes.length>1)return this.querySelectorAll(partes[0]).flatMap(n=>n.querySelectorAll(partes.slice(1).join(' ')));return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  get elements(){const campos={};for(const n of [...this.querySelectorAll('input'),...this.querySelectorAll('select'),...this.querySelectorAll('textarea')])if(n.attrs.name)campos[n.attrs.name]=n;return campos;}
  closest(s){return this.matches(s)?this:this.parent?.closest(s);}
  setAttribute(k,v){this.attrs[k]=v;}
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
const root=new Nodo(),calls=[],toasts=[];let modo='ok',confirmacion,pasar=false;
const fecha='2026-09-01T00:00:00Z',historica='2026-08-01T00:00:00Z';
const anuncio={id:'a1',titulo:'Clase <sintética>',estado:'publicado',ramos_siglas:['MAT1620'],precio_clp:15000,publicado_at:fecha,vence_at:'2099-01-01T00:00:00Z',campana:{dias:14,tope_clp:15000,dias_cobrados:4,vistas:120,aperturas:12,contactos:2},cobro:{estado:'deuda',monto_clp:4200},cobros:[{publicado_at:fecha,estado:'deuda',monto_clp:4200},{publicado_at:historica,estado:'deuda',monto_clp:6000}]};
const profesores=[{user_id:'p1',nombre:'Docente sintético',estado:'aprobado',anuncios:[anuncio,{...anuncio,id:'a2',estado:'pausado'},{...anuncio,id:'a3',estado:'en_revision',publicado_at:null,campana:null,cobro:null,cobros:[],
  descripcion:'Apoyo <concreto> en el ramo',tenant:'uc',contacto_tipo:'whatsapp',contacto_valor:'+56 9 1234 5678',
  configuracion_campana:{dias:10,inicio:null,tope_clp:12000},criterios:{promedioMenorA:5,avanceMinimo:20}}]}];
let panelActual=profesores;
const ctx={console,Intl,S:{get ramos(){throw Error('No leer notas');}},currentUser:{id:'admin-sintetico'},TENANTS:{uc:{label:'UC'}},profesores,root,
 esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])),
 document:{getElementById:()=>root},renderPuertaDosPasos:async(_r,{alPasar})=>{if(pasar)await alPasar();},
 showToast:(text,error)=>toasts.push({text,error}),showConfirm:(_t,_d,fn)=>{confirmacion=fn();},
 supabaseClient:{rpc:async(n,p)=>{calls.push({n,p});if(modo==='throw')throw Error('red caída');if(modo==='denegado')return {error:{code:'42501',message:'sin acceso'}};
  if(n==='admin_encuestas'&&modo==='encuestas-sin-sql')return {error:{code:'PGRST202'}};
  const datos={admin_panel_clases:panelActual,admin_encuestas:[],crecimiento_semanal_admin:[{semana:'2026-10-19',nuevas:2,nuevas_estudiantes:1,nuevas_profesores:1,activas:4,activas_estudiantes:3,activas_profesores:1,vuelven:1,vuelven_estudiantes:1,vuelven_profesores:0}],campana_anuncio:[anuncio.campana],alcance_anuncio:3,alcance_anuncio_por_canal:[{canal:'lista',cuentas:3}],
   resumen_metricas_anuncio:[{dia:'2026-09-01',tipo:'impresion',ramo_sigla:'MAT1620',eventos:18}],
   totales_metricas_anuncio:[{vista:'total',clave:'',tipo:'impresion',eventos:18}]};
  return {data:modo==='false'?false:n in datos?datos[n]:true,error:null};}}};
vm.createContext(ctx);const run=s=>vm.runInContext(s,ctx);run(fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8'));
(async()=>{
 await run('renderAdmin()');assert.equal(calls.length,0,'Sin MFA no pide el panel');assert.equal(root.querySelectorAll('[data-admin-area]').length,0);
 pasar=true;await run('renderAdmin()');assert.match(root.innerHTML,/admin-hig-fila/);assert.match(root.innerHTML,/Clase &lt;sintética&gt;/);
 assert.doesNotMatch(root.innerHTML,/piloto|lo que costaría|data-aprobar|bin\//);
 const areas=root.querySelectorAll('[data-admin-area]');
 assert.deepEqual(areas.map(b=>b.dataset.adminArea),['profesores','anuncios','estadisticas','usuarios']);
 const area=n=>root.querySelector(`[data-admin-panel="${n}"]`);
 assert.equal(area('anuncios').hidden,false,'los anuncios siguen siendo la vista inicial');
 assert.equal(area('profesores').hidden,true);
 assert.equal(root.querySelector('[data-admin-area="anuncios"]').attrs['aria-selected'],'true');
 const rpcsAntesDeNavegar=calls.length;
 areas[0].listeners.click();
 assert.equal(area('profesores').hidden,false);
 assert.equal(area('anuncios').hidden,true);
 assert(area('profesores').querySelector('h3'),'el listado sintético está en la pestaña visible');
 assert(area('profesores').querySelector('[data-admin-profesor]'),'las acciones actuales del profesor siguen en su pestaña');
 assert.equal(areas[0].attrs['aria-selected'],'true');
 let prevenido=false;
 areas[0].listeners.keydown({key:'ArrowRight',preventDefault(){prevenido=true;}});
 assert.equal(prevenido,true);assert.equal(areas[1].focused,true);
 assert.equal(area('anuncios').hidden,false);
 areas[2].listeners.click();
 assert.equal(area('estadisticas').hidden,false);
 assert(area('estadisticas').querySelector('#admin-crecimiento-titulo'),'muestra el crecimiento real de la página');
 areas[3].listeners.click();
 assert.equal(area('usuarios').hidden,false);
 await new Promise(setImmediate);
 assert(area('usuarios').querySelector('.encuesta-crear'),'Usuarios permite crear encuestas');
 assert.deepEqual(calls.slice(rpcsAntesDeNavegar).map(c=>c.n),['admin_encuestas'],'solo Usuarios consulta sus datos al abrir');
 modo='encuestas-sin-sql';area('usuarios').querySelector('[data-encuestas-actualizar]').listeners.click();
 await new Promise(setImmediate);
 assert.match(root.querySelector('#admin-encuestas-contenido').html,/Encuestas todavía no disponibles/,'sin SQL la sección explica el estado');
 modo='ok';
 areas[1].listeners.click();
 assert.equal(root.querySelectorAll('[data-admin-estadisticas]').length,3);
 const ver=root.querySelectorAll('[data-admin-estadisticas]').find(b=>b.dataset.adminEstadisticas==='a1');
 const panel=root.querySelector('#admin-estadisticas-a1');
 const antes=calls.length;await ver.listeners.click();
 assert.equal(panel.hidden,false);assert.equal(ver.attrs['aria-expanded'],'true');
 for(const texto of ['Estadísticas del aviso','Presupuesto utilizado','Se mostró','La abrieron','Te contactaron','Más estadísticas','Cómo llegaron'])
  assert(panel.innerHTML.includes(texto),`Falta ${texto} en las estadísticas del admin`);
 assert.match(panel.innerHTML,/Solo totales por anuncio/);
 assert.deepEqual(calls.slice(antes).map(c=>c.n),['admin_panel_clases','campana_anuncio','alcance_anuncio_por_canal','resumen_metricas_anuncio','totales_metricas_anuncio']);
 assert(calls.slice(antes).filter(c=>c.p).every(c=>c.p.p_anuncio_id==='a1'));
 await ver.listeners.click();assert.equal(panel.hidden,true);
 modo='throw';await ver.listeners.click();assert.match(panel.innerHTML,/No pudimos cargar las estadísticas/);assert.equal(ver.textContent,'Reintentar estadísticas');
 modo='ok';await ver.listeners.click();assert.match(panel.innerHTML,/Presupuesto utilizado/);
 const pausado=root.querySelectorAll('[data-admin-estadisticas]').find(b=>b.dataset.adminEstadisticas==='a2');
 await pausado.listeners.click();assert.match(root.querySelector('#admin-estadisticas-a2').innerHTML,/Se mostró/);
 const borrador=root.querySelectorAll('[data-admin-estadisticas]').find(b=>b.dataset.adminEstadisticas==='a3');
 const sinNumeros=calls.length;await borrador.listeners.click();assert.equal(calls.length,sinNumeros+1);assert.match(root.querySelector('#admin-estadisticas-a3').innerHTML,/sus estadísticas aparecerán acá/);
 assert.match(root.innerHTML,/Apoyo &lt;concreto&gt;/);assert.match(root.innerHTML,/\+56 9 1234 5678/);
 assert.match(root.innerHTML,/10 días · parte Al aprobar · tope \$12\.000/);
 assert(root.querySelector('[data-admin-publicar]'));
 assert.equal(run("filtrarAdminHig(filasAdminHig(profesores),{seccion:'revision'}).length"),1);
 assert.equal(run("filtrarAdminHig(filasAdminHig(profesores),{estado:'pausado',busqueda:'sintetico'}).length"),1);
 assert.equal(run("filtrarAdminHig(filasAdminHig([{...profesores[0],estado:'suspendido'}]),{estado:'publicado'}).length"),0);
 assert.match(run("filaAdminAnuncio({...profesores[0].anuncios[0],estado:'pausado',publicado_at:'2099-01-01T00:00:00Z'},Date.now())"),/data-admin-terminar/,'una campaña pausada antes de iniciar también se puede cerrar con costo cero');
 root.querySelectorAll('[data-admin-seccion]').find(b=>b.dataset.adminSeccion==='revision').listeners.click();
 assert.equal(root.querySelectorAll('[data-admin-fila]').filter(n=>!n.hidden).length,1);
 root.querySelector('[data-admin-area="profesores"]').listeners.click();
 await run('pintarPanelAdmin(root)');
 assert.equal(area('profesores').hidden,false,'una acción que repinta conserva la subpestaña');
 root.querySelector('[data-admin-area="anuncios"]').listeners.click();
 assert.equal(root.querySelectorAll('[data-admin-fila]').filter(n=>!n.hidden).length,1,'conserva el filtro de anuncios');
 root.querySelector('[data-admin-publicar]').listeners.click();await confirmacion;
 assert(calls.some(c=>c.n==='admin_publicar_anuncio'&&c.p.p_anuncio_id==='a3'));
 let comentario=root.querySelector('[data-admin-comentario]');
 root.querySelector('[data-admin-devolver]').listeners.click();
 assert.equal(toasts.at(-1).error,true,'devolver exige comentario');
 comentario.value='Corrige el contacto antes de publicar.';
  await root.querySelector('[data-admin-devolver]').listeners.click();
  assert(calls.some(c=>c.n==='admin_devolver_anuncio'&&c.p.p_comentario==='Corrige el contacto antes de publicar.'));
 root.querySelector('[data-admin-borrar]').listeners.click();await confirmacion;
 assert(calls.some(c=>c.n==='admin_borrar_anuncio_revision'&&c.p.p_anuncio_id==='a3'));
  root.querySelector('[data-admin-terminar]').listeners.click();await confirmacion;
  assert(calls.some(c=>c.n==='admin_terminar_anuncio_pausado'&&c.p.p_publicado_at===fecha));
 assert.equal(run("filtrarAdminHig(filasAdminHig([{...profesores[0],anuncios:[{...profesores[0].anuncios[0],estado:'eliminado'}]}]),{seccion:'campanas'}).length"),0);
 assert.equal(run("filtrarAdminHig(filasAdminHig([{...profesores[0],anuncios:[{...profesores[0].anuncios[0],estado:'eliminado'}]}]),{seccion:'cobros'}).length"),1);
 modo='throw';root.querySelector('[data-admin-publicar]').listeners.click();await confirmacion;
 assert.equal(toasts.at(-1).error,true,'un error de red al publicar no muestra éxito');
 modo='ok';
 const filas=()=>root.querySelectorAll('[data-admin-cobro]');
 let fila=filas().find(f=>f.dataset.adminCobro==='a1'&&f.dataset.publicadoAt===historica);
 fila.querySelector('[data-cobro-estado]').value='cobrado';fila.querySelector('[data-cobro-monto]').value='$6.000';
 await fila.querySelector('[data-cobro-guardar]').listeners.click();
 const cobro=calls.find(c=>c.n==='admin_marcar_cobro_publicacion');assert.deepEqual(JSON.parse(JSON.stringify(cobro.p)),{p_anuncio_id:'a1',p_publicado_at:historica,p_estado:'cobrado',p_monto_clp:6000});
 assert.match(toasts.at(-1).text,/Cobro guardado/);
 for(const fallo of ['false','throw']){
  modo=fallo;fila=filas()[0];await fila.querySelector('[data-cobro-guardar]').listeners.click();assert.equal(toasts.at(-1).error,true);assert.equal(fila.querySelector('[data-cobro-guardar]').disabled,false);
  root.querySelector('[data-admin-pausar]').listeners.click();await confirmacion;assert.equal(toasts.at(-1).error,true);
 }
 modo='ok';const antesPausar=calls.length;root.querySelector('[data-admin-pausar]').listeners.click();await confirmacion;
 assert(calls.slice(antesPausar).some(c=>c.n==='admin_pausar_anuncio'));
 root.querySelector('[data-admin-profesor]').listeners.click();await confirmacion;assert(calls.some(c=>c.n==='admin_estado_profesor'&&c.p.p_estado==='suspendido'));
 assert(calls.every(c=>!/^registrar_/.test(c.n)));
 panelActual=[{...profesores[0],anuncios:[{...anuncio,estado:'pausado',publicado_at:'2026-09-30T00:00:00Z'},...profesores[0].anuncios.slice(1)]}];
 const previas=calls.length;
 await root.querySelectorAll('[data-admin-estadisticas]').find(b=>b.dataset.adminEstadisticas==='a1').listeners.click();
 assert.deepEqual(calls.slice(previas).map(c=>c.n).filter(n=>n!=='crecimiento_semanal_admin'&&n!=='admin_alumnos_ejemplo'&&n!=='admin_descuento_anuncio'&&n!=='admin_descuento_codigo_anuncio'&&n!=='admin_editar_anuncio'),['admin_panel_clases','admin_panel_clases'],'si el aviso cambió se repinta sin mezclar gráficos de publicaciones');
 assert(calls.slice(previas).filter(c=>c.n==='admin_descuento_anuncio').every(c=>c.p.p_anuncio_id===null&&c.p.p_pct===null),'la comprobación de descuento no edita anuncios');
 assert(calls.slice(previas).filter(c=>c.n==='admin_editar_anuncio').every(c=>c.p.p_anuncio_id===null&&JSON.stringify(c.p.p_datos)==='{}'),'la comprobación de edición no escribe anuncios');
 assert.match(toasts.at(-1).text,/Actualicé el panel/);
 modo='denegado';await run('pintarPanelAdmin(root)');assert.match(root.innerHTML,/no tiene acceso/);assert.doesNotMatch(root.innerHTML,/admin-hig-fila/);
 console.log('OK admin HIG: MFA, acceso denegado, filtros, cobro por fecha histórica, RPC reales y errores sin falso éxito');
})().catch(e=>{console.error(e);process.exitCode=1;});
