
// ─── MENÚ DE USUARIO ─────────────────────────────────────────────────────────
function userInitial(){
  const n=(S.userName||'').trim();
  if(n)return n[0].toUpperCase();
  const e=currentUser&&currentUser.email?currentUser.email.trim():'';
  return e?e[0].toUpperCase():'?';
}
// Hay un avatar en Inicio y otro en Clases y en Alumnos: una cuenta de profesor
// (#697) no tiene Inicio y sin el suyo no llegaría a Ajustes ni a cerrar sesión.
// El menú se abre bajo el que se tocó.
let _avatarMenu=null;
function avatarMenu(){return (_avatarMenu&&_avatarMenu.isConnected&&_avatarMenu)||document.getElementById('user-avatar');}
function refreshAvatar(){
  document.querySelectorAll('.avatar-btn').forEach(av=>{av.textContent=userInitial();});
}
function toggleUserMenu(ev){
  if(ev)ev.stopPropagation();
  if(ev&&ev.currentTarget&&ev.currentTarget.classList&&ev.currentTarget.classList.contains('avatar-btn'))_avatarMenu=ev.currentTarget;
  const m=document.getElementById('user-menu');
  m.classList.contains('open')?closeUserMenu():openUserMenu();
}
function openUserMenu(){
  const m=document.getElementById('user-menu');
  const b=document.getElementById('user-menu-backdrop');
  const av=avatarMenu();
  // Contenido dinámico
  document.getElementById('um-name').textContent=S.userName||'Tu cuenta';
  const mail=document.getElementById('um-mail');
  mail.textContent=currentUser&&currentUser.email?currentUser.email:'Sesión local';
  // Archivar solo tiene sentido con ramos cargados
  const arch=document.getElementById('um-archivar');
  if(arch)arch.style.display=S.ramos.length?'flex':'none';
  // El lector reconoce el catálogo UC; no es una herramienta de profesor.
  const horario=document.getElementById('um-horario');
  if(horario)horario.hidden=esCuentaProfesor()||S.tenant!=='uc';
  // Cargar el historial desde la ficha: solo donde hay lector (hoy, la UC).
  const ficha=document.getElementById('um-ficha');
  if(ficha)ficha.hidden=!avanceCurricularDisponible();
  const calculadora=document.getElementById('um-calculadora');
  if(calculadora)calculadora.style.display=esCuentaProfesor()?'none':'flex';
  // Sin sesión no hay nada que cerrar
  const out=document.getElementById('um-logout'),sep=document.getElementById('um-sep-logout');
  const hay=!!currentUser;
  if(out)out.style.display=hay?'flex':'none';
  if(sep)sep.style.display=hay?'block':'none';

  m.classList.add('open');b.classList.add('open');
  if(av)av.setAttribute('aria-expanded','true');

  // Posicionar bajo el avatar, alineado a su borde derecho y dentro del viewport
  if(av){
    const r=av.getBoundingClientRect();
    const w=m.offsetWidth||250;
    const vw=window.innerWidth||document.documentElement.clientWidth||375;
    let left=r.right-w;
    left=Math.max(10,Math.min(left,vw-w-10));
    m.style.left=left+'px';
    m.style.top=(r.bottom+8)+'px';
  }
}
function closeUserMenu(){
  document.getElementById('user-menu').classList.remove('open');
  document.getElementById('user-menu-backdrop').classList.remove('open');
  const av=avatarMenu();
  if(av)av.setAttribute('aria-expanded','false');
}
// Cierra el menú y ejecuta la acción (deja que corra la animación de cierre)
function umGo(fn){
  closeUserMenu();
  // El menú deja de ser visible antes de abrir la hoja. Conserva su origen
  // para que el cierre de la siguiente vista no devuelva el foco al body.
  const origen=avatarMenu();
  if(origen&&origen.isConnected){try{origen.focus({preventScroll:true});}catch(e){origen.focus();}}
  setTimeout(()=>{try{fn();}catch(e){}},60);
}

// Herramienta aparte del editor de evaluaciones (#735). Solo la nota calculada
// entra a S; los dos puntajes viven en la hoja y se descartan al cerrarla.
let _resultadoCalculadoraApp=null,_destinosCalculadoraApp=[],_exigenciaEditadaCalculadoraApp=false;
function numeroCalculadoraApp(valor){
  const texto=String(valor??'').trim().replace(',','.');
  if(!/^\d+(?:\.\d+)?$/.test(texto))return NaN;
  const n=Number(texto);
  return Number.isFinite(n)?n:NaN;
}
function formatoCalculadoraApp(n,decimales){
  return Number(n).toFixed(decimales).replace('.',',');
}
function ramoCalculadoraApp(){
  const id=document.getElementById('calc-app-ramo')?.value;
  return S.ramos.find(r=>r.id===id)||null;
}
function exigenciaRamoCalculadoraApp(r){
  const e=Number(r?.exigenciaPuntaje);
  return e>=1&&e<=99?e:50;
}
function editarExigenciaCalculadoraApp(){
  _exigenciaEditadaCalculadoraApp=true;
  calcularNotaApp();
}
function recordarExigenciaCalculadoraApp(){
  const r=ramoCalculadoraApp();
  const e=numeroCalculadoraApp(document.getElementById('calc-app-exigencia')?.value);
  if(!r||!(e>=1&&e<=99))return;
  if(e!==exigenciaRamoCalculadoraApp(r)||
    (e===50&&Object.prototype.hasOwnProperty.call(r,'exigenciaPuntaje')&&r.exigenciaPuntaje!==50)){
    r.exigenciaPuntaje=e;save();
  }
  _exigenciaEditadaCalculadoraApp=false;
}
function destinosCalculadoraApp(r){
  const destinos=[];
  for(const cat of r?.categorias||[]){
    // La ficha tampoco permite escribir encima de una ausencia justificada ni
    // de una evaluación que quedó oculta por eximición confirmada.
    const ausencia=ausenciaDeEvaluacion(r,cat);
    if(ausenciaActivaCalculadoraApp(ausencia)||categoriaEximida(r,cat))continue;
    if(!cat.directNota)continue;
    if(Number.isInteger(cat.slots)&&cat.slots>1){
      const ultimo=(cat.notas||[]).reduce((m,n)=>Number.isInteger(n.slot)?Math.max(m,n.slot):m,-1);
      for(let slot=0;slot<Math.max(cat.slots,ultimo+1);slot++){
        destinos.push({catId:cat.id,slot,etiqueta:`${cat.nombre} › ${etiquetaCasilla(r,cat,slot)}`,nota:(cat.notas||[]).find(n=>n.slot===slot)});
      }
    }else destinos.push({catId:cat.id,slot:null,etiqueta:cat.nombre,nota:(cat.notas||[])[0]});
  }
  return destinos;
}
function ausenciaActivaCalculadoraApp(a){return !!(a?.declarada&&!a.inactiva);}
function seleccionarRamoCalculadoraApp(){
  const r=ramoCalculadoraApp();
  const guardada=Number(r?.exigenciaPuntaje);
  if(r&&guardada>=1&&guardada<=99){
    document.getElementById('calc-app-exigencia').value=String(guardada);
    _exigenciaEditadaCalculadoraApp=false;
  }else if(!_exigenciaEditadaCalculadoraApp||!r){
    document.getElementById('calc-app-exigencia').value='50';
    _exigenciaEditadaCalculadoraApp=false;
  }
  if(r&&_exigenciaEditadaCalculadoraApp)recordarExigenciaCalculadoraApp();
  _destinosCalculadoraApp=destinosCalculadoraApp(r);
  const selector=document.getElementById('calc-app-destino');
  selector.innerHTML='<option value="">Elige una evaluación o casilla</option>'+
    _destinosCalculadoraApp.map((d,i)=>`<option value="${i}">${esc(d.etiqueta)}</option>`).join('');
  selector.disabled=!_destinosCalculadoraApp.length;
  const aviso=document.getElementById('calc-app-destino-aviso');
  aviso.textContent=r&&!_destinosCalculadoraApp.length
    ?'Este ramo aún no tiene una evaluación simple o casilla donde guardar la nota.'
    :'Las secciones de varias notas se editan en la ficha del ramo.';
  calcularNotaApp();
}
function calcularNotaApp(){
  const campo=id=>document.getElementById('calc-app-'+id);
  const p=numeroCalculadoraApp(campo('puntaje').value),t=numeroCalculadoraApp(campo('total').value);
  const e=numeroCalculadoraApp(campo('exigencia').value);
  const nmin=numeroCalculadoraApp(campo('nmin').value),naprob=numeroCalculadoraApp(campo('naprob').value),nmax=numeroCalculadoraApp(campo('nmax').value);
  const datos={puntaje:p,total:t,exigencia:e,nmin,naprob,nmax};
  for(const id of Object.keys(datos))campo(id).removeAttribute('aria-invalid');
  let error='',mal=[];
  const hayP=campo('puntaje').value.trim()!=='',hayT=campo('total').value.trim()!=='';
  if(!(e>=1&&e<=99)){error='La exigencia va entre 1 % y 99 %.';mal=['exigencia'];}
  else if(!(nmin>=1&&nmin<naprob&&naprob<nmax&&nmax<=7)){
    error='La escala debe subir desde 1,0 hasta 7,0.';mal=['nmin','naprob','nmax'];
  }else if(hayT&&!(t>0)){error='El puntaje total debe ser mayor que cero.';mal=['total'];}
  else if(hayP&&!(p>=0)){error='Escribe un puntaje válido, por ejemplo 23,5.';mal=['puntaje'];}
  else if(hayP&&hayT&&p>t){error='Tu puntaje no puede superar el total.';mal=['puntaje'];}
  for(const id of mal)campo(id).setAttribute('aria-invalid','true');
  const resultado=!error&&hayP&&hayT?gh_notaDesdePuntaje(p,t,{exigencia:e/100,nmin,naprob,nmax,truncar:campo('truncar').checked}):null;
  _resultadoCalculadoraApp=resultado;
  campo('error').textContent=error;
  campo('nota').textContent=resultado?formatoCalculadoraApp(resultado.nota,1):'–';
  campo('detalle').textContent=resultado
    ?`Con ${String(e).replace('.',',')} % de exigencia, el ${formatoCalculadoraApp(naprob,1)} está en ${formatoCalculadoraApp(resultado.puntajeAprobacion,2)} de ${formatoCalculadoraApp(t,2)} puntos.`
    :(error?'Corrige el dato marcado para ver tu nota.':'Escribe tu puntaje y el total de la prueba.');
  const destino=campo('destino'),seleccion=destino.value;
  const elegido=seleccion!==''?_destinosCalculadoraApp[Number(seleccion)]:null;
  campo('guardar').disabled=!resultado||!ramoCalculadoraApp()||!elegido;
  campo('guardar-aviso').textContent=elegido?.nota?.valor!=null
    ?`Guardar reemplazará la nota que ya tiene ${elegido.etiqueta}.`
    :'El puntaje obtenido y el total no se guardan.';
  pintarTablaCalculadoraApp({error,t,p:hayP?p:null,escala:{exigencia:e/100,nmin,naprob,nmax,truncar:campo('truncar').checked}});
  return resultado;
}
// La tabla sale abierta y aparece apenas hay un total: sirve para ver toda la
// escala antes de saber el puntaje. El incremento lo elige la persona (de a 1 o
// de a 0,5, u otro); la fila de su puntaje, si calza, va marcada.
let _pasoCalculadoraApp=1;
function pintarTablaCalculadoraApp({error,t,p,escala}){
  const tabla=document.getElementById('calc-app-tabla'),aviso=document.getElementById('calc-app-paso-aviso');
  if(!tabla)return;
  if(error||!(t>0)){tabla.innerHTML='';if(aviso)aviso.textContent=t>0?'':'Escribe el puntaje total para ver la tabla.';return;}
  const {paso,ajustado,filas}=gh_tablaPuntaje(t,_pasoCalculadoraApp);
  if(aviso)aviso.textContent=ajustado?`Con ${puntosTablaCalculadoraApp(t)} puntos la tabla va de a ${puntosTablaCalculadoraApp(paso)}.`:'';
  tabla.innerHTML=filas.map(x=>{
    const r=gh_notaDesdePuntaje(x,t,escala);if(!r)return '';
    const actual=p!==null&&Math.abs(p-x)<1e-9;
    return `<tr${actual?' class="calc-fila-actual" aria-current="true"':''}><td>${puntosTablaCalculadoraApp(x)}</td><td>${formatoCalculadoraApp(r.nota,1)}</td></tr>`;
  }).join('');
}
// Puntos como se escriben: 1, 2,5, 7,25. Nada de "1,00".
function puntosTablaCalculadoraApp(x){return String(Math.round(x*100)/100).replace('.',',');}
function elegirPasoCalculadoraApp(valor){
  _pasoCalculadoraApp=valor;
  const otro=document.getElementById('calc-app-paso');if(otro){otro.value='';otro.removeAttribute('aria-invalid');}
  document.querySelectorAll('.calc-paso-btn').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.paso)===valor)));
  calcularNotaApp();
}
function escribirPasoCalculadoraApp(input){
  const crudo=input.value.trim();
  const v=numeroCalculadoraApp(crudo);
  const valido=crudo!==''&&v>0;
  input.setAttribute('aria-invalid',String(crudo!==''&&!valido));
  _pasoCalculadoraApp=valido?v:1;
  document.querySelectorAll('.calc-paso-btn').forEach(b=>b.setAttribute('aria-pressed',String(!valido&&Number(b.dataset.paso)===1)));
  calcularNotaApp();
}
function openCalculadoraApp(){
  if(esCuentaProfesor())return;
  _resultadoCalculadoraApp=null;_destinosCalculadoraApp=[];_exigenciaEditadaCalculadoraApp=false;_pasoCalculadoraApp=1;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Calculadora de nota</div>
    <p class="modal-desc">Convierte el puntaje de una prueba a nota. Puedes calcular sin elegir un ramo.</p>
    <label class="modal-label" style="font-size:.8125rem;" for="calc-app-puntaje">Puntaje obtenido</label>
    <input class="modal-input" id="calc-app-puntaje" type="text" inputmode="decimal" autocomplete="off" placeholder="Por ejemplo, 25" oninput="calcularNotaApp()">
    <label class="modal-label" style="font-size:.8125rem;" for="calc-app-total">Puntaje total</label>
    <input class="modal-input" id="calc-app-total" type="text" inputmode="decimal" autocomplete="off" placeholder="Por ejemplo, 50" oninput="calcularNotaApp()">
    <label class="modal-label" style="font-size:.8125rem;" for="calc-app-exigencia">Exigencia (%)</label>
    <input class="modal-input" id="calc-app-exigencia" type="text" inputmode="decimal" value="50" oninput="editarExigenciaCalculadoraApp()" onchange="recordarExigenciaCalculadoraApp()">
    <details style="margin-bottom:12px;"><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;">Más opciones de escala</summary>
      <label class="modal-label" style="font-size:.8125rem;" for="calc-app-nmin">Nota mínima</label><input class="modal-input" id="calc-app-nmin" type="text" inputmode="decimal" value="1" oninput="calcularNotaApp()">
      <label class="modal-label" style="font-size:.8125rem;" for="calc-app-naprob">Nota de aprobación</label><input class="modal-input" id="calc-app-naprob" type="text" inputmode="decimal" value="4" oninput="calcularNotaApp()">
      <label class="modal-label" style="font-size:.8125rem;" for="calc-app-nmax">Nota máxima</label><input class="modal-input" id="calc-app-nmax" type="text" inputmode="decimal" value="7" oninput="calcularNotaApp()">
      <label style="min-height:44px;display:flex;align-items:center;gap:10px;"><input id="calc-app-truncar" type="checkbox" onchange="calcularNotaApp()"> Truncar en vez de redondear</label>
    </details>
    <p id="calc-app-error" role="alert" style="color:var(--red);font-size:.8125rem;min-height:1.2em;"></p>
    <div aria-live="polite" style="padding:16px;margin:8px 0 14px;background:var(--muted);border-radius:12px;">
      <div style="font-size:.8125rem;color:var(--fg2);">Tu nota</div>
      <strong id="calc-app-nota" style="display:block;font-size:2rem;font-variant-numeric:tabular-nums;">–</strong>
      <div id="calc-app-detalle" style="font-size:.8125rem;color:var(--fg2);">Escribe tu puntaje y el total de la prueba.</div>
    </div>
    <details id="calc-app-tabla-det" class="calc-tabla" open>
      <summary>Tabla de puntaje a nota</summary>
      <div class="calc-paso" role="group" aria-label="Incremento de la tabla">
        <span class="calc-paso-label">De a</span>
        <button type="button" class="calc-paso-btn" data-paso="1" aria-pressed="true" onclick="elegirPasoCalculadoraApp(1)">1</button>
        <button type="button" class="calc-paso-btn" data-paso="0.5" aria-pressed="false" onclick="elegirPasoCalculadoraApp(0.5)">0,5</button>
        <input id="calc-app-paso" class="calc-paso-otro" type="text" inputmode="decimal" autocomplete="off" placeholder="Otro" aria-label="Otro incremento, en puntos" oninput="escribirPasoCalculadoraApp(this)">
        <span class="calc-paso-label">puntos</span>
      </div>
      <p id="calc-app-paso-aviso" class="calc-paso-aviso" aria-live="polite"></p>
      <div class="calc-tabla-scroll"><table><thead><tr><th scope="col">Puntos</th><th scope="col">Nota</th></tr></thead><tbody id="calc-app-tabla"></tbody></table></div>
    </details>
    <label class="modal-label" style="font-size:.8125rem;" for="calc-app-ramo">Guardar en un ramo</label>
    <select id="calc-app-ramo" class="feedback-select" style="min-height:44px;" onchange="seleccionarRamoCalculadoraApp()">
      <option value="">Solo calcular</option>${S.ramos.map(r=>`<option value="${esc(r.id)}">${esc(r.nombre)}</option>`).join('')}
    </select>
    <label class="modal-label" style="font-size:.8125rem;" for="calc-app-destino">Evaluación o casilla</label>
    <select id="calc-app-destino" class="feedback-select" style="min-height:44px;" onchange="calcularNotaApp()" disabled><option value="">Elige un ramo primero</option></select>
    <p id="calc-app-destino-aviso" class="modal-desc">Las secciones de varias notas se editan en la ficha del ramo.</p>
    <p id="calc-app-guardar-aviso" class="modal-desc">El puntaje obtenido y el total no se guardan.</p>
    <div class="modal-btns" style="position:sticky;bottom:0;background:var(--bg2);padding:8px 0;z-index:1;"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button>
      <button type="button" class="btn-confirm" id="calc-app-guardar" onclick="guardarNotaCalculadoraApp()" disabled>Guardar como nota</button></div>`;
  openModal();calcularNotaApp();
}
function guardarNotaCalculadoraApp(){
  const resultado=calcularNotaApp(),r=ramoCalculadoraApp();
  const valor=document.getElementById('calc-app-destino')?.value;
  const destino=valor!==''?_destinosCalculadoraApp[Number(valor)]:null;
  const cat=r?.categorias.find(c=>c.id===destino?.catId);
  if(!resultado||!r||!destino||!cat||!cat.directNota||
    ausenciaActivaCalculadoraApp(ausenciaDeEvaluacion(r,cat))||categoriaEximida(r,cat))return;
  const e=numeroCalculadoraApp(document.getElementById('calc-app-exigencia').value);
  // Campo opcional y aditivo: si no se eligió otra exigencia, las cuentas
  // antiguas siguen sin esta clave y reciben 50 % por defecto.
  if(e!==50||Object.prototype.hasOwnProperty.call(r,'exigenciaPuntaje'))r.exigenciaPuntaje=e;
  const nota=resultado.nota.toFixed(1);
  document.getElementById('calc-app-guardar').disabled=true;
  closeModal();showTab('home');openRamo(r.id);
  if(destino.slot===null)setDirectNota(cat.id,nota);
  else setSlotNota(cat.id,destino.slot,nota);
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&document.getElementById('user-menu').classList.contains('open'))closeUserMenu();
  if(e.key==='Escape'&&document.getElementById('menu-flotante'))cerrarMenu();
});

// ─── Menús desplegables ─────────────────────────────────────────────────────
// Un menú que se abre bajo su botón, como los de iOS: el orden de Inicio y el
// "⋯" del ramo. Tiene el aspecto del menú de la cuenta. Antes el orden cambiaba
// con cada toque sin mostrar las opciones, y editar y eliminar el ramo eran
// dos botones sueltos, el de eliminar siempre a la vista y en rojo.
// items: {texto, icono?, marcado?, peligro?, accion} o 'sep' para separar.
let _botonMenu=null;
const CHECK_MENU='<svg class="ic menu-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
function abrirMenu(boton,items){
  cerrarMenu();
  const fondo=document.createElement('div');
  fondo.id='menu-flotante-fondo';fondo.className='user-menu-backdrop open';fondo.onclick=cerrarMenu;
  const m=document.createElement('div');
  m.id='menu-flotante';m.className='user-menu open menu-flotante';m.setAttribute('role','menu');
  // Si alguna opción lleva ✓, todas guardan su lugar y el texto queda alineado.
  const conMarcas=items.some(it=>it!=='sep'&&it.marcado!==undefined);
  items.forEach(it=>{
    if(it==='sep'){const s=document.createElement('div');s.className='user-menu-sep';m.appendChild(s);return;}
    const b=document.createElement('button');
    b.type='button';b.className='user-menu-item'+(it.peligro?' danger':'');
    const radio=it.marcado!==undefined;
    b.setAttribute('role',radio?'menuitemradio':'menuitem');
    if(radio)b.setAttribute('aria-checked',String(!!it.marcado));
    // Como en iOS, el ✓ va antes del texto y las otras opciones guardan su lugar.
    b.innerHTML=`${it.marcado?CHECK_MENU:conMarcas?'<span class="menu-check" aria-hidden="true"></span>':''}${it.icono||''}<span class="menu-texto">${esc(it.texto)}</span>`;
    b.onclick=()=>{cerrarMenu();setTimeout(()=>{try{it.accion();}catch(e){}},60);};
    m.appendChild(b);
  });
  document.body.append(fondo,m);
  _botonMenu=boton;boton.setAttribute('aria-expanded','true');
  // Bajo el botón y alineado a su borde derecho; si no cabe abajo, encima.
  const r=boton.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight;
  const vw=window.innerWidth,vh=window.innerHeight;
  m.style.left=Math.max(10,Math.min(r.right-w,vw-w-10))+'px';
  m.style.top=(r.bottom+8+h>vh-10?Math.max(10,r.top-8-h):r.bottom+8)+'px';
  const primero=m.querySelector('[aria-checked="true"]')||m.querySelector('button');
  if(primero){try{primero.focus({preventScroll:true});}catch(e){}}
}
function cerrarMenu(){
  const m=document.getElementById('menu-flotante');if(!m)return;
  m.remove();const f=document.getElementById('menu-flotante-fondo');if(f)f.remove();
  const b=_botonMenu;_botonMenu=null;
  if(b){b.setAttribute('aria-expanded','false');if(b.isConnected){try{b.focus({preventScroll:true});}catch(e){}}}
}
const ORDENES_RAMOS=[['manual','Manual'],['avg','Por nota'],['name','A-Z']];
function abrirMenuOrden(boton){
  abrirMenu(boton,ORDENES_RAMOS.map(([modo,texto])=>({texto,marcado:S.sortMode===modo,
    accion:()=>{S.sortMode=modo;save();renderHome();}})));
}
function abrirMenuRamo(boton){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const ic=d=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const oficial=r.categorias.length&&r.origen&&r.origen.tenant&&presetRamo(r.nombre,r.origen.tenant,r.origen.carrera);
  abrirMenu(boton,[
    {texto:'Editar ramo',icono:ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),accion:openEditRamoModal},
    {texto:'Editar evaluaciones',icono:ic('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>'),accion:openPautaManualModal},
    ...(oficial?[{texto:'Reportar pauta',icono:ic('<path d="M4 21V4h12l-1.5 4L16 12H4"/>'),accion:()=>openReportModal(r.id)}]:[]),
    'sep',
    {texto:'Eliminar ramo',peligro:true,icono:ic('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>'),accion:confirmDeleteRamo}
  ]);
}
