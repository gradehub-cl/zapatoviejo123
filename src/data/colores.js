// GradeHub · datos
//
// Catálogo (mallas, carreras, presets), temas y portales. Solo literales: acá no
// hay DOM, no hay estado y no se llama a nada. Las funciones que leen estos datos
// (mallaFor, presetRamo…) viven en app.js.
//
// Se carga como <script> normal ANTES de app.js — los const quedan en el ámbito
// léxico global compartido, así que app.js los ve sin imports.

// ─── COLORES DE RAMO ─────────────────────────────────────────────────────────
// El color de un ramo es un IDENTIFICADOR, no decoración. Su único trabajo es
// que el estudiante distinga un ramo de otro de un vistazo. Por eso es UNA sola
// paleta para los cuatro temas, con el mismo criterio que el semáforo: si el
// color comunica algo, no se tiñe por universidad.
//
// Antes había una paleta por tema, teñida para armonizar con su acento: FEN
// tenía cuatro azules y tres dorados, UC ocho variaciones del mismo azul. Se
// veía elegante y era inservible — con seis ramos en pantalla, ninguno se
// distinguía del de al lado.
//
// Los matices están repartidos por la rueda de color, a 21° o más uno de otro,
// y ninguno cae cerca del semáforo (verde #2ecc40, ámbar #ffc94d, rojo #ff5f7a)
// para que nadie confunda "este ramo es rojo" con "este ramo va reprobado".
// Por eso no hay rojo ni amarillo acá: esos matices ya significan otra cosa.
// Al agregar uno nuevo, respeta la separación — el test la verifica.
const COLORS=[
  '#ea580c', // naranjo
  '#a3e635', // lima
  '#22c55e', // verde
  '#0ea5e9', // cian
  '#3b82f6', // azul
  '#6366f1', // índigo
  '#a855f7', // violeta
  '#d946ef', // fucsia
  '#ec4899', // rosa
];

// ─── COLOR POR FAMILIA DE RAMO ───────────────────────────────────────────────
// Un ramo nuevo no arranca con "el siguiente color libre" sino con el de su
// familia: todos los Métodos Matemáticos comparten matiz, todos los Inglés
// comparten otro. Así el estudiante ve su carga de matemáticas o de idiomas de
// un vistazo, sin leer los nombres.
//
// Las asociaciones base salen de cómo Anto ordenaba sus propias carpetas:
// microeconomía violeta, inglés rosa, comunicación naranjo, contabilidad verde,
// gestión de personas azul, métodos matemáticos amarillo. Ese último es lima
// acá: el amarillo puro está reservado al semáforo (ámbar = "al borde") y un
// ramo teñido de amarillo se leería como un estado.
//
// El orden importa: gana la PRIMERA que calce. Por eso lo específico va antes
// que lo general ('Métodos Cuantitativos' antes que 'Métodos').
// Un ramo que no calce con ninguna toma un color estable derivado de su nombre,
// así que dos compañeros ven el mismo ramo del mismo color.
const FAMILIAS_COLOR=[
  // Lo específico va antes que lo general: 'Métodos Cuantitativos' tiene que
  // resolverse antes de que 'Métodos Matemáticos' se lo lleve.
  [/metodos cuantitativos|estadistica|probabil|investigacion operativa|juegos y estrategias|toma de decisiones|optimizacion/, '#a3e635'], // lima — cuantitativo
  [/metodos matematicos|calculo|algebra|ecuaciones diferenciales/, '#a3e635'], // lima — matemáticas
  [/contabilidad|costos|contable|tributa|impuesto/, '#22c55e'], // verde — contable
  [/auditoria|control interno|riesgos/,          '#ea580c'], // naranjo — auditoría
  [/ingles|idioma/,                              '#ec4899'], // rosa — idiomas
  [/comunicacion/,                               '#ea580c'], // naranjo — comunicación
  [/microeconomia|macroeconomia|economia|econom/,'#a855f7'], // violeta — economía
  [/gestion de personas|personas|organizacional/,'#3b82f6'], // azul — personas
  [/finanzas|inversion|financier|presupuesto/,   '#0ea5e9'], // cian — finanzas
  [/control de gestion|estrategia|gestion y empresas|gestion de procesos/, '#3b82f6'], // azul — gestión
  [/marketing|negocios|comercial|competencia y mercado|mercados/, '#d946ef'], // fucsia — negocios
  [/programacion|machine learning|datos|sistemas|tecnologia|informatica|transformacion digital|ingenieria/, '#6366f1'], // índigo — tecnología
  [/derecho|legal|legisla|etica|filosof|pensamiento|historia/, '#ea580c'], // naranjo — humanidades y derecho
  // La física de Ingeniería UC no se llama "física": los ramos son Dinámica,
  // Termodinámica y Electricidad y Magnetismo, y sus laboratorios heredan el
  // matiz porque el nombre los contiene ("Laboratorio de Dinámica").
  [/quimica|fisica|biolog|dinamica|electricidad|magnetismo|estatica|mecanica|ondas|optica/, '#0ea5e9'], // cian — ciencias
  [/practica|taller|integracion|afe/,            '#d946ef'], // fucsia — práctica
];
