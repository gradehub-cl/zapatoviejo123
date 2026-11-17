// Estadísticas no es una vitrina de contadores. Con pocas notas —el estado
// normal al empezar el semestre— tiene que explicar qué ya sabe, y cuando hay
// notas debe poner arriba el ramo que más exige antes que el conteo de aprobados.
const fs=require('fs'),path=require('path');
const raiz=path.join(__dirname,'..');
const render=fs.readFileSync(process.env.GRADEHUB_RENDER||path.join(raiz,'render-main.js'),'utf8');
const css=fs.readFileSync(process.env.GRADEHUB_CSS||path.join(raiz,'styles.css'),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{console.log(`  ${c?'OK  ':'FAIL'} ${n}`);if(c)ok++;else fail++;};
const inicio=render.indexOf('function renderStats()');
const fin=render.indexOf('\n// Historial de semestres',inicio);
const stats=render.slice(inicio,fin);

console.log('\n=== Estadísticas guía decisiones, no cuenta tarjetas ===');
chk('el estado temprano reconoce el semestre sin notas y lo que ya está configurado',
  stats.includes('Parte con tu primera nota')&&stats.includes('evaluaciones configuradas'));
// El avance conserva su dato y lectura; el contorno reemplaza el círculo.
chk('la situación conserva el peso evaluado y su lectura para VoiceOver',
  stats.includes('tarjetaEvolucionStatsHTML(g,avance.pct)')&&render.includes('Peso evaluado')&&render.includes('stats-avance-cifra'));
chk('el promedio del semestre usa el gráfico, sin etiquetar al semestre como aprobado',
  render.includes('Tu promedio en el tiempo')&&render.includes('stats-evolucion-valor')&&
  !stats.includes('anilloPromedio='));
chk('la prioridad usa la misma cuenta de nota necesaria',
  stats.includes('const falta=loQueFaltaPorRamo(S.ramos);')&&stats.includes('Tus prioridades hoy')&&
  /falta\.slice\(0,3\)/.test(stats));
// El "Mapa de tus ramos" listaba los ramos otra vez, con su color, su avance y
// su promedio: lo mismo que "Mis ramos" en Inicio, en la pantalla de al lado.
// Se retiró para dejarle el espacio a algo que Inicio no puede mostrar.
//
// Lo que sí era propio del mapa —el estado por ramo, "Necesitas 5,2 en lo que
// queda"— se conserva en "Tus prioridades hoy", que lo muestra para los tres que
// más exigen. Para el resto deja de estar a la vista en Estadísticas; se ve
// entrando al ramo.
chk('el mapa ya no duplica la lista de ramos de Inicio',
  !stats.includes('Mapa de tus ramos')&&!stats.includes('stats-ramo-row'));
chk('y el estado por ramo sigue disponible en las prioridades',
  stats.includes('stats-priority-row')&&stats.includes('htmlMedidorNota(')&&stats.includes('exigenciaNotaNecesaria('));
chk('la barra frente al curso marca la mitad del curso',
  /<b class="stats-curso-mitad"><\/b>/.test(render)&&/\.stats-curso-mitad\{[^}]*left:50%/.test(require('fs').readFileSync(require('path').join(__dirname,'..','styles.css'),'utf8')));
chk('las prioridades van sin texto explicativo (Lucas, 2026-10-26)',
  !stats.includes('que más nota te exigen en lo pendiente'));
chk('se elimina el resumen genérico de cuatro tarjetas',
  !stats.includes('<span class="section-hd-title">Resumen</span>')&&!stats.includes('<div class="stats-grid">'));

console.log('\n=== Las prioridades siguen siendo legibles en teléfono ===');
chk('las filas truncan nombres largos y alinean los números',
  /\.ag-row-name\{[^}]*text-overflow:ellipsis/.test(css)||/\.ag-row-main\{[^}]*min-width:0/.test(css));

// El gráfico usa los promedios que ya entrega el motor; estas pruebas comprueban
// qué períodos se muestran y su ubicación, sin cambiar ni recalcular esas notas.
console.log('\n=== Evolución del promedio por semestre ===');
{
  const vm=require('vm');
  const bloque=render.slice(render.indexOf('    // Un punto por semestre'),render.indexOf('    if(validos.length>0)',render.indexOf('    // Un punto por semestre')));
  const app=fs.readFileSync(path.join(raiz,'app.js'),'utf8');
  const contexto={g:5.5,periodo:'anterior',hist:'',validos:[],
    gpaHistorial:h=>h.gpa??null,semester:()=> '2026-2',
    fmtPromedio:n=>n.toFixed(1),nf:(n,d)=>n.toFixed(d),
    esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')};
  vm.createContext(contexto);
  vm.runInContext(fs.readFileSync(path.join(raiz,'engine.js'),'utf8'),contexto);
  vm.runInContext(app.match(/function fmtPromedioGeneral\([\s\S]*?\n\}/)[0],contexto);
  vm.runInContext(app.match(/function parseEtiquetaSemestre\([\s\S]*?\n\}/)[0],contexto);
  ['serieEvolucionSemestres','trazoEvolucionNotas','htmlGraficoEvolucion'].forEach(n=>vm.runInContext(render.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0],contexto));
  const dibujar=periodo=>{contexto.periodo=periodo;contexto.hist='';vm.runInContext(bloque,contexto);return contexto.hist;};
  const puntos=html=>[...html.matchAll(/evolucion-punto[^"<>]*" style="left:([\d.]+)%;top:([\d.]+)%/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));
  // Desorden deliberado: el ingreso manual no tiene por qué seguir el calendario.
  contexto.validos=[{label:'2024-2',gpa:4.8},{label:'2026-1',gpa:6},{label:'2025-2',gpa:5.2},{label:'2023-1',gpa:4.5},{label:'2025-1',gpa:5},{label:'2024-1',gpa:4.7}];
  const guardado=JSON.stringify(contexto.validos);
  let h=dibujar('anterior'),p=puntos(h);
  chk('por defecto compara el actual con el semestre previo, aunque se agregaran fuera de orden',p.length===2&&h.includes('data-etiqueta="2026-1"')&&!h.includes('stats-hist-delta'));
  chk('6,0 queda a un sexto desde arriba y 5,5 a un cuarto, en la escala 1–7',Math.abs(p[0].y-100/6)<.001&&p[1].y===25);
  chk('los extremos horizontales son el semestre más antiguo y el más reciente',p[0].x===0&&p[1].x===100);
  chk('solo el eje izquierdo muestra las marcas cercanas y el 4,0 central',(h.match(/>4.0<\/span>/g)||[]).length===1&&!h.includes('>3</span>')&&!h.includes('>7</span>'));
  h=dibujar('5');
  chk('Últimos 5 incluye cinco semestres en total, con el actual al final',puntos(h).length===5&&h.includes('data-etiqueta="2024-2"')&&!h.includes('data-etiqueta="2024-1"'));
  h=dibujar('todo');
  chk('Desde el inicio conserva todos los puntos y los ordena cronológicamente',puntos(h).length===7&&h.indexOf('data-etiqueta="2023-1"')<h.indexOf('data-etiqueta="2024-1"')&&h.indexOf('data-etiqueta="2025-2"')<h.indexOf('data-etiqueta="2026-1"'));
  chk('ningún filtro cambia los datos guardados',JSON.stringify(contexto.validos)===guardado);
  contexto.validos=Array.from({length:23},(_,i)=>({label:(2026-Math.floor((i+1)/2))+'-'+(i%2?2:1),gpa:4.5+Math.sin(i)}));
  h=dibujar('todo');
  chk('con 24 semestres mantiene cada vértice sin etiquetas debajo y permite explorar todos',puntos(h).length===24&&!h.includes('stats-hist-periodos')&&h.includes('aria-valuemax="23"')&&h.includes('aria-label="Explorar promedio por semestre"'));
  contexto.validos=[{label:'2026-1',gpa:4}];contexto.g=4;h=dibujar('anterior');
  chk('el 4,0 se dibuja al centro y la igualdad no aparece como subida o bajada',puntos(h).every(p=>p.y===50)&&!h.includes('stats-hist-delta'));
  const muestras=[{x:0,y:85},{x:30,y:10},{x:60,y:60},{x:100,y:5}],curva=contexto.trazoEvolucionNotas(muestras);
  const tramos=[...curva.matchAll(/ C([\d.eE+-]+),([\d.eE+-]+) ([\d.eE+-]+),([\d.eE+-]+) ([\d.eE+-]+),([\d.eE+-]+)/g)];
  const sinPicos=tramos.every((m,i)=>Array.from({length:21},(_,j)=>{const t=j/20,u=1-t,a=muestras[i].y,b=muestras[i+1].y,y=u*u*u*a+3*u*u*t*Number(m[2])+3*u*t*t*Number(m[4])+t*t*t*b;return y>=Math.min(a,b)-1e-9&&y<=Math.max(a,b)+1e-9;}).every(Boolean));
  chk('la curva suaviza sin agregar notas máximas o mínimas entre puntos',tramos.length===3&&sinPicos);
  contexto.validos=[];
  chk('sin semestre anterior no inventa una comparación',dibujar('anterior')==='');

  console.log('\n=== Cambiar el período conserva el contexto de lectura ===');
  contexto.S={ramos:[{id:'actual'}],historial:Array.from({length:8},(_,i)=>({label:(2025-Math.floor(i/2))+'-'+(i%2?1:2),gpa:4+i/10,ramos:[]}))};
  const estado=JSON.stringify(contexto.S),botones=['anterior','5','todo'].map(id=>({dataset:{histPeriodo:id},setAttribute(k,v){this[k]=v;}}));
  let cambios=0,enlaces=0,marco={replaceWith(nuevo){cambios++;marco=nuevo;}};
  const panel={querySelector:()=>marco,querySelectorAll:()=>botones};
  const body={dataset:{},scrollTop:1234,querySelector:()=>panel,set innerHTML(_){throw new Error('No se debe rehacer Estadísticas');}};
  contexto.document={activeElement:botones[1],getElementById:()=>body,createElement:()=>({content:{get firstElementChild(){return {html:this.html,replaceWith:marco.replaceWith};}},set innerHTML(html){this.content.html=html;}})};
  contexto.gpa=()=>5.5;
  contexto.renderStats=()=>{throw new Error('No se debe repintar toda la pantalla ni volver a pedir datos');};
  contexto.enlazarGraficosEvolucion=raiz=>{if(raiz!==panel)throw new Error('Solo se enlaza el gráfico actualizado');enlaces++;};
  vm.runInContext(render.match(/function cambiarPeriodoHistorial\([\s\S]*?\n\}/)[0],contexto);
  for(const [periodo,cantidad] of [['5',5],['todo',9],['anterior',2]]){
    contexto.cambiarPeriodoHistorial(periodo);
    chk(`${periodo}: actualiza solo los puntos y el estado accesible del filtro`,puntos(marco.html).length===cantidad&&botones.every(b=>b['aria-pressed']===String(b.dataset.histPeriodo===periodo)));
  }
  chk('conserva los botones y el foco, sin mover el contenedor ni tocar los datos',contexto.document.activeElement===botones[1]&&body.scrollTop===1234&&JSON.stringify(contexto.S)===estado&&cambios===3&&enlaces===3);
  contexto.cambiarPeriodoHistorial('anterior');contexto.cambiarPeriodoHistorial('invalido');
  chk('repetir la selección o recibir un período inválido no repinta nada',cambios===3&&enlaces===3);
}

console.log('\n=== Explorar cada semestre sin apuntar a círculos pequeños ===');
{
  const vm=require('vm');
  const punto=(semestre,nota,x,y)=>({dataset:{etiqueta:semestre,nota},style:{left:x+'%',top:y+'%'},classList:{toggle(){},remove(){}}});
  const puntos=[punto('2025-2','5.37',0,27.167),punto('2026-1','6.12',50,14.667),punto('Actual · 2026-2','5.50',100,25)];
  const texto={textContent:''},valor={textContent:''},nota={hidden:true,style:{},offsetWidth:90,offsetHeight:52,querySelector:s=>s==='span'?texto:valor};
  const cursor={hidden:true,style:{}};
  const grafico={clientWidth:200,clientHeight:192,setAttribute(k,v){this[k]=v;},focus(){this.onfocus();},setPointerCapture(){},querySelector:s=>s==='.evolucion-notita'?nota:cursor,querySelectorAll:()=>puntos,getBoundingClientRect:()=>({left:20,width:200})};
  const control=grafico;
  const contexto={};vm.createContext(contexto);
  vm.runInContext(render.match(/function enlazarGraficosEvolucion\([\s\S]*?\n\}/)[0],contexto);
  contexto.enlazarGraficosEvolucion({querySelectorAll:()=>[grafico]});
  control.onpointerdown({button:0,isPrimary:true,pointerId:1,pointerType:'touch',clientX:20,preventDefault(){}});
  chk('tocar el borde selecciona el primer semestre y su promedio con dos decimales',texto.textContent==='2025-2'&&valor.textContent==='5.37'&&!nota.hidden&&control['aria-valuenow']===0);
  chk('la nota del borde izquierdo queda dentro del gráfico',nota.style.left==='0px');
  chk('en táctil el detalle entero queda sobre el trazado, fuera del dedo',parseFloat(nota.style.top)+nota.offsetHeight<0);
  control.onpointermove({pointerType:'touch',clientX:115});
  chk('al arrastrar escoge el semestre más cercano y actualiza el lector de pantalla',texto.textContent==='2026-1'&&valor.textContent==='6.12'&&control['aria-valuetext']==='2026-1, promedio 6.12');
  control.onpointermove({pointerType:'touch',clientX:350});control.onpointerup();
  chk('seguir fuera del extremo no inventa puntos y deja la notita visible al soltar',control['aria-valuenow']===2&&!nota.hidden&&nota.style.left==='110px');
  control.onpointerdown({button:0,isPrimary:true,pointerId:2,pointerType:'pen',clientX:115,clientY:120,preventDefault(){}});control.onpointerup();
  chk('el lápiz también sitúa el detalle completo sobre el trazado',parseFloat(nota.style.top)+nota.offsetHeight<0);
  control.onpointermove({pointerType:'mouse',clientX:350,clientY:120});
  chk('con mouse vuelve a la posición anterior dentro del trazado',parseFloat(nota.style.top)>=0);
  control.onkeydown({key:'ArrowLeft',preventDefault(){}});
  chk('las flechas también permiten recorrer las notas',texto.textContent==='2026-1'&&cursor.style.left==='50%');
  control.onkeydown({key:'Escape',preventDefault(){}});
  chk('Escape oculta la nota y el indicador',nota.hidden&&cursor.hidden);
  control.onfocus();control.onpointercancel();
  chk('cancelar el gesto para desplazar la página no deja una selección flotante',nota.hidden&&cursor.hidden);
  control.onpointermove({pointerType:'mouse',clientX:20});control.onpointerleave({pointerType:'mouse'});
  chk('mouse muestra al pasar y oculta al salir',nota.hidden&&cursor.hidden);
}

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
