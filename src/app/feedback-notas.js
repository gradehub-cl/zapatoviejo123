
// ─── MOMENTO DE LA NOTA ──────────────────────────────────────────────────────
// El cálculo ya ocurrió antes de llegar acá. Estas funciones solo representan
// visualmente el cambio para que el resultado no aparezca como un reemplazo
// silencioso. Mientras el número se mueve, su color corresponde al valor que
// se está mostrando; así el semáforo nunca comunica un estado falso.
let pendingGpaFeedback=null;
function movimientoReducido(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}
function duracionMovimiento(token){
  const raw=getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const n=parseFloat(raw);
  if(!Number.isFinite(n))return 0;
  return raw.endsWith('ms')?n:raw.endsWith('s')?n*1000:0;
}
function promedioMarkup(valor,tipo){
  const s=fmtPromedio(valor);const dot=s.indexOf('.');
  const decimal=tipo==='ramo'?'ramo-decimal':'gpa-decimal';
  return `${s.slice(0,dot)}<span class="${decimal}">${s.slice(dot)}</span>`;
}
function pintarPromedio(el,valor,tipo,efecto){
  el.innerHTML=promedioMarkup(valor,tipo);
  el.className=`${tipo==='ramo'?'ramo-num':'gpa-num'} ${colorClass(valor)}${claseNotaEspecial(valor)}${efecto?' '+efecto:''}`;
  el.style.setProperty('--grade-color',getColor(valor));
}
function cambioDeUmbral(antes,despues){return antes!==null&&despues!==null&&colorClass(antes)!==colorClass(despues);}
function cambioDePromedio(antes,despues){return antes!==null&&despues!==null&&Math.abs(antes-despues)>.0001;}
function animarPromedio(el,antes,despues,tipo){
  if(!el||despues===null)return;
  const cruzaUmbral=cambioDeUmbral(antes,despues);
  const duracion=duracionMovimiento('--motion-base');
  if(!cambioDePromedio(antes,despues)||movimientoReducido()||!duracion){
    pintarPromedio(el,despues,tipo,antes===null&&!movimientoReducido()?'grade-value-arrival':'');
    return;
  }
  const inicio=performance.now();
  const paso=ahora=>{
    const progreso=Math.min((ahora-inicio)/duracion,1);
    // ease-out: se siente inmediato al escribir, sin convertir la nota en espera.
    const eased=1-Math.pow(1-progreso,3);
    const valor=antes+(despues-antes)*eased;
    pintarPromedio(el,valor,tipo,'grade-value-changing');
    if(progreso<1){requestAnimationFrame(paso);return;}
    pintarPromedio(el,despues,tipo,cruzaUmbral?'grade-threshold-crossed':'');
    if(cruzaUmbral)window.setTimeout(()=>el.classList.remove('grade-threshold-crossed'),duracion);
  };
  requestAnimationFrame(paso);
}
function mostrarEcoGpa(antes,despues){
  if(!cambioDePromedio(antes,despues))return;
  document.getElementById('grade-gpa-echo')?.remove();
  const fila=document.querySelector('.ramo-hero-num-row');if(!fila)return;
  const eco=document.createElement('span');
  eco.id='grade-gpa-echo';eco.className='grade-gpa-echo';eco.setAttribute('role','status');
  eco.textContent=`Promedio general ${nf(antes)} → ${nf(despues)}`;
  fila.appendChild(eco);
}
function calificacionConceptual(raw,tenant){
  const tenantActual=typeof tenant==='string'?tenant:(typeof S!=='undefined'&&S?S.tenant:null);
  const tabla=CALIFICACIONES_CONCEPTUALES_POR_TENANT[tenantActual];
  const concepto=String(raw==null?'':raw).trim().toUpperCase();
  if(!tabla||!Object.prototype.hasOwnProperty.call(tabla,concepto))return null;
  return {concepto,valor:tabla[concepto]};
}
function calificacionConceptualGuardada(n,tenant){
  if(!n||typeof n!=='object')return null;
  const conceptual=calificacionConceptual(n.calificacionConceptual,tenant);
  return conceptual&&n.valor===conceptual.valor?conceptual.concepto:null;
}
// Solo se conservan fechas ISO con zona explícita. Nunca se rellena una nota
// antigua con la hora de carga ni con la fecha de su evaluación.
function fechaEdicionNotaValida(valor){
  if(typeof valor!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(valor))return null;
  const tiempo=Date.parse(valor);
  if(!Number.isFinite(tiempo))return null;
  const dia=valor.slice(0,10);
  if(new Date(dia+'T00:00:00Z').toISOString().slice(0,10)!==dia)return null;
  return new Date(tiempo).toISOString();
}
function asignarValorNota(n,valor){
  if(n.valor!==valor)n.editadaEn=new Date().toISOString();
  n.valor=valor;
  return n;
}
function asignarCalificacionNota(n,raw,valor,tenant){
  const conceptoAnterior=calificacionConceptualGuardada(n,tenant);
  asignarValorNota(n,valor);
  const conceptual=calificacionConceptual(raw,tenant);
  if(conceptual&&conceptual.valor===valor)n.calificacionConceptual=conceptual.concepto;
  else delete n.calificacionConceptual;
  if(conceptoAnterior!==calificacionConceptualGuardada(n,tenant))n.editadaEn=new Date().toISOString();
  return n;
}
function textoCalificacionNota(n,tenant){
  return calificacionConceptualGuardada(n,tenant)||fmtNota(n&&n.valor!=null?n.valor:null);
}
// Una nota se muestra como se escribió: 5.1 o 5.14. Los promedios siguen con fmt.
function fmtNota(n){return n===null?'·':Math.round(n*100)%10?n.toFixed(2):n.toFixed(1);}
function conceptosNota(tenant){
  const tenantActual=typeof tenant==='string'?tenant:(typeof S!=='undefined'&&S?S.tenant:null);
  return Object.keys(CALIFICACIONES_CONCEPTUALES_POR_TENANT[tenantActual]||{});
}
function etiquetaNotaEntrada(tenant){
  const conceptos=conceptosNota(tenant);
  return `Nota (1.0 – 7.0${conceptos.length?', '+conceptos.slice(0,-1).join(', ')+(conceptos.length>1?' o ':'')+conceptos[conceptos.length-1]:''})`;
}
function inputModeNota(tenant){return conceptosNota(tenant).length?'text':'decimal';}
function ejemploNotaEntrada(tenant){return conceptosNota(tenant).length?'Ej: 5.5 o A':'Ej: 5.5';}

// Parser de notas: acepta "6.5", "6,5", "65" (autocorrige a 6.5), "70" → 7.0.
// En tenants que lo declaran en data.js acepta además sus conceptos oficiales.
// Devuelve un número con hasta 2 decimales en rango [1.0, 7.0], o NaN si
// inválido. Hay profesores que ponen 5,14: se guarda tal cual, no como 5,1.
function parseNota(raw,tenant){
  const conceptual=calificacionConceptual(raw,tenant);
  if(conceptual)return conceptual.valor;
  const txt=String(raw==null?'':raw).trim().replace(',','.');
  // Dígitos y a lo más un separador ("4," sigue valiendo 4). parseFloat corta
  // en lo que sobra: "5.5.5" o "5,5,5" pasaban como 5,5 y "1e1" como 1,0.
  if(!/^\d+(\.\d*)?$/.test(txt))return NaN;
  let v=parseFloat(txt);
  // Auto-corrección: "65"/"70"/"45" → 6.5/7.0/4.5 (enteros de 2 dígitos sin punto).
  // Solo hasta 70 para evitar ambigüedad — "77" queda como error de input, no 7.7.
  if(!txt.includes('.') && Number.isInteger(v) && v>=10 && v<=70){
    v=v/10;
  }
  if(v<1||v>7)return NaN;
  return Math.round(v*100)/100;
}
// initials recibe texto plano; esc() se aplica después sobre el resultado
function initials(s){return s.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();}
