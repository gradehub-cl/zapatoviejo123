const PRESETS_UC_COM=[
  // Los de abajo, en cambio, son ramos PROPIOS de Comercial: su pauta salió del
  // catálogo oficial de su sigla, no de la malla de Ingeniería. Van en esta
  // lista porque sin estar acá el preset existe y ningún estudiante de
  // Comercial lo ve.
  'Comportamiento Organizacional',
  'Contabilidad',
  'Fundamentos de Finanzas',
  'Dirección de Personas',
  'Contabilidad de Costos',
  'Contabilidad Gerencial',
  'Empresas y Legislación',
  'Fundamentos de Marketing',
  'Marketing Analytics',
  'Estrategia de la Organización',
  'Estrategia Competitiva',
  'Análisis Económico: La Experiencia Chilena',
  'Microeconomía I',
  'Microeconomía II',
  'Competencia y Mercado',
  'Macroeconomía I',
  'Macroeconomía II',
  'Aplicaciones Matemáticas para Economía y Negocios',
  'Práctica Social',
  'Ética, Economía y Empresa',
  'Cálculo I',
  'Introducción al Álgebra Lineal',
  'Cálculo II',
  'Introducción a la Macroeconomía',
  'Probabilidad y Estadística',
  'Filosofía: ¿para qué?',
  'Introducción a la Microeconomía',
  // Optativo de formación general: es el mismo curso (IHI0534) en las dos carreras.
  'Entendiendo a Rusia: Historia, Cultura y Presente del Gigante Eurasiatico',
];
// CÁLCULO I ES EL MISMO RAMO EN LAS DOS CARRERAS. Acá decía lo contrario —que el
// de Comercial era otro curso de otra facultad y no heredaba estos pesos— y el
// catálogo oficial de la UC dice que no: MAT1610 es UNA sola sigla, aparece en
// la malla de Ingeniería Plan Común y en la de Comercial, con los mismos 10
// créditos. No hay dos Cálculo I. Confirmado además por un estudiante de
// Comercial que lo cursa.
//
// La distinción sí vale para el resto: los prospectos verificados son del plan
// común de INGENIERÍA, y un ramo que en Comercial lleva otra sigla es otro curso
// aunque se llame igual. Por eso esta lista es explícita y no "todo lo de UC".
// Medicina: solo los ramos de los que tenemos el programa de su facultad.
const PRESETS_UC_MEDICINA=[
  'Integrado Ciencias Médicas III',
  'Morfología III',
  'Bases y Mecanismos de la Enfermedad I',
];
// Carreras UC que reciben pautas, además de Ingeniería, que las recibe todas.
const PRESETS_UC_POR_CARRERA={'COM':PRESETS_UC_COM,'UC-MEDICINA':PRESETS_UC_MEDICINA};
