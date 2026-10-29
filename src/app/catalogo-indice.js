
function catalogRamos(tenant,carrera){
  const porCarrera=mallaDeCarrera(tenant,carrera);
  if(!porCarrera)return [];
  const out=[],vistos=new Set();
  Object.keys(porCarrera).sort((a,b)=>Number(a)-Number(b)).forEach(sem=>{
    (porCarrera[sem]||[]).forEach(nombre=>{
      const k=normName(nombre);
      if(vistos.has(k))return;
      vistos.add(k);
      out.push({nombre,semestre:Number(sem),sigla:tenant==='uc'?siglaCatalogoUC(nombre):null,
                tienePreset:!!findPresetName(nombre,tenant,carrera)});
    });
  });
  return out;
}

// Todos los ramos de la universidad, no solo los de tu carrera. Un alumno de
// Control de Gestión puede estar cursando un ramo que solo figura en la malla
// de Comercial, y antes no había forma de encontrarlo. Incluye las mallas que
// ya no se ofrecen al elegir carrera (Contador Auditor): dejaron la oferta,
// no el catálogo.
//
// `propio` marca si el ramo está en la malla del estudiante — se usa para
// ordenar, no para esconder.
//
// La identidad se resuelve por nombre normalizado O por sigla. Las fuentes no
// siempre escriben igual el nombre oficial y también pueden asociar códigos
// distintos al mismo rótulo. Si cualquiera de las dos claves
// coincide, se conserva una sola fila y gana la que realmente ayuda al alumno:
// pauta > ubicación en la malla > curso pelado.
function prioridadCatalogo(r){
  if(r&&r.tienePreset)return 3;
  if(r&&Number(r.semestre)>0)return 2;
  return 1;
}
function buildCatalog(filas){
  const rows=(filas||[]).filter(r=>r&&normName(r.nombre));
  const parent=rows.map((_,i)=>i);
  const find=i=>{
    let root=i;
    while(parent[root]!==root)root=parent[root];
    while(parent[i]!==i){const next=parent[i];parent[i]=root;i=next;}
    return root;
  };
  // Una pauta que declara su sigla pertenece a ESE curso. Si otro curso se llama
  // igual pero tiene otra sigla, no se juntan: "Revelación y Fe" es TTF012 (con
  // pauta) y también TEB110 (sin pauta). Juntos mostraban una sola fila con la
  // sigla de uno y la pauta del otro, y al agregarla la pauta no se cargaba
  // (reportado el 2026-09-30). Fuera de ese caso, el mismo nombre con siglas
  // distintas se sigue deduplicando como antes.
  const siglaDe=rows.map(r=>normName(r.sigla||'')),siglaPautaDe=rows.map(r=>normName(r.siglaPauta||''));
  const chocan=(a,b)=>(siglaPautaDe[a]&&siglaDe[b]&&siglaDe[b]!==siglaPautaDe[a])||(siglaPautaDe[b]&&siglaDe[a]&&siglaDe[a]!==siglaPautaDe[b]);
  const unir=(a,b)=>{
    a=find(a);b=find(b);if(a===b||chocan(a,b))return;
    parent[b]=a;siglaDe[a]=siglaDe[a]||siglaDe[b];siglaPautaDe[a]=siglaPautaDe[a]||siglaPautaDe[b];
  };
  const porNombre=new Map(),porSigla=new Map();
  rows.forEach((r,i)=>{
    const nombre=normName(r.nombre),sigla=normName(r.sigla||'');
    if(porNombre.has(nombre))unir(i,porNombre.get(nombre));
    else porNombre.set(nombre,i);
    if(sigla){
      if(porSigla.has(sigla))unir(i,porSigla.get(sigla));
      else porSigla.set(sigla,i);
    }
  });

  const grupos=new Map();
  rows.forEach((r,i)=>{
    const root=find(i);
    if(!grupos.has(root))grupos.set(root,[]);
    grupos.get(root).push(r);
  });
  return Array.from(grupos.values()).map(grupo=>{
    let mejor=grupo[0];
    grupo.slice(1).forEach(r=>{if(prioridadCatalogo(r)>prioridadCatalogo(mejor))mejor=r;});
    const unido={...mejor};
    // La precedencia decide qué nombre y fuente representan al ramo, pero no
    // bota información compatible: una pauta fuera de malla todavía puede
    // heredar el semestre y la sigla que otra fuente sí conoce.
    grupo.forEach(r=>{
      if(!unido.sigla&&r.sigla)unido.sigla=r.sigla;
      if(!(Number(unido.semestre)>0)&&Number(r.semestre)>0)unido.semestre=Number(r.semestre);
      if(r.propio)unido.propio=true;
      if(r.tienePreset)unido.tienePreset=true;
      ['creditos','escuela','indiceEscuela'].forEach(k=>{
        if((unido[k]===undefined||unido[k]===null||unido[k]==='')&&r[k]!==undefined)unido[k]=r[k];
      });
    });
    return unido;
  });
}
function catalogRamosUniversidad(tenant,carreraPropia){
  const mallas=mallaFor(tenant)||{};
  const propios=new Set(catalogRamos(tenant,carreraPropia).map(r=>normName(r.nombre)));
  const out=[];
  const mallasBuscables=Object.entries(mallas);
  // Cualquier carrera busca ramos de TODA su universidad, no solo de su malla:
  // un electivo, un minor o un ramo de otra carrera también se cursan. Así que
  // entran todas las mallas diferidas, no solo la del alumno. Las ajenas van
  // con semestre 0: su "3° semestre" es el de otra carrera y no le dice nada.
  const ajenas=new Set();
  Object.entries(mallasExtraDe(tenant)||{}).forEach(([car,porSem])=>{
    if(Object.prototype.hasOwnProperty.call(mallas,car))return;
    mallasBuscables.push([car,porSem]);
    if(car!==carreraPropia)ajenas.add(car);
  });
  mallasBuscables.forEach(([car,porSem])=>{
    Object.keys(porSem).sort((a,b)=>Number(a)-Number(b)).forEach(sem=>{
      (porSem[sem]||[]).forEach(nombre=>{
        const k=normName(nombre);
        const sigla=tenant==='uc'?siglaCatalogoUC(nombre):null;
        out.push({nombre,semestre:ajenas.has(car)?0:Number(sem),propio:propios.has(k),sigla,
                  tienePreset:!!findPresetName(nombre,tenant,carreraPropia)||!!findPresetName(nombre,tenant,car)});
      });
    });
  });
  // Un ramo con pauta oficial que no está en ninguna malla existía y nadie
  // podía encontrarlo: el catálogo se arma solo desde las mallas, así que
  // "Revelación y Fe" o "Principios Ecológicos y Medio Ambiente" no aparecían
  // al escribir. La pauta funcionaba —tecleando el nombre completo y exacto—
  // pero para eso hay que saber de antemano que existe. Los OFG y electivos no
  // van en la malla a propósito, porque son una elección y no un ramo de todos;
  // eso no es razón para esconder su pauta.
  presetsFueraDeMalla(tenant,carreraPropia).forEach(nombre=>{
    // La sigla de la propia pauta sirve para no juntarla con un homónimo que
    // tiene otra sigla. No se muestra como sigla de la fila: hay programas que
    // la declaran pendiente, y al agregar el ramo la app la toma de la pauta.
    const siglaPauta=tenant==='uc'?siglaDePreset(nombre):null;
    const sigla=tenant==='uc'?siglaCatalogoUC(nombre):null;
    // semestre 0 = fuera de malla. No compite con los del semestre del
    // estudiante en el orden, porque no le corresponde a nadie en particular.
    out.push({nombre,semestre:0,propio:false,sigla,siglaPauta,tienePreset:true});
  });
  // Las pautas que cinco o más estudiantes reportaron igual se ofrecen como las
  // del catálogo, diciendo de dónde salen. Si hay una de programa para ese ramo,
  // manda la del programa y esta no entra.
  pautasConsensoCatalogo(tenant).forEach(c=>{
    if(findPresetName(c.ramo,tenant,carreraPropia))return;
    const nombre=limpiarNombreAjeno(c.ramo);if(!nombre)return;
    out.push({nombre,semestre:0,propio:false,sigla:tenant==='uc'?siglaCatalogoUC(nombre):null,tienePreset:true,consenso:c.respaldos});
  });
  // Y los cursos que existen sin pertenecer a un semestre ni traer pauta: los
  // optativos y OFG. Entran por el mismo camino que los presets fuera de
  // malla, con `tienePreset:false` porque no hay ponderaciones que prometer.
  // Sin esto el estudiante tiene que escribir "biocel" a mano y la app lo
  // guarda como un ramo inventado por él, sin sigla y sin forma de agrupar.
  if(tenant==='uc')cursosUcDisponibles().forEach(([sigla,nombre,creditos,indiceEscuela])=>{
    if(typeof nombre!=='string'||!nombre.trim())return;
    out.push({nombre,semestre:0,propio:false,sigla,creditos:typeof creditos==='number'?creditos:null,
              escuela:escuelaCursoUc(indiceEscuela),fuente:'curso-uc',
              tienePreset:pautaCalzaConSigla(findPresetName(nombre,tenant,carreraPropia),sigla)});
  });
  // CREDITOS_UC ya viene del catálogo oficial de los 34 majors. No inventa
  // una malla ni dice a qué semestre corresponde: solo evita que Ingeniería
  // UC termine artificialmente en 4° y deja buscar por la sigla del horario.
  if(tenant==='uc')Object.entries(CREDITOS_UC).forEach(([nombre,[,sigla]])=>{
    out.push({nombre,semestre:0,propio:false,sigla,fuente:'catalogo-ingenieria',tienePreset:false});
  });
  return buildCatalog(out);
}
// Nombres con pauta oficial que ESTE estudiante puede recibir de verdad. Se
// pregunta por findPresetName y no por las claves del registro: los presets UC
// son del plan común de Ingeniería y no valen para Comercial —"Cálculo I" de
// Comercial es otro curso—, así que listarlos sin filtrar pondría una estrella
// de "pauta oficial" sobre un ramo que después se agregaría vacío.
function presetsFueraDeMalla(tenant,carrera){
  const p=PRESETS_POR_TENANT[tenant];
  if(!p)return [];
  // findPresetName ya descarta los que solo traen reglas y no ponderaciones
  // (Cálculo II): si no hay pauta que ofrecer, no hay nada que mostrar acá.
  return Object.keys(p).filter(n=>!!findPresetName(n,tenant,carrera));
}

// B\u00fasqueda tolerante a tildes. Ordena: exacto > empieza con > contiene;
// a igualdad, primero los del semestre actual del estudiante.
//
// El catálogo UC completo supera las 13 mil filas. Armarlo y volver a quitar
// tildes de cada nombre en cada tecla consumía casi un cuadro en computador.
// El índice conserva exactamente las mismas filas y el mismo ordenamiento; solo
// memoriza el catálogo derivado y sus textos normalizados. Las referencias a
// mallas/cursos diferidos son su versión: cuando aparece un archivo nuevo, la
// siguiente búsqueda reconstruye el índice sola y no queda pegada al fallback.
