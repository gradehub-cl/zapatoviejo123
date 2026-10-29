
// ─── IDENTIDAD VISUAL ÚNICA ──────────────────────────────────────────────────
// GradeHub tiene una sola voz visual, independiente de la universidad. TENANTS
// sigue decidiendo mallas, carreras, presets y portales; acá solo viven los
// tokens que debe compartir toda la app. Agregar una universidad es puro dato,
// no la creación de otra paleta.
//
// Cian profundo: da energía sin apropiarse del verde del semáforo. El cian de
// los ramos sigue siendo más luminoso y funciona solo como identificador.
// Semáforo de notas. Vive fuera de ACENTOS y FONDOS porque verde/ámbar/rojo son
// semánticos (aprobado / al borde / reprobado), no decorativos. Cada modo tiene
// sus propios valores: los colores luminosos del modo oscuro no alcanzan
// contraste sobre las superficies claras.
// El ámbar de claro se oscureció de #a16207 a #96590a el 2026-08-26. No es
// estética: con el valor anterior quedaba en 4,56 sobre el fondo de Neutro y
// 4,57 sobre el de Papel, o sea todo el modo claro pasaba el 4,5:1 por dos
// centésimas. Cualquier fondo un punto más oscuro lo tumbaba — que es
// exactamente lo que pasó al intentar diferenciar Pizarra. Ahora hay margen en
// los tres fondos. El significado no cambia: sigue siendo el ámbar de "al
// borde", y sigue sin teñirse por tema.
const SEMAFORO={
  claro:{
    green:'#0f766e',greenBg:'#e6f7f5',greenBorder:'#a7ebe1',
    yellow:'#96590a',yellowBg:'#fdf9e7',
    red:'#c02b3f',redBg:'#fdecef',
  },
  oscuro:{
    green:'#2ecc40',greenBg:'#08210d',greenBorder:'#155224',
    yellow:'#ffc94d',yellowBg:'#231a06',
    red:'#ff5f7a',redBg:'#280d15',
  },
};

// La identidad es la de og-v3.png, la tarjeta social del producto, con sus colores
// exactos: el turquesa del kicker GRADEHUB (#2dd4bf) y el de la palabra "Excel"
// (#56e2e8), sobre el fondo casi negro de la misma tarjeta (#05070a).
//
// LO QUE COSTÓ USAR EL COLOR EXACTO. El turquesa está a 2° de matiz del verde de
// aprobado que había (#2ee6c8) y a 17° del color de ramo cian (#06b6d4). Con la
// marca ahí, un botón se leía como "aprobado" y un ramo se veía como la marca.
//
// Se movieron los otros dos, no la marca: el color de la identidad lo eligió una
// persona mirando una imagen, y el del semáforo solo tiene que ser inconfundible.
// El verde de aprobado pasó a #2ecc40 (127°) y el ramo cian a #0ea5e9 (199°),
// dejando la marca en 172° con 45° y 27° de separación.
//
// Antes de esto la identidad fue verde mineral, después cian (#22d3ee) y después
// índigo. El cian quedaba a 1° del ramo cian; el índigo se leía morado y no era
// el color de la tarjeta. Este es el color de la tarjeta.
//
// primary es la versión profunda para modo claro: mismo matiz, 5,23:1 con blanco.
const GRADEHUB_THEME={
  primary:'#0d7a6b', primaryFg:'#ffffff', primaryLight:'#dff7f2',
  darkPrimary:'#2dd4bf', darkPrimaryFg:'#04231e', darkPrimaryLight:'#0a2b26',
  accent:'#56e2e8', secondary:'#0d7a6b', darkSecondary:'#2dd4bf',
};
// Acentos elegibles. Cambiar el acento no convierte cada opción en un tema
// distinto ni toca fondos o semáforo.
const ACENTOS={
  turquesa:{nombre:'Turquesa',...GRADEHUB_THEME},
  azul:{
    nombre:'Azul',
    primary:'#1e40af',primaryFg:'#ffffff',primaryLight:'#e8efff',
    darkPrimary:'#bfdbfe',darkPrimaryFg:'#071a33',darkPrimaryLight:'#102640',
    accent:'#93c5fd',secondary:'#1e40af',darkSecondary:'#bfdbfe',
  },
  indigo:{
    nombre:'Índigo',
    primary:'#3730a3',primaryFg:'#ffffff',primaryLight:'#ecebff',
    darkPrimary:'#c7d2fe',darkPrimaryFg:'#14143d',darkPrimaryLight:'#202044',
    accent:'#a5b4fc',secondary:'#3730a3',darkSecondary:'#c7d2fe',
  },
  violeta:{
    nombre:'Violeta',
    primary:'#5b21b6',primaryFg:'#ffffff',primaryLight:'#f1e9ff',
    darkPrimary:'#ddd6fe',darkPrimaryFg:'#24113f',darkPrimaryLight:'#291b3d',
    accent:'#d8b4fe',secondary:'#5b21b6',darkSecondary:'#ddd6fe',
  },
  // Los cálidos son terrosos a propósito. Un naranjo luminoso se confundiría
  // con el ámbar del semáforo y un coral con el rojo de reprobación.
  cobre:{
    nombre:'Cobre',
    primary:'#8a3412',primaryFg:'#ffffff',primaryLight:'#fff0e7',
    darkPrimary:'#fbb08f',darkPrimaryFg:'#2b1008',darkPrimaryLight:'#35170f',
    accent:'#ffc0a0',secondary:'#8a3412',darkSecondary:'#fbb08f',
  },
  frambuesa:{
    nombre:'Frambuesa',
    primary:'#8b1e4a',primaryFg:'#ffffff',primaryLight:'#fcebf2',
    darkPrimary:'#f0bfd1',darkPrimaryFg:'#2b0a17',darkPrimaryLight:'#35101f',
    accent:'#eab5d1',secondary:'#8b1e4a',darkSecondary:'#f0bfd1',
  },
};

// Fondos y acentos son dos decisiones independientes. Cada fondo declara sus
// superficies y texto en ambos modos: elegir Papel en claro no puede arrastrar
// los textos de Pizarra oscuro, ni viceversa. Neutro es la base Editorial:
// blanco y negro sin tinte. Cambia su presentación, no la preferencia guardada.
const FONDOS={
  neutro:{
    nombre:'Neutro',
    claro:{
      bg:'#ffffff',bg2:'#ffffff',card:'#ffffff',border:'#e7e7e9',border2:'#b8b8be',muted:'#f2f2f4',
      fg:'#19191c',fg2:'#54545b',fg3:'#6c6c74',
    },
    oscuro:{
      bg:'#080809',bg2:'#080809',card:'#111113',border:'#27272c',border2:'#55555e',muted:'#1b1b1f',
      fg:'#f1f1f3',fg2:'#b4b4bd',fg3:'#92929c',
    },
  },
  pizarra:{
    nombre:'Pizarra',
    // En claro esto era casi Neutro: el fondo estaba a 1,3 de distancia y la
    // tarjeta era el mismo #ffffff exacto. Elegir Pizarra y que no cambie nada
    // es peor que no ofrecerlo, y lo reportó una estudiante el 2026-08-25.
    // Ahora la tarjeta deja de ser blanco puro —que es lo que la hacía
    // indistinguible— y el conjunto se enfría hacia el gris azulado que ya
    // tiene en oscuro. La referencia de cuánta diferencia hace falta es Papel,
    // que en claro sí se distingue.
    claro:{
      bg:'#e6edf5',bg2:'#f2f6fb',card:'#f7fafd',border:'#ccd9e7',border2:'#a3b5c8',muted:'#dde6f1',
      fg:'#0b1722',fg2:'#3c5063',fg3:'#56697a',
    },
    oscuro:{
      bg:'#0e141b',bg2:'#141c25',card:'#1b2632',border:'#2b3b4c',border2:'#3b5166',muted:'#202c38',
      fg:'#edf4f8',fg2:'#aab8c4',fg3:'#8394a3',
    },
  },
  papel:{
    nombre:'Papel',
    claro:{
      bg:'#faf6ef',bg2:'#fffdf8',card:'#fffaf1',border:'#eadfce',border2:'#d5c3ad',muted:'#f3eadf',
      fg:'#211a12',fg2:'#594b3d',fg3:'#756554',
    },
    oscuro:{
      bg:'#1b1510',bg2:'#251d15',card:'#30261d',border:'#44372a',border2:'#5c4c3c',muted:'#352a20',
      fg:'#f8f0e4',fg2:'#c6b8a7',fg3:'#a0917e',
    },
  },
};
const SURFACE_KEYS=['bg','bg2','card','border','border2','muted','fg','fg2','fg3'];

// Carreras y mallas por universidad. Presets verificados solo en ING-PC (1er sem).
