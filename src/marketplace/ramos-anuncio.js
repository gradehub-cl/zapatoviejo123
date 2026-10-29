
// ─── RAMOS DE LA CLASE ──────────────────────────────────────────────────────
//
// El profesor busca el ramo por nombre o sigla en vez de escribir la sigla
// exacta. Las elegidas se guardan igual que antes, separadas por coma, en el
// campo oculto #pr-siglas: la validación y la base no cambian. La búsqueda usa
// el mismo índice sigla → nombre que el catálogo de clases.
function buscarRamosParaClase(indice,consulta,elegidas=[],max=8){
  // "cálculo 2" tiene que encontrar "Cálculo II": misma regla que el buscador
  // de ramos de la app (normBusqueda pasa romanos a números en ambos lados).
  const romanos=t=>typeof normBusqueda==='function'?normBusqueda(t):t;
  const q=romanos(normalizarBusquedaClase(consulta));
  if(!q)return [];
  const tokens=q.split(' ').filter(Boolean),ya=new Set(elegidas);
  const qSigla=q.replace(/\s+/g,'').toUpperCase();
  const out=[];
  for(const [sigla,nombre] of Object.entries(indice||{})){
    if(ya.has(sigla))continue;
    // Cada palabra escrita tiene que ser el comienzo de una palabra del ramo:
    // "2" calza con "Cálculo II" pero no con el 2 perdido dentro de MAT1492.
    const palabras=romanos(normalizarBusquedaClase(sigla+' '+nombre)).split(/[\s()\-.,]+/);
    if(!tokens.every(t=>palabras.some(w=>w.startsWith(t)))&&!sigla.startsWith(qSigla))continue;
    const n=romanos(normalizarBusquedaClase(nombre));
    out.push({sigla,nombre,rango:sigla===qSigla?0:sigla.startsWith(qSigla)?1:n.startsWith(q)?2:3});
  }
  out.sort((a,b)=>a.rango-b.rango||a.nombre.localeCompare(b.nombre,'es')||a.sigla.localeCompare(b.sigla));
  // Una sigla bien formada que no está en el índice también se puede usar: el
  // índice no es exhaustivo (UAI no publica siglas, y UC carga su catálogo
  // completo recién cuando se busca).
  if(/^[A-Z0-9-]{2,24}$/.test(qSigla)&&!/\s/.test(consulta.trim())&&!indice[qSigla]&&!ya.has(qSigla)&&/\d/.test(qSigla))
    out.push({sigla:qSigla,nombre:'Usar esta sigla',rango:9});
  return out.slice(0,max);
}

function activarBuscadorRamosClase(form,campo){
  const buscar=campo('siglas-buscar'),oculto=campo('siglas'),lista=campo('ramos-resultados'),elegidasCaja=campo('ramos-elegidos'),tenantSel=campo('tenant');
  if(!buscar||!oculto||!lista||!elegidasCaja||typeof buscar.addEventListener!=='function')return;
  let indice={};
  const leer=()=>String(oculto.value||'').split(',').map(x=>siglaAnuncio(x)).filter(Boolean);
  const escribir=siglas=>{
    oculto.value=siglas.join(', ');pintarElegidas();
    // El campo oculto no dispara eventos solo: se avisa para que la vista
    // previa muestre el ramo elegido.
    try{if(typeof Event==='function'&&oculto.dispatchEvent)oculto.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
  };
  const nombreDe=sg=>indice[sg]||'';
  const pintarElegidas=()=>{
    const siglas=leer();
    elegidasCaja.innerHTML=siglas.map(sg=>`<span class="profesor-ramo-chip"><b>${esc(sg)}</b>${nombreDe(sg)?`<span>${esc(nombreDe(sg))}</span>`:''}<button type="button" data-quitar-sigla="${esc(sg)}" aria-label="Quitar ${esc(sg)}">×</button></span>`).join('');
    elegidasCaja.querySelectorAll('[data-quitar-sigla]').forEach(b=>b.addEventListener('click',()=>escribir(leer().filter(x=>x!==b.dataset.quitarSigla))));
    // Con el máximo elegido no se reemplaza ninguno a escondidas: hay que
    // quitar uno para poner otro.
    const lleno=siglas.length>=MAX_RAMOS_POR_ANUNCIO;
    buscar.disabled=lleno;
    buscar.placeholder=lleno?'Ya elegiste dos siglas. Quita una para cambiarla.':siglas.length?'Otra sigla del mismo ramo (opcional)':'Busca por nombre o sigla, ej. Cálculo II';
  };
  const cerrar=()=>{lista.hidden=true;lista.innerHTML='';buscar.setAttribute('aria-expanded','false');};
  const mostrar=()=>{
    const res=buscarRamosParaClase(indice,buscar.value,leer());
    if(!res.length){cerrar();return;}
    lista.innerHTML=res.map((x,i)=>`<li role="option" id="pr-ramo-op-${i}" data-sigla="${esc(x.sigla)}"><b>${esc(x.sigla)}</b><span>${esc(x.nombre)}</span></li>`).join('');
    lista.hidden=false;buscar.setAttribute('aria-expanded','true');
    lista.querySelectorAll('[data-sigla]').forEach(li=>li.addEventListener('mousedown',e=>{e.preventDefault();elegir(li.dataset.sigla);}));
  };
  const elegir=sg=>{
    const actuales=leer();
    if(sg&&actuales.length===1&&actuales[0]!==sg&&!mismoRamoClase(nombreDe(actuales[0]),nombreDe(sg))){
      if(typeof showToast==='function')showToast(ERROR_DOS_RAMOS_CLASE,true);
      buscar.value='';cerrar();buscar.focus();return;
    }
    if(sg&&!actuales.includes(sg)&&actuales.length<MAX_RAMOS_POR_ANUNCIO)escribir([...actuales,sg]);
    buscar.value='';cerrar();buscar.focus();
  };
  const reindexar=()=>{indice=nombresRamosParaClases(tenantSel?tenantSel.value:S.tenant);pintarElegidas();if(buscar.value)mostrar();};
  buscar.addEventListener('input',mostrar);
  buscar.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();const primera=lista.querySelector('[data-sigla]');if(primera)elegir(primera.dataset.sigla);}
    else if(e.key==='Escape')cerrar();
  });
  buscar.addEventListener('blur',()=>setTimeout(cerrar,120));
  if(tenantSel)tenantSel.addEventListener('change',()=>{
    // Una sigla elegida para otra universidad nunca viaja a este anuncio.
    buscar.value='';cerrar();escribir([]);
    reindexar();
    if(tenantSel.value==='uc'&&typeof cargarCursosUC==='function')cargarCursosUC().then(ok=>{if(ok&&form.isConnected)reindexar();}).catch(()=>{});
  });
  reindexar();
  // El catálogo UC completo llega diferido: se busca con lo que hay y se
  // enriquece cuando termina de bajar.
  if((tenantSel?tenantSel.value:S.tenant)==='uc'&&typeof cargarCursosUC==='function')
    cargarCursosUC().then(ok=>{if(ok&&form.isConnected)reindexar();}).catch(()=>{});
}
