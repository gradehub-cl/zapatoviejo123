// Lector de ponderaciones desde el texto de un programa de curso. Lo comparten
// las herramientas del catálogo UC (bin/proponer-pautas-uc.js, medido con su
// benchmark) y la app, que lo usa con el programa del curso en Canvas.
//
// Solo lee: devuelve filas con nombre y peso tal como las declara el texto, y
// las señales que no sabe modelar (eximición, mínimos, fórmulas). No inventa
// pesos ni reparte un porcentaje entre notas; nada de esto se aplica solo.
const GH_PROGRAMA_PAUTA=(function(){
  'use strict';
  const PARSER_VERSION = 'uc-catalogo-3';

  function normalizar(valor) {
    return String(valor || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function decodificarEntidades(texto) {
    const mapa = {
      nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
      aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
      ntilde: 'ñ', uuml: 'ü', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ'
    };
    return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (todo, entidad) => {
      const clave = entidad.toLowerCase();
      if (clave[0] === '#') {
        const numero = clave[1] === 'x' ? parseInt(clave.slice(2), 16) : parseInt(clave.slice(1), 10);
        return Number.isFinite(numero) ? String.fromCodePoint(numero) : todo;
      }
      return mapa[entidad] || mapa[clave] || todo;
    });
  }

  function htmlATexto(html) {
    const pre = html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i);
    const cuerpo = pre ? pre[1] : html;
    return decodificarEntidades(cuerpo)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|tr|h[1-6]|td|pre)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function tituloSinNumero(linea) {
    return String(linea || '').trim()
      .replace(/^(?:[IVXLCDM]+|\d+)\s*[.)-]?\s*/i, '')
      .replace(/[:.\s]+$/, '').trim();
  }

  function esEncabezadoEvaluacion(linea, opciones = {}) {
    const crudo = String(linea || '').trim();
    if (!crudo || crudo.length > 120) return false;
    const titulo = opciones.encabezadosAmplios ? normalizar(crudo.replace(/^(?:[IVXLCDM]+|\d+)[.)-]\s*/i,'')) : normalizar(tituloSinNumero(crudo));
    if (/^(?:evaluacion(?:es)?(?: de(?:l)? aprendizajes?| del curso)?|estrategias? evaluativas?|sistema de evaluacion)$/.test(titulo)) return true;
    // Los programas que escribe cada profe en Canvas titulan la sección con más
    // variedad. Solo se aceptan con esta opción: el catálogo no cambia.
    return !!opciones.encabezadosAmplios && /^(?:evaluacion(?:es)? y ponderacion(?:es)?|ponderacion(?:es)?(?: de (?:las )?(?:evaluaciones|notas))?|calificacion(?:es)?|forma de evaluacion|sistema de calificacion|nota final)$/.test(titulo);
  }

  // Un encabezado estructural tiene número romano/arábigo o se presenta como una
  // línea corta en mayúsculas. Una mención a “evaluación” dentro de un párrafo no
  // abre ni cierra secciones.
  function esEncabezadoEstructural(linea) {
    const crudo = String(linea || '').trim();
    if (!crudo || crudo.length > 140) return false;
    if (/^(?:[IVXLCDM]+|\d+)\s*[.)-]\s*\S/i.test(crudo)) return true;
    const letras = crudo.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
    return letras.length >= 5 && crudo === crudo.toLocaleUpperCase('es-CL') && !/[.!?].+\s/.test(crudo);
  }

  function bloqueEvaluaciones(texto, opciones = {}) {
    const lineas = String(texto || '').split('\n');
    const inicio = lineas.findIndex(linea => esEncabezadoEvaluacion(linea, opciones));
    if (inicio < 0) return null;
    const contenido = [];
    for (let i = inicio + 1; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      // GEO1002 enumera cada evaluación como “1. ... 30%”. El número al inicio
      // parece un encabezado estructural, pero el porcentaje final demuestra que
      // sigue siendo una fila de esta sección.
      if (linea && esEncabezadoEstructural(linea) && !esEncabezadoEvaluacion(linea, opciones) && !filaConPorcentaje(linea)) break;
      if (linea) contenido.push(linea);
    }
    return { encabezado: lineas[inicio].trim(), lineas: contenido, inicio };
  }

  function nombreLimpio(nombre) {
    return nombre
      .replace(/^[\s•*\-–—]+/, '')
      .replace(/^\d+\s*[.)-]\s*/, '')
      .replace(/[\s:;,(\[]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function filaConPorcentaje(linea) {
    // El porcentaje al final evita tomar frases descriptivas como "se exigirá un
    // 75% de asistencia". Dentro de la sección evaluativa, una fila así es la
    // única forma segura de proponer una categoría.
    const porcentajes = [...String(linea || '').matchAll(/\d{1,3}(?:[.,]\d+)?\s*%/g)];
    if (porcentajes.length !== 1) return null;
    const final = linea.match(/^(.*?)(?:\(?\s*)(\d{1,3}(?:[.,]\d+)?)\s*%\s*\)?(?:\s*(?:c\/?u|cada\s+una?))?\s*[.;]?\s*$/i);
    if (!final) return null;
    const nombre = nombreLimpio(final[1]);
    const pesoUnitario = Number(final[2].replace(',', '.'));
    const cadaUna = /(?:c\/?u|cada\s+una?)\s*$/i.test(linea);
    const cantidad = nombre.match(/^(\d+)\s+(.+)$/);
    const peso = cadaUna && cantidad ? pesoUnitario * Number(cantidad[1]) : pesoUnitario;
    if (!nombre || !Number.isFinite(peso) || peso <= 0 || peso > 100) return null;
    return {
      nombre: cantidad ? nombreLimpio(cantidad[2]) : nombre,
      peso,
      detalleDetectado: cantidad ? { cantidad: Number(cantidad[1]), ...(cadaUna ? { pesoCadaUna: pesoUnitario } : {}) } : undefined,
      linea: linea.trim()
    };
  }

  // ICE1513 trae la pauta como una frase y encierra el desglose completo entre
  // paréntesis: “(30% laboratorio, 70% nota de cátedra)”. Solo se interpreta esa
  // forma medida; una fórmula 70/30 escrita en prosa fuera de paréntesis sigue
  // siendo evidencia compleja y nunca se convierte en categorías.
  function filasEnProsaConPorcentajes(linea) {
    const grupos = String(linea || '').match(/\([^()]*\)/g) || [];
    const grupo = grupos.find(g => (g.match(/\d{1,3}(?:[.,]\d+)?\s*%/g) || []).length > 1);
    if (!grupo) return [];
    const interior = grupo.slice(1, -1);
    const partes = interior.split(/\s*[,;]\s*/);
    if (partes.length < 2) return [];
    const filas = partes.map(parte => {
      const match = parte.match(/^(\d{1,3}(?:[.,]\d+)?)\s*%\s+(.+)$/i);
      if (!match) return null;
      const peso = Number(match[1].replace(',', '.'));
      const nombre = nombreLimpio(match[2]);
      if (!nombre || !Number.isFinite(peso) || peso <= 0 || peso > 100) return null;
      return { nombre, peso, linea: String(linea).trim(), origen: 'prosa_multiple' };
    });
    return filas.every(Boolean) ? filas : [];
  }

  function filasConPorcentaje(linea) {
    const simple = filaConPorcentaje(linea);
    return simple ? [simple] : filasEnProsaConPorcentajes(linea);
  }

  function asistenciaEsRequisito(linea, filas, otrasFilas) {
    const n = normalizar(linea);
    if (!/\basistencia\b/.test(n)) return false;
    if (/\b(?:asistencia minima|asistencia obligatoria|requisito de asistencia|porcentaje de asistencia|debera asistir|para aprobar)\b/.test(n)) return true;
    // AGL007 dice solo “Asistencia: 100%”, pero las otras tres evaluaciones ya
    // suman 100. En ese contexto no puede ser otro peso sin llevar la pauta a
    // 200; es una condición. “Participación/asistencia: 10%” no entra acá.
    const soloAsistencia = filas.length === 1 && normalizar(filas[0].nombre) === 'asistencia';
    const totalOtras = otrasFilas.reduce((suma, fila) => suma + fila.peso, 0);
    return soloAsistencia && otrasFilas.length > 0 && Math.abs(totalOtras - 100) < 0.000001;
  }

  function esAgregado(nombre) {
    return /\bevaluaciones?\s+(?:sumativas?|parciales?|te[oó]ricas?)\b|\bnota\s+de\s+presentaci[oó]n\b/i.test(nombre);
  }

  function quitarPadresDesglosados(filas) {
    const quitar = new Set();
    for (let i = 0; i < filas.length; i++) {
      const padre = filas[i];
      if (!esAgregado(padre.nombre)) continue;
      let suma = 0;
      const hijos = [];
      for (let j = i + 1; j < filas.length && suma < padre.peso; j++) {
        if (esAgregado(filas[j].nombre)) break;
        suma += filas[j].peso;
        hijos.push(j);
      }
      // Solo se omite el agregado cuando el propio texto enumera de inmediato un
      // desglose completo. Si no calza exacto, queda para revisión: adivinar cuál
      // de sus filas son hijas sería peor que proponer un total equivocado.
      if (hijos.length > 1 && Math.abs(suma - padre.peso) < 0.000001) quitar.add(i);
    }
    return filas.filter((_, i) => !quitar.has(i));
  }

  function lineaIgnorable(linea) {
    const n = normalizar(linea);
    return !n || /^(?:actividad|evaluacion|instrumento|ponderacion|porcentaje|peso|nota)$/.test(n)
      || /^[\s|+_=-]+$/.test(linea);
  }

  function senalesComplejidad(linea, opciones = {}) {
    const n = normalizar(linea);
    const razones = [];
    const condicional = /\b(?:si|en caso de|siempre que|cuando)\b/.test(n);
    const formula = /\b(?:nota final|promedio final|se calculara|sera calculada|ponderara|pasara a ponderar|equivale?|correspondera)\b/.test(n);
    const porcentajes = (linea.match(/\d{1,3}(?:[.,]\d+)?\s*%/g) || []).length;
    if (opciones.asistenciaRequisito) razones.push('attendance_requirement_detected');
    if (opciones.prosaMultiple) razones.push('ambiguous_percentage_detected');
    if (opciones.fueFila && !opciones.asistenciaRequisito && !opciones.prosaMultiple) return razones;
    if (/\b(?:para aprobar|requisito para aprobar|condicion de aprobacion)\b/.test(n)) razones.push('approval_requirement_detected');
    if (/\b(?:eximid[oa]s?|eximible|eximicion|exencion|podra eximirse|se exime|se eximen)\b/.test(n)) razones.push('exemption_rule_detected');
    if (/\b(?:reemplaza|reemplazara|se reemplazara|sustituye|sustituira)\b/.test(n)) razones.push('replacement_rule_detected');
    if (/\b(?:nota minima|promedio minimo|minimo para aprobar|nota igual o superior a|promedio .{0,30} debera ser|al menos|mayor o igual|inferior a|superior a|minimo entre|maximo entre|minimo de (?:\d+|seis)|tope)\b/.test(n)) razones.push('minimum_or_cap_rule_detected');
    if (/\bexamen\b/.test(n) && (condicional || /\b(?:obligatorio|optativo|exim)/.test(n))) razones.push('conditional_exam_rule_detected');
    if (formula && (porcentajes >= 2 || condicional || /\b(?:alternativ|en cambio|o bien)\b/.test(n))) razones.push('alternative_final_grade_formula_detected');
    if (condicional && !razones.length) razones.push('conditional_rule_detected');
    return [...new Set(razones)];
  }

  // Gramática cerrada, optativa para Canvas. Se reconoce la cláusula completa:
  // una excepción o segunda condición desconocida invalida la interpretación.
  function reglaDeLinea(cita, filas) {
    const t = cita.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/^[•*-]\s+/, '').replace(/[.]$/, '').replace(/\s+/g, ' ');
    const nota = '([1-7](?:[.,][0-9])?)';
    const valor = s => Number(s.replace(',', '.'));
    const nombre = s => filas.find(f => f.nombre.trim().localeCompare(s.trim(),'es',{sensitivity:'base'})===0);
    const examen = filas.filter(f => /^examen(?: final)?$/.test(normalizar(f.nombre)));
    const previas = filas.filter(f => !examen.includes(f));
    let m = /^se (?:eliminan?|descartan?) (?:la (?:peor nota|nota mas baja)|las (\d+) (?:peores notas|notas mas bajas)) de (?:los |las )?(.+)$/.exec(t);
    if (m) {
      const fila = nombre(m[2]), count = Number(m[1] || 1);
      if (fila && count > 0 && fila.cantidad > count)
        return {tipo:'descarte',nombre:fila.nombre,count,cita};
    }
    m = new RegExp('^si (?:el promedio de |la nota de )(?:los |las )?(.+?) (?:es (?:inferior|menor) a|queda bajo|<) '+nota+', la nota final (?:tiene (?:un )?tope de|queda topada en) '+nota+'$').exec(t);
    if (m) {
      const fila=nombre(m[1]),min=valor(m[2]),cap=valor(m[3]);
      if(fila && min<=7 && cap<=7)
        return {tipo:'minimo',nombre:fila.nombre,min,cap,cita};
    }
    m = new RegExp('^si el promedio ponderado de (.+?) y (.+?) (?:es inferior a|queda bajo) '+nota+', la nota final tiene tope de '+nota+'$').exec(t);
    if(m){
      const a=nombre(m[1]),b=nombre(m[2]);
      if(a&&b&&a!==b&&valor(m[3])<=7&&valor(m[4])<=7)
        return {tipo:'grupo',nombre:a.nombre,otra:b.nombre,min:valor(m[3]),cap:valor(m[4]),cita};
    }
    m = new RegExp('^(?:se exime del examen con|eximicion del examen:|se eximen del examen quienes tengan) (?:un )?promedio( ponderado)?(?: de presentacion)? (?:≥|>=|igual o superior a|mayor o igual a|de al menos) '+nota+'(?: y ninguna nota (?:bajo|inferior a) '+nota+')?$').exec(t);
    if (m && cita.trim().length<=220 && examen.length===1 && previas.length && (previas.length===1||m[1])
      && valor(m[2])<=7 && (!m[3]||valor(m[3])<=7)) {
      const segun=previas.map(f=>f.nombre);
      return {tipo:'eximicion',nombre:examen[0].nombre,segun,min:valor(m[2]),...(m[3]?{cadaNota:valor(m[3])}:{}),cita};
    }
    m=/^el examen puede reemplazar la nota de (.+?) si mejora la nota final$/.exec(t);
    if(m && cita.trim().length<=220 && examen.length===1){
      const fila=nombre(m[1]);
      if(fila && fila!==examen[0] && !fila.cantidad && !examen[0].cantidad)
        return {tipo:'reemplazo',nombre:fila.nombre,examen:examen[0].nombre,cita};
    }
    return null;
  }

  function reglasDeEvaluacion(lineas, filas, recortado=false) {
    const propuestas=[],revisar=[];
    const alternativas=lineas.some(l=>/\b(?:alternativ[oa]s?|o bien|(?:esquema|opcion|modalidad) [ab12]|a criterio|a discrecion|segun (?:el |la )?(?:docente|profesor))\b/.test(normalizar(l)));
    for(const cita of lineas){
      const regla=reglaDeLinea(cita,filas);
      const t=normalizar(cita);
      // Incluso una continuación sin palabras clave podría limitar una regla.
      // Las filas de pesos y los encabezados de tabla ya se excluyeron.
      const motivo=recortado?'El texto recibido está incompleto.':alternativas?'El programa deja alternativas o una decisión al equipo docente.'
        :/asistencia/.test(t)?'Esta condición de asistencia requiere revisión.'
        :/reemplaz|sustitu|formula|pondera/.test(t)?'La fórmula no coincide con un cálculo disponible.'
        :/minim|para aprobar|promedio/.test(t)?'Falta precisar el cálculo, sus condiciones o el tope.'
        :'No pudimos identificar toda la condición.';
      if(regla&&!recortado&&!alternativas)propuestas.push(regla);
      else revisar.push({cita,motivo});
    }
    const claves=propuestas.map(p=>p.tipo==='reemplazo'?'formula del examen':p.tipo+'|'+p.nombre);
    const repetidas=new Set(claves).size!==claves.length;
    if(repetidas||revisar.length){
      for(const p of propuestas)revisar.push({cita:p.cita,motivo:repetidas?'Hay más de una regla para la misma evaluación.':'Hay otra condición pendiente en esta sección.'});
      return {propuestas:[],revisar,alternativas};
    }
    return {propuestas,revisar,alternativas};
  }

  function legadoEstado(status) {
    return status === 'auto_importable' ? 'propuesta'
      : status === 'needs_review' ? 'revisar_a_mano' : 'sin_datos';
  }

  function extraerDeTexto(texto, opciones = {}) {
    texto = String(texto || '');
    const nTexto = normalizar(texto);
    const noEncontrado = /\b(?:programa|curso) no encontrado\b|\bno se encontraron resultados\b|\b404 not found\b/.test(nTexto);
    const noDisponible = /\bprograma(?: de curso)? (?:no esta disponible|no disponible|no fue ingresado|no existe|no se encuentra disponible)\b/.test(nTexto);
    const bloque = bloqueEvaluaciones(texto, opciones);
    if (!bloque) {
      const status = noEncontrado || noDisponible ? 'not_found' : 'insufficient_information';
      const reason = noDisponible ? 'source_program_unavailable' : noEncontrado ? 'program_not_found' : 'evaluation_section_not_found';
      return { status, estado: legadoEstado(status), reasons: [reason],
        motivo: status === 'not_found' ? 'El catálogo indica que el programa no está disponible.' : 'No se encontró una sección evaluativa.',
        texto, evaluationSourceText: '', parsedLines: [], unparsedLines: [], complexRuleLines: [], filas: [], total: 0 };
    }
    const evaluationSourceText = [bloque.encabezado, ...bloque.lineas].join('\n');
    const interpretadas = bloque.lineas.map(linea => ({ linea, filas: filasConPorcentaje(linea) }));
    interpretadas.forEach(actual => {
      const otras = interpretadas.filter(x => x !== actual).flatMap(x => x.filas);
      actual.asistenciaRequisito = asistenciaEsRequisito(actual.linea, actual.filas, otras);
      actual.prosaMultiple = actual.filas.some(f => f.origen === 'prosa_multiple');
    });
    const filas = quitarPadresDesglosados(interpretadas.flatMap(x => x.asistenciaRequisito ? [] : x.filas));
    const parsedSet = new Set(filas.map(f => f.linea));
    const parsedLines = bloque.lineas.filter(linea => parsedSet.has(linea));
    const complejas = [];
    const reasons = [];
    const codigoDeclarado = (texto.match(/\bSIGLA\s*:?\s*([A-Z]{2,6}[A-Z0-9_]{2,10})\b/i) || [])[1] || null;
    if (opciones.courseCode && codigoDeclarado && normalizar(opciones.courseCode) !== normalizar(codigoDeclarado)) {
      reasons.push('course_code_mismatch');
    }
    interpretadas.forEach(({ linea, filas: filasLinea, asistenciaRequisito, prosaMultiple }) => {
      const señales = senalesComplejidad(linea, { fueFila: filasLinea.length > 0, asistenciaRequisito, prosaMultiple });
      if (señales.length) complejas.push({ line: linea, reasons: señales });
      reasons.push(...señales);
    });
    interpretadas.filter(x => x.prosaMultiple && /\bminimo de (?:\d+|seis) experiencias\b/.test(normalizar(x.linea)))
      .forEach(() => reasons.push('aggregate_category_detected'));
    filas.filter(f => esAgregado(f.nombre) || (f.detalleDetectado && f.detalleDetectado.cantidad > 1 && !f.detalleDetectado.pesoCadaUna))
      .forEach(() => reasons.push('aggregate_category_detected'));
    const unparsedLines = bloque.lineas.filter(linea => !interpretadas.some(x => x.linea === linea && x.filas.length) && !lineaIgnorable(linea));
    if (unparsedLines.some(linea => !complejas.some(c => c.line === linea))) reasons.push('relevant_unparsed_line');
    const duplicado = filas.find((fila, indice) => filas.findIndex(otra => normalizar(otra.nombre) === normalizar(fila.nombre)) !== indice);
    const total = filas.reduce((suma, fila) => suma + fila.peso, 0);
    if (duplicado) reasons.push('duplicate_evaluation_name');
    if (filas.some(f => !f.nombre || !Number.isFinite(f.peso) || f.peso <= 0 || f.peso > 100)) reasons.push('invalid_weight_or_name');
    if (filas.length && Math.abs(total - 100) > 0.000001) reasons.push('weights_do_not_sum_100');
    const formulas = complejas.filter(c => c.reasons.includes('alternative_final_grade_formula_detected'));
    if (formulas.length > 1) reasons.push('multiple_final_grade_formulas_detected');
    const uniqueReasons = [...new Set(reasons)];
    let status;
    if (!filas.length) status = uniqueReasons.some(r => r !== 'relevant_unparsed_line') ? 'needs_review' : 'insufficient_information';
    else if (uniqueReasons.length) status = 'needs_review';
    else status = 'auto_importable';
    const motivo = status === 'auto_importable' ? null
      : status === 'insufficient_information' ? 'La sección evaluativa no declara ponderaciones suficientes.'
      : `Revisión necesaria: ${uniqueReasons.join(', ')}.`;
    return {
      status, estado: legadoEstado(status), reasons: uniqueReasons, motivo, filas, total, texto,
      evaluationHeading: bloque.encabezado, evaluationSourceText, evaluationSourceHash: typeof opciones.hash === 'function' ? opciones.hash(evaluationSourceText) : null,
      parsedLines, unparsedLines, complexRuleLines: complejas,
      programVersionText: texto.split('\n').find(l => /\b(?:programa|version|semestre|periodo)\b.*\b20\d{2}\b/i.test(l)) || null,
      semester: null, parserVersion: PARSER_VERSION,
      expectedCourseCode: opciones.courseCode || null, detectedCourseCode: codigoDeclarado ? codigoDeclarado.toUpperCase() : null,
    };
  }

  return {
    PARSER_VERSION, normalizar, decodificarEntidades, htmlATexto, tituloSinNumero, esEncabezadoEvaluacion,
    esEncabezadoEstructural, bloqueEvaluaciones, nombreLimpio, filaConPorcentaje, filasEnProsaConPorcentajes,
    filasConPorcentaje, asistenciaEsRequisito, esAgregado, quitarPadresDesglosados, lineaIgnorable,
    senalesComplejidad, legadoEstado, extraerDeTexto, reglasDeEvaluacion,
  };
})();
// En la app se concatena con el resto del motor; en Node lo importa bin/.
if(typeof module!=='undefined'&&module.exports)Object.assign(module.exports,{GH_PROGRAMA_PAUTA});
