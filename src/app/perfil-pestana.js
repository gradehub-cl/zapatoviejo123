
// ─── PESTAÑA PERFIL ──────────────────────────────────────────────────────────
// La cuenta, el semestre y las herramientas viven en la última pestaña de la
// barra, donde se buscan en cualquier app (HIG: Tab bars; Lists and tables).
// Antes estaban tras el avatar de la esquina, en un menú. Cada fila abre lo
// mismo que abría ese menú o la sección de Ajustes que corresponde: acá no se
// guarda ni se calcula nada nuevo.
const ICONO_CANVAS='<circle cx="12" cy="12" r="2.2"/>'+[0,45,90,135,180,225,270,315].map(g=>{const r=g*Math.PI/180;return `<circle cx="${(12+8*Math.cos(r)).toFixed(2)}" cy="${(12+8*Math.sin(r)).toFixed(2)}" r="1.6"/>`;}).join('');
const PERFIL_ICONOS={
  academico:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17A2.5 2.5 0 0 1 6.5 2z"/>',
  calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  // Canvas (Lucas, 2026-11-17): un anillo de puntos, como su marca, en el trazo
  // monocromo de los demás íconos. No es el logo a color.
  canvas:ICONO_CANVAS,
  archivar:'<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
  calculadora:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M7 8h10M8 13h2m4 0h2m-8 4h2m4 0h2"/>',
  ficha:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6m-3 3 3 3 3-3"/>',
  horario:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="4"/>',
  apariencia:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  agentes:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h.01M8 13h.01M11 9h5M11 13h5M8 17h8"/>',
  sugerencias:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
  datos:'<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/>',
  profesor:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h7"/>'
};
// Lo que hace cada fila. Se busca por clave al tocar, no se escribe en el HTML.
const PERFIL_ACCIONES={
  cuenta:()=>openSettings('perfil',{volverA:'Perfil'}),
  academico:()=>openSettings('academico',{volverA:'Perfil'}),
  calendario:()=>openSettings('calendario',{volverA:'Perfil'}),
  canvas:()=>openSettings('canvas',{volverA:'Perfil'}),
  apariencia:()=>openSettings('apariencia',{volverA:'Perfil'}),
  agentes:()=>openSettings('agentes',{volverA:'Perfil'}),
  sugerencias:()=>openSettings('sugerencias',{volverA:'Perfil'}),
  datos:()=>openSettings('datos',{volverA:'Perfil'}),
  profesor:()=>openSettings('profesor',{volverA:'Perfil'}),
  archivar:()=>confirmArchiveSemester(),
  calculadora:()=>openCalculadoraApp(),
  ficha:()=>openAvanceCurricular(),
  horario:()=>abrirImportarHorarioBuscacursos(),
  salir:()=>signOut()
};
// Qué filas ve esta cuenta. Función pura: recibe lo que necesita y no toca el DOM.
function gruposPerfil({soloProfesor,tenant,hayRamos,conFicha,conSesion,conCanvas=false}){
  if(soloProfesor)return [
    ['La app',[['apariencia','Apariencia'],['sugerencias','Sugerencias y comentarios']]],
    ['Tu cuenta',[['datos','Datos y cuenta']]]
  ];
  const semestre=[['academico','Universidad y carrera'],['calendario','Calendario']];
  if(conCanvas)semestre.push(['canvas','Canvas']);
  if(hayRamos)semestre.push(['archivar','Archivar semestre']);
  const herramientas=[['calculadora','Calculadora de nota']];
  if(conFicha)herramientas.push(['ficha','Cargar semestres pasados']);
  if(tenant==='uc')herramientas.push(['horario','Subir foto de tu horario']);
  const cuenta=[['datos','Datos y cuenta']];
  if(conSesion)cuenta.push(['profesor','Ofrecer clases o material']);
  return [
    ['Tu semestre',semestre],
    ['Herramientas',herramientas],
    ['La app',[['apariencia','Apariencia'],['agentes','Agentes conectados'],['sugerencias','Sugerencias y comentarios']]],
    ['Tu cuenta',cuenta]
  ];
}
// Bajo el nombre: la carrera, y aparte universidad y semestre. Solo lo que se sabe.
function lineasPerfil(){
  if(esCuentaProfesor())return ['Cuenta de profesor'];
  const t=typeof TENANTS!=='undefined'&&TENANTS[S.tenant];
  const dos=[t?(t.short||t.mono||''):''];
  if(Number.isFinite(S.careerSemestre))dos.push(`${S.careerSemestre}.º semestre`);
  return [S.carreraNombre||'',dos.filter(Boolean).join(' · ')].filter(Boolean);
}
function renderPerfil(){
  const caja=document.getElementById('perfil-body');
  if(!caja)return;
  const conSesion=typeof currentUser!=='undefined'&&!!currentUser;
  const grupos=gruposPerfil({
    soloProfesor:esCuentaProfesor(),tenant:S.tenant,hayRamos:S.ramos.length>0,
    conFicha:typeof avanceCurricularDisponible==='function'&&avanceCurricularDisponible(),conSesion,
    conCanvas:typeof canvasSeccionDisponible==='function'&&canvasSeccionDisponible()
  });
  const flecha='<svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const fila=([clave,titulo])=>`<li><button type="button" class="perfil-fila" data-perfil="${clave}">
      <span class="perfil-icono" aria-hidden="true"><svg class="ic" viewBox="0 0 24 24">${PERFIL_ICONOS[clave]||''}</svg></span>
      <span class="perfil-fila-titulo">${esc(titulo)}</span>${flecha}</button></li>`;
  const lineas=lineasPerfil();
  const correo=conSesion&&currentUser.email?currentUser.email:'';
  caja.innerHTML=`
    <button type="button" class="perfil-cabecera" data-perfil="cuenta" aria-label="Editar tu nombre y tu cuenta">
      <span class="perfil-avatar" aria-hidden="true">${esc(userInitial())}</span>
      <span class="perfil-quien">
        <b class="perfil-nombre">${esc(S.userName||'Tu cuenta')}</b>
        ${lineas.map(l=>`<span class="perfil-linea">${esc(l)}</span>`).join('')}
        ${correo?`<span class="perfil-correo">${esc(correo)}</span>`:''}
      </span>${flecha}
    </button>
    ${grupos.map(([nombre,filas])=>`<section class="perfil-grupo"><h2>${esc(nombre)}</h2><ul>${filas.map(fila).join('')}</ul></section>`).join('')}
    ${conSesion?'<button type="button" class="perfil-salir" data-perfil="salir">Cerrar sesión</button>':''}
    <p class="perfil-pie">Por estudiantes, para estudiantes.</p>`;
}
// Un solo oyente para toda la pantalla: las filas se repintan y no hay que volver a engancharlas.
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest&&e.target.closest('#perfil-body [data-perfil]');
  if(!b)return;
  const accion=PERFIL_ACCIONES[b.dataset.perfil];
  if(typeof accion==='function')accion();
});
