// halloween — tema temporal (oct–nov 2026). Para quitarlo: borra este archivo,
// halloween.css y las dos líneas marcadas "halloween" en index.html.
// No guarda nada: S.acento y S.fondo de cada usuario quedan intactos y vuelven solos.
{
  const _applyTheme=applyTheme;
  const PALETA={
    claro:{primary:'#6b21a8',primaryFg:'#ffffff',primaryLight:'#f3e8ff',accent:'#fb923c',secondary:'#c2410c',
      bg:'#fbf7ff',bg2:'#fbf7ff',card:'#ffffff',border:'#e9dcf5',border2:'#bfa8d8',muted:'#f3ebfb',fg:'#1d1029',fg2:'#57466a',fg3:'#6e5c82'},
    oscuro:{primary:'#fb923c',primaryFg:'#1a0b2e',primaryLight:'#2a1640',accent:'#fb923c',secondary:'#c4b5fd',
      bg:'#120a1c',bg2:'#120a1c',card:'#1c1129',border:'#33224a',border2:'#5b4478',muted:'#241733',fg:'#f5f0fa',fg2:'#c4b6d4',fg3:'#9d8cb2'},
  };
  applyTheme=function(){
    _applyTheme();
    const p=PALETA[prefersDark()?'oscuro':'claro'];
    const r=document.documentElement.style;
    r.setProperty('--primary',p.primary);
    r.setProperty('--primary-fg',p.primaryFg);
    r.setProperty('--primary-light',p.primaryLight);
    r.setProperty('--accent',p.accent);
    r.setProperty('--secondary',p.secondary);
    SURFACE_KEYS.forEach(k=>r.setProperty('--'+k,p[k]));
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',p.bg);
  };
  const FRASES=[
    'Las notas salen de la tumba',
    'Algo se mueve en tu promedio',
    'Nadie escapa de las pruebas',
    'Esta noche, el examen te mira',
    'Cuidado con lo que acecha',
    'El semestre no perdona',
  ];
  fraseInicio=function(fecha=new Date()){
    const dia=Math.floor(Date.UTC(fecha.getFullYear(),fecha.getMonth(),fecha.getDate())/86400000);
    return FRASES[((dia%FRASES.length)+FRASES.length)%FRASES.length];
  };
  document.documentElement.classList.add('halloween');
  applyTheme();
}
