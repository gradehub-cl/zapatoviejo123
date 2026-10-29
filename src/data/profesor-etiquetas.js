
// Etiquetas para calificar al profesor: cómo es como profe, no la clase (Lucas,
// 2026-10-27). Sin género, sin insultos y sin texto libre (salvo «Otro», que el
// panel agrega al final). La valencia va de 1 (más negativa) a 5 (más positiva):
// el panel muestra las 6 más cercanas a las estrellas elegidas. Las claves son
// las que acepta profesor_etiquetas_validas() en supabase/profesores.sql (lo
// compara un test).
const PROFESOR_ETIQUETAS=[
  {id:'cuesta_entenderle',texto:'Cuesta entenderle',valencia:1},
  {id:'distante',texto:'Distante',valencia:1.5},
  {id:'poco_paciente',texto:'Poco paciente',valencia:1.5},
  {id:'inflexible',texto:'Inflexible',valencia:2},
  {id:'impuntual',texto:'Impuntual',valencia:2},
  {id:'responde_poco',texto:'Responde poco',valencia:2},
  {id:'exigente',texto:'Exigente',valencia:3},
  {id:'flexible',texto:'Flexible',valencia:3.5},
  {id:'puntual',texto:'Puntual',valencia:3.5},
  {id:'escucha',texto:'Escucha',valencia:4},
  {id:'amable',texto:'Amable',valencia:4},
  {id:'paciente',texto:'Paciente',valencia:4},
  {id:'motiva',texto:'Motiva',valencia:5},
  {id:'buena_onda',texto:'Buena onda',valencia:5},
];

// Docente propuesto al calificar: BuscaCursos UC, oferta 2026-2, consultada
// el 2026-10-27. No son aportes ni calificaciones de estudiantes.
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=MAT1620
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=FIS1514
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=FIS0154
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=IIC1103
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=BIO141C
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=BIO143M
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=TTF012
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=FIL2001
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=MAT1279
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=EAA1510
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=EAE1210
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=MAT1610
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=ICS1513
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=BIO110C
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=MAT1203
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=TTF210
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=CLG0030
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=TTF205
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=EAA1210
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=EAE1110
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=QIM100
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=BIO187C
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=QIM100E
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=TTF036
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=ANT100
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=GEO103
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=ICP0101
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=MAT1000
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=TTF215
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=TTF083
// https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=TTF115
// Cuando figuran varios, se propone el primero listado y se pide confirmar.
// Solo se invierte «Apellido Nombre»; se conserva la grafía de la fuente.
// No se aplica a otro período ni se infiere la sección por nombre de ramo.
