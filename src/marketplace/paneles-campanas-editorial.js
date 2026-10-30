// Los rangos solo suman conteos recibidos. Nunca se estima un dato ausente.
function datosAdminEditorial(historial,alcance){
  return Array.isArray(historial)?historial:Array.isArray(alcance)?alcance.map(d=>({dia:d.dia,vistas:Number(d.vieron)||0,aperturas:Number(d.abrieron)||0,contactos:Number(d.contactaron)||0})):null;
}
function cifrasAlcancePrivadoHTML(filas,detalle){
  const s=sumarHistorialPrivado(filas);
  return `<div class="pe-cifras">${cifraPrivadaHTML(numeroPrivado(s.vistas),'Vistas',detalle)}${cifraPrivadaHTML(numeroPrivado(s.aperturas),'Aperturas',detalle)}${cifraPrivadaHTML(numeroPrivado(s.contactos),'Clics en contacto',detalle)}</div>`;
}
function panelAlcancePrivadoHTML(filas,periodo,metrica,ahora,tipo='columnas'){
  if(!Array.isArray(filas))return '<p class="clase-sin-datos" role="status">Aplica paneles_historial.sql para ver el historial de anuncios.</p>';
  const s=serieHistorialPrivado(filas,periodo,metrica,ahora),titulo=(metrica==='contactos'?'Clics en contacto':'Vistas')+(s.semanal?' por semana':' por día');
  return `${cifrasAlcancePrivadoHTML(s.filas,'Personas por campaña')}${graficoPrivadoHTML(s.puntos,{titulo,tipo,unidad:metrica==='contactos'?'contactos':'vistas',id:'campanas-'+tipo})}`;
}
function costoPanelPrivadoHTML(costos){
  const costo=costos.every(Boolean)?sumarCostosCampana(costos):null;
  if(!costos.length)return '<section class="pe-costos"><p class="pe-sub">Sin campañas activas.</p></section>';
  return `<section class="pe-costos"><div><h3>Campañas activas</h3>${presupuestoProfesorHTML(costo)}${costo&&costo.tope!==null?`<p class="pe-sub">${pesosClase(Math.max(0,costo.tope-costo.total))} disponibles del tope</p>`:''}</div><div>${costoApiladoClase(costo,pesosClase)}</div></section>`;
}
function anunciosAdminEditorialHTML(profesores,ahora,historial=null,alcance=null){
  const filas=datosAdminEditorial(historial,alcance),r=resumenAdminClases(profesores,ahora);
  const costos=filasAdminHig(profesores,ahora).filter(f=>f.estado[1]==='publicado').map(f=>f.costo);
  return `<div class="pe-dashboard" data-pe-admin>
    <div class="pe-rango-cabeza">${periodoPrivadoHTML('7')}<span class="pe-sub">Personas por campaña</span></div>
    ${historial===null?'<p class="pe-sub" role="status">Historial completo y métricas por anuncio: aplica paneles_historial.sql. El rango usa los días disponibles.</p>':''}
    <div class="pe-admin-grilla"><div><div data-pe-admin-alcance>${panelAlcancePrivadoHTML(filas,'7','vistas',ahora)}</div><div class="pe-periodos" role="group" aria-label="Métrica del gráfico"><button type="button" data-pe-metrica="vistas" aria-pressed="true">Vistas</button><button type="button" data-pe-metrica="contactos" aria-pressed="false">Contactos</button></div></div>
      <aside class="pe-cola"><h3>Por revisar</h3><button type="button" data-pe-revisar="anuncios"><strong>${r.revision}</strong><span>Anuncios</span><i aria-hidden="true">›</i></button><button type="button" data-pe-revisar="profesores"><strong>${r.pendientes}</strong><span>Perfiles de profesor</span><i aria-hidden="true">›</i></button><button type="button" data-pe-revisar="usuarios"><span>Programas reportados</span><i aria-hidden="true">›</i></button></aside></div>
    ${costoPanelPrivadoHTML(costos)}
    <details class="datos-definiciones"><summary>Cobros registrados</summary><div class="pe-cifras">${cifraPrivadaHTML(pesosClase(r.deuda),'Deuda registrada','Incluye publicaciones anteriores')}${cifraPrivadaHTML(pesosClase(r.cobrado),'Cobrado','Historial de pagos registrados')}</div></details>
    </div>`;
}
function enlazarAdminEditorial(raiz,historial,alcance,ahora){
  const caja=raiz.querySelector('[data-pe-admin]');
  if(!caja||typeof caja.querySelectorAll!=='function')return;
  const filas=datosAdminEditorial(historial,alcance);let periodo='7',metrica='vistas';
  const pintar=()=>{
    const destino=caja.querySelector('[data-pe-admin-alcance]');if(!destino)return;
    destino.innerHTML=panelAlcancePrivadoHTML(filas,periodo,metrica,ahora);enlazarGraficosPrivados(destino);
    const rango=intervaloPrivado(filas,periodo,ahora),porAnuncio=new Map();
    if(Array.isArray(historial))rango.filas.forEach(d=>{const s=porAnuncio.get(d.anuncio_id)||{vistas:0,aperturas:0,contactos:0};['vistas','aperturas','contactos'].forEach(k=>s[k]+=Number(d[k]||0));porAnuncio.set(d.anuncio_id,s);});
    raiz.querySelectorAll('[data-pe-anuncio-metricas]').forEach(dl=>{
      const d=porAnuncio.get(dl.dataset.peAnuncioMetricas)||{vistas:0,aperturas:0,contactos:0};
      dl.querySelectorAll('[data-pe-conteo]').forEach(b=>{if(Array.isArray(historial))b.textContent=numeroPrivado(d[b.dataset.peConteo]);});
    });
    const nota=raiz.querySelector('[data-pe-periodo-filas]');if(nota)nota.textContent=Array.isArray(historial)?`Métricas del ${fechaPrivada(rango.desde)} al ${fechaPrivada(rango.hasta)} · días desde la publicación`:'Campaña actual · acumulado';
    if(!Array.isArray(historial))caja.querySelectorAll('[data-pe-periodo="inicio"]').forEach(b=>{b.disabled=true;});
  };
  caja.querySelectorAll('[data-pe-periodo]').forEach(b=>b.addEventListener('click',()=>{periodo=b.dataset.pePeriodo;caja.querySelectorAll('[data-pe-periodo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));pintar();}));
  caja.querySelectorAll('[data-pe-metrica]').forEach(b=>b.addEventListener('click',()=>{metrica=b.dataset.peMetrica;caja.querySelectorAll('[data-pe-metrica]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));pintar();}));
  caja.querySelectorAll('[data-pe-revisar]').forEach(b=>b.addEventListener('click',()=>{
    const area=b.dataset.peRevisar;raiz.querySelector(`[data-admin-area="${area}"]`)?.click();
    if(area==='anuncios')raiz.querySelector('[data-admin-seccion="revision"]')?.click();
    if(area==='profesores'){const filtro=raiz.querySelector('#admin-estado-profesor');if(filtro){filtro.value='pendiente';filtro.dispatchEvent(new Event('change',{bubbles:true}));}}
  }));
  pintar();
}
function resumenProfesorEditorialHTML(medidas,periodo,ahora){
  const completas=medidas.every(d=>Array.isArray(d.historial));
  const filas=completas?medidas.flatMap(d=>d.historial):null;
  const activas=medidas.filter(d=>vigenciaAnuncio(d.a,ahora)==='publicado');
  const costo=activas.every(d=>d.costo)?sumarCostosCampana(activas.map(d=>d.costo)):null;
  const canales=medidas.every(d=>d.porCanal)?medidas.reduce((s,d)=>({recomendacion:s.recomendacion+d.porCanal.recomendacion,busqueda:s.busqueda+d.porCanal.busqueda,lista:s.lista+d.porCanal.lista}),{recomendacion:0,busqueda:0,lista:0}):null;
  return `<div class="pe-profesor-dashboard"><div class="pe-profesor-grilla"><section><div data-pe-profesor-chart>${filas?panelAlcancePrivadoHTML(filas,periodo,'vistas',ahora,'linea'):'<p class="clase-sin-datos">Aplica paneles_historial.sql para elegir períodos y ver tu historial.</p>'}</div>${periodoPrivadoHTML(periodo,false)}</section><aside><button type="button" class="accion-principal" data-pe-crear-anuncio>Crear anuncio</button><h3>Campañas activas · acumulado</h3>${activas.length?presupuestoProfesorHTML(costo):'<p class="pe-sub">Sin campañas activas.</p>'}${medidas.filter(d=>vigenciaAnuncio(d.a,ahora)==='publicado').map(d=>anilloCampanaClase(d.a,ahora)).join('')}</aside></div><div class="pe-costos">${donaCanalesClase(canales,'personas por anuncio')}${costoApiladoClase(costo,pesosClase)}</div></div>`;
}
function enlazarResumenProfesorEditorial(caja,medidas,ahora,crear){
  let periodo='7';
  caja.innerHTML=resumenProfesorEditorialHTML(medidas,periodo,ahora);
  enlazarGraficosPrivados(caja);
  caja.querySelector('[data-pe-crear-anuncio]')?.addEventListener('click',crear);
  caja.querySelectorAll('[data-pe-periodo]').forEach(b=>b.addEventListener('click',()=>{
    periodo=b.dataset.pePeriodo;
    caja.querySelectorAll('[data-pe-periodo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    const destino=caja.querySelector('[data-pe-profesor-chart]');
    destino.innerHTML=panelAlcancePrivadoHTML(medidas.flatMap(d=>d.historial),periodo,'vistas',ahora,'linea');
    enlazarGraficosPrivados(destino);
  }));
}
