
let _repintarSettings=null;
// Repinta Ajustes solo si está abierto de verdad. Sin la guarda, llamarla con el
// modal cerrado le escribiría encima a la siguiente ventana que se abra.
function renderSettingsSiAbierto(){
  const modal=document.getElementById('modal');
  if(!_repintarSettings||!modal||!modal.classList.contains('open'))return;
  if(!document.querySelector('.settings-shell'))return;
  _repintarSettings();
}
function openSettings(){
  const initialSection=arguments[0];
  const soloProfesor=esCuentaProfesor();
  const seccionesProfesor=['perfil','apariencia','datos','sugerencias'];
  let settingsSem=S.careerSemestre;
  let settingsCarrera=S.carrera,settingsCarreraNombre=S.carreraNombre||null,settingsCarreraFiltro='';
  let settingsName=S.userName;
  let settingsNameError='';
  let settingsSearch='';
  // Se declara acá arriba: los render*Grid() se llaman antes de las definiciones
  // de función y con `let` más abajo caería en la zona muerta temporal (TDZ).
  let settingsTenant=S.tenant||'fen';
  const directSection=['perfil','academico','calendario','apariencia','agentes','sugerencias','datos'].includes(initialSection)
    &&(!soloProfesor||seccionesProfesor.includes(initialSection))?initialSection:'';
  let activeSection=directSection||(window.matchMedia('(min-width:768px)').matches?'perfil':'');
  const icons={
    perfil:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.8-3.4 3.5-5.3 7.5-5.3s6.7 1.9 7.5 5.3"/></svg>',
    profesor:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h7"/></svg>',
    academico:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    calendario:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
    apariencia:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    agentes:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h.01M8 13h.01M11 9h5M11 13h5M8 17h8"/></svg>',
    sugerencias:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>',
    datos:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></svg>',
    arrow:'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>'
  };
  // Las cuentas de Google no tienen contraseña: ni la prometen ni la encuentran al buscar.
  const conClave=typeof cuentaConClave==='function'&&cuentaConClave(currentUser);
  const sections=[
    ['Tu cuenta','perfil','Perfil',conClave?'Tu nombre, correo y contraseña':'Tu nombre y correo de acceso','cambiar nombre correo email'+(conClave?' contraseña clave password':'')],
    ['Tu cuenta','agentes','Agentes conectados','Conectar o desconectar un agente','chatgpt claude gemini inteligencia artificial url revocar permisos'],
    ['Tu cuenta','datos','Datos y cuenta','Respaldos, reinicio y eliminación','exportar importar copia respaldo borrar eliminar cuenta reiniciar dispositivo privacidad terminos profesor compartir notas dejar de compartir'],
    ['Tu cuenta','profesor','Clases particulares','Ofrece clases a otros estudiantes','profesor particular clases ofrecer anuncio tutor postular enseñar dar clases hacer clases'],
    ['Tu semestre','academico','Información académica','Universidad, carrera y semestre','cambiar carrera universidad agregar semestre anterior historial ramos malla cursos obligatorios'],
    ['Tu semestre','calendario','Calendario','Importar fechas o suscribirte','apple google outlook importar archivo ics fechas copiar url suscripcion canvas token ramos tareas'],
    ['La app','apariencia','Apariencia','Modo, acento y fondo','tema claro oscuro sistema color cambiar fondo'],
    ['La app','sugerencias','Sugerencias y comentarios','Cuéntanos qué mejorar','ayuda problema reportar falla comentario enviar contactar soporte']
  ].filter(([,id])=>!soloProfesor||seccionesProfesor.includes(id));

  function guardarBtn(){return '<button class="btn-primary settings-save" id="s-save-btn" onclick="saveSettings()">Guardar</button>';}
  // "Soy profesor particular" es una POSTULACIÓN, no un interruptor: apretarlo
  // no enciende nada hasta que alguien del equipo la revise. Por eso el panel
  // muestra siempre en qué va, y no deja a nadie esperando sin saber.
  function panelProfesor(){
    if(typeof perfilProfesorConocido!=='function')
      return '<p class="settings-help settings-help-top">Las clases particulares todavía no están disponibles.</p>';
    if(!currentUser)
      return '<p class="settings-help settings-help-top">Inicia sesión para ofrecer clases.</p>';
    const perfil=perfilProfesorConocido();
    if(perfil===undefined)
      return '<p class="settings-help settings-help-top">Revisando tu acceso…</p>';
    // null es "no se pudo preguntar", no "no tiene ficha": pasa mientras el SQL
    // del marketplace no esté aplicado. Decir "postula" ahí sería ofrecer un
    // botón que no puede funcionar.
    if(perfil===null)
      return '<p class="settings-help settings-help-top">Las clases particulares todavía no están disponibles. Vuelve a mirar más adelante.</p>';
    if(!perfil)return `
      <p class="settings-help settings-help-top">Si haces clases particulares, publica tus avisos acá. Tus notas no se muestran ni se usan en tu anuncio.</p>
      <div class="settings-data-actions" style="margin-bottom:0;">
        <button type="button" class="btn-primary" onclick="postularComoProfesor()">Soy profesor particular</button>
      </div>
      <p class="settings-help">Revisamos cada postulación antes de que puedas publicar.</p>`;
    const estados={
      pendiente:['Tu postulación está en revisión.','Te avisamos cuando la revisemos.'],
      aprobado:['Estás aprobado como profesor particular.','Preparas tus anuncios en la pestaña <b>Clases</b>.'],
      rechazado:['Tu postulación no fue aprobada.','Puedes escribirnos desde Sugerencias y comentarios para revisar el motivo.'],
      suspendido:['Tu acceso de profesor está suspendido.','Tus notas y tu semestre siguen igual. Escríbenos si crees que es un error.'],
    };
    const [titulo,detalle]=estados[perfil.estado]||['Tu perfil necesita revisión.',''];
    return `
      <p class="settings-help settings-help-top"><b>${esc(perfil.nombre_publico||'')}</b></p>
      <p class="settings-help" style="margin-top:0;"><b>${titulo}</b><br>${detalle}</p>`;
  }
  function panel(section){
    if(section==='profesor')return panelProfesor();
    if(section==='perfil')return `
      <label class="modal-label" for="s-name">Nombre para mostrar</label>
      <div class="settings-name-field">
        <div class="modal-input"><input type="text" id="s-name" value="${esc(settingsName)}" maxlength="30" autocomplete="off" aria-describedby="s-name-hint s-name-error"/></div>
        <p id="s-name-error" role="alert" ${settingsNameError?'':'hidden'} style="margin:7px 0 0;font-size:0.75rem;line-height:1.4;color:var(--red);">${esc(settingsNameError)}</p>
        <p class="settings-name-hint" id="s-name-hint">${soloProfesor?'Es el nombre que ves en tu cuenta.':'Aparece en el saludo de inicio.'}</p>
      </div>
      ${guardarBtn()}
      ${currentUser?`<div class="settings-account-access">
        <label class="modal-label" for="s-account-email">Correo de acceso</label>
        <div class="modal-input"><input type="email" id="s-account-email" value="${esc(currentUser.email||'')}" maxlength="60" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email" aria-describedby="s-account-email-help s-account-email-status"/></div>
        <p class="settings-help" id="s-account-email-help" style="margin:7px 0 10px;">Se cambia al tiro. Revisa que esté bien escrito: con él entras y recuperas tu cuenta.</p>
        <p id="s-account-email-status" role="alert" aria-live="polite" hidden style="margin:0 0 10px;font-size:0.75rem;line-height:1.4;"></p>
        <button type="button" class="settings-reset-btn" id="s-account-email-save" onclick="cambiarCorreoCuenta()">Cambiar correo</button>
      </div>`:''}
      ${currentUser&&conClave?`<div class="settings-account-access">
        <label class="modal-label" for="s-account-pass">Nueva contraseña</label>
        <div class="modal-input"><input type="password" id="s-account-pass" maxlength="72" autocomplete="new-password" aria-describedby="s-account-pass-help s-account-pass-status"/></div>
        <label class="modal-label" for="s-account-pass2" style="margin-top:10px;">Repite la contraseña</label>
        <div class="modal-input"><input type="password" id="s-account-pass2" maxlength="72" autocomplete="new-password" aria-describedby="s-account-pass-status"/></div>
        <p class="settings-help" id="s-account-pass-help" style="margin:7px 0 10px;">Al menos ${PASS_MIN} caracteres, con letras y números.</p>
        <p id="s-account-pass-status" role="alert" aria-live="polite" hidden style="margin:0 0 10px;font-size:0.75rem;line-height:1.4;"></p>
        <button type="button" class="settings-reset-btn" id="s-account-pass-save" style="min-height:44px;" onclick="cambiarClaveCuenta()">Cambiar contraseña</button>
        <button type="button" class="settings-reset-btn" id="s-account-pass-recover" style="min-height:44px;margin-top:8px;" onclick="recuperarClaveCuenta()" hidden>Enviar enlace al correo</button>
      </div>`:''}`;
    if(section==='academico')return `
      <div class="modal-label">Universidad</div>
      <div id="s-tenant-grid" class="s-tenant-grid"></div>
      <p class="settings-help">Cambia tu catálogo disponible. Tus ramos y notas no se tocan.</p>
      <label class="modal-label" for="s-carrera-buscar">Carrera</label>
      <div class="modal-input" style="margin-bottom:10px;"><input type="text" id="s-carrera-buscar" placeholder="Busca tu carrera" autocomplete="off" oninput="filtrarCarrerasAjustes(this.value)"/></div>
      <div id="s-carrera-grid" class="settings-carrera-grid"></div>
      <label class="modal-label">Semestre de carrera</label>
      <div class="sem-grid" id="s-sem-grid"></div>
      ${guardarBtn()}
      <!-- Aparte y al final: no se guarda con el botón de arriba, abre otra hoja.
           Entre Carrera y Semestre partía en dos lo que ese botón guarda, y el
           botón quedaba pegado al título siguiente (iPhone, 2026-10-06). -->
      <div style="height:1px;background:var(--border);margin:22px 0 16px;"></div>
      <div class="settings-data-actions">
        <button type="button" id="s-malla">Ramos de mi malla</button>
      </div>
      <label class="modal-label">Semestres que ya cursaste</label>
      <p class="settings-help" style="margin-top:0;">Agrega los que cursaste antes de usar GradeHub, con la nota final de cada ramo.</p>
      <div class="settings-data-actions" style="margin-bottom:0;">
        <button type="button" onclick="closeModal();openSemestreAnteriorModal()">Agregar un semestre anterior</button>
      </div>`;
    if(section==='calendario')return `
      <p class="settings-help settings-help-top">Tus evaluaciones en Google Calendar, Apple Calendar u Outlook. Se agrega una vez y se actualiza sola cada algunas horas.</p>
      ${currentUser?`
      <label class="modal-label">Tu URL de suscripción</label>
      <div class="modal-input"><input type="text" id="s-cal-url" readonly value="Generando…" onclick="this.select()"/></div>
      <div class="settings-data-actions">
        <button type="button" onclick="copiarFeedCalendario()">Copiar URL</button>
        <button type="button" onclick="revocarFeedCalendario()">Generar una nueva</button>
      </div>
      <p class="settings-help">En Google Calendar: <b>Otros calendarios · + · Desde URL</b>.</p>
      <p class="settings-help">Quien tenga esta URL ve tus evaluaciones y fechas. <b>Tus notas no salen nunca.</b> Si se filtra, genera una nueva.</p>`
      :`<p class="settings-help">Inicia sesión para suscribirte.</p>`}
      <div style="height:1px;background:var(--border);margin:22px 0 16px;"></div>
      <label class="modal-label">Traer fechas desde un calendario</label>
      <p class="settings-help" style="margin-top:0;">Sube un archivo <b>.ics</b> de tu calendario. Revisas cada fecha antes de agregarla.</p>
      <div class="settings-data-actions" style="margin-bottom:0;">
        <button type="button" onclick="abrirImportarCalendario()">Importar archivo .ics</button>
      </div>
      ${canvasDisponible()?`<div style="height:1px;background:var(--border);margin:22px 0 16px;"></div>
      <label class="modal-label">Canvas UC</label>
      <p class="settings-help" style="margin-top:0;">Trae ramos y fechas. Revisas cada propuesta antes de agregarla.</p>
      <div id="s-canvas"><p class="settings-help">Revisando…</p></div>`:''}
      ${canvasIcsDisponible()?`<div style="height:1px;background:var(--border);margin:22px 0 16px;"></div><label class="modal-label">Canvas UC</label><div id="s-canvas-ics"></div>`:''}
      ${avisosPruebasDisponibles()?`<div style="height:1px;background:var(--border);margin:22px 0 16px;"></div>
      <label class="modal-label">Avisos antes de tus evaluaciones</label>
      <p class="settings-help" style="margin-top:0;">Para las evaluaciones con hora: último repaso, baño y agua, y el camino a la sala, con una cuenta regresiva en la pantalla de bloqueo. Al terminar, te preguntamos cómo te fue. Solo en este iPhone.</p>
      <div class="settings-data-actions" style="margin-bottom:0;"><button type="button" id="s-avisos-pruebas" onclick="alternarAvisosPruebas()">${avisosPruebasActivos()?'Desactivar avisos':'Activar avisos'}</button></div>
      <p class="settings-help" id="s-avisos-estado" role="status" aria-live="polite"></p>`:''}`;
    if(section==='apariencia')return `
      <p class="settings-help settings-help-top">Se guarda al elegir.</p>
      <div class="modo-grid" id="s-modo-grid"></div>
      <label class="modal-label accent-picker-label">Color de acento</label>
      <div class="accent-grid" id="s-acento-grid" role="radiogroup" aria-label="Color de acento"></div>
      <label class="modal-label accent-picker-label">Fondo</label>
      <div class="fondo-grid" id="s-fondo-grid" role="radiogroup" aria-label="Fondo de la app"></div>`;
    // Una sola forma de conectar: crear la URL y pegarla en el agente.
    if(section==='agentes')return currentUser?`
      <div class="agent-explainer">
        <b>Qué puede hacer</b>
        <span>Ver tus ramos, notas y fechas, simular escenarios, agregar un ramo y proponerte pautas que tú confirmas.</span>
        <span class="agent-explainer-no">No puede escribir tus notas ni borrar nada.</span>
      </div>

      <label class="modal-label">1. Pregúntale a tu agente dónde conectarlo</label>
      <p class="settings-help" style="margin-top:0;">Pégalo en el chat y te dirá dónde agregar el conector.</p>
      <div class="agent-prompt-box">
        <p id="s-agent-prompt-text" class="agent-prompt-text">Quiero conectar GradeHub a este agente mediante una URL MCP. Explícame paso a paso dónde debo agregar un conector o servidor MCP en esta aplicación. No me pidas que envíe la URL por el chat: debo pegarla directamente en la configuración del conector.</p>
        <button type="button" class="agent-refresh" onclick="copiarPromptConectorAgente()">Copiar mensaje para mi agente</button>
      </div>

      <label class="modal-label">2. Ponle un nombre a la conexión</label>
      <p class="settings-help" style="margin-top:0;">Para reconocerlo en la lista.</p>
      <div class="modal-input" style="margin-bottom:12px;"><input type="text" id="s-agent-url-nombre" placeholder="Ej: Mi agente" maxlength="60" autocomplete="off"/></div>

      <label class="modal-label">3. Crea la URL y agrégala al conector</label>
      <p class="settings-help" style="margin-top:0;">Pégala donde te indicó tu agente. Dura 90 días y se muestra una vez.</p>
      <button type="button" class="settings-reset-btn agent-url-create" id="s-agent-url-create" onclick="crearUrlAgente()">Crear URL de conexión</button>
      <div id="s-agent-url" class="agent-url-wrap" aria-live="polite"></div>

      <div class="agent-list-heading"><label class="modal-label">Agentes conectados</label><span>Los puedes desconectar cuando quieras.</span></div>
      <button type="button" class="agent-refresh" onclick="cargarAgentesConectados()">Actualizar lista</button>
      <div id="s-agent-list" class="agent-list" aria-live="polite"></div>

      <div class="agent-proposal-entry agent-prompt-picker"><div>
        <b>Ideas para pedirle</b>
        <span>Elige un mensaje y pégalo en el chat.</span>
        <select class="feedback-select" id="s-agent-prompt-pick" onchange="pintarPromptAgente()" aria-label="Qué pedirle a tu agente">
          ${Object.entries(PROMPTS_AGENTE).map(([clave,p])=>`<option value="${esc(clave)}">${esc(p.titulo)}</option>`).join('')}
        </select>
        <span id="s-agent-prompt-bajada">${esc(PROMPTS_AGENTE.repaso.bajada)}</span>
        <details class="agent-prompt-ver"><summary>Ver el mensaje</summary><span id="s-agent-prompt-texto">${esc(PROMPTS_AGENTE.repaso.texto)}</span></details>
      </div><button type="button" class="agent-refresh" onclick="copiarPromptAgente()">Copiar</button></div>

      <div class="agent-proposal-entry"><div><b>Pautas por revisar</b><span>Nada cambia hasta que la confirmes.</span></div><button type="button" class="agent-refresh" onclick="cargarPropuestasPautaAgente({mostrar:true,avisar:true})">Ver propuestas</button></div>`
      :`<div class="feedback-empty"><b>Necesitas iniciar sesión</b><p>Así puedes ver y desconectar tus agentes.</p></div>`;
    if(section==='sugerencias'){
      const contacto=`<p class="feedback-contact">¿Prefieres escribirnos por correo? <a id="feedback-contact" href="${esc(correoSugerenciaHref())}" onclick="actualizarCorreoSugerencia()">gradehub.app@gmail.com</a></p>`;
      return currentUser?`
      <p class="settings-help settings-help-top">¿Algo no se entiende, está fallando o podría ser mejor? Lo leemos nosotros.</p>
      ${typeof entradaEncuestaHTML==='function'?entradaEncuestaHTML():''}
      <label class="modal-label" for="s-feedback-type">Tipo de comentario</label>
      <select class="feedback-select" id="s-feedback-type" onchange="actualizarCorreoSugerencia()">
        <option value="sugerencia">Tengo una sugerencia</option>
        <option value="problema">Encontré un problema</option>
        <option value="otro">Otro comentario</option>
      </select>
      <label class="modal-label" for="s-feedback-message">Cuéntanos</label>
      <textarea class="feedback-message" id="s-feedback-message" maxlength="2000" rows="7" placeholder="Escribe acá lo que te gustaría cambiar…" aria-describedby="s-feedback-help s-feedback-count" oninput="actualizarSugerencia();actualizarCorreoSugerencia()"></textarea>
      <div class="feedback-meta"><span class="feedback-help pending" id="s-feedback-help" aria-live="polite">Mínimo 3 caracteres · queda asociado a tu cuenta.</span><span id="s-feedback-count">0 / 2000</span></div>
      <button class="btn-primary feedback-send" id="s-feedback-send" type="button" onclick="enviarSugerencia()">Enviar comentario</button>
      ${contacto}`
      :`<div class="feedback-empty"><b>Necesitas iniciar sesión</b><p>Así evitamos spam y podemos entender a qué cuenta corresponde el comentario.</p></div>${contacto}`;
    }
    return `
      <p class="settings-help settings-help-top">Guarda una copia antes de cambiar de dispositivo.</p>
      <div class="settings-data-actions">
        <button type="button" onclick="exportarDatos()">Exportar mis datos</button>
        <button type="button" onclick="abrirImportar()">Importar datos</button>
      </div>
      ${currentUser&&!soloProfesor?`<div class="settings-compartidos">
        <label class="modal-label">Compartido con profesores</label>
        <p class="settings-help" style="margin-top:0;">Los profesores a los que les aceptaste el link ven tus notas de los ramos que elegiste.</p>
        <div id="s-compartidos" aria-live="polite"><p class="settings-help">Cargando…</p></div>
      </div>`:''}
      <div class="settings-danger-zone">
        <div class="settings-danger-label">Zona sensible</div>
        <button type="button" class="settings-danger-btn" onclick="confirmarEliminarCuenta()">Eliminar mi cuenta</button>
        <p>${soloProfesor?'Borra tu cuenta y sus datos, en este dispositivo y en la nube.':'Borra tu cuenta y todas tus notas, en este dispositivo y en la nube.'} No se puede deshacer.</p>
      </div>
      ${currentUser?`<div class="settings-reset-zone"><button type="button" class="settings-reset-btn" onclick="confirmResetApp()">Reiniciar app</button><p>Borra los datos de este dispositivo y cierra sesión. ${soloProfesor?'Tus datos':'Tus notas'} en la nube se conservan.</p></div>`:`<div class="settings-danger-zone settings-reset-danger-zone"><div class="settings-danger-label">Zona sensible</div><button type="button" class="settings-danger-btn" onclick="confirmResetApp()">Reiniciar app</button><p>Borra todos tus datos de este dispositivo. No se puede deshacer.</p></div>`}
      <p class="settings-privacy"><a href="/terminos.html" target="_blank" rel="noopener">Términos de uso</a> · <a href="/privacidad.html" target="_blank" rel="noopener">Política de privacidad</a></p>`;
  }
  function renderSettingsNav(){
    // Buscar no vuelve a pintar el panel: hacerlo borraría un correo o comentario
    // que el estudiante esté escribiendo. El índice incluye las opciones internas.
    const tokens=normName(settingsSearch).split(/\s+/).filter(t=>t&&!['mi','mis','el','la','los','las','de','del','un','una','y','en'].includes(t));
    const results=sections.filter(section=>tokens.every(t=>normName(section.join(' ')).includes(t)));
    const nav=document.getElementById('settings-nav-list');
    // Cada grupo va en su propia caja: en la app es la tarjeta agrupada de iOS;
    // en la web la caja no se ve (display:contents).
    const grupos=[];results.forEach(x=>{const g=grupos[grupos.length-1];if(g&&g[0]===x[0])g[1].push(x);else grupos.push([x[0],[x]]);});
    nav.innerHTML=grupos.map(([group,filas])=>`<div class="settings-nav-group">${group}</div><div class="settings-nav-card">${filas.map(([,id,title,detail])=>`<button type="button" class="settings-nav-item${id===activeSection?' active':''}" data-settings-section="${id}"${id===activeSection?' aria-current="page"':''}><span class="settings-nav-icon" aria-hidden="true">${icons[id]}</span><span><b>${title}</b><small>${detail}</small></span><span class="settings-nav-chevron" aria-hidden="true">›</span></button>`).join('')}</div>`).join('')||`<p class="settings-search-empty">No encontramos esa opción. Prueba con ${soloProfesor?'«correo», «fondo» o «cuenta»':'«carrera», «correo» o «fondo»'}.</p>`;
    document.getElementById('settings-search-status').textContent=settingsSearch.trim()?`${results.length} ${results.length===1?'sección encontrada':'secciones encontradas'}`:'';
    document.querySelectorAll('[data-settings-section]').forEach(b=>b.onclick=()=>{
      activeSection=b.dataset.settingsSection;renderSettings();
      entrarDesde(document.querySelector('.settings-shell'),'push');
      if(activeSection!=='perfil')document.getElementById('settings-detail-title').focus();
    });
  }
  function renderSettings(){
    const current=sections.find(x=>x[1]===activeSection);
    document.getElementById('modal-content').innerHTML=`
      <div class="settings-modal-head${activeSection?' settings-mobile-hidden':''}">
        <div id="modal-titulo" class="modal-title settings-modal-title">Ajustes</div>
        <button type="button" class="settings-cerrar" onclick="closeModal()">Cerrar</button>
      </div>
      <div class="settings-shell${activeSection?' settings-detail-open':''}">
        <nav class="settings-nav" aria-label="Secciones de Ajustes">
          <label class="settings-search-label" for="settings-search">Buscar en Ajustes</label>
          <input type="search" class="settings-search" id="settings-search" value="${esc(settingsSearch)}" placeholder="Buscar" autocomplete="off" aria-controls="settings-nav-list"/>
          <span class="settings-search-status" id="settings-search-status" role="status"></span>
          <div id="settings-nav-list"></div>
        </nav>
        <section class="settings-detail" ${activeSection?'':'aria-hidden="true"'}>
          ${activeSection?`<div class="settings-detail-heading"><button type="button" class="settings-back" aria-label="Volver a Ajustes">${icons.arrow}<span>Ajustes</span></button><div><h2 id="settings-detail-title" tabindex="-1">${current[2]}</h2><p>${current[3]}</p></div></div><div class="settings-detail-body">${panel(activeSection)}</div>`:''}
        </section>
      </div>`;
    renderSettingsNav();
    const search=document.getElementById('settings-search');
    search.oninput=()=>{settingsSearch=search.value;renderSettingsNav();};
    const back=document.querySelector('.settings-back');if(back)back.onclick=()=>{
      const previous=activeSection;activeSection='';renderSettings();
      entrarDesde(document.querySelector('.settings-shell'),'pop');
      const option=document.querySelector(`[data-settings-section="${previous}"]`);
      (option||document.getElementById('settings-search')).focus();
    };
    etiquetarCamposDelModal(document.getElementById('modal-content'));
    if(activeSection==='academico'){
      renderSettingsSemGrid();renderSettingsTenantGrid();renderSettingsCarreraGrid();
      const malla=document.getElementById('s-malla');
      if(malla)malla.onclick=()=>{
        if(settingsTenant!==S.tenant||settingsCarrera!==S.carrera||settingsSem!==S.careerSemestre
          ||settingsCarreraNombre!==(S.carreraNombre||null)||settingsName!==S.userName){
          showToast('Guarda tus cambios en Ajustes antes de ver tu malla.');return;
        }
        openMallaModal();
      };
    }
    if(activeSection==='apariencia'){renderModoGrid();renderAcentoGrid();renderFondoGrid();}
    if(activeSection==='calendario'&&currentUser)pintarFeedCalendario();
    if(activeSection==='calendario'&&canvasDisponible())pintarCanvasAjustes();
    if(activeSection==='calendario'&&canvasIcsDisponible())pintarCanvasIcsAjustes();
    if(activeSection==='datos'&&currentUser&&typeof pintarCompartidosProfesor==='function')pintarCompartidosProfesor();
    // Al SALIR de la pantalla la URL se olvida: es una llave y no tiene por qué
    // seguir viva en memoria mientras alguien anda en Apariencia.
    if(activeSection!=='agentes')olvidarUrlAgente();
    if(activeSection==='agentes'&&currentUser){pintarUrlAgente();cargarAgentesConectados();}
    if(activeSection==='perfil'){
      const inp=document.getElementById('s-name');
      if(inp){
        inp.addEventListener('input',()=>{settingsName=inp.value;if(settingsNameError){settingsNameError='';limpiarErrorCampo('s-name','s-name-error');}checkSave();});
        inp.addEventListener('keydown',e=>{if(e.key==='Enter')window.saveSettings();});
        enfocarEnHoja(inp,()=>inp.select());
      }
    }
  }
  renderSettings();
  // Ajustes se dibuja dentro de un cierre, así que desde fuera no hay cómo
  // repintarlo. Esta referencia es la puerta: la usa la postulación de profesor
  // para que al volver del modal la sección muestre "en revisión" y no siga
  // ofreciendo postular.
  _repintarSettings=renderSettings;
  openModal();

  function checkSave(){
    const btn=document.getElementById('s-save-btn');
    // El nombre se valida al guardar para poder explicar qué falta. Dejar el
    // botón apagado convertía Enter y el toque en una acción que no respondía.
    if(btn){btn.disabled=false;btn.removeAttribute('aria-disabled');}
  }
  function renderModoGrid(){
    const g=document.getElementById('s-modo-grid');if(!g)return;g.innerHTML='';
    // 'sistema' primero: es el default y lo que la mayoría quiere.
    [['sistema','Sistema','Como tu dispositivo'],['claro','Claro',''],['oscuro','Oscuro','']]
      .forEach(([val,nom,sub])=>{
        const b=document.createElement('button');
        b.type='button';
        b.className='modo-opt'+(modoColor()===val?' sel':'');
        b.innerHTML=`<span class="modo-opt-name">${esc(nom)}</span>${sub?`<span class="modo-opt-sub">${esc(sub)}</span>`:''}`;
        b.onclick=()=>setModo(val);
        g.appendChild(b);
      });
  }
  window.renderModoGrid=renderModoGrid;
  function renderAcentoGrid(){
    const g=document.getElementById('s-acento-grid');if(!g)return;g.innerHTML='';
    Object.entries(ACENTOS).forEach(([key,cfg])=>{
      const b=document.createElement('button');
      b.type='button';b.className='accent-opt'+(S.acento===key?' sel':'');
      b.setAttribute('role','radio');b.setAttribute('aria-checked',S.acento===key?'true':'false');
      b.setAttribute('aria-label',cfg.nombre);
      b.innerHTML=`<span class="accent-swatch" style="--swatch-light:${esc(cfg.primary)};--swatch-dark:${esc(cfg.darkPrimary)}"></span><span>${esc(cfg.nombre)}</span>`;
      b.onclick=()=>setAcento(key);g.appendChild(b);
    });
  }
  window.renderAcentoGrid=renderAcentoGrid;
  function renderFondoGrid(){
    const g=document.getElementById('s-fondo-grid');if(!g)return;g.innerHTML='';
    Object.entries(FONDOS).forEach(([key,cfg])=>{
      const b=document.createElement('button');
      b.type='button';b.className='fondo-opt'+(S.fondo===key?' sel':'');
      b.setAttribute('role','radio');b.setAttribute('aria-checked',S.fondo===key?'true':'false');
      b.setAttribute('aria-label',cfg.nombre);
      b.innerHTML=`<span class="fondo-swatch" style="--swatch-light:${esc(cfg.claro.bg)};--swatch-dark:${esc(cfg.oscuro.bg)}"></span><span>${esc(cfg.nombre)}</span>`;
      b.onclick=()=>setFondo(key);g.appendChild(b);
    });
  }
  window.renderFondoGrid=renderFondoGrid;
  function renderSettingsSemGrid(){
    const g=document.getElementById('s-sem-grid');if(!g)return;g.innerHTML='';
    const total=semestresDeCarrera(settingsTenant,settingsCarrera);
    if(settingsSem>total)settingsSem=total;
    repintarAlCargarMallas(settingsTenant,renderSettingsSemGrid);
    for(let i=1;i<=total;i++){
      const b=document.createElement('button');b.className='sem-btn'+(i===settingsSem?' sel':'');
      b.textContent=i+'°';b.onclick=()=>{settingsSem=i;renderSettingsSemGrid();};g.appendChild(b);
    }
  }
  // Universidad: cambia el tema al instante (preview) y recarga las carreras.
  // Solo se persiste al tocar "Guardar cambios".
  function renderSettingsTenantGrid(){
    const g=document.getElementById('s-tenant-grid');if(!g)return;g.innerHTML='';
    tenantsVisibles(settingsTenant).forEach(([code,cfg])=>{
      const b=document.createElement('button');
      b.className='s-tenant-btn'+(code===settingsTenant?' sel':'');
      b.innerHTML=`<span class="s-tenant-name">${esc(cfg.short)}</span>`;
      b.title=cfg.label||cfg.name;
      b.onclick=()=>{
        settingsTenant=code;
        // La carrera elegida puede no existir en la universidad nueva
        if(!carrerasFor(code)[settingsCarrera]){settingsCarrera=null;settingsCarreraNombre=null;}
        settingsCarreraFiltro='';
        renderSettingsTenantGrid();renderSettingsCarreraGrid();
      };
      g.appendChild(b);
    });
  }
  // Ajustes mostraba `carrerasFor()`, que en la UC son TRES opciones: plan común,
  // Comercial y "Otra". El onboarding, en cambio, ofrece las 71 declarables. Así
  // que quien entraba por el onboarding declarando Odontología y después abría
  // Ajustes no encontraba su carrera por ninguna parte.
  //
  // Con 71 opciones la lista no se recorre con el dedo, así que va con buscador,
  // el mismo que ya existe en el paso 3. Y como muchas no tienen malla, se guarda
  // también el NOMBRE: el código es lo que carga los ramos, el nombre es lo único
  // que hay cuando no tenemos su malla.
  window._sFiltro=v=>{settingsCarreraFiltro=v;renderSettingsCarreraGrid();};
  function renderSettingsCarreraGrid(){
    // La carrera decide cuántos semestres se ofrecen (12 en Medicina).
    renderSettingsSemGrid();
    const g=document.getElementById('s-carrera-grid');if(!g)return;g.innerHTML='';
    const q=normName(settingsCarreraFiltro||'');
    const todas=carrerasDeclarables(settingsTenant);
    // Sin búsqueda se muestra SOLO la carrera elegida. Setenta y un botones
    // empujaban el resto de Ajustes fuera de la pantalla para cambiar un dato que
    // casi nadie toca dos veces. La lista completa aparece al escribir, igual que
    // el buscador de ramos, y el campo de arriba dice qué hacer para verla.
    const elegidaDe=c=>c.malla?c.malla===settingsCarrera:(!settingsCarrera&&c.n===settingsCarreraNombre);
    const vistas=q?todas.filter(c=>normName(c.n).includes(q)):todas.filter(elegidaDe);
    if(!q&&!vistas.length&&settingsCarreraNombre){
      // Declaró algo que no está en la lista oficial: igual tiene que verlo.
      const b=document.createElement('button');
      b.className='carrera-opt sel';b.textContent=settingsCarreraNombre;
      b.onclick=()=>{const i=document.getElementById('s-carrera-buscar');if(i)i.focus();};
      g.appendChild(b);
    }
    vistas.forEach(c=>{
      const elegida=c.malla?c.malla===settingsCarrera:(!settingsCarrera&&c.n===settingsCarreraNombre);
      const b=document.createElement('button');
      b.className='carrera-opt'+(elegida?' sel':'');
      b.textContent=c.n;
      b.onclick=()=>{settingsCarrera=c.malla||null;settingsCarreraNombre=c.n;renderSettingsCarreraGrid();};
      g.appendChild(b);
    });
    // Misma salida que en el onboarding: la lista oficial envejece y nadie puede
    // quedarse sin poder declarar lo que estudia.
    if(q){
      const b=document.createElement('button');
      b.className='carrera-opt'+(!settingsCarrera&&settingsCarreraFiltro.trim()===settingsCarreraNombre?' sel':'');
      b.innerHTML='Usar «'+esc(settingsCarreraFiltro.trim())+'»';
      b.onclick=()=>{settingsCarrera=null;settingsCarreraNombre=settingsCarreraFiltro.trim();renderSettingsCarreraGrid();};
      g.appendChild(b);
    }
  }
  setTimeout(()=>{
    const inp=document.getElementById('s-name');
    if(inp){
      inp.addEventListener('input',checkSave);
      inp.addEventListener('keydown',e=>{if(e.key==='Enter')window.saveSettings();});
    }
  },120);
  window.saveSettings=function(){
    const name=settingsName.trim();
    if(!name){
      settingsNameError='Escribe tu nombre para guardar los cambios.';
      mostrarErrorCampo('s-name','s-name-error',settingsNameError);
      return false;
    }
    const cambioUni=settingsTenant!==S.tenant;
    S.userName=name;S.careerSemestre=settingsSem;S.carrera=settingsCarrera;S.carreraNombre=settingsCarreraNombre;S.tenant=settingsTenant;
    selectedTenant=settingsTenant;
    applyTheme();
    save();syncProfile();track('settings_saved',{cambio_universidad:cambioUni});
    closeModal();renderHome();renderStats();renderAgenda();
    showToast('Cambios guardados');
  };
}

// El correo es una alternativa al formulario, no una segunda cuenta opaca: el
// borrador lleva contexto que la persona reconoce y que nos ayuda a ubicarla.
// No van correo, UID, ramos ni notas: el remitente ya llega en el mail y los
// otros datos serían innecesarios o incómodos si la persona lo reenvía.
