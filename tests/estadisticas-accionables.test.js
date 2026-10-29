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
// Desde el 2026-10-26 la situación va en dos anillos (Lucas, a partir de
// Whoop): el promedio del semestre en el acento y SIN palabra —un semestre no
// se aprueba ni se reprueba— y el avance neutro, que VoiceOver lee como antes.
chk('la situación muestra el avance en un anillo neutro con su lectura para VoiceOver',
  /neutro:true[\s\S]{0,120}etiqueta:`\$\{avance\.pct\}% de las evaluaciones evaluado`/.test(stats)&&
  /section-hd-title">Avance del semestre<\/span>[\s\S]{0,300}stats-situation-card/.test(stats)&&
  !/class="stat-label">Avance del semestre<\/div>/.test(stats));
chk('el promedio del semestre no dice si aprueba: va en el acento y sin palabra',
  /anilloPromedio=[\s\S]{0,120}color:'var\(--primary\)'/.test(stats)&&
  !/anilloPromedio[\s\S]{0,400}(Aprobando|Reprobando|Al borde)/.test(stats));
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
  vm.runInContext(app.match(/function parseEtiquetaSemestre\([\s\S]*?\n\}/)[0],contexto);
  const dibujar=periodo=>{contexto.periodo=periodo;contexto.hist='';vm.runInContext(bloque,contexto);return contexto.hist;};
  const puntos=html=>[...html.matchAll(/stats-hist-punto[^"<>]*" style="left:([\d.]+)%;top:([\d.]+)%/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));
  // Desorden deliberado: el ingreso manual no tiene por qué seguir el calendario.
  contexto.validos=[{label:'2024-2',gpa:4.8},{label:'2026-1',gpa:6},{label:'2025-2',gpa:5.2},{label:'2023-1',gpa:4.5},{label:'2025-1',gpa:5},{label:'2024-1',gpa:4.7}];
  const guardado=JSON.stringify(contexto.validos);
  let h=dibujar('anterior'),p=puntos(h);
  chk('por defecto compara el actual con el semestre previo, aunque se agregaran fuera de orden',p.length===2&&h.includes('vs. 2026-1')&&h.includes('0.50 puntos menos'));
  chk('6,0 queda a un sexto desde arriba y 5,5 a un cuarto, en la escala 1–7',Math.abs(p[0].y-100/6)<.001&&p[1].y===25);
  chk('los extremos horizontales son el semestre más antiguo y el más reciente',p[0].x===0&&p[1].x===100);
  chk('ambos ejes muestran solo las marcas cercanas y el 4,0 central',(h.match(/>4.0<\/span>/g)||[]).length===2&&!h.includes('>3</span>')&&!h.includes('>7</span>'));
  h=dibujar('5');
  chk('Últimos 5 incluye cinco semestres en total, con el actual al final',puntos(h).length===5&&h.includes('2024-2: 4.8')&&!h.includes('2024-1: 4.7'));
  h=dibujar('todo');
  chk('Desde el inicio conserva todos los puntos y los ordena cronológicamente',puntos(h).length===7&&h.indexOf('2023-1: 4.5')<h.indexOf('2024-1: 4.7')&&h.indexOf('2025-2: 5.2')<h.indexOf('2026-1: 6.0'));
  chk('ningún filtro cambia los datos guardados',JSON.stringify(contexto.validos)===guardado);
  contexto.validos=Array.from({length:23},(_,i)=>({label:(2026-Math.floor((i+1)/2))+'-'+(i%2?2:1),gpa:4.5+Math.sin(i)}));
  h=dibujar('todo');
  chk('con 24 semestres mantiene cada vértice y ofrece menos rótulos según el ancho',puntos(h).length===24&&(h.match(/en-amplio/g)||[]).length===6&&(h.match(/en-corto/g)||[]).length===3);
  contexto.validos=[{label:'2026-1',gpa:4}];contexto.g=4;h=dibujar('anterior');
  chk('el 4,0 se dibuja al centro y la igualdad no aparece como subida o bajada',puntos(h).every(p=>p.y===50)&&h.includes('Sin cambio'));
  contexto.validos=[];
  chk('sin semestre anterior no inventa una comparación',dibujar('anterior')==='');
}

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
