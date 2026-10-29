
// ─── MARCA DE UNIVERSIDAD ────────────────────────────────────────────────────
// Los datos (TENANTS, TENANT_GLYPHS) están en data.js.

// Contenido de la marca: el SVG si está registrado, si no la sigla.
function tenantMark(code){
  const g=TENANT_GLYPHS[code];
  if(g)return `<svg class="tenant-glyph" viewBox="0 0 48 48">${g}</svg>`;
  const t=TENANTS[code];
  const txt=(t&&(t.mono||t.short))||'?';
  return `<span class="tenant-mono" data-len="${txt.length}">${esc(txt)}</span>`;
}

// Con caja teñida — onboarding
function tenantBadge(code,cls){
  if(!TENANTS[code])return '';
  return `<span class="tenant-badge ${cls||''}" style="--tb:var(--primary)" aria-hidden="true">`
    +tenantMark(code)+'</span>';
}

// Compacta — junto al wordmark de GradeHub en la topbar
function tenantGlyphBare(code){
  if(!TENANTS[code])return '';
  return `<span class="brand-tenant" style="--tb:var(--primary)" aria-hidden="true">`
    +tenantMark(code)+'</span>';
}
let selectedTenant='fen';

// ─── IDENTIDAD VISUAL · APLICACIÓN ───────────────────────────────────────────
// La universidad no altera la paleta. Su identidad vive en sus datos y en el
// monograma; estos tokens son los mismos para toda persona que usa GradeHub.

// Universidades que se ofrecen al elegir. Una oculta sigue apareciendo si el
// estudiante ya la tiene seleccionada, para no dejarlo sin su opción actual.
function tenantsVisibles(actual){
  return Object.entries(TENANTS).filter(([code,cfg])=>!cfg.oculto||code===actual);
}

// Escribe la identidad como CSS custom properties en :root. Todos los
// componentes leen estas variables, sin condicionales de universidad.
// Modo de color: 'sistema' sigue al sistema operativo, 'claro' y 'oscuro' lo
// fuerzan. El atributo data-modo en :root es lo que hace que el CSS forzado le
// gane a la media query (ver el bloque de temas en styles.css).
function modoColor(){
  const m=S&&S.modo;
  return m==='claro'||m==='oscuro'?m:'sistema';
}
function prefersDark(){
  const m=modoColor();
  if(m==='claro')return false;
  if(m==='oscuro')return true;
  return !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function aplicarModo(){
  const m=modoColor();
  const r=document.documentElement;
  if(m==='sistema')r.removeAttribute('data-modo'); else r.setAttribute('data-modo',m);
}
function setModo(m){
  S.modo=(m==='claro'||m==='oscuro')?m:'sistema';
  save();aplicarModo();applyTheme();track('set_modo',{modo:S.modo});
  const g=document.getElementById('s-modo-grid');if(g)renderModoGrid();
}
function setAcento(acento){
  S.acento=ACENTOS[acento]?acento:'turquesa';
  save();applyTheme();track('set_acento',{acento:S.acento});
  const g=document.getElementById('s-acento-grid');if(g)renderAcentoGrid();
}
function setFondo(fondo){
  S.fondo=FONDOS[fondo]?fondo:'neutro';
  save();applyTheme();track('set_fondo',{fondo:S.fondo});
  const g=document.getElementById('s-fondo-grid');if(g)renderFondoGrid();
}
function applyTheme(){
  aplicarModo();
  const th=ACENTOS[(S&&S.acento)||'turquesa']||GRADEHUB_THEME;
  const r=document.documentElement.style;
  const dark=prefersDark();
  const modo=dark?'oscuro':'claro';
  const fondo=FONDOS[(S&&S.fondo)||'neutro']||FONDOS.neutro;
  const surf=fondo[modo];
  const sem=SEMAFORO[modo];
  // Acentos: valen en ambos modos
  r.setProperty('--primary',dark?(th.darkPrimary||th.primary):th.primary);
  r.setProperty('--primary-fg',dark?(th.darkPrimaryFg||th.primaryFg):th.primaryFg);
  r.setProperty('--primary-light',dark?th.darkPrimaryLight:th.primaryLight);
  r.setProperty('--accent',th.accent);
  r.setProperty('--secondary',dark?(th.darkSecondary||th.secondary||th.accent):(th.secondary||th.accent));
  r.setProperty('--green',sem.green);
  r.setProperty('--green-bg',sem.greenBg);
  r.setProperty('--green-border',sem.greenBorder);
  r.setProperty('--yellow',sem.yellow);
  r.setProperty('--yellow-bg',sem.yellowBg);
  r.setProperty('--red',sem.red);
  r.setProperty('--red-bg',sem.redBg);
  SURFACE_KEYS.forEach(k=>r.setProperty('--'+k,surf[k]));
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',surf.bg);
}
// Si el sistema cambia de claro a oscuro, recalcular las superficies del tema
if(window.matchMedia){
  const mq=window.matchMedia('(prefers-color-scheme: dark)');
  const onChange=()=>applyTheme();
  if(mq.addEventListener)mq.addEventListener('change',onChange);
  else if(mq.addListener)mq.addListener(onChange);
}

// Paleta de colores de ramo. Es UNA sola para los cuatro temas: el color
// identifica al ramo, no decora la universidad (ver el comentario en data.js).
// Solo aplica a ramos NUEVOS — los existentes conservan el que ya tienen.
function chartColors(){return COLORS;}

// Siguiente color sugerido: rota la paleta del tema evitando repetir si se puede
// Color sugerido para un ramo. Primero su familia (ver FAMILIAS_COLOR en
// data.js); si no calza, uno estable derivado del nombre, para que el mismo
// ramo se vea igual en la app de dos compañeros. El estudiante puede cambiarlo
// siempre — esto es solo el punto de partida.
function colorDeFamilia(nombre){
  const n=normName(nombre);
  const f=FAMILIAS_COLOR.find(([re])=>re.test(n));
  return f?f[1]:null;
}
function colorEstable(nombre){
  const pal=chartColors();
  const n=normName(nombre);
  let h=0;
  for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;
  return pal[h%pal.length];
}
function nextRamoColor(nombre){
  const pal=chartColors();
  const usados=new Set((S&&S.ramos?S.ramos:[]).map(r=>r.color));
  if(nombre){
    // La familia SUGIERE, no impone. Si el color de la familia ya lo tiene otro
    // ramo del estudiante, se cede: distinguir un ramo de otro pesa más que
    // agrupar por materia. Micro I y Macro I son economía los dos, pero en la
    // lista tienen que verse distintos — esa fue la queja original.
    const fam=colorDeFamilia(nombre);
    if(fam&&!usados.has(fam))return fam;
    const est=colorEstable(nombre);
    if(!usados.has(est))return est;
  }
  const libre=pal.find(c=>!usados.has(c));
  return libre||pal[(S&&S.ramos?S.ramos.length:0)%pal.length];
}
