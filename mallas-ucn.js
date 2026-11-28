// Mallas curriculares UCN, una por carrera. Se carga BAJO DEMANDA igual que
// mallas-uc.js, mallas-uai.js, mallas-uandes.js y mallas-udd.js: solo le sirve a
// quien estudia en la Universidad Católica del Norte.
//
// Hoy trae las tres carreras de la Escuela de Ingeniería en Coquimbo, que es la
// única unidad de la UCN que publica sus mallas y los programas de cada ramo en
// un listado abierto (losvilos.ucn.cl/InstructivosEscuelaIngenieria, carpeta
// «E. Mallas y programas de estudios», leído el 2026-11-27). Las demás carreras
// de la UCN se declaran escribiendo el nombre y agregando los ramos a mano.
//
// De dónde sale cada cosa:
//   · EL SEMESTRE, del folleto «Malla … 2024» de cada carrera. La malla viene
//     como imagen: se dibujó la página y se leyó casillero por casillero.
//   · EL NOMBRE, del título del programa de cada ramo, que el folleto abrevia
//     («Admin. de la Producción I», «Proyecto Form. y Ev. de Proyecto de
//     Inversión»). Los 154 programas se leyeron y se contrastaron con el folleto.
// Solo SUGIEREN los ramos del semestre: el estudiante confirma y edita.
//
// Mismo criterio que las otras universidades: fuera los casilleros que no
// nombran un curso —Electivo Profesional, Electivo Ciencias de la Ingeniería,
// Formación General Electiva— y la Práctica Profesional, que el folleto dibuja
// fuera de los semestres. Por eso Ingeniería Civil Industrial no tiene 9°: ese
// semestre son seis electivos.
//
// Lo que NO es transcripción literal, y por qué:
//   · Los ramos de formación general son los mismos en las tres carreras, pero
//     cada documento los escribe distinto («Diálogo, Fe - Cultura», «Diálogo,
//     fe, y cultura», «Inglés 1», «Inglés I»). Van con un solo nombre.
//   · Los PDF de programas de Computación e Informática traen los nombres sin
//     espacios («ÁlgebraI»); se usó el nombre del archivo, que sí los trae.
//   · «Ingeniería y Desarrollo Sustentable» (Computación) e «Ingeniería y
//     Desarrollo Sostenible» (Industrial) quedan como los escribe cada carrera.
//
// Donde el folleto y el programa no coinciden en el semestre, manda el folleto.
// Son cinco casos, todos de formación general, y están en docs/mallas-ucn.md
// junto con las fuentes.
var MALLAS_UCN_EXTRA={};

// ─── Escuela de Ingeniería, Coquimbo ─────────────────────────────────────────
MALLAS_UCN_EXTRA['UCN-COQ-ICCI']={
  1:['Introducción a la Física','Cálculo I','Álgebra I','Identidad, Universidad, Equidad y Género','Inglés I','Comunicación Efectiva I','Proyecto Introducción a la Ingeniería'],
  2:['Mecánica','Cálculo II','Álgebra II','Programación','Diálogo, Fe y Cultura','Inglés II'],
  3:['Ecuaciones Diferenciales','Cálculo III','Química General','Programación Orientada a Objetos','Técnicas y Metodologías de Programación Avanzada','Comunicación Efectiva II'],
  4:['Electromagnetismo','Estadística','Ingeniería y Desarrollo Sustentable','Emprendimiento','Estructuras de Datos','Proyecto Diseño e Innovación'],
  5:['Electrotecnia','Introducción a Data Science','Diseño de Sistemas Digitales','Bases de Datos','Proyecto Integrador Programación Avanzada'],
  6:['Arquitectura y Organización de Computadores','Fundamentos de la Computación','Introducción al Desarrollo Web/Móvil','Ingeniería de Software','Proyecto Integrador Software'],
  7:['Sistemas de Información I','Lenguajes de Programación','Diseño y Análisis de Algoritmos','Sistemas Operativos','Diálogo, Fe y Ciencia','Proyecto Integrador Plataformas'],
  8:['Sistemas de Información II','Gestión de Proyectos TI','Arquitectura de Sistemas','Redes de Computadores','Ética y Moral Profesional','Proyecto Integrador Gestión TI'],
  9:['Evaluación de Proyectos TI'],
  10:['Capstone Project'],
};
MALLAS_UCN_EXTRA['UCN-COQ-ICI']={
  1:['Introducción a la Física','Cálculo I','Álgebra I','Identidad, Universidad, Equidad y Género','Inglés I','Comunicación Efectiva I','Proyecto Introducción a la Ingeniería'],
  2:['Mecánica','Cálculo II','Álgebra II','Química General','Diálogo, Fe y Cultura','Inglés II'],
  3:['Ecuaciones Diferenciales','Cálculo III','Estadística','Programación','Proyecto Diseño e Innovación'],
  4:['Electromagnetismo','Administración de la Producción I','Estadística Aplicada','Termodinámica','Economía','Comunicación Efectiva II'],
  5:['Investigación Operativa I','Ciencia de Datos','Contabilidad de Dirección','Proyecto Sistemas Productivos'],
  6:['Emprendimiento','Investigación Operativa II','Administración de la Producción II','Ingeniería Económica','Diálogo, Fe y Ciencia','Proyecto Calidad'],
  7:['Ingeniería y Desarrollo Sostenible','Simulación','Tecnologías de Información','Cadena de Suministro','Ética y Moral Profesional','Proyecto Formulación y Evaluación de Proyectos'],
  8:['Planificación Estratégica','Gestión de Capital Humano','Organización Digital','Gestión de Activos','Proyecto Cadena de Suministro'],
  10:['Capstone Project Ingeniería Industrial'],
};
MALLAS_UCN_EXTRA['UCN-COQ-ITI']={
  1:['Cálculo I','Física I','Álgebra I','Identidad, Universidad, Equidad y Género','Inglés I','Proyecto Introducción a la Ingeniería'],
  2:['Cálculo II','Física II','Álgebra II','Programación','Comunicación Efectiva I','Inglés II'],
  3:['Estadística','Química General','Electrotecnia','Programación Orientada a Objetos','Diálogo, Fe y Cultura','Proyecto Programación Avanzada'],
  4:['Ciencia de Datos','Arquitectura y Organización de Computadores','Estructuras de Datos','Comunicación Efectiva II','Diálogo, Fe y Ciencia','Proyecto Sistemas Digitales'],
  5:['Fundamentos de Ciencias de la Computación','Sistemas Operativos','Ingeniería de Software','Bases de Datos','Proyecto IoT'],
  6:['Sistemas de Información','Redes de Computadores I','Desarrollo Soluciones Web/Móvil','Creatividad e Innovación Digital','Proyecto Desarrollo Ágil'],
  7:['Ingeniería de Datos y Big Data','Redes de Computadores II','Gestión de Proyectos TI','Emprendimiento','Ética y Moral Profesional','Proyecto Desarrollo Ágil Escalado'],
  8:['Capstone Project'],
};
