// ─── VERIFICACIÓN EN DOS PASOS ──────────────────────────────────────────────
//
// Además de la contraseña, un código de seis dígitos de una app como Google
// Authenticator (TOTP de Supabase). Hoy la pide solo la página de
// administración: AGENTS.md la exige para un panel administrativo, y el
// servidor revisa que la sesión haya pasado por acá (aal2) antes de entregar
// nada. No se ofrece a todos todavía a propósito: el inicio de sesión no la
// pide, así que activarla no protegería una cuenta de estudiante y sería una
// promesa falsa.
async function estadoDosPasos(){
  const mfa=supabaseClient&&supabaseClient.auth&&supabaseClient.auth.mfa;
  if(!mfa||!currentUser)return {ok:false,error:'Inicia sesión para seguir.'};
  try{
    const [lista,nivel]=await Promise.all([mfa.listFactors(),mfa.getAuthenticatorAssuranceLevel()]);
    if(lista.error||nivel.error)return {ok:false,error:'No pudimos revisar tu verificación en dos pasos.'};
    const verificados=(lista.data&&lista.data.totp||[]).filter(f=>f.status==='verified');
    return {ok:true,factor:verificados[0]||null,nivel:nivel.data&&nivel.data.currentLevel||'aal1'};
  }catch(e){return {ok:false,error:'No pudimos revisar tu verificación en dos pasos.'};}
}
// Un intento anterior que quedó a medias deja un factor sin verificar: se
// borra antes de empezar otro, para que no se acumulen.
async function iniciarDosPasos(){
  const mfa=supabaseClient.auth.mfa;
  try{
    const lista=await mfa.listFactors();
    for(const f of (lista.data&&lista.data.all||[]).filter(f=>f.factor_type==='totp'&&f.status!=='verified'))
      await mfa.unenroll({factorId:f.id});
    const {data,error}=await mfa.enroll({factorType:'totp'});
    if(error||!data||!data.totp)return {ok:false,error:'No pudimos preparar tu código. Intenta de nuevo.'};
    return {ok:true,factorId:data.id,qr:data.totp.qr_code,secreto:data.totp.secret};
  }catch(e){return {ok:false,error:'No pudimos preparar tu código. Intenta de nuevo.'};}
}
function codigoDosPasosValido(codigo){return /^\d{6}$/.test(String(codigo||'').replace(/\s/g,''));}
async function verificarCodigoDosPasos(factorId,codigo){
  const limpio=String(codigo||'').replace(/\s/g,'');
  if(!codigoDosPasosValido(limpio))return {ok:false,error:'El código tiene 6 números.'};
  try{
    const {error}=await supabaseClient.auth.mfa.challengeAndVerify({factorId,code:limpio});
    if(error)return {ok:false,error:'Ese código no sirve. Revisa que sea el que muestra tu app ahora.'};
    return {ok:true};
  }catch(e){return {ok:false,error:'No pudimos revisar el código. Intenta de nuevo.'};}
}
// La puerta: pinta en `raiz` lo que falte —activar la app o escribir el
// código— y llama a `alPasar` cuando la sesión quedó en aal2.
async function renderPuertaDosPasos(raiz,{alPasar,titulo='Verificación en dos pasos'}={}){
  if(!raiz)return;
  raiz.innerHTML=`<p class="profesor-info" role="status">Revisando tu verificación…</p>`;
  const e=await estadoDosPasos();
  if(!e.ok){raiz.innerHTML=`<p class="profesor-info" role="alert">${esc(e.error)}</p>`;return;}
  if(e.factor&&e.nivel==='aal2'){if(typeof alPasar==='function')alPasar();return;}
  const pedirCodigo=(factorId,intro,extra='')=>{
    raiz.innerHTML=`<div class="dos-pasos"><h3>${esc(titulo)}</h3>${intro}${extra}
      <form class="dos-pasos-form"><label class="modal-label" for="dos-pasos-codigo">Código de 6 números</label>
      <input id="dos-pasos-codigo" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required>
      <button class="btn-confirm" type="submit">Verificar</button>
      <p class="dos-pasos-estado" role="status" aria-live="polite"></p></form></div>`;
    const form=raiz.querySelector('.dos-pasos-form'),estado=raiz.querySelector('.dos-pasos-estado'),campo=raiz.querySelector('#dos-pasos-codigo');
    if(campo&&typeof campo.focus==='function')campo.focus();
    const boton=form.querySelector('button[type="submit"]');
    form.addEventListener('submit',async ev=>{
      ev.preventDefault();
      // Un código TOTP sirve una vez: el segundo envío lo daba por malo y abría
      // el panel dos veces.
      if(boton.disabled)return;
      boton.disabled=true;estado.textContent='Revisando…';
      const r=await verificarCodigoDosPasos(factorId,campo.value);
      if(!r.ok){estado.textContent=r.error;boton.disabled=false;return;}
      if(typeof alPasar==='function')alPasar();
    });
  };
  if(e.factor){
    pedirCodigo(e.factor.id,'<p class="profesor-info">Escribe el código que muestra tu app de verificación.</p>');
    return;
  }
  raiz.innerHTML=`<div class="dos-pasos"><h3>${esc(titulo)}</h3>
    <p class="profesor-info">Esta página muestra datos de todos los profesores, así que además de tu contraseña pide un código de una app como Google Authenticator o 1Password. Se configura una vez.</p>
    <button type="button" class="btn-confirm" id="dos-pasos-activar">Activar</button>
    <p class="dos-pasos-estado" role="status" aria-live="polite"></p></div>`;
  const activar=raiz.querySelector('#dos-pasos-activar');
  activar.addEventListener('click',async()=>{
    if(activar.disabled)return;
    activar.disabled=true;
    const estado=raiz.querySelector('.dos-pasos-estado');estado.textContent='Preparando…';
    const r=await iniciarDosPasos();
    if(!r.ok){estado.textContent=r.error;activar.disabled=false;return;}
    // El QR viene de Supabase como imagen data:, que la CSP ya permite. Solo se
    // acepta ese formato: nunca una URL que cargue algo de afuera.
    const qr=/^data:image\/svg\+xml/.test(String(r.qr||''))?`<img class="dos-pasos-qr" src="${esc(r.qr)}" alt="Código QR para tu app de verificación">`:'';
    pedirCodigo(r.factorId,'<p class="profesor-info">Escanea este código con tu app de verificación y escribe los 6 números que te muestra.</p>',
      `${qr}<p class="profesor-info">Si no puedes escanearlo, escribe esta clave en la app: <code class="dos-pasos-secreto">${esc(r.secreto||'')}</code></p>`);
  });
}

// boot() termina en showMainApp(), que llama a renderAgenda() — y esa vive en
// render-agenda.js, que se carga DESPUÉS de este archivo. Llamarlo acá mismo
// reventaba con un ReferenceError justo en medio de
// `renderHome();renderStats();renderAgenda()`, así que las tres pantallas
// quedaban montadas y showTab('home') nunca corría: se veían una encima de otra.
//
// Solo se notaba cuando supabaseClient es null, que es la rama local — la que
// existe precisamente para que la app siga sirviendo si el script de Supabase no
// carga (bloqueador, red, CDN caída). O sea: el camino de emergencia estaba roto.
//
// DOMContentLoaded corre cuando el parser ya ejecutó todos los <script> clásicos
// del documento, así que renderAgenda ya existe.
document.addEventListener('DOMContentLoaded',boot);
