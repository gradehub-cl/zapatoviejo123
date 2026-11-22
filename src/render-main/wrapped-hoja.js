
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
// Una frase larga se parte en varias líneas y el trazo quedaría solo bajo la
// última: esas se resaltan línea por línea con CSS (`.hoja-marca.larga`).
function hojaMarca(html,semilla=0){
  if(String(html).replace(/<[^>]*>/g,'').replace(/&[a-z#0-9]+;/gi,'x').length>16)return `<span class="hoja-marca larga">${html}</span>`;
  return `<span class="hoja-marca"><svg viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true"><path d="${HOJA_TRAZOS[semilla%3]}" pathLength="100"/></svg>${html}</span>`;
}
function hojaBurbuja(letra='',llena=false){
  return `<span class="hoja-burbuja${llena?' llena':''}" aria-hidden="true">${letra}</span>`;
}
// Un círculo a lápiz alrededor de algo, como quien marca la alternativa.
function hojaLapiz(html){
  return `<span class="hoja-lapiz">${html}<svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true"><path d="M40 14 C 120 0, 262 2, 290 34 C 306 62, 236 96, 140 97 C 52 98, 4 80, 8 50 C 12 22, 70 8, 150 6 C 196 5, 238 10, 262 18" pathLength="100" vector-effect="non-scaling-stroke"/></svg></span>`;
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
// Si dos ramos se ven iguales con un decimal, esos dos llevan el segundo
// decimal: así se entiende cuál quedó arriba (Lucas, 2026-11-17).
function rankingWrapped(ranking){
  const lista=ranking.slice(0,5),uno=lista.map(x=>fmtPromedio(x.avg));
  const prom=(x,i)=>uno.filter(u=>u===uno[i]).length>1?comaWrapped((Math.round(x.avg*100)/100).toFixed(2)):uno[i];
  return `<ol class="wrapped-ranking">${lista.map((x,i)=>`
    <li class="${i===0?'top':''}"><b class="pos" aria-hidden="true">${i+1}</b><span>${i===0?hojaMarca(esc(x.nombre),2):esc(x.nombre)}</span><b class="prom">${prom(x,i)}</b></li>`).join('')}</ol>`;
}
// La regla de cuaderno de 0 a 100, con «tú» y la flecha en el lugar.
function reglaWrapped(p){
  const v=Math.min(Math.max(Math.round(p),0),100),w=345,x=n=>12+(n/100)*(w-24);
  let marcas='';for(let n=0;n<=100;n++)marcas+=`<line x1="${x(n).toFixed(1)}" x2="${x(n).toFixed(1)}" y1="1.5" y2="${n%10===0?24:n%5===0?16:9}"${n%10===0?' class="larga"':''}/>`;
  return `<svg class="wrapped-regla" viewBox="0 0 ${w} 110" aria-hidden="true">
    <g transform="translate(0 46)"><rect class="cuerpo" x=".75" y=".75" width="${w-1.5}" height="62.5" rx="6"/>
    <rect class="relleno" x="${x(0)}" y="4" width="${(x(v)-x(0)).toFixed(1)}" height="24" rx="3"/>${marcas}
    ${[0,20,40,60,80,100].map(n=>`<text x="${x(n).toFixed(1)}" y="48" text-anchor="middle">${n||'·'}</text>`).join('')}</g>
    <text class="tu" x="${(x(v)-40).toFixed(1)}" y="20" text-anchor="end">tú</text>
    <path class="trazo" d="M ${(x(v)-34).toFixed(1)} 16 C ${(x(v)-16).toFixed(1)} 6, ${(x(v)-4).toFixed(1)} 18, ${x(v).toFixed(1)} 42 M ${(x(v)-7).toFixed(1)} 34 L ${x(v).toFixed(1)} 44 L ${(x(v)+6).toFixed(1)} 33"/></svg>`;
}
// El promedio escrito a mano en la casilla «Nota» de la prueba, en grande.
// Si el semestre salió bien cae el timbre; si no, solo la casilla: no se
// celebra lo que el semáforo pinta rojo (Lucas, 2026-11-17: sin arco).
function casillaWrapped(cifra,periodo,timbre){
  return `<div class="hoja-casilla${timbre?' con-sello':''}"><span class="etq" aria-hidden="true">Nota</span><p class="wrapped-big">${cifra}</p>${timbre?hojaTimbre('★','★ PROMEDIO ★ '+periodo+' ★ '):''}</div>`;
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
  if(borrada)return `<div class="hoja-goma borrada"><p class="wrapped-big">${cifra}</p></div>`;
  // Escondida en toda la hoja (Lucas, 2026-11-17: «que haya que encontrarla»).
  // El lugar sale de la cifra: siempre el mismo para la misma nota.
  const lugares=[[30,32],[68,60],[34,68],[66,30]],[x,y]=lugares[[...String(cifra)].reduce((s,ch)=>s+ch.charCodeAt(0),0)%lugares.length];
  return `<div class="hoja-goma pantalla" style="--x:${x}%;--y:${y}%"><p class="wrapped-big" aria-hidden="true">${cifra}</p><canvas aria-hidden="true"></canvas>
    <div class="hoja-goma-pie"><p>Frota la hoja hasta encontrarla.</p><button type="button" class="hoja-goma-btn">Borrar de una</button></div></div>`;
}
// El borrón son rayas de lápiz cruzadas, con trazos fijos: el mismo en cada
// apertura. Tapa la cifra sin ser un rectángulo negro.
function rayarGomaWrapped(canvas,completa){
  const caja=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=caja.width,h=caja.height;
  canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
  const c=canvas.getContext('2d');if(!c)return null;
  c.scale(dpr,dpr);c.lineCap='round';c.lineJoin='round';c.strokeStyle=getComputedStyle(canvas).color||'#1D1D1F';
  let t=11;const r=()=>((t=(t*9301+49297)%233280)/233280);
  // Debajo, papel: la cifra no se trasluce entre las rayas.
  const fondo=canvas.closest('.wrapped');c.fillStyle=fondo?getComputedStyle(fondo).backgroundColor:'#F3EFE4';
  // A pantalla completa, la hoja entera; si no, un borrón con borde a mano.
  if(completa)c.fillRect(0,0,w,h);
  else{c.beginPath();for(let a=0;a<=24;a++){const ang=a/24*Math.PI*2,k=.9+r()*.12;c.lineTo(w/2+Math.cos(ang)*w*.56*k,h/2+Math.sin(ang)*h*.6*k);}c.fill();c.clip();}
  // Tres pasadas: horizontal y las dos diagonales, cada vez más fina. Cada
  // raya cruza toda la caja con un pulso irregular, como a mano.
  [[0,5,11,.9],[.8,4,12,.85],[-.8,3.5,13,.8]].forEach(([pend,ancho,sep,alfa])=>{
    // A pantalla completa el borrón es grafito, no tinta: más claro.
    c.lineWidth=ancho;c.globalAlpha=alfa*(completa?.55:1);c.beginPath();
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
// Cuánto se destapó: de la zona donde está la cifra si se conoce, para que
// frotar lejos de la nota no la revele.
function borradoGomaWrapped(g){
  const z=g.zona||{x:0,y:0,w:g.ancho,h:g.alto};
  const datos=g.c.getImageData(z.x,z.y,Math.max(1,z.w),Math.max(1,z.h)).data;let vacios=0,total=0;
  for(let i=3;i<datos.length;i+=4*97){total++;if(datos[i]<40)vacios++;}
  return total?vacios/total:1;
}
// Un recado en video de un profe (Lucas, 2026-11-02: «va sí o sí»). Con
// subtítulos y controles del sistema; no arranca solo ni con sonido. Sin
// archivo queda el marco: vacío con un signo de pregunta si la persona no
// calificó a nadie, o el espacio reservado en la vista previa.
function videoWrapped(v){
  const pie=v&&v.quien?`<figcaption>${esc(v.quien)}${v.ramo?`<small>${esc(v.ramo)}</small>`:''}</figcaption>`:'';
  if(v&&v.fallo)return `<figure class="hoja-video vacio"><div><p>No pudimos cargar el video.</p><small>Vuelve a abrir tu hoja más tarde para verlo.</small></div>${pie}</figure>`;
  if(!v||!v.src)return `<figure class="hoja-video vacio"><div><p>Aquí va el video del profe.</p><small>Espacio reservado en la vista previa.</small></div>${pie}</figure>`;
  // Sin póster, Safari en iPhone muestra un cuadro negro hasta apretar play:
  // `#t=0.1` le pide pintar el primer cuadro.
  const src=v.poster?v.src:`${v.src}#t=0.1`;
  return `<figure class="hoja-video"><video src="${esc(src)}"${v.poster?` poster="${esc(v.poster)}"`:''} controls playsinline preload="metadata">${v.subtitulos?`<track kind="captions" src="${esc(v.subtitulos)}" srclang="es" label="Español" default>`:''}</video>
    ${pie}</figure>`;
}
// Un tablero de post-its: lo bueno del semestre, de a uno.
function corchoWrapped(notas){
  return `<div class="hoja-corcho">${notas.map((n,i)=>`<div style="--d:${i+2};--acento:${HOJA_ACENTOS[(i*2)%HOJA_ACENTOS.length]}">${hojaPostit(n,[-4,3,-2][i%3])}</div>`).join('')}</div>`;
}

// Los útiles de cada historia (Lucas, 2026-11-17, tras revisar el Wrapped de
// Spotify: cada dato con su objeto). Aparecen en la preparación, como si
// alguien los dejara sobre la mesa. Mismo trazo de grafito que el resto de la
// hoja; `.a` va en el color de la historia y `.p` tapa la cuadrícula. Las
// clases `.trazo`, `.sello`, `.huella` y `.migas` tienen su propio movimiento.
function hojaLapizObjeto(largo){
  const x=142-largo;
  return `<g transform="rotate(-18 80 60)"><rect class="p" x="${x-26}" y="50" width="14" height="20" rx="4"/><rect class="p" x="${x-12}" y="50" width="12" height="20"/><path d="M${x-8} 50v20M${x-4} 50v20"/>`
    +`<rect class="a" x="${x}" y="50" width="${largo-22}" height="20"/><path d="M${x} 60h${largo-22}"/><path class="p" d="M120 50 L142 60 L120 70 Z"/><path class="t" d="M135 56.8 L142 60 L135 63.2 Z"/></g>`;
}
const HOJA_OBJETOS={
  // El lápiz que más trabajó: corto, sin punta y con la goma pareja, al lado
  // de los palotes que fue marcando.
  gastado:()=>'<path class="trazo" pathLength="100" d="M22 44 l-4 40 M34 44 l-4 40 M46 44 l-4 40 M58 44 l-4 40 M12 72 L66 52"/>'
    +'<g transform="translate(-62 -40) scale(1.5) rotate(-24 116 76)"><rect class="p" x="88" y="66" width="10" height="18" rx="2"/><rect class="p" x="98" y="66" width="9" height="18"/><path d="M101 66v18M104 66v18"/>'
    +'<rect class="a" x="107" y="66" width="30" height="18"/><path d="M107 75h30"/><path class="p" d="M137 66 C 146 68, 150 72, 150 75 C 150 78, 146 82, 137 84 Z"/><path class="t" d="M146 72.5 C 149 73.5, 149 76.5, 146 77.5 Z"/></g>',
  // El sacapuntas metálico, de tres caras, con un lápiz entrando y la viruta.
  sacapuntas:()=>'<g><rect class="p" x="4" y="63" width="12" height="14" rx="3"/><rect class="p" x="16" y="63" width="10" height="14"/><path d="M20 63v14"/>'
    +'<rect class="a" x="26" y="63" width="44" height="14"/><path d="M26 70h44"/><path class="p" d="M70 63 L80 70 L70 77 Z"/></g>'
    +'<path class="p" d="M72 46 L84 36 L138 36 L126 46 Z"/><path class="p" d="M126 46 L138 36 L138 82 L126 92 Z"/>'
    +'<rect class="a" x="72" y="46" width="54" height="46" rx="3"/><rect class="p" x="80" y="51" width="38" height="7" rx="2"/><circle class="t" cx="99" cy="54.5" r="2.2"/>'
    +'<circle class="p" cx="86" cy="72" r="10"/><circle class="t" cx="86" cy="72" r="3.5"/>'
    +'<path class="trazo" pathLength="100" d="M108 36 C 104 22, 120 14, 128 22 C 136 30, 124 38, 120 30 C 117 24, 124 20, 128 24"/>',
  // La regla de 30 cm: «Una sola nota» mueve tu promedio sobre ella.
  regla:()=>{
    let marcas='';for(let k=0;k<=20;k++)marcas+=`M${22+k*6} 40v${k%5?7:13}`;
    return `<g transform="rotate(-14 80 60)"><rect class="a" x="14" y="40" width="132" height="34" rx="4"/><path d="${marcas}"/>`
      +[0,5,10,15].map((k,i)=>`<text x="${22+k*6}" y="68" text-anchor="middle">${i*5}</text>`).join('')+'</g>';
  },
  // El recado que llega volando: un avión de papel con su estela.
  avion:()=>'<path class="estela" d="M10 102 C 30 96, 34 76, 52 82 C 66 86, 60 102, 74 96"/>'
    +'<path class="p" d="M70 72 L148 24 L104 96 Z"/><path class="a" d="M70 72 L148 24 L96 74 Z"/><path d="M96 74 L104 96 M96 74 L148 24 M70 72 L96 74"/>',
  lapiz:()=>hojaLapizObjeto(100)+'<path class="trazo" pathLength="100" d="M28 104 C 50 96, 62 110, 84 102 S 120 96, 136 104"/>',
  calendario:()=>{
    let dias='';for(let f=0;f<3;f++)for(let c=0;c<7;c++)dias+=`<circle class="t" cx="${35+c*15}" cy="${54+f*17}" r="${f===1?3.4:2.4}"/>`;
    return '<rect class="p" x="22" y="18" width="116" height="92" rx="6"/><path d="M22 38h116"/><path d="M50 10v16M80 10v16M110 10v16"/>'
      +'<rect class="a trazo-fondo" x="25" y="62" width="110" height="18" rx="9"/>'+dias;
  },
  escuadra:()=>{
    let marcas='';for(let x=40;x<=124;x+=8)marcas+=`M${x} 100v${(x/8)%2?-5:-9}`;
    return `<path class="a" d="M30 104 L132 104 L30 18 Z"/><path class="p" d="M46 92 L96 92 L46 50 Z"/><path d="${marcas}"/>`;
  },
  goma:()=>'<g transform="rotate(-12 80 60)"><rect class="p" x="32" y="40" width="96" height="40" rx="8"/><rect class="a" x="62" y="40" width="66" height="40"/><path d="M62 40v40"/></g>'
    +'<path class="migas" d="M34 100l5 2M48 106l3-4M28 92l2 5M60 110l5-1"/>',
  mochila:()=>'<path d="M66 28 a14 14 0 0 1 28 0"/><rect class="a" x="38" y="26" width="84" height="86" rx="24"/><path d="M42 50 C 60 60, 100 60, 118 50"/>'
    +'<rect class="p" x="54" y="70" width="52" height="32" rx="9"/><path d="M54 82h52M80 82v9"/>',
  burbujas:()=>'<rect class="a trazo-fondo" x="10" y="48" width="140" height="20" rx="10"/>'+'ABCDE'.split('').map((l,i)=>`<circle class="${i===2?'t':'p'}" cx="${28+i*26}" cy="58" r="11"/><text${i===2?' class="llena"':''} x="${28+i*26}" y="58" text-anchor="middle" dominant-baseline="central">${l}</text>`).join('')
    +'<path class="trazo" pathLength="100" d="M70 42 C 88 36, 102 50, 97 64 C 92 78, 64 78, 62 62 C 60 48, 74 40, 88 42"/>',
  lista:()=>{
    let filas='';for(let k=0;k<5;k++){const y=46+k*13;filas+=`<circle class="${k===1?'a':'p'}" cx="59" cy="${y}" r="3.6"/><path d="M68 ${y}h${k===1?36:28+(k*7)%12}"/>`;}
    return '<rect class="a" x="40" y="18" width="80" height="96" rx="8"/><rect class="p" x="48" y="30" width="64" height="78" rx="3"/><rect class="p" x="64" y="11" width="32" height="14" rx="4"/>'+filas;
  },
  carnet:()=>'<rect class="p" x="26" y="30" width="108" height="72" rx="8"/><path class="a" d="M26 46 v-8 a8 8 0 0 1 8 -8 h92 a8 8 0 0 1 8 8 v8 z"/><path d="M26 46h108"/>'
    +'<rect class="p" x="36" y="56" width="30" height="36" rx="4"/><circle cx="51" cy="68" r="6"/><path d="M41 90 c 2 -10 18 -10 20 0"/><path d="M76 62h46M76 74h34M76 86h40"/>',
  cuaderno:()=>{
    let espiral='';for(let y=28;y<=104;y+=12)espiral+=`M34 ${y} h12`;
    return `<rect class="a" x="40" y="18" width="84" height="96" rx="6"/><path d="${espiral}"/><rect class="p" x="58" y="40" width="50" height="24" rx="3"/><path d="M64 50h38M64 57h24"/>`;
  },
  timbre:()=>'<ellipse class="huella" cx="80" cy="104" rx="36" ry="8"/><g class="sello"><circle class="p" cx="80" cy="20" r="12"/><rect class="p" x="72" y="30" width="16" height="22"/>'
    +'<rect class="a" x="48" y="52" width="64" height="16" rx="3"/><rect class="t" x="52" y="68" width="56" height="5"/></g>',
};
function hojaObjeto(id){
  const dibujo=HOJA_OBJETOS[id];
  return dibujo?`<svg class="hoja-objeto" data-obj="${id}" viewBox="0 0 160 120" aria-hidden="true">${dibujo()}</svg>`:'';
}

// ─── Las revelaciones con su metáfora (Lucas, 2026-11-17) ───
// Cada dato se muestra con un objeto de la sala, no solo con una cifra. Todas
// son decorativas (`aria-hidden`): la frase de la historia ya dice el dato.

// La semana pesada en la hoja del calendario: una burbuja rellena por
// evaluación, en el día que cayó. El día más cargado va resaltado, solo si
// tuvo más de una: con una por día no hay uno que destaque.
function semanaWrapped(dias){
  const max=Math.max(...dias),tope=max>1?max:Infinity;let r=0;
  return `<div class="hoja-semana" aria-hidden="true">${'LMMJVSD'.split('').map((l,i)=>`<div class="dia${dias[i]===tope?' tope':''}"><span class="pila">${
    Array.from({length:dias[i]},()=>`<span class="hoja-burbuja chica llena" style="--r:${(r++*.08).toFixed(2)}"></span>`).join('')}</span><b>${l}</b></div>`).join('')}</div>`;
}
// La primera nota como una prueba corregida: el nombre arriba y la nota
// encerrada a lápiz en la esquina.
function pruebaWrapped(nota,evaluacion,ramo){
  return `<div class="hoja-prueba"><div class="enc"><b>${evaluacion}</b><span>${ramo}</span></div>
    <div class="nota">${hojaLapiz(`<span class="wrapped-big">${nota}</span>`)}</div><i class="renglon"></i><i class="renglon"></i><i class="renglon corto"></i></div>`;
}
// El ramo que más costó como una lista corregida de arriba abajo: cada
// evaluación en su renglón, con puntos hasta la nota, y al pie el promedio
// encerrado a lápiz. Hasta seis renglones; el resto se nombra.
function listaWrapped(filas,promedio){
  const ver=filas.slice(0,6),resto=filas.length-ver.length;
  return `<div class="hoja-lista">${ver.map((f,i)=>`<div class="fila" style="--i:${i}"><span>${f.nombre}</span><i></i><b>${f.nota}</b></div>`).join('')}`
    +`${resto>0?`<div class="fila mas" style="--i:${ver.length}"><span>y ${resto} más</span></div>`:''}`
    +`<div class="total" style="--i:${ver.length+1}"><span>Promedio</span>${hojaLapiz(`<b>${promedio}</b>`)}</div></div>`;
}
// Antes y ahora en barras paralelas sobre la escala de 1,0 a 7,0. La de ahora
// va en el color de la historia; la de antes, solo el contorno.
function barrasWrapped(filas){
  const ancho=v=>(Math.min(Math.max((v-1)/6,0),1)*100).toFixed(1);
  return `<div class="hoja-barras" aria-hidden="true">${filas.map((f,i)=>`<div class="fila${f.ahora?' ahora':''}" style="--r:${i*.15}"><span class="etq">${f.label}</span>
    <span class="pista"><i style="--v:${ancho(f.valor)}%"></i></span><b>${fmtPromedio(f.valor)}</b></div>`).join('')}
    <div class="escala"><span>1,0</span><span>4,0</span><span>7,0</span></div></div>`;
}
// La nota que pesó más que las otras: cae como un post-it y empuja tu promedio
// sobre una regla, de antes a después. La franja recorrida queda en el color
// de la historia. La regla se acerca al tramo que importa (medio punto a cada
// lado), siempre dentro de 1,0–7,0.
function empujeWrapped(nota,antes,despues){
  const lo=Math.max(1,Math.floor(antes*2-1)/2),hi=Math.min(7,Math.ceil(despues*2+1)/2),w=320,pad=14;
  const x=v=>pad+(Math.min(Math.max(v,lo),hi)-lo)/(hi-lo)*(w-2*pad),pc=v=>(x(v)/w*100).toFixed(2)+'%';
  let marcas='',etq='';
  for(let k=Math.round(lo*10);k<=Math.round(hi*10);k++){const xx=x(k/10).toFixed(1);marcas+=`M${xx} 4v${k%5?8:16}`;if(k%5===0)etq+=`<text x="${xx}" y="37" text-anchor="middle">${comaWrapped((k/10).toFixed(1))}</text>`;}
  return `<div class="hoja-empuje" aria-hidden="true"><div class="cae">${hojaPostit(`<b>${nota}</b>`,-4)}</div>
    <div class="regla" style="--desde:${pc(antes)};--hasta:${pc(despues)}"><svg viewBox="0 0 ${w} 44"><rect x="1" y="1" width="${w-2}" height="42" rx="5"/><path d="${marcas}"/>${etq}</svg>
    <i class="banda"></i><span class="antes">${fmtPromedio(antes)}</span><div class="marca"><i></i><span>${fmtPromedio(despues)}</span></div></div></div>`;
}
// La remontada como curva desde la segunda nota (la remontada se mide desde
// ahí): el promedio del ramo después de cada nota, la
// línea del 4,0 punteada y el punto más bajo encerrado a lápiz. En grafito:
// el semáforo no es decorado.
function curvaWrapped(serie,iMinimo,final){
  const pts=serie.slice();if(Math.abs(final-pts[pts.length-1])>=0.05)pts.push(final);
  // El eje va de un poco bajo lo más bajo a un poco sobre lo más alto, siempre
  // con el 4,0 adentro: en la escala completa la subida se ve plana.
  const lo=Math.max(1,Math.min(...pts,4)-0.6),hi=Math.min(7,Math.max(...pts,4)+0.6);
  const w=320,h=150,x=i=>14+i*(w-84)/Math.max(pts.length-1,1),y=v=>h-16-(v-lo)/(hi-lo)*(h-32);
  const linea=pts.map((v,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const mx=x(iMinimo),my=y(pts[iMinimo]),fx=x(pts.length-1),fy=y(pts[pts.length-1]),u=y(4).toFixed(1);
  return `<svg class="hoja-curva" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path class="umbral" d="M8 ${u}H${w-8}"/><text class="etq" x="8" y="${(y(4)-6).toFixed(1)}">4,0</text>
    <path class="linea" pathLength="100" d="${linea}"/>
    <path class="trazo" pathLength="100" d="M${mx-6} ${my-19} C ${mx+22} ${my-22}, ${mx+24} ${my+18}, ${mx} ${my+19} C ${mx-24} ${my+20}, ${mx-24} ${my-13}, ${mx+3} ${my-20}"/>
    <circle class="fin" cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="7"/><text class="valor" x="${(fx+14).toFixed(1)}" y="${(fy+7).toFixed(1)}">${fmtPromedio(final)}</text></svg>`;
}
