
// ─── ADMINISTRACIÓN DE CLASES ───────────────────────────────────────────────
//
// Una pestaña que aparece solo en cuentas de admin.administradores (pedido de
// Lucas del 2026-09-25). Que aparezca o no es cosmético: cada dato y cada
// acción pasa por funciones del servidor que exigen estar en la lista Y haber
// entrado con el segundo factor (supabase/administradores.sql). Por eso la
// página parte por renderPuertaDosPasos.
let soyAdministradorCache=false,sesionMarketplaceVersion=0;
async function cargarSoyAdministrador(){
  if(!supabaseClient||!currentUser)return false;
  const cuenta=sesionProfesorClase(),version=sesionMarketplaceVersion;
  try{
    const {data,error}=await supabaseClient.rpc('soy_administrador');
    if(cuenta!==sesionProfesorClase()||version!==sesionMarketplaceVersion)return false;
    soyAdministradorCache=!error&&data===true;
  }catch(e){if(cuenta===sesionProfesorClase()&&version===sesionMarketplaceVersion)soyAdministradorCache=false;}
  return soyAdministradorCache;
}
function esAdministrador(){return soyAdministradorCache;}
// Al cerrar sesión, lo que se sabía de la cuenta anterior se olvida: si no, quien
// entra después en el mismo navegador sin recargar hereda sus pestañas de
// profesor y de administración y su ficha de profesor en pantalla (reportado
// el 2026-09-30 al crear una cuenta nueva tras usar la de admin).
function olvidarSesionMarketplace(){
  sesionMarketplaceVersion++;
  olvidarEncuestas();
  soyAdministradorCache=false;
  alcanceFilasAdmin=new Map();
  vistaAdmin={area:'anuncios',seccion:'campanas',busqueda:'',estado:'publicado',profesores:'aprobado',busquedaProfesores:''};
  olvidarPerfilProfesor();
  anunciosRecomendacion={tenant:null,lista:null,pidiendo:false};
}

async function renderAdmin(){
  const raiz=document.getElementById('admin-body');
  if(!raiz)return;
  if(typeof renderPuertaDosPasos!=='function'){raiz.innerHTML='<p class="profesor-info">No disponible.</p>';return;}
  await renderPuertaDosPasos(raiz,{titulo:'Entra con tu segundo factor',alPasar:()=>pintarPanelAdmin(raiz)});
}

// Qué pasa con un anuncio hoy, en palabras de quien administra.
function estadoAdminAnuncio(a,costo,ahora=Date.now()){
  const vig=vigenciaAnuncio(a,ahora);
  return [(ESTADOS_ANUNCIO[vig]||[vig])[0],vig];
}
function resumenAdminClases(profesores,ahora=Date.now()){
  const r={profesores:0,pendientes:0,suspendidos:0,activas:0,programadas:0,revision:0,gastado:0,cobrado:0,deuda:0};
  for(const p of profesores||[]){
    if(p.estado==='aprobado')r.profesores++;else if(p.estado==='pendiente')r.pendientes++;else if(p.estado==='suspendido')r.suspendidos++;
    for(const a of p.anuncios||[]){
      const vig=vigenciaAnuncio(a,ahora),costo=costoCampanaClase(a.campana);
      if(vig==='publicado')r.activas++;else if(vig==='programado')r.programadas++;else if(vig==='en_revision')r.revision++;
      if(costo)r.gastado+=costo.total;
      const cobros=Array.isArray(a.cobros)?a.cobros:(a.cobro?[a.cobro]:[]);
      for(const c of cobros){
        if(c.estado==='cobrado')r.cobrado+=c.monto_clp;
        if(c.estado==='deuda')r.deuda+=c.monto_clp;
      }
    }
  }
  return r;
}
function editorCobroAdmin(anuncioId,publicadoAt,estado,monto){
  return `<div class="admin-cobro" data-admin-cobro="${esc(anuncioId)}" data-publicado-at="${esc(publicadoAt)}"><span>Cobro</span>
    <select data-cobro-estado aria-label="Estado del cobro">${[['pendiente','Pendiente'],['cobrado','Cobrado'],['deuda','En deuda']].map(([v,t])=>`<option value="${v}"${v===estado?' selected':''}>${t}</option>`).join('')}</select>
    <input type="text" inputmode="numeric" data-cobro-monto aria-label="Monto" value="${esc(textoPesosEscrito(monto))}">
    <button type="button" class="clase-accion" data-cobro-guardar>Guardar</button></div>`;
}
function revisionAdminAnuncioHTML(a,profesor){
  const c=a.configuracion_campana,listaCampana=c&&Number.isInteger(c.dias)&&(Number.isInteger(c.tope_clp)||a.precio_clp===0&&c.tope_clp===null);
  const criterios=a.criterios||{},detalles=detallesClase(a);
  const dato=(nombre,valor)=>`<div><dt>${nombre}</dt><dd>${esc(valor||'No indicado')}</dd></div>`;
  const contacto=[a.contacto_tipo,a.contacto_valor].filter(Boolean).join(' · ');
  const inicio=c&&c.inicio?new Date(c.inicio+'T12:00:00').toLocaleDateString('es-CL'):'Al aprobar';
  return `<section class="admin-revision" aria-label="Revisión de ${esc(a.titulo||'anuncio')}">
    <h4>Revisa el anuncio completo</h4>
    <p class="admin-revision-descripcion">${esc(a.descripcion||'Sin descripción')}</p>
    <dl class="admin-revision-datos">
      ${dato('Profesor',profesor&&profesor.nombre)}${dato('Universidad',a.tenant&&a.tenant.toUpperCase())}
      ${dato('Ramos',(a.ramos_siglas||[]).join(' · '))}${dato('Precio',precioClase(a))}
      ${dato('Formato',formatoClase(a))}${dato('Contacto',contacto)}
      ${dato('Público',criterios.promedioMenorA!=null&&criterios.avanceMinimo!=null?`Promedio menor a ${Number(criterios.promedioMenorA).toLocaleString('es-CL')} · desde ${criterios.avanceMinimo}% evaluado`:'General')}
      ${dato('Campaña',listaCampana?`${c.dias} días · parte ${inicio} · ${c.tope_clp===null?'sin costo':'tope '+pesosClase(c.tope_clp)}`:'Sin días ni tope configurados')}
      ${detalles.map(d=>dato(d.etiqueta,d.valor)).join('')}
    </dl>
    ${a.flyer_path?`<div class="admin-revision-flyer" data-admin-flyer="${esc(a.flyer_path)}" role="status">Cargando flyer…</div>`:''}
    ${!listaCampana?'<p class="profesor-info" role="alert">Este anuncio heredado no tiene días ni tope. Configura la campaña antes de publicarlo desde el panel.</p>':''}
    <div class="admin-revision-acciones">
      <button type="button" class="btn-confirm" data-admin-publicar="${esc(a.id)}"${listaCampana?'':' disabled'}>Publicar anuncio</button>
      <label>Comentario para el profesor<textarea data-admin-comentario="${esc(a.id)}" maxlength="1000" placeholder="Qué debe corregir antes de volver a enviarlo"></textarea></label>
      <button type="button" class="clase-accion" data-admin-devolver="${esc(a.id)}">Devolver con comentario</button>
      <button type="button" class="clase-accion admin-revision-borrar" data-admin-borrar="${esc(a.id)}">Borrar anuncio</button>
    </div>
  </section>`;
}
// El descuento es de GradeHub: el profesor conserva solo lectura.
function descuentoAdminPct(a){
  const pct=a&&a.descuento_gradehub_pct;
  return Number.isInteger(pct)&&pct>=1&&pct<=50?pct:null;
}
function editorDescuentoAdminHTML(a,estado='cargando',conCodigo=false){
  const pct=descuentoAdminPct(a),id=esc(a.id),campo=`admin-descuento-${id}`,codigo=pct===null?null:codigoDescuentoClase(a);
  const aviso=estado==='sin-sql'?'Aplica administradores.sql para editar el descuento desde acá'
    :estado==='error'?'No pudimos comprobar si se puede editar el descuento. Vuelve a abrir el panel para intentarlo de nuevo.'
    :'Comprobando edición del descuento…';
  return `<h4>Descuento por venir de GradeHub</h4>
    <p class="admin-descuento-actual">Actual: <b>${pct===null?'Sin descuento':esc(textoDescuentoClase({descuento:pct,codigo}).replace(/^−/,''))}</b></p>
    ${estado!=='listo'?`<p class="profesor-info" role="status">${aviso}</p>`:
      `<label for="${campo}">Descuento · %</label>
      <input id="${campo}" type="number" min="1" max="50" step="1" inputmode="numeric" data-descuento-pct value="${pct===null?'':pct}" aria-describedby="${campo}-ayuda ${campo}-error">
      <p class="profesor-info" id="${campo}-ayuda">De 1 a 50%. Lo fija GradeHub, no el profesor.</p>
      ${conCodigo?`<label for="${campo}-codigo">Código · opcional</label><input id="${campo}-codigo" class="admin-descuento-codigo" type="text" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ej. GRADEHUB" data-descuento-codigo value="${esc(codigo||'')}" aria-describedby="${campo}-codigo-ayuda ${campo}-error">
      <p class="profesor-info" id="${campo}-codigo-ayuda">El anuncio dirá «−N% con el código …». De 3 a 20 letras o números.</p>`:''}
      <div class="admin-descuento-controles">
        <button type="button" class="accion-principal" data-descuento-guardar>Guardar</button>
        ${pct===null?'':'<button type="button" class="clase-accion" data-descuento-quitar>Quitar</button>'}
      </div>
      <p class="profesor-info" id="${campo}-error" data-descuento-error role="alert"></p>`}`;
}
async function enlazarDescuentosAdmin(raiz,anuncios,llamar){
  const bloques=[...raiz.querySelectorAll('[data-admin-descuento]')];
  if(!bloques.length)return;
  let estado='listo';
  try{
    // Una consulta sin anuncio siempre devuelve false: detecta la función sin
    // editar datos ni generar acciones. Nunca probar con un anuncio real.
    const {error}=await supabaseClient.rpc('admin_descuento_anuncio',{p_anuncio_id:null,p_pct:null});
    if(error)estado=sqlClasesDesactualizado(error)?'sin-sql':'error';
  }catch(e){estado='error';}
  // El código llegó después (2026-10-25): sin su SQL, el bloque sigue igual.
  let conCodigo=false;
  if(estado==='listo')try{
    const {error}=await supabaseClient.rpc('admin_descuento_codigo_anuncio',{p_anuncio_id:null,p_pct:null,p_codigo:null});
    conCodigo=!error;
  }catch(e){}
  bloques.forEach(bloque=>{
    if(bloque.isConnected===false)return;
    const a=anuncios.get(bloque.dataset.adminDescuento);if(!a)return;
    bloque.innerHTML=editorDescuentoAdminHTML(a,estado,conCodigo);
    if(estado!=='listo')return;
    const campo=bloque.querySelector('[data-descuento-pct]'),error=bloque.querySelector('[data-descuento-error]');
    const campoCodigo=bloque.querySelector('[data-descuento-codigo]');
    if(campoCodigo)campoCodigo.addEventListener('input',()=>{campoCodigo.value=campoCodigo.value.toUpperCase().replace(/\s+/g,'');campoCodigo.removeAttribute('aria-invalid');error.textContent='';});
    const guardar=bloque.querySelector('[data-descuento-guardar]'),quitar=bloque.querySelector('[data-descuento-quitar]');
    let pendiente=false;
    campo.addEventListener('input',()=>{campo.removeAttribute('aria-invalid');error.textContent='';});
    const aplicar=async(pct,codigo=null)=>{
      if(pendiente||bloque.isConnected===false)return;
      pendiente=true;
      const controles=[campo,campoCodigo,guardar,quitar].filter(Boolean);controles.forEach(b=>{b.disabled=true;});
      try{
        await llamar(campoCodigo?'admin_descuento_codigo_anuncio':'admin_descuento_anuncio',
          campoCodigo?{p_anuncio_id:a.id,p_pct:pct,p_codigo:pct===null?null:codigo}:{p_anuncio_id:a.id,p_pct:pct},pct===null?'Descuento quitado':'Descuento guardado',e=>{
          if(!sqlClasesDesactualizado(e))return false;
          // También cubre que el SQL deje de estar disponible tras la consulta.
          bloques.forEach(c=>{if(c.isConnected!==false){const anuncio=anuncios.get(c.dataset.adminDescuento);if(anuncio)c.innerHTML=editorDescuentoAdminHTML(anuncio,'sin-sql');}});
          return true;
        });
      }finally{pendiente=false;controles.forEach(b=>{if(b.isConnected!==false)b.disabled=false;});}
    };
    const confirmar=(pct,codigo=null)=>{
      if(a.estado!=='publicado')return aplicar(pct,codigo);
      showConfirm(pct===null?'¿Quitar el descuento?':'¿Guardar el descuento?',
        pct===null?'Los estudiantes verán el precio sin descuento desde ahora.':`Los estudiantes verán el precio con −${pct}%${codigo?` con el código ${codigo}`:''} desde ahora.`,
        ()=>aplicar(pct,codigo),{label:pct===null?'Quitar':'Guardar',danger:false});
    };
    guardar.addEventListener('click',()=>{
      if(pendiente)return;
      const texto=String(campo.value||'').trim(),pct=Number(texto);
      if(!/^\d+$/.test(texto)||!Number.isInteger(pct)||pct<1||pct>50){
        error.textContent='Escribe un porcentaje entero entre 1 y 50.';campo.setAttribute('aria-invalid','true');campo.focus();return;
      }
      const codigo=campoCodigo?campoCodigo.value.trim().toUpperCase()||null:null;
      if(codigo&&!/^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(codigo)){
        error.textContent='El código va de 3 a 20 letras o números, sin espacios.';campoCodigo.setAttribute('aria-invalid','true');campoCodigo.focus();return;
      }
      return confirmar(pct,codigo);
    });
    if(quitar)quitar.addEventListener('click',()=>confirmar(null));
  });
}
// La consulta sin anuncio es un no-op con MFA: nunca prueba con datos reales.
async function enlazarEdicionAdmin(raiz,profesores,volver){
  await enlazarDirectorioAdmin(raiz);
  const cajas=[...raiz.querySelectorAll('[data-admin-edicion]')];
  if(!cajas.length)return;
  try{
    const {error}=await supabaseClient.rpc('admin_editar_anuncio',{p_anuncio_id:null,p_datos:{}});
    if(error)return;
    cajas.forEach(caja=>{
      if(caja.isConnected===false)return;
      const profesor=profesores.find(p=>(p.anuncios||[]).some(a=>a.id===caja.dataset.adminEdicion));
      const anuncio=profesor&&(profesor.anuncios||[]).find(a=>a.id===caja.dataset.adminEdicion);
      if(!anuncio)return;
      caja.innerHTML='<button type="button" class="clase-accion">Editar anuncio</button>';
      caja.querySelector('button').addEventListener('click',()=>{
        renderBorradorProfesor(raiz,anuncio,{admin:true,profesor,volverAdmin:async()=>{
          await volver();
          const caja=[...raiz.querySelectorAll('[data-admin-edicion]')].find(c=>c.dataset.adminEdicion===anuncio.id);
          if(caja){const fila=caja.closest('details');if(fila)fila.open=true;const boton=caja.querySelector('button');if(boton)boton.focus();}
        }});
        const titulo=raiz.querySelector('#profesor-titulo');
        if(titulo){titulo.setAttribute('tabindex','-1');titulo.focus();}
      });
    });
  }catch(e){}
}
function filaAdminAnuncio(a,ahora=Date.now()){
  const costo=costoCampanaClase(a.campana),[estado,clase]=estadoAdminAnuncio(a,costo,ahora);
  const vig=vigenciaAnuncio(a,ahora),publicado=!!a.publicado_at;
  const cobro=a.cobro&&a.cobro.estado||'pendiente',monto=a.cobro?a.cobro.monto_clp:(costo?costo.total:0);
  const fecha=t=>t?new Date(t).toLocaleDateString('es-CL',{day:'numeric',month:'short'}):'';
  const anteriores=(a.cobros||[]).filter(c=>c.publicado_at!==a.publicado_at);
  return `<article class="admin-anuncio" data-admin-anuncio="${esc(a.id)}">
    <div class="admin-anuncio-top"><strong>${esc(a.titulo||'Sin título')}</strong><span class="clase-estado clase-estado-${esc(clase)}">${esc(estado)}</span></div>
    <p class="clase-card-meta">${esc((a.ramos_siglas||[]).join(' · '))} · ${esc(precioClase(a))}${publicado?` · ${fecha(a.publicado_at)} → ${fecha(a.vence_at)}`:''}</p>
    ${costo?`<p class="admin-anuncio-costo"><b>${pesosClase(costo.total)}</b>${costo.sinCosto?' · publicación sin costo':costo.tope!==null?` de ${pesosClase(costo.tope)}`:' · sin tope'}</p>
      <p class="clase-sin-datos">${esc(lineaCostoCampanaClase(costo))}</p>`:''}
    ${vig==='expirado'&&!costo?.sinCosto?'<p class="admin-lista-cobro">Campaña terminada · lista para revisar y registrar el cobro.</p>':''}
    ${vig==='eliminado'&&publicado?'<p class="admin-lista-cobro">Anuncio borrado de la revisión. Esta publicación anterior se conserva para el cobro.</p>':''}
    <div class="admin-anuncio-acciones">
      ${['borrador','en_revision','publicado','pausado'].includes(a.estado)?`<span data-admin-edicion="${esc(a.id)}"></span>`:''}
      <button type="button" class="clase-accion" data-admin-estadisticas="${esc(a.id)}" aria-controls="admin-estadisticas-${esc(a.id)}" aria-expanded="false">Ver estadísticas</button>
      ${publicado&&!costo?.sinCosto?editorCobroAdmin(a.id,a.publicado_at,cobro,monto):''}
      ${vig==='publicado'||vig==='programado'?`<button type="button" class="clase-accion" data-admin-pausar="${esc(a.id)}">Pausar aviso</button>`:''}
      ${vig==='pausado'&&publicado?`<button type="button" class="clase-accion" data-admin-terminar="${esc(a.id)}" data-publicado-at="${esc(a.publicado_at)}">${costo?.sinCosto?'Terminar campaña':'Terminar campaña y dejar lista para cobro'}</button>`:''}
    </div>
    <section class="admin-descuento" data-admin-descuento="${esc(a.id)}">${editorDescuentoAdminHTML(a)}</section>
    <div class="admin-anuncio-estadisticas" id="admin-estadisticas-${esc(a.id)}" data-admin-estadisticas-panel="${esc(a.id)}" hidden></div>
    ${anteriores.length?`<details><summary>Cobros anteriores (${anteriores.length})</summary>${anteriores.map(c=>
      `<div><p class="clase-card-meta">Publicación del ${esc(new Date(c.publicado_at).toLocaleString('es-CL'))} · ${c.estado==='deuda'?'En deuda':'Cobrado'} · ${pesosClase(c.monto_clp)}</p>${editorCobroAdmin(a.id,c.publicado_at,c.estado,c.monto_clp)}</div>`).join('')}</details>`:''}
  </article>`;
}
function tarjetaAdminProfesor(p,ahora=Date.now()){
  const estados={aprobado:'Aprobado',pendiente:'Esperando revisión',suspendido:'Pausado',rechazado:'Rechazado'};
  const anuncios=p.anuncios||[];
  const gastado=anuncios.reduce((n,a)=>{const c=costoCampanaClase(a.campana);return n+(c?c.total:0);},0);
  const accion=p.estado==='aprobado'?`<button type="button" class="clase-accion" data-admin-profesor="${esc(p.user_id)}" data-estado="suspendido">Pausar profesor</button>`
    :p.estado==='suspendido'?`<button type="button" class="clase-accion" data-admin-profesor="${esc(p.user_id)}" data-estado="aprobado">Reactivar</button>`:'';
  return `<section class="admin-profesor">
    <div class="admin-profesor-top"><div><h3>${esc(p.nombre||'Sin nombre')}</h3><p class="clase-card-meta">${esc(p.correo||'')}</p></div>
      <span class="clase-estado clase-estado-${esc(p.estado)}">${esc(estados[p.estado]||p.estado)}</span></div>
    <p class="clase-card-meta">${anuncios.length} ${anuncios.length===1?'anuncio':'anuncios'} · lleva ${pesosClase(gastado)}</p>
    ${accion}${p.estado==='aprobado'?`<span data-admin-ejemplo="${esc(p.user_id)}"></span>`:''}
    ${anuncios.length?`<div class="admin-anuncios">${anuncios.map(a=>filaAdminAnuncio(a,ahora)).join('')}</div>`:''}
  </section>`;
}
async function marcarCobroAdmin(args){
  const actual=await supabaseClient.rpc('admin_marcar_cobro_publicacion',args);
  if(!actual.error){compatibilidadSqlClases.cobros=false;return actual;}
  if(!sqlClasesDesactualizado(actual.error))return actual;
  compatibilidadSqlClases.cobros=true;
  // El RPC antiguo no recibe fecha. Nunca usarlo para un cobro histórico ni
  // para una fila que otra pestaña ya renovó. Se vuelve a leer antes de guardar.
  const panel=await supabaseClient.rpc('admin_panel_clases');
  if(panel.error)return panel;
  const anuncio=(panel.data||[]).flatMap(p=>p.anuncios||[]).find(a=>a.id===args.p_anuncio_id);
  if(!anuncio||!args.p_publicado_at||Date.parse(anuncio.publicado_at)!==Date.parse(args.p_publicado_at))
    return {error:{message:'La publicación cambió o es histórica. Actualiza el panel y aplica el SQL antes de editar ese cobro.'}};
  const {p_anuncio_id,p_estado,p_monto_clp}=args;
  return supabaseClient.rpc('admin_marcar_cobro',{p_anuncio_id,p_estado,p_monto_clp});
}
// Vistas puras de #522; las decisiones siguen en las RPC protegidas.
function filasAdminHig(profesores,ahora=Date.now()){
  return (profesores||[]).flatMap(p=>(p.anuncios||[]).map(a=>{
    const costo=costoCampanaClase(a.campana),estado=estadoAdminAnuncio(a,costo,ahora);
    if(p.estado!=='aprobado'&&['publicado','programado'].includes(vigenciaAnuncio(a,ahora)))
      return {p,a,costo,estado:['Profesor no habilitado','suspendido']};
    return {p,a,costo,estado};
  }));
}
function filtrarAdminHig(filas,{seccion='campanas',busqueda='',estado=''}={}){
  const palabras=normalizarBusquedaClase(busqueda).split(' ').filter(Boolean);
  return filas.filter(f=>(seccion==='cobros'||f.a.estado!=='eliminado')&&
    (seccion!=='revision'||f.a.estado==='en_revision')&&
    (seccion!=='cobros'||f.a.publicado_at||(f.a.cobros||[]).length||f.a.cobro)&&
    (!estado||f.estado[1]===estado)&&palabras.every(t=>normalizarBusquedaClase([f.p.nombre,f.a.titulo,...(f.a.ramos_siglas||[])].join(' ')).includes(t)));
}
// Una campaña terminada que todavía no tiene cobro registrado.
function cobroPendienteAdmin({a,costo,estado}){
  const registrado=a.cobro||(a.cobros||[]).some(c=>Date.parse(c.publicado_at)===Date.parse(a.publicado_at));
  return estado[1]==='expirado'&&!!a.publicado_at&&!costo?.sinCosto&&!registrado;
}
// Primero lo que espera una decisión; después, lo que más se está mostrando.
function ordenFilasAdmin(x,y){
  const prioridad=f=>f.a.estado==='en_revision'?0:cobroPendienteAdmin(f)?1:2;
  return prioridad(x)-prioridad(y)||(Number(y.a.campana?.vistas)||0)-(Number(x.a.campana?.vistas)||0);
}
// Cuántas personas con el ramo vieron el anuncio. Cada consulta recorre las
// cuentas activas, así que se pide solo para lo publicado, de a pocas, y se
// recuerda unos minutos. Desconocido nunca equivale a cero: queda «—».
const ALCANCE_BAJO_ADMIN=.1,MINIMO_ALCANCE_ADMIN=5,DURACION_ALCANCE_ADMIN=5*60*1000;
let alcanceFilasAdmin=new Map();
function alcanceFilaAdminHTML(p){
  const n=p&&p.activos_ramo;
  if(!p||n<MINIMO_ALCANCE_ADMIN)return `<b>—</b>${p?'<small>Muy pocas personas</small>':''}`;
  const parte=Math.min(1,p.vieron/n),bajo=parte<ALCANCE_BAJO_ADMIN;
  return `<b class="${bajo?'est-baja':''}">${Math.round(parte*100)}%</b><small>de ${numeroPrivado(n)}</small><i class="adm-riel${bajo?' adm-riel-bajo':''}" aria-hidden="true"><i style="transform:scaleX(${parte.toFixed(3)})"></i></i>`;
}
async function pintarAlcanceFilasAdmin(raiz,profesores,ahora,vigente){
  const clave=a=>`${a.id}|${a.publicado_at}`;
  const pendientes=filasAdminHig(profesores,ahora).filter(f=>f.estado[1]==='publicado').map(f=>f.a);
  const pintar=(a,p)=>{const caja=raiz.querySelector(`[data-adm-alcance-fila="${a.id}"]`);if(caja&&vigente())caja.innerHTML=alcanceFilaAdminHTML(p);};
  const siguiente=async()=>{
    for(let a=pendientes.shift();a&&vigente();a=pendientes.shift()){
      const guardado=alcanceFilasAdmin.get(clave(a));
      if(guardado&&Date.now()-guardado.en<DURACION_ALCANCE_ADMIN){pintar(a,guardado.p);continue;}
      const p=await publicoAdminAnuncio(a);
      if(p)alcanceFilasAdmin.set(clave(a),{p,en:Date.now()});
      pintar(a,p);
    }
  };
  await Promise.all([siguiente(),siguiente(),siguiente()]);
}
function filaAdminHigHTML({p,a,costo,estado},ahora){
  const inicial=Array.from(String(p.nombre||'P'))[0],campana=a.campana;
  const valor=k=>campana&&Number.isSafeInteger(campana[k])?numeroPrivado(campana[k]):'—';
  // El mismo conteo confirmado que el detalle: incluye el día iniciado y
  // respeta pausas y suspensiones. No se reconstruye desde el reloj local.
  const dias=campana&&Number.isSafeInteger(campana.dias_cobrados)?campana.dias_cobrados:null;
  return `<details class="admin-hig-fila pe-admin-fila" data-admin-fila="${esc(a.id)}"><summary>
    <span class="pe-identidad"><span class="pe-avatar" aria-hidden="true">${esc(inicial)}</span><span class="admin-hig-identidad"><b>${esc(a.titulo||'Sin título')}</b><small>${esc(p.nombre||'Sin nombre')} <span class="clase-estado clase-estado-${esc(estado[1])}">${esc(estado[0])}</span></small>${descuentoAdminPct(a)===null?'':`<span class="admin-descuento-etiqueta">−${descuentoAdminPct(a)}% GradeHub</span>`}</span></span>
    <span class="pe-fila-metricas" data-pe-anuncio-metricas="${esc(a.id)}">${[['vistas','Vistas'],['aperturas','Aperturas'],['contactos','Contactos']].map(([k,t])=>`<span><b data-pe-conteo="${k}">${valor(k)}</b><small>${t}</small></span>`).join('')}<span><b>${numeroPrivado(dias)}</b><small>Días publicada</small></span><span class="adm-alcance" data-adm-alcance-fila="${esc(a.id)}">${alcanceFilaAdminHTML(null)}</span></span><span class="pe-ver"><i aria-hidden="true">⌄</i><span class="adm-oculto">Ver</span></span>
    </summary><div class="admin-hig-detalle">${a.estado==='en_revision'?revisionAdminAnuncioHTML(a,p):''}${filaAdminAnuncio(a,ahora)}</div></details>`;
}
// Aceptar, rechazar y eliminar (Lucas, 2026-10-23). Eliminar solo aparece
// si no hay historial que perder; si lo hay, se explica por qué y se pausa.
function personaAdminHigHTML(p){
  const id=esc(p.user_id),estado=p.estado;
  const fecha=p.solicitado_at&&Number.isFinite(new Date(p.solicitado_at).getTime())
    ?new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long',timeZone:'America/Santiago'}).format(new Date(p.solicitado_at)):'';
  const alumnos=Number(p.alumnos_conectados)||0;
  const sePuedeEliminar=p.tiene_historial===false&&alumnos===0;
  const porQueNo=p.tiene_historial?'Tiene campañas con cobros: páusalo en vez de eliminarlo.'
    :alumnos?`Tiene ${alumnos} ${alumnos===1?'alumno conectado':'alumnos conectados'}: páusalo en vez de eliminarlo.`:'';
  const acciones=[
    estado==='pendiente'?`<button type="button" class="accion-principal" data-admin-postulacion="${id}" data-estado="aprobado">Aceptar</button><button type="button" class="clase-accion" data-admin-postulacion="${id}" data-estado="rechazado">Rechazar</button>`:'',
    estado==='rechazado'?`<button type="button" class="clase-accion" data-admin-postulacion="${id}" data-estado="aprobado">Aceptar</button>`:'',
    estado==='aprobado'||estado==='suspendido'?`<button type="button" class="clase-accion" data-admin-profesor="${id}" data-estado="${estado==='aprobado'?'suspendido':'aprobado'}">${estado==='aprobado'?'Pausar profesor':'Reactivar profesor'}</button>`:'',
    estado!=='pendiente'&&sePuedeEliminar?`<button type="button" class="clase-accion admin-hig-eliminar" data-admin-eliminar="${id}" data-nombre="${esc(p.nombre||'')}">Eliminar</button>`:'',
  ].join('');
  return `<section class="admin-hig-persona" data-admin-persona="${id}"><div><h3>${esc(p.nombre||'Sin nombre')}</h3><p>${esc(p.correo||'')}</p><p>${esc({aprobado:'Aprobado',pendiente:'Esperando revisión',suspendido:'Suspendido',rechazado:'Rechazado'}[estado]||estado)} · ${(p.anuncios||[]).length} anuncios${estado==='pendiente'&&fecha?` · postuló el ${esc(fecha)}`:''}</p>
    ${estado==='pendiente'&&p.presentacion?`<p class="admin-hig-presentacion">${esc(p.presentacion)}</p>`:''}
    ${estado!=='pendiente'&&porQueNo?`<p class="admin-hig-motivo">${esc(porQueNo)}</p>`:''}</div>
    <div class="admin-hig-persona-acciones">${acciones}${estado==='aprobado'?`<span data-admin-ejemplo="${id}"></span>`:''}</div>
    ${estado==='pendiente'?'':fichaAdminProfesorHTML(p)}</section>`;
}
// La ficha de un profesor (Lucas, 2026-10-23): lo que hace falta para decidir
// y cobrar, sin salir del panel. Sin el SQL nuevo, cada bloque se omite.
const ACCIONES_ADMIN_TEXTO={descuento_anuncio:d=>d&&d.pct!=null?`Fijó un descuento de ${d.pct}% GradeHub`:'Quitó el descuento GradeHub',revisar_postulacion:d=>d&&d.estado==='rechazado'?'Rechazó la postulación':'Aceptó la postulación',
  estado_profesor:d=>d&&d.estado==='suspendido'?'Pausó al profesor':'Reactivó al profesor',panel_alumnos:d=>d&&d.activo?'Mostró el panel de alumnos':'Ocultó el panel de alumnos',
  nota_profesor:()=>'Editó la nota interna',publicar_anuncio:()=>'Publicó un anuncio',devolver_anuncio:()=>'Devolvió un anuncio',pausar_anuncio:()=>'Pausó un anuncio',
  borrar_anuncio_revision:()=>'Borró un anuncio en revisión',terminar_anuncio_pausado:()=>'Terminó una campaña',marcar_cobro:()=>'Registró un cobro'};
function fichaAdminProfesorHTML(p){
  const id=esc(p.user_id),anuncios=(p.anuncios||[]).filter(a=>a.estado!=='eliminado');
  const cuenta=e=>anuncios.filter(a=>e.includes(a.estado)).length;
  const deudas=anuncios.reduce((n,a)=>n+(Array.isArray(a.cobros)?a.cobros:a.cobro?[a.cobro]:[]).filter(c=>c.estado==='deuda').length,0);
  const d30=p.ultimos_30_dias,num=v=>new Intl.NumberFormat('es-CL').format(Number(v)||0);
  const dato=(t,v)=>`<div><dt>${t}</dt><dd>${v}</dd></div>`;
  const alumnos=Number(p.alumnos_conectados)||0,visible=p.panel_alumnos!==false;
  const historial=Array.isArray(p.historial)?p.historial:null;
  const fecha=f=>Number.isFinite(new Date(f).getTime())?new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Santiago'}).format(new Date(f)):'';
  return `<details class="admin-hig-ficha"><summary>Ficha del profesor</summary><div class="admin-hig-ficha-cuerpo">
    <div data-admin-directorio="${id}"></div>
    ${ramosUniversidadPerfilHTML(p)}
    <dl class="admin-hig-ficha-datos">
      ${dato('Publicados',num(cuenta(['publicado'])))}${dato('En revisión',num(cuenta(['en_revision'])))}${dato('Borradores',num(cuenta(['borrador'])))}
      ${dato('Cobros en deuda',num(deudas))}${p.alumnos_conectados!=null?dato('Alumnos conectados',num(alumnos)):''}
    </dl>
    ${d30?barrasDetalleClaseHTML({titulo:'Alcance · últimos 30 días',filas:[{nombre:'Lo vieron',valor:d30.vieron},{nombre:'Lo abrieron',valor:d30.abrieron},{nombre:'Lo contactaron',valor:d30.contactaron}]}):''}
    ${p.panel_alumnos!=null&&p.estado==='aprobado'?`<div class="admin-hig-ficha-fila"><span><b>Panel de alumnos</b><small>${visible?'Lo ve en su menú.':'Oculto: no ve a sus alumnos ni se conecta nadie nuevo.'}</small></span>
      <button type="button" class="clase-accion" role="switch" aria-checked="${visible}" data-admin-panel-alumnos="${id}" data-activo="${!visible}" data-alumnos="${alumnos}">${visible?'Ocultar':'Mostrar'}</button></div>`:''}
    ${p.nota!==undefined?`<label class="modal-label" for="admin-nota-${id}">Nota interna · solo la ven los admins</label>
      <textarea id="admin-nota-${id}" class="admin-hig-nota-texto" maxlength="1000" data-admin-nota-texto="${id}" placeholder="Ej. Material: 15% de comisión, código GRADEHUB 5%">${esc(p.nota||'')}</textarea>
      <button type="button" class="clase-accion" data-admin-nota="${id}">Guardar nota</button>`:''}
    ${historial?`<h4>Últimos cambios</h4>${historial.length?`<ul class="admin-hig-historial">${historial.map(h=>`<li><span>${esc((ACCIONES_ADMIN_TEXTO[h.accion]||(()=>h.accion))(h.detalle))}</span><small>${esc(fecha(h.fecha))}${h.admin?' · '+esc(h.admin):''}</small></li>`).join('')}</ul>`:'<p class="admin-hig-motivo">Sin cambios registrados.</p>'}`:''}
  </div></details>`;
}
// El número de postulaciones esperando va en el riel: «Profesores · 2».
function marcarPendientesNavAdmin(n){
  if(typeof document==='undefined'||typeof document.querySelector!=='function')return;
  const b=document.querySelector('[data-nav-vista="admin:profesores"]');if(!b)return;
  b.textContent=n?`Profesores · ${n}`:'Profesores';
  if(n)b.setAttribute('aria-label',`Profesores, ${n} ${n===1?'postulación':'postulaciones'} por revisar`);else b.removeAttribute('aria-label');
}
// Filtro y búsqueda de profesores, con Aprobados como estado inicial.
const FILTROS_PROFESORES_ADMIN=[['aprobado','Aprobados'],['pendiente','Pendientes'],['suspendido','Pausados'],['rechazado','Rechazados'],['','Todos']];
function filtrarProfesoresAdmin(profesores,{estado='',busqueda=''}={}){
  const palabras=normalizarBusquedaClase(busqueda).split(' ').filter(Boolean);
  return (profesores||[]).filter(p=>(!estado||p.estado===estado)&&palabras.every(t=>normalizarBusquedaClase(p.nombre||'').includes(t)));
}

// Separado del panel antiguo: un SQL pendiente no afecta revisión ni anuncios.
async function enlazarDirectorioAdmin(raiz){
  const cajas=[...raiz.querySelectorAll('[data-admin-directorio]')];if(!cajas.length)return;
  try{
    const {data,error}=await supabaseClient.rpc('admin_directorio_perfiles');if(error||!Array.isArray(data))return;
    let metricas=[];try{const r=await supabaseClient.rpc('admin_metricas_directorio');if(!r.error&&Array.isArray(r.data))metricas=r.data;}catch(e){}
    for(const caja of cajas){
      if(!caja.isConnected)continue;
      const p=data.find(p=>p.user_id===caja.dataset.adminDirectorio);if(!p)continue;
      const fecha=p.destacado_hasta?new Date(p.destacado_hasta):null;
      const local=fecha&&!isNaN(fecha)?new Date(fecha.getTime()-fecha.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
      caja.innerHTML=`<div class="directorio-admin"><p>${esc(p.etiqueta||'Sin etiqueta')} · ${p.en_directorio?'En el directorio':'Sin permiso para aparecer'}</p>
        <label for="directorio-hasta-${esc(p.user_id)}">Destacado hasta · hora local</label><input type="datetime-local" id="directorio-hasta-${esc(p.user_id)}" value="${local}">
        <button type="button" class="clase-accion" data-destacado-guardar>Guardar destacado</button><button type="button" class="clase-accion" data-destacado-quitar>Quitar destacado</button><p role="status"></p></div>`;
      const m=metricas.find(m=>m.user_id===p.user_id);if(m)caja.insertAdjacentHTML('beforeend',metricasDirectorioHTML(m.metricas));
      const guardar=async quitar=>{
        const campo=caja.querySelector('input'),estado=caja.querySelector('[role=status]');
        if(!quitar&&(!campo.value||!Number.isFinite(new Date(campo.value).getTime()))){estado.textContent='Elige una fecha futura.';campo.focus();return;}
        caja.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{
          const r=await supabaseClient.rpc('admin_destacado_perfil',{p_user_id:p.user_id,p_hasta:quitar?null:new Date(campo.value).toISOString()});
          if(!caja.isConnected)return;
          estado.textContent=!r.error&&r.data===true?(quitar?'Destacado quitado.':'Destacado guardado.'):'No se guardó. Revisa la fecha y tu segundo factor.';
          if(!r.error&&r.data===true&&quitar)campo.value='';
        }catch(e){estado.textContent='No se guardó. Revisa tu conexión.';}
        finally{caja.querySelectorAll('button').forEach(b=>b.disabled=false);}
      };
      caja.querySelector('[data-destacado-guardar]').addEventListener('click',()=>guardar(false));
      caja.querySelector('[data-destacado-quitar]').addEventListener('click',()=>guardar(true));
    }
  }catch(e){}
}
