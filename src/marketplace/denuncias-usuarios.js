
// ─── ADMIN: DENUNCIAS DE USUARIOS (Amigos) ──────────────────────────────────
// Las de supabase/amigos.sql: username ofensivo, acoso, suplantación o spam.
// El admin ve el username denunciado (el de ese momento y el actual), el motivo,
// el detalle y cuántas pendientes tiene esa cuenta; nunca quién denunció.
// «Quitar username» la obliga a elegir otro y cierra todas sus pendientes;
// «Descartar» también las cierra todas. App Review 1.2: responder en 24 horas.
const MOTIVOS_DENUNCIA_USUARIO={username_ofensivo:'Username ofensivo',acoso:'Acoso',suplantacion:'Suplantación',spam:'Spam',otro:'Otro'};
// Una tarjeta por cuenta denunciada, con todas sus denuncias juntas.
function gruposDenunciasUsuarios(filas){
  const grupos=new Map();
  for(const f of Array.isArray(filas)?filas:[]){
    const clave=f.username_actual||'sin:'+f.username;
    if(!grupos.has(clave))grupos.set(clave,{id:f.id,username:f.username,actual:f.username_actual,motivos:[],detalles:[],total:0,desde:f.created_at});
    const g=grupos.get(clave);
    g.total++;if(!g.motivos.includes(f.motivo))g.motivos.push(f.motivo);if(f.detalle)g.detalles.push(f.detalle);
    if(f.created_at<g.desde)g.desde=f.created_at;
  }
  return [...grupos.values()].sort((a,b)=>b.total-a.total||String(a.desde).localeCompare(String(b.desde)));
}
function denunciaUsuarioHTML(g){
  const cambio=g.actual&&g.actual!==g.username;
  return `<article class="admin-revision denuncia-admin" aria-label="Usuario @${esc(g.actual||g.username)}">
    <h4>@${esc(g.actual||g.username)}${cambio?` <small>(denunciado como @${esc(g.username)})</small>`:''}${!g.actual?' <small>(ya sin username)</small>':''}</h4>
    <p class="clase-card-meta">${g.total} ${g.total===1?'denuncia':'denuncias'} · ${esc(g.motivos.map(m=>MOTIVOS_DENUNCIA_USUARIO[m]||m).join(' · '))} · desde ${esc(new Date(g.desde).toLocaleString('es-CL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</p>
    ${g.detalles.length?`<ul class="denuncia-admin-detalles">${g.detalles.map(d=>`<li>«${esc(d)}»</li>`).join('')}</ul>`:''}
    <div class="admin-revision-acciones">
      ${g.actual?`<button type="button" class="btn-confirm" data-denuncia-usuario="${esc(g.id)}" data-estado="resuelta" data-user="${esc(g.actual)}">Quitar username</button>`:''}
      <button type="button" class="clase-accion" data-denuncia-usuario="${esc(g.id)}" data-estado="descartada" data-user="${esc(g.actual||g.username)}">Descartar</button>
    </div>
  </article>`;
}
async function pintarDenunciasUsuariosAdmin(raiz){
  const caja=raiz&&raiz.querySelector('#admin-denuncias-usuarios');
  if(!caja)return;
  const titulo='<h3>Denuncias de usuarios</h3>';
  let grupos;
  try{
    const {data,error}=await supabaseClient.rpc('admin_denuncias_usuarios');
    if(!caja.isConnected)return;
    if(error){caja.innerHTML=titulo+`<p class="profesor-info" role="alert">${sqlClasesDesactualizado(error)?'Estará disponible cuando se aplique supabase/amigos.sql.':'No pudimos cargar las denuncias. Actualiza para intentar de nuevo.'}</p>`;return;}
    grupos=gruposDenunciasUsuarios(data);
  }catch(e){if(caja.isConnected)caja.innerHTML=titulo+'<p class="profesor-info" role="alert">No pudimos cargar las denuncias. Actualiza para intentar de nuevo.</p>';return;}
  caja.innerHTML=titulo+(grupos.length
    ?`<p class="admin-hig-nota">${grupos.length} ${grupos.length===1?'cuenta denunciada':'cuentas denunciadas'} · respóndelas dentro de 24 horas</p><div class="admin-hig-lista">${grupos.map(denunciaUsuarioHTML).join('')}</div>`
    :'<p class="admin-hig-vacio">No hay denuncias de usuarios pendientes.</p>');
  caja.querySelectorAll('[data-denuncia-usuario]').forEach(b=>b.addEventListener('click',()=>{
    const quitar=b.dataset.estado==='resuelta',u=b.dataset.user;
    showConfirm(quitar?`¿Quitar el username @${u}?`:`¿Descartar las denuncias a @${u}?`,
      quitar?'Tendrá que elegir otro para volver a Amigos. Sus amistades y grupos se mantienen. Se cierran todas sus denuncias pendientes.'
        :'Se cierran todas sus denuncias pendientes sin cambiar nada en su cuenta.',
      async()=>{
        if(b.disabled)return;b.disabled=true;
        try{
          const {data,error}=await supabaseClient.rpc('admin_resolver_denuncia_usuario',{p_id:Number(b.dataset.denunciaUsuario),p_estado:b.dataset.estado});
          if(error||!data)throw error||Error('sin cambios');
          showToast(quitar?`Quitaste @${u}`:'Denuncias descartadas');
          pintarDenunciasUsuariosAdmin(raiz);
        }catch(e){showToast('No se guardó. Actualiza e intenta de nuevo.',true);if(b.isConnected)b.disabled=false;}
      },{label:quitar?'Quitar username':'Descartar',danger:quitar});
  }));
}
