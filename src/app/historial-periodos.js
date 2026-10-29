
// ─── QUÉ SEMESTRE FUE ────────────────────────────────────────────────────────
// El nombre se escribía a mano y cada quien ponía lo que se le ocurriera
// ("2024 1", "primero 2024", "2o sem"), sin forma de corregir una errata. Se
// elige de una lista y sale siempre con la forma que ya usa el resto de la app.
// El verano no es "1" ni "2": en la UC es la TAV, y en el resto se nombra sin
// pedirle prestado el término a otra universidad.
const PERIODOS_SEMESTRE=[
  {id:'1',corto:'1°',nombre:'Primer semestre'},
  {id:'2',corto:'2°',nombre:'Segundo semestre'},
  {id:'v',corto:'',nombre:'Temporada de verano'}
];
// En el onboarding la cuenta todavía no tiene universidad: se pasa la elegida.
function nombreVerano(tenant=S.tenant){return tenant==='uc'?'TAV':'Verano';}
function cortoPeriodo(p){return p.id==='v'?nombreVerano():p.corto;}

function etiquetaSemestre(anio,periodo){
  const a=Number(anio)||anioActualSemestre();
  return periodo==='v'?`${nombreVerano()} ${a}`:`${a}-${periodo==='2'?2:1}`;
}

// Para volver a abrir el selector en lo que la persona ya había elegido. Un
// semestre archivado trae `2025-1` de `semester()`; uno escrito a mano antes de
// que existiera el selector puede traer cualquier cosa, y ahí se parte del año
// en curso en vez de adivinar.
function parseEtiquetaSemestre(label){
  const t=String(label||'').trim();
  let m=t.match(/^(\d{4})\s*-\s*([12])$/);
  if(m)return{anio:Number(m[1]),periodo:m[2]};
  m=t.match(/^(?:TAV|Verano)\s+(\d{4})$/i);
  if(m)return{anio:Number(m[1]),periodo:'v'};
  return null;
}

function anioActualSemestre(){
  return Number(String(semester()).slice(0,4))||new Date().getFullYear();
}

function aniosSemestre(sel){
  const hoy=anioActualSemestre();
  const out=[];
  for(let a=hoy;a>=hoy-9;a--)out.push(a);
  if(sel&&out.indexOf(Number(sel))<0){out.push(Number(sel));out.sort((x,y)=>y-x);}
  return out;
}

function selectorSemestreHTML(anio,periodo,onAnio,onPeriodo){
  const a=Number(anio);
  const anios=aniosSemestre(a).map(y=>`<option value="${y}"${y===a?' selected':''}>${y}</option>`).join('');
  const pers=PERIODOS_SEMESTRE.map(pp=>`<button type="button" class="sem-btn${pp.id===periodo?' sel':''}" aria-pressed="${pp.id===periodo?'true':'false'}" title="${esc(pp.nombre)}" onclick="${onPeriodo}('${pp.id}')">${esc(cortoPeriodo(pp))}</button>`).join('');
  return `<select class="feedback-select sem-picker-anio" aria-label="Año" onchange="${onAnio}(this.value)">${anios}</select>
    <div class="sem-picker-per" role="group" aria-label="Período">${pers}</div>`;
}
