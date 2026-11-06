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
  const pagadas=costos.filter(c=>!c?.sinCosto);
  const costo=pagadas.every(Boolean)?sumarCostosCampana(pagadas):null;
  if(costos.length&&!pagadas.length)return '<section class="pe-costos"><p class="pe-sub">Campañas activas sin costo.</p></section>';
  if(!costos.length)return '<section class="pe-costos"><p class="pe-sub">Sin campañas activas.</p></section>';
  return `<section class="pe-costos"><div><h3>Campañas activas</h3>${presupuestoProfesorHTML(costo)}${costo&&costo.tope!==null?`<p class="pe-sub">${pesosClase(Math.max(0,costo.tope-costo.total))} disponibles del tope</p>`:''}</div><div>${costoApiladoClase(costo,pesosClase)}</div></section>`;
}
// Las mismas sumas del período anterior, de igual largo. Solo se compara si el
// historial alcanza a cubrirlo y el período ya terminó: «Hoy» sigue en curso.
function comparacionAlcanceAdmin(filas,periodo,ahora){
  if(!['7','30'].includes(periodo))return null;
  const n=Number(periodo),{desde}=intervaloPrivado(filas,periodo,ahora),dia=k=>new Date(Date.parse(desde+'T12:00:00Z')-k*864e5).toISOString().slice(0,10);
  const inicio=dia(n),fin=dia(1),dias=(filas||[]).map(f=>String(f.dia).slice(0,10));
  if(!dias.some(d=>d<=inicio))return null;
  return sumarHistorialPrivado((filas||[]).filter(f=>{const d=String(f.dia).slice(0,10);return d>=inicio&&d<=fin;}));
}
function alcanceAdminHTML(filas,periodo,metrica,ahora){
  if(!Array.isArray(filas))return '<p class="clase-sin-datos" role="status">Aplica paneles_historial.sql para ver el historial de anuncios.</p>';
  const rango=intervaloPrivado(filas,periodo,ahora),total=sumarHistorialPrivado(rango.filas),antes=comparacionAlcanceAdmin(filas,periodo,ahora);
  const nombres={vistas:'Vistas',aperturas:'Aperturas',contactos:'Contactos'},unidad=nombres[metrica].toLowerCase();
  const cifra=k=>metricaAdminHTML({id:k,titulo:nombres[k],valor:numeroPrivado(total[k]),elegida:k===metrica,
    variacion:antes&&variacionAdmin(total[k],antes[k]),pie:antes?'vs. período anterior':k==='vistas'?'personas por campaña':`${pctViz(total[k],total.vistas)} de las vistas`});
  const s=serieHistorialPrivado(filas,periodo,metrica,ahora),nombrePaso=s.semanal?'semana':'día';
  const puntos=s.puntos.map(p=>({eje:p.etiqueta,valor:p.valor,lectura:`${p.etiqueta} · ${numeroPrivado(p.valor)} ${unidad}`}));
  return `<div class="adm-metricas adm-metricas-tres" role="group" aria-label="Elegir qué muestra el gráfico">${['vistas','aperturas','contactos'].map(cifra).join('')}</div>
    ${puntos.length?columnasAdminHTML({titulo:`${nombres[metrica]} por ${nombrePaso}`,sinCabeza:true,vacio:'Aún no hay datos para este período.',puntos,
      tabla:{columnas:[nombrePaso==='día'?'Día':'Semana',nombres[metrica]],filas:s.puntos.slice().reverse().map(p=>[p.etiqueta,numeroPrivado(p.valor)])}}):'<p class="clase-sin-datos">Aún no hay datos para este período.</p>'}`;
}
// Lo que están gastando las campañas activas y lo ya registrado, sin desplegar.
const CONCEPTOS_COSTO_ADMIN={vista:'Por vistas',apertura:'Por aperturas',contacto:'Por contactos',dia:'Por días'};
function dineroAdminHTML(costos,r){
  const pagadas=costos.filter(c=>!c?.sinCosto),costo=pagadas.length&&pagadas.every(Boolean)?sumarCostosCampana(pagadas):null;
  const n=costos.length,titulo=n?`${n} ${n===1?'campaña activa':'campañas activas'}`:'Sin campañas activas';
  const valor=costo?pesosClase(costo.total):n&&!pagadas.length?'Sin costo':'—';
  const tope=costo&&costo.tope>0?costo.tope:null;
  const fila=(nombre,monto,clase='')=>`<div class="adm-fila-dato"><span>${nombre}</span><b class="${clase}">${esc(monto)}</b></div>`;
  return `<section class="adm-tarjeta adm-dinero" aria-label="Costo de las campañas">
    <div class="adm-metrica adm-metrica-plana"><span>${esc(titulo)}</span><strong>${esc(valor)}</strong>${tope?`<small>de ${esc(pesosClase(tope))} de tope</small>`:''}</div>
    ${tope?`<div class="adm-riel" aria-hidden="true"><i style="transform:scaleX(${Math.min(1,costo.total/tope).toFixed(3)})"></i></div>`:''}
    ${costo?`<div class="adm-partes">${costo.partes.filter(p=>p.subtotal>0).map(p=>`<div class="adm-parte"><span>${esc(CONCEPTOS_COSTO_ADMIN[p.clave]||p.clave)}</span><b>${esc(pesosClase(p.subtotal))}</b></div>`).join('')}</div>`:''}
    <div class="adm-filas-dato" title="Incluye publicaciones anteriores">${fila('Cobrado',pesosClase(r.cobrado))}${fila('En deuda',pesosClase(r.deuda),r.deuda>0?'est-baja':'')}</div>
  </section>`;
}
function anunciosAdminEditorialHTML(profesores,ahora,historial=null,alcance=null){
  const filas=datosAdminEditorial(historial,alcance),r=resumenAdminClases(profesores,ahora);
  const costos=filasAdminHig(profesores,ahora).filter(f=>f.estado[1]==='publicado').map(f=>f.costo);
  return `<div class="est adm" data-pe-admin>
    ${atencionAdminHTML(profesores,ahora,true)}
    ${historial===null?'<p class="est-aviso" role="status">Historial completo y métricas por anuncio: aplica paneles_historial.sql. El rango usa los días disponibles.</p>':''}
    <div class="adm-dos">
      <section class="adm-tarjeta" aria-label="Alcance de los anuncios">
        <div class="adm-tarjeta-cabeza">${periodoPrivadoHTML('7')}<span class="pe-sub">Personas por campaña · fechas en UTC</span></div>
        <div data-pe-admin-alcance>${alcanceAdminHTML(filas,'7','vistas',ahora)}</div>
      </section>
      ${dineroAdminHTML(costos,r)}
    </div></div>`;
}
function enlazarAdminEditorial(raiz,historial,alcance,ahora){
  const caja=raiz.querySelector('[data-pe-admin]');
  if(!caja||typeof caja.querySelectorAll!=='function')return;
  const filas=datosAdminEditorial(historial,alcance);let periodo='7',metrica='vistas';
  const pintar=()=>{
    const destino=caja.querySelector('[data-pe-admin-alcance]');if(!destino)return;
    destino.innerHTML=alcanceAdminHTML(filas,periodo,metrica,ahora);enlazarGraficosAdmin(destino);
    destino.querySelectorAll('[data-adm-metrica]').forEach(b=>b.addEventListener('click',()=>{metrica=b.dataset.admMetrica;pintar();}));
    // El rango pertenece al gráfico. Cada fila conserva la misma instantánea
    // de la campaña actual que su detalle y cobro, incluso al republicar.
    if(!Array.isArray(historial))caja.querySelectorAll('[data-pe-periodo="inicio"]').forEach(b=>{b.disabled=true;});
  };
  caja.querySelectorAll('[data-pe-periodo]').forEach(b=>b.addEventListener('click',()=>{periodo=b.dataset.pePeriodo;caja.querySelectorAll('[data-pe-periodo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));pintar();}));
  pintar();
}
function resumenProfesorEditorialHTML(medidas,periodo,ahora){
  const completas=medidas.every(d=>Array.isArray(d.historial));
  const filas=completas?medidas.flatMap(d=>d.historial):null;
  const activas=medidas.filter(d=>vigenciaAnuncio(d.a,ahora)==='publicado');
  const costo=activas.every(d=>d.costo)?sumarCostosCampana(activas.map(d=>d.costo)):null;
  const canales=medidas.every(d=>d.porCanal)?medidas.reduce((s,d)=>({recomendacion:s.recomendacion+d.porCanal.recomendacion,busqueda:s.busqueda+d.porCanal.busqueda,lista:s.lista+d.porCanal.lista}),{recomendacion:0,busqueda:0,lista:0}):null;
  return `<div class="pe-profesor-dashboard"><div class="pe-profesor-grilla"><section><div data-pe-profesor-chart>${filas?panelAlcancePrivadoHTML(filas,periodo,'vistas',ahora,'linea'):'<p class="clase-sin-datos">Aplica paneles_historial.sql para elegir períodos y ver tu historial.</p>'}</div>${periodoPrivadoHTML(periodo,false)}<p class="pe-sub">Fechas del registro en UTC.</p></section><aside><button type="button" class="accion-principal" data-pe-crear-anuncio>Crear anuncio</button><h3>Campañas activas · acumulado</h3>${activas.length?presupuestoProfesorHTML(costo):'<p class="pe-sub">Sin campañas activas.</p>'}${medidas.filter(d=>vigenciaAnuncio(d.a,ahora)==='publicado').map(d=>anilloCampanaClase(d.a,ahora)).join('')}</aside></div><div class="pe-costos">${donaCanalesClase(canales,'personas por anuncio')}${costoApiladoClase(costo,pesosClase)}</div></div>`;
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
