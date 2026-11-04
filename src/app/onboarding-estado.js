
// ─── SUPABASE / AUTH ───────────────────────────────────────────────────────────
// Credenciales del proyecto GradeHub. La publishable key es pública por diseño.
// Nunca poner la sb_secret_... acá — esa solo se usa en servidores.
// Largo mínimo de contraseña al CREAR o CAMBIAR una. Supabase trae 6 por
// defecto; súbelo también en el panel (Auth → Policies) o el servidor sigue
// aceptando 6 aunque el cliente no lo ofrezca.

// ─── INIT ────────────────────────────────────────────────────────────────────
// Estado del onboarding por pasos. Va acá y no junto a sus funciones porque
// boot() lo usa al arrancar: con `let` más abajo caía en la zona muerta temporal
// y la app crasheaba si Supabase no cargaba.
let obStep=0;
// El último paso del estudiante, el de los ramos. El profesor no llega ahí.
const OB_TOTAL=5;
// Estudiante o profesor particular (#697). Todos parten como estudiantes; el
// profesor llega con la intención que dejó la pantalla de entrada (2026-11-03).
let obTipo='estudiante';
// Mientras viaja la postulación del profesor, el botón no se puede volver a apretar.
let obEnviandoProfesor=false;
// El profesor no estudia acá: se salta universidad, carrera, generación y ramos,
// y en su lugar cuenta cómo se presenta. Su paso lleva un número propio para
// que los del estudiante (1 a 5) sigan significando lo mismo en el embudo.
// El paso 0 (elegir tipo de cuenta) ya no existe, pero su número no se reusa.
const OB_PASO_PROFESOR=6;
function obPasos(tipo){return (tipo||obTipo)==='profesor'?[1,OB_PASO_PROFESOR]:[1,2,3,4,5];}
function obUltimoPaso(){const p=obPasos();return p[p.length-1];}
// Cuántos semestres ofrece el paso 4 como mínimo. Una carrera cuya malla llega
// más lejos ofrece los suyos (`semestresDeCarrera`): Medicina UAndes y UC y
// Derecho y Filosofía tienen 12, los dobles títulos UAI 13. Antes era un 11
// fijo y quien iba en 12° no tenía cómo decirlo. `mallaCubreTodoElPaso` compara
// contra el mismo número, así que la promesa de "tu malla se carga sola" sigue
// siendo cierta para todos los semestres que se ofrecen.
const OB_SEMESTRES=11;
function semestresDeCarrera(tenant,codigo){
  const malla=codigo?mallaDeCarrera(tenant,codigo):null;
  const ultimo=malla?Math.max(0,...Object.keys(malla).map(Number).filter(Number.isInteger)):0;
  return Math.max(OB_SEMESTRES,ultimo);
}
// Etiquetas fijas nuestras, de lista cerrada: no son texto del estudiante, y
// hacen legible el embudo sin tener que traducir números mirando el código.
// Se indexa por número de paso: el 0 y el 6 llegaron con el tipo de cuenta, y
// el 0 ya no se emite desde 2026-11-03.
const OB_ETAPAS=['tipo','nombre','universidad','carrera','semestre','ramos','profesor'];
// Qué pasos alcanzó en ESTA pasada por el onboarding. El embudo cuenta
// cuántos alcanzan cada paso, así que cada uno se emite una sola vez: si
// volver atrás y volver a avanzar reemitiera, los primeros pasos saldrían
// inflados y la caída real quedaría escondida.
// Un conjunto y no el paso más alto: quien llega al paso del profesor (6) y
// vuelve a elegir Estudiante igual tiene que contar en los pasos 2 a 5.
const obPasosVistos=new Set();
let obRamos=[],obRamosKey='',obManualOpen=false,obManualError='';

document.getElementById('ob-name').addEventListener('input',checkOb);


// "Tu malla se carga sola" se promete en el paso 3, cuando todavía no sabemos
// en qué semestre va la persona. Si la malla no cubre TODOS los semestres que el
// paso 4 ofrece, la promesa es falsa para parte de la gente: Ingeniería UC llega
// hasta 4° —de 5° en adelante se separa por major— y Comercial hasta 8°, así que
// quien va más arriba elegía su carrera leyendo que le cargábamos los ramos y
// después no le cargaba ninguno. Prometemos solo donde se cumple siempre.
function mallaCubreTodoElPaso(codigo){
  if(!codigo)return false;
  const porCarrera=mallaDeCarrera(selectedTenant,codigo);
  if(!porCarrera)return false;
  for(let i=1;i<=semestresDeCarrera(selectedTenant,codigo);i++)if(!porCarrera[i]&&!porCarrera[String(i)])return false;
  return true;
}
function initSemGrid(){
  const g=document.getElementById('sem-grid');g.innerHTML='';
  const total=semestresDeCarrera(selectedTenant,selectedCarrera);
  if(selectedSem>total)selectedSem=total;
  for(let i=1;i<=total;i++){
    const b=document.createElement('button');
    b.className='sem-btn'+(i===selectedSem?' sel':'');
    b.textContent=i+'°';
    b.onclick=()=>{selectedSem=i;obSemManual=true;initSemGrid();if(typeof actualizarSemestreCalculado==='function')actualizarSemestreCalculado();checkOb();};
    g.appendChild(b);
  }
}
// La lista buscable permite declarar cualquier carrera. Cada opción muestra
// solo su nombre: la cobertura del catálogo no orienta qué carrera elegir.
function initCarreraGrid(){
  const g=document.getElementById('carrera-grid');if(!g)return;g.innerHTML='';
  const todas=carrerasDeclarables(selectedTenant);
  const q=normName(carreraFiltro||'');
  const vistas=q?todas.filter(c=>normName(c.n).includes(q)):todas;
  // Una carrera declarable no puede quedar escondida en un paso obligatorio.
  // 71 opciones son largas, pero el buscador sigue arriba y cada una tiene que
  // existir también para quien recorre la lista con el dedo.
  vistas.forEach(c=>{
    const elegida=c.malla?c.malla===selectedCarrera:(!selectedCarrera&&c.n===selectedCarreraNombre);
    const b=document.createElement('button');
    b.className='carrera-opt'+(elegida?' sel':'');
    b.textContent=c.n;
    b.onclick=()=>{
      // `carrera` sigue siendo el código de la malla y manda en todo lo que ya
      // existe. `carreraNombre` es lo declarado, y es lo único que hay cuando
      // no tenemos su malla.
      selectedCarrera=c.malla||null;selectedCarreraNombre=c.n;
      initCarreraGrid();checkOb();
      if(typeof obStep!=='undefined' && obStep===3 && document.getElementById('screen-onboard').classList.contains('active')){
        setTimeout(()=>{if(obStep===3)obNext();},260);
      }
    };
    g.appendChild(b);
  });
  // La lista oficial envejece: una carrera nueva no puede dejar a alguien sin
  // poder declararse en un paso obligatorio. Que la búsqueda haya encontrado
  // algo parecido no prueba que sea SU carrera, así que la salida no depende de
  // que la lista quede vacía.
  if(q){
    const b=document.createElement('button');
    b.className='carrera-opt'+(!selectedCarrera&&carreraFiltro.trim()===selectedCarreraNombre?' sel':'');
    b.innerHTML='Usar «'+esc(carreraFiltro.trim())+'»';
    b.onclick=()=>{selectedCarrera=null;selectedCarreraNombre=carreraFiltro.trim();initCarreraGrid();checkOb();};
    g.appendChild(b);
  }
}
function filtrarCarreras(v){carreraFiltro=v;initCarreraGrid();}
function filtrarCarrerasAjustes(v){window._sFiltro&&window._sFiltro(v);}
// ─── ONBOARDING POR PASOS ────────────────────────────────────────────────────

// La validación es independiente por paso: la lista sugerida nunca obliga a
// tomar un ramo, y cada pantalla solo exige su propio dato.
