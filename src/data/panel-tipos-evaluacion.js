// Clasificación editorial explícita para el análisis del profesor. No son
// reglas del motor ni se copian al estado del alumno. Fuentes: categorías de
// MAT1610 2026-1, MAT1620/FIS1514 2026-2 transcritas en uc-pautas.js.
// Expandir solo tras revisar cada programa; nunca inferir por regex del nombre.
const GH_TIPOS_EVALUACION_PANEL={
 incluidos:['prueba','examen','control'],
 siglas:{MAT1610:'Cálculo I',MAT1620:'Cálculo II',FIS1514:'Dinámica'},
 uc:{
  'Cálculo I':{'Interrogación 1':'prueba','Interrogación 2':'prueba','Interrogación 3':'prueba','Examen':'examen','Laboratorio':'laboratorio'},
  'Cálculo II':{'Interrogación 1':'prueba','Interrogación 2':'prueba','Interrogación 3':'prueba','Examen':'examen','Laboratorio':'laboratorio'},
  'Dinámica':{'Interrogación 1':'prueba','Interrogación 2':'prueba','Controles':'control','Examen':'examen'},
 },
};
