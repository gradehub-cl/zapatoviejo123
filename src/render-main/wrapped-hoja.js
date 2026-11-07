
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

// ─── Piezas que se tocan (Lucas, 2026-11-07: «más cosas interactivas») ───
// Una pregunta de alternativas. Antes de responder, cada fila es un botón; al
// responder, la correcta queda encerrada a lápiz y la elegida, rellena. La
// respuesta vive en la historia: al volver atrás se ve igual.
function preguntaWrapped(q,respuesta){
  const ya=respuesta!==undefined&&respuesta!==null;
  // Respondida, quedan solo la correcta y la elegida: el dato que viene necesita el espacio.
  return `<ol class="hoja-opciones hoja-pregunta${ya?' ya':''}">${q.opciones.map((o,i)=>{
    if(ya&&!o.correcta&&i!==respuesta)return '';
    // La correcta, en el color de la historia; la elegida por error, a grafito y tachada.
    const burbuja=ya&&o.correcta?`<span class="hoja-burbuja llena acento" aria-hidden="true">${'ABCDE'[i]}</span>`:hojaBurbuja('ABCDE'[i],ya&&i===respuesta);
    const fila=`${burbuja}<span>${o.texto}</span>`;
    const clase=[ya&&o.correcta?'correcta':'',ya&&i===respuesta&&!o.correcta?'errada':''].filter(Boolean).join(' ');
    return `<li class="${clase}">${ya?(o.correcta?hojaLapiz(fila):fila):`<button type="button" class="hoja-opcion" data-op="${i}">${fila}</button>`}</li>`;}).join('')}</ol>`;
}
// Alternativas numéricas alrededor del valor real, siempre distintas y en un
// orden que depende del valor: nunca la correcta en el mismo lugar.
function alternativasWrapped(n){
  const set=new Set([n]);
  [0.5,1.6,2.3,0.75,1.3,3].forEach(f=>{const v=Math.max(1,Math.round(n*f));if(set.size<4&&!set.has(v))set.add(v);});
  for(let k=1;set.size<4;k++)set.add(n+k*2);
  const orden=[...set].sort((a,b)=>a-b),giro=n%4;
  return orden.map((v,i)=>orden[(i+giro)%orden.length]).map(v=>({texto:String(v),correcta:v===n}));
}
// La goma: la cifra queda bajo un borrón de grafito que se borra con el dedo.
// «Borrar de una» hace lo mismo con un toque, para VoiceOver y el teclado
// (HIG, Accessibility: una alternativa a cada gesto).
function gomaWrapped(cifra,borrada){
  return `<div class="hoja-goma${borrada?' borrada':''}"><p class="wrapped-big"${borrada?'':' aria-hidden="true"'}>${cifra}</p>${borrada?'':'<canvas aria-hidden="true"></canvas>'}</div>
    ${borrada?'':'<button type="button" class="hoja-goma-btn">Borrar de una</button>'}`;
}
// El borrón son rayas de lápiz cruzadas, con trazos fijos: el mismo en cada
// apertura. Tapa la cifra sin ser un rectángulo negro.
function rayarGomaWrapped(canvas){
  const caja=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=caja.width,h=caja.height;
  canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
  const c=canvas.getContext('2d');if(!c)return null;
  c.scale(dpr,dpr);c.lineCap='round';c.lineJoin='round';c.strokeStyle=getComputedStyle(canvas).color||'#1D1D1F';
  let t=11;const r=()=>((t=(t*9301+49297)%233280)/233280);
  // Debajo, papel: la cifra no se trasluce entre las rayas.
  const fondo=canvas.closest('.wrapped');c.fillStyle=fondo?getComputedStyle(fondo).backgroundColor:'#F3EFE4';
  c.beginPath();for(let a=0;a<=24;a++){const ang=a/24*Math.PI*2,k=.9+r()*.12;c.lineTo(w/2+Math.cos(ang)*w*.56*k,h/2+Math.sin(ang)*h*.6*k);}c.fill();c.clip();
  // Tres pasadas: horizontal y las dos diagonales, cada vez más fina. Cada
  // raya cruza toda la caja con un pulso irregular, como a mano.
  [[0,5,11,.9],[.8,4,12,.85],[-.8,3.5,13,.8]].forEach(([pend,ancho,sep,alfa])=>{
    c.lineWidth=ancho;c.globalAlpha=alfa;c.beginPath();
    const largo=w+h,ux=1/Math.hypot(1,pend),uy=pend*ux,nx=-uy,ny=ux;
    for(let k=-largo/2;k<largo/2;k+=sep*(.7+r()*.6)){
      const cx=w/2+nx*k,cy=h/2+ny*k;
      for(let paso=0;paso<=16;paso++){
        const d=-largo/2+paso*largo/16,x=cx+ux*d+(r()-.5)*5,y=cy+uy*d+(r()-.5)*5;
        paso?c.lineTo(x,y):c.moveTo(x,y);
      }
    }
    c.stroke();
  });
  c.globalAlpha=1;c.globalCompositeOperation='destination-out';c.lineWidth=44;
  return {c,ancho:canvas.width,alto:canvas.height};
}
function borradoGomaWrapped(g){
  const datos=g.c.getImageData(0,0,g.ancho,g.alto).data;let vacios=0,total=0;
  for(let i=3;i<datos.length;i+=4*97){total++;if(datos[i]<40)vacios++;}
  return total?vacios/total:1;
}
// Un recado en video de un profe (Lucas, 2026-11-02: «va sí o sí»). Con
// subtítulos y controles del sistema; no arranca solo ni con sonido.
function videoWrapped(v){
  if(!v)return `<figure class="hoja-video vacio"><div><p>Aquí va el video del profe.</p><small>Falta cargarlo en <code>WRAPPED_VIDEO</code>.</small></div></figure>`;
  return `<figure class="hoja-video"><video src="${esc(v.src)}"${v.poster?` poster="${esc(v.poster)}"`:''} controls playsinline preload="metadata">${v.subtitulos?`<track kind="captions" src="${esc(v.subtitulos)}" srclang="es" label="Español" default>`:''}</video>
    <figcaption>${esc(v.quien)}${v.ramo?`<small>${esc(v.ramo)}</small>`:''}</figcaption></figure>`;
}
// Un tablero de post-its: lo bueno del semestre, de a uno.
function corchoWrapped(notas){
  return `<div class="hoja-corcho">${notas.map((n,i)=>`<div style="--d:${i+2};--acento:${HOJA_ACENTOS[(i*2)%HOJA_ACENTOS.length]}">${hojaPostit(n,[-4,3,-2][i%3])}</div>`).join('')}</div>`;
}
