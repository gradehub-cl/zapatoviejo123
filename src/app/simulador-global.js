
// ─── SIMULADOR DE ESCENARIOS ──────────────────────────────────────────────────
let simState={}; // { catId: [ {id, valor, slot?} ] } — hipotéticas, no se guardan
// Faltar a una evaluación, SOLO dentro del simulador: { catId: {hacia, tipo} }.
//
// Fuera del simulador esto exige que el programa declare a dónde pasa el
// porcentaje, y de 88 pautas lo declaran dos. Acá no hace falta: nadie está
// afirmando cuál es la regla de su curso, está preguntando qué le pasaría si
// fuera esa. Por eso no se guarda en S ni toca gradehub_v1.
let simAusencias={};
function simConComa(valor){return String(valor).replace('.',',');}

// ─── SIMULADOR GLOBAL DE SEMESTRE ────────────────────────────────────────────
// Proyecta el promedio general moviendo la nota final de cada ramo con sliders.
// No toca datos: es exploración pura ("¿con qué promedio termino si...?").
let simGlobalState={}; // ramoId -> nota hipotética final

function openSimGlobalModal(){
  simGlobalState={};
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Simular el semestre</div>
    <p style="font-size:0.8125rem;color:var(--fg2);margin-bottom:16px;line-height:1.5;">Cambia la nota final de cada ramo y mira tu promedio. No se guarda.</p>
    <div class="simg-hero">
      <div class="simg-hero-label">Promedio proyectado</div>
      <div class="simg-hero-num" id="simg-avg">—</div>
      <div id="simg-delta"></div>
    </div>
    <div class="simg-list" id="simg-list"></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cerrar</button>
      <button class="btn-confirm" onclick="simGlobalReset()">Reiniciar todo</button>
    </div>`;
  openModal();
  renderSimGlobal();
  track('open_sim_global',{ramos:S.ramos.length});
}

function simGlobalReset(){simGlobalState={};renderSimGlobal();}

// El slider era imposible de apuntar: 60 pasos de 0,1 repartidos en el ancho de
// un teléfono, y con el dedo encima tapando el número. Ahora son dos botones de
// 0,1 y el número se escribe directo.
const SIM_MIN=1.0, SIM_MAX=7.0;
function simGlobalNormaliza(v){
  if(isNaN(v))return null;
  return Math.round(Math.min(SIM_MAX,Math.max(SIM_MIN,v))*10)/10;
}
// Punto de partida cuando el ramo no tiene nota todavía: el 4,0 es el número
// desde el que el estudiante piensa, no el 1,0.
function simGlobalBase(ramoId){
  if(simGlobalState[ramoId]!==undefined)return simGlobalState[ramoId];
  const r=S.ramos.find(x=>x.id===ramoId);
  const real=r?ramoAvg(r):null;
  return real!==null&&real!==undefined?real:4.0;
}
function simGlobalStep(ramoId,delta){
  simGlobalState[ramoId]=simGlobalNormaliza(simGlobalBase(ramoId)+delta);
  renderSimGlobal();
}
// Lo tecleado se lee en dos pasos, y el ORDEN es el arreglo.
//
// Antes iba directo al clamp, así que "55" no daba error: daba un 7,0
// silencioso, porque 55 está fuera de escala y el clamp lo baja al tope. El
// estudiante escribía su 5,5 y se llevaba un 7,0 sin que nada se lo dijera.
//
// Primero parseNota, que traduce lo que la gente escribe de verdad: coma
// ("5,5") y dos dígitos sin punto ("55" → 5,5). Solo lo que sigue fuera de
// escala después de eso pasa al clamp — que se queda, porque escribir "9" es
// querer el máximo, no querer nada, y eso ya estaba decidido.
function simGlobalDesdeTexto(raw){
  // El simulador del semestre va en décimas (sus botones suben de a 0,1), aunque
  // una nota real admita centésimas.
  const n=parseNota(raw);
  if(!isNaN(n))return simGlobalNormaliza(n);
  return simGlobalNormaliza(parseFloat(String(raw).replace(',','.')));
}
function simGlobalSet(ramoId,raw){
  const v=simGlobalDesdeTexto(raw);
  if(v===null)delete simGlobalState[ramoId];
  else simGlobalState[ramoId]=v;
  renderSimGlobal();
}
// Mientras escribe NO se vuelve a dibujar la lista: eso le arrancaría el foco
// del campo en la primera tecla. Solo se actualiza el proyectado de arriba.
function simGlobalTyping(ramoId,raw){
  const v=simGlobalDesdeTexto(raw);
  if(v===null)delete simGlobalState[ramoId];
  else simGlobalState[ramoId]=v;
  renderSimGlobalHero();
}

function simGlobalClear(ramoId){
  delete simGlobalState[ramoId];
  renderSimGlobal();
}

// Promedio proyectado: usa la nota hipotética si existe, si no la real del ramo
// El promedio proyectado se le pide a `gpa`, la MISMA función que calcula el
// número que el estudiante ve en su pantalla. Acá se calculaba aparte, con una
// suma dividida por la cantidad de ramos, y eso lo dejaba diciendo otra cosa:
// abrir el simulador y no tocar nada mostraba 6,22 cuando la app decía 6,03.
//
// No era un redondeo. `gpa` hace tres cosas que la cuenta a mano no hacía:
// pondera por créditos cuando todos los ramos los tienen —un laboratorio de 0
// créditos no mueve el promedio real, pero en un promedio simple pesa igual que
// un ramo de 10—, filtra con `ramosDelPromedio` los que no corresponde contar
// por separado, y le pasa el semestre entero a `ramoAvg` para resolver los
// ramos vinculados.
//
// Duplicar ese cálculo era la causa: dos fórmulas para el mismo número siempre
// terminan separándose. Las notas simuladas entran como `avgOverride`, que es
// el mecanismo que `ramoAvg` ya respeta, y el resto lo resuelve `gpa`.
function simGlobalAvg(){
  const proyectado=S.ramos.map(r=>
    simGlobalState[r.id]!==undefined?{...r,avgOverride:simGlobalState[r.id]}:r);
  return gpa(proyectado);
}

function renderSimGlobal(){renderSimGlobalHero();renderSimGlobalList();}

function renderSimGlobalHero(){
  const real=gpa(S.ramos);
  const proj=simGlobalAvg();
  const hasSim=Object.keys(simGlobalState).length>0;

  const avgEl=document.getElementById('simg-avg');
  if(avgEl){
    avgEl.textContent=proj!==null?nf(proj,2):'—';
    avgEl.style.color=proj!==null?getColor(proj):'var(--fg3)';
  }

  const deltaEl=document.getElementById('simg-delta');
  if(deltaEl){
    if(proj!==null&&real!==null&&hasSim){
      const diff=proj-real;const abs=Math.abs(diff);
      const kind=abs<0.005?'flat':diff>0?'up':'down';
      const arrow=kind==='up'?'↑':kind==='down'?'↓':'·';
      deltaEl.className='simg-hero-delta '+kind;
      deltaEl.textContent=`${arrow} ${nf(abs,2)} vs ${nf(real,2)} actual`;
      deltaEl.style.display='inline-flex';
    } else {
      deltaEl.style.display='none';
    }
  }

}

function renderSimGlobalList(){
  const list=document.getElementById('simg-list');
  if(!list)return;
  list.innerHTML=S.ramos.map(r=>{
    const realAvg=ramoAvg(r);
    const hyp=simGlobalState[r.id];
    const shown=hyp!==undefined?hyp:realAvg;
    const isHyp=hyp!==undefined;
    const prog=ramoProgress(r);
    const metaLeft=realAvg!==null
      ? `Actual ${fmtPromedio(realAvg)} · ${prog.pct}% evaluado`
      : (r.categorias.length?'Sin notas aún':'Sin evaluaciones');
    const id=esc(r.id);
    const val=shown!==null?nf(shown):'';
    const color=shown!==null?(isHyp?getColor(shown):getColorRamo(r,shown)):'var(--fg3)';
    const tope=shown!==null&&shown>=SIM_MAX, piso=shown!==null&&shown<=SIM_MIN;
    return `
      <div class="simg-row">
        <div class="simg-row-hd">
          <div class="simg-row-name"><span class="simg-dot" style="background:${esc(r.color)}"></span><span>${esc(r.nombre)}</span></div>
        </div>
        <div class="simg-stepper">
          <button type="button" class="simg-step" ${piso?'disabled':''} onclick="simGlobalStep('${id}',-0.1)" aria-label="Bajar la nota de ${esc(r.nombre)}">−</button>
          <input class="simg-val ${isHyp?'hyp':'real'}" style="color:${color}" value="${val}" placeholder="—"
            inputmode="decimal" maxlength="4" aria-label="Nota simulada de ${esc(r.nombre)}"
            oninput="simGlobalTyping('${id}',this.value)"
            onchange="simGlobalSet('${id}',this.value)"
            onfocus="this.select()"/>
          <button type="button" class="simg-step" ${tope?'disabled':''} onclick="simGlobalStep('${id}',0.1)" aria-label="Subir la nota de ${esc(r.nombre)}">+</button>
        </div>
        <div class="simg-row-meta">
          <span>${metaLeft}</span>
          ${isHyp?`<button class="simg-reset" onclick="simGlobalClear('${id}')">Volver al real</button>`:'<span></span>'}
        </div>
      </div>`;
  }).join('');
}
