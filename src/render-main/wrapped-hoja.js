
// ─── WRAPPED 2026-2: «LA HOJA DE RESPUESTAS» ─────────────────────────────────
// Las piezas de cada historia, con las medidas que definió Figma
// (.claude/wrapped-concepto.md, sección 4b). Todo lo que reciben ya viene
// escapado o es un número que formateó la app. Los trazos son decorado
// (`aria-hidden`); lo que dicen está también en el texto de la historia.
// La dirección anterior (luces, tinta y vidrio) quedó en docs/wrapped/.

// Un color de resaltador por historia. Nunca el rojo ni el verde del semáforo.
const HOJA_ACENTOS=['#F2F23A','#FF6FB5','#5CC8FF','#B6F23A','#FF9F3A'];
// Las cifras del Wrapped se escriben con coma decimal (Lucas, 2026-11-02).
function comaWrapped(t){return String(t).replace(/(\d)\.(\d)/g,'$1,$2');}

// El trazo irregular del resaltador, detrás de la mitad inferior del texto.
const HOJA_TRAZOS=['M3 14 C 34 9, 70 17, 104 11 S 168 8, 197 13','M2 12 C 40 16, 80 8, 118 13 S 176 15, 198 10','M4 13 C 28 10, 92 15, 130 10 S 182 12, 196 14'];
function hojaMarca(html,semilla=0){
  return `<span class="hoja-marca"><svg viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true"><path d="${HOJA_TRAZOS[semilla%3]}" pathLength="100"/></svg>${html}</span>`;
}
function hojaBurbuja(letra='',llena=false){
  return `<span class="hoja-burbuja${llena?' llena':''}" aria-hidden="true">${letra}</span>`;
}
// Un círculo a lápiz alrededor de algo, como quien marca la alternativa.
function hojaLapiz(html){
  return `<span class="hoja-lapiz">${html}<svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true"><path d="M40 14 C 120 0, 262 2, 290 34 C 306 62, 236 96, 140 97 C 52 98, 4 80, 8 50 C 12 22, 70 8, 150 6 C 196 5, 238 10, 262 18" pathLength="100" vector-effect="non-scaling-stroke"/></svg></span>`;
}
function hojaFlecha(){
  return `<svg class="hoja-flecha" viewBox="0 0 100 70" aria-hidden="true"><path d="M6 8 C 2 34, 30 30, 34 18 C 38 6, 18 6, 20 24 C 22 48, 58 60, 90 56"/><path d="M76 46 L 92 56 L 76 66"/></svg>`;
}
function hojaPostit(html,giro=-3){
  return `<div class="hoja-postit" style="--giro:${giro}deg">${html}</div>`;
}
// El timbre: doble anillo, el texto alrededor y la tinta gastada con motas
// fijas (siempre las mismas, para que la imagen no cambie entre aperturas).
const HOJA_MOTAS=(()=>{let t=7;const r=()=>((t=(t*9301+49297)%233280)/233280);
  return Array.from({length:70},()=>`<circle cx="${(r()*200).toFixed(1)}" cy="${(r()*200).toFixed(1)}" r="${(0.6+r()*2.2).toFixed(2)}"/>`).join('');})();
let _hojaTimbres=0;
function hojaTimbre(centro,anillo){
  const id='hoja-t'+(++_hojaTimbres);
  return `<svg class="hoja-timbre" viewBox="0 0 200 200" aria-hidden="true">
    <defs><mask id="${id}m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="220" height="220"><rect x="-10" y="-10" width="220" height="220" fill="#fff"/><g fill="#000">${HOJA_MOTAS}</g></mask>
    <path id="${id}r" d="M100 100 m -78 0 a 78 78 0 1 1 156 0 a 78 78 0 1 1 -156 0"/></defs>
    <g mask="url(#${id}m)"><circle cx="100" cy="100" r="95" fill="none" stroke-width="5"/><circle cx="100" cy="100" r="66" fill="none" stroke-width="2"/>
    <text class="anillo"><textPath href="#${id}r">${anillo}</textPath></text>
    <text class="centro" x="100" y="100" text-anchor="middle" dominant-baseline="central">${centro}</text></g></svg>`;
}
// Las notas como burbujas rellenas de una hoja de respuestas.
function grillaWrapped(n){
  const llenas=Math.min(n,60),total=Math.ceil(llenas/10)*10||10;
  return `<div class="hoja-grilla" aria-hidden="true">${Array.from({length:total},(_,i)=>`<span class="hoja-burbuja chica${i<llenas?' llena':''}" style="--r:${(i*.03).toFixed(2)}"></span>`).join('')}</div>`;
}
// Los ramos de mejor a peor. La lista es accesible: nombre y promedio de cada uno.
function rankingWrapped(ranking){
  return `<ol class="wrapped-ranking">${ranking.slice(0,5).map((x,i)=>`
    <li class="${i===0?'top':''}"><b class="pos" aria-hidden="true">${i+1}</b><span>${i===0?hojaMarca(esc(x.nombre),2):esc(x.nombre)}</span><b class="prom">${comaWrapped(fmtPromedio(x.avg))}</b></li>`).join('')}</ol>`;
}
// La regla de cuaderno de 0 a 100, con «tú» y la flecha en el lugar.
function reglaWrapped(p){
  const v=Math.min(Math.max(Math.round(p),0),100),w=345,x=n=>12+(n/100)*(w-24);
  let marcas='';for(let n=0;n<=100;n++)marcas+=`<line x1="${x(n).toFixed(1)}" x2="${x(n).toFixed(1)}" y1="1.5" y2="${n%10===0?24:n%5===0?16:9}"${n%10===0?' class="larga"':''}/>`;
  return `<svg class="wrapped-regla" viewBox="0 0 ${w} 110" aria-hidden="true">
    <g transform="translate(0 46)"><rect class="cuerpo" x=".75" y=".75" width="${w-1.5}" height="62.5" rx="6"/>
    <rect class="relleno" x="${x(0)}" y="4" width="${(x(v)-x(0)).toFixed(1)}" height="24" rx="3"/>${marcas}
    ${[0,20,40,60,80,100].map(n=>`<text x="${x(n).toFixed(1)}" y="48" text-anchor="middle">${n}</text>`).join('')}</g>
    <text class="tu" x="${(x(v)-40).toFixed(1)}" y="20" text-anchor="end">tú</text>
    <path class="trazo" d="M ${(x(v)-34).toFixed(1)} 16 C ${(x(v)-16).toFixed(1)} 6, ${(x(v)-4).toFixed(1)} 18, ${x(v).toFixed(1)} 42 M ${(x(v)-7).toFixed(1)} 34 L ${x(v).toFixed(1)} 44 L ${(x(v)+6).toFixed(1)} 33"/></svg>`;
}
// El promedio sobre la escala de 1,0 a 7,0, con el 4,0 marcado. En grafito:
// el semáforo no es decorado.
function arcoWrapped(g){
  const t=Math.min(Math.max((g-1)/6,0),1),x=100-80*Math.cos(Math.PI*t),y=100-80*Math.sin(Math.PI*t);
  return `<svg class="wrapped-arco" viewBox="0 0 200 118" aria-hidden="true">
    <path class="pista" d="M20 100A80 80 0 0 1 180 100" pathLength="100"/>
    <path class="valor" d="M20 100A80 80 0 0 1 180 100" pathLength="100" style="--v:${(t*100).toFixed(1)}"/>
    <line x1="100" y1="12" x2="100" y2="28"/><text x="100" y="9" text-anchor="middle">4,0</text>
    <text x="20" y="116" text-anchor="middle">1,0</text><text x="180" y="116" text-anchor="middle">7,0</text>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6"/></svg>`;
}
// La pregunta de alternativas de la personalidad, con la elegida a lápiz.
function opcionesWrapped(p){
  return `<ol class="hoja-opciones">${p.opciones.map((o,i)=>{
    const elegida=o.id===p.id,fila=`${hojaBurbuja('ABCDE'[i],elegida)}<span>${elegida?hojaMarca(esc(o.nombre),1):esc(o.nombre)}</span>`;
    return `<li class="${elegida?'elegida':''}">${elegida?hojaLapiz(fila):fila}</li>`;}).join('')}</ol>`;
}
// Cinco filas de alternativas que se rellenan solas: la portada del umbral.
function filasUmbralWrapped(){
  return `<div class="hoja-filas" aria-hidden="true">${[1,3,0,2,4].map((elegida,f)=>`<div><span class="num">${f+1}.</span>${'ABCDE'.split('').map((l,i)=>
    `<span class="hoja-burbuja${i===elegida?' llena':''}${f===4&&i===elegida?' acento':''}" style="--r:${(f*.35).toFixed(2)}">${l}</span>`).join('')}</div>`).join('')}</div>`;
}
