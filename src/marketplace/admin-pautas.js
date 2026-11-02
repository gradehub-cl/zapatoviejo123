// Banco privado: el catálogo y las pautas de estudiantes no se editan desde acá.
function pautaBancoEstado(estado){return ({confirmada:'Confirmada',en_disputa:'En disputa',sin_pauta:'Sin pauta'})[estado]||'Sin pauta';}
function pautaBancoEstructuraHTML(estructura){
  const evals=Array.isArray(estructura)?estructura:estructura&&estructura.evals||[];
  return `<ul class="pautas-banco-pesos">${evals.map(e=>{const nombre=Array.isArray(e)?e[0]:e.nombre,peso=Array.isArray(e)?e[1]:e.peso;return `<li><span>${esc(nombre)}</span><strong>${esc(peso)}%</strong></li>`;}).join('')}</ul>`;
}
function filaPautaBancoHTML(f,i){
  return `<details class="pautas-banco-fila"><summary><span><strong>${esc(f.sigla)}</strong> ${esc(f.nombre)}</span><span>${pautaBancoEstado(f.estado)}</span></summary>
    <div class="pautas-banco-detalle"><section><h3>Pauta del catálogo</h3><p>${esc(f.periodo_catalogo||'Período no declarado')}</p>
    ${f.pauta?pautaBancoEstructuraHTML(f.pauta):'<p>Sin pauta en el catálogo.</p>'}
    <p>${esc(f.fuente||'Fuente documental no registrada')}</p>${f.documento_path?`<button type="button" data-pauta-documento="${i}">Abrir programa</button>`:''}
    ${(f.faltantes||[]).length?`<ul>${f.faltantes.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}</section>
    <section><h3>Reportes · ${esc(f.periodo)}</h3>${(f.variantes||[]).length?f.variantes.map(v=>`<article><h4>${v.personas} ${v.personas===1?'persona':'personas'} · ${v.origen==='explicito'?'Explícito':'Automático'} · ${v.seccion?'Sección '+esc(v.seccion):'Sin sección'}</h4>${pautaBancoEstructuraHTML(v.estructura)}${(v.comentarios||[]).map(n=>`<p>${esc(n)}</p>`).join('')}</article>`).join(''):'<p>Sin reportes en este período.</p>'}</section>
    <section><h3>Diferencias con el portal</h3><div data-pauta-discrepancias="${i}">Abre la ficha para consultar.</div></section>
    <form data-pauta-form="${i}"><h3>Revisión interna</h3><label>Estado<select name="estado">${['confirmada','en_disputa','sin_pauta'].map(v=>`<option value="${v}"${v===f.estado?' selected':''}>${pautaBancoEstado(v)}</option>`).join('')}</select></label>
    <label>Nota del equipo<textarea name="nota" maxlength="4000" rows="3">${esc(f.nota_interna||'')}</textarea></label>
    <label>Programa PDF<input name="documento" type="file" accept="application/pdf,.pdf"></label><p>Hasta 10 MB · privado, sin publicar cambios al catálogo.</p>
    <button type="submit" class="accion-principal">Guardar revisión</button><p role="status" data-pauta-aviso></p></form></div></details>`;
}
async function renderAdminPautas(caja){
  if(!caja||caja.dataset.pautasLista)return;
  caja.dataset.pautasLista='1';
  caja.innerHTML=`<h2>Pautas</h2><form class="pautas-banco-filtros"><label>Universidad<select name="tenant">${Object.keys(TENANTS).map(t=>`<option value="${t}">${esc(TENANTS[t].label||TENANTS[t].name)}</option>`).join('')}</select></label><label>Período<input name="periodo" type="text" pattern="[0-9]{4}-[12v]" value="${esc(semester())}" maxlength="6" required></label><label>Buscar<input name="buscar" type="search" placeholder="Sigla o nombre" maxlength="160"></label><button type="submit">Buscar</button></form><div data-pautas-resultados role="status"></div>`;
  const filtros=caja.querySelector('form'),resultados=caja.querySelector('[data-pautas-resultados]');
  let peticion=0;
  async function cargar(){
    const esta=++peticion,tenant=filtros.elements.tenant.value,periodo=filtros.elements.periodo.value;
    resultados.textContent='Cargando pautas…';
    try{
      const {data,error}=await supabaseClient.rpc('admin_pautas_banco',{p_tenant:tenant,p_periodo:periodo,p_busqueda:filtros.elements.buscar.value.trim()});
      if(esta!==peticion||caja.isConnected===false)return;
      if(error)throw error;
      const filas=Array.isArray(data)?data:[];
      resultados.innerHTML=filas.length?filas.map(filaPautaBancoHTML).join(''):'No encontramos pautas para esa búsqueda.';
      resultados.querySelectorAll('.pautas-banco-fila').forEach((detalle,i)=>detalle.addEventListener('toggle',async()=>{
        if(!detalle.open||detalle.dataset.discrepanciasCargadas)return;
        const f=filas[i],destino=detalle.querySelector('[data-pauta-discrepancias]');detalle.dataset.discrepanciasCargadas='1';
        try{
          const {data,error}=await supabaseClient.rpc('admin_discrepancias_pauta',{p_tenant:tenant,p_sigla:f.sigla,p_periodo:periodo});
          if(error)throw error;
          destino.innerHTML=(data||[]).length?(data||[]).map(d=>`<p><strong>${d.personas} ${d.personas===1?'persona':'personas'}</strong> · GradeHub ${esc(d.calculada)} / portal ${esc(d.oficial)} · Pauta ${d.pauta_origen==='oficial'?'oficial':'editada'}<br><small>Huella: ${esc(d.huella)}</small></p>`).join('')+'<p>Una diferencia requiere revisar la pauta y si se ingresaron todas las notas; por sí sola no demuestra un error del motor.</p>':'Sin diferencias registradas.';
        }catch(error){destino.textContent='No pudimos consultar. Revisa que discrepancias_nota.sql esté aplicado e intenta de nuevo.';delete detalle.dataset.discrepanciasCargadas;}
      }));
      resultados.querySelectorAll('[data-pauta-form]').forEach(form=>form.addEventListener('submit',async e=>{
        e.preventDefault();const fila=filas[Number(form.dataset.pautaForm)],aviso=form.querySelector('[data-pauta-aviso]'),boton=form.querySelector('[type=submit]');boton.disabled=true;
        try{
          let ruta=null,hash=null;const archivo=form.elements.documento.files[0];
          if(archivo){
            if(archivo.type!=='application/pdf'||archivo.size>10485760)throw Error('Elige un PDF de hasta 10 MB.');
            const bytes=await archivo.arrayBuffer();
            if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Ese archivo no parece un PDF.');
            hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
            ruta=[tenant,fila.sigla,periodo,crypto.randomUUID()+'.pdf'].join('/');
            const subida=await supabaseClient.storage.from('pautas-programas').upload(ruta,archivo,{contentType:'application/pdf',upsert:false});if(subida.error)throw subida.error;
          }
          const guardado=await supabaseClient.rpc('admin_guardar_pauta_banco',{p_tenant:tenant,p_sigla:fila.sigla,p_periodo:periodo,p_estado:form.elements.estado.value,p_nota:form.elements.nota.value,p_documento_path:ruta,p_sha256:hash});
          if(guardado.error)throw guardado.error;
          if(ruta){fila.documento_path=ruta;fila.documento_sha256=hash;}aviso.textContent='Revisión guardada';
        }catch(error){aviso.textContent=error.message||'No pudimos guardar. Intenta de nuevo.';}finally{boton.disabled=false;}
      }));
      resultados.querySelectorAll('[data-pauta-documento]').forEach(b=>b.addEventListener('click',async()=>{
        const f=filas[Number(b.dataset.pautaDocumento)];
        const ventana=window.open('about:blank','_blank');if(ventana)ventana.opener=null;
        const {data,error}=await supabaseClient.storage.from('pautas-programas').createSignedUrl(f.documento_path,60);
        if(error){if(ventana)ventana.close();showToast('No pudimos abrir el documento');return;}
        if(ventana)ventana.location.href=data.signedUrl;
        else showToast('Permite abrir una ventana para ver el programa.');
      }));
    }catch(error){resultados.textContent=sqlClasesDesactualizado(error)?'Aplica pautas_banco.sql para consultar el banco.':'No pudimos cargar las pautas. Revisa tu sesión con segundo factor e intenta de nuevo.';}
  }
  filtros.addEventListener('submit',e=>{e.preventDefault();cargar();});await cargar();
}
