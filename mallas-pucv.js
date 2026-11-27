// Mallas curriculares PUCV, una por carrera. Se carga BAJO DEMANDA igual que las
// de la UC, la UAI, la UAndes, la UDD y la UCN: solo le sirve a quien estudia en
// la Pontificia Universidad Católica de Valparaíso.
//
// Hoy trae una carrera, Ingeniería Civil, que es la única cuya escuela publica el
// plan ramo por ramo con el programa de cada uno
// (eic.pucv.cl/estudia-con-nosotros/plan-de-estudios, leído el 2026-11-27). Las
// demás carreras de la PUCV se declaran escribiendo el nombre y agregando los
// ramos a mano.
//
// Sale de la página «Plan de estudios» de la Escuela de Ingeniería Civil y del
// PDF «Malla curricular actual» que enlaza (plan 2021). Los dos listan los
// mismos 56 ramos en los mismos 11 semestres; se comprobó nombre por nombre.
// Solo SUGIERE los ramos del semestre: el estudiante confirma y edita.
//
// Mismo criterio que las otras universidades: fuera los casilleros que no
// nombran un curso —Electivo 1 a 4 y Formación Fundamental 1 a 3—. Inglés 1 a 4,
// Antropología Cristiana y Ética Cristiana sí son ramos y van.
//
// Lo que NO es transcripción literal: las mayúsculas. La página escribe «Álgebra
// lineal», «Cálculo diferencial e integral», «Cálculo en varias variables»,
// «Física General Termodinámica y ondas» e «Innovación y emprendimiento»; van
// como el resto. «Diseño en Acero» es el nombre de la página y de la malla; el
// programa del ramo dice «Diseño de Acero».
//
// Fuentes, SHA-256 y lo pendiente: docs/mallas-pucv.md.
var MALLAS_PUCV_EXTRA={};

// ─── Escuela de Ingeniería Civil ─────────────────────────────────────────────
MALLAS_PUCV_EXTRA['PUCV-INGENIERIA-CIVIL']={
  1:['Desafíos en Ingeniería Civil','Introducción a la Geometría','Introducción a la Física','Fundamentos de Matemáticas para Ingeniería','Comunicación Efectiva y Desarrollo Profesional e Integral'],
  2:['Programación Aplicada','Álgebra Lineal','Física para Ingeniería','Cálculo Diferencial e Integral','Antropología Cristiana'],
  3:['Mecánica Estática','Materiales de Ingeniería','Física General Termodinámica y Ondas','Cálculo en Varias Variables','Herramientas de Modelado y Topografía'],
  4:['Mecánica Dinámica','Fundamentos de Química','Física General Electromagnetismo','Ecuaciones Diferenciales','Procesos y Técnicas de Construcción'],
  5:['Probabilidad y Estadística','Mecánica de Sólidos','Mecánica de Fluidos','Economía','Inglés 1','Ética Cristiana'],
  6:['Geomecánica','Análisis Estructural','Hidráulica','Métodos Numéricos','Inglés 2'],
  7:['Mecánica de Suelos','Diseño en Acero','Hidrología','Preparación y Evaluación de Proyectos','Inglés 3'],
  8:['Diseño de Caminos','Hormigón Armado','Ingeniería Sísmica','Planificación y Control de Proyectos','Inglés 4'],
  9:['Mecánica de Suelos Aplicada','Ingeniería Sanitaria','Legislación Aplicada'],
  10:['Seminario de Ingeniería Civil 1','Proyecto Integrador','Comunicación, Liderazgo y Equipos'],
  11:['Seminario de Ingeniería Civil 2','Innovación y Emprendimiento'],
};
