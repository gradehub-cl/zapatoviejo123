
// ─── MULTI-TENANT (universidad → identidad visual) ───────────────────────────
// `mono` es la sigla que se dibuja en el monograma (ver tenantBadge). No es el
// logo ni el escudo de la universidad: es una etiqueta con iniciales en la
// tipografía de GradeHub. Nunca reproducir marcas registradas acá.
// `colores`: fondo y letra de la sigla, tomados de los manuales de marca de
// cada universidad (Lucas, 2026-11-18). Solo color con iniciales, sin logos.
// Contraste de la sigla sobre su fondo ≥ 4,5:1. `nombreCompleto` se usa al
// elegir universidad (sin «de Chile» en la UC para que quepa en una línea a
// 375 pt); `name` sigue siendo la forma corta del resto de la app.
const TENANTS={
  fen:{name:'U. de Chile', nombreCompleto:'Universidad de Chile', colores:{fondo:'#004B93',texto:'#FFFFFF'}, short:'UChile', conArticulo:'la U. de Chile', mono:'UCH', sub:'Economía y Negocios'},
  // profiles guarda el código estable del tenant; name/label son solo visibles.
  uc :{name:'U. Católica', label:'U. Católica', nombreCompleto:'Pontificia Universidad Católica', colores:{fondo:'#173F8A',texto:'#FEC60D'}, short:'UC', conArticulo:'la UC', mono:'UC', sub:'Ingeniería, Comercial y más carreras'},
  // oculto:true → no se ofrece al elegir universidad, pero sigue funcionando
  // completo (tema, carreras, presets) para quien ya lo tenga seleccionado.
  // Quitar la marca cuando se quiera lanzar.
  uai:{name:'U. Adolfo Ibáñez', nombreCompleto:'Universidad Adolfo Ibáñez', colores:{fondo:'#1D1E20',texto:'#FFFFFF'}, short:'UAI', conArticulo:'la UAI', mono:'UAI', sub:'Todas las carreras'},
  // Las mallas de la UAndes viven en mallas-uandes.js. Pautas todavía no hay:
  // no se inventan ponderaciones.
  uandes:{name:'U. de los Andes', nombreCompleto:'Universidad de los Andes', colores:{fondo:'#E00034',texto:'#FFFFFF'}, short:'UANDES', conArticulo:'la U. de los Andes', mono:'UA', sub:'Todas las carreras'},
  // Las mallas de la UDD viven en mallas-udd.js; sus pautas, en udd-pautas.js,
  // solo de los programas que publican ponderaciones.
  udd:{name:'U. del Desarrollo', nombreCompleto:'Universidad del Desarrollo', colores:{fondo:'#005293',texto:'#FFFFFF'}, short:'UDD', conArticulo:'la UDD', mono:'UDD', sub:'Todas las carreras'},
};

// El dominio del correo institucional de los estudiantes, por universidad. Al
// entrar por primera vez con uno de estos correos (Google o correo), el paso 2
// del onboarding llega con esa universidad ya marcada; se puede cambiar. Solo
// dominios de ESTUDIANTES y verificados: miuandes.cl es el dominio de Google
// Workspace de los alumnos UAndes (su acceso al correo usa hd=miuandes.cl).
const DOMINIOS_CORREO_POR_TENANT={
  uandes:['miuandes.cl'],
};

// Equivalencias institucionales para calificaciones que sí participan del
// promedio. Son dato por universidad: no se aplican a otro tenant por parecido.
// La "C" UC queda fuera a propósito: no tiene equivalencia numérica y el modelo
// todavía no sabe representar un ramo aprobado que no entra al promedio.
const CALIFICACIONES_CONCEPTUALES_POR_TENANT={
  uc:{D:7.0,A:5.0,R:3.0},
};

// ─── GLIFOS DE UNIVERSIDAD ───────────────────────────────────────────────────
// Marcas de línea, sin texto, en el mismo lenguaje de trazo que el resto de los
// íconos de la app. Cada escudo se reduce a su elemento dominante: a 26px un
// escudo de 4 cuadrantes es una mancha, el motivo principal sí se reconoce.
//
// Para reemplazar uno: cambia su entrada acá por el <path> del SVG nuevo.
// Requisitos: viewBox 0 0 48 48, sin fill, trazo heredado (stroke:currentColor).
// Vacío a propósito. Mientras no haya un SVG real de la marca se usa la sigla,
// que el estudiante reconoce al instante. Un símbolo genérico inventado —una
// estrella, una cruz— no identifica a ninguna universidad.
//
// Para activar el logo de una: registra su SVG acá.
//   viewBox="0 0 48 48" · solo trazos · sin fill ni color propio (heredan el tema)
//   máximo ~5 trazos, o no se lee a 20px.
const TENANT_GLYPHS={
  // fen: '<path d="…"/>',
  // uc:  '<path d="…"/>',
};

// Plazo del recordatorio de notas en Inicio (app). Lucas, 18-11-2026:
// UC espera dos semanas y no vence; las demás miran los últimos 14 días.
const RECORDATORIO_NOTAS_POR_TENANT={
  defecto:{desde:1,hasta:14},
  uc:{desde:14,hasta:null},
};

// Mineduc, Directorio IES vigentes (mayo de 2026). Universidades en funcionamiento.
// https://ayudamineduc.cl/ficha/instituciones-vigentes-reconocidas-por-el-mineduc
// Las definiciones con catálogo propio conservan su código y tienen prioridad.
const UNIVERSIDADES_CHILE=[
  ['uach','UACh','Universidad Austral de Chile'],
  ['uac','UAC','Universidad de Aconcagua'],
  ['uah','UAH','Universidad Alberto Hurtado'],
  ['uahc','UAHC','Universidad Academia de Humanismo Cristiano',['La Academia']],
  ['uda','UDA','Universidad de Atacama'],
  ['uay','UAY','Universidad de Aysén'],
  ['uautonoma','UA','Universidad Autónoma de Chile',['UAutónoma']],
  ['ubo','UBO',"Universidad Bernardo O’Higgins"],
  ['ubio','UBB','Universidad del Bío-Bío',['Biobío','Bio Bio']],
  ['ubolivariana','UB','Universidad Bolivariana'],
  ['ucen','UCEN','Universidad Central de Chile',['UCentral']],
  ['ucm','UCM','Universidad Católica del Maule'],
  ['ucn','UCN','Universidad Católica del Norte'],
  ['ucsc','UCSC','Universidad Católica de la Santísima Concepción'],
  ['ucsh','UCSH','Universidad Católica Cardenal Raúl Silva Henríquez',['Silva Henríquez']],
  ['uct','UCT','Universidad Católica de Temuco'],
  ['udec','UdeC','Universidad de Concepción'],
  ['udalba','UDALBA','Universidad del Alba'],
  ['udla','UDLA','Universidad de Las Américas'],
  ['udp','UDP','Universidad Diego Portales'],
  ['uft','UFT','Universidad Finis Terrae',['Finis']],
  ['ufro','UFRO','Universidad de La Frontera'],
  ['ugm','UGM','Universidad Gabriela Mistral'],
  ['ula','ULagos','Universidad de Los Lagos',['ULA']],
  ['ulaleones','UL','Universidad Los Leones'],
  ['ulrep','ULR','Universidad La República',['ULARE']],
  ['umag','UMAG','Universidad de Magallanes'],
  ['umayor','UM','Universidad Mayor',['UMayor']],
  ['umc','UMC','Universidad Miguel de Cervantes'],
  ['umce','UMCE','Universidad Metropolitana de Ciencias de la Educación',['Pedagógico']],
  ['unab','UNAB','Universidad Andrés Bello'],
  ['unach','UNACH','Universidad Adventista de Chile'],
  ['uniacc','UNIACC','Universidad de Artes, Ciencias y Comunicación'],
  ['unap','UNAP','Universidad Arturo Prat'],
  ['uoh','UOH',"Universidad de O’Higgins"],
  ['upla','UPLA','Universidad de Playa Ancha de Ciencias de la Educación'],
  ['pucv','PUCV','Pontificia Universidad Católica de Valparaíso',['UCV']],
  ['usach','USACH','Universidad de Santiago de Chile',['Santiago','USaCh','UTE']],
  ['usek','USEK','Universidad SEK'],
  ['userena','ULS','Universidad de La Serena',['ULaSerena']],
  ['usm','USM','Universidad Técnica Federico Santa María',['UTFSM','Sansana','Santa María']],
  ['uss','USS','Universidad San Sebastián'],
  ['ust','UST','Universidad Santo Tomás'],
  ['uta','UTA','Universidad de Tarapacá'],
  ['utal','UTalca','Universidad de Talca'],
  ['utem','UTEM','Universidad Tecnológica Metropolitana'],
  // «UA» ya es la Autónoma; Antofagasta va con la sigla de su dominio.
  ['uantof','UANTOF','Universidad de Antofagasta',['UA','UAntofagasta']],
  ['uv','UV','Universidad de Valparaíso'],
  ['uvm','UVM','Universidad de Viña del Mar'],
];
for(const [id,short,nombreCompleto,alias] of UNIVERSIDADES_CHILE){
  const name=nombreCompleto.replace(/^Universidad /,'U. ');
  TENANTS[id]??={name,nombreCompleto,short,conArticulo:'la '+name,alias,registroBasico:true};
}
