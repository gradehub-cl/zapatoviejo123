// ─── ALUMNOS DE EJEMPLO (2026-10-22, decisión de Lucas) ──────────────────────
// Un administrador lo activa para el profesor que elija (alumnos_ejemplo.sql).
// Ese profesor ve su panel con alumnos SINTÉTICOS de Ingeniería UC: las pautas
// salen de los presets; las notas, los compañeros de curso y las secciones se
// inventan acá, en su navegador. Nada se manda a la base ni entra a ningún
// promedio, y el panel lo dice con una franja. Las fechas van relativas a hoy
// para que el ejemplo no envejezca.
function datosEjemploAlumnosPanel(hoy=new Date()){
  let semilla=20261022;
  const azar=()=>{semilla|=0;semilla=semilla+0x6D2B79F5|0;let t=Math.imul(semilla^semilla>>>15,1|semilla);
    t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const base=new Date(Date.UTC(hoy.getFullYear(),hoy.getMonth(),hoy.getDate())-70*86400000);
  const dia=n=>new Date(base.getTime()+n*86400000).toISOString().slice(0,10);
  const HOY=dia(70);
  const nota=v=>Math.round(Math.min(7,Math.max(1,v+(azar()-.5)*1.4))*10)/10;
  let uid=0;
  const ramoCon=(nombre,seccion,nivel)=>{
    let r=null;try{r=presetRamo(nombre,'uc','ING-PC');}catch(e){}
    if(!r)return null;
    r.id='ejemplo-'+(++uid);r.nombre=r.nombre||nombre;r.color=r.color||'#0d7a6b';
    if(seccion)r.seccion=seccion;
    const cats=r.categorias||[];
    const total=cats.reduce((n,c)=>n+(Number.isInteger(c.slots)&&c.slots>1?c.slots:1),0)||1;
    let k=0;
    cats.forEach(c=>{
      const n=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
      c.notas=[];delete c.fecha;
      for(let i=0;i<n;i++,k++){
        const fecha=/examen/i.test(c.nombre)?dia(108):dia(Math.round(4+k*(100/total)));
        if(fecha<=HOY)c.notas.push({id:r.id+'-n'+k,nombre:n>1?`${c.nombre} ${i+1}`:c.nombre,valor:nota(nivel(fecha)),fecha});
        else if(!c.fecha)c.fecha=fecha;
      }
    });
    return r;
  };
  // Seis alumnos que suben desde que empiezan; dos sin sección declarada y
  // dos con ramos empezados en fechas distintas.
  const plan=[
    ['Sofía (ejemplo)',3.6,[['Cálculo II',3,28],['Dinámica',2,50]]],
    ['Matías (ejemplo)',3.3,[['Cálculo II',3,35]]],
    ['Valentina (ejemplo)',4.2,[['Dinámica',2,22],['Laboratorio de Dinámica',2,null]]],
    ['Benjamín (ejemplo)',3.8,[['Introducción a la Programación',null,40]]],
    ['Isidora (ejemplo)',4.6,[['Cálculo II',1,15],['Introducción a la Programación',4,45]]],
    ['Tomás (ejemplo)',3.0,[['Cálculo II',null,30]]],
  ];
  const alumnos=plan.map(([nombre,nivelBase,ramos],i)=>{
    const inicio_ramos={};
    const propios=ramos.map(([ramo,seccion,desde])=>{
      const inicio=desde===null?null:dia(desde);
      const r=ramoCon(ramo,seccion,f=>inicio&&f>=inicio?nivelBase+1.1:nivelBase);
      if(r&&inicio)inicio_ramos[r.id]=inicio;
      return r;
    }).filter(Boolean);
    return {id:'ejemplo-alumno-'+i,nombre_visible:nombre,tenant:'uc',desde:dia(32)+'T15:00:00Z',inicio:null,inicio_ramos,ramos:propios};
  }).filter(al=>al.ramos.length);
  // Compañeros de curso: 40 por ramo, secciones 1 a 4 y algunos sin sección.
  const curso=[];
  ['Cálculo II','Dinámica','Laboratorio de Dinámica','Introducción a la Programación'].forEach(nombre=>{
    for(let i=0;i<40;i++){const nivel=3.2+azar()*2.6,r=ramoCon(nombre,i%9===0?null:1+(i%4),()=>nivel);if(r)curso.push(r);}
  });
  return {alumnos,curso};
}
// La misma forma que comparacion_ramo_profesor, con el mismo piso de cinco
// personas. Acá se aplica en el navegador porque los datos también son de acá.
const PISO_PERSONAS_EJEMPLO=5;
function comparacionEjemploPanel(datos,sigla,seccion=null){
  const media=xs=>xs.reduce((a,b)=>a+b,0)/xs.length,red=v=>Math.round(v*10)/10;
  const todos=[...datos.curso,...datos.alumnos.flatMap(a=>a.ramos)]
    .filter(r=>String(claveRamoCurso(r,'uc')||'').toUpperCase()===String(sigla||'').toUpperCase())
    .filter(r=>seccion==null||r.seccion===seccion);
  const porClave=fn=>{const m=new Map();todos.forEach(r=>fn(r).forEach(([k,nombre,v])=>{
    if(!k)return;if(!m.has(k))m.set(k,{nombre,vals:[]});m.get(k).vals.push(v);}));
    return [...m].filter(([,x])=>x.vals.length>=PISO_PERSONAS_EJEMPLO).map(([clave,x])=>({clave,nombre:x.nombre,promedio:red(media(x.vals)),personas:x.vals.length}));};
  const proms=todos.map(r=>{try{return ramoAvg(r,undefined,[r]);}catch(e){return null;}}).filter(Number.isFinite);
  return {ramo:proms.length>=PISO_PERSONAS_EJEMPLO?{promedio:red(media(proms)),personas:proms.length}:null,
    evaluaciones:porClave(r=>(r.categorias||[]).flatMap(c=>(c.notas||[]).map(n=>[claveEvaluacionPanel(n.nombre),n.nombre,n.valor]))),
    categorias:porClave(r=>(r.categorias||[]).filter(c=>(c.notas||[]).length).map(c=>[claveEvaluacionPanel(c.nombre),c.nombre,media(c.notas.map(n=>n.valor))]))};
}
// Marcas de los alumnos inventados, con la misma forma que preparacion_alumno.
// Sin esto, un profesor sin alumnos reales no podía probar «Marcar».
function preparacionEjemploPanel(datos,al,ramoId){
  return (al?al.ramos:[]).filter(r=>!ramoId||r.id===ramoId).map(r=>{
    const marcas=datos.marcas&&datos.marcas[al.id+'|'+r.id];
    return {ramo_id:r.id,manual:!!marcas,marcas:marcas||[],evaluaciones:(r.categorias||[]).flatMap(c=>{
      const cantidad=Number.isInteger(c.slots)&&c.slots>1?c.slots:1,notas=c.notas||[];
      return Array.from({length:Math.max(cantidad,notas.length)},(_,i)=>{const n=notas[i];
        return {cat_id:c.id,numero:i+1,nota_id:n?n.id:null,nombre:n?.nombre||(cantidad>1?`${c.nombre} ${i+1}`:c.nombre),categoria:c.nombre,
          forma:{cantidad,inicio:1},nota:n?n.valor:null,fecha:n?.fecha||c.fecha||null};});
    })};
  });
}
// Las llamadas del panel, respondidas en memoria. Cambiar una fecha o quitar
// a un alumno dura hasta recargar.
function rpcEjemploPanel(datos,nombre,a={}){
  const ok=data=>Promise.resolve({data,error:null});
  if(nombre==='mis_alumnos')return ok(JSON.parse(JSON.stringify(datos.alumnos)));
  if(nombre==='comparacion_ramo_profesor')return ok(comparacionEjemploPanel(datos,a.p_sigla,a.p_seccion??null));
  if(nombre==='fijar_inicio_ramo_alumno'){
    const al=datos.alumnos.find(x=>x.id===a.p_id);if(!al||!al.ramos.some(r=>r.id===a.p_ramo))return ok(false);
    if(a.p_inicio)al.inicio_ramos[a.p_ramo]=a.p_inicio;else delete al.inicio_ramos[a.p_ramo];
    return ok(true);
  }
  if(nombre==='quitar_alumno'){const n=datos.alumnos.length;datos.alumnos=datos.alumnos.filter(x=>x.id!==a.p_id);return ok(datos.alumnos.length<n);}
  if(nombre==='preparacion_alumno'){const al=datos.alumnos.find(x=>x.id===a.p_id);return ok({ramos:preparacionEjemploPanel(datos,al,a.p_ramo)});}
  if(nombre==='guardar_preparacion_alumno'){
    const al=datos.alumnos.find(x=>x.id===a.p_id);if(!al||!al.ramos.some(r=>r.id===a.p_ramo))return Promise.resolve({data:null,error:{message:'ramo no disponible'}});
    datos.marcas=datos.marcas||{};
    if(a.p_marcas===null)delete datos.marcas[al.id+'|'+a.p_ramo];else datos.marcas[al.id+'|'+a.p_ramo]=a.p_marcas.map(m=>({...m,huerfana:false}));
    return ok({ramos:preparacionEjemploPanel(datos,al,a.p_ramo)});
  }
  return Promise.resolve({data:null,error:{message:'sin respuesta en el ejemplo'}});
}
// Se pregunta en cada carga, así un administrador lo prende o lo apaga y se
// nota al volver a la pestaña. Los alumnos inventados se guardan por cuenta
// para que una fecha cambiada dure hasta recargar. Sin el SQL aplicado la
// consulta falla y el panel sigue siendo el real.
let ejemploAlumnosPanel={usuario:undefined,datos:null};
async function ejemploAlumnosDeCuenta(){
  const usuario=currentUser&&currentUser.id;
  let activo=false;
  try{const {data,error}=await supabaseClient.rpc('mis_alumnos_ejemplo');activo=!error&&data===true;}catch(e){}
  if(!activo||(currentUser&&currentUser.id)!==usuario)return null;
  if(ejemploAlumnosPanel.usuario!==usuario||!ejemploAlumnosPanel.datos)
    ejemploAlumnosPanel={usuario,datos:datosEjemploAlumnosPanel()};
  return ejemploAlumnosPanel.datos;
}
const ALUMNOS_POR_PAGINA=50;
let versionPanelAlumnos=0;
