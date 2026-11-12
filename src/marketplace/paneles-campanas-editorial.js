// Los rangos solo suman conteos recibidos. Nunca se estima un dato ausente.
function datosAdminEditorial(historial,alcance){
  return Array.isArray(historial)?historial.map(d=>Object.hasOwn(d,'vistas_total')?{...d,vistas:d.vistas_total,aperturas:d.aperturas_total,contactos:d.contactos_total}:d):Array.isArray(alcance)?alcance.map(d=>({dia:d.dia,vistas:Number(d.vieron)||0,aperturas:Number(d.abrieron)||0,contactos:Number(d.contactaron)||0})):null;
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
function alcanceAdminHTML(filas,periodo,metrica,ahora,{comparar=true,enCurso=false}={}){
  if(!Array.isArray(filas))return '<p class="clase-sin-datos" role="status">Aplica paneles_historial.sql para ver el historial de anuncios.</p>';
  const rango=intervaloPrivado(filas,periodo,ahora),total=sumarHistorialPrivado(rango.filas),antes=comparar?comparacionAlcanceAdmin(filas,periodo,ahora):null;
  const nombres={vistas:'Vistas',aperturas:'Aperturas',contactos:'Contactos'},unidad=nombres[metrica].toLowerCase();
  const cifra=k=>metricaAdminHTML({id:k,titulo:nombres[k],valor:numeroPrivado(total[k]),elegida:k===metrica,
    variacion:antes&&variacionAdmin(total[k],antes[k]),pie:antes?'vs. período anterior':filas.some(d=>Object.hasOwn(d,'vistas_total'))?'en total':k==='vistas'?'personas por campaña':`${pctViz(total[k],total.vistas)} de las vistas`});
  const s=serieHistorialPrivado(filas,periodo,metrica,ahora),nombrePaso=s.semanal?'semana':'día';
  const puntos=s.puntos.map((p,i)=>({eje:p.etiqueta,valor:p.valor,tenue:enCurso&&i===s.puntos.length-1,lectura:`${p.etiqueta} · ${numeroPrivado(p.valor)} ${unidad}`}));
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
        <div class="adm-tarjeta-cabeza">${periodoPrivadoHTML('7')}<span class="pe-sub">${filas?.some(d=>Object.hasOwn(d,'vistas_total'))?'En total · día de Chile · histórico mínimo':'Personas por campaña · historial disponible'}</span></div>
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
function resumenProfesorEditorialHTML(medidas,periodo,ahora,{anuncios=medidas.map(d=>d.a),metrica='vistas'}={}){
  const completas=medidas.length>0&&medidas.every(d=>Array.isArray(d.historial));
  const filas=completas?medidas.flatMap(d=>d.historial):null;
  const comparar=completas&&medidas.every(d=>comparacionAlcanceAdmin(d.historial,periodo,ahora)!==null);
  const activas=medidas.filter(d=>vigenciaAnuncio(d.a,ahora)==='publicado');
  const costos=activas.map(d=>d.costo);
  const pagadas=costos.filter(c=>c&&!c.sinCosto);
  const costo=costos.every(Boolean)?sumarCostosCampana(pagadas.length?pagadas:costos):null;
  const clp=n=>Number.isFinite(n)?pesosClase(n):'—';
  const porId=new Map(medidas.map(d=>[d.a.id,d]));
  const fila=a=>{
    const d=porId.get(a.id),vig=vigenciaAnuncio(a,ahora);
    const alcance=Array.isArray(d?.historial)?sumarHistorialPrivado(intervaloPrivado(d.historial,periodo,ahora).filas):null;
    const cifra=(titulo,valor)=>`<span class="cr-cifra"><small>${titulo}</small><b>${esc(valor)}</b></span>`;
    return `<li class="cr-fila">
      <div class="cr-identidad"><b>${esc(a.titulo||'Sin título')}</b><small>${esc((ESTADOS_ANUNCIO[vig]||[vig])[0])}</small></div>
      <div class="cr-numeros">${cifra('Vistas',numeroPrivado(alcance?.vistas))}${cifra('Aperturas',numeroPrivado(alcance?.aperturas))}${cifra('Contactos',numeroPrivado(alcance?.contactos))}
        ${cifra('Costo de campaña',d?.costo?.sinCosto?'Sin costo':clp(d?.costo?.total))}${cifra('Tope',clp(d?.costo?.tope))}</div>
      <button type="button" class="agent-refresh cr-ver" data-cr-ver="${esc(a.id)}" aria-label="Ver anuncio ${esc(a.titulo||'Sin título')}">Ver anuncio</button></li>`;
  };
  const alcance=filas?alcanceAdminHTML(filas,periodo,metrica,ahora,{comparar,enCurso:true}):
    `<div class="adm-metricas adm-metricas-tres">${['Vistas','Aperturas','Contactos'].map(titulo=>metricaAdminHTML({titulo,valor:'—'})).join('')}</div>
    <p class="clase-sin-datos" role="status">${medidas.length?'Historial no disponible.':'El alcance aparece cuando un anuncio empieza a mostrarse.'}</p>`;
  return `<div class="cr-resumen">
    <div class="cr-grilla">
      <section class="adm-tarjeta cr-costo" aria-label="Costo y tope de campañas activas">
        <h2>Campañas activas</h2>
        ${metricaAdminHTML({titulo:'Costo acumulado',valor:costo?.sinCosto?'Sin costo':clp(costo?.total)})}
        ${metricaAdminHTML({titulo:'Tope',valor:clp(costo?.tope)})}
        ${costo?.tope>0?`<div class="adm-riel" aria-hidden="true"><i style="transform:scaleX(${Math.min(1,costo.total/costo.tope).toFixed(3)})"></i></div>`:''}
      </section>
      <section class="est adm adm-tarjeta cr-alcance" aria-label="Alcance de tus anuncios">
        <div class="adm-tarjeta-cabeza"><h2>Alcance</h2>${filas?periodoPrivadoHTML(periodo):''}</div>
        ${alcance}
        <details class="cr-metodo"><summary>Cómo se cuentan</summary><p>Vistas, aperturas y contactos cuentan personas por publicación de cada anuncio. El historial agrupa por día. Una misma cuenta puede aparecer en más de un anuncio o publicación. Un contacto indica que alguien abrió la opción de contactar. El costo es acumulado y cada campaña nunca pasa de su tope.</p></details>
      </section>
    </div>
    ${anuncios.length?`<section class="cr-anuncios" aria-label="Cifras por anuncio"><h2>Por anuncio</h2><ul>${anuncios.map(fila).join('')}</ul></section>`:''}
  </div>`;
}
function enlazarResumenProfesorEditorial(caja,medidas,ahora,{anuncios,ver}){
  let periodo='7',metrica='vistas';
  const pintar=(foco='')=>{
    caja.innerHTML=resumenProfesorEditorialHTML(medidas,periodo,ahora,{anuncios,metrica});
    enlazarGraficosAdmin(caja);
    caja.querySelectorAll('[data-pe-periodo]').forEach(b=>b.addEventListener('click',()=>{
      periodo=b.dataset.pePeriodo;pintar(`[data-pe-periodo="${periodo}"]`);
    }));
    caja.querySelectorAll('[data-adm-metrica]').forEach(b=>b.addEventListener('click',()=>{
      metrica=b.dataset.admMetrica;pintar(`[data-adm-metrica="${metrica}"]`);
    }));
    caja.querySelectorAll('[data-cr-ver]').forEach(b=>b.addEventListener('click',()=>ver(b.dataset.crVer)));
    if(foco)caja.querySelector(foco)?.focus({preventScroll:true});
  };
  pintar();
}
