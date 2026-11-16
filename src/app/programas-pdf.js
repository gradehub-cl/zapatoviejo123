// Programas privados: ningún PDF cambia una pauta ni publica datos por sí solo.
const PROGRAMA_PDF_MAX=10*1024*1024,MIN_MOTIVO_PROGRAMA=3,SIGLA_PROGRAMA_MAX=40;
function programaUuid(){
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
async function validarProgramaPdf(archivo,pdfjs=null){
  if(!archivo||!Number.isFinite(archivo.size)||archivo.size<5)throw Error('Elige un PDF válido.');
  if(archivo.size>PROGRAMA_PDF_MAX)throw Error('El PDF debe pesar 10 MB o menos.');
  const cabecera=new Uint8Array(await archivo.slice(0,5).arrayBuffer());
  if(String.fromCharCode(...cabecera)!=='%PDF-')throw Error('Ese archivo no es un PDF.');
  pdfjs=pdfjs||await cargarPdfJs();if(!pdfjs)throw Error('No pudimos cargar el lector de PDF. Revisa tu conexión.');
  let lectura;
  try{lectura=await lineasDePdf(archivo,pdfjs,{metadatos:true,maxPaginas:Infinity,pararConTexto:true});}
  catch{throw Error('No pudimos leer ese PDF. Si tiene contraseña, manda una copia sin contraseña.');}
  if(!Number.isInteger(lectura.paginas)||lectura.paginas<1)throw Error('No pudimos leer las páginas del PDF.');
  const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await archivo.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
  return {bytes:archivo.size,sha256,paginas:lectura.paginas,con_texto:lectura.lineas.some(l=>String(l).trim().length>0)};
}
function estadoProgramaTexto(p){
  if(!p)return '';
  return (p.estado==='publicado'?'Programa enviado · Publicado':p.estado==='descartado'?'Programa enviado · No sirvió':'Programa enviado · en revisión')+(p.motivo?' · '+p.motivo:'');
}
let versionProgramaFicha=0;const programasFichaCache=new Map();
function pintarProgramaPdfRamo(r){
  const origen=document.getElementById('pauta-periodo');if(!origen||typeof origen.insertAdjacentElement!=='function')return;
  let caja=document.getElementById('ramo-programa-pdf');
  if(!caja){caja=document.createElement('section');caja.id='ramo-programa-pdf';caja.className='programa-pdf-ficha';origen.insertAdjacentElement('afterend',caja);}
  if(esCuentaProfesor()){caja.hidden=true;return;}caja.hidden=false;
  const oficial=!!definicionPresetDelRamo(r)&&!pautaEditada(r),version=++versionProgramaFicha,usuario=currentUser?.id;
  caja.innerHTML=`<button type="button" class="programa-pdf-boton${oficial?'':' programa-pdf-destacado'}">Mandar el programa (PDF)</button><p class="programa-pdf-estado" role="status"></p>`;
  caja.querySelector('button').addEventListener('click',()=>abrirProgramaPdf(r.id));
  if(!supabaseClient||!usuario)return;
  const clave=usuario+':'+r.id,cached=programasFichaCache.get(clave);
  if(cached&&Date.now()-cached.fecha<30000){caja.querySelector('.programa-pdf-estado').textContent=estadoProgramaTexto(cached.programa);return;}
  supabaseClient.rpc('mis_programas_enviados',{p_ramo_id:r.id}).then(({data,error})=>{
    if(error||version!==versionProgramaFicha||currentUser?.id!==usuario||!caja.isConnected)return;
    const programa=Array.isArray(data)?data[0]:null;programasFichaCache.set(clave,{fecha:Date.now(),programa});
    caja.querySelector('.programa-pdf-estado').textContent=estadoProgramaTexto(programa);
  }).catch(()=>{});
}
async function mandarProgramaPdf(archivo,datos,meta,estadoCarga={}){
  const cliente=supabaseClient,usuario=currentUser?.id;if(!cliente||!usuario)throw Error('Inicia sesión para mandar un programa.');
  const args={p_tenant:datos.tenant,p_carrera:datos.carrera||null,p_sigla:datos.sigla||null,p_ramo:datos.ramo,p_periodo:datos.periodo,p_ramo_id:datos.ramoId,p_bytes:meta.bytes,p_sha256:meta.sha256,p_paginas:meta.paginas,p_con_texto:meta.con_texto};
  if(!estadoCarga.ruta){
    const previo=await cliente.rpc('programa_ya_recibido',{p_tenant:args.p_tenant,p_sigla:args.p_sigla,p_periodo:args.p_periodo,p_sha256:args.p_sha256});
    if(previo.error)throw Error('El envío de programas aún no está disponible. Intenta más tarde.');
    if(currentUser?.id!==usuario)throw Error('La sesión cambió. Vuelve a abrir el envío.');
    if(previo.data===true)return {duplicado:true};
    estadoCarga.ruta=usuario+'/'+programaUuid()+'.pdf';
  }
  const almacen=cliente.storage.from('programas');
  if(!estadoCarga.subido){
    const sube=await almacen.upload(estadoCarga.ruta,archivo,{contentType:'application/pdf',upsert:false});
    // Si la respuesta se perdió, un reintento puede encontrar su mismo objeto.
    if(sube.error&&!['409','Duplicate','23505'].includes(String(sube.error.statusCode||sube.error.code)))throw Error('No pudimos subir el PDF. Revisa tu conexión y vuelve a intentar.');
    estadoCarga.subido=true;
  }
  if(currentUser?.id!==usuario)throw Error('La sesión cambió. Vuelve a abrir el envío.');
  const envio=await cliente.rpc('enviar_programa',{...args,p_ruta:estadoCarga.ruta});
  if(envio.error)throw Error(envio.error.code==='P0001'?'Puedes mandar hasta 5 programas al día. Intenta mañana.':'No pudimos confirmar el envío. Vuelve a intentarlo.');
  if(envio.data?.duplicado){
    // Otra persona lo envió en paralelo: no deja una segunda copia privada.
    const borrado=await almacen.remove([estadoCarga.ruta]);
    if(borrado.error)throw Error('No pudimos terminar el envío. Vuelve a intentar para completarlo.');
    return {duplicado:true};
  }
  if(!envio.data?.id)throw Error('No pudimos confirmar el envío. Vuelve a intentarlo.');
  return envio.data;
}
function abrirProgramaPdf(ramoId){
  const r=S.ramos.find(x=>x.id===ramoId);if(!r||esCuentaProfesor())return;
  if(!supabaseClient||!currentUser){showToast('Inicia sesión para mandar el programa.',true);return;}
  const usuario=currentUser.id,caja=document.getElementById('modal-content'),info=infoPeriodoPauta(r);
  let archivo=null,meta=null,leyendo=false,estadoCarga={};
  caja.innerHTML=`<form class="programa-pdf-form"><h2 class="modal-title">Manda el programa del ramo</h2><p class="modal-desc">Ayuda a tus compañeros: sube el programa y podremos revisar la pauta para todos.</p>
    <label class="programa-pdf-elegir">Elegir PDF<input type="file" accept="application/pdf,.pdf" aria-label="Elegir programa en PDF"></label><p class="programa-pdf-archivo" role="status" aria-live="polite">Máximo 10 MB. El archivo se guarda en privado.</p>
    <div class="programa-pdf-campos"><label>Universidad<select name="tenant">${Object.entries(TENANTS).map(([k,t])=>`<option value="${k}"${k===S.tenant?' selected':''}>${esc(t.label||t.name)}</option>`).join('')}</select></label>
    <label>Carrera <small>(opcional)</small><input name="carrera" type="text" maxlength="100" value="${esc(r.origen?.carrera||S.carrera||'')}"></label>
    <label>Sigla <small>(si aparece en el programa)</small><input name="sigla" type="text" maxlength="${SIGLA_PROGRAMA_MAX}" value="${esc(siglaDeRamo(r)||'')}"></label>
    <label>Ramo<input name="ramo" type="text" maxlength="160" required value="${esc(r.nombre)}"></label>
    <label>Período<input name="periodo" type="text" maxlength="32" required value="${esc(info?.periodo||semester())}" placeholder="Ej.: 2026-2"></label></div>
    <p class="programa-pdf-privacidad">Lo revisa una persona antes de publicarlo. Tu nombre no aparece en la pauta.</p><p class="programa-pdf-error" role="alert"></p>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-programa-cancelar>Cancelar</button><button type="submit" class="btn-confirm" disabled>Mandar programa</button></div></form>`;
  const form=caja.querySelector('form'),estado=caja.querySelector('.programa-pdf-archivo'),error=caja.querySelector('.programa-pdf-error'),enviar=form.querySelector('[type=submit]');
  const vigente=()=>currentUser?.id===usuario&&form.isConnected&&document.getElementById('modal')?.classList.contains('open');
  caja.querySelector('[data-programa-cancelar]').addEventListener('click',closeModal);
  const input=form.querySelector('[type=file]');input.addEventListener('change',async()=>{
    const elegido=input.files?.[0];if(!elegido||leyendo)return;
    leyendo=true;input.disabled=true;enviar.disabled=true;error.textContent='';estado.textContent='Revisando el PDF en tu dispositivo…';
    try{
      const leido=await validarProgramaPdf(elegido);if(!vigente())return;
      archivo=elegido;meta=leido;estadoCarga={};
      estado.textContent=`${elegido.name} · ${meta.paginas} ${meta.paginas===1?'página':'páginas'}`+(meta.con_texto?'':' · No detectamos texto: lo aceptamos, pero la revisión será más lenta.');enviar.disabled=false;
    }catch(e){if(vigente()){archivo=null;meta=null;error.textContent=e.message;estado.textContent='Elige otro PDF.';}}
    finally{leyendo=false;input.disabled=false;}
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(enviar.disabled||!archivo||!meta||!vigente())return;
    const datos={ramoId:r.id,...Object.fromEntries(['tenant','carrera','sigla','ramo','periodo'].map(k=>[k,form.elements[k].value.trim()]))};datos.sigla=datos.sigla.toUpperCase().replace(/\s/g,'');
    if(datos.sigla&&!/^[A-Z0-9_-]{1,40}$/.test(datos.sigla)){error.textContent='Revisa la sigla: usa letras, números, guion o guion bajo.';return;}
    form.querySelectorAll('input,select').forEach(n=>n.disabled=true);enviar.disabled=true;enviar.textContent='Enviando…';error.textContent='';
    try{
      const resultado=await mandarProgramaPdf(archivo,datos,meta,estadoCarga);if(!vigente())return;
      programasFichaCache.delete(usuario+':'+r.id);closeModal();if(currentRamoId===r.id)renderRamo();
      showToast(resultado.duplicado?'Ya lo tenemos, gracias.':'Programa enviado · en revisión');
    }catch(e){if(vigente())error.textContent=e.message;}
    finally{if(!estadoCarga.ruta)form.querySelectorAll('input,select').forEach(n=>n.disabled=false);enviar.disabled=false;enviar.textContent='Mandar programa';}
  });openModal();
}
// La revisión vive dentro de la bandeja existente, sin alterar los reportes de texto.
function prepararPestanasProgramas(caja){
  if(typeof caja.insertAdjacentHTML!=='function')return caja; // DOM de pruebas antiguas.
  caja.innerHTML='<div class="programas-pestanas" role="tablist" aria-label="Reportes de programa"><button type="button" role="tab" aria-selected="true" data-programas-tab="textos">Textos</button><button type="button" role="tab" aria-selected="false" data-programas-tab="pdf">PDFs</button></div><div data-programas-textos></div><div data-programas-pdf hidden></div>';
  caja.querySelectorAll('[data-programas-tab]').forEach(b=>b.addEventListener('click',()=>{
    const pdf=b.dataset.programasTab==='pdf';caja.querySelector('[data-programas-textos]').hidden=pdf;caja.querySelector('[data-programas-pdf]').hidden=!pdf;
    caja.querySelectorAll('[data-programas-tab]').forEach(n=>n.setAttribute('aria-selected',String(n===b)));
    if(pdf)pintarColaProgramas(caja.querySelector('[data-programas-pdf]'));
  }));return caja.querySelector('[data-programas-textos]');
}
async function pintarColaProgramas(caja,tenant=''){
  caja.innerHTML='<p role="status">Cargando programas…</p>';
  let resultado;try{resultado=await supabaseClient.rpc('admin_programas_enviados',{p_tenant:tenant||null});}catch{resultado={error:true};}
  const {data,error}=resultado;if(!caja.isConnected)return;
  if(error){caja.innerHTML='<p role="alert">No pudimos cargar los PDFs. Revisa que tengas la verificación en dos pasos e intenta más tarde.</p>';return;}
  caja.innerHTML=`<label>Universidad<select data-programas-tenant><option value="">Todas</option>${Object.entries(TENANTS).map(([k,t])=>`<option value="${k}"${k===tenant?' selected':''}>${esc(t.label||t.name)}</option>`).join('')}</select></label><p>Usa «Publicado» cuando la pauta ya esté disponible para estudiantes.</p>${(data||[]).length?(data||[]).map(p=>`<article class="programa-pdf-revision"><h4>${esc(p.ramo)}</h4><p>${esc([TENANTS[p.tenant]?.short,p.sigla,p.carrera,p.periodo].filter(Boolean).join(' · '))} · ${p.paginas} páginas${p.con_texto?'':' · Sin texto'}</p><button type="button" class="programa-pdf-boton" data-descargar="${esc(p.id)}">Descargar PDF</button><label>Motivo<input type="text" maxlength="240" data-motivo="${esc(p.id)}" placeholder="Resultado de la revisión"></label><div class="programa-pdf-acciones"><button type="button" class="programa-pdf-boton" data-revisar="${esc(p.id)}" data-estado="publicado">Publicado</button><button type="button" class="programa-pdf-boton" data-revisar="${esc(p.id)}" data-estado="descartado">No sirvió</button></div><p role="status" data-estado-programa="${esc(p.id)}"></p></article>`).join(''):'<p>No hay programas pendientes en esta universidad.</p>'}`;
  caja.querySelector('[data-programas-tenant]').addEventListener('change',e=>pintarColaProgramas(caja,e.target.value));
  caja.querySelectorAll('[data-descargar]').forEach(b=>b.addEventListener('click',async()=>{
    const p=data.find(p=>p.id===b.dataset.descargar),aviso=caja.querySelector('[data-estado-programa="'+p.id+'"]');b.disabled=true;
    let r;try{r=await supabaseClient.storage.from('programas').createSignedUrl(p.ruta,60);}catch{r={error:true};}b.disabled=false;
    if(r.error||!r.data?.signedUrl){aviso.textContent='No pudimos preparar la descarga. Revisa tu sesión.';return;}
    if(typeof enAppNativa==='function'&&enAppNativa()){abrirFuera(r.data.signedUrl);return;}
    const a=document.createElement('a');a.href=r.data.signedUrl;a.rel='noopener noreferrer';a.target='_blank';a.download='programa-'+p.id+'.pdf';a.click();
  }));
  caja.querySelectorAll('[data-revisar]').forEach(b=>b.addEventListener('click',async()=>{
    const motivo=caja.querySelector('[data-motivo="'+b.dataset.revisar+'"]').value.trim(),aviso=caja.querySelector('[data-estado-programa="'+b.dataset.revisar+'"]');
    if(motivo.length<MIN_MOTIVO_PROGRAMA){aviso.textContent='Escribe un motivo breve para la persona que lo mandó.';return;}
    b.disabled=true;let r;try{r=await supabaseClient.rpc('admin_revisar_programa',{p_id:b.dataset.revisar,p_estado:b.dataset.estado,p_motivo:motivo});}catch{r={error:true};}
    if(r.error||r.data!==true){aviso.textContent='No pudimos guardar la revisión. Intenta de nuevo.';b.disabled=false;return;}pintarColaProgramas(caja,tenant);
  }));
}

// Sin PDFs (incluido SQL todavía ausente), conserva la RPC de borrado anterior.
async function borrarProgramasAntesDeCuenta(){
  const previo=await supabaseClient.rpc('programas_cuenta_tiene_archivos');
  if(previo.error){
    if(['42883','PGRST202'].includes(previo.error.code))return false;
    throw Error('No pudimos revisar tus programas');
  }
  if(previo.data!==true)return false;
  const sesion=await supabaseClient.auth.getSession(),token=sesion.data?.session?.access_token;
  if(!token)throw Error('Sin sesión');
  const origen=typeof enAppNativa==='function'&&enAppNativa()?'https://gradehub.cl':'';
  const r=await fetch(origen+'/cuenta-programas',{method:'POST',headers:{Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('No se completó el borrado de programas');
  return true;
}
