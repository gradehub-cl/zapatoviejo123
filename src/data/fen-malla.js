
// ─── MALLAS FEN 2026 ─────────────────────────────────────────────────────────
// Lo que se OFRECE al elegir carrera. Es más chico que MALLA a propósito: una
// malla que sale de acá no se borra, solo deja de ofrecerse, y sus ramos siguen
// apareciendo en la búsqueda. Volver a ofrecerla es agregar su línea.
const CARRERAS={
  'IC':'Ing. Comercial',
  'IICG':'Ing. en Información y Control de Gestión',
};
// Ramos obligatorios por carrera y semestre. Electivos/Libres se agregan a mano.
// Gestión de Personas y Marketing van en 2º Y 3º a propósito: se cursa uno en
// cada semestre, pero el orden lo elige el estudiante. Aparecen en los dos para
// que ninguno tenga que buscar a mano el que le tocó; en el selector se desmarca
// el que no va.
const _COMUN={
  1:['Introducción a la Economía','Gestión y Empresas','Comunicación','Programación para Analítica de Datos','Métodos Matemáticos I'],
  2:['Introducción a la Microeconomía','Gestión de Personas','Marketing','Contabilidad','Tecnología y Sistemas de Información','Métodos Matemáticos II','Inglés I'],
  3:['Introducción a la Macroeconomía','Gestión de Personas','Marketing','Introducción al Pensamiento Económico y Político','Estadística I','Métodos Matemáticos III','Inglés II'],
  4:['Economía Aplicada','Finanzas','Razonamiento Basado en Datos','Estadística II','Métodos Matemáticos IV','Inglés III'],
};
// Dos nombres, un ramo. Pasa cuando una carrera cursa dos de una serie y otra
// cursa solo el primero: IC tiene 'Métodos Cuantitativos I' y 'II', mientras
// IICG y CA cursan uno solo y lo dejan sin número. Es el mismo MEC3005.
//
// Acá NO se deduce nada por regla. La regla de "quítale el romano" está en
// claveCatalogo() y se niega justamente en estos casos, porque 'Gestión de
// Personas I' sí es otro ramo que 'Gestión de Personas'. Esta tabla es para los
// pares confirmados contra el código oficial del ramo, uno por uno.
//
// La clave es el nombre alternativo; el valor, el nombre canónico —el que lleva
// el código en CREDITOS_FEN—. Las mallas no se tocan: cada carrera sigue
// nombrando el ramo como lo nombra su programa.
const SINONIMOS={
  fen:{
    'Métodos Cuantitativos':'Métodos Cuantitativos I',
    // Contador Auditor lo escribe en singular y Control de Gestión en plural.
    // Es el mismo ramo, confirmado por Martín el 2026-09-04. Ninguno de los dos
    // tiene código todavía, así que el canónico se eligió por elegir: da lo
    // mismo cuál, porque esto solo decide en qué grupo caen sus reportes y cada
    // malla sigue mostrando el nombre que usa su programa.
    'Estrategia y Presupuestos':'Estrategia y Presupuesto',
  },
};
const MALLA={
  // Ing. Comercial. La mención (Ciencias Económicas o Administración) se elige
  // más adelante en la carrera, así que del 1º al 4º es una sola malla. Del 5º
  // en adelante va la UNIÓN de ambas menciones: son ramos POSIBLES, no todos
  // los que cursa una persona. El historial de git conserva la separación
  // original por si algún día se vuelven a ofrecer aparte.
  'IC':{..._COMUN,
    5:['Microeconomía I','Macroeconomía I','Métodos Cuantitativos I','Historia Económica','Inglés IV','Comunicación II','Gestión de Personas I','Economía para los Negocios','Contabilidad Empresarial I'],
    6:['Microeconomía II','Macroeconomía II','Métodos Cuantitativos II','Taller de Política Pública','Marketing I','Taller de Negocios','Negocios I','Finanzas I','Contabilidad Empresarial II'],
    7:['Microeconomía III','Macroeconomía III','Taller Práctico Profesional/Social I','Taller Práctico Profesional/Social II','Negocios II'],
    8:['Microeconomía IV','Macroeconomía IV','Gestión de Personas II','Marketing II','Negocios III','Finanzas II'],
    9:['Práctica Profesional'],10:['Taller de Práctica Profesional'],
  },
  'CA':{
    1:['Gestión y Empresas','Programación para Analítica de Datos','Contabilidad','Métodos Matemáticos I','Comunicación'],
    2:['Introducción a la Economía','Tecnología y Sistemas de Información','Fundamentos de Costos','Métodos Matemáticos II','Ética y Negocios','Inglés I'],
    3:['Introducción a la Microeconomía','Gestión de Riesgos y Control Interno','Métodos Matemáticos III','Estadística I','Introducción al Pensamiento Económico y Político','Inglés II'],
    4:['Introducción a la Macroeconomía','Finanzas','Razonamiento Basado en Datos','Contabilidad Financiera','Estadística II','Inglés III'],
    5:['Sistemas Tributación en la Renta','Métodos Cuantitativos','Análisis Contable','Fundamentos de Auditoría','Inglés IV'],
    6:['Sistemas de Tributación Tipo Consumo','Análisis Financiero e Inversiones','Sistemas de Aplicaciones','Estrategia y Presupuesto','Desarrollo de Auditoría'],
    7:['Economía de los Impuestos','Gestión Financiera Corporativa','Investigación Operativa','Auditoría de Tecnología de la Información','Derecho y Empresa'],
    8:['Gestión Legal Tributaria','Machine Learning','Gestión de Procesos de Negocios','Contabilidad Avanzada','Control Financiero'],
    9:['Taller de Integración Profesional'],10:['Práctica Profesional'],11:['AFE (Trabajo de Cierre)'],
  },
  'IICG':{..._COMUN,
    5:['Métodos Cuantitativos','Contabilidad Financiera','Estrategia y Presupuestos','Sistemas de Administración de Bases de Datos','Inglés IV'],
    6:['Investigación Operativa','Análisis Contable','Planificación y Diseño Organizacional','Sistemas de Aplicaciones','Derecho y Empresa'],
    7:['Machine Learning','Análisis Financiero e Inversiones','Control de Gestión I','Transformación Digital'],
    8:['Toma de Decisiones Bajo Incertidumbre','Juegos y Estrategias','Gestión Financiera Corporativa','Control de Gestión II','Gestión de Procesos de Negocios'],
    9:['Taller de Integración Profesional'],10:['Práctica Profesional'],11:['AFE (Trabajo de Cierre)'],
  },
};
