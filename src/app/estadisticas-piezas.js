
// ─── PIEZAS VISUALES DE ESTADÍSTICAS ─────────────────────────────────────────
// Cada número va dentro de su escala, con una palabra y una comparación (Lucas,
// 2026-10-26, a partir de cómo lo hace Whoop). Las usan Estadísticas del
// estudiante, del profesor y de administración. El color solo dice algo: el
// semáforo es para notas, y el avance o las cifras de gestión van neutros o en
// el acento. El brillo es suave y no existe con movimiento reducido.
//
// Anillo: el arco ocupa `fraccion` (0–1). `marca` (0–1) pone una raya blanca,
// por ejemplo el 4,0 en una escala de 1 a 7. `etiqueta` es lo que lee
// VoiceOver; el centro es decorativo para él.
function htmlAnillo({fraccion,color='var(--primary)',centro='',marca=null,neutro=false,chico=false,etiqueta=''}){
  const f=Math.max(0,Math.min(1,Number(fraccion)||0));
  let raya='';
  if(marca!==null&&Number.isFinite(marca)){
    const a=Math.max(0,Math.min(1,marca))*2*Math.PI,c=Math.cos(a),s=Math.sin(a);
    raya=`<line class="anillo-marca" x1="${(100+74*c).toFixed(1)}" y1="${(100+74*s).toFixed(1)}" x2="${(100+98*c).toFixed(1)}" y2="${(100+98*s).toFixed(1)}"/>`;
  }
  return `<div class="anillo${chico?' anillo-chico':''}${neutro?' anillo-neutro':''}" style="--anillo-color:${color};--anillo-fin:${(100-f*100).toFixed(2)}"${etiqueta?` role="img" aria-label="${esc(etiqueta)}"`:''}>
    <svg viewBox="0 0 200 200" aria-hidden="true"><circle class="anillo-pista" cx="100" cy="100" r="86"/><circle class="anillo-arco" cx="100" cy="100" r="86" pathLength="100"/>${raya}</svg>
    <div class="anillo-centro"${etiqueta?' aria-hidden="true"':''}>${centro}</div></div>`;
}
// Cuánto exige la nota necesaria, en palabras. Es riesgo de reprobar, por eso
// usa el semáforo: lo que pide poco va en verde y lo imposible en rojo.
function exigenciaNotaNecesaria(n){
  if(!Number.isFinite(n))return null;
  if(n>7.05)return {palabra:'Sin salida',color:'var(--red)'};
  if(n<=4)return {palabra:'Al alcance',color:'var(--green)'};
  if(n<=5.5)return {palabra:'Exigente',color:'var(--yellow)'};
  return {palabra:'Muy exigente',color:'var(--red)'};
}
// Medidor chico de 1 a 7 con una raya en la nota necesaria.
function htmlMedidorNota(n){
  const v=Math.max(1,Math.min(7,Number(n)||1)),ang=Math.PI*(1-(v-1)/6),c=Math.cos(ang),s=Math.sin(ang);
  return `<svg class="medidor-nota" viewBox="0 0 92 52" aria-hidden="true">
    <defs><linearGradient id="medidor-degradado" x1="0" x2="1"><stop offset="0" style="stop-color:var(--green)"/><stop offset=".55" style="stop-color:var(--yellow)"/><stop offset="1" style="stop-color:var(--red)"/></linearGradient></defs>
    <path class="medidor-pista" d="M8 48 A38 38 0 0 1 84 48"/><path class="medidor-arco" d="M8 48 A38 38 0 0 1 84 48"/>
    <line class="medidor-raya" x1="${(46+29*c).toFixed(1)}" y1="${(48-29*s).toFixed(1)}" x2="${(46+45*c).toFixed(1)}" y2="${(48-45*s).toFixed(1)}"/></svg>`;
}
// Escala de 1 a 7 con una banda (piso–techo), el 4,0 marcado y dónde vas hoy.
function htmlEscalaNotas({piso,techo,actual=null,color='var(--primary)'}){
  const x=v=>((Math.max(1,Math.min(7,v))-1)/6*100).toFixed(1)+'%';
  return `<div class="escala-notas" aria-hidden="true"><span class="escala-pista"></span>
    <span class="escala-banda" style="left:${x(piso)};width:calc(${x(techo)} - ${x(piso)});--escala-color:${color}"></span>
    ${actual===null?'':`<span class="escala-hoy" style="left:${x(actual)}"></span><span class="escala-hoy-txt" style="left:${x(actual)}">hoy ${fmtPromedio(actual)}</span>`}
    <span class="escala-cuatro" style="left:${x(4)}">4.0</span><span class="escala-ext">1.0</span><span class="escala-ext escala-ext-fin">7.0</span></div>`;
}
// Barra que sale del centro: hacia la derecha suma, hacia la izquierda resta.
function htmlBarraCentrada(valor,max,color){
  const w=max>0?Math.min(1,Math.abs(valor)/max)*50:0,l=valor>=0?50:50-w;
  return `<span class="barra-centrada" aria-hidden="true"><i style="left:${l.toFixed(1)}%;width:${w.toFixed(1)}%;--barra-color:${color}"></i><b></b></span>`;
}

function toggleHist(id){openHist[id]=!openHist[id];renderStats();}
