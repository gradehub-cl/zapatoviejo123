function frasePosicionCurso(mejorQue,total){
  const otros=Math.max(Number(total)-1,0);
  return `Igual o por sobre el <b>${Number(mejorQue)}%</b> de tus ${otros} compañeros`;
}

async function pintarPosicionesCurso(){
  const box=document.getElementById('stats-curso');
  if(!box)return;
  await subirNotasCurso();
  const pos=await cargarPosicionesCurso();
  const filas=(S.ramos||[]).filter(r=>r&&r.sigla&&pos&&pos[r.id]);
  if(!filas.length){
    // Con menos de cinco no hay comparación posible, y es el caso normal al
    // principio. Se dice por qué en vez de dejar un hueco.
    box.innerHTML=`<p class="stats-curso-vacio">Aún no hay suficientes datos para compararte con los demás.</p>`;
    return;
  }
  box.innerHTML=filas.map(r=>{
    const p=pos[r.id];
    return `<div class="stats-curso-row">
      <span class="stats-curso-color" style="background:${esc(r.color)}"></span>
      <span class="stats-curso-main"><strong>${esc(r.nombre)}</strong><small class="stats-curso-frase">${frasePosicionCurso(p.mejorQue,p.total)}</small>
        <span class="stats-curso-pista" aria-hidden="true"><b class="stats-curso-mitad"></b><i style="left:${Math.max(0,Math.min(100,Number(p.mejorQue)||0))}%"></i></span></span>
    </div>`;
  }).join('');
}

function serieEvolucionSemestres(validos,promedio,periodo){
  const completa=[...validos].reverse().map(h=>({label:h.label,v:gpaHistorial(h),fecha:parseEtiquetaSemestre(h.label)})).filter(x=>x.v!==null);
  // Los semestres ingresados a mano pueden haberse agregado fuera de orden.
  const orden=x=>x.fecha?x.fecha.anio*10+(x.fecha.periodo==='v'?0:Number(x.fecha.periodo)):-Infinity;
  completa.sort((a,b)=>orden(a)-orden(b));
  if(promedio!==null)completa.push({label:semester(),v:promedio,actual:true});
  return periodo==='anterior'?completa.slice(-2):periodo==='5'?completa.slice(-5):completa;
}

function cambiarPeriodoHistorial(periodo){
  if(!['anterior','5','todo'].includes(periodo))return;
  const body=document.getElementById('stats-body');
  if(!body||(body.dataset.histPeriodo||'anterior')===periodo)return;
  const panel=body.querySelector('.stats-hist-comparacion');
  const marco=panel?.querySelector('.evolucion-marco');
  if(!marco)return;
  const validos=(S.historial||[]).filter(h=>h&&Array.isArray(h.ramos));
  const serie=serieEvolucionSemestres(validos,gpa(S.ramos),periodo);
  if(serie.length<2)return;
  const plantilla=document.createElement('template');
  plantilla.innerHTML=htmlGraficoEvolucion(serie.map(x=>({etiqueta:x.actual?`Actual · ${x.label}`:x.label||'Semestre anterior',valor:x.v,actual:x.actual})),'historial');
  // Conserva los botones, su foco y el resto de Estadísticas. Rehacer stats-body
  // alteraba el ancla de scroll y volvía a pedir la comparación con el curso.
  marco.replaceWith(plantilla.content.firstElementChild);
  body.dataset.histPeriodo=periodo;
  panel.querySelectorAll('[data-hist-periodo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.histPeriodo===periodo)));
  enlazarGraficosEvolucion(panel);
}

// Curva monótona: atraviesa cada valor sin inventar máximos ni mínimos.
function trazoEvolucionNotas(puntos){
  const delta=puntos.slice(1).map((p,i)=>p.x===puntos[i].x?0:(p.y-puntos[i].y)/(p.x-puntos[i].x));
  const tangente=puntos.map((p,i)=>i===0?delta[0]:i===puntos.length-1?delta[delta.length-1]
    :delta[i-1]*delta[i]<=0?0:2*delta[i-1]*delta[i]/(delta[i-1]+delta[i]));
  let d=`M${puntos[0].x},${puntos[0].y}`;
  for(let i=0;i<puntos.length-1;i++){
    const a=puntos[i],b=puntos[i+1],tercio=(b.x-a.x)/3;
    d+=` C${a.x+tercio},${a.y+tangente[i]*tercio} ${b.x-tercio},${b.y-tangente[i+1]*tercio} ${b.x},${b.y}`;
  }
  return d;
}

function htmlGraficoEvolucion(serie,id,descripcion='Promedio por semestre',opciones={}){
  if(!serie.length||(serie.length<2&&!opciones.unPunto))return'';
  const piso=opciones.piso??1,techo=opciones.techo??7,referencia=opciones.referencia??4;
  const puntos=serie.map((p,i)=>({x:Number.isFinite(p.x)?p.x:serie.length===1?50:i/(serie.length-1)*100,y:(techo-Math.max(piso,Math.min(techo,p.valor)))/(techo-piso)*100}));
  const curva=opciones.recto?'M'+puntos.map(p=>p.x+','+p.y).join(' L'):trazoEvolucionNotas(puntos),ultimo=serie[serie.length-1];
  const minimo=Math.floor(Math.min(...serie.map(p=>p.valor))),maximo=Math.ceil(Math.max(...serie.map(p=>p.valor)));
  const marcas=opciones.marcas||[7,6,5,4,3,2,1].filter(n=>n===4||(n>=minimo&&n<=maximo));
  const rotulo=opciones.rotulo||((n)=>n===4?'4.0':n);
  const lectura=p=>p.lectura||`${p.etiqueta}, promedio ${nf(p.valor,2)}`;
  const marca=opciones.marca;
  const gradiente='evolucion-'+String(id).replace(/[^a-z0-9_-]/gi,'');
  return `<div class="evolucion-marco">
    <div class="evolucion-eje" aria-hidden="true">${marcas.map(n=>`<span class="${n===referencia?'es-centro':''}" style="top:${(techo-n)/(techo-piso)*100}%">${esc(rotulo(n))}</span>`).join('')}</div>
    <div class="evolucion-trazado" role="slider" tabindex="0" aria-label="Explorar ${esc(descripcion.toLowerCase())}" aria-description="${esc(opciones.resumen||'Gráfico de línea, escala de 1 a 7. El 4.0 queda al centro.')} Usa las flechas para recorrer los valores; Inicio y Fin van a los extremos. Escape cierra el detalle." aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="${serie.length-1}" aria-valuenow="${serie.length-1}" aria-valuetext="${esc(lectura(ultimo))}">
      <div class="evolucion-referencia" style="top:${(techo-referencia)/(techo-piso)*100}%" aria-hidden="true"></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="${gradiente}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--primary)" stop-opacity=".24"/><stop offset="60%" stop-color="var(--primary)" stop-opacity=".04"/><stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
        <path class="evolucion-area" d="${curva} L${puntos[puntos.length-1].x},100 L${puntos[0].x},100 Z" style="fill:url(#${gradiente})"/><path class="evolucion-linea" d="${curva}"/>
      </svg>
      ${serie.map((p,i)=>`<i class="evolucion-punto${p.actual?' es-actual':''}${p.antes?' es-antes':''}" style="left:${puntos[i].x.toFixed(3)}%;top:${puntos[i].y.toFixed(3)}%" data-etiqueta="${esc(p.etiqueta)}" data-nota="${esc(p.valorTexto||nf(p.valor,2))}" data-lectura="${esc(lectura(p))}" data-detalle="${esc(p.detalle||'')}" aria-hidden="true"></i>`).join('')}
      ${marca?`<div class="evolucion-inicio" style="--inicio-x:${Math.max(0,Math.min(100,marca.x))}%" aria-hidden="true"><i></i><span>${esc(marca.etiqueta)}</span></div>`:''}
      <div class="evolucion-cursor" hidden aria-hidden="true"></div>
      <div class="evolucion-notita" hidden aria-hidden="true"><span></span><b></b><small hidden></small></div>
    </div>
  </div>`;
}

// El área completa responde al dedo. El gesto vertical sigue desplazando la
// página, y el slider permite explorar con teclado o lector de pantalla.
function enlazarGraficosEvolucion(body){
  body.querySelectorAll('.evolucion-trazado').forEach(grafico=>{
    const puntos=[...grafico.querySelectorAll('.evolucion-punto')];
    if(!puntos.length)return;
    const nota=grafico.querySelector('.evolucion-notita'),cursor=grafico.querySelector('.evolucion-cursor');
    let arrastrando=false,seleccionado=puntos.length-1;
    const ocultar=()=>{nota.hidden=true;cursor.hidden=true;puntos.forEach(p=>p.classList.remove('es-elegido'));};
    const mostrar=(indice,tactil=false)=>{
      seleccionado=Math.max(0,Math.min(puntos.length-1,Math.round(indice)));
      const p=puntos[seleccionado];
      grafico.setAttribute('aria-valuenow',seleccionado);
      grafico.setAttribute('aria-valuetext',p.dataset.lectura||`${p.dataset.etiqueta}, promedio ${p.dataset.nota}`);
      nota.querySelector('span').textContent=p.dataset.etiqueta;nota.querySelector('b').textContent=p.dataset.nota;
      const detalle=nota.querySelector('small');
      if(detalle){detalle.hidden=!p.dataset.detalle;if(p.dataset.detalle)detalle.textContent=p.dataset.detalle;}
      nota.hidden=false;cursor.hidden=false;cursor.style.left=p.style.left;
      puntos.forEach((p,i)=>p.classList.toggle('es-elegido',i===seleccionado));
      const x=parseFloat(p.style.left)/100*grafico.clientWidth,y=parseFloat(p.style.top)/100*grafico.clientHeight;
      nota.style.left=Math.max(0,Math.min(grafico.clientWidth-nota.offsetWidth,x-nota.offsetWidth/2))+'px';
      // Dedo y lápiz cubren el punto: el detalle flota sobre el trazado, sin
      // reservar altura. Mouse y teclado conservan la posición junto al punto.
      const arriba=y-nota.offsetHeight-14;
      nota.style.top=(tactil?-nota.offsetHeight-12:Math.max(0,Math.min(grafico.clientHeight-nota.offsetHeight,arriba>=0?arriba:y+14)))+'px';
    };
    const recorrer=e=>{
      const r=grafico.getBoundingClientRect();
      if(!r.width)return;
      const x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
      let mejor=0,distancia=Infinity,vertical=Infinity;
      puntos.forEach((p,i)=>{
        const dx=Math.abs(parseFloat(p.style.left)-x),dy=Math.abs(parseFloat(p.style.top)-y);
        if(dx<distancia-0.001||(Math.abs(dx-distancia)<0.001&&dy<vertical)){mejor=i;distancia=dx;vertical=dy;}
      });
      mostrar(mejor,e.pointerType==='touch'||e.pointerType==='pen');
    };
    grafico.onpointerdown=e=>{
      if(e.isPrimary===false||e.button!==0)return;
      e.preventDefault();arrastrando=true;grafico.focus({preventScroll:true});grafico.setPointerCapture(e.pointerId);recorrer(e);
    };
    grafico.onpointermove=e=>{if(arrastrando||e.pointerType==='mouse')recorrer(e);};
    grafico.onpointerup=()=>{arrastrando=false;};
    grafico.onpointercancel=()=>{arrastrando=false;ocultar();};
    grafico.onpointerleave=e=>{if(e.pointerType==='mouse'&&!arrastrando)ocultar();};
    grafico.onfocus=()=>mostrar(seleccionado);grafico.onblur=ocultar;
    grafico.onkeydown=e=>{
      const pasos={ArrowRight:1,ArrowUp:1,ArrowLeft:-1,ArrowDown:-1,PageUp:5,PageDown:-5};
      if(e.key in pasos){e.preventDefault();mostrar(seleccionado+pasos[e.key]);}
      else if(e.key==='Home'||e.key==='End'){e.preventDefault();mostrar(e.key==='Home'?0:puntos.length-1);}
      else if(e.key==='Escape'){e.preventDefault();ocultar();}
    };
  });
}
