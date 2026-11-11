// ─── Gráficos de Estadísticas ──────────────────────────────────────────────
// Responde dos cosas de un vistazo: si GradeHub crece y si las clases rinden.
// Lo que espera una decisión va primero, con su salida al lado. Sigue a
// Estadísticas de Alumnos (tokens `.est`): gris por defecto, turquesa para lo
// elegido, verde y rojo solo para dirección. HIG, Charts y Charting data: una
// sola serie desde cero y los números también en texto, para que VoiceOver no
// dependa del dibujo. Son HTML y no SVG para que el texto crezca con el tamaño
// que eligió la persona.
const fechaCortaAdmin=d=>new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'});
const fechaLargaAdmin=d=>new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long'});
// Un tope redondo para el eje y con mitad también redonda: 0 · 30 · 60.
function topeEjeAdmin(max){
  if(!(max>0))return 0;
  const p=10**Math.floor(Math.log10(max));
  return [1,2,4,6,8,10].map(m=>m*p).find(t=>t>=max&&(t/2)%1===0)||10*p;
}
// «+30 (+12%)»: valores, no adjetivos (HIG, Charts). El color solo dice hacia
// dónde se movió, y una base menor que 5 no grita: va en gris con su valor.
function variacionAdmin(actual,anterior){
  if(!Number.isFinite(anterior))return {texto:'',clase:'est-gris'};
  if(anterior<5)return {texto:`antes ${milesViz(anterior)}`,clase:'est-gris'};
  const d=actual-anterior,pct=Math.round(100*d/anterior),signo=d>0?'+':'−';
  return d?{texto:`${signo}${milesViz(Math.abs(d))} (${signo}${Math.abs(pct)}%)`,clase:d>0?'est-sube':'est-baja'}:{texto:'Igual',clase:'est-gris'};
}
// Una cifra que además elige qué dibuja el gráfico de su tarjeta. Sin `id`
// solo informa, como la semana en curso, y no se puede tocar.
function metricaAdminHTML({id,titulo,valor,variacion,pie,elegida}){
  const dentro=`<span>${esc(titulo)}</span><strong>${esc(valor)}</strong><small>${variacion&&variacion.texto?`<b class="${variacion.clase}">${esc(variacion.texto)}</b> `:''}${esc(pie||'')}</small>`;
  return id?`<button type="button" class="adm-metrica" data-adm-metrica="${esc(id)}" aria-pressed="${!!elegida}">${dentro}</button>`:`<div class="adm-metrica adm-metrica-quieta">${dentro}</div>`;
}
const vistaAdminHTML=(id,elegida,contenido)=>`<div data-adm-vista="${esc(id)}"${elegida?'':' hidden'}>${contenido}</div>`;
// Lo que espera una decisión, con su salida al lado. Sin pendientes no aparece.
function atencionAdminHTML(profesores,ahora,conProgramas=false){
  const r=resumenAdminClases(profesores,ahora),pl=(n,uno,varios)=>`${milesViz(n)} ${n===1?uno:varios}`;
  const porCobrar=filasAdminHig(profesores,ahora).filter(cobroPendienteAdmin).length;
  const items=[[r.pendientes,pl(r.pendientes,'postulación','postulaciones'),'profesores:pendiente'],
    [r.revision,pl(r.revision,'anuncio por revisar','anuncios por revisar'),'anuncios:revision'],
    [porCobrar,pl(porCobrar,'campaña por cobrar','campañas por cobrar'),'anuncios:cobros'],
    [r.deuda,`${pesosClase(r.deuda)} en deuda`,'anuncios:cobros','adm-pendiente-deuda']].filter(i=>i[0]>0);
  const programas=conProgramas?'<button type="button" class="adm-pendiente adm-pendiente-quieto" data-admin-ir="usuarios">Reportes de programa anteriores</button>':'';
  return items.length||programas?`<div class="adm-atencion" aria-label="Pendientes">${items.map(([,texto,ir,clase])=>`<button type="button" class="adm-pendiente${clase?' '+clase:''}" data-admin-ir="${ir}"><i aria-hidden="true"></i>${esc(texto)}</button>`).join('')}${programas}</div>`:'';
}
// puntos: [{eje, lectura, valor, tenue}] de lo antiguo a lo nuevo. La columna
// elegida va con el acento lleno y su lectura arriba; tocar o pasar el dedo
// por el área entera elige otra (enlazarGraficosAdmin).
function columnasAdminHTML({titulo,resumen,vacio,puntos,elegido=puntos.length-1,formato=milesViz,tabla=null,dondeValores='en la tabla',sinCabeza=false,porDia=false}){
  const tope=topeEjeAdmin(Math.max(porDia?2:0,...puntos.map(p=>p.valor)));
  const cabeza=`<figcaption${sinCabeza?' class="adm-oculto"':''}><b>${esc(titulo)}</b>${resumen?`<span>${esc(resumen)}</span>`:''}</figcaption>`;
  if(!tope)return `<figure class="viz admin-grafico">${cabeza}<p class="clase-sin-datos">${esc(vacio)}</p></figure>`;
  if(porDia)return `<figure class="viz admin-grafico" aria-label="${esc(titulo)}">
    <div class="ras-grafico" role="group" aria-label="Elegir día de la agenda">
    ${puntos.map((p,i)=>`<button type="button" data-ras-columna="${i}" aria-label="${esc(p.lectura)}" aria-pressed="${i===elegido}"${p.tenue?' data-tenue':''}>
      <span class="ras-barra"><i style="height:${100*p.valor/tope}%"></i></span>
      <span>${esc(p.eje)}</span><b>${p.valor}</b></button>`).join('')}</div></figure>`;
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
  const contra=anterior?`vs. ${fechaCortaAdmin(anterior.semana)}`:'';
  const pct=f=>f&&f.pct_vuelven!=null?Number(f.pct_vuelven):null;
  const textoPct=v=>v===null?'—':`${v.toLocaleString('es-CL')}%`;
  const puntosVolvieron=()=>{
    if(pct(cerrada)===null||pct(anterior)===null)return null;
    const d=Math.round((pct(cerrada)-pct(anterior))*10)/10;
    return d?{texto:`${d>0?'+':'−'}${Math.abs(d).toLocaleString('es-CL')} pts`,clase:d>0?'est-sube':'est-baja'}:{texto:'Igual',clase:'est-gris'};
  };
  const metricas=cerrada?[
    metricaAdminHTML({id:'activas',titulo:'Activas',valor:milesViz(cifra(cerrada.activas)),variacion:anterior&&variacionAdmin(cifra(cerrada.activas),cifra(anterior.activas)),pie:contra,elegida:true}),
    metricaAdminHTML({id:'nuevas',titulo:'Nuevas',valor:milesViz(cifra(cerrada.nuevas)),variacion:anterior&&variacionAdmin(cifra(cerrada.nuevas),cifra(anterior.nuevas)),pie:contra}),
    metricaAdminHTML({id:'volvieron',titulo:'Volvieron',valor:textoPct(pct(cerrada)),variacion:puntosVolvieron(),pie:contra}),
    enCurso?metricaAdminHTML({titulo:'Esta semana',valor:milesViz(cifra(enCurso.activas)),pie:'activas hasta hoy'}):''].join(''):'';
  const desglose=(f,clave)=>f[clave+'_estudiantes']!=null?` · ${milesViz(cifra(f[clave+'_estudiantes']))} estudiantes · ${milesViz(cifra(f[clave+'_profesores']))} profesores`:'';
  const semanaTexto=f=>`Semana del ${fechaLargaAdmin(f.semana)}${semanaEnCursoAdmin(f,ahora)?' (en curso)':''}`;
  const serie=clave=>semanas.slice().reverse().map(f=>({eje:fechaCortaAdmin(f.semana),valor:cifra(f[clave]),tenue:semanaEnCursoAdmin(f,ahora),
    lectura:`${semanaTexto(f)} · ${milesViz(cifra(f[clave]))} ${clave==='activas'?'activas':'nuevas'}${desglose(f,clave)}`}));
  const serieVolvieron=semanas.slice().reverse().map((f,k,lista)=>({eje:fechaCortaAdmin(f.semana),valor:pct(f)||0,tenue:semanaEnCursoAdmin(f,ahora),
    lectura:`${semanaTexto(f)} · ${textoPct(pct(f))}${lista[k-1]&&pct(f)!==null?` · ${milesViz(cifra(f.vuelven))} de ${milesViz(cifra(lista[k-1].activas))} activas`:''}`}));
  const elegido=Math.max(0,semanas.length-1-Math.max(i,0));
  const comun={elegido,dondeValores:'en la tabla por semana',sinCabeza:true};
  return `${metricas?`<div class="adm-metricas" role="group" aria-label="Elegir qué muestra el gráfico">${metricas}</div>`:''}
    ${vistaAdminHTML('activas',true,columnasAdminHTML({...comun,titulo:'Cuentas activas por semana',resumen:'Abrieron la app al menos un día de la semana.',vacio:'Todavía no hay visitas registradas.',puntos:serie('activas')}))}
    ${vistaAdminHTML('nuevas',false,columnasAdminHTML({...comun,titulo:'Cuentas nuevas por semana',resumen:'Se crearon esa semana, estudiantes y profesores.',vacio:'Todavía no hay cuentas nuevas en estas semanas.',puntos:serie('nuevas')}))}
    ${vistaAdminHTML('volvieron',false,columnasAdminHTML({...comun,titulo:'Cuentas que volvieron por semana',resumen:'De las activas la semana anterior.',vacio:'Todavía no hay dos semanas para comparar.',puntos:serieVolvieron,formato:v=>`${v}%`}))}`;
}
// Lo de clases particulares: alcance de los anuncios (admin_estadisticas.sql),
// cobros por mes y anuncios por estado. Sale de lo que el panel ya cargó,
// salvo el alcance diario; sin ese SQL, se explica qué falta y lo demás sigue.
function clasesEstadisticasAdminHTML(profesores,alcance,ahora=Date.now()){
  const pesos=pesosClase;
  let alcanceHTML='';
  if(Array.isArray(alcance)&&alcance.length){
    const n=v=>Number(v)||0,suma=k=>alcance.reduce((t,d)=>t+n(d[k]),0);
    const vieron=suma('vieron'),abrieron=suma('abrieron'),contactaron=suma('contactaron');
    const mejor=alcance.reduce((m,d)=>n(d.vieron)>n(m.vieron)?d:m,alcance[0]);
    const lectura=d=>`${fechaLargaAdmin(d.dia)} · ${milesViz(n(d.vieron))} vieron · ${milesViz(n(d.abrieron))} abrieron · ${milesViz(n(d.contactaron))} contactaron`;
    const puntos=clave=>alcance.map(d=>({eje:fechaCortaAdmin(d.dia),valor:n(d[clave]),lectura:lectura(d)}));
    const tabla={columnas:['Día','Vieron','Abrieron','Contactaron'],filas:alcance.slice().reverse().map(d=>[fechaLargaAdmin(d.dia),milesViz(n(d.vieron)),milesViz(n(d.abrieron)),milesViz(n(d.contactaron))])};
    const vista=(id,titulo,vacio,elegida,conTabla)=>vistaAdminHTML(id,elegida,columnasAdminHTML({titulo,vacio,puntos:puntos(id),sinCabeza:true,
      resumen:id==='vieron'&&vieron?`${milesViz(vieron)} cuentas por campaña en 30 días; el día con más fue el ${fechaLargaAdmin(mejor.dia)}, con ${milesViz(n(mejor.vieron))}.`:'',tabla:conTabla?tabla:null}));
    alcanceHTML=`<div class="adm-dos"><section class="adm-tarjeta" data-adm-grupo aria-label="Alcance de los anuncios, últimos 30 días">
      <div class="adm-metricas adm-metricas-tres" role="group" aria-label="Elegir qué muestra el gráfico">
        ${metricaAdminHTML({id:'vieron',titulo:'Vieron un anuncio',valor:milesViz(vieron),pie:'30 días',elegida:true})}
        ${metricaAdminHTML({id:'abrieron',titulo:'Lo abrieron',valor:milesViz(abrieron),pie:`${pctViz(abrieron,vieron)} de las que lo vieron`})}
        ${metricaAdminHTML({id:'contactaron',titulo:'Contactaron',valor:milesViz(contactaron),pie:`${pctViz(contactaron,vieron)} de las que lo vieron`})}
      </div>
      ${vista('vieron','Alcance por día','Ningún anuncio se ha mostrado en los últimos 30 días.',true,true)}
      ${vista('abrieron','Aperturas por día','Nadie abrió un anuncio en los últimos 30 días.',false,false)}
      ${vista('contactaron','Contactos por día','Nadie contactó en los últimos 30 días.',false,false)}
    </section>
    <section class="adm-tarjeta adm-embudo adm-conversion" aria-label="De ver a contactar, últimos 30 días">
      ${barrasAdminHTML({titulo:'De ver a contactar',filas:[
        {nombre:'Vieron',valor:vieron},{nombre:'Abrieron',valor:abrieron,texto:`${milesViz(abrieron)} · ${pctViz(abrieron,vieron)}`},
        {nombre:'Contactaron',valor:contactaron,texto:`${milesViz(contactaron)} · ${pctViz(contactaron,vieron)}`}]})}
      <p class="adm-tasa"><strong>${esc(pctViz(contactaron,abrieron))}</strong><span>de abrir a contactar</span></p>
    </section></div>`;
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
  const cobros=`<section class="adm-tarjeta" aria-label="Cobrado por mes">
    <div class="adm-metricas adm-metricas-una">${metricaAdminHTML({titulo:'Cobrado en seis meses',valor:pesos(cobrado),variacion:deuda?{texto:`${pesos(deuda)} en deuda`,clase:'est-baja'}:null})}</div>
    ${columnasAdminHTML({titulo:'Cobrado por mes',formato:pesos,vacio:'Todavía no hay cobros registrados en los últimos seis meses.',sinCabeza:true,
    resumen:`${pesos(cobrado)} cobrados en seis meses${deuda?` · ${pesos(deuda)} en deuda`:''}. Cuenta el mes en que se publicó cada campaña.`,
    puntos:meses.map(m=>({eje:nombreMes(m,{month:'short'}),valor:m.cobrado,lectura:`${nombreMes(m,{month:'long',year:'numeric'})} · ${pesos(m.cobrado)} cobrado${m.deuda?` · ${pesos(m.deuda)} en deuda`:''}`})),
    tabla:{columnas:['Mes','Cobrado','En deuda'],filas:meses.slice().reverse().map(m=>[nombreMes(m,{month:'long',year:'numeric'}),pesos(m.cobrado),pesos(m.deuda)])}})}
  </section>`;
  const porEstado=new Map();
  filasAdminHig(profesores,ahora).filter(f=>f.a.estado!=='eliminado').forEach(f=>porEstado.set(f.estado[0],(porEstado.get(f.estado[0])||0)+1));
  const total=[...porEstado.values()].reduce((t,v)=>t+v,0);
  const estados=total?`<section class="adm-tarjeta adm-embudo" aria-label="Anuncios por estado">${barrasAdminHTML({titulo:'Anuncios por estado',resumen:`${milesViz(total)} ${total===1?'anuncio':'anuncios'} en total.`,
    filas:[...porEstado].sort((x,y)=>y[1]-x[1]).map(([nombre,valor])=>({nombre,valor}))})}</section>`:'';
  return `<section class="admin-clases-estadisticas" aria-labelledby="admin-clases-estadisticas-titulo"><h3 id="admin-clases-estadisticas-titulo" class="adm-seccion">Clases particulares</h3>
    ${Array.isArray(alcance)?'':'<p class="est-aviso" role="status">El alcance por día aparece al aplicar supabase/admin_estadisticas.sql.</p>'}
    ${alcanceHTML}<div class="adm-dos${estados?'':' adm-dos-sola'}">${cobros}${estados}</div></section>`;
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
// Tocar una cifra cambia lo que dibuja el gráfico de su tarjeta.
function enlazarMetricasAdmin(raiz){
  raiz.querySelectorAll('[data-adm-grupo]').forEach(grupo=>{
    const botones=[...grupo.querySelectorAll('[data-adm-metrica]')];
    botones.forEach(b=>b.addEventListener('click',()=>{
      botones.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
      grupo.querySelectorAll('[data-adm-vista]').forEach(v=>{v.hidden=v.dataset.admVista!==b.dataset.admMetrica;});
    }));
  });
}
function crecimientoAdminHTML(semanas,ahora=Date.now()){
  if(!Array.isArray(semanas)||!semanas.length)return '';
  const cifra=v=>milesViz(Number.isFinite(Number(v))?Number(v):0);
  const tabla=semanas.length>1?`<details class="admin-grafico-tabla admin-crecimiento-historial"><summary>Ver ${semanas.length} semanas como tabla</summary><div><table>
    <thead><tr>${['Semana','Activas','Estudiantes','Profesores','Nuevas','Volvieron'].map((c,i)=>`<th scope="col"${i?' class="num"':''}>${c}</th>`).join('')}</tr></thead>
    <tbody>${semanas.map(f=>`<tr><th scope="row">${esc(fechaLargaAdmin(f.semana))}</th>${[f.activas,f.activas_estudiantes,f.activas_profesores,f.nuevas,f.vuelven].map(v=>`<td class="num">${v==null?'—':esc(cifra(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:'';
  return `<section class="adm-tarjeta admin-crecimiento" data-adm-grupo aria-labelledby="admin-crecimiento-titulo"><h3 id="admin-crecimiento-titulo" class="adm-oculto">Crecimiento semanal</h3>${graficosCrecimientoAdminHTML(semanas,ahora)}${tabla}</section>`;
}
const AREAS_ADMIN=['profesores','anuncios','estadisticas','usuarios','pautas'];
function panelAdminHigHTML(profesores,ahora,crecimiento=[],area='anuncios',alcance=null,historial=null){
  const filas=filasAdminHig(profesores,ahora),r=resumenAdminClases(profesores,ahora);
  const kpi=(titulo,valor,detalle)=>`<div><span>${titulo}</span><strong>${valor}</strong><p>${detalle}</p></div>`;
  const tab=(nombre,texto)=>`<button type="button" role="tab" id="admin-tab-${nombre}" data-admin-area="${nombre}" aria-controls="admin-area-${nombre}" aria-selected="${nombre===area}" tabindex="${nombre===area?'0':'-1'}">${texto}</button>`;
  const panel=(nombre,contenido)=>`<section class="admin-hig-panel${nombre==='usuarios'?' adu adm-lista':''}" role="tabpanel" id="admin-area-${nombre}" data-admin-panel="${nombre}" aria-labelledby="admin-tab-${nombre}" tabindex="0"${nombre===area?'':' hidden'}>${contenido}</section>`;
  // Sin cabecera propia: «Administración» va en la barra (Lucas, 2026-10-22).
  // Decía «Todo en orden.» aunque hubiera anuncios esperando revisión.
  return `<div class="admin-hig">
    <div class="admin-hig-areas" role="tablist" aria-label="Secciones de administración">
      ${tab('profesores','Profesores')}${tab('anuncios','Anuncios')}${tab('estadisticas','Estadísticas')}${tab('usuarios','Usuarios')}${tab('pautas','Pautas')}
    </div>
    ${panel('profesores',`<h2>Profesores</h2>
      <p class="admin-hig-nota">${profesores.length} profesores · ${r.pendientes} esperando revisión. Revisar logos sigue en SQL Editor.</p>
      <div class="admin-hig-herramientas"><label class="admin-hig-busqueda" for="admin-buscar-profesor">Buscar<input type="search" id="admin-buscar-profesor" placeholder="Nombre del profesor" autocomplete="off"></label>
      <label for="admin-estado-profesor">Estado<select id="admin-estado-profesor">${FILTROS_PROFESORES_ADMIN.map(([v,t])=>`<option value="${v}"${v===vistaAdmin.profesores?' selected':''}>${t}</option>`).join('')}</select></label></div>
      <div class="admin-hig-profesores" id="admin-lista-profesores"></div>`)}
    ${panel('anuncios',`${anunciosAdminEditorialHTML(profesores,ahora,historial,alcance)}
    <div class="adm-lista">
      <div class="adm-lista-barra">
        <nav class="adm-seg" aria-label="Vistas de administración"><button type="button" data-admin-seccion="campanas" aria-pressed="true">Campañas</button><button type="button" data-admin-seccion="revision" aria-pressed="false">Por revisar</button><button type="button" data-admin-seccion="cobros" aria-pressed="false">Cobros e historial</button></nav>
        <div class="admin-hig-herramientas"><label class="admin-hig-busqueda" for="admin-hig-buscar"><span class="adm-oculto">Buscar</span><input id="admin-hig-buscar" type="search" placeholder="Profesor, anuncio o ramo" autocomplete="off"></label><label for="admin-hig-estado"><span class="adm-oculto">Estado</span><select id="admin-hig-estado">${[['','Todos'],['publicado','Publicadas'],['programado','Programadas'],['en_revision','En revisión'],['pausado','Pausadas'],['expirado','Terminadas'],['borrador','Borradores'],['agotado','Tope alcanzado'],['suspendido','Profesor no habilitado'],['eliminado','Borrados con cobros anteriores']].map(([v,t])=>`<option value="${v}"${v===vistaAdmin.estado?' selected':''}>${t}</option>`).join('')}</select></label></div>
      </div>
      <div class="adm-lista-cabeza"><span id="admin-hig-cantidad" role="status" aria-live="polite">${filas.length} anuncios</span><span aria-hidden="true" title="Campaña actual, acumulado">Vistas</span><span aria-hidden="true">Aperturas</span><span aria-hidden="true">Contactos</span><span aria-hidden="true">Días</span><span aria-hidden="true" title="Vieron el anuncio, de las personas activas que tienen el ramo">Alcance del ramo</span></div>
      <div class="admin-hig-lista">${filas.slice().sort(ordenFilasAdmin).map(f=>filaAdminHigHTML(f,ahora)).join('')}</div>
      <p class="admin-hig-vacio" id="admin-hig-vacio" hidden>No encontramos anuncios. Prueba otro nombre o amplía los filtros.</p>
    </div>`)}
    ${panel('estadisticas',`<div class="est adm"><h2>Estadísticas de GradeHub</h2>
      ${atencionAdminHTML(profesores,ahora)}
      ${crecimientoAdminHTML(crecimiento,ahora)||'<p class="est-aviso" role="status">No pudimos cargar las cifras de la página por ahora.</p>'}
      ${clasesEstadisticasAdminHTML(profesores,alcance,ahora)}</div>`)}
    ${panel('pautas','<div id="admin-pautas-contenido"></div>')}
    ${panel('usuarios',`<h2>Usuarios</h2>
      <div class="adu-columnas">
        <section class="adm-tarjeta" id="admin-encuestas-contenido" aria-label="Encuestas"><p class="admin-hig-nota" role="status">Cargando encuestas…</p></section>
        <div class="adu-publico">
          <section class="adm-tarjeta" aria-labelledby="adu-wrapped">
            <div><h3 id="adu-wrapped">Wrapped 2026-2</h3><p class="adu-nota">Apertura general el 1 de diciembre</p></div>
            <button type="button" class="clase-accion" onclick="abrirWrappedVistaPrevia()">Ver vista previa</button>
          </section>
        </div>
      </div>
      <section class="admin-hig-profesores" id="admin-reportes-programa" aria-label="Reportes de programa anteriores"><h3>Reportes de programa anteriores</h3><p class="profesor-info" role="status">Cargando reportes…</p></section>
      ${temaFestivoAdminHTML()}`)}
  </div>`;
}

// Un tema a la vez y lo ven todos. Navidad sigue pendiente de diseño: no se
// publica una apariencia cuya muestra todavía no puede representar la app.
const TEMAS_FESTIVOS_ADMIN=[['','Sin tema'],['halloween','Halloween'],['navidad','Navidad',true]];
function muestraTemaFestivoAdminHTML(tema){
  if(typeof FONDOS==='undefined'||typeof ACENTOS==='undefined'||typeof prefersDark!=='function')return '<span class="adu-tema-muestra adu-tema-pendiente" aria-hidden="true">Vista previa no disponible</span>';
  const oscuro=prefersDark(),fondo=FONDOS[S.fondo]||FONDOS.neutro,acento=ACENTOS[S.acento]||ACENTOS.turquesa;
  const paleta=tema?(typeof paletaTemaFestivo==='function'?paletaTemaFestivo(tema,oscuro):null)
    :{...fondo[oscuro?'oscuro':'claro'],primary:oscuro?acento.darkPrimary:acento.primary};
  if(!paleta)return '<span class="adu-tema-muestra adu-tema-pendiente" aria-hidden="true">—</span>';
  const estilo=`--muestra-bg:${paleta.bg};--muestra-card:${paleta.card};--muestra-linea:${paleta.border};--muestra-fg:${paleta.fg};--muestra-acento:${paleta.primary};`;
  return `<span class="adu-tema-muestra" style="${esc(estilo)}" aria-hidden="true"><span class="adu-tema-cabecera">GradeHub ${tema==='halloween'?'🎃':''}</span><span class="adu-tema-titulo"></span><span class="adu-tema-fila"><i></i><b></b></span><span class="adu-tema-fila"><i></i><b></b></span></span>`;
}
function temaFestivoAdminHTML(){
  const actual=typeof temaFestivo==='string'?temaFestivo:'';
  const nombre=TEMAS_FESTIVOS_ADMIN.find(([v])=>v===actual)?.[1]||'Sin tema';
  return `<details class="adu-festivos"><summary>Temas festivos<span data-tema-festivo-actual>${esc(nombre)}</span></summary>
    <fieldset class="admin-tema-festivo" data-admin-tema-festivo><legend class="adm-oculto">Elegir tema festivo</legend>
    <p class="adu-nota">Lo verán todos, incluso antes de iniciar sesión.</p>
    <div class="adu-temas" role="group" aria-label="Tema festivo">${TEMAS_FESTIVOS_ADMIN.map(([v,t,off])=>`<button type="button" class="adu-tema" data-elegir-tema="${v}" aria-pressed="${v===actual}"${off?' disabled':''}>${muestraTemaFestivoAdminHTML(v)}<span class="adu-tema-nombre">${t}</span><span class="adu-tema-actual" aria-hidden="true">${v===actual?'✓ Actual':off?'Diseño pendiente':''}</span></button>`).join('')}</div>
    <p class="profesor-info" role="status" aria-live="polite" data-tema-festivo-estado></p></fieldset></details>`;
}
function enlazarTemaFestivoAdmin(raiz){
  const caja=raiz.querySelector('[data-admin-tema-festivo]');
  if(!caja||typeof caja.querySelector!=='function')return;
  const estado=caja.querySelector('[data-tema-festivo-estado]');
  const botones=[...caja.querySelectorAll('[data-elegir-tema]')];
  let guardando=false;
  botones.forEach(b=>b.addEventListener('click',()=>{
    const tema=b.dataset.elegirTema,opcion=TEMAS_FESTIVOS_ADMIN.find(([v,,off])=>v===tema&&!off);
    if(!opcion||guardando||tema===(temaFestivo||''))return;
    const cuenta=currentUser&&currentUser.id;
    showConfirm(tema?`¿Activar ${opcion[1]} para todos?`:'¿Quitar el tema festivo?',
      tema?'Lo verán todos, incluso antes de iniciar sesión.': 'Cada persona volverá al color y fondo que eligió.',async()=>{
        if(guardando||!caja.isConnected||!cuenta||currentUser?.id!==cuenta)return;
        guardando=true;caja.disabled=true;estado.textContent='Guardando…';
        try{
          const {error}=await supabaseClient.rpc('admin_tema_festivo',{p_tema:tema||null});
          if(error)throw error;
          if(currentUser?.id!==cuenta)return;
          if(typeof ponerTemaFestivo==='function')ponerTemaFestivo(tema||null);
          botones.forEach(x=>{const elegida=x.dataset.elegirTema===tema;x.setAttribute('aria-pressed',String(elegida));x.querySelector('.adu-tema-actual').textContent=elegida?'✓ Actual':x.disabled?'Diseño pendiente':'';});
          const actual=raiz.querySelector('[data-tema-festivo-actual]');if(actual)actual.textContent=opcion[1];
          estado.textContent=tema?'Listo: lo ven todos desde que abran la app.':'Listo: tema festivo apagado.';
        }catch(err){
          if(currentUser?.id===cuenta)estado.textContent='No se guardó el tema. Intenta de nuevo.';
        }finally{guardando=false;caja.disabled=false;}
      },{label:tema?'Activar tema':'Quitar tema',danger:false,focusCancel:true});
  }));
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
      caja.innerHTML='<h3>Reportes de programa anteriores</h3><p class="profesor-info" role="alert">'+
        (sqlClasesDesactualizado(error)?'La bandeja estará disponible cuando se aplique su SQL.':'No pudimos cargar los reportes. Actualiza para intentar de nuevo.')+'</p>';
      return;
    }
    const filas=Array.isArray(data)?data:[];
    caja.innerHTML=`<h3>Reportes de programa anteriores</h3>`+
      (filas.length?`<p class="admin-hig-nota">${filas.length} ${filas.length===1?'reporte':'reportes'} del formulario anterior en esta lista</p><div class="admin-hig-lista">${filas.map(f=>`<article class="admin-revision">
        <h4>${esc(f.ramo||'Ramo sin nombre')}</h4>
        <p class="clase-card-meta">${esc(String(f.tenant||'').toUpperCase())}${f.carrera?' · '+esc(f.carrera):''}${f.evaluacion?' · '+esc(f.evaluacion):''} · ${esc(new Date(f.created_at).toLocaleDateString('es-CL'))}</p>
        <p class="admin-revision-descripcion">${esc(f.descripcion||'')}</p>
      </article>`).join('')}</div>`:'<p class="admin-hig-vacio">Todavía no hay diferencias reportadas.</p>');
  }catch(e){if(caja.isConnected)caja.innerHTML='<h3>Reportes de programa anteriores</h3><p class="profesor-info" role="alert">No pudimos cargar los reportes. Actualiza para intentar de nuevo.</p>';}
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
  enlazarTemaFestivoAdmin(raiz);
  enlazarGraficosAdmin(raiz);
  enlazarMetricasAdmin(raiz);
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
    if(nombre==='pautas')renderAdminPautas(raiz.querySelector('#admin-pautas-contenido'));
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
  pintarAlcanceFilasAdmin(raiz,profesores,ahora,vigente);
  // Cada pendiente lleva a donde se resuelve, con su filtro ya puesto.
  raiz.querySelectorAll('[data-admin-ir]').forEach(b=>b.addEventListener('click',()=>{
    const [area,vista]=b.dataset.adminIr.split(':');
    mostrarArea(area);
    if(area==='anuncios')raiz.querySelector(`[data-admin-seccion="${vista}"]`)?.click();
    const estado=area==='profesores'&&raiz.querySelector('#admin-estado-profesor');
    if(estado){estado.value=vista;estado.dispatchEvent(new Event('change',{bubbles:true}));}
  }));
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
      const [m,publico]=await Promise.all([metricasDeAnuncio({...actual,campana:null}),publicoAdminAnuncio(actual)]);
      if(caja.isConnected===false)return;
      if(m.error)throw Error('No pudimos cargar las estadísticas. Revisa tu conexión e intenta de nuevo.');
      const d=prepararMetricasClase(actual,m);
      const pesos=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
      caja.innerHTML='<h4>Estadísticas del aviso</h4>'+detalleMetricasClaseHTML(d,pesos,Date.now())+publicoAdminAnuncioHTML({...actual,campana:m.campana},publico)+
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
    showConfirm('¿Publicar este anuncio?',anunciosPorId.get(b.dataset.adminPublicar)?.precio_clp===0?'La publicación no tendrá costo. Se mostrará según los días y la fecha de su campaña.':'Se mostrará según los días, la fecha y el tope de su campaña. Las vistas, aperturas y contactos se cobran con las tarifas actuales.',
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
    showConfirm('¿Terminar esta campaña?',costoCampanaClase(anunciosPorId.get(b.dataset.adminTerminar)?.campana)?.sinCosto?'El aviso ya está pausado. El cierre conserva sus métricas y no genera cobros.':'El aviso ya está pausado. El cierre conserva sus métricas y el costo acumulado; quedará listo para registrar el cobro.',
      ()=>llamar('admin_terminar_anuncio_pausado',{p_anuncio_id:b.dataset.adminTerminar,p_publicado_at:b.dataset.publicadoAt},costoCampanaClase(anunciosPorId.get(b.dataset.adminTerminar)?.campana)?.sinCosto?'Campaña terminada sin costo':'Campaña terminada y lista para cobro'),
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
