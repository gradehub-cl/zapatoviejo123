// Temas festivos: el admin prende uno en Administración → Usuarios y lo ven
// todos (supabase/temas_festivos.sql). No guarda nada en gradehub_v1: S.acento
// y S.fondo de cada usuario quedan intactos y vuelven solos al apagarlo.
// Navidad ya tiene su botón en el panel, pero todavía no tiene diseño.
let temaFestivo=null;
// Copia de solo lectura para muestras: no activa el tema ni altera su paleta.
let paletaTemaFestivo=()=>null;
{
  const _applyTheme=applyTheme,_fraseInicio=fraseInicio;
  const PALETA={
    claro:{primary:'#6b21a8',primaryFg:'#ffffff',primaryLight:'#f3e8ff',accent:'#fb923c',secondary:'#c2410c',
      bg:'#fbf7ff',bg2:'#fbf7ff',card:'#ffffff',border:'#e9dcf5',border2:'#bfa8d8',muted:'#f3ebfb',fg:'#1d1029',fg2:'#57466a',fg3:'#6e5c82'},
    oscuro:{primary:'#fb923c',primaryFg:'#1a0b2e',primaryLight:'#2a1640',accent:'#fb923c',secondary:'#c4b5fd',
      bg:'#120a1c',bg2:'#120a1c',card:'#1c1129',border:'#33224a',border2:'#5b4478',muted:'#241733',fg:'#f5f0fa',fg2:'#c4b6d4',fg3:'#9d8cb2'},
  };
  paletaTemaFestivo=(tema,oscuro=false)=>tema==='halloween'?{...PALETA[oscuro?'oscuro':'claro']}:null;
  applyTheme=function(){
    _applyTheme();
    const halloween=temaFestivo==='halloween',dark=prefersDark();
    document.documentElement.classList.toggle('halloween',halloween);
    document.documentElement.classList.toggle('halloween-oscuro',halloween&&dark);
    if(!halloween)return;
    const p=PALETA[dark?'oscuro':'claro'];
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
    'Hay algo rojo en tu promedio, y no es sangre',
    'Tus notas están de miedo',
    'Que la prueba pase susto',
  ];
  fraseInicio=function(fecha=new Date()){
    if(temaFestivo!=='halloween')return _fraseInicio(fecha);
    const dia=Math.floor(Date.UTC(fecha.getFullYear(),fecha.getMonth(),fecha.getDate())/86400000);
    return FRASES[((dia%FRASES.length)+FRASES.length)%FRASES.length];
  };
}
// El último tema visto se recuerda en este navegador para no parpadear al
// abrir; el servidor manda apenas responde.
const CLAVE_TEMA_FESTIVO='gradehub_tema_festivo';
function ponerTemaFestivo(tema){
  temaFestivo=tema||null;
  try{tema?localStorage.setItem(CLAVE_TEMA_FESTIVO,tema):localStorage.removeItem(CLAVE_TEMA_FESTIVO);}catch(e){}
  applyTheme();
}
try{temaFestivo=localStorage.getItem(CLAVE_TEMA_FESTIVO);}catch(e){}
applyTheme();
// Sin conexión o sin el SQL aplicado se queda con lo que había.
if(supabaseClient)supabaseClient.rpc('tema_festivo_activo').then(({data,error})=>{if(!error)ponerTemaFestivo(data);},()=>{});
