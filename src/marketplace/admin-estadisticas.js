// ─── Gráficos de Estadísticas ──────────────────────────────────────────────
// HIG, Charts y Charting data: un título que dice qué se mide, un resumen con
// la cifra que importa, una sola serie desde cero y los números también en
// texto, para que VoiceOver no dependa del dibujo. Son HTML y no SVG para que
// el texto crezca con el tamaño que eligió la persona. El color es el acento,
// nunca el semáforo: nada de esto es una nota.
const fechaCortaAdmin=d=>new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'});
const fechaLargaAdmin=d=>new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long'});
// Un tope redondo para el eje y con mitad también redonda: 0 · 30 · 60.
function topeEjeAdmin(max){
  if(!(max>0))return 0;
  const p=10**Math.floor(Math.log10(max));
  return [1,2,4,6,8,10].map(m=>m*p).find(t=>t>=max&&(t/2)%1===0)||10*p;
}
// «+30 (+12%) vs. semana del 6 oct». Con valores, no adjetivos (HIG, Charts).
function variacionAdmin(actual,anterior,contra){
  if(!(anterior>0))return '';
  const d=actual-anterior,pct=Math.round(100*d/anterior);
  return d?`${d>0?'+':'−'}${milesViz(Math.abs(d))} (${d>0?'+':'−'}${Math.abs(pct)}%) vs. ${contra}`:`Igual que ${contra}`;
}
function kpiAdminHTML(titulo,valor,detalle,porcentaje=null){
  const circular=porcentaje!==null&&porcentaje!==undefined&&Number.isFinite(Number(porcentaje))&&porcentaje>=0&&porcentaje<=100;
  return `<div class="dato-kpi${circular?' dato-kpi-circular':''}"><span>${esc(titulo)}</span>${circular?datoCircularHTML(porcentaje,valor,`${titulo}: ${valor}. ${detalle||''}`):`<strong>${esc(valor)}</strong>`}<p>${esc(detalle||'')}</p></div>`;
}
// puntos: [{eje, lectura, valor, tenue}] de lo antiguo a lo nuevo. La columna
// elegida va con el acento lleno y su lectura arriba; tocar o pasar el dedo
// por el área entera elige otra (enlazarGraficosAdmin).
function columnasAdminHTML({titulo,resumen,vacio,puntos,elegido=puntos.length-1,formato=milesViz,tabla=null,dondeValores='en la tabla'}){
  const tope=topeEjeAdmin(Math.max(0,...puntos.map(p=>p.valor)));
  const cabeza=`<figcaption><b>${esc(titulo)}</b>${resumen?`<span>${esc(resumen)}</span>`:''}</figcaption>`;
  if(!tope)return `<figure class="viz admin-grafico">${cabeza}<p class="clase-sin-datos">${esc(vacio)}</p></figure>`;
  return `<figure class="viz admin-grafico" data-admin-grafico>${cabeza}
    <p class="admin-grafico-lectura" data-admin-lectura aria-hidden="true">${esc(puntos[elegido].lectura)}</p>
    <div class="admin-grafico-area" role="img" aria-label="${esc(`${titulo}, gráfico de columnas. ${resumen||''} Los valores están ${dondeValores}.`)}">
      <div class="admin-grafico-guias">${[tope,tope/2,0].map(m=>`<span><i>${esc(formato(m))}</i></span>`).join('')}</div>
      <div class="admin-grafico-columnas">${puntos.map((p,i)=>`<span data-admin-col data-lectura="${esc(p.lectura)}"${i===elegido?' data-elegida':''}${p.tenue?' data-tenue':''}><i style="height:${(100*p.valor/tope).toFixed(1)}%"></i></span>`).join('')}</div>
    </div>
    <div class="viz-eje admin-grafico-eje" aria-hidden="true"><span>${esc(puntos[0].eje)}</span><span>${esc(puntos[puntos.length-1].eje)}</span></div>
    ${tabla?`<details class="admin-grafico-tabla"><summary>Ver como tabla</summary><div><table>
      <thead><tr>${tabla.columnas.map((c,i)=>`<th scope="col"${i?' class="num"':''}>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${tabla.filas.map(f=>`<tr>${f.map((c,i)=>i?`<td class="num">${esc(c)}</td>`:`<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:''}
  </figure>`;
}
// Partes de un total, de mayor a menor, con su número escrito al lado.
function barrasAdminHTML({titulo,resumen,filas}){
  const max=Math.max(1,...filas.map(f=>f.valor));
  return `<figure class="viz admin-grafico"><figcaption><b>${esc(titulo)}</b>${resumen?`<span>${esc(resumen)}</span>`:''}</figcaption>
    <div class="admin-grafico-barras">${filas.map(f=>`<div class="clase-embudo-fila"><span>${esc(f.nombre)}</span><div class="clase-barra" aria-hidden="true"><i style="transform:scaleX(${(f.valor/max).toFixed(3)})"></i></div><b>${esc(f.texto??milesViz(f.valor))}</b></div>`).join('')}</div>
  </figure>`;
}
// La semana en curso no está cerrada: no se compara ni se destaca.
const semanaEnCursoAdmin=(f,ahora)=>Date.parse(String(f.semana).slice(0,10)+'T00:00:00-03:00')+7*864e5>ahora;
function graficosCrecimientoAdminHTML(semanas,ahora){
  const cifra=v=>Number.isFinite(Number(v))?Number(v):0;
  const i=semanas.findIndex(f=>!semanaEnCursoAdmin(f,ahora));
  const cerrada=semanas[i],anterior=semanas[i+1],enCurso=i>0?semanas[0]:null;
  const contra=anterior?`semana del ${fechaCortaAdmin(anterior.semana)}`:'';
  const kpis=cerrada?[
    kpiAdminHTML('Activas',milesViz(cifra(cerrada.activas)),`Semana del ${fechaCortaAdmin(cerrada.semana)}${anterior?' · '+variacionAdmin(cifra(cerrada.activas),cifra(anterior.activas),contra):''}`),
    kpiAdminHTML('Nuevas',milesViz(cifra(cerrada.nuevas)),anterior?variacionAdmin(cifra(cerrada.nuevas),cifra(anterior.nuevas),contra)||'Cuentas creadas esa semana':'Cuentas creadas esa semana'),
    kpiAdminHTML('Volvieron',cerrada.pct_vuelven!=null?`${Number(cerrada.pct_vuelven).toLocaleString('es-CL')}%`:'—',anterior?`${milesViz(cifra(cerrada.vuelven))} de ${milesViz(cifra(anterior.activas))} activas la semana anterior`:'Sin semana anterior para comparar',cerrada.pct_vuelven),
    enCurso?kpiAdminHTML('Esta semana',milesViz(cifra(enCurso.activas)),'Activas hasta hoy · semana en curso'):''].join(''):'';
  const serie=clave=>semanas.slice().reverse().map(f=>({eje:fechaCortaAdmin(f.semana),valor:cifra(f[clave]),tenue:semanaEnCursoAdmin(f,ahora),
    lectura:`Semana del ${fechaLargaAdmin(f.semana)}${semanaEnCursoAdmin(f,ahora)?' (en curso)':''} · ${milesViz(cifra(f[clave]))} ${clave==='activas'?'activas':'nuevas'}`}));
  const elegido=Math.max(0,semanas.length-1-Math.max(i,0));
  return `${kpis?`<div class="admin-hig-resumen admin-pulso" aria-label="Resumen de la última semana cerrada">${kpis}</div>`:''}
    <div class="admin-graficos">
      ${columnasAdminHTML({titulo:'Cuentas activas por semana',resumen:'Abrieron la app al menos un día de la semana.',vacio:'Todavía no hay visitas registradas.',puntos:serie('activas'),elegido,dondeValores:'en el detalle por semana'})}
      ${columnasAdminHTML({titulo:'Cuentas nuevas por semana',resumen:'Se crearon esa semana, estudiantes y profesores.',vacio:'Todavía no hay cuentas nuevas en estas semanas.',puntos:serie('nuevas'),elegido,dondeValores:'en el detalle por semana'})}
    </div>`;
}
// Lo de clases particulares: alcance de los anuncios (admin_estadisticas.sql),
// cobros por mes y anuncios por estado. Sale de lo que el panel ya cargó,
// salvo el alcance diario; sin ese SQL, se explica qué falta y lo demás sigue.
function clasesEstadisticasAdminHTML(profesores,alcance,ahora=Date.now()){
  const pesos=pesosClase,partes=[];
  let kpis='';
  if(Array.isArray(alcance)&&alcance.length){
    const n=v=>Number(v)||0,suma=k=>alcance.reduce((t,d)=>t+n(d[k]),0);
    const vieron=suma('vieron'),abrieron=suma('abrieron'),contactaron=suma('contactaron');
    kpis=[kpiAdminHTML('Vieron un anuncio',milesViz(vieron),'Cuentas distintas por campaña · 30 días'),
      kpiAdminHTML('Lo abrieron',milesViz(abrieron),`${pctViz(abrieron,vieron)} de las que lo vieron`),
      kpiAdminHTML('Contactaron',milesViz(contactaron),`${pctViz(contactaron,vieron)} de las que lo vieron`),
      kpiAdminHTML('De abrir a contactar',pctViz(contactaron,abrieron),'Contactaron de las que lo abrieron',abrieron?100*contactaron/abrieron:null)].join('');
    const mejor=alcance.reduce((m,d)=>n(d.vieron)>n(m.vieron)?d:m,alcance[0]);
    partes.push(columnasAdminHTML({titulo:'Alcance por día',vacio:'Ningún anuncio se ha mostrado en los últimos 30 días.',
      resumen:vieron?`${milesViz(vieron)} en 30 días; el día con más fue el ${fechaLargaAdmin(mejor.dia)}, con ${milesViz(n(mejor.vieron))}.`:'',
      puntos:alcance.map(d=>({eje:fechaCortaAdmin(d.dia),valor:n(d.vieron),lectura:`${fechaLargaAdmin(d.dia)} · ${milesViz(n(d.vieron))} vieron · ${milesViz(n(d.abrieron))} abrieron · ${milesViz(n(d.contactaron))} contactaron`})),
      tabla:{columnas:['Día','Vieron','Abrieron','Contactaron'],filas:alcance.slice().reverse().map(d=>[fechaLargaAdmin(d.dia),milesViz(n(d.vieron)),milesViz(n(d.abrieron)),milesViz(n(d.contactaron))])}}));
    partes.push(barrasAdminHTML({titulo:'De ver a contactar',resumen:'Últimos 30 días, todos los anuncios.',filas:[
      {nombre:'Vieron',valor:vieron},{nombre:'Abrieron',valor:abrieron,texto:`${milesViz(abrieron)} · ${pctViz(abrieron,vieron)}`},
      {nombre:'Contactaron',valor:contactaron,texto:`${milesViz(contactaron)} · ${pctViz(contactaron,vieron)}`}]}));
  }
  // Cobros por el mes en que se publicó la campaña, los últimos seis.
  const hoy=new Date(ahora),meses=[];
  for(let k=5;k>=0;k--){const m=new Date(hoy.getFullYear(),hoy.getMonth()-k,1);meses.push({anio:m.getFullYear(),mes:m.getMonth(),fecha:m,cobrado:0,deuda:0});}
  for(const p of profesores||[])for(const a of p.anuncios||[])
    for(const c of Array.isArray(a.cobros)?a.cobros:(a.cobro?[{...a.cobro,publicado_at:a.publicado_at}]:[])){
      const f=new Date(c.publicado_at),m=meses.find(x=>x.anio===f.getFullYear()&&x.mes===f.getMonth());
      if(m&&(c.estado==='cobrado'||c.estado==='deuda'))m[c.estado]+=Number(c.monto_clp)||0;
    }
  const nombreMes=(m,o)=>{const t=m.fecha.toLocaleDateString('es-CL',o);return t.charAt(0).toUpperCase()+t.slice(1);};
  const cobrado=meses.reduce((t,m)=>t+m.cobrado,0),deuda=meses.reduce((t,m)=>t+m.deuda,0);
  partes.push(columnasAdminHTML({titulo:'Cobrado por mes',formato:pesos,vacio:'Todavía no hay cobros registrados en los últimos seis meses.',
    resumen:`${pesos(cobrado)} cobrados en seis meses${deuda?` · ${pesos(deuda)} en deuda`:''}. Cuenta el mes en que se publicó cada campaña.`,
    puntos:meses.map(m=>({eje:nombreMes(m,{month:'short'}),valor:m.cobrado,lectura:`${nombreMes(m,{month:'long',year:'numeric'})} · ${pesos(m.cobrado)} cobrado${m.deuda?` · ${pesos(m.deuda)} en deuda`:''}`})),
    tabla:{columnas:['Mes','Cobrado','En deuda'],filas:meses.slice().reverse().map(m=>[nombreMes(m,{month:'long',year:'numeric'}),pesos(m.cobrado),pesos(m.deuda)])}}));
  const porEstado=new Map();
  filasAdminHig(profesores,ahora).filter(f=>f.a.estado!=='eliminado').forEach(f=>porEstado.set(f.estado[0],(porEstado.get(f.estado[0])||0)+1));
  const total=[...porEstado.values()].reduce((t,v)=>t+v,0);
  if(total)partes.push(barrasAdminHTML({titulo:'Anuncios por estado',resumen:`${milesViz(total)} ${total===1?'anuncio':'anuncios'} en total.`,
    filas:[...porEstado].sort((x,y)=>y[1]-x[1]).map(([nombre,valor])=>({nombre,valor}))}));
  return `<section class="admin-clases-estadisticas" aria-labelledby="admin-clases-estadisticas-titulo"><h3 id="admin-clases-estadisticas-titulo">Clases particulares</h3>
    <p>Últimos 30 días · cuentas por campaña</p>
    ${kpis?`<div class="admin-hig-resumen admin-pulso admin-pulso-alcance" aria-label="Resumen de los últimos 30 días">${kpis}</div>`:''}
    ${Array.isArray(alcance)?'':'<p class="admin-hig-nota" role="status">El alcance por día aparece al aplicar supabase/admin_estadisticas.sql.</p>'}
    <div class="admin-graficos">${partes.join('')}</div></section>`;
}
// Tocar o arrastrar por el gráfico elige la columna más cercana; con el mouse,
// al salir vuelve a la que estaba. No hace falta para leer nada: la lectura
// inicial y la tabla ya dicen lo importante (HIG, Charts).
function enlazarGraficosAdmin(raiz){
  raiz.querySelectorAll('[data-admin-grafico]').forEach(fig=>{
    const area=fig.querySelector('.admin-grafico-area'),fila=fig.querySelector('.admin-grafico-columnas'),lectura=fig.querySelector('[data-admin-lectura]');
    const cols=[...fig.querySelectorAll('[data-admin-col]')];
    if(!area||!fila||!lectura||!cols.length)return;
    const inicial=Math.max(0,cols.findIndex(c=>'elegida' in c.dataset));
    const elegir=i=>{cols.forEach((c,j)=>{if(j===i)c.dataset.elegida='';else delete c.dataset.elegida;});lectura.textContent=cols[i].dataset.lectura;};
    const enX=e=>{const r=fila.getBoundingClientRect();if(r.width)elegir(Math.max(0,Math.min(cols.length-1,Math.floor((e.clientX-r.left)/r.width*cols.length))));};
    area.addEventListener('pointerdown',enX);area.addEventListener('pointermove',enX);
    area.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')elegir(inicial);});
  });
}
function crecimientoAdminHTML(semanas,ahora=Date.now()){
  if(!Array.isArray(semanas)||!semanas.length)return '';
  const cifra=v=>Number.isFinite(Number(v))?Number(v):0;
  const dato=(titulo,f,clave)=>`<div><dt>${titulo}</dt><dd><strong>${cifra(f[clave])} total</strong><span>${cifra(f[clave+'_estudiantes'])} estudiantes · ${cifra(f[clave+'_profesores'])} profesores</span></dd></div>`;
  const semana=f=>`<h3>Semana del ${esc(f.semana?fechaLargaAdmin(f.semana):'')}</h3><dl>${dato('Nuevas',f,'nuevas')}${dato('Activas',f,'activas')}${dato('Volvieron',f,'vuelven')}</dl>`;
  return `<section class="admin-crecimiento" aria-labelledby="admin-crecimiento-titulo"><h3 id="admin-crecimiento-titulo">Crecimiento semanal</h3>
    <p>Última semana cerrada y actividad en curso</p>${graficosCrecimientoAdminHTML(semanas,ahora)}
    ${semanas.length>1?`<details class="datos-definiciones"><summary>Detalle de la semana del ${esc(fechaCortaAdmin(semanas[0].semana))}</summary>`:''}<div class="admin-crecimiento-actual">${semana(semanas[0])}</div>${semanas.length>1?'</details>':''}
    ${semanas.length>1?`<details class="admin-crecimiento-historial"><summary>Ver ${semanas.length-1} ${semanas.length===2?'semana anterior':'semanas anteriores'}</summary><ol>${semanas.slice(1).map(f=>`<li>${semana(f)}</li>`).join('')}</ol></details>`:''}</section>`;
}
const AREAS_ADMIN=['profesores','anuncios','estadisticas','usuarios'];
function panelAdminHigHTML(profesores,ahora,crecimiento=[],area='anuncios',alcance=null,historial=null){
  const filas=filasAdminHig(profesores,ahora),r=resumenAdminClases(profesores,ahora);
  const kpi=(titulo,valor,detalle)=>`<div><span>${titulo}</span><strong>${valor}</strong><p>${detalle}</p></div>`;
  const tab=(nombre,texto)=>`<button type="button" role="tab" id="admin-tab-${nombre}" data-admin-area="${nombre}" aria-controls="admin-area-${nombre}" aria-selected="${nombre===area}" tabindex="${nombre===area?'0':'-1'}">${texto}</button>`;
  const panel=(nombre,contenido)=>`<section class="admin-hig-panel" role="tabpanel" id="admin-area-${nombre}" data-admin-panel="${nombre}" aria-labelledby="admin-tab-${nombre}" tabindex="0"${nombre===area?'':' hidden'}>${contenido}</section>`;
  // Sin cabecera propia: «Administración» va en la barra (Lucas, 2026-10-22).
  // Decía «Todo en orden.» aunque hubiera anuncios esperando revisión.
  return `<div class="admin-hig">
    <div class="admin-hig-areas" role="tablist" aria-label="Secciones de administración">
      ${tab('profesores','Profesores')}${tab('anuncios','Anuncios')}${tab('estadisticas','Estadísticas')}${tab('usuarios','Usuarios')}
    </div>
    ${panel('profesores',`<h2>Profesores</h2>
      <p class="admin-hig-nota">${profesores.length} profesores · ${r.pendientes} esperando revisión. Revisar logos sigue en SQL Editor.</p>
      <div class="admin-hig-herramientas"><label class="admin-hig-busqueda" for="admin-buscar-profesor">Buscar<input type="search" id="admin-buscar-profesor" placeholder="Nombre del profesor" autocomplete="off"></label>
      <label for="admin-estado-profesor">Estado<select id="admin-estado-profesor">${FILTROS_PROFESORES_ADMIN.map(([v,t])=>`<option value="${v}"${v===vistaAdmin.profesores?' selected':''}>${t}</option>`).join('')}</select></label></div>
      <div class="admin-hig-profesores" id="admin-lista-profesores"></div>`)}
    ${panel('anuncios',`${anunciosAdminEditorialHTML(profesores,ahora,historial,alcance)}
    <nav class="admin-hig-pestanas" aria-label="Vistas de administración"><button type="button" data-admin-seccion="campanas" aria-pressed="true">Campañas</button><button type="button" data-admin-seccion="revision" aria-pressed="false">Por revisar</button><button type="button" data-admin-seccion="cobros" aria-pressed="false">Cobros e historial</button></nav>
    <div class="admin-hig-herramientas"><label class="admin-hig-busqueda" for="admin-hig-buscar">Buscar<input id="admin-hig-buscar" type="search" placeholder="Profesor, anuncio o ramo" autocomplete="off"></label><label for="admin-hig-estado">Estado<select id="admin-hig-estado">${[['','Todos'],['publicado','Publicadas'],['programado','Programadas'],['en_revision','En revisión'],['pausado','Pausadas'],['expirado','Terminadas'],['borrador','Borradores'],['agotado','Tope alcanzado'],['suspendido','Profesor no habilitado'],['eliminado','Borrados con cobros anteriores']].map(([v,t])=>`<option value="${v}"${v===vistaAdmin.estado?' selected':''}>${t}</option>`).join('')}</select></label></div>
    <p class="pe-sub" data-pe-periodo-filas>Campaña actual · acumulado</p><p class="admin-hig-nota" id="admin-hig-cantidad" role="status" aria-live="polite">${filas.length} anuncios</p>
    <div class="admin-hig-lista">${filas.map(f=>filaAdminHigHTML(f,ahora)).join('')}</div>
    <p class="admin-hig-vacio" id="admin-hig-vacio" hidden>No encontramos anuncios. Prueba otro nombre o amplía los filtros.</p>`)}
    ${panel('estadisticas',`<h2>Estadísticas de GradeHub</h2>
      ${crecimientoAdminHTML(crecimiento,ahora)||'<p class="admin-hig-nota" role="status">No pudimos cargar las cifras de la página por ahora.</p>'}
      ${clasesEstadisticasAdminHTML(profesores,alcance,ahora)}`)}
    ${panel('usuarios',`<h2>Usuarios</h2>
      <div id="admin-encuestas-contenido"><p class="admin-hig-nota">Abre esta sección para gestionar encuestas.</p></div>
      <section class="admin-hig-profesores" id="admin-reportes-programa" aria-label="Reportes de programa"><h3>Programas reportados</h3><p class="profesor-info" role="status">Cargando reportes…</p></section>`)}
  </div>`;
}

// La vista elegida sobrevive al repintado: cada acción vuelve a pintar el
// panel, y quien publicaba desde "Por revisar" caía de vuelta en "Campañas"
// con la búsqueda y el filtro borrados.
let vistaAdmin={area:'anuncios',seccion:'campanas',busqueda:'',estado:'publicado',profesores:'aprobado',busquedaProfesores:''};
// Esta bandeja se crea solo después de renderPuertaDosPasos. El RPC vuelve a
// exigir en el servidor una cuenta administradora con el segundo factor (aal2).
async function pintarReportesProgramaAdmin(raiz){
  const caja=raiz.querySelector('#admin-reportes-programa');
  if(!caja)return;
  try{
    const {data,error}=await supabaseClient.rpc('admin_reportes_programa');
    if(!caja.isConnected)return;
    if(error){
      caja.innerHTML='<h3>Programas reportados</h3><p class="profesor-info" role="alert">'+
        (sqlClasesDesactualizado(error)?'La bandeja estará disponible cuando se aplique su SQL.':'No pudimos cargar los reportes. Actualiza para intentar de nuevo.')+'</p>';
      return;
    }
    const filas=Array.isArray(data)?data:[];
    caja.innerHTML=`<h3>Programas reportados · ${filas.length}</h3>`+
      (filas.length?`<div class="admin-hig-lista">${filas.map(f=>`<article class="admin-revision">
        <h4>${esc(f.ramo||'Ramo sin nombre')}</h4>
        <p class="clase-card-meta">${esc(String(f.tenant||'').toUpperCase())}${f.carrera?' · '+esc(f.carrera):''}${f.evaluacion?' · '+esc(f.evaluacion):''} · ${esc(new Date(f.created_at).toLocaleDateString('es-CL'))}</p>
        <p class="admin-revision-descripcion">${esc(f.descripcion||'')}</p>
      </article>`).join('')}</div>`:'<p class="admin-hig-vacio">Todavía no hay diferencias reportadas.</p>');
  }catch(e){if(caja.isConnected)caja.innerHTML='<h3>Programas reportados</h3><p class="profesor-info" role="alert">No pudimos cargar los reportes. Actualiza para intentar de nuevo.</p>';}
}
let versionPanelAdminEditorial=0;
async function pintarPanelAdmin(raiz){
  const usuario=currentUser,cliente=supabaseClient,version=++versionPanelAdminEditorial;
  const vigente=()=>currentUser===usuario&&supabaseClient===cliente&&version===versionPanelAdminEditorial&&raiz.isConnected!==false;
  raiz.innerHTML='<p class="profesor-info" role="status">Cargando…</p>';
  let profesores;
  try{
    const {data,error}=await supabaseClient.rpc('admin_panel_clases');
    if(!vigente())return;
    if(error){console.warn('No se pudo cargar la administración:',error.code||'',error.message||error);
      raiz.innerHTML=`<p class="profesor-info" role="alert">${error.code==='42501'?'Esta cuenta no tiene acceso de administración.':'No pudimos cargar la administración. Intenta de nuevo.'}</p>`;return;}
    profesores=Array.isArray(data)?data:[];
    if(profesores.some(p=>(p.anuncios||[]).some(a=>!Array.isArray(a.cobros))))compatibilidadSqlClases.cobros=true;
  }catch(e){if(!vigente())return;raiz.innerHTML='<p class="profesor-info" role="alert">No pudimos cargar la administración. Intenta de nuevo.</p>';return;}
  // Si el SQL agregado aún no se aplicó, las campañas siguen disponibles.
  // Lo mismo con el alcance diario (admin_estadisticas.sql): null = sin SQL.
  let crecimiento=[],alcance=null,historial=null;
  const [rc,ra,rh]=await Promise.allSettled([supabaseClient.rpc('crecimiento_semanal_admin'),supabaseClient.rpc('admin_alcance_diario',{p_dias:30}),supabaseClient.rpc('admin_historial_anuncios',{p_dias:null})]);
  if(rc.status==='fulfilled'&&rc.value&&!rc.value.error&&Array.isArray(rc.value.data))crecimiento=rc.value.data;
  if(ra.status==='fulfilled'&&ra.value&&!ra.value.error&&Array.isArray(ra.value.data))alcance=ra.value.data;
  if(rh.status==='fulfilled'&&rh.value&&!rh.value.error&&Array.isArray(rh.value.data))historial=rh.value.data;
  if(!vigente())return;
  const ahora=Date.now();
  // La sección que pidió la barra lateral manda (2026-10-23).
  const pedida=typeof tomarVistaNav==='function'&&tomarVistaNav('admin');
  if(pedida&&AREAS_ADMIN.includes(pedida))vistaAdmin.area=pedida;
  const pendientes=profesores.filter(p=>p.estado==='pendiente').length;
  if(vistaAdmin.profesores===undefined)vistaAdmin.profesores='aprobado';
  marcarPendientesNavAdmin(pendientes);
  raiz.innerHTML=(compatibilidadSqlClases.campanas||compatibilidadSqlClases.cobros?`<p class="profesor-info" role="status">${esc(AVISO_SQL_CLASES)}</p>`:'')+panelAdminHigHTML(profesores,ahora,crecimiento,vistaAdmin.area,alcance,historial);
  pintarReportesProgramaAdmin(raiz);
  enlazarGraficosAdmin(raiz);
  const lista=raiz.querySelector('#admin-lista-profesores');
  if(lista&&typeof lista.querySelectorAll==='function'){
    lista.innerHTML=profesores.map(personaAdminHigHTML).join('')+`<p class="admin-hig-motivo" id="admin-profesores-vacio" hidden>${profesores.length?'Nadie calza con este filtro.':'Todavía no hay profesores.'}</p>`;
    const buscar=raiz.querySelector('#admin-buscar-profesor'),filtro=raiz.querySelector('#admin-estado-profesor');
    buscar.value=vistaAdmin.busquedaProfesores||'';filtro.value=vistaAdmin.profesores;
    const filtrar=()=>{
      vistaAdmin={...vistaAdmin,profesores:filtro.value,busquedaProfesores:buscar.value};
      const visibles=new Set(filtrarProfesoresAdmin(profesores,{estado:vistaAdmin.profesores,busqueda:buscar?buscar.value:''}).map(p=>String(p.user_id)));
      lista.querySelectorAll('[data-admin-persona]').forEach(el=>{el.hidden=!visibles.has(el.dataset.adminPersona);});
      const vacio=lista.querySelector('#admin-profesores-vacio');if(vacio)vacio.hidden=visibles.size>0;
    };
    filtro.addEventListener('change',filtrar);
    if(buscar)buscar.addEventListener('input',filtrar);
    filtrar();
  }
  const mostrarArea=nombre=>{
    if(!AREAS_ADMIN.includes(nombre))return;
    vistaAdmin.area=nombre;
    raiz.querySelectorAll('[data-admin-area]').forEach(b=>{
      const activa=b.dataset.adminArea===nombre;
      b.setAttribute('aria-selected',String(activa));b.tabIndex=activa?0:-1;
    });
    raiz.querySelectorAll('[data-admin-panel]').forEach(p=>{p.hidden=p.dataset.adminPanel!==nombre;});
    if(typeof marcarVistaNav==='function')marcarVistaNav('admin',nombre);
    if(nombre==='usuarios'){
      const caja=raiz.querySelector('#admin-encuestas-contenido');
      if(caja&&!caja.querySelector('.encuestas-admin'))renderAdminEncuestas(caja);
    }
  };
  const tabs=[...raiz.querySelectorAll('[data-admin-area]')];
  tabs.forEach((b,i)=>{
    b.addEventListener('click',()=>mostrarArea(b.dataset.adminArea));
    b.addEventListener('keydown',e=>{
      const paso=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
      const siguiente=e.key==='Home'?0:e.key==='End'?tabs.length-1:paso?(i+paso+tabs.length)%tabs.length:-1;
      if(siguiente<0)return;
      e.preventDefault();mostrarArea(tabs[siguiente].dataset.adminArea);tabs[siguiente].focus();
    });
  });
  mostrarArea(vistaAdmin.area);
  if(typeof vistasPanelNav!=='undefined')vistasPanelNav.admin=v=>{if(raiz.isConnected!==false)mostrarArea(v);};
  let seccion=vistaAdmin.seccion;
  const buscar=raiz.querySelector('#admin-hig-buscar'),filtro=raiz.querySelector('#admin-hig-estado');
  buscar.value=vistaAdmin.busqueda;filtro.value=vistaAdmin.estado;
  raiz.querySelectorAll('[data-admin-seccion]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.adminSeccion===seccion)));
  const filtrar=()=>{
    vistaAdmin={...vistaAdmin,seccion,busqueda:buscar.value,estado:filtro.value};
    const filas=filtrarAdminHig(filasAdminHig(profesores,ahora),vistaAdmin),ids=new Set(filas.map(f=>f.a.id));
    raiz.querySelectorAll('[data-admin-fila]').forEach(f=>{f.hidden=!ids.has(f.dataset.adminFila);});
    raiz.querySelector('#admin-hig-cantidad').textContent=`${filas.length} ${filas.length===1?'anuncio':'anuncios'}`;
    raiz.querySelector('#admin-hig-vacio').hidden=filas.length>0;
  };
  buscar.addEventListener('input',filtrar);filtro.addEventListener('change',filtrar);
  raiz.querySelectorAll('[data-admin-seccion]').forEach(b=>b.addEventListener('click',()=>{
    seccion=b.dataset.adminSeccion;
    filtro.value=seccion==='revision'?'en_revision':seccion==='campanas'?'publicado':'';
    raiz.querySelectorAll('[data-admin-seccion]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    if(typeof filtro.dispatchEvent==='function')filtro.dispatchEvent(new Event('change',{bubbles:true}));else filtrar();
  }));
  filtrar();
  enlazarAdminEditorial(raiz,historial,alcance,ahora);
  enlazarSelectoresPrivados(raiz);
  const repintar=()=>pintarPanelAdmin(raiz);
  const anunciosPorId=new Map(profesores.flatMap(p=>p.anuncios||[]).map(a=>[a.id,a]));
  raiz.querySelectorAll('[data-admin-estadisticas]').forEach(b=>b.addEventListener('click',async()=>{
    const a=anunciosPorId.get(b.dataset.adminEstadisticas);
    const caja=raiz.querySelector('#admin-estadisticas-'+b.dataset.adminEstadisticas);
    if(!a||!caja||b.disabled)return;
    if(!caja.hidden&&b.dataset.estadisticasEstado==='lista'){
      caja.hidden=true;b.textContent='Ver estadísticas';b.setAttribute('aria-expanded','false');return;
    }
    caja.hidden=false;b.setAttribute('aria-expanded','true');
    b.disabled=true;caja.innerHTML='<p class="clase-sin-datos" role="status">Cargando estadísticas…</p>';
    try{
      // El panel puede llevar rato abierto. Releer la fila evita mezclar una
      // publicación nueva con fechas o estado de la vista anterior.
      const {data:panel,error:panelError}=await supabaseClient.rpc('admin_panel_clases');
      if(panelError)throw panelError;
      const actual=(Array.isArray(panel)?panel:[]).flatMap(p=>p.anuncios||[]).find(x=>x.id===a.id);
      if(!actual)throw Error('Aviso no encontrado');
      if(['estado','publicado_at','vence_at'].some(k=>actual[k]!==a[k])){
        await pintarPanelAdmin(raiz);
        showToast('El aviso cambió. Actualicé el panel; abre sus estadísticas de nuevo.');
        return;
      }
      const vig=vigenciaAnuncio(actual,Date.now());
      if(!ANUNCIO_YA_SE_MOSTRO.has(actual.estado)||vig==='programado'){
        caja.innerHTML=`<p class="clase-sin-datos">${vig==='programado'?'Todavía no empieza, así que no hay nada que medir ni cobrar.':actual.estado==='en_revision'?'Cuando se apruebe y empiece a mostrarse, sus estadísticas aparecerán acá.':'Todavía no se publica, así que no hay estadísticas.'}</p>`;
        b.dataset.estadisticasEstado='lista';b.textContent='Ocultar estadísticas';return;
      }
      const m=await metricasDeAnuncio({...actual,campana:null});
      if(caja.isConnected===false)return;
      if(m.error)throw Error('No pudimos cargar las estadísticas. Revisa tu conexión e intenta de nuevo.');
      const d=prepararMetricasClase(actual,m);
      const pesos=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
      caja.innerHTML='<h4>Estadísticas del aviso</h4>'+detalleMetricasClaseHTML(d,pesos,Date.now())+
        '<p class="clase-privacidad">Solo totales por anuncio. Nunca nombres ni notas de estudiantes.</p>';
      b.dataset.estadisticasEstado='lista';b.textContent='Ocultar estadísticas';
    }catch(e){
      if(caja.isConnected!==false)caja.innerHTML='<p class="clase-sin-datos" role="alert">No pudimos cargar las estadísticas. Revisa tu conexión e intenta de nuevo.</p>';
      b.dataset.estadisticasEstado='error';b.textContent='Reintentar estadísticas';
    }finally{if(b.isConnected!==false)b.disabled=false;}
  }));
  raiz.querySelectorAll('[data-admin-flyer]').forEach(caja=>{
    urlFlyerClase(caja.dataset.adminFlyer).then(url=>{
      if(!caja.isConnected)return;
      caja.innerHTML=url?`<img src="${esc(url)}" alt="Flyer del anuncio para revisión" loading="lazy">`:'No pudimos cargar el flyer.';
    }).catch(()=>{if(caja.isConnected)caja.textContent='No pudimos cargar el flyer.';});
  });
  const llamar=async(fn,args,ok,alError)=>{
    try{
      const {data,error}=await supabaseClient.rpc(fn,args);
      if(error&&alError&&alError(error))return;
      if(error||data!==true){showToast(error?.message||'No se aplicó el cambio. Actualiza el panel e intenta de nuevo.',true);return;}
      showToast(ok);await repintar();
    }catch(e){showToast('No pudimos completar la acción. Revisa tu conexión e intenta de nuevo.',true);}
  };
  // Alumnos de ejemplo (alumnos_ejemplo.sql): el botón aparece cuando se sabe
  // a quién ya se le activó. Sin el SQL aplicado la consulta falla y no se muestra.
  const cajasEjemplo=[...raiz.querySelectorAll('[data-admin-ejemplo]')];
  if(cajasEjemplo.length)Promise.resolve().then(()=>supabaseClient.rpc('admin_alumnos_ejemplo')).then(r=>{
    if(!r||r.error)return;
    const activos=new Set((r.data||[]).map(String));
    cajasEjemplo.forEach(caja=>{
      if(caja.isConnected===false)return;
      const id=caja.dataset.adminEjemplo,activo=activos.has(id);
      caja.innerHTML=`<button type="button" class="clase-accion">${activo?'Quitar alumnos de ejemplo':'Mostrarle alumnos de ejemplo'}</button>`;
      caja.querySelector('button').addEventListener('click',()=>llamar('admin_fijar_alumnos_ejemplo',{p_user_id:id,p_activo:!activo},
        activo?'Vuelve a ver su panel real':'Verá su panel con alumnos de ejemplo'));
    });
  }).catch(()=>{});
  raiz.querySelectorAll('[data-admin-publicar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm('¿Publicar este anuncio?','Se mostrará según los días, la fecha y el tope de su campaña. Las vistas, aperturas y contactos se cobran con las tarifas actuales.',
      ()=>llamar('admin_publicar_anuncio',{p_anuncio_id:b.dataset.adminPublicar},'Anuncio publicado'),{label:'Publicar',danger:false})));
  raiz.querySelectorAll('[data-admin-devolver]').forEach(b=>b.addEventListener('click',async()=>{
    const comentario=raiz.querySelector(`[data-admin-comentario="${b.dataset.adminDevolver}"]`);
    const texto=String(comentario&&comentario.value||'').trim();
    if(texto.length<10||texto.length>1000){showToast('Escribe un comentario de 10 a 1000 caracteres para el profesor.',true);comentario?.focus();return;}
    b.disabled=true;
    await llamar('admin_devolver_anuncio',{p_anuncio_id:b.dataset.adminDevolver,p_comentario:texto},'Anuncio devuelto con comentario');
    if(b.isConnected)b.disabled=false;
  }));
  raiz.querySelectorAll('[data-admin-borrar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm('¿Borrar este anuncio?','Desaparecerá de la revisión y del espacio del profesor. Si tuvo campañas anteriores, su medición y sus cobros se conservan.',
      ()=>llamar('admin_borrar_anuncio_revision',{p_anuncio_id:b.dataset.adminBorrar},'Anuncio borrado de la revisión'),
      {label:'Borrar anuncio',danger:true})));
  raiz.querySelectorAll('[data-admin-terminar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm('¿Terminar esta campaña?','El aviso ya está pausado. El cierre conserva sus métricas y el costo acumulado; quedará listo para registrar el cobro.',
      ()=>llamar('admin_terminar_anuncio_pausado',{p_anuncio_id:b.dataset.adminTerminar,p_publicado_at:b.dataset.publicadoAt},'Campaña terminada y lista para cobro'),
      {label:'Terminar campaña',danger:false})));
  raiz.querySelectorAll('[data-admin-pausar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm('¿Pausar este aviso?','Deja de mostrarse al tiro. Para volver, el profesor lo manda a revisión otra vez.',
      ()=>llamar('admin_pausar_anuncio',{p_anuncio_id:b.dataset.adminPausar},'Aviso pausado'),{label:'Pausar',danger:false})));
  raiz.querySelectorAll('[data-admin-postulacion]').forEach(b=>b.addEventListener('click',()=>{
    const aceptar=b.dataset.estado==='aprobado';
    showConfirm(aceptar?'¿Aceptar a este profesor?':'¿Rechazar esta postulación?',
      aceptar?'Podrá publicar anuncios (cada uno pasa por revisión) y usar el panel de alumnos.':'No podrá ofrecer clases. Su cuenta de estudiante sigue igual y puedes aceptarlo después.',
      ()=>llamar('admin_revisar_postulacion',{p_user_id:b.dataset.adminPostulacion,p_estado:b.dataset.estado},aceptar?'Profesor aceptado':'Postulación rechazada'),
      {label:aceptar?'Aceptar':'Rechazar',danger:!aceptar});
  }));
  raiz.querySelectorAll('[data-admin-panel-alumnos]').forEach(b=>b.addEventListener('click',()=>{
    const mostrar=b.dataset.activo==='true',n=Number(b.dataset.alumnos)||0;
    if(mostrar){llamar('admin_panel_alumnos_profesor',{p_user_id:b.dataset.adminPanelAlumnos,p_activo:true},'Panel de alumnos visible');return;}
    showConfirm('¿Ocultar su panel de alumnos?',n?`Deja de ver a sus ${n} ${n===1?'alumno':'alumnos'} y nadie nuevo se puede conectar. No se borra nada: al mostrarlo de nuevo están los mismos.`:'No verá la sección Alumnos y nadie se podrá conectar con su link. Puedes mostrarla cuando quieras.',
      ()=>llamar('admin_panel_alumnos_profesor',{p_user_id:b.dataset.adminPanelAlumnos,p_activo:false},'Panel de alumnos oculto'),{label:'Ocultar',danger:false});
  }));
  raiz.querySelectorAll('[data-admin-nota]').forEach(b=>b.addEventListener('click',async()=>{
    const caja=raiz.querySelector(`[data-admin-nota-texto="${b.dataset.adminNota}"]`);
    b.disabled=true;
    try{
      const {data,error}=await supabaseClient.rpc('admin_nota_profesor',{p_user_id:b.dataset.adminNota,p_texto:caja?caja.value:''});
      showToast(error||data!==true?(error?.message||'No se guardó la nota. Actualiza el panel e intenta de nuevo.'):'Nota guardada',!!(error||data!==true));
    }catch(e){showToast('No pudimos guardar la nota. Revisa tu conexión.',true);}
    if(b.isConnected)b.disabled=false;
  }));
  raiz.querySelectorAll('[data-admin-eliminar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm(`¿Eliminar a ${b.dataset.nombre||'este profesor'} como profesor?`,
      'Se borran su ficha y sus borradores. Su cuenta y sus notas de estudiante no se tocan, y puede volver a postular.',
      ()=>llamar('admin_eliminar_profesor',{p_user_id:b.dataset.adminEliminar},'Profesor eliminado'),
      {label:'Eliminar',danger:true})));
  raiz.querySelectorAll('[data-admin-profesor]').forEach(b=>b.addEventListener('click',()=>{
    const pausar=b.dataset.estado==='suspendido';
    showConfirm(pausar?'¿Pausar a este profesor?':'¿Reactivar a este profesor?',
      pausar?'Todos sus avisos dejan de mostrarse al tiro. No se borra nada y se puede revertir.':'Sus avisos publicados y vigentes vuelven a mostrarse.',
      ()=>llamar('admin_estado_profesor',{p_user_id:b.dataset.adminProfesor,p_estado:b.dataset.estado},pausar?'Profesor pausado':'Profesor reactivado'),
      {label:pausar?'Pausar':'Reactivar',danger:false});
  }));
  raiz.querySelectorAll('[data-admin-cobro]').forEach(fila=>{
    const guardar=fila.querySelector('[data-cobro-guardar]'),monto=fila.querySelector('[data-cobro-monto]');
    if(monto)campoPesos(monto);
    if(guardar)guardar.addEventListener('click',async()=>{
      const estado=fila.querySelector('[data-cobro-estado]').value,valor=pesosDeTexto(monto.value);
      if(estado!=='pendiente'&&(!Number.isSafeInteger(valor)||valor<0||valor>5000000)){showToast('Escribe un monto entre $0 y $5.000.000.',true);return;}
      if(guardar.disabled)return;
      guardar.disabled=true;
      try{
        const resultado=await marcarCobroAdmin({p_anuncio_id:fila.dataset.adminCobro,p_publicado_at:fila.dataset.publicadoAt,
          p_estado:estado,p_monto_clp:estado==='pendiente'?null:valor});
        if(resultado.error||resultado.data!==true){showToast(resultado.error?.message||'No se pudo guardar el cobro.',true);return;}
        showToast('Cobro guardado'+(compatibilidadSqlClases.cobros?' con el SQL anterior':''));await repintar();
      }catch(e){showToast('No pudimos guardar el cobro. Intenta de nuevo.',true);}
      finally{if(guardar.isConnected)guardar.disabled=false;}
    });
  });
  await enlazarDescuentosAdmin(raiz,anunciosPorId,llamar);
  await enlazarEdicionAdmin(raiz,profesores,async()=>{vistaAdmin.area='anuncios';await repintar();});
}
