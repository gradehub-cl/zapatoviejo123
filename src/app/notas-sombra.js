// Hipótesis de la ficha: nunca se incorporan a S, al guardado ni al simulador.
let sesionNotasSombra={estado:null,ramos:new Map()};
// Preferencia del dispositivo, separada de S y de las fijaciones de sesión.
let mostrarNotasSombra=(()=>{try{return localStorage.getItem('gradehub_sombras')!=='0';}catch{return true;}})();
function sombrasActivadas(){return mostrarNotasSombra;}
function cambiarSombras(activadas){
  mostrarNotasSombra=!!activadas;
  try{localStorage.setItem('gradehub_sombras',mostrarNotasSombra?'1':'0');}catch{}
  renderRamo();
  document.getElementById('sombras-activadas')?.focus({preventScroll:true});
}
function interruptorSombrasHTML(modelo,enExamen=false){
  return modelo?`<label class="sombras-interruptor${enExamen?' sombras-interruptor-examen':''}" for="sombras-activadas"><span>Notas sombra</span><input id="sombras-activadas" type="checkbox" role="switch"${sombrasActivadas()?' checked':''} onchange="cambiarSombras(this.checked)"></label>`:'';
}
function pintarInterruptorSombras(modelo){
  document.querySelectorAll('.sombras-interruptor').forEach(el=>el.remove());
  if(!modelo)return;
  const ramo=S.ramos.find(r=>r.id===currentRamoId);
  const examenes=new Set((ramo?.categorias||[]).filter(esExamenSombra).map(c=>c.id));
  const examen=[...document.querySelectorAll('#cat-list [data-ficha-categoria]')].find(el=>examenes.has(el.dataset.fichaCategoria));
  if(examen){
    // La fila permanece aunque se apaguen las sombras o se cierre el slider.
    // En un grupo colapsable va antes del cuerpo, nunca dentro de lo ocultable.
    const antes=examen.querySelector('.sombra-panel,.eval-group-body');
    const html=interruptorSombrasHTML(modelo,true);
    if(antes)antes.insertAdjacentHTML('beforebegin',html);else examen.insertAdjacentHTML('beforeend',html);
    return;
  }
  // Hay pautas sin examen: conservan el control junto a la meta.
  const chip=document.getElementById('ramo-min-chip');if(!chip)return;
  chip.style.display='inline-flex';chip.innerHTML+=interruptorSombrasHTML(modelo);
}

const claveNotaSombra=(catId,slot)=>JSON.stringify([catId,slot]);
const textoNotaSombra=v=>Number(v).toFixed(1).replace('.',',');
// Lucas, 2026-11-03: el «¿cuánto crees que sacas?» queda solo en el examen. En las
// demás la sombra se muestra igual, pero tocarla abre directo la nota real.
const esExamenSombra=p=>/examen/i.test(p.nombre);

function proyectarNotasSombra(r,pendientes,valores){
  return {...r,categorias:r.categorias.map(c=>{
    const notas=(c.notas||[]).map(n=>({...n}));
    pendientes.filter(p=>p.catId===c.id&&valores.has(p.clave)).forEach(p=>{
      const i=p.slot===null?(notas.length?0:-1):notas.findIndex(n=>n.slot===p.slot);
      const previa=i<0?{}:notas[i];
      const nota={...previa,id:previa.id||'sombra:'+p.clave,nombre:previa.nombre||p.nombre,valor:valores.get(p.clave),peso:previa.peso||1,...(p.slot===null?{}:{slot:p.slot})};
      if(i<0)notas.push(nota);else notas[i]=nota;
    });
    return {...c,notas};
  })};
}

// El motor resuelve cada escenario. Aquí solo se eligen qué casillas quedan
// libres o en su mínimo: no se calcula a mano ningún promedio ni ponderación.
function modeloNotasSombra(r,fijas=new Map()){
  if(!r||esCuentaProfesor()||!r.categorias?.length||Number.isFinite(r.avgOverride))return null;
  if(notaNecesariaCondicional(r)||partesDelVinculo(r)||r.reemplazosOptativos?.length||r.recuperativo||estadoEximicion(r)||r.ausenciasJustificadas?.length)return null;
  const cats=categoriasVigentes(r),reglas=gh_reglasNota(S.tenant),minimo=reglas.grade_scale.min,maximo=reglas.grade_scale.max,meta=reglas.passing_grade;
  if(Math.abs(cats.reduce((s,c)=>s+(Number(c.peso)||0),0)-100)>.05)return null;
  // Cantidad abierta, casillas extra/ambiguas y compuertas de grupo se quedan
  // como hoy. Una cifra en una casilla que no representa el motor sería falsa.
  if(cats.some(c=>!c.id||c.optativa||!c.directNota||(!(c.slots>1)&&(c.notas||[]).length>1)))return null;
  if(cats.some(c=>c.slots>1&&(c.notas||[]).some((n,i,ns)=>!Number.isInteger(n.slot)||n.slot<0||n.slot>=c.slots||ns.some((o,j)=>j<i&&o.slot===n.slot))))return null;
  const gates=r.gates||[];
  if(!gates.length&&reglas.examenFinal)return null; // mínimo institucional implícito: fuera de fase 1
  if(gates.some(g=>g.type!=='min_grade_required'||!Number.isFinite(g.min)||g.min>maximo||!cats.some(c=>c.id===g.catId&&!(c.slots>1))))return null;
  const pendientes=[];
  for(const c of cats){
    if(!(c.peso>0))continue;
    const min=Math.max(minimo,...gates.filter(g=>g.catId===c.id).map(g=>Number(nfNecesaria(g.min))));
    if(c.slots>1){
      hojasCategoria(c).forEach(h=>{
        const n=(c.notas||[]).find(n=>n.id===h.id);
        if(!Number.isFinite(n?.valor))pendientes.push({clave:claveNotaSombra(c.id,h.slot),catId:c.id,slot:h.slot,nombre:nombreCasilla(r,c,h.slot),minimo:min});
      });
    }else if(!Number.isFinite(c.notas?.[0]?.valor))pendientes.push({clave:claveNotaSombra(c.id,null),catId:c.id,slot:null,nombre:c.nombre,minimo:min});
  }
  if(!pendientes.length)return null;
  if(cats.some(c=>c.dropLowest&&pendientes.some(p=>p.catId===c.id)))return null;
  const fijadas=new Map();
  pendientes.forEach(p=>{const v=fijas.get(p.clave);if(Number.isFinite(v))fijadas.set(p.clave,Math.max(p.minimo,Math.min(maximo,Math.round(v*10)/10)));});
  const finales=valores=>notaFinalOficial(ramoAvg(proyectarNotasSombra(r,pendientes,valores)));
  const base={pendientes,fijas:fijadas,minimo,maximo,meta};
  if(fijadas.size===pendientes.length)return {...base,auto:new Map(),libres:[],necesaria:null,estado:'cerrado',final:finales(fijadas)};
  const auto=new Map(pendientes.filter(p=>!fijadas.has(p.clave)&&p.minimo>minimo).map(p=>[p.clave,p.minimo]));
  let libres,necesaria;
  // Soltar el mínimo menor de a uno evita pedir más de la cuenta en las otras
  // cuando hay varias evaluaciones con pisos distintos.
  for(let vuelta=0;vuelta<=pendientes.length;vuelta++){
    libres=pendientes.filter(p=>!fijadas.has(p.clave)&&!auto.has(p.clave));
    const menor=[...auto].sort((a,b)=>a[1]-b[1])[0];
    if(!libres.length&&menor){auto.delete(menor[0]);continue;}
    necesaria=notaNecesaria(proyectarNotasSombra(r,pendientes,new Map([...fijadas,...auto])),meta);
    if(!Number.isFinite(necesaria))return null;
    if(menor&&necesaria>=menor[1]-1e-9){auto.delete(menor[0]);continue;}
    break;
  }
  const valor=Math.max(minimo,Number(nfNecesaria(necesaria)));
  const estado=valor>maximo?'no':valor<=minimo&&!auto.size?'ya':'ok';
  if(estado!=='no'){
    const todas=new Map([...fijadas,...auto,...libres.map(p=>[p.clave,valor])]);
    // Comprobación final con la pauta completa, sus compuertas y su redondeo.
    // Si no coincide con la meta del motor, esta fase no ofrece una sombra.
    if(finales(todas)<meta)return null;
    const anterior=Math.round((valor-.1)*10)/10;
    if(libres.every(p=>anterior>=p.minimo)&&finales(new Map([...fijadas,...auto,...libres.map(p=>[p.clave,anterior])]))>=meta)return null;
  }
  return {...base,auto,libres,necesaria:valor,estado,final:null};
}

function notasSombraDelRamo(r){
  if(sesionNotasSombra.estado!==S)sesionNotasSombra={estado:S,ramos:new Map()};
  if(!sesionNotasSombra.ramos.has(r.id))sesionNotasSombra.ramos.set(r.id,{fijas:new Map(),abierta:null,iniciada:false});
  const sesion=sesionNotasSombra.ramos.get(r.id),modelo=modeloNotasSombra(r,sesion.fijas);
  const claves=new Set(modelo?.pendientes.map(p=>p.clave)||[]);
  for(const clave of sesion.fijas.keys())if(!claves.has(clave))sesion.fijas.delete(clave);
  if(sesion.abierta&&!claves.has(sesion.abierta))sesion.abierta=null;
  if(modelo&&!sesion.iniciada){sesion.abierta=modelo.pendientes.find(esExamenSombra)?.clave||null;sesion.iniciada=true;}
  return modelo?{...modelo,sesion}:null;
}
function valorNotaSombra(m,p){return m.fijas.get(p.clave)??m.auto.get(p.clave)??(m.estado==='no'?null:m.necesaria);}
function botonNotaSombraHTML(m,p){
  const v=valorNotaSombra(m,p),fija=m.fijas.has(p.clave),texto=v===null?'no alcanza':textoNotaSombra(v);
  const label=`${p.nombre}: ${fija?'fijaste':v===null?'ni con '+textoNotaSombra(m.maximo)+' alcanza; necesitas':'necesitas'} ${texto}. Toca para ${esExamenSombra(p)?'fijar o ':''}anotar la nota real`;
  return `<button type="button" class="nota-en-fila nota-sombra${fija?' sombra-fija':''}" data-cat-id="${esc(p.catId)}"${p.slot===null?'':` data-slot="${p.slot}"`} data-sombra-clave="${esc(p.clave)}" data-sombra-nombre="${esc(p.nombre)}" data-sombra-valor="${v===null?'':texto}" aria-label="${esc(label)}"${esExamenSombra(p)?` aria-expanded="${m.sesion.abierta===p.clave}"`:''} onclick="event.stopPropagation();abrirSombraEnFila(this)">${texto}</button>`;
}
function abrirSombraEnFila(boton){
  if(!sombrasActivadas())return;
  const r=S.ramos.find(r=>r.id===currentRamoId),m=r&&notasSombraDelRamo(r);if(!m)return;
  const clave=boton.dataset.sombraClave,p=m.pendientes.find(p=>p.clave===clave);
  if(!p||!esExamenSombra(p)){abrirNotaEnFila(boton);return;}
  m.sesion.abierta=clave;renderRamo();
  const nuevo=[...document.querySelectorAll('#cat-list [data-sombra-clave]')].find(b=>b.dataset.sombraClave===clave);
  if(nuevo)abrirNotaEnFila(nuevo);
}
function textoEstadoSombra(m,p){
  const v=p&&m.fijas.get(p.clave),lugar=p&&(esExamenSombra(p)?'en el examen':'en '+p.nombre);
  if(m.estado==='cerrado')return `Terminas con ${textoNotaSombra(m.final)}. Con las notas que fijaste.`;
  if(m.estado==='no')return `${m.fijas.size?'Con lo que fijaste, ni':'Ni'} con ${textoNotaSombra(m.maximo)} en lo demás alcanza.`;
  if(m.estado==='ya')return m.fijas.size?`Con lo que fijaste ya alcanza, aunque saques ${textoNotaSombra(m.minimo)} en lo demás.`:`Ya aprobaste, aunque saques ${textoNotaSombra(m.minimo)} en lo que queda.`;
  if(v!==undefined&&m.fijas.size===1)return `Si sacas ${textoNotaSombra(v)} ${lugar}, necesitas ${textoNotaSombra(m.necesaria)} en ${m.libres.length===1?'la otra':'cada una de las otras'}.`;
  return `${m.fijas.size?'Con las notas que fijaste, necesitas':'Necesitas'} ${textoNotaSombra(m.necesaria)} en ${m.auto.size||m.fijas.size?'las otras evaluaciones pendientes':'cada evaluación pendiente'}.`;
}
function panelNotaSombraHTML(m,p){
  const id='sombra-rango',valor=valorNotaSombra(m,p)??m.maximo,pregunta='¿Cuánto quieres necesitar en el examen?';
  const corte=(p.minimo-m.minimo)/(m.maximo-m.minimo)*100;
  return `<div class="sombra-panel" data-sombra-panel="${esc(p.clave)}">
    <div class="sombra-pregunta"><label for="${id}">${esc(pregunta)}</label><output class="sombra-valor" for="${id}">${textoNotaSombra(valor)}</output></div>
    <div class="sombra-control"><button type="button" data-sombra-menos onclick="pasoNotaSombra(this,-1)" aria-label="Bajar una décima">−</button>
      <div class="sombra-riel"><input id="${id}" type="range" min="${p.minimo}" max="${m.maximo}" step="0.1" value="${Math.max(p.minimo,valor)}" aria-valuetext="${textoNotaSombra(valor)}" oninput="fijarNotaSombra(this)" style="left:${corte}%;width:${100-corte}%"/></div>
      <button type="button" data-sombra-mas onclick="pasoNotaSombra(this,1)" aria-label="Subir una décima">+</button></div>
    <div class="sombra-marcas" aria-hidden="true"><span>${textoNotaSombra(m.minimo)}</span><i style="left:${p.minimo>m.minimo?corte:((m.meta-m.minimo)/(m.maximo-m.minimo)*100)}%">${p.minimo>m.minimo?'mín. '+textoNotaSombra(p.minimo):textoNotaSombra(m.meta)}</i><span>${textoNotaSombra(m.maximo)}</span></div>
    <p class="sombra-lectura"></p><button type="button" class="sombra-soltar" onclick="soltarNotaSombra(this)"${m.fijas.has(p.clave)?'':' hidden'}>Volver a lo que necesito</button>
  </div>`;
}
function pintarMetaNotasSombra(m){
  const chip=document.getElementById('ramo-min-chip');if(!chip)return;
  chip.style.display='inline-flex';chip.className='ramo-chip ramo-meta';
  chip.setAttribute('data-sombra-meta',m.necesaria===null?'':textoNotaSombra(m.necesaria));
  if(m.estado==='cerrado')chip.textContent=`Terminas con ${textoNotaSombra(m.final)}`;
  else if(m.estado==='ya')chip.textContent=m.fijas.size?'Con lo fijado ya alcanza':`Ya aprobaste · aunque saques ${textoNotaSombra(m.minimo)}`;
  // La ficha ya no tiene medidor (#977): buscar sus piezas lanzaba un error que
  // cortaba el repintado del slider y, con un examen en su mínimo, la ficha.
  else chip.innerHTML=medidorFichaHTML(m.estado==='no'?Infinity:m.necesaria,'',false,m.fijas.size||m.auto.size?'en las otras pendientes':'en lo pendiente');
  pintarInterruptorSombras(m);
}
function pintarValoresNotasSombra(r,m){
  pintarMetaNotasSombra(m);
  const cl=document.getElementById('cat-list');
  cl.querySelectorAll('button[data-sombra-clave]').forEach(b=>{
    const p=m.pendientes.find(p=>p.clave===b.dataset.sombraClave);if(!p)return;
    const plantilla=document.createElement('template');plantilla.innerHTML=botonNotaSombraHTML(m,p);const nuevo=plantilla.content.firstElementChild;
    b.textContent=nuevo.textContent;b.className=nuevo.className;
    for(const a of nuevo.attributes)b.setAttribute(a.name,a.value);
  });
  const panel=cl.querySelector('.sombra-panel'),p=panel&&m.pendientes.find(p=>p.clave===panel.dataset.sombraPanel);
  if(panel&&p){
    const v=Math.max(p.minimo,valorNotaSombra(m,p)??m.maximo),color=getColor(v),corte=(p.minimo-m.minimo)/(m.maximo-m.minimo)*100,pct=(v-m.minimo)/(m.maximo-m.minimo)*100;
    panel.style.setProperty('--sombra-color',color);
    panel.style.setProperty('--sombra-corte',corte+'%');panel.style.setProperty('--sombra-pct',pct+'%');
    const rango=panel.querySelector('input');rango.value=v;rango.setAttribute('aria-valuetext',textoNotaSombra(v));
    panel.querySelector('output').textContent=textoNotaSombra(v);
    panel.querySelector('[data-sombra-menos]').disabled=v<=p.minimo;
    panel.querySelector('[data-sombra-mas]').disabled=v>=m.maximo;
    panel.querySelector('.sombra-soltar').hidden=!m.fijas.has(p.clave);
    panel.querySelector('.sombra-lectura').textContent=textoEstadoSombra(m,p);
  }
  const pie=cl.querySelector('.sombra-resumen');
  if(pie){
    const minimos=[...m.auto].map(([clave,v])=>{const p=m.pendientes.find(p=>p.clave===clave);return `${esExamenSombra(p)?'El examen':p.nombre} queda en ${textoNotaSombra(v)} porque es su mínimo: aunque te sobre, tienes que pasarlo.`;});
    pie.hidden=!minimos.length&&!m.fijas.size&&m.estado==='ok';
    pie.textContent=[m.estado==='ok'&&!m.fijas.size?'':textoEstadoSombra(m),...minimos].filter(Boolean).join(' ');
  }
}
function montarNotasSombra(r,m,cl){
  if(!m||!sombrasActivadas()){document.getElementById('ramo-min-chip')?.removeAttribute('data-sombra-meta');return;}
  const b=[...cl.querySelectorAll('button[data-sombra-clave]')].find(b=>b.dataset.sombraClave===m.sesion.abierta);
  const p=b&&m.pendientes.find(p=>p.clave===m.sesion.abierta);
  if(p&&esExamenSombra(p)){const fila=b.closest('.eval-sub,.eval-row');fila.classList.add('sombra-abierta');fila.insertAdjacentHTML('beforeend',panelNotaSombraHTML(m,p));}
  const pie=document.createElement('div');pie.className='stat-card sombra-resumen';pie.setAttribute('role','status');pie.hidden=true;cl.appendChild(pie);
  pintarValoresNotasSombra(r,m);
}
function cambiarNotaSombra(panel,valor,soltar=false){
  if(!sombrasActivadas())return;
  if(!soltar&&!Number.isFinite(valor))return;
  const r=S.ramos.find(r=>r.id===currentRamoId),m=r&&notasSombraDelRamo(r),p=m&&m.pendientes.find(p=>p.clave===panel.dataset.sombraPanel);if(!p)return;
  if(soltar)m.sesion.fijas.delete(p.clave);
  else m.sesion.fijas.set(p.clave,Math.max(p.minimo,Math.min(m.maximo,Math.round(valor*10)/10)));
  const actualizado=notasSombraDelRamo(r);
  if(actualizado)pintarValoresNotasSombra(r,actualizado);else renderRamo();
}
function fijarNotaSombra(input){cambiarNotaSombra(input.closest('.sombra-panel'),Number(input.value));}
function pasoNotaSombra(boton,paso){const panel=boton.closest('.sombra-panel');cambiarNotaSombra(panel,Number(panel.querySelector('input').value)+paso/10);}
function soltarNotaSombra(boton){const panel=boton.closest('.sombra-panel');cambiarNotaSombra(panel,0,true);panel.querySelector('input')?.focus({preventScroll:true});}
