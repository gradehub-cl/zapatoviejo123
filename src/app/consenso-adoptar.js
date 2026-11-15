
async function consensoParaRamo(r){
  if(esCuentaProfesor())return null;
  const sugerida=r.pautaSugerida?.aceptada;
  const estado=S,usuario=typeof currentUser!=='undefined'&&currentUser?.id;
  const ctx=sugerida?JSON.stringify(contextoPautaSugerida(r)):null;
  const puedeOfrecer=()=>!sugerida||(S===estado&&usuario===currentUser?.id&&
    S.ramos.includes(r)&&pautaSugeridaEnFicha(r)&&pautaSugeridaIntacta(r)&&
    JSON.stringify(contextoPautaSugerida(r))===ctx&&!cambioDePauta(r));
  if(!puedeOfrecer())return null;
  const cons=await cargarConsenso(S.tenant,periodoReporte(r),seccionReporte(r));
  if(!cons||!puedeOfrecer())return null;
  if(sugerida&&actualizarProcedenciaSugerida(r,cons)){
    save();renderRamo();return null;
  }
  // En un ramo no coordinado otra pauta con más respaldo puede ser la de otro
  // profesor: no se ofrece como cambio sobre la que la persona ya tiene.
  if(coordinacionRamo(r)===null)await asegurarMallasCoordinacion(r.origen?.tenant||S.tenant);
  if(ramoNoCoordinado(r)||!puedeOfrecer())return null;
  const mia=estructuraParaConsenso(estructuraDe(r));
  // Las dos se comparan acá, con las mismas funciones: comparar contra
  // `c.huella`, que calcula el servidor, ofrecería como "otra pauta" la misma
  // si alguna vez las dos implementaciones difieren en un detalle.
  const hit=cons.find(c=>c.ramo_key===claveReporte(r)&&consensoVigenteParaRamo(c,r)&&
    !nadaQueOfrecer(estructuraParaConsenso(c.estructura),mia)&&!consensoDescartado(r,c));
  return hit||null;
}

// "Dejar la mía" es una decisión: el aviso de ESA pauta se calla hasta que la
// reporten CONSENSO_REAVISO personas más que cuando la descartó. Otra pauta
// distinta sí se avisa, porque es otro dato.
const CONSENSO_REAVISO=4;
function consensoDescartado(r,c){
  const d=r.consensoDescartado;
  return !!d&&d.huella===huellaEstructura(estructuraParaConsenso(c.estructura))&&
    c.respaldos<d.respaldos+CONSENSO_REAVISO;
}
async function dejarLaMia(ramoId){
  const r=(S.ramos||[]).find(x=>x.id===ramoId);
  const hit=r&&await consensoParaRamo(r);
  if(hit){
    r.consensoDescartado={huella:huellaEstructura(estructuraParaConsenso(hit.estructura)),respaldos:hit.respaldos};
    save();track('consenso_descartado');
  }
  closeModal();
  if(r&&currentRamoId===r.id)pintarConsensoDisponible(r);
}

// Que la huella difiera no basta para ofrecer una pauta ajena. En Contabilidad
// FEN (2026-10-05) se ofrecía como "otra pauta" la misma, por dos detalles:
//   · Nombres que solo cambian en un conector: "Controles Ejercicios" y
//     "Control de Ejercicios".
//   · Una pauta que solo PIERDE reglas de la nuestra: casi nadie escribe el
//     mínimo del examen, y adoptarla lo borraba sin que el aviso lo dijera.
// Si sin eso quedan iguales, no hay nada que ofrecer. Una regla que trae la
// reportada y la nuestra no tiene sí se ofrece: puede ser un dato que nos falta.
// La huella de agrupar reportes no cambia (es la del servidor); esto solo
// decide qué se le muestra al estudiante.
// Los conectores ya los ignora la huella (nombreHuella).
function nadaQueOfrecer(suya,mia){
  // Por evaluación: [peso, casillas]. Un grupo reportado como nota única donde
  // la nuestra dice cuántas son ("Controles 30%" frente a "Control 1, 2 y 3")
  // tampoco es otra pauta: trae menos detalle, no un dato distinto
  // (Contabilidad y Microeconomía FEN, 2026-10-06).
  const filas=est=>new Map(huellaEstructura((est||[]).map(e=>({...e,min:0,cap:0})))
    .split('|').filter(Boolean).map(f=>{const [clave,peso,slots]=f.split('~');return [clave,[peso,Number(slots)]];}));
  const s=filas(suya),m=filas(mia);
  if(s.size!==m.size)return false;
  for(const [clave,[peso,slots]] of s){
    const nuestra=m.get(clave);
    if(!nuestra||nuestra[0]!==peso||(slots!==nuestra[1]&&slots!==1))return false;
  }
  const reglas=est=>(est||[]).filter(e=>Number(e.peso)>0&&(e.min||e.cap))
    .map(e=>[nombreHuella(e.nombre),e.min||0,e.cap||0].join('~'));
  const mias=new Set(reglas(mia));
  return reglas(suya).every(x=>mias.has(x));
}

// Un ramo CON pauta oficial no se toca solo aunque haya consenso: el programa
// manda. Pero callarse tampoco sirve — puede que la pauta oficial sea de otro
// semestre, o que el curso la haya cambiado, y los compañeros lo sepan antes que
// nosotros. Así que se ofrece: se le muestra, dice quiénes son cuántos, y decide.
async function pintarConsensoDisponible(r){
  const el=document.getElementById('consenso-disponible');
  if(!el)return;
  el.style.display='none';el.innerHTML='';
  ++consultaPautaSugerida;
  if(!r)return;
  if(!r.categorias?.length)return pintarPautaSugerida(r,el);
  const hit=await consensoParaRamo(r);
  // El await deja pasar tiempo: si el estudiante ya se fue a otro ramo, no se
  // le pinta el aviso del anterior encima.
  if(!hit||currentRamoId!==r.id)return;
  const n=hit.respaldos;
  el.className='weight-setup-nudge';
  el.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg><div><b>${n} estudiantes de tu universidad reportan otra pauta.</b><br>Coincidieron entre ellos. No sale del programa del curso: mírala y decide tú.<div style="margin-top:8px;"><button type="button" class="rep-link" style="width:auto;padding:7px 12px;margin:0;" onclick="verConsensoDisponible('${esc(r.id)}')">Ver la que reportan</button></div></div>`;
  el.style.display='flex';
}

// Se la muestra ENTERA antes de que decida. Adoptarla le mueve el promedio, así
// que no se hace a ciegas — misma regla que verCambioDePauta().
async function verConsensoDisponible(ramoId){
  const r=(S.ramos||[]).find(x=>x.id===ramoId);if(!r)return;
  const hit=await consensoParaRamo(r);if(!hit)return;
  const pauta=pautaDeConsenso(hit.estructura);
  const fila=c=>`<li><b>${esc(c.nombre)}</b>: ${r2(c.peso)}%</li>`;
  const mias=new Set(catsDePauta(r.categorias).map(c=>normName(c.nombre)));
  const sePierden=catsDePauta(r.categorias)
    .filter(c=>!pauta.categorias.some(n=>normName(n.nombre)===normName(c.nombre)))
    .filter(c=>(c.notas||[]).some(x=>typeof x.valor==='number'));
  const aviso=sePierden.length
    ? `<p class="modal-desc" style="margin-top:10px;">${sePierden.length===1?'Una evaluación tuya':'Algunas evaluaciones tuyas'} con notas no está en esta pauta. <b>No se borran</b>: quedan en tu ficha en 0%, así no mueven tu promedio.</p>`
    : `<p class="modal-desc" style="margin-top:10px;">Tus notas se conservan: se reconocen por el nombre de la evaluación.</p>`;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">La pauta que reportan tus compañeros</div>
    <p class="modal-desc">La reportaron <b>${hit.respaldos} estudiantes</b> de tu universidad. <b>No sale del programa del curso</b>: compárala con la tuya.</p>
    <ul style="margin:10px 0 0;padding-left:18px;font-size:0.875rem;color:var(--fg2);line-height:1.6;">${pauta.categorias.map(fila).join('')}</ul>
    ${aviso}
    <div class="modal-btns" style="margin-top:16px;">
      <button type="button" class="btn-cancel" onclick="dejarLaMia('${esc(r.id)}')">Dejar la mía</button>
      <button type="button" class="btn-confirm" onclick="adoptarConsenso('${esc(r.id)}')">Usar esta</button>
    </div>`;
  openModal();
  return mias;
}

// El cambio de datos, aparte de la interfaz, para poder probarlo sin navegador.
function adoptarConsensoEnRamo(r,hit){
  const pauta=pautaDeConsenso(hit&&hit.estructura);
  if(!pauta.categorias.length)return false;
  const veniaDeSugerencia=!!r.pautaSugerida?.aceptada;
  const ids=fusionarPauta(r,pauta.categorias);
  r.gates=traducirIdsCategoria(pauta.gates,ids);
  if(veniaDeSugerencia){
    quitarProcedenciaSugerida(r);
    r.pautaHuella=huellaPauta(catsDePauta(r.categorias));
  }
  // `pautaHuella` NO se actualiza, y es a propósito. Sigue apuntando a la que
  // le dimos nosotros, así que la pauta adoptada queda distinta de esa y
  // cambioDePauta() la lee como lo que es: una decisión del estudiante, que
  // manda sobre la nuestra. Sin esto, la app le ofrecería volver a la pauta
  // oficial que acaba de descartar. Adoptar la propuesta no crea un voto
  // independiente: esa estructura ya viene de quienes la reportaron.
  // Queda marcada igual que la que se aplica sola: la ficha tiene que decir que
  // esto lo reportaron estudiantes y no un programa.
  r.consensoRespaldos=hit.respaldos;
  r.consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(r)));
  return true;
}
async function adoptarConsenso(ramoId){
  const r=(S.ramos||[]).find(x=>x.id===ramoId);if(!r)return;
  const hit=await consensoParaRamo(r);
  if(!hit||!adoptarConsensoEnRamo(r,hit))return;
  save();track('consenso_adoptado');closeModal();renderRamo();
  showToast('Pauta actualizada — tus notas se conservaron');
}

// Cuántas personas distintas tienen que reportar EXACTAMENTE la misma pauta
// para que se aplique sola. El SQL ya agrupa por (ramo, estructura, huella) y
// exige tres personas distintas —no tres reportes: quien reporta dos veces
// sigue contando como uno—, así que bajar este número no hace nada. Subirlo sí,
// y sin migrar: `respaldos` viene en cada fila del consenso.
const CONSENSO_AUTO=3;
// Con cinco personas distintas, la pauta del consenso además se ofrece como una
// del catálogo: aparece en el buscador al agregar el ramo, con cuántos la
// respaldan. Sigue sin ser oficial —la ficha lo dice— y una pauta transcrita
// del programa siempre manda sobre ella (pedido de Martín, 2026-10-06).
