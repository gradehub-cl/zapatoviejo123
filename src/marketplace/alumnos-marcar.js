// ─── MARCAR EVALUACIONES POR RAMO (Lucas, 2026-11-06) ────────────────────────
// Marcar alumno por alumno no escala a 300 alumnos. Acá se ve un ramo entero:
// una fila por alumno y una columna por evaluación. Quien sigue «por fecha»
// parte con la sugerencia de esa fecha, y solo se guardan las filas cambiadas:
// abrir esta vista no cambia el método de nadie. Cada fila se guarda con la
// misma RPC de la ficha, que valida la conexión y la evaluación.
const MARCAR_EN_PARALELO=4;
const idEvaluacionMarcar=e=>e.nota_id||`${e.cat_id}#${e.numero}`;
const columnaEvaluacionMarcar=e=>`${claveEvaluacionPanel(e.categoria)}|${claveEvaluacionPanel(e.nombre)}`;
function filaMarcarPanel(al,r){
  const pre=preparacionRamoPanel(al,r);if(!pre)return null;
  const evaluaciones=(pre.evaluaciones||[]).filter(e=>!e.ambigua&&(e.nota_id||Number.isInteger(e.numero)));
  const marcas=(pre.marcas||[]).filter(m=>!m.huerfana),corte=inicioRamoPanel(al,r).dia;
  const marcada=e=>marcas.some(m=>e.nota_id?m.nota_id===e.nota_id:!m.nota_id&&m.cat_id===e.cat_id&&m.numero===e.numero);
  // La misma regla de la comparación por fecha, solo para lo que ya tiene nota.
  const sugerida=e=>typeof e.nota==='number'&&!!e.fecha&&!!corte&&e.fecha>=corte;
  const seleccion=new Set(evaluaciones.filter(pre.manual?marcada:sugerida).map(idEvaluacionMarcar));
  return {al,r,manual:!!pre.manual,evaluaciones,seleccion,original:new Set(seleccion),
    huerfanas:(pre.marcas||[]).filter(m=>m.huerfana),aceptada:false};
}
function modeloMarcarPanel(alumnos,clave){
  const filas=(alumnos||[]).flatMap(al=>conUniversidadPanel(al.tenant,()=>(al.ramos||[])
    .filter(r=>identidadResumenRamoPanel(al,ramoParaPanel(r),r).clave===clave).map(r=>filaMarcarPanel(al,r)).filter(Boolean)))
    .sort((a,b)=>String(a.al.nombre_visible||'').localeCompare(String(b.al.nombre_visible||''),'es'));
  const columnas=new Map();
  filas.forEach(f=>f.evaluaciones.forEach(e=>{
    const k=columnaEvaluacionMarcar(e),c=columnas.get(k);
    if(!c)columnas.set(k,{clave:k,nombre:e.nombre,fecha:e.fecha||null});
    else if(e.fecha&&(!c.fecha||e.fecha<c.fecha))c.fecha=e.fecha;
  }));
  return {clave,ramo:filas[0]?.r.nombre||'',filas,columnas:[...columnas.values()].sort((a,b)=>(a.fecha||'9999').localeCompare(b.fecha||'9999'))};
}
const evaluacionesDeCeldaMarcar=(f,c)=>f.evaluaciones.filter(e=>columnaEvaluacionMarcar(e)===c.clave);
const celdaMarcadaMarcar=(f,c)=>{const es=evaluacionesDeCeldaMarcar(f,c);return es.length>0&&es.every(e=>f.seleccion.has(idEvaluacionMarcar(e)));};
// Quien sigue por fecha cambia de método al guardar, así que solo cuenta si
// algo cambió o si se aceptó lo sugerido. Tocar y deshacer no lo cambia.
function filaCambiadaMarcar(f){
  if(f.aceptada&&!f.manual)return true;
  return f.seleccion.size!==f.original.size||[...f.seleccion].some(id=>!f.original.has(id));
}
function marcarCeldaPanel(f,c,valor){
  evaluacionesDeCeldaMarcar(f,c).forEach(e=>{const id=idEvaluacionMarcar(e);if(valor)f.seleccion.add(id);else f.seleccion.delete(id);});
}
const filasCambiadasMarcar=m=>m.filas.filter(filaCambiadaMarcar);
function marcasDeFilaPanel(f){
  return f.evaluaciones.filter(e=>f.seleccion.has(idEvaluacionMarcar(e))).map(e=>e.nota_id?{nota_id:e.nota_id}:{cat_id:e.cat_id,numero:e.numero}).concat(f.huerfanas);
}
// Una fila que falla no detiene a las demás y queda pendiente para reintentar.
async function guardarMarcasPanel(modelo,rpc,vigente){
  const pendientes=filasCambiadasMarcar(modelo),cola=[...pendientes];let guardadas=0;
  const trabajar=async()=>{
    for(let f=cola.shift();f&&vigente();f=cola.shift()){
      try{
        if(await guardarPreparacionPanel(f.al,f.r,marcasDeFilaPanel(f),rpc,vigente)){
          f.manual=true;f.aceptada=false;f.original=new Set(f.seleccion);guardadas++;
        }
      }catch(e){}
    }
  };
  await Promise.all(Array.from({length:MARCAR_EN_PARALELO},trabajar));
  return {guardadas,total:pendientes.length};
}
function cuentaColumnaMarcar(modelo,c){
  const con=modelo.filas.filter(f=>evaluacionesDeCeldaMarcar(f,c).length);
  return {marcadas:con.filter(f=>celdaMarcadaMarcar(f,c)).length,total:con.length};
}
function marcarRamoHTML(modelo){
  const {filas,columnas}=modelo,porFecha=filas.filter(f=>!f.manual).length;
  const cabeza=columnas.map((c,j)=>{const n=cuentaColumnaMarcar(modelo,c);
    return `<th scope="col"><label class="mr-columna"><input type="checkbox" data-marcar-columna="${j}" aria-label="Marcar ${esc(c.nombre)} para los alumnos visibles"><span><b>${esc(c.nombre)}</b><small>${c.fecha?esc(fechaCorta(c.fecha)):'Sin fecha'} · <span data-marcar-cuenta="${j}">${n.marcadas} de ${n.total}</span></small></span></label></th>`;}).join('');
  const cuerpo=filas.map((f,i)=>`<tr data-marcar-fila="${i}"><th scope="row"><b>${esc(f.al.nombre_visible)}</b><small data-marcar-metodo="${i}">${f.manual?'Marcado':'Sugerido por fecha'}</small></th>${columnas.map((c,j)=>evaluacionesDeCeldaMarcar(f,c).length
    ?`<td><label><input type="checkbox" data-marcar-celda="${i}:${j}"${celdaMarcadaMarcar(f,c)?' checked':''} aria-label="${esc(f.al.nombre_visible)}, ${esc(c.nombre)}"></label></td>`:'<td class="mr-sin" aria-label="No tiene esta evaluación">—</td>').join('')}</tr>`).join('');
  return `<div class="est mr" data-marcar>
    <button type="button" class="est-control mr-volver" data-marcar-cancelar><span aria-hidden="true">‹</span> Volver a Ramos</button>
    <header class="mr-cabeza"><div><h2>${esc(modelo.ramo)}</h2><p>Marca lo que preparaste con cada alumno. Lo que quede sin marcar cuenta como sin clases.</p></div>
      <div class="mr-acciones"><input type="search" class="est-buscar" data-marcar-buscar placeholder="Buscar alumno" aria-label="Buscar alumno" autocomplete="off">
      ${porFecha?`<button type="button" class="est-control" data-marcar-sugerido>Aceptar lo sugerido en ${porFecha} ${porFecha===1?'alumno':'alumnos'}</button>`:''}</div></header>
    <div class="est-tarjeta-grande mr-tarjeta">${filas.length&&columnas.length?`<div class="mr-tabla" tabindex="0" role="region" aria-label="Evaluaciones de ${esc(modelo.ramo)}"><table><thead><tr><th scope="col">${filas.length} ${filas.length===1?'alumno':'alumnos'}</th>${cabeza}</tr></thead><tbody>${cuerpo}</tbody></table></div>`:'<p class="profesor-hig-vacio">Este ramo todavía no tiene evaluaciones para marcar.</p>'}</div>
    <div class="mr-pie"><span role="status" data-marcar-estado>Sin cambios</span><button type="button" class="mr-guardar" data-marcar-guardar disabled>Guardar</button></div>
  </div>`;
}
function enlazarMarcarPanel(caja,modelo,{rpc,vigente,alVolver,alGuardar}){
  const raiz=caja.querySelector('[data-marcar]');if(!raiz)return;
  const estado=raiz.querySelector('[data-marcar-estado]'),guardar=raiz.querySelector('[data-marcar-guardar]');
  const visibles=()=>[...raiz.querySelectorAll('[data-marcar-fila]')].filter(tr=>!tr.hidden).map(tr=>modelo.filas[Number(tr.dataset.marcarFila)]);
  const refrescar=()=>{
    modelo.columnas.forEach((c,j)=>{
      const n=cuentaColumnaMarcar(modelo,c),texto=raiz.querySelector(`[data-marcar-cuenta="${j}"]`);if(texto)texto.textContent=`${n.marcadas} de ${n.total}`;
      const con=visibles().filter(f=>evaluacionesDeCeldaMarcar(f,c).length),marcadas=con.filter(f=>celdaMarcadaMarcar(f,c)).length,box=raiz.querySelector(`[data-marcar-columna="${j}"]`);
      if(box){box.checked=con.length>0&&marcadas===con.length;box.indeterminate=marcadas>0&&marcadas<con.length;}
    });
    modelo.filas.forEach((f,i)=>{
      modelo.columnas.forEach((c,j)=>{const b=raiz.querySelector(`[data-marcar-celda="${i}:${j}"]`);if(b)b.checked=celdaMarcadaMarcar(f,c);});
      const m=raiz.querySelector(`[data-marcar-metodo="${i}"]`);if(m)m.textContent=filaCambiadaMarcar(f)?'Sin guardar':f.manual?'Marcado':'Sugerido por fecha';
    });
    const n=filasCambiadasMarcar(modelo).length;
    estado.textContent=n?`${n} ${n===1?'alumno':'alumnos'} con cambios`:'Sin cambios';
    guardar.disabled=!n;
  };
  raiz.addEventListener('change',e=>{
    const d=e.target?.dataset;if(!d||!vigente())return;
    if(d.marcarCelda){const [i,j]=d.marcarCelda.split(':').map(Number);marcarCeldaPanel(modelo.filas[i],modelo.columnas[j],e.target.checked);refrescar();}
    else if(d.marcarColumna){const c=modelo.columnas[Number(d.marcarColumna)];visibles().filter(f=>evaluacionesDeCeldaMarcar(f,c).length).forEach(f=>marcarCeldaPanel(f,c,e.target.checked));refrescar();}
  });
  raiz.querySelector('[data-marcar-buscar]')?.addEventListener('input',e=>{
    const q=claveEvaluacionPanel(e.target.value);
    raiz.querySelectorAll('[data-marcar-fila]').forEach(tr=>{tr.hidden=!!q&&!(claveEvaluacionPanel(modelo.filas[Number(tr.dataset.marcarFila)].al.nombre_visible)||'').includes(q);});
    refrescar();
  });
  raiz.querySelector('[data-marcar-sugerido]')?.addEventListener('click',()=>{if(!vigente())return;visibles().filter(f=>!f.manual).forEach(f=>{f.aceptada=true;});refrescar();});
  raiz.querySelector('[data-marcar-cancelar]')?.addEventListener('click',alVolver);
  guardar.addEventListener('click',async()=>{
    if(guardar.disabled||!vigente())return;
    guardar.disabled=true;estado.textContent='Guardando…';
    const r=await guardarMarcasPanel(modelo,rpc,vigente);
    if(!vigente())return;
    refrescar();
    if(r.guardadas===r.total){showToast(`Guardamos las marcas de ${r.guardadas} ${r.guardadas===1?'alumno':'alumnos'}.`);alGuardar();}
    else estado.textContent=`Guardamos ${r.guardadas} de ${r.total}. Los demás siguen sin guardar: reintenta.`;
  });
  refrescar();
}
