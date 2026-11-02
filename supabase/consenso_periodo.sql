-- Consenso por período, sección y mayoría. Aplicar después de universidades_reportes.sql.
-- Registro de presets generado del catálogo del repo, no escrito por estudiantes.
begin;
create or replace function public.periodo_catalogo(p_fecha timestamptz)
returns text language sql immutable set search_path='' as $$
 select case when extract(month from p_fecha at time zone 'America/Santiago')<=2
 then (extract(year from p_fecha at time zone 'America/Santiago')::int-1)::text||'-2'
 else extract(year from p_fecha at time zone 'America/Santiago')::int::text||case when extract(month from p_fecha at time zone 'America/Santiago')<=7 then '-1' else '-2' end end;
$$;
alter table public.catalog_reports add column if not exists periodo text;
alter table public.catalog_reports add column if not exists origen text not null default 'automatico';
update public.catalog_reports set periodo=public.periodo_catalogo(created_at) where periodo is null;
alter table public.catalog_reports alter column periodo set default public.periodo_catalogo(now());
alter table public.catalog_reports alter column periodo set not null;
alter table public.catalog_reports drop constraint if exists catalog_reports_periodo_check;
alter table public.catalog_reports add constraint catalog_reports_periodo_check check(periodo ~ '^[0-9]{4}-[12v]$');
alter table public.catalog_reports drop constraint if exists catalog_reports_origen_check;
alter table public.catalog_reports add constraint catalog_reports_origen_check check(origen in ('automatico','explicito'));
create index if not exists catalog_reports_periodo_idx on public.catalog_reports(tenant,periodo,ramo_sigla,seccion,user_id);
create table if not exists public.pautas_catalogo_registro(
 tenant text not null,clave text not null,periodo text not null default '',nombre text not null,nombre_norm text not null,definicion jsonb not null,
 primary key(tenant,clave,periodo));
alter table public.pautas_catalogo_registro enable row level security;
revoke all on public.pautas_catalogo_registro from public,anon,authenticated;
insert into public.pautas_catalogo_registro(tenant,clave,periodo,nombre,nombre_norm,definicion) select tenant,clave,periodo,nombre,nombre_norm,definicion from jsonb_to_recordset('[
  {
    "tenant": "fen",
    "clave": "metodos matematicos ii",
    "nombre": "Métodos Matemáticos II",
    "nombre_norm": "metodos matematicos ii",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 6,
      "segundaFecha": {
        "evaluacion": "Examen Final",
        "examenMenorQue": 3,
        "promedioPonderadoMin": 3.95,
        "requiereTodas": true,
        "aviso": "Confirma con la Escuela los requisitos y la fecha. La app no calcula el resultado"
      },
      "evals": [
        [
          "Solemne 1",
          20,
          {
            "fecha": "2026-08-28"
          }
        ],
        [
          "Solemne 2",
          20,
          {
            "fecha": "2026-09-26"
          }
        ],
        [
          "Solemne 3",
          20,
          {
            "fecha": "2026-11-06"
          }
        ],
        [
          "Examen Final",
          40,
          {
            "min": 3,
            "cap": 3.9
          }
        ]
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "introduccion a la microeconomia",
    "nombre": "Introducción a la Microeconomía",
    "nombre_norm": "introduccion a la microeconomia",
    "periodo": "2026-2",
    "definicion": {
      "creditos": 6,
      "periodo": "2026-2",
      "recuperativo": {
        "min": 3.6,
        "max": 3.9,
        "nota": 4
      },
      "ausenciasJustificadas": {
        "reemplazos": [
          {
            "desde": "Control 1",
            "hacia": "Solemne"
          },
          {
            "desde": "Solemne",
            "hacia": "Examen"
          },
          {
            "desde": "Control 2",
            "hacia": "Examen"
          },
          {
            "desde": "Control 3",
            "hacia": "Examen"
          }
        ],
        "traspasos": [
          {
            "desde": "Pruebas sorpresa",
            "hacia": "Examen"
          }
        ]
      },
      "reglasDelCurso": [
        "Si faltas al Examen tienes que dar el recuperativo"
      ],
      "evals": [
        [
          "Solemne",
          30,
          {
            "fecha": "2026-09-30"
          }
        ],
        [
          "Control 1",
          10,
          {
            "fecha": "2026-08-21"
          }
        ],
        [
          "Control 2",
          10,
          {
            "fecha": "2026-10-16"
          }
        ],
        [
          "Control 3",
          10,
          {
            "fecha": "2026-11-06"
          }
        ],
        [
          "Pruebas sorpresa",
          5,
          {
            "slots": 5
          }
        ],
        [
          "Examen",
          35
        ]
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "gestion de personas",
    "nombre": "Gestión de Personas",
    "nombre_norm": "gestion de personas",
    "periodo": "",
    "definicion": {
      "creditos": 6,
      "noCalcula": [
        "Te eximes del examen si promedias 5,5 o más en los Casos y no tienes ninguna nota bajo 4,0 en dos o más de ellos. En ese caso el examen se reemplaza por el promedio de Casos y ensayos con Participación"
      ],
      "reglasDelCurso": [
        "La nota del trabajo grupal se ajusta ±10 décimas según la evaluación entre compañeros"
      ],
      "evals": [
        [
          "Casos y ensayos",
          40
        ],
        [
          "Trabajo en grupo: Propuesta",
          3
        ],
        [
          "Trabajo en grupo: Experiencia de aprendizaje",
          18
        ],
        [
          "Trabajo en grupo: Informe Final",
          9
        ],
        [
          "Participación: Asistencia a ayudantías y reuniones",
          5
        ],
        [
          "Participación: Contribuciones en clases",
          10
        ],
        [
          "Participación: Asistencia a clases",
          5
        ],
        [
          "Examen Integrativo",
          10
        ]
      ],
      "grupos": [
        {
          "nombre": "Trabajo individual",
          "evals": [
            "Casos y ensayos",
            "Participación: Asistencia a ayudantías y reuniones",
            "Participación: Contribuciones en clases",
            "Participación: Asistencia a clases",
            "Examen Integrativo"
          ],
          "min": 4,
          "cap": "self"
        },
        {
          "nombre": "Trabajo de grupo",
          "evals": [
            "Trabajo en grupo: Propuesta",
            "Trabajo en grupo: Experiencia de aprendizaje",
            "Trabajo en grupo: Informe Final"
          ],
          "min": 4,
          "cap": "self"
        }
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "comunicacion",
    "nombre": "Comunicación",
    "nombre_norm": "comunicacion",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 2,
      "reglasDelCurso": [
        "Si tu promedio en las evaluaciones individuales queda bajo 4,0, las notas grupales dejan de contar y repruebas el curso. El programa no dice con qué nota, así que la app te deja en tu promedio individual",
        "Necesitas al menos 6 de las 11 actividades hechas en clases para aprobar",
        "Las notas grupales se ajustan según cómo te evalúan tus compañeros, y pueden moverse hasta un 100%",
        "Faltar sin justificar al pitch inicial, a las clases de expertos, a la solemne o al examen se evalúa con 1,0",
        "Cada profesor puede agregar evaluaciones propias de su sección que dan décimas adicionales"
      ],
      "evals": [
        [
          "Pitch inicial individual",
          15
        ],
        [
          "Columna de opinión",
          15
        ],
        [
          "Solemne: elevator pitch",
          20
        ],
        [
          "Participación y trabajo en clases",
          20,
          {
            "min": 4,
            "cap": 3.8
          }
        ],
        [
          "Examen: presentación grupal",
          20
        ],
        [
          "Examen: video storytelling",
          10
        ]
      ],
      "grupos": [
        {
          "nombre": "Evaluaciones individuales",
          "evals": [
            "Pitch inicial individual",
            "Columna de opinión",
            "Solemne: elevator pitch",
            "Participación y trabajo en clases",
            "Examen: video storytelling"
          ],
          "min": 4,
          "cap": "self"
        }
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "contabilidad",
    "nombre": "Contabilidad",
    "nombre_norm": "contabilidad",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 6,
      "reglasDelCurso": [
        "Rendir menos del 75% de los controles sorpresa reprueba el curso con 3,9"
      ],
      "retiraCompuertas": [
        {
          "min": 1.5,
          "cap": 3.9
        }
      ],
      "evals": [
        [
          "Control de Lectura 1",
          3.33,
          {
            "fecha": "2026-08-07"
          }
        ],
        [
          "Control de Lectura 2",
          3.33,
          {
            "fecha": "2026-08-28"
          }
        ],
        [
          "Control de Lectura 3",
          3.34,
          {
            "fecha": "2026-11-06"
          }
        ],
        [
          "Control de Ejercicios 1",
          10,
          {
            "fecha": "2026-08-21"
          }
        ],
        [
          "Control de Ejercicios 2",
          10,
          {
            "fecha": "2026-09-11"
          }
        ],
        [
          "Control de Ejercicios 3",
          10,
          {
            "fecha": "2026-10-16"
          }
        ],
        [
          "Control de Ejercicios 4",
          10,
          {
            "fecha": "2026-10-30"
          }
        ],
        [
          "Controles Sorpresa",
          5,
          {
            "lista": true,
            "dropLowest": {
              "fraction": 0.25
            }
          }
        ],
        [
          "Solemne",
          20,
          {
            "fecha": "2026-09-22"
          }
        ],
        [
          "Examen",
          25,
          {
            "min": 3,
            "cap": 3.4
          }
        ]
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "tecnologia y sistemas de informacion",
    "nombre": "Tecnología y Sistemas de Información",
    "nombre_norm": "tecnologia y sistemas de informacion",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 6,
      "reglasDelCurso": [
        "Las solemnes y el examen (70%) son iguales en todas las secciones, pero el 30% restante lo reparte cada sección a su manera. Si en la tuya no son Controles 15% y Trabajo Final 15%, edita la pauta",
        "Las dos solemnes y el examen comparten una única recuperativa, que se rinde después del examen y a la que solo accede quien justificó su inasistencia",
        "La asistencia a las ayudantías es obligatoria, y los controles se rinden en ese horario"
      ],
      "evals": [
        [
          "Controles",
          15,
          {
            "slots": 2
          }
        ],
        [
          "Trabajo Final",
          15
        ],
        [
          "Solemne 1",
          20,
          {
            "fecha": "2026-09-25"
          }
        ],
        [
          "Solemne 2",
          20
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Evaluaciones individuales",
          "evals": [
            "Controles",
            "Solemne 1",
            "Solemne 2",
            "Examen"
          ],
          "min": 4,
          "cap": "self"
        }
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "marketing",
    "nombre": "Marketing",
    "nombre_norm": "marketing",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 6,
      "reglasDelCurso": [
        "Si tu promedio en las evaluaciones individuales (Solemne, Controles y Examen) queda bajo 4,0, las notas grupales no se consideran y tu nota final pasa a ser ese promedio individual",
        "La nota del trabajo grupal se ajusta con un modificador por evaluación de pares, normalmente entre -0,9 y +0,9, aunque el rango cambia cada semestre",
        "Las evaluaciones no se repiten. Con prueba recuperativa autorizada se recupera solo una, Solemne o Examen, y nunca los controles"
      ],
      "evals": [
        [
          "Solemne",
          25
        ],
        [
          "Controles",
          25,
          {
            "lista": true
          }
        ],
        [
          "Trabajo Práctico",
          25
        ],
        [
          "Examen Final",
          25,
          {
            "min": 3,
            "cap": 3.9
          }
        ]
      ],
      "grupos": [
        {
          "nombre": "Evaluaciones individuales",
          "evals": [
            "Solemne",
            "Controles",
            "Examen Final"
          ],
          "min": 4,
          "cap": "self"
        }
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "introduccion a la economia",
    "nombre": "Introducción a la Economía",
    "nombre_norm": "introduccion a la economia",
    "periodo": "2026-1",
    "definicion": {
      "periodo": "2026-1",
      "creditos": 6,
      "noCalcula": [
        "Las evaluaciones extra (pruebas online semanales y el curso de Educación Financiera) solo suben la nota si apruebas las obligatorias con 4,0 o más, y solo si te va mejor en ellas: ahí la final pasa a ser 90% obligatorias más 10% extra",
        "Si faltas a un control o a la Solemne con justificativo aprobado por la Escuela, ese porcentaje se acumula para el Examen"
      ],
      "reglasDelCurso": [
        "Solo puedes dar Examen Recuperativo si no pudiste rendir el Examen por causa justificada y aprobada por la Escuela de Pregrado"
      ],
      "evals": [
        [
          "Control 1",
          8
        ],
        [
          "Control 2",
          8
        ],
        [
          "Solemne",
          22
        ],
        [
          "Control 3",
          10
        ],
        [
          "Control 4",
          10
        ],
        [
          "Tarea Grupal",
          10
        ],
        [
          "Examen",
          32
        ]
      ],
      "grupos": [
        {
          "nombre": "Evaluaciones individuales",
          "evals": [
            "Control 1",
            "Control 2",
            "Solemne",
            "Control 3",
            "Control 4",
            "Examen"
          ],
          "min": 4,
          "cap": "self"
        }
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "metodos matematicos i",
    "nombre": "Métodos Matemáticos I",
    "nombre_norm": "metodos matematicos i",
    "periodo": "2026-2",
    "definicion": {
      "creditos": 6,
      "periodo": "2026-2",
      "segundaFecha": {
        "evaluacion": "Examen",
        "examenMenorQue": 3,
        "promedioPonderadoMin": 3.95,
        "requiereTodas": true,
        "aviso": "Confirma con la Escuela los requisitos y la fecha. La app no calcula el resultado"
      },
      "noCalcula": [
        "Cada evaluación que no rindas se califica con 1,0"
      ],
      "reglasDelCurso": [
        "Una inasistencia a una solemne o al examen justificada por la Secretaría también puede dar derecho al Examen de Segunda Fecha. La app no conoce esa resolución"
      ],
      "evals": [
        [
          "Solemne 1",
          20
        ],
        [
          "Solemne 2",
          20
        ],
        [
          "Solemne 3",
          20
        ],
        [
          "Examen",
          40,
          {
            "min": 3,
            "cap": 3.9
          }
        ]
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "programacion para analitica de datos",
    "nombre": "Programación para Analítica de Datos",
    "nombre_norm": "programacion para analitica de datos",
    "periodo": "",
    "definicion": {
      "creditos": 6,
      "noCalcula": [
        "Si la Prueba Solemne II queda bajo 4,0, tu nota final pasa a ser la más baja entre tu promedio ponderado y la nota del Examen",
        "El examen recuperativo puede reemplazar cada control o solemne que haya quedado bajo la nota que saques en él, salvo las notas puestas por medidas disciplinarias"
      ],
      "reglasDelCurso": [
        "Copiar en una tarea, solemne o examen deja la nota final del curso en 1,0"
      ],
      "evals": [
        [
          "Controles",
          30
        ],
        [
          "Prueba Solemne",
          30
        ],
        [
          "Examen",
          40
        ]
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "gestion y empresas",
    "nombre": "Gestión y Empresas",
    "nombre_norm": "gestion y empresas",
    "periodo": "",
    "definicion": {
      "noCalcula": [
        "Toda ausencia a una exigencia del curso se califica con 1,0"
      ],
      "reglasDelCurso": [
        "La Solemne y el Examen tienen fecha única. Avisando por escrito dentro de 24 horas por razones médicas, solo se puede recuperar una de las dos",
        "Los controles parciales y el Plan de Negocios no son recuperables por ninguna causa",
        "El aporte en clases suma décimas según tu participación"
      ],
      "evals": [
        [
          "Solemne",
          25
        ],
        [
          "Controles de Lectura",
          20,
          {
            "lista": true,
            "dropLowest": {
              "count": 1
            }
          }
        ],
        [
          "Proyecto Empresa",
          25,
          {
            "min": 3,
            "cap": 3.9
          }
        ],
        [
          "Examen Final",
          30,
          {
            "min": 3,
            "cap": 3.9
          }
        ]
      ],
      "grupos": [
        {
          "nombre": "Evaluaciones individuales",
          "evals": [
            "Solemne",
            "Controles de Lectura",
            "Examen Final"
          ],
          "min": 4,
          "cap": "self"
        }
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "ingles iv",
    "nombre": "Inglés IV",
    "nombre_norm": "ingles iv",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "noCalcula": [
        "El Busuu es reprobatorio: hay que completar las 169 actividades del Complete English Intermediate B2, con un mínimo de 117, y su nota se arma con 70% actividades y 30% certificado"
      ],
      "evals": [
        [
          "Busuu",
          10
        ],
        [
          "Quiz 1",
          7.5
        ],
        [
          "Quiz 2",
          7.5
        ],
        [
          "Lab 1",
          5
        ],
        [
          "Lab 2",
          5
        ],
        [
          "Lab 3",
          5
        ],
        [
          "Business Plan",
          6
        ],
        [
          "Business Pitch",
          9
        ],
        [
          "Midterm",
          15,
          {
            "fecha": "2026-09-21"
          }
        ],
        [
          "Final Exam",
          30
        ]
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "ingles ii",
    "nombre": "Inglés II",
    "nombre_norm": "ingles ii",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 2,
      "evals": [
        [
          "busuu",
          15
        ],
        [
          "Final Exam",
          40
        ],
        [
          "Midterm test",
          15
        ],
        [
          "Oral quiz",
          20
        ],
        [
          "written quiz",
          10
        ]
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "introduccion al pensamiento economico y politico",
    "nombre": "Introducción al Pensamiento Económico y Político",
    "nombre_norm": "introduccion al pensamiento economico y politico",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 4,
      "evals": [
        [
          "Control 1",
          15
        ],
        [
          "Control 2",
          15
        ],
        [
          "Examen",
          40
        ],
        [
          "Solemne 1",
          30
        ]
      ]
    }
  },
  {
    "tenant": "fen",
    "clave": "metodos matematicos iv",
    "nombre": "Métodos Matemáticos IV",
    "nombre_norm": "metodos matematicos iv",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 6,
      "evals": [
        [
          "Examen",
          40
        ],
        [
          "Solemne 1",
          20
        ],
        [
          "Solemne 2",
          20
        ],
        [
          "Solemne 3",
          20
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "MAT1610",
    "nombre": "Cálculo I",
    "nombre_norm": "calculo i",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Interrogación 1",
          20
        ],
        [
          "Interrogación 2",
          20
        ],
        [
          "Interrogación 3",
          20
        ],
        [
          "Laboratorio",
          10,
          {
            "slots": 3
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "ausenciasJustificadas": {
        "maxReemplazos": 1,
        "excesoReemplazos": "rezago",
        "reemplazos": [
          {
            "desde": "Interrogación 1",
            "hacia": "Examen"
          },
          {
            "desde": "Interrogación 2",
            "hacia": "Examen"
          },
          {
            "desde": "Interrogación 3",
            "hacia": "Examen"
          }
        ]
      }
    }
  },
  {
    "tenant": "uc",
    "clave": "MAT1203",
    "nombre": "Álgebra Lineal",
    "nombre_norm": "algebra lineal",
    "periodo": "",
    "definicion": [
      [
        "Interrogación 1",
        20
      ],
      [
        "Interrogación 2",
        20
      ],
      [
        "Interrogación 3",
        20
      ],
      [
        "Laboratorio",
        10,
        {
          "slots": 3
        }
      ],
      [
        "Examen",
        30
      ]
    ]
  },
  {
    "tenant": "uc",
    "clave": "MAT1279",
    "nombre": "Introducción al Álgebra Lineal",
    "nombre_norm": "introduccion al algebra lineal",
    "periodo": "",
    "definicion": [
      [
        "Interrogación 1",
        20
      ],
      [
        "Interrogación 2",
        25
      ],
      [
        "Interrogación 3",
        25
      ],
      [
        "Examen",
        30
      ]
    ]
  },
  {
    "tenant": "uc",
    "clave": "IHI0534",
    "nombre": "Entendiendo a Rusia: Historia, Cultura y Presente del Gigante Eurasiatico",
    "nombre_norm": "entendiendo a rusia: historia, cultura y presente del gigante eurasiatico",
    "periodo": "",
    "definicion": {
      "sigla": "IHI0534",
      "evals": [
        [
          "Afiche académico",
          30
        ],
        [
          "Discusiones bibliográficas",
          30,
          {
            "slots": 5,
            "slotLabel": "Discusión bibliográfica"
          }
        ],
        [
          "Prueba escrita",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "BIO110C",
    "nombre": "Biología de Organismos y Comunidades",
    "nombre_norm": "biologia de organismos y comunidades",
    "periodo": "",
    "definicion": {
      "sigla": "BIO110C",
      "evals": [
        [
          "Controles",
          20,
          {
            "slots": 5,
            "slotLabel": "Control"
          }
        ],
        [
          "Interrogación 1",
          20
        ],
        [
          "Interrogación 2",
          20
        ],
        [
          "Interrogación 3",
          20
        ],
        [
          "Talleres",
          20,
          {
            "slots": 4,
            "slotLabel": "Taller"
          }
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAE1210",
    "nombre": "Introducción a la Macroeconomía",
    "nombre_norm": "introduccion a la macroeconomia",
    "periodo": "",
    "definicion": [
      [
        "Control 1",
        16,
        {
          "nombresAnteriores": [
            "C1"
          ]
        }
      ],
      [
        "Prueba 1",
        22,
        {
          "nombresAnteriores": [
            "P1"
          ]
        }
      ],
      [
        "Prueba 2",
        22,
        {
          "nombresAnteriores": [
            "P2"
          ]
        }
      ],
      [
        "Parte del profesor",
        10,
        {
          "nombresAnteriores": [
            "PP"
          ]
        }
      ],
      [
        "Examen",
        30
      ]
    ]
  },
  {
    "tenant": "uc",
    "clave": "EAA1510",
    "nombre": "Probabilidad y Estadística",
    "nombre_norm": "probabilidad y estadistica",
    "periodo": "",
    "definicion": [
      [
        "Control 1",
        10,
        {
          "nombresAnteriores": [
            "C1"
          ]
        }
      ],
      [
        "Control 2",
        10,
        {
          "nombresAnteriores": [
            "C2"
          ]
        }
      ],
      [
        "Control 3",
        10,
        {
          "nombresAnteriores": [
            "C3"
          ]
        }
      ],
      [
        "Prueba 1",
        20,
        {
          "nombresAnteriores": [
            "P1"
          ]
        }
      ],
      [
        "Prueba 2",
        20,
        {
          "nombresAnteriores": [
            "P2"
          ]
        }
      ],
      [
        "Controles sorpresa",
        5,
        {
          "slots": 3,
          "slotLabel": "Control sorpresa",
          "nombresAnteriores": [
            {
              "nombre": "Control sorpresa 1",
              "slot": 0
            },
            {
              "nombre": "Control sorpresa 2",
              "slot": 1
            },
            {
              "nombre": "Control sorpresa 3",
              "slot": 2
            }
          ]
        }
      ],
      [
        "Examen",
        25
      ]
    ]
  },
  {
    "tenant": "uc",
    "clave": "QIM100E",
    "nombre": "Química para Ingeniería",
    "nombre_norm": "quimica para ingenieria",
    "periodo": "",
    "definicion": [
      [
        "Pruebas",
        44.1,
        {
          "slots": 2,
          "slotLabel": "Interrogación"
        }
      ],
      [
        "Ev. de Taller",
        4.9,
        {
          "slots": 5,
          "slotLabel": "Taller"
        }
      ],
      [
        "Examen",
        21
      ],
      [
        "Informes",
        18,
        {
          "slots": 5,
          "slotLabel": "Informe"
        }
      ],
      [
        "Controles",
        12,
        {
          "slots": 5,
          "slotLabel": "Control"
        }
      ]
    ]
  },
  {
    "tenant": "uc",
    "clave": "filosofia: ¿para que?",
    "nombre": "Filosofía: ¿para qué?",
    "nombre_norm": "filosofia: ¿para que?",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Prueba 1",
          30
        ],
        [
          "Ejercicio de análisis",
          20
        ],
        [
          "Prueba 2",
          30
        ],
        [
          "Podcast",
          20,
          {
            "min": 4,
            "cap": 3.9
          }
        ]
      ],
      "reglasDelCurso": [
        "Necesitas al menos 75% de asistencia a clases: si no, el curso queda con nota R, que equivale a 3,0. La app no registra asistencia"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "ING1004",
    "nombre": "Desafíos de la Ingeniería",
    "nombre_norm": "desafios de la ingenieria",
    "periodo": "2026-1",
    "definicion": {
      "sigla": "ING1004",
      "periodo": "2026-1",
      "evals": [
        [
          "Participación en talleres",
          7.5
        ],
        [
          "Tareas",
          30,
          {
            "slots": 4,
            "slotLabel": "Tarea"
          }
        ],
        [
          "Actividades y cuestionarios",
          12.5,
          {
            "lista": true
          }
        ],
        [
          "Presentaciones",
          30,
          {
            "slots": 3,
            "slotLabel": "Presentación"
          }
        ],
        [
          "Pre-Feria",
          7.5
        ],
        [
          "Feria Tecnológica",
          12.5
        ]
      ],
      "grupos": [
        {
          "nombre": "Evaluación individual",
          "evals": [
            "Participación en talleres",
            "Tareas",
            "Actividades y cuestionarios"
          ],
          "min": 4,
          "cap": 3.9
        },
        {
          "nombre": "Evaluación grupal",
          "evals": [
            "Presentaciones",
            "Pre-Feria",
            "Feria Tecnológica"
          ],
          "min": 4,
          "cap": 3.9
        }
      ],
      "noCalcula": [
        "Si en tres de las cuatro evaluaciones de pares quedas bajo el promedio de tu equipo, repruebas con el mínimo entre tu nota y 3,9"
      ],
      "reglasDelCurso": [
        "Las notas de las Presentaciones y de la Feria se ajustan según tu evaluación de pares: ingresa la nota ya ajustada",
        "Si no asistes sin justificación a la Actividad de Trabajo Grupal que sigue a una tarea, esa tarea queda con nota máxima 4,0",
        "Contestar el 90% de los cuestionarios te permite borrar una ausencia o atraso a las presentaciones",
        "Faltar sin justificación a una presentación te deja con la mitad de la nota de tu equipo",
        "Un grupo que no entrega su archivo presenta sin apoyo audiovisual y queda con nota máxima 4,0"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "IIC1103",
    "nombre": "Introducción a la Programación",
    "nombre_norm": "introduccion a la programacion",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Interrogación 1",
          15,
          {
            "fecha": "2026-09-24"
          }
        ],
        [
          "Interrogación 2",
          20,
          {
            "fecha": "2026-10-22"
          }
        ],
        [
          "Examen",
          30,
          {
            "fecha": "2026-12-10"
          }
        ],
        [
          "Tarea 1",
          5,
          {
            "fecha": "2026-10-02"
          }
        ],
        [
          "Tarea 2",
          5,
          {
            "fecha": "2026-10-27"
          }
        ],
        [
          "Tarea 3",
          5,
          {
            "fecha": "2026-11-27"
          }
        ],
        [
          "Nota de participación",
          16
        ],
        [
          "Trabajos de Inteligencia Artificial",
          4,
          {
            "slots": 2,
            "nombresCasillas": [
              "Cápsulas",
              "Talleres"
            ],
            "nombresAnteriores": [
              {
                "nombre": "Talleres de Inteligencia Artificial",
                "slot": 1
              }
            ]
          }
        ]
      ],
      "corrigePautas": [
        [
          [
            "Interrogación 1",
            15
          ],
          [
            "Interrogación 2",
            20
          ],
          [
            "Examen",
            30
          ],
          [
            "Tarea 1",
            5
          ],
          [
            "Tarea 2",
            5
          ],
          [
            "Tarea 3",
            5
          ],
          [
            "Nota de participación",
            16
          ],
          [
            "Talleres de Inteligencia Artificial",
            4
          ]
        ]
      ],
      "grupos": [
        {
          "nombre": "Evaluaciones principales",
          "evals": [
            "Interrogación 1",
            "Interrogación 2",
            "Examen"
          ],
          "min": 4,
          "cap": 3.9
        }
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "BIO143M",
    "nombre": "Principios Ecológicos y Medio Ambiente",
    "nombre_norm": "principios ecologicos y medio ambiente",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "BIO143M",
      "periodo": "2026-2",
      "evals": [
        [
          "Prueba 1",
          25,
          {
            "fecha": "2026-09-01"
          }
        ],
        [
          "Prueba 2",
          40,
          {
            "fecha": "2026-11-03"
          }
        ],
        [
          "Prueba 3",
          35,
          {
            "fecha": "2026-12-01"
          }
        ]
      ],
      "bonus": [
        {
          "id": "talleres",
          "pregunta": "Décimas de talleres",
          "entrada": "decimas",
          "max": 5,
          "a": "final",
          "si": {
            "evals": [
              "Prueba 1",
              "Prueba 2",
              "Prueba 3"
            ],
            "mayorQue": 4
          },
          "ayuda": "Si tu promedio ponderado de las Pruebas supera 4,0, las décimas que ganes en los talleres se suman a tu nota final, con un máximo de 5 décimas"
        }
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "BIO141C",
    "nombre": "Biología de la Célula",
    "nombre_norm": "biologia de la celula",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "BIO141C",
      "periodo": "2026-2",
      "creditos": 10,
      "evals": [
        [
          "Interrogaciones",
          45.5,
          {
            "slots": 3,
            "slotLabel": "Interrogación"
          }
        ],
        [
          "Talleres",
          14,
          {
            "lista": true
          }
        ],
        [
          "Trabajos prácticos",
          7,
          {
            "slots": 2,
            "slotLabel": "Trabajo práctico"
          }
        ],
        [
          "Trabajo grupal",
          3.5
        ],
        [
          "Examen final",
          30
        ]
      ],
      "eximicion": {
        "evaluacion": "Examen final",
        "segun": [
          "Interrogaciones",
          "Talleres",
          "Trabajos prácticos",
          "Trabajo grupal"
        ],
        "min": 5,
        "ignoraDescartes": true,
        "requiereConfirmacion": true,
        "confirmar": "cumples la asistencia de Taller exigida por tu sección",
        "ocultaEvaluacion": true,
        "minimos": [
          {
            "evaluacion": "Interrogaciones",
            "min": 4,
            "cadaNota": true
          },
          {
            "evaluacion": "Talleres",
            "min": 4
          }
        ]
      },
      "noCalcula": [
        "Con 100% de los controles de Taller puedes eliminar la peor nota, pero el programa no especifica cuántos controles habrá durante el semestre",
        "El Examen es reprobatorio bajo las condiciones de Interrogaciones y Talleres que define el programa, pero no publica la fórmula con que se transforma esa situación en la nota final"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "FON104",
    "nombre": "Fundamentos Básicos de Cultura Sorda y Lengua de Señas Chilena",
    "nombre_norm": "fundamentos basicos de cultura sorda y lengua de senas chilena",
    "periodo": "",
    "definicion": {
      "sigla": "FON104",
      "creditos": 10,
      "evals": [
        [
          "Deletreo manual",
          10
        ],
        [
          "Exposición grupal Cultura Sorda",
          20
        ],
        [
          "Diálogo en parejas LSCh",
          15
        ],
        [
          "Conversación con Instructor Sordo",
          15
        ],
        [
          "Proyecto final grupal (A+S)",
          30
        ],
        [
          "Participación: autoevaluación",
          5
        ],
        [
          "Participación: coevaluación",
          5
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "el misterioso caso del curso de ficcion policial (edicion especial santiago negro)",
    "nombre": "El misterioso caso del curso de ficción policial (Edición especial Santiago Negro)",
    "nombre_norm": "el misterioso caso del curso de ficcion policial (edicion especial santiago negro)",
    "periodo": "",
    "definicion": {
      "creditos": 10,
      "evals": [
        [
          "Controles de lectura",
          30,
          {
            "slots": 3,
            "slotLabel": "Control"
          }
        ],
        [
          "Exposiciones orales",
          15
        ],
        [
          "Co evaluación",
          10
        ],
        [
          "Participación en foros",
          15
        ],
        [
          "Dossier Santiago Negro",
          30
        ]
      ],
      "reglasDelCurso": [
        "Necesitas asistir al menos al 75% de las clases; el programa indica que no cumplirlo reprueba el curso",
        "Una evaluación atrasada con justificación formal se rinde el último día de clases"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "ciudadania y derechos humanos: enfoques interdisciplinarios",
    "nombre": "Ciudadanía y Derechos humanos: Enfoques interdisciplinarios",
    "nombre_norm": "ciudadania y derechos humanos: enfoques interdisciplinarios",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 10,
      "evals": [
        [
          "Infografía",
          30
        ],
        [
          "Ensayo personal",
          30,
          {
            "fecha": "2026-10-27"
          }
        ],
        [
          "Presentaciones orales",
          30
        ],
        [
          "Actividades asincrónicas",
          10
        ]
      ],
      "reglasDelCurso": [
        "Necesitas rendir todas las evaluaciones y tener al menos 60% de asistencia; la app no registra asistencia"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "MAT1620",
    "nombre": "Cálculo II",
    "nombre_norm": "calculo ii",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "ausenciasJustificadas": {
        "maxReemplazos": 1,
        "excesoReemplazos": "rezago",
        "reemplazos": [
          {
            "desde": "Interrogación 1",
            "hacia": "Examen"
          },
          {
            "desde": "Interrogación 2",
            "hacia": "Examen"
          },
          {
            "desde": "Interrogación 3",
            "hacia": "Examen"
          }
        ]
      },
      "evals": [
        [
          "Interrogación 1",
          20,
          {
            "fecha": "2026-08-31"
          }
        ],
        [
          "Interrogación 2",
          20,
          {
            "fecha": "2026-10-05"
          }
        ],
        [
          "Interrogación 3",
          20,
          {
            "fecha": "2026-11-02"
          }
        ],
        [
          "Examen",
          30,
          {
            "fecha": "2026-11-30"
          }
        ],
        [
          "Laboratorio",
          10,
          {
            "slots": 3
          }
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "ICS2563",
    "nombre": "Econometría Aplicada",
    "nombre_norm": "econometria aplicada",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "ICS2563",
      "periodo": "2026-2",
      "creditos": 10,
      "evals": [
        [
          "Interrogación 1",
          25,
          {
            "fecha": "2026-08-31"
          }
        ],
        [
          "Interrogación 2",
          25,
          {
            "fecha": "2026-10-16"
          }
        ],
        [
          "Examen",
          25,
          {
            "fecha": "2026-11-30"
          }
        ],
        [
          "Tareas",
          25,
          {
            "slots": 3
          }
        ]
      ],
      "grupos": [
        {
          "nombre": "Interrogaciones y Examen",
          "evals": [
            "Interrogación 1",
            "Interrogación 2",
            "Examen"
          ],
          "min": 3.95,
          "cap": 3.9
        },
        {
          "nombre": "Tareas",
          "evals": [
            "Tareas"
          ],
          "min": 3.95,
          "cap": 3.9
        }
      ],
      "noCalcula": [
        "Los tickets de participación pueden sumar hasta 2 décimas a cada interrogación o al examen, según la cantidad completada en su período",
        "Si rindes ambas interrogaciones, cumples los tickets y tu peor interrogación es al menos 2,0, puedes reemplazarla por la nota del examen"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "ICS2121",
    "nombre": "Métodos de Optimización",
    "nombre_norm": "metodos de optimizacion",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 10,
      "reemplazosOptativos": [
        {
          "tipo": "mezcla",
          "fuente": "Control optativo",
          "destinos": [
            "Interrogación 2"
          ],
          "fraccion": 0.3
        }
      ],
      "evals": [
        [
          "Interrogación 1",
          20,
          {
            "fecha": "2026-09-07"
          }
        ],
        [
          "Interrogación 2",
          28,
          {
            "fecha": "2026-11-09"
          }
        ],
        [
          "Examen",
          32,
          {
            "fecha": "2026-12-02"
          }
        ],
        [
          "Tarea 1",
          6
        ],
        [
          "Tarea 2",
          6
        ],
        [
          "Tarea 3",
          8
        ],
        [
          "Control optativo",
          0,
          {
            "optativa": true,
            "fecha": "2026-10-09"
          }
        ]
      ],
      "grupos": [
        {
          "nombre": "Pruebas",
          "evals": [
            "Interrogación 1",
            "Interrogación 2",
            "Examen"
          ],
          "min": 4,
          "cap": 3.9
        },
        {
          "nombre": "Tareas",
          "evals": [
            "Tarea 1",
            "Tarea 2",
            "Tarea 3"
          ],
          "min": 4,
          "cap": 3.9
        }
      ],
      "reglasDelCurso": [
        "Las actividades de taller pueden bonificar una nota final aprobada; la regla de acumulación se informa durante el semestre en Canvas"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "ICT2904",
    "nombre": "Ingeniería de Sistemas de Transporte",
    "nombre_norm": "ingenieria de sistemas de transporte",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 10,
      "reemplazosOptativos": [
        {
          "tipo": "reemplazo",
          "fuente": "Examen",
          "destinos": [
            "Controles"
          ]
        }
      ],
      "evals": [
        [
          "Controles",
          45,
          {
            "slots": 5,
            "dropLowest": {
              "count": 1
            }
          }
        ],
        [
          "Meme 1",
          5,
          {
            "fecha": "2026-08-24"
          }
        ],
        [
          "Meme 2",
          5,
          {
            "fecha": "2026-09-25"
          }
        ],
        [
          "Meme 3",
          5,
          {
            "fecha": "2026-10-23"
          }
        ],
        [
          "Meme 4",
          5,
          {
            "fecha": "2026-11-20"
          }
        ],
        [
          "Examen",
          35,
          {
            "fecha": "2026-12-02",
            "min": 3,
            "cap": 3.9
          }
        ]
      ],
      "grupos": [
        {
          "nombre": "Cuatro mejores controles",
          "evals": [
            "Controles"
          ],
          "min": 3,
          "cap": "self"
        },
        {
          "nombre": "Promedio de Memes",
          "evals": [
            "Meme 1",
            "Meme 2",
            "Meme 3",
            "Meme 4"
          ],
          "min": 4,
          "cap": "self"
        },
        {
          "nombre": "Evaluaciones escritas",
          "evals": [
            "Controles",
            "Examen"
          ],
          "min": 4,
          "cap": "self"
        }
      ],
      "eximicion": {
        "evaluacion": "Examen",
        "segun": [
          "Controles"
        ],
        "min": 5.5,
        "ignoraDescartes": true
      },
      "noCalcula": [
        "Si no cumples el mínimo de Memes o de los cuatro mejores Controles, no tienes derecho a rendir el Examen"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "IIC2115",
    "nombre": "Programación como Herramienta para la Ingeniería",
    "nombre_norm": "programacion como herramienta para la ingenieria",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "IIC2115",
      "periodo": "2026-2",
      "creditos": 10,
      "evals": [
        [
          "Laboratorio 1",
          20,
          {
            "fecha": "2026-08-24"
          }
        ],
        [
          "Laboratorio 2",
          20,
          {
            "fecha": "2026-09-28"
          }
        ],
        [
          "Laboratorio 3",
          20,
          {
            "fecha": "2026-10-26"
          }
        ],
        [
          "Laboratorio 4",
          20,
          {
            "fecha": "2026-11-23"
          }
        ],
        [
          "Participación",
          20,
          {
            "slots": 10,
            "dropLowest": {
              "count": 2
            }
          }
        ]
      ],
      "grupos": [
        {
          "nombre": "Laboratorios",
          "evals": [
            "Laboratorio 1",
            "Laboratorio 2",
            "Laboratorio 3",
            "Laboratorio 4"
          ],
          "min": 3.95,
          "cap": 3.9
        },
        {
          "nombre": "Participación",
          "evals": [
            "Participación"
          ],
          "min": 3.95,
          "cap": 3.9
        }
      ],
      "reglasDelCurso": [
        "Si tienes 2 o más ausencias justificadas a sesiones con ticket, el equipo docente ajustará la regla de Participación; el programa no publica la fórmula de ese ajuste"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "ICS1513",
    "nombre": "Introducción a la Economía",
    "nombre_norm": "introduccion a la economia",
    "periodo": "2025-1",
    "definicion": {
      "sigla": "ICS1513",
      "periodo": "2025-1",
      "creditos": 10,
      "evals": [
        [
          "Interrogación 1",
          20,
          {
            "fecha": "2025-04-26"
          }
        ],
        [
          "Interrogación 2",
          20,
          {
            "fecha": "2025-06-06"
          }
        ],
        [
          "Examen",
          30,
          {
            "fecha": "2025-07-10"
          }
        ],
        [
          "Controles",
          15,
          {
            "lista": true,
            "dropLowest": {
              "count": 3
            }
          }
        ],
        [
          "Proyecto escrito",
          15
        ]
      ],
      "noCalcula": [
        "Puedes eliminar una sola interrogación, sin justificar, y pasar su 20% al examen. Este ajuste no se aplica automáticamente"
      ],
      "reglasDelCurso": [
        "Programa 2025-1, sección 4. Revisa que esta pauta corresponda a tu curso",
        "Se eliminan los tres peores controles. El programa no fija cuántos habrá; mientras agregas notas, el promedio es parcial",
        "El proyecto tiene una etapa grupal y otra individual, pero este programa no publica sus pesos internos: ingresa la nota final del proyecto",
        "El examen es obligatorio y no hay eximición. Si no asistes, la nota es 1,0, salvo que el curso apruebe el procedimiento de nota pendiente"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "FIS1523",
    "nombre": "Termodinámica",
    "nombre_norm": "termodinamica",
    "periodo": "2025-1",
    "definicion": {
      "sigla": "FIS1523",
      "periodo": "2025-1",
      "creditos": 10,
      "evals": [
        [
          "Interrogación 1",
          30,
          {
            "fecha": "2025-04-07"
          }
        ],
        [
          "Interrogación 2",
          30,
          {
            "fecha": "2025-05-19"
          }
        ],
        [
          "Examen",
          40,
          {
            "fecha": "2025-06-30"
          }
        ]
      ],
      "aporta": {
        "ramo": "Laboratorio de Termodinámica",
        "peso": 30,
        "min": 4
      },
      "noCalcula": [
        "El examen puede reemplazar una sola interrogación con inasistencia justificada. Este ajuste no se aplica automáticamente",
        "Si justificas ambas interrogaciones, el programa exige reprobar el ramo. La app no aplica esa reprobación por inasistencias"
      ],
      "reglasDelCurso": [
        "Programa 2025-1. El documento indica los mismos criterios para todas las secciones de ese período; confirma que sigan vigentes en tu curso",
        "La nota final combina 70% de cátedra y 30% del Laboratorio de Termodinámica. Si una parte reprueba, queda la menor de ambas notas; 4,0 cuenta como aprobado",
        "El programa no detalla la pauta interna del laboratorio: ingresa sus evaluaciones según las instrucciones de ese curso",
        "No hay eximición ni pruebas recuperativas. Las notas de las evaluaciones y la final se redondean a una décima"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "FIS1533",
    "nombre": "Electricidad y Magnetismo",
    "nombre_norm": "electricidad y magnetismo",
    "periodo": "2026-1",
    "definicion": {
      "sigla": "FIS1533",
      "periodo": "2026-1",
      "creditos": 10,
      "evals": [
        [
          "Interrogación 1",
          30,
          {
            "fecha": "2026-04-17"
          }
        ],
        [
          "Interrogación 2",
          30,
          {
            "fecha": "2026-06-05"
          }
        ],
        [
          "Examen",
          30,
          {
            "fecha": "2026-07-02"
          }
        ],
        [
          "Controles",
          10,
          {
            "slots": 3,
            "slotLabel": "Control"
          }
        ]
      ],
      "aporta": {
        "ramo": "Laboratorio de Electricidad y Magnetismo",
        "peso": 30,
        "min": 4
      },
      "noCalcula": [
        "El examen reemplaza una única interrogación con inasistencia justificada. Este ajuste no se aplica automáticamente; con dos o más inasistencias, debes consultar a tu facultad",
        "Puedes justificar como máximo un control y eliminarlo del promedio. La app no elimina controles por justificación ni descarta por defecto el peor"
      ],
      "reglasDelCurso": [
        "Programa 2026-1. Revisa que esta pauta corresponda a tu curso",
        "La nota final combina 70% de cátedra y 30% del Laboratorio de Electricidad y Magnetismo. Si una parte reprueba, queda la menor de ambas notas; 4,0 cuenta como aprobado",
        "El programa no detalla la pauta interna del laboratorio: ingresa sus evaluaciones según las instrucciones de ese curso",
        "No hay eximición ni pruebas recuperativas. La nota final se redondea a una décima"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "FIS1514",
    "nombre": "Dinámica",
    "nombre_norm": "dinamica",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Interrogación 1",
          25,
          {
            "fecha": "2026-09-29"
          }
        ],
        [
          "Interrogación 2",
          25,
          {
            "fecha": "2026-11-13"
          }
        ],
        [
          "Controles",
          20,
          {
            "slots": 3
          }
        ],
        [
          "Examen",
          30,
          {
            "fecha": "2026-12-01"
          }
        ]
      ],
      "fechasPorSeccion": {
        "13": {
          "Controles": [
            "2026-08-28",
            "2026-10-09",
            "2026-11-06"
          ]
        }
      },
      "aporta": {
        "ramo": "Laboratorio de Dinámica",
        "peso": 30,
        "min": 4
      },
      "ausenciasJustificadas": {
        "traspasos": [
          {
            "desde": "Interrogación 1",
            "hacia": "Examen"
          },
          {
            "desde": "Interrogación 2",
            "hacia": "Examen"
          }
        ]
      },
      "bonus": [
        {
          "id": "talleres",
          "pregunta": "Talleres a los que has faltado",
          "entrada": "faltas",
          "hasta": 2,
          "suma": 0.5,
          "a": "Controles",
          "ayuda": "Si faltas como máximo a 2 talleres, con o sin justificación, sumas 5 décimas al promedio de los Controles"
        }
      ],
      "noCalcula": [
        "Si faltas con justificación a un control, lo recuperas con un control recuperativo en el último taller del semestre",
        "Si faltas con justificación a las dos interrogaciones, el equipo docente evalúa tu caso",
        "Las inasistencias a talleres no se justifican"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "FIS0154",
    "nombre": "Laboratorio de Dinámica",
    "nombre_norm": "laboratorio de dinamica",
    "periodo": "",
    "definicion": {
      "promedioParcial": "por-casilla",
      "corrigePautas": [
        [
          [
            "Controles",
            10
          ],
          [
            "Informes",
            70
          ],
          [
            "Evaluación de pares",
            20
          ]
        ]
      ],
      "evals": [
        [
          "Controles",
          8.333333333333334,
          {
            "slots": 5,
            "slotLabel": "Control"
          }
        ],
        [
          "Informes",
          70,
          {
            "slots": 6,
            "slotLabel": "Informe",
            "slotStart": 0
          }
        ],
        [
          "Evaluación de pares",
          21.666666666666668,
          {
            "slots": 6,
            "slotStart": 0,
            "pesosCasillas": [
              1.5,
              1,
              1,
              1,
              1,
              1
            ],
            "min": 4,
            "cap": 3.9
          }
        ]
      ],
      "noCalcula": [
        "Si no realizas un Control, tu nota máxima en el Informe de ese experimento queda en 4,0",
        "Tu nota de evaluación de pares se calcula promediando la nota que te asignan tus compañeros y tu autoevaluación; si no respondes la autoevaluación, esa parte queda con nota 1",
        "Si faltas a un experimento sin justificación, tu informe de ese experimento queda con nota 1",
        "Puedes justificar una sola inasistencia en el semestre y optar al laboratorio recuperativo; una segunda inasistencia reprueba el laboratorio"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "ICE1514",
    "nombre": "Dinámica (ICE1514)",
    "nombre_norm": "dinamica (ice1514)",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "ausenciasJustificadas": {
        "maxPromedios": 1,
        "notaExceso": 1,
        "promedios": [
          {
            "desde": "Control 1",
            "de": [
              "Control 2",
              "Control 3",
              "Interrogación 1",
              "Interrogación 2",
              "Examen"
            ]
          },
          {
            "desde": "Interrogación 1",
            "de": [
              "Control 1",
              "Control 2",
              "Control 3",
              "Interrogación 2",
              "Examen"
            ]
          },
          {
            "desde": "Control 2",
            "de": [
              "Control 1",
              "Control 3",
              "Interrogación 1",
              "Interrogación 2",
              "Examen"
            ]
          },
          {
            "desde": "Control 3",
            "de": [
              "Control 1",
              "Control 2",
              "Interrogación 1",
              "Interrogación 2",
              "Examen"
            ]
          },
          {
            "desde": "Interrogación 2",
            "de": [
              "Control 1",
              "Control 2",
              "Control 3",
              "Interrogación 1",
              "Examen"
            ]
          }
        ]
      },
      "evals": [
        [
          "Control 1",
          10,
          {
            "fecha": "2026-09-04"
          }
        ],
        [
          "Control 2",
          10,
          {
            "fecha": "2026-10-16"
          }
        ],
        [
          "Control 3",
          10,
          {
            "fecha": "2026-10-30"
          }
        ],
        [
          "Interrogación 1",
          20,
          {
            "fecha": "2026-09-29"
          }
        ],
        [
          "Interrogación 2",
          20,
          {
            "fecha": "2026-11-13"
          }
        ],
        [
          "Examen",
          20,
          {
            "fecha": "2026-12-01"
          }
        ],
        [
          "Talleres",
          10,
          {
            "lista": true,
            "dropLowest": {
              "count": 1
            }
          }
        ]
      ],
      "aporta": {
        "ramo": "Laboratorio de Dinámica",
        "peso": 30,
        "min": 4
      },
      "noCalcula": [
        "Faltar a un taller, con o sin justificación, es un 1,0 en ese taller",
        "Si repruebas la cátedra o el laboratorio, repruebas Dinámica: el programa no dice con qué nota quedas, así que mostramos la más baja de las dos"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA1110",
    "nombre": "Comportamiento Organizacional",
    "nombre_norm": "comportamiento organizacional",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas",
          50,
          {
            "lista": true
          }
        ],
        [
          "Trabajo en grupo y presentación oral en clases",
          20
        ],
        [
          "Examen final escrito",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA1210",
    "nombre": "Contabilidad",
    "nombre_norm": "contabilidad",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Controles",
          30,
          {
            "slots": 3,
            "nombresCasillas": [
              "Control 1",
              "Control 2",
              "Controles sorpresa y tarea"
            ]
          }
        ],
        [
          "Pruebas",
          40,
          {
            "slots": 2,
            "slotLabel": "Interrogación"
          }
        ],
        [
          "Examen",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA1220",
    "nombre": "Fundamentos de Finanzas",
    "nombre_norm": "fundamentos de finanzas",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas y controles",
          60,
          {
            "lista": true
          }
        ],
        [
          "Tareas en Excel",
          10,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA2110",
    "nombre": "Dirección de Personas",
    "nombre_norm": "direccion de personas",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Controles",
          40,
          {
            "slots": 5
          }
        ],
        [
          "Prueba 1",
          20
        ],
        [
          "Prueba 2",
          20
        ],
        [
          "Examen",
          20
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA2220",
    "nombre": "Contabilidad de Costos",
    "nombre_norm": "contabilidad de costos",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas y controles",
          70,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA2240",
    "nombre": "Contabilidad Gerencial",
    "nombre_norm": "contabilidad gerencial",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "EAA2240",
      "periodo": "2026-2",
      "evals": [
        [
          "Ejercicios, casos y tareas",
          20
        ],
        [
          "Prueba 1",
          24,
          {
            "fecha": "2026-10-05"
          }
        ],
        [
          "Prueba 2",
          24,
          {
            "fecha": "2026-11-09"
          }
        ],
        [
          "Examen",
          32,
          {
            "fecha": "2026-12-12",
            "nombresAnteriores": [
              "Examen final escrito"
            ]
          }
        ]
      ],
      "formulasCondicionales": [
        {
          "nombre": "Tareas ≥ 4,0 y promedio de pruebas/examen < 3,8: se excluyen tareas",
          "cuando": [
            {
              "tipo": "promedio_min",
              "evals": [
                "Ejercicios, casos y tareas"
              ],
              "min": 4
            },
            {
              "tipo": "promedio_menor",
              "evals": [
                "Prueba 1",
                "Prueba 2",
                "Examen"
              ],
              "min": 3.8
            }
          ],
          "pesos": [
            {
              "evaluacion": "Ejercicios, casos y tareas",
              "peso": 0
            },
            {
              "evaluacion": "Prueba 1",
              "peso": 30
            },
            {
              "evaluacion": "Prueba 2",
              "peso": 30
            },
            {
              "evaluacion": "Examen",
              "peso": 40
            }
          ]
        },
        {
          "nombre": "Tareas ≥ 4,0 y promedio de pruebas/examen exactamente 3,8",
          "ambigua": true,
          "cuando": [
            {
              "tipo": "promedio_min",
              "evals": [
                "Ejercicios, casos y tareas"
              ],
              "min": 4
            },
            {
              "tipo": "promedio_igual",
              "evals": [
                "Prueba 1",
                "Prueba 2",
                "Examen"
              ],
              "min": 3.8
            }
          ]
        }
      ],
      "noCalcula": [
        "En el caso exacto de 3,8 en pruebas y examen, con tareas ≥ 4,0, el programa se contradice: texto ≥ 3,8 y fórmula > 3,8. El resultado queda pendiente hasta confirmar con el profesor",
        "La nota de ejercicios, casos y tareas se calcula por puntos acumulados, con 7,0 al 90% del puntaje máximo y escala lineal. Ingresa la nota del bloque entregada por el profesor"
      ],
      "reglasDelCurso": [
        "Programa 2026-2 de Luis Camilla. Calendario tentativo: pruebas a las 17:30 y examen a las 08:20; confirma cambios con el curso",
        "La recuperativa por una prueba justificada es el 12 de diciembre después del examen; si no la rindes, la prueba justificada queda en 1,0. El examen no puede ponderar más de 56%; sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA2230",
    "nombre": "Empresas y Legislación",
    "nombre_norm": "empresas y legislacion",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "EAA2230",
      "periodo": "2026-2",
      "evals": [
        [
          "Prueba 1",
          30,
          {
            "fecha": "2026-09-26"
          }
        ],
        [
          "Prueba 2",
          30,
          {
            "fecha": "2026-11-03"
          }
        ],
        [
          "Examen",
          40,
          {
            "fecha": "2026-12-02"
          }
        ]
      ],
      "limiteAusencias": {
        "nombre": "Traspaso de pruebas justificadas al examen",
        "desde": [
          "Prueba 1",
          "Prueba 2"
        ],
        "hacia": "Examen",
        "max": 70
      },
      "noCalcula": [
        "Las preguntas bonus pueden sumar hasta 0,3 a cada prueba. La participación, tareas voluntarias y 100% de asistencia a clases y ayudantías pueden dar décimas; su asignación depende del profesor"
      ],
      "reglasDelCurso": [
        "Programa recibido como 2026-2 de Luis Enrique Seguel. Prueba 1: 09:40; Prueba 2: 17:30; Examen: 13:30",
        "El examen no puede superar 70% del curso: justificar ambas pruebas trasladaría 100% y no cumple el requisito. No hay eximición"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA2310",
    "nombre": "Fundamentos de Marketing",
    "nombre_norm": "fundamentos de marketing",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas",
          25,
          {
            "lista": true
          }
        ],
        [
          "Controles",
          25,
          {
            "lista": true
          }
        ],
        [
          "Trabajos grupales",
          20,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA2320",
    "nombre": "Marketing Analytics",
    "nombre_norm": "marketing analytics",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "EAA2320",
      "periodo": "2026-2",
      "evals": [
        [
          "Tareas",
          40,
          {
            "slots": 3,
            "slotLabel": "Tarea"
          }
        ],
        [
          "Prueba 1",
          10,
          {
            "fecha": "2026-09-30"
          }
        ],
        [
          "Prueba 2",
          10,
          {
            "fecha": "2026-11-05"
          }
        ],
        [
          "Examen",
          20,
          {
            "fecha": "2026-12-11",
            "nombresAnteriores": [
              "Examen final"
            ]
          }
        ],
        [
          "Ensayo: primer hito",
          4
        ],
        [
          "Ensayo: segundo hito",
          6
        ],
        [
          "Ensayo: entrega final",
          10,
          {
            "fecha": "2026-11-24"
          }
        ]
      ],
      "grupos": [
        {
          "nombre": "Competencias técnicas (promedio redondeado ≥ 4,0)",
          "evals": [
            "Prueba 1",
            "Prueba 2",
            "Examen"
          ],
          "min": 3.95,
          "cap": 3.9
        }
      ],
      "reglasDelCurso": [
        "Programa 2026-2: pruebas a las 17:30; examen el 11 de diciembre a las 13:30; entrega final del ensayo el 24 de noviembre a las 17:30. Fechas de tareas e hitos intermedios por anunciar",
        "Para aprobar, 25% Prueba 1 + 25% Prueba 2 + 50% Examen debe llegar a 4,0 redondeado a la décima; de lo contrario, la final se topa en 3,9",
        "Para rendir examen debes haber sido evaluado en al menos 40% de la ponderación final sin contar la recuperativa y haber rendido al menos una prueba regular. Sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario",
        "La recuperativa por una prueba justificada es el 11 de diciembre a las 17:30; si no la rindes, la prueba justificada queda en 1,0"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA2410",
    "nombre": "Estrategia de la Organización",
    "nombre_norm": "estrategia de la organizacion",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas",
          40,
          {
            "lista": true
          }
        ],
        [
          "Controles de lectura",
          20,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAA2420",
    "nombre": "Estrategia Competitiva",
    "nombre_norm": "estrategia competitiva",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "EAA2420",
      "periodo": "2026-2",
      "evals": [
        [
          "Participación",
          10
        ],
        [
          "Actividades",
          10,
          {
            "slots": 4,
            "slotLabel": "Actividad",
            "dropLowest": {
              "count": 1
            }
          }
        ],
        [
          "Prueba 1",
          23
        ],
        [
          "Prueba 2",
          23
        ],
        [
          "Examen",
          34,
          {
            "nombresAnteriores": [
              "Examen final escrito"
            ]
          }
        ]
      ],
      "formulasCondicionales": [
        {
          "nombre": "Se excluyen participación y actividades si ninguna prueba/examen llega a 4,0 o el promedio técnico está bajo 3,75 (28,75% / 28,75% / 42,5%)",
          "cuando": [
            {
              "tipo": "no_cumple_requisitos",
              "evals": [
                "Prueba 1",
                "Prueba 2",
                "Examen"
              ],
              "min": 3.75,
              "algunaMin": 4
            }
          ],
          "pesos": [
            {
              "evaluacion": "Participación",
              "peso": 0
            },
            {
              "evaluacion": "Actividades",
              "peso": 0
            },
            {
              "evaluacion": "Prueba 1",
              "peso": 28.75
            },
            {
              "evaluacion": "Prueba 2",
              "peso": 28.75
            },
            {
              "evaluacion": "Examen",
              "peso": 42.5
            }
          ]
        }
      ],
      "reglasDelCurso": [
        "Programa 2026-2 de Gastón Llanes. Hay cuatro actividades y se promedian las tres mejores; las fechas las anuncia el curso",
        "Para rendir examen debes haber sido evaluado en al menos 33% de la ponderación final sin contar la recuperativa y haber rendido al menos una prueba. El examen no puede superar 70%: el exceso se califica con 1,0. Sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario",
        "Una prueba justificada se recupera en la fecha de Facultad; no rendir la recuperativa implica 1,0 en esa prueba. Si faltas a ambas pruebas, no puedes rendir recuperativa ni examen y ambas quedan en 1,0"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAE1110",
    "nombre": "Introducción a la Microeconomía",
    "nombre_norm": "introduccion a la microeconomia",
    "periodo": "",
    "definicion": {
      "sigla": "EAE1110",
      "evals": [
        [
          "Control 1",
          10
        ],
        [
          "Control 2",
          10
        ],
        [
          "Prueba 1",
          22.5
        ],
        [
          "Prueba 2",
          22.5
        ],
        [
          "Trabajo grupal",
          5
        ],
        [
          "Examen",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAE1220",
    "nombre": "Análisis Económico: La Experiencia Chilena",
    "nombre_norm": "analisis economico: la experiencia chilena",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas",
          25,
          {
            "slots": 2
          }
        ],
        [
          "Trabajo grupal",
          20
        ],
        [
          "Email cortos",
          10,
          {
            "lista": true
          }
        ],
        [
          "Controles de lectura",
          15,
          {
            "lista": true
          }
        ],
        [
          "Control de repaso",
          5
        ],
        [
          "Examen final",
          25
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAE2110",
    "nombre": "Microeconomía I",
    "nombre_norm": "microeconomia i",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Tareas y controles",
          20,
          {
            "lista": true
          }
        ],
        [
          "Pruebas escritas",
          48,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          32
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAE2120",
    "nombre": "Microeconomía II",
    "nombre_norm": "microeconomia ii",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas",
          48,
          {
            "lista": true
          }
        ],
        [
          "Tareas",
          20,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          32
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAE2130",
    "nombre": "Competencia y Mercado",
    "nombre_norm": "competencia y mercado",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas",
          40,
          {
            "lista": true
          }
        ],
        [
          "Controles",
          25,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          35
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAE2210",
    "nombre": "Macroeconomía I",
    "nombre_norm": "macroeconomia i",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas",
          48,
          {
            "lista": true
          }
        ],
        [
          "Controles y tareas",
          20,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          32
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAE2220",
    "nombre": "Macroeconomía II",
    "nombre_norm": "macroeconomia ii",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas",
          50,
          {
            "lista": true
          }
        ],
        [
          "Controles",
          20,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAF2010",
    "nombre": "Aplicaciones Matemáticas para Economía y Negocios",
    "nombre_norm": "aplicaciones matematicas para economia y negocios",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Pruebas escritas",
          50,
          {
            "lista": true
          }
        ],
        [
          "Examen final",
          30
        ],
        [
          "Tareas grupales",
          20,
          {
            "lista": true
          }
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "EAF2500",
    "nombre": "Práctica Social",
    "nombre_norm": "practica social",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Evaluación socio comunitario",
          30
        ],
        [
          "Co-evaluación de estudiantes",
          20
        ],
        [
          "Registro de portafolio",
          30
        ],
        [
          "Presentación final Feria de proyectos",
          20
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "ETI209",
    "nombre": "Ética, Economía y Empresa",
    "nombre_norm": "etica, economia y empresa",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "ETI209",
      "periodo": "2026-2",
      "limiteAusencias": {
        "nombre": "Traspaso de pruebas justificadas al examen",
        "desde": [
          "Prueba 1",
          "Prueba 2"
        ],
        "hacia": "Examen",
        "max": 60
      },
      "noCalcula": [
        "Si las pruebas justificadas hacen que el examen supere 60%, se exige una recuperativa adicional cuya ponderación define el profesor. El resultado queda pendiente hasta resolver esa evaluación"
      ],
      "evals": [
        [
          "Prueba 1",
          20,
          {
            "fecha": "2026-09-10"
          }
        ],
        [
          "Prueba 2",
          20,
          {
            "fecha": "2026-10-26"
          }
        ],
        [
          "Actividades participativas",
          25,
          {
            "slots": 5,
            "slotLabel": "Actividad"
          }
        ],
        [
          "Examen",
          35,
          {
            "fecha": "2026-12-14"
          }
        ]
      ],
      "reglasDelCurso": [
        "Syllabus común 2026-2 para las tres secciones: pruebas a las 17:30 y examen a las 08:20. Las cinco actividades se anuncian por sección",
        "Si el traspaso por pruebas justificadas hace que el examen supere 60%, habrá una recuperativa adicional definida por el profesor, que puede ser oral. En ese caso ajusta la pauta con sus instrucciones"
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "MAT1630",
    "nombre": "Cálculo III",
    "nombre_norm": "calculo iii",
    "periodo": "",
    "definicion": {
      "evals": [
        [
          "Evaluaciones sumativas",
          60,
          {
            "lista": true
          }
        ],
        [
          "Laboratorios",
          10,
          {
            "lista": true
          }
        ],
        [
          "Examen final escrito",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF036",
    "nombre": "La Biblia de Jesús",
    "nombre_norm": "la biblia de jesus",
    "periodo": "",
    "definicion": {
      "sigla": "TTF036",
      "evals": [
        [
          "Infografía digital",
          20
        ],
        [
          "Corto de video",
          20
        ],
        [
          "Aplicación de lectura bíblica",
          30
        ],
        [
          "Ensayo",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF109",
    "nombre": "La Belleza de la Fragilidad Humana",
    "nombre_norm": "la belleza de la fragilidad humana",
    "periodo": "",
    "definicion": {
      "sigla": "TTF109",
      "evals": [
        [
          "Fichas de lectura",
          30,
          {
            "lista": true
          }
        ],
        [
          "Relatos autobiográficos",
          30,
          {
            "lista": true
          }
        ],
        [
          "Texto autoetnográfico",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF115",
    "nombre": "Virgen María y Feminismo: ¿Diálogo o Confrontación?",
    "nombre_norm": "virgen maria y feminismo: ¿dialogo o confrontacion?",
    "periodo": "",
    "definicion": {
      "sigla": "TTF115",
      "evals": [
        [
          "Control personal de contenido y lecturas",
          20
        ],
        [
          "Tareas grupales",
          30,
          {
            "lista": true
          }
        ],
        [
          "Pre-entrega del trabajo del video",
          10
        ],
        [
          "Presentación y exposición del video final",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF116",
    "nombre": "Arquitectura Sacra",
    "nombre_norm": "arquitectura sacra",
    "periodo": "",
    "definicion": {
      "sigla": "TTF116",
      "evals": [
        [
          "Prueba escrita",
          30
        ],
        [
          "Informe análisis de caso individual",
          15
        ],
        [
          "Informe de análisis de caso grupal",
          15
        ],
        [
          "Ensayo final",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF118",
    "nombre": "Esperanza Cristiana, Muerte y Más Allá",
    "nombre_norm": "esperanza cristiana, muerte y mas alla",
    "periodo": "",
    "definicion": {
      "sigla": "TTF118",
      "evals": [
        [
          "Tareas grupales en clases",
          40,
          {
            "lista": true
          }
        ],
        [
          "Presentación grupal",
          20
        ],
        [
          "Co evaluación",
          20
        ],
        [
          "Informe de síntesis y sistematización",
          20
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF202",
    "nombre": "Búsquedas Religiosas y Cristianismo",
    "nombre_norm": "busquedas religiosas y cristianismo",
    "periodo": "",
    "definicion": {
      "sigla": "TTF202",
      "evals": [
        [
          "Síntesis de debates",
          40,
          {
            "lista": true
          }
        ],
        [
          "Controles de lectura",
          30,
          {
            "lista": true
          }
        ],
        [
          "Prueba",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF205",
    "nombre": "¿Quién Es Jesús de Nazareth?",
    "nombre_norm": "¿quien es jesus de nazareth?",
    "periodo": "",
    "definicion": {
      "sigla": "TTF205",
      "evals": [
        [
          "Infografía grupal",
          30
        ],
        [
          "Producción escrita",
          30
        ],
        [
          "Podcast",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF206",
    "nombre": "El Padrenuestro: la Oración de Jesús",
    "nombre_norm": "el padrenuestro: la oracion de jesus",
    "periodo": "",
    "definicion": {
      "sigla": "TTF206",
      "evals": [
        [
          "Informes investigación",
          20,
          {
            "lista": true
          }
        ],
        [
          "Informes de lectura",
          30,
          {
            "lista": true
          }
        ],
        [
          "Controles escritos",
          30,
          {
            "lista": true
          }
        ],
        [
          "Presentación oral (final)",
          20
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF207",
    "nombre": "Doctrina Social de la Iglesia",
    "nombre_norm": "doctrina social de la iglesia",
    "periodo": "",
    "definicion": {
      "sigla": "TTF207",
      "evals": [
        [
          "Pruebas",
          40,
          {
            "lista": true
          }
        ],
        [
          "Controles de lectura",
          20,
          {
            "lista": true
          }
        ],
        [
          "Ensayos",
          40,
          {
            "lista": true
          }
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF208",
    "nombre": "Fe y Razón: Una Perspectiva Histórica",
    "nombre_norm": "fe y razon: una perspectiva historica",
    "periodo": "",
    "definicion": {
      "sigla": "TTF208",
      "evals": [
        [
          "Pruebas",
          30,
          {
            "lista": true
          }
        ],
        [
          "Informes de lectura",
          30,
          {
            "lista": true
          }
        ],
        [
          "Trabajo grupal",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF210",
    "nombre": "Experiencia Creyente y Secularismo",
    "nombre_norm": "experiencia creyente y secularismo",
    "periodo": "",
    "definicion": {
      "sigla": "TTF210",
      "evals": [
        [
          "Prueba de desarrollo",
          30
        ],
        [
          "Tareas",
          20,
          {
            "lista": true
          }
        ],
        [
          "Producción audiovisual grupal",
          10
        ],
        [
          "Ensayo",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF211",
    "nombre": "Para Pensar la Muerte",
    "nombre_norm": "para pensar la muerte",
    "periodo": "",
    "definicion": {
      "sigla": "TTF211",
      "evals": [
        [
          "Ensayos individuales",
          60,
          {
            "lista": true
          }
        ],
        [
          "Interrogaciones grupales",
          40,
          {
            "lista": true
          }
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF213",
    "nombre": "Espiritualidad Laical y Cultura Moderna",
    "nombre_norm": "espiritualidad laical y cultura moderna",
    "periodo": "",
    "definicion": {
      "sigla": "TTF213",
      "evals": [
        [
          "Controles de lecturas",
          50,
          {
            "lista": true
          }
        ],
        [
          "Pruebas",
          20,
          {
            "lista": true
          }
        ],
        [
          "Informe escrito grupal",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF215",
    "nombre": "Teología y Ecología",
    "nombre_norm": "teologia y ecologia",
    "periodo": "",
    "definicion": {
      "sigla": "TTF215",
      "evals": [
        [
          "Presentación síntesis de contenidos",
          30
        ],
        [
          "Informe escrito",
          35
        ],
        [
          "Análisis de caso grupal",
          35
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF216",
    "nombre": "¿Creer o No Creer?",
    "nombre_norm": "¿creer o no creer?",
    "periodo": "",
    "definicion": {
      "sigla": "TTF216",
      "evals": [
        [
          "Pruebas",
          40,
          {
            "lista": true
          }
        ],
        [
          "Informes de lectura",
          20,
          {
            "lista": true
          }
        ],
        [
          "Trabajo grupal",
          30
        ],
        [
          "Asistencia",
          10
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF217",
    "nombre": "¿Es Necesaria la Iglesia?",
    "nombre_norm": "¿es necesaria la iglesia?",
    "periodo": "",
    "definicion": {
      "sigla": "TTF217",
      "evals": [
        [
          "Pruebas",
          40,
          {
            "lista": true
          }
        ],
        [
          "Trabajo grupal (entrevistas y análisis)",
          35
        ],
        [
          "Ensayo individual",
          25
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF218",
    "nombre": "Lectura Contemporánea de la Biblia",
    "nombre_norm": "lectura contemporanea de la biblia",
    "periodo": "",
    "definicion": {
      "sigla": "TTF218",
      "evals": [
        [
          "Presentaciones grupales",
          30,
          {
            "lista": true
          }
        ],
        [
          "Análisis de casos individual",
          40
        ],
        [
          "Ensayo final",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF219",
    "nombre": "Existencia Humana y la Búsqueda de Sentido",
    "nombre_norm": "existencia humana y la busqueda de sentido",
    "periodo": "",
    "definicion": {
      "sigla": "TTF219",
      "evals": [
        [
          "Prueba escrita",
          30
        ],
        [
          "Informe de análisis de caso grupal",
          30
        ],
        [
          "Ensayo final",
          40
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF220",
    "nombre": "Teología del Cuerpo Humano",
    "nombre_norm": "teologia del cuerpo humano",
    "periodo": "",
    "definicion": {
      "sigla": "TTF220",
      "evals": [
        [
          "Presentaciones grupales",
          60,
          {
            "lista": true
          }
        ],
        [
          "Análisis de casos individual",
          25
        ],
        [
          "Ensayo final",
          15
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF222",
    "nombre": "Cristianismo y Crisis Ecológica",
    "nombre_norm": "cristianismo y crisis ecologica",
    "periodo": "",
    "definicion": {
      "sigla": "TTF222",
      "evals": [
        [
          "Controles de lectura",
          50,
          {
            "lista": true
          }
        ],
        [
          "Evaluación de pares",
          20
        ],
        [
          "Portafolio",
          30
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF225",
    "nombre": "Fe y Ciencia",
    "nombre_norm": "fe y ciencia",
    "periodo": "",
    "definicion": {
      "sigla": "TTF225",
      "evals": [
        [
          "Control escrito de contenidos",
          35
        ],
        [
          "Ensayo",
          30
        ],
        [
          "Trabajo colaborativo y exposición",
          35
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF226",
    "nombre": "Religión y Política",
    "nombre_norm": "religion y politica",
    "periodo": "",
    "definicion": {
      "sigla": "TTF226",
      "evals": [
        [
          "Pruebas",
          60,
          {
            "lista": true
          }
        ],
        [
          "Exposiciones grupales",
          30,
          {
            "lista": true
          }
        ],
        [
          "Participación en el curso",
          10
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF232",
    "nombre": "Teología Feminista: Un Signo de los Tiempos",
    "nombre_norm": "teologia feminista: un signo de los tiempos",
    "periodo": "",
    "definicion": {
      "sigla": "TTF232",
      "evals": [
        [
          "Tareas",
          20,
          {
            "lista": true
          }
        ],
        [
          "Control de lectura",
          25
        ],
        [
          "Análisis de casos",
          25
        ],
        [
          "Portafolio",
          10
        ],
        [
          "Presentación oral grupal",
          20
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF233",
    "nombre": "Teología y Literatura",
    "nombre_norm": "teologia y literatura",
    "periodo": "",
    "definicion": {
      "sigla": "TTF233",
      "evals": [
        [
          "Informe de lectura",
          15
        ],
        [
          "Ejercicios grupales",
          60,
          {
            "lista": true
          }
        ],
        [
          "Relectura final individual",
          25
        ]
      ]
    }
  },
  {
    "tenant": "uc",
    "clave": "TTF012",
    "nombre": "Revelación y Fe",
    "nombre_norm": "revelacion y fe",
    "periodo": "2026-2",
    "definicion": {
      "sigla": "TTF012",
      "periodo": "2026-2",
      "creditos": 10,
      "evals": [
        [
          "Evaluación 1",
          20,
          {
            "fecha": "2026-09-07"
          }
        ],
        [
          "Evaluación 2",
          20,
          {
            "fecha": "2026-10-14"
          }
        ],
        [
          "Evaluación 3",
          30,
          {
            "fecha": "2026-11-16"
          }
        ],
        [
          "Examen final",
          30
        ]
      ],
      "noCalcula": [
        "Si tienes más de 75% de asistencia y una nota de presentación igual o superior a 6,00, te eximes del Examen final; tu nota de presentación se calcula como el promedio simple de Evaluación 1, Evaluación 2 y Evaluación 3, sin usar sus ponderaciones",
        "Si te eximes del Examen final, la nota del Examen final se reemplaza por la nota más alta que obtuviste entre Evaluación 1, Evaluación 2 y Evaluación 3",
        "Si obtienes décimas en los talleres, se agregan al finalizar el semestre a tu nota más baja",
        "Si presentas voluntariamente uno de los textos del curso cumpliendo las condiciones indicadas, obtienes un 7,0 que se promedia con tu nota más baja entre Evaluación 1, Evaluación 2 y Evaluación 3"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "escritura argumentativa",
    "nombre": "Escritura Argumentativa",
    "nombre_norm": "escritura argumentativa",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Test diagnóstico",
          3.75
        ],
        [
          "Análisis de textos 1",
          4.5,
          {
            "fecha": "2026-08-20"
          }
        ],
        [
          "Análisis de textos 2",
          6.75,
          {
            "fecha": "2026-08-27"
          }
        ],
        [
          "Comentario crítico",
          15
        ],
        [
          "Ensayo",
          22.5
        ],
        [
          "Evaluación entre pares",
          11.25
        ],
        [
          "Actividades y participación",
          11.25
        ],
        [
          "Examen",
          25
        ]
      ],
      "reglasDelCurso": [
        "Programa UAI 2026-2 de Escritura Argumentativa, secciones 6 y 7. Revisa que corresponda a tu sección",
        "Test diagnóstico: ingresa la mejor nota entre el diagnóstico inicial y su reescritura",
        "Comentario crítico y Ensayo: ingresa la nota consolidada del curso, no una versión aislada. Cada uno combina esquema 10%, escritura 30% y reescritura 60%; si la reescritura llega a 6,3, reemplaza a la escritura sin cambiar el esquema",
        "Evaluación entre pares tiene dos instancias, pero el programa no fija su reparto. Ingresa la nota consolidada; lo mismo para Actividades y participación",
        "Se exige al menos 80% de asistencia. La eximición requiere estar en el 20% superior del curso, presentación de al menos 5,5 y todas las evaluaciones rendidas; la app no conoce el ranking"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "matematicas avanzadas i",
    "nombre": "Matemáticas Avanzadas I",
    "nombre_norm": "matematicas avanzadas i",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 6,
      "eximicion": {
        "evaluacion": "Examen",
        "segun": [
          "Talleres",
          "Controles",
          "Pruebas"
        ],
        "min": 5,
        "ignoraDescartes": true,
        "comparaNotaOficial": true,
        "sinAusenciasJustificadas": true,
        "requierePautaOriginal": true
      },
      "segundaFecha": {
        "evaluacion": "Examen",
        "finalMin": 3.5,
        "finalMax": 3.9,
        "requiereTodas": true,
        "aviso": "Si rendiste el examen en la fecha indicada, consulta por el segundo examen. La app no calcula su resultado"
      },
      "ausenciasJustificadas": {
        "reemplazosCasilla": [
          {
            "desde": "Talleres",
            "desdeSlot": 0,
            "hacia": "Pruebas",
            "haciaSlot": 0
          },
          {
            "desde": "Talleres",
            "desdeSlot": 1,
            "hacia": "Pruebas",
            "haciaSlot": 1
          },
          {
            "desde": "Talleres",
            "desdeSlot": 2,
            "hacia": "Pruebas",
            "haciaSlot": 2
          },
          {
            "desde": "Controles",
            "desdeSlot": 0,
            "hacia": "Examen"
          },
          {
            "desde": "Controles",
            "desdeSlot": 1,
            "hacia": "Examen"
          },
          {
            "desde": "Controles",
            "desdeSlot": 2,
            "hacia": "Examen"
          },
          {
            "desde": "Pruebas",
            "desdeSlot": 0,
            "hacia": "Examen"
          },
          {
            "desde": "Pruebas",
            "desdeSlot": 1,
            "hacia": "Examen"
          },
          {
            "desde": "Pruebas",
            "desdeSlot": 2,
            "hacia": "Examen"
          }
        ]
      },
      "evals": [
        [
          "Talleres",
          7,
          {
            "slots": 3,
            "slotLabel": "Taller"
          }
        ],
        [
          "Controles",
          14,
          {
            "slots": 3,
            "slotLabel": "Control"
          }
        ],
        [
          "Pruebas",
          49,
          {
            "slots": 3,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "noCalcula": [
        "Si apruebas el segundo examen, la final queda en 4,0; si lo repruebas, conservas la final anterior. La app solo avisa cuándo podrías rendirlo"
      ],
      "reglasDelCurso": [
        "Programa MAT124 UAI 2026-2, sección 2, Santiago. Esta pauta calcula el camino con examen",
        "Si rendiste todas las pruebas y controles en sus fechas originales y obtienes al menos 4,0 en el examen, puedes reemplazar una prueba por el examen; no se otorga este beneficio con sanción de Honor"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "razonamiento cuantitativo con datos i",
    "nombre": "Razonamiento Cuantitativo con Datos I",
    "nombre_norm": "razonamiento cuantitativo con datos i",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "eximicion": {
        "evaluaciones": [
          "Examen teórico",
          "Examen práctico"
        ],
        "etiqueta": "los exámenes teórico y práctico",
        "segun": [
          "Pruebas teóricas",
          "Controles",
          "Trabajo aplicado"
        ],
        "min": 5,
        "minimos": [
          {
            "evaluaciones": [
              "Pruebas teóricas"
            ],
            "min": 4
          },
          {
            "evaluaciones": [
              "Controles",
              "Trabajo aplicado"
            ],
            "min": 4
          }
        ],
        "ignoraDescartes": true,
        "comparaNotaOficial": true,
        "sinAusenciasJustificadas": true,
        "requierePautaOriginal": true,
        "ocultaEvaluacion": true
      },
      "ausenciasJustificadas": {
        "reemplazosCasilla": [
          {
            "desde": "Pruebas teóricas",
            "desdeSlot": 0,
            "hacia": "Examen teórico"
          },
          {
            "desde": "Pruebas teóricas",
            "desdeSlot": 1,
            "hacia": "Examen teórico"
          },
          {
            "desde": "Controles",
            "desdeSlot": 0,
            "hacia": "Examen práctico"
          },
          {
            "desde": "Controles",
            "desdeSlot": 1,
            "hacia": "Examen práctico"
          },
          {
            "desde": "Controles",
            "desdeSlot": 2,
            "hacia": "Examen práctico"
          },
          {
            "desde": "Controles",
            "desdeSlot": 3,
            "hacia": "Examen práctico"
          },
          {
            "desde": "Controles",
            "desdeSlot": 4,
            "hacia": "Examen práctico"
          }
        ]
      },
      "evals": [
        [
          "Pruebas teóricas",
          35,
          {
            "slots": 2,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Controles",
          26.25,
          {
            "slots": 5,
            "slotLabel": "Control"
          }
        ],
        [
          "Trabajo aplicado",
          8.75
        ],
        [
          "Examen teórico",
          15
        ],
        [
          "Examen práctico",
          15
        ]
      ],
      "noCalcula": [
        "Tras rendir el examen, ET y EP deben ser al menos 4,0. Si no se cumple, el curso se reprueba con la menor de ET y EP; este promedio no aplica esa sustitución"
      ],
      "reglasDelCurso": [
        "Programa MAT125 UAI 2026-2, cátedra de Macarena Larrain. Esta pauta calcula el camino con examen",
        "ET es el promedio de dos pruebas; EP es 75% promedio de cinco controles y 25% Trabajo aplicado",
        "En Trabajo aplicado ingresa su nota consolidada: 30% informe y 70% archivo Excel. Los trabajos no son justificables",
        "Si declaraste una ausencia justificada, tienes que rendir ambos exámenes y no puedes eximirte"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "introduccion a la microeconomia",
    "nombre": "Introducción a la Microeconomía",
    "nombre_norm": "introduccion a la microeconomia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 6,
      "reemplazosOptativos": [
        {
          "tipo": "reemplazo",
          "fuente": "Examen",
          "destinos": [
            "Prueba 1",
            "Prueba 2"
          ],
          "rendidas": [
            "Prueba 1",
            "Prueba 2"
          ],
          "minFuente": 4.8
        }
      ],
      "ausenciasJustificadas": {
        "maxTraspasos": 1,
        "traspasos": [
          {
            "desde": "Prueba 1",
            "hacia": "Examen"
          },
          {
            "desde": "Prueba 2",
            "hacia": "Examen"
          }
        ]
      },
      "evals": [
        [
          "Controles y tareas",
          20
        ],
        [
          "Prueba 1",
          25
        ],
        [
          "Prueba 2",
          25
        ],
        [
          "Examen",
          30
        ]
      ],
      "noCalcula": [
        "Una ausencia justificada en un control o tarea se reemplaza por el examen, pero el bloque está consolidado y el programa no fija el peso de cada instancia. Con dos pruebas justificadas, el programa no define el destino de la segunda"
      ],
      "reglasDelCurso": [
        "Programa ECO122 UAI 2026-2, sección 1, Viña del Mar. Revisa que corresponda a tu sección",
        "En Controles y tareas ingresa la nota consolidada que entrega el curso: el profesor decide la cantidad y el programa no desglosa sus pesos",
        "Se aprueba con promedio ponderado de al menos 3,95. El examen es obligatorio y no tiene nota mínima"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "management",
    "nombre": "Management",
    "nombre_norm": "management",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Solemne 1",
          20
        ],
        [
          "Solemne 2",
          20
        ],
        [
          "Solemne 3",
          20
        ],
        [
          "Controles",
          25,
          {
            "lista": true,
            "dropLowest": {
              "count": 2
            },
            "min": 4,
            "cap": 3.9
          }
        ],
        [
          "Tareas",
          15,
          {
            "lista": true
          }
        ]
      ],
      "reglasDelCurso": [
        "Programa MGT103 UAI 2026-2, sección 2, Santiago. Revisa que corresponda a tu sección",
        "Al terminar los controles se eliminan las dos notas más bajas. Mientras agregas notas, el descarte y el promedio que muestra la app son una estimación parcial",
        "Para aprobar, el promedio de Controles debe ser al menos 4,0; si la final era aprobatoria y no cumples, queda en 3,9",
        "También se exige 75% de asistencia: si no la cumples, una final aprobatoria queda en 3,9. La app no conoce tu asistencia"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "introduccion a la macroeconomia",
    "nombre": "Introducción a la Macroeconomía",
    "nombre_norm": "introduccion a la macroeconomia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "creditos": 6,
      "ausenciasJustificadas": {
        "maxReemplazos": 1,
        "reemplazos": [
          {
            "desde": "Prueba oficial 1",
            "hacia": "Examen final"
          },
          {
            "desde": "Prueba oficial 2",
            "hacia": "Examen final"
          },
          {
            "desde": "Prueba oficial 3",
            "hacia": "Examen final"
          }
        ]
      },
      "evals": [
        [
          "Controles y otras evaluaciones",
          15
        ],
        [
          "Prueba oficial 1",
          20
        ],
        [
          "Prueba oficial 2",
          20
        ],
        [
          "Prueba oficial 3",
          20
        ],
        [
          "Examen final",
          25
        ]
      ],
      "noCalcula": [
        "Con más de una prueba justificada, el programa no define cómo resolver las siguientes ausencias"
      ],
      "reglasDelCurso": [
        "Programa ECO123 UAI 2026-2, sección 03, Santiago. Revisa que corresponda a tu sección",
        "Ingresa el promedio consolidado de Controles y otras evaluaciones del curso: contempla al menos ocho evaluaciones y elimina dos o tres notas, sin fijar cuántas. Puede incluir participación con 50% de ese bloque a criterio del profesor",
        "El examen final es obligatorio"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "matematicas avanzadas ii",
    "nombre": "Matemáticas Avanzadas II",
    "nombre_norm": "matematicas avanzadas ii",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "recuperativo": {
        "min": 3.5,
        "max": 3.9,
        "nota": 4
      },
      "reemplazosOptativos": [
        {
          "tipo": "reemplazo",
          "fuente": "Examen",
          "destinos": [
            "Pruebas"
          ],
          "rendidas": [
            "Pruebas",
            "Controles"
          ],
          "minFuente": 4
        }
      ],
      "eximicion": {
        "evaluacion": "Examen",
        "segun": [
          "Pruebas",
          "Controles"
        ],
        "min": 5,
        "ignoraDescartes": true,
        "requiereConfirmacion": true,
        "confirmar": "rendiste todas las pruebas y controles"
      },
      "ausenciasJustificadas": {
        "reemplazos": [
          {
            "desde": "Controles",
            "hacia": "Examen"
          },
          {
            "desde": "Pruebas",
            "hacia": "Examen"
          }
        ]
      },
      "evals": [
        [
          "Pruebas",
          49,
          {
            "slots": 3
          }
        ],
        [
          "Controles",
          21,
          {
            "slots": 3
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "reglasDelCurso": [
        "La eximición pide además haber rendido todas las evaluaciones; la app no sabe si una casilla vacía es una que no rendiste o una que no has ingresado"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "razonamiento cuantitativo con datos ii",
    "nombre": "Razonamiento Cuantitativo con Datos II",
    "nombre_norm": "razonamiento cuantitativo con datos ii",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "eximicion": {
        "evaluaciones": [
          "Examen teórico",
          "Examen práctico"
        ],
        "etiqueta": "los exámenes teórico y práctico",
        "segun": [
          "Pruebas",
          "Laboratorios",
          "Trabajo grupal"
        ],
        "min": 5,
        "minimos": [
          {
            "evaluaciones": [
              "Pruebas"
            ],
            "min": 4
          },
          {
            "evaluaciones": [
              "Laboratorios",
              "Trabajo grupal"
            ],
            "min": 4
          }
        ],
        "ignoraDescartes": false,
        "comparaNotaOficial": true,
        "sinAusenciasJustificadas": true,
        "requierePautaOriginal": true,
        "requiereConfirmacion": true,
        "confirmar": "rendiste todas las pruebas de la pauta",
        "ocultaEvaluacion": true
      },
      "evals": [
        [
          "Pruebas",
          35
        ],
        [
          "Laboratorios",
          26.25,
          {
            "slots": 5,
            "dropLowest": {
              "count": 1
            }
          }
        ],
        [
          "Trabajo grupal",
          8.75
        ],
        [
          "Examen teórico",
          15
        ],
        [
          "Examen práctico",
          15
        ]
      ],
      "grupos": [
        {
          "nombre": "Nota teórica",
          "evals": [
            "Pruebas",
            "Examen teórico"
          ],
          "min": 4,
          "cap": "self"
        },
        {
          "nombre": "Nota práctica",
          "evals": [
            "Laboratorios",
            "Trabajo grupal",
            "Examen práctico"
          ],
          "min": 4,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Una inasistencia justificada a prueba o laboratorio se reemplaza con la parte correspondiente del examen",
        "Si declaraste una inasistencia justificada, tienes que rendir los exámenes y no puedes eximirte"
      ]
    }
  },
  {
    "tenant": "uai",
    "clave": "civilizacion contemporanea ii",
    "nombre": "Civilización Contemporánea II",
    "nombre_norm": "civilizacion contemporanea ii",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Evaluaciones de lectura",
          32.5
        ],
        [
          "Participación en clases",
          32.5
        ],
        [
          "Ensayo breve escrito en clases",
          10
        ],
        [
          "Examen",
          25
        ]
      ],
      "noCalcula": [
        "Te eximes del examen si tu nota de presentación te deja en el 20% superior del curso y además es al menos 5,5: la app no conoce las notas del resto del curso"
      ],
      "reglasDelCurso": [
        "En Evaluaciones de lectura ingresa el promedio consolidado de tu sección: el programa dice 10 en la ponderación y 11 en el texto, así que no precargamos casillas",
        "El curso exige 80% de asistencia: bajo eso repruebas, con 3,9 si tu promedio era 4,0 o más, o con tu promedio si era 3,9 o menos. La app no registra asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "creacion y cuidado del mundo",
    "nombre": "Creación y Cuidado del Mundo",
    "nombre_norm": "creacion y cuidado del mundo",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Reseña final clase a clase",
          40
        ],
        [
          "Prueba 1",
          30
        ],
        [
          "Prueba 2",
          30
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 7729. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "desafios sociales del cristianismo",
    "nombre": "Desafíos Sociales del Cristianismo",
    "nombre_norm": "desafios sociales del cristianismo",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Evaluación 1",
          25
        ],
        [
          "Evaluación 2",
          25
        ],
        [
          "Evaluación 3",
          30
        ],
        [
          "Participación y actividades en clases",
          20
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 4373. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "la iglesia",
    "nombre": "La Iglesia",
    "nombre_norm": "la iglesia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Control 1",
          30
        ],
        [
          "Control 2",
          35
        ],
        [
          "Control 3",
          35
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 6375. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "los vicios capitales",
    "nombre": "Los Vicios Capitales",
    "nombre_norm": "los vicios capitales",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Ensayos",
          70,
          {
            "slots": 2,
            "slotLabel": "Ensayo"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Ensayos"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 2199, 7944. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "mundo: realidad divina",
    "nombre": "Mundo: Realidad Divina",
    "nombre_norm": "mundo: realidad divina",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          70,
          {
            "slots": 2,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 4135, 6719. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "padres de la iglesia",
    "nombre": "Padres de la Iglesia",
    "nombre_norm": "padres de la iglesia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Prueba",
          25
        ],
        [
          "Control de lectura",
          25
        ],
        [
          "Análisis de textos en clase",
          20
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Prueba",
            "Control de lectura",
            "Análisis de textos en clase"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 7818. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "mundo, trabajo y redencion",
    "nombre": "Mundo, Trabajo y Redención",
    "nombre_norm": "mundo, trabajo y redencion",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Bitácoras",
          35,
          {
            "lista": true
          }
        ],
        [
          "Tareas semanales",
          35,
          {
            "lista": true
          }
        ],
        [
          "Ensayo o examen final",
          30
        ]
      ],
      "noCalcula": [
        "Puedes elegir entre ensayo y examen final. Con ensayo la nota máxima del curso es 6,0; con examen, 7,0. Este promedio no aplica ese tope"
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 5440. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "actualidad y fe",
    "nombre": "Actualidad y Fe",
    "nombre_norm": "actualidad y fe",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Asistencia y participación",
          35
        ],
        [
          "Ensayo",
          35
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Asistencia y participación",
            "Ensayo"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 7728. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "lectura del apocalipsis",
    "nombre": "Lectura del Apocalipsis",
    "nombre_norm": "lectura del apocalipsis",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Control de lectura 1",
          20
        ],
        [
          "Control de lectura 2",
          20
        ],
        [
          "Prueba",
          20
        ],
        [
          "Examen oral",
          40
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Control de lectura 1",
            "Control de lectura 2",
            "Prueba"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Teología III), NRC 6726. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen oral y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "apreciacion de la arquitectura",
    "nombre": "Apreciación de la Arquitectura",
    "nombre_norm": "apreciacion de la arquitectura",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Controles",
          60,
          {
            "slots": 3,
            "slotLabel": "Control"
          }
        ],
        [
          "Examen",
          40
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Controles"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 5417. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "apreciacion de la pintura occidental",
    "nombre": "Apreciación de la Pintura Occidental",
    "nombre_norm": "apreciacion de la pintura occidental",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Control",
          50
        ],
        [
          "Examen",
          50
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Control"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 5320. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "arte y cultura griega",
    "nombre": "Arte y Cultura Griega",
    "nombre_norm": "arte y cultura griega",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Seminarios socráticos",
          40,
          {
            "slots": 4,
            "slotLabel": "Seminario socrático"
          }
        ],
        [
          "Prueba",
          30
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Seminarios socráticos",
            "Prueba"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 1659. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "cuento de fantasia y ficcion",
    "nombre": "Cuento de Fantasía y Ficción",
    "nombre_norm": "cuento de fantasia y ficcion",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          70,
          {
            "slots": 2,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 6362. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "de bach al rock",
    "nombre": "De Bach al Rock",
    "nombre_norm": "de bach al rock",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          70,
          {
            "slots": 2,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 1653. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "genios del arte",
    "nombre": "Genios del Arte",
    "nombre_norm": "genios del arte",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          70,
          {
            "slots": 3,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 6358. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "poesia y experiencia humana",
    "nombre": "Poesía y Experiencia Humana",
    "nombre_norm": "poesia y experiencia humana",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          70,
          {
            "slots": 2,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 1658. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "revolucion artistica del renacimiento",
    "nombre": "Revolución Artística del Renacimiento",
    "nombre_norm": "revolucion artistica del renacimiento",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Seminarios socráticos",
          40,
          {
            "slots": 4,
            "slotLabel": "Seminario socrático"
          }
        ],
        [
          "Prueba",
          30
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Seminarios socráticos",
            "Prueba"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 1660. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "el impresionismo",
    "nombre": "El Impresionismo",
    "nombre_norm": "el impresionismo",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Control",
          50
        ],
        [
          "Examen",
          50
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Control"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 6702. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "la belleza en el arte",
    "nombre": "La Belleza en el Arte",
    "nombre_norm": "la belleza en el arte",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Bitácoras",
          40,
          {
            "slots": 12,
            "slotLabel": "Bitácora"
          }
        ],
        [
          "Trabajo final grupal",
          40
        ],
        [
          "Crítica de arte",
          20
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 7933. Revisa que corresponda a tu sección",
        "Se exige al menos 75% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "grandes libros: interioridad (edu)",
    "nombre": "Grandes Libros: Interioridad (EDU)",
    "nombre_norm": "grandes libros: interioridad (edu)",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Cuestionarios semanales",
          25,
          {
            "lista": true
          }
        ],
        [
          "Participación",
          25
        ],
        [
          "Prácticas para el ensayo final",
          20
        ],
        [
          "Examen final",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Cuestionarios semanales",
            "Participación",
            "Prácticas para el ensayo final"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 7738, 7740, 7739. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen final y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "vanguardias artisticas del siglo xx",
    "nombre": "Vanguardias Artísticas del Siglo XX",
    "nombre_norm": "vanguardias artisticas del siglo xx",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          70,
          {
            "slots": 3,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 6360. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "astronomia",
    "nombre": "Astronomía",
    "nombre_norm": "astronomia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Cuestionarios",
          14,
          {
            "lista": true
          }
        ],
        [
          "Controles de lectura",
          35,
          {
            "slots": 2,
            "slotLabel": "Control de lectura"
          }
        ],
        [
          "Trabajo",
          21
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Cuestionarios",
            "Controles de lectura",
            "Trabajo"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 6361, 1614. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "biologia acuatica",
    "nombre": "Biología Acuática",
    "nombre_norm": "biologia acuatica",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          60,
          {
            "slots": 3,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          40
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 1608. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "de la imprenta a chat gtp",
    "nombre": "De la Imprenta a Chat GTP",
    "nombre_norm": "de la imprenta a chat gtp",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Controles",
          40,
          {
            "slots": 2,
            "slotLabel": "Control"
          }
        ],
        [
          "Participación",
          30
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Controles",
            "Participación"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 6367. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "grandes teoremas matematicos",
    "nombre": "Grandes Teoremas Matemáticos",
    "nombre_norm": "grandes teoremas matematicos",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Controles de lectura",
          50,
          {
            "slots": 2,
            "slotLabel": "Control de lectura"
          }
        ],
        [
          "Actividades semanales",
          20,
          {
            "lista": true
          }
        ],
        [
          "Prueba",
          30
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 6441. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "hacia el espacio",
    "nombre": "Hacia el Espacio",
    "nombre_norm": "hacia el espacio",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          50,
          {
            "slots": 2,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Presentación noticia",
          10
        ],
        [
          "Examen final",
          40
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas",
            "Presentación noticia"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 7731. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen final y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "el mundo visto desde la ciencia",
    "nombre": "El Mundo visto desde la Ciencia",
    "nombre_norm": "el mundo visto desde la ciencia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Control de lectura",
          30
        ],
        [
          "Actividades semanales",
          30,
          {
            "lista": true
          }
        ],
        [
          "Prueba",
          40
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 1610. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "sismologia y vulcanologia",
    "nombre": "Sismología y Vulcanología",
    "nombre_norm": "sismologia y vulcanologia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Evaluación clase a clase",
          70,
          {
            "lista": true
          }
        ],
        [
          "Trabajo final",
          30
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 6365. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "textos de grandes cientificos",
    "nombre": "Textos de Grandes Científicos",
    "nombre_norm": "textos de grandes cientificos",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Bitácoras",
          35,
          {
            "lista": true
          }
        ],
        [
          "Tareas semanales",
          35,
          {
            "lista": true
          }
        ],
        [
          "Ensayo o examen final",
          30
        ]
      ],
      "noCalcula": [
        "Puedes elegir entre ensayo y examen final. Con ensayo la nota máxima del curso es 6,0; con examen, 7,0. Este promedio no aplica ese tope"
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 1606. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "zoologia",
    "nombre": "Zoología",
    "nombre_norm": "zoologia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          60,
          {
            "slots": 3,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Examen",
          40
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 5392. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "cambio climatico",
    "nombre": "Cambio Climático",
    "nombre_norm": "cambio climatico",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Pruebas",
          63,
          {
            "slots": 3,
            "slotLabel": "Prueba"
          }
        ],
        [
          "Asistencia y participación",
          7
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Pruebas",
            "Asistencia y participación"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 7743. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "grandes expediciones cientificas",
    "nombre": "Grandes Expediciones Científicas",
    "nombre_norm": "grandes expediciones cientificas",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Evaluaciones",
          100,
          {
            "slots": 4,
            "slotLabel": "Evaluación"
          }
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 7934. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "problematicas urbanas",
    "nombre": "Problemáticas Urbanas",
    "nombre_norm": "problematicas urbanas",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Trabajos grupales",
          60,
          {
            "slots": 3,
            "slotLabel": "Trabajo grupal"
          }
        ],
        [
          "Trabajos individuales",
          40,
          {
            "lista": true
          }
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 6464. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "reconocimiento natural de la fertilidad",
    "nombre": "Reconocimiento Natural de la Fertilidad",
    "nombre_norm": "reconocimiento natural de la fertilidad",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Trabajo: avance",
          20
        ],
        [
          "Entrega final de trabajo y reflexión escrita",
          80
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Ciencias), NRC 7747. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "actualidad internacional",
    "nombre": "Actualidad Internacional",
    "nombre_norm": "actualidad internacional",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Trabajo de investigación",
          70,
          {
            "slots": 2,
            "slotLabel": "Entrega"
          }
        ],
        [
          "Controles",
          30,
          {
            "slots": 3,
            "slotLabel": "Control"
          }
        ]
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 4011. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "arte y politica",
    "nombre": "Arte y Política",
    "nombre_norm": "arte y politica",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Tareas",
          50,
          {
            "lista": true
          }
        ],
        [
          "Controles",
          10,
          {
            "lista": true
          }
        ],
        [
          "Examen (trabajo)",
          40
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Tareas",
            "Controles"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 5372. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen (trabajo) y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "grandeza y decadencia de roma",
    "nombre": "Grandeza y Decadencia de Roma",
    "nombre_norm": "grandeza y decadencia de roma",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Trabajos",
          40,
          {
            "slots": 2,
            "slotLabel": "Trabajo"
          }
        ],
        [
          "Ensayo",
          20
        ],
        [
          "Examen (ensayo)",
          40
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Trabajos",
            "Ensayo"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 6693. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen (ensayo) y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "grandes batallas de la humanidad",
    "nombre": "Grandes Batallas de la Humanidad",
    "nombre_norm": "grandes batallas de la humanidad",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Control de lectura 1",
          20
        ],
        [
          "Control de lectura 2",
          20
        ],
        [
          "Prueba de materia",
          30
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Control de lectura 1",
            "Control de lectura 2",
            "Prueba de materia"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 1672. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "grandes exploradores",
    "nombre": "Grandes Exploradores",
    "nombre_norm": "grandes exploradores",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Controles de lectura",
          45,
          {
            "slots": 3,
            "slotLabel": "Control de lectura"
          }
        ],
        [
          "Prueba",
          25
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Controles de lectura",
            "Prueba"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 1671. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "grandes visiones de la historia",
    "nombre": "Grandes Visiones de la Historia",
    "nombre_norm": "grandes visiones de la historia",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Participación",
          10
        ],
        [
          "Ensayos",
          60,
          {
            "slots": 2,
            "slotLabel": "Ensayo"
          }
        ],
        [
          "Examen oral",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Participación",
            "Ensayos"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 6366. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen oral y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "la guerra del pacifico",
    "nombre": "La Guerra del Pacífico",
    "nombre_norm": "la guerra del pacifico",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Control de lectura 1",
          20
        ],
        [
          "Control de lectura 2",
          20
        ],
        [
          "Prueba de materia",
          30
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Control de lectura 1",
            "Control de lectura 2",
            "Prueba de materia"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 6369. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "mitologia europea",
    "nombre": "Mitología Europea",
    "nombre_norm": "mitologia europea",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Controles de lectura",
          45,
          {
            "lista": true
          }
        ],
        [
          "Prueba",
          25
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Controles de lectura",
            "Prueba"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 1676. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "historia de las revoluciones",
    "nombre": "Historia de las Revoluciones",
    "nombre_norm": "historia de las revoluciones",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Taller",
          20
        ],
        [
          "Ensayos",
          50,
          {
            "slots": 2,
            "slotLabel": "Ensayo"
          }
        ],
        [
          "Examen oral",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Taller",
            "Ensayos"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 7734. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen oral y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "los terremotos en chile",
    "nombre": "Los Terremotos en Chile",
    "nombre_norm": "los terremotos en chile",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Bitácora",
          20
        ],
        [
          "Control",
          35
        ],
        [
          "Participación",
          10
        ],
        [
          "Examen (trabajo final)",
          35
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Bitácora",
            "Control",
            "Participación"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 7733. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen (trabajo final) y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "el mundo despues de roma",
    "nombre": "El mundo después de Roma",
    "nombre_norm": "el mundo despues de roma",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Primera evaluación",
          10
        ],
        [
          "Evaluaciones",
          60,
          {
            "slots": 3,
            "slotLabel": "Evaluación"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Primera evaluación",
            "Evaluaciones"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 7735. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "de emperatrices a reinas",
    "nombre": "De Emperatrices a Reinas",
    "nombre_norm": "de emperatrices a reinas",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Solemne 1",
          20
        ],
        [
          "Control de lectura 1",
          10
        ],
        [
          "Control de lectura 2",
          10
        ],
        [
          "Trabajo",
          20
        ],
        [
          "Examen",
          40
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Solemne 1",
            "Control de lectura 1",
            "Control de lectura 2",
            "Trabajo"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 7936. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "heroes de la historia de chile",
    "nombre": "Héroes de la Historia de Chile",
    "nombre_norm": "heroes de la historia de chile",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Controles de lectura",
          45,
          {
            "slots": 3,
            "slotLabel": "Control de lectura"
          }
        ],
        [
          "Prueba",
          25
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Controles de lectura",
            "Prueba"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 1674. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "uandes",
    "clave": "revelando el nuevo mundo",
    "nombre": "Revelando el Nuevo Mundo",
    "nombre_norm": "revelando el nuevo mundo",
    "periodo": "2026-2",
    "definicion": {
      "periodo": "2026-2",
      "evals": [
        [
          "Taller de análisis de fuentes 1",
          20
        ],
        [
          "Taller de análisis de fuentes 2",
          20
        ],
        [
          "Actividades y participación en clase",
          30
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Presentación a examen",
          "evals": [
            "Taller de análisis de fuentes 1",
            "Taller de análisis de fuentes 2",
            "Actividades y participación en clase"
          ],
          "min": 3,
          "cap": "self",
          "exacto": true
        }
      ],
      "reglasDelCurso": [
        "PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 6433. Revisa que corresponda a tu sección",
        "Se exige al menos 60% de asistencia",
        "Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SPF115",
    "nombre": "Procesos Psicológicos",
    "nombre_norm": "procesos psicologicos",
    "periodo": "",
    "definicion": {
      "sigla": "SPF115",
      "creditos": 5,
      "evals": [
        [
          "Certamen 1",
          17.5
        ],
        [
          "Certamen 2",
          24.5
        ],
        [
          "Trabajo grupal",
          10.5
        ],
        [
          "Controles de lectura y ejercicios",
          17.5,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SPF115 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SFF118",
    "nombre": "Fundamentos Filosóficos de la Psicología",
    "nombre_norm": "fundamentos filosoficos de la psicologia",
    "periodo": "",
    "definicion": {
      "sigla": "SFF118",
      "creditos": 2,
      "evals": [
        [
          "Certamen",
          49
        ],
        [
          "Trabajo y/o ejercicio",
          21,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SFF118 (Psicología, bimestral). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SFS111",
    "nombre": "Fundamentos Epistemológicos de la Psicología",
    "nombre_norm": "fundamentos epistemologicos de la psicologia",
    "periodo": "",
    "definicion": {
      "sigla": "SFS111",
      "creditos": 2,
      "evals": [
        [
          "Certamen",
          49
        ],
        [
          "Trabajo y/o ejercicio",
          21,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SFS111 (Psicología, bimestral). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SCC114",
    "nombre": "Fundamentos Socioculturales de la Psicología",
    "nombre_norm": "fundamentos socioculturales de la psicologia",
    "periodo": "",
    "definicion": {
      "sigla": "SCC114",
      "creditos": 5,
      "evals": [
        [
          "Certamen 1",
          24.5
        ],
        [
          "Certamen 2",
          24.5
        ],
        [
          "Controles de lectura y/o ejercicios prácticos",
          21,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SCC114 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SCA119",
    "nombre": "Coloquios de Actualidad en Psicología",
    "nombre_norm": "coloquios de actualidad en psicologia",
    "periodo": "",
    "definicion": {
      "sigla": "SCA119",
      "evals": [
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          28
        ],
        [
          "Bitácora: trabajo del semestre",
          10.5
        ],
        [
          "Bitácora: entrega final",
          10.5
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SCA119 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "STS122",
    "nombre": "Teorías Psicodinámicas",
    "nombre_norm": "teorias psicodinamicas",
    "periodo": "",
    "definicion": {
      "sigla": "STS122",
      "creditos": 3,
      "evals": [
        [
          "Certamen 1",
          24.5
        ],
        [
          "Certamen 2",
          24.5
        ],
        [
          "Trabajos y controles de lectura",
          21,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD STS122 (Psicología, semestral). Si tu curso es bimestral, su pauta es otra",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SNC123",
    "nombre": "Neurociencia",
    "nombre_norm": "neurociencia",
    "periodo": "",
    "definicion": {
      "sigla": "SNC123",
      "creditos": 5,
      "evals": [
        [
          "Certamen 1",
          24.5
        ],
        [
          "Certamen 2",
          24.5
        ],
        [
          "Ejercicio de aprendizaje basado en problemas",
          7
        ],
        [
          "Controles de lectura",
          14,
          {
            "slots": 4,
            "slotLabel": "Control de lectura"
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SNC123 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "STH129",
    "nombre": "Teorías Humanistas",
    "nombre_norm": "teorias humanistas",
    "periodo": "",
    "definicion": {
      "sigla": "STH129",
      "creditos": 2,
      "evals": [
        [
          "Certamen",
          49
        ],
        [
          "Trabajo",
          21
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD STH129 (Psicología, bimestral). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "STS210",
    "nombre": "Teorías Sistémicas",
    "nombre_norm": "teorias sistemicas",
    "periodo": "",
    "definicion": {
      "sigla": "STS210",
      "creditos": 3,
      "evals": [
        [
          "Certamen 1",
          24.5
        ],
        [
          "Certamen 2",
          24.5
        ],
        [
          "Controles de lectura",
          7,
          {
            "slots": 4,
            "slotLabel": "Control de lectura"
          }
        ],
        [
          "Análisis de caso",
          14
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD STS210 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SHI214",
    "nombre": "Habilidades Profesionales Interpersonales",
    "nombre_norm": "habilidades profesionales interpersonales",
    "periodo": "",
    "definicion": {
      "sigla": "SHI214",
      "creditos": 3,
      "evals": [
        [
          "Certámenes",
          42,
          {
            "slots": 2,
            "slotLabel": "Certamen"
          }
        ],
        [
          "Trabajos prácticos en taller",
          21,
          {
            "lista": true
          }
        ],
        [
          "Autoevaluación",
          7
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SHI214 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SCA312",
    "nombre": "Psicología Educacional en Contextos Actuales",
    "nombre_norm": "psicologia educacional en contextos actuales",
    "periodo": "",
    "definicion": {
      "sigla": "SCA312",
      "creditos": 5,
      "evals": [
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          21
        ],
        [
          "Trabajo grupal",
          10.5
        ],
        [
          "Controles de lectura",
          7,
          {
            "lista": true
          }
        ],
        [
          "Ejercicios de aplicación",
          10.5,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SCA312 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "STC324",
    "nombre": "Técnicas Cualitativas de Investigación en Psicología",
    "nombre_norm": "tecnicas cualitativas de investigacion en psicologia",
    "periodo": "",
    "definicion": {
      "sigla": "STC324",
      "creditos": 5,
      "evals": [
        [
          "Certámenes",
          38.5,
          {
            "slots": 2,
            "slotLabel": "Certamen"
          }
        ],
        [
          "Ejercicios y controles de lectura",
          10.5,
          {
            "lista": true
          }
        ],
        [
          "Proyecto de investigación",
          21
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD STC324 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SDN321",
    "nombre": "Diagnóstico Neuropsicológico",
    "nombre_norm": "diagnostico neuropsicologico",
    "periodo": "",
    "definicion": {
      "sigla": "SDN321",
      "creditos": 5,
      "evals": [
        [
          "Certamen o avance 1",
          17.5
        ],
        [
          "Certamen o avance 2",
          17.5
        ],
        [
          "Informe",
          21
        ],
        [
          "Controles de lectura y ejercicios",
          14,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SDN321 (Psicología). Revisa que corresponda a tu curso",
        "Los certámenes pueden ser entregas de avance de la evaluación; el examen es la entrega final del informe",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SDA423",
    "nombre": "Diagnóstico Psicológico en la Adultez",
    "nombre_norm": "diagnostico psicologico en la adultez",
    "periodo": "",
    "definicion": {
      "sigla": "SDA423",
      "creditos": 5,
      "evals": [
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          24.5
        ],
        [
          "Ejercicios de entrevista e instrumentos",
          10.5,
          {
            "lista": true
          }
        ],
        [
          "Controles bibliográficos",
          14,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SDA423 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SPP425",
    "nombre": "Políticas Públicas y Problemáticas en Contextos Psicosociales",
    "nombre_norm": "politicas publicas y problematicas en contextos psicosociales",
    "periodo": "",
    "definicion": {
      "sigla": "SPP425",
      "creditos": 5,
      "evals": [
        [
          "Certamen 1",
          17.5
        ],
        [
          "Certamen 2",
          17.5
        ],
        [
          "Trabajo grupal",
          21
        ],
        [
          "Evaluación de proceso",
          14
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SPP425 (Psicología). Revisa que corresponda a tu curso",
        "Uno de los certámenes es la entrega de avance del trabajo de investigación",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SGE424",
    "nombre": "Gestión del Cambio en la Institución Educativa",
    "nombre_norm": "gestion del cambio en la institucion educativa",
    "periodo": "",
    "definicion": {
      "sigla": "SGE424",
      "creditos": 5,
      "evals": [
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          21
        ],
        [
          "Trabajo grupal",
          10.5
        ],
        [
          "Controles de lectura",
          7,
          {
            "lista": true
          }
        ],
        [
          "Ejercicios de aplicación",
          10.5,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SGE424 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "SGO426",
    "nombre": "Gestión e Intervención en Organizaciones",
    "nombre_norm": "gestion e intervencion en organizaciones",
    "periodo": "",
    "definicion": {
      "sigla": "SGO426",
      "creditos": 5,
      "evals": [
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          21
        ],
        [
          "Trabajo grupal",
          10.5
        ],
        [
          "Ayudantía y controles de lectura",
          7,
          {
            "lista": true
          }
        ],
        [
          "Análisis de casos",
          10.5,
          {
            "lista": true
          }
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD SGO426 (Psicología). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "AAM113",
    "nombre": "Componentes de la Matemática",
    "nombre_norm": "componentes de la matematica",
    "periodo": "",
    "definicion": {
      "sigla": "AAM113",
      "evals": [
        [
          "Ejercicios, controles y tareas",
          21,
          {
            "lista": true
          }
        ],
        [
          "Participación en ayudantía",
          7
        ],
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          21
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD AAM113 (Arquitectura). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)",
        "La asistencia es obligatoria según la Dirección de Carrera: sin ella no rindes examen y la final es 1,0 (Reglamento Académico, art. 45)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "AAH215",
    "nombre": "Arquitectura Moderna Siglo XX",
    "nombre_norm": "arquitectura moderna siglo xx",
    "periodo": "",
    "definicion": {
      "sigla": "AAH215",
      "evals": [
        [
          "Tareas y entregas de lecturas",
          28,
          {
            "lista": true
          }
        ],
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          21
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD AAH215 (Arquitectura). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)",
        "La asistencia es obligatoria según la Dirección de Carrera: sin ella no rindes examen y la final es 1,0 (Reglamento Académico, art. 45)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "AAS323",
    "nombre": "Sustentabilidad",
    "nombre_norm": "sustentabilidad",
    "periodo": "",
    "definicion": {
      "sigla": "AAS323",
      "evals": [
        [
          "Trabajos y tareas",
          28,
          {
            "lista": true
          }
        ],
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          21
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD AAS323 (Arquitectura). Revisa que corresponda a tu curso",
        "Los dos certámenes son la entrega consolidada del trabajo de investigación",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)",
        "La asistencia es obligatoria según la Dirección de Carrera: sin ella no rindes examen y la final es 1,0 (Reglamento Académico, art. 45)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "ATE322",
    "nombre": "Diseño y Laboratorio Estructural: Sismoresistencia",
    "nombre_norm": "diseno y laboratorio estructural: sismoresistencia",
    "periodo": "",
    "definicion": {
      "sigla": "ATE322",
      "evals": [
        [
          "Ejercicios individuales",
          14,
          {
            "lista": true
          }
        ],
        [
          "Trabajo grupal",
          14
        ],
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          21
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD ATE322 (Arquitectura). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)",
        "La asistencia es obligatoria según la Dirección de Carrera: sin ella no rindes examen y la final es 1,0 (Reglamento Académico, art. 45)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "AAI412",
    "nombre": "Instalaciones Constructivas",
    "nombre_norm": "instalaciones constructivas",
    "periodo": "",
    "definicion": {
      "sigla": "AAI412",
      "evals": [
        [
          "Trabajos",
          28,
          {
            "lista": true
          }
        ],
        [
          "Certamen 1",
          21
        ],
        [
          "Certamen 2",
          21
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD AAI412 (Arquitectura). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)",
        "La asistencia es obligatoria según la Dirección de Carrera: sin ella no rindes examen y la final es 1,0 (Reglamento Académico, art. 45)"
      ]
    }
  },
  {
    "tenant": "udd",
    "clave": "AAA426",
    "nombre": "Apreciación, Evaluación y Crítica Arquitectónica",
    "nombre_norm": "apreciacion, evaluacion y critica arquitectonica",
    "periodo": "",
    "definicion": {
      "sigla": "AAA426",
      "evals": [
        [
          "Ensayos y/o trabajos",
          21,
          {
            "lista": true
          }
        ],
        [
          "Certamen 1",
          24.5
        ],
        [
          "Certamen 2",
          24.5
        ],
        [
          "Examen",
          30
        ]
      ],
      "grupos": [
        {
          "nombre": "Examen",
          "evals": [
            "Examen"
          ],
          "min": 3,
          "cap": "self"
        }
      ],
      "reglasDelCurso": [
        "Programa UDD AAA426 (Arquitectura). Revisa que corresponda a tu curso",
        "El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)",
        "La asistencia es obligatoria según la Dirección de Carrera: sin ella no rindes examen y la final es 1,0 (Reglamento Académico, art. 45)"
      ]
    }
  }
]'::jsonb) as x(tenant text,clave text,periodo text,nombre text,nombre_norm text,definicion jsonb) on conflict(tenant,clave,periodo) do update set nombre=excluded.nombre,nombre_norm=excluded.nombre_norm,definicion=excluded.definicion;
create or replace function public.submit_catalog_report_periodo(
  p_tenant text,
  p_carrera text,
  p_ramo text,
  p_ramo_norm text,
  p_ramo_sigla text,
  p_estructura jsonb,
  p_huella text,
  p_nota text default null,
  p_seccion integer default null,
  p_periodo text default null,
  p_origen text default 'automatico'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  total numeric;
  sigla text := nullif(upper(trim(p_ramo_sigla)), '');
  tenant_guardado text;
  onboarding_guardado boolean;
  periodo_reporte text := coalesce(p_periodo,public.periodo_catalogo(now()));
begin
  if uid is null then
    raise exception 'No hay sesión activa';
  end if;

  if coalesce(trim(p_tenant), '') = ''
     or coalesce(trim(p_ramo), '') = ''
     or coalesce(trim(p_ramo_norm), '') = ''
     or coalesce(trim(p_huella), '') = '' then
    raise exception 'Faltan datos del reporte';
  end if;

  -- La interfaz trae maxlength, pero cualquiera puede llamar la RPC directo.
  -- Estos límites son la frontera real contra spam y payloads desproporcionados.
  if length(p_tenant) > 20
     or length(coalesce(p_carrera, '')) > 80
     or length(p_ramo) > 160
     or length(p_ramo_norm) > 160
     or length(coalesce(p_ramo_sigla, '')) > 40
     or length(p_huella) > 4000
     or length(coalesce(p_nota, '')) > 500 then
    raise exception 'El reporte excede el largo permitido';
  end if;

  -- El navegador puede estar en una pestaña vieja o tener una universidad por
  -- defecto mientras termina el onboarding. El tenant enviado no autoriza su
  -- propio reporte: se contrasta con el estado académico ya sincronizado.
  -- Si la nube aún no tiene el onboarding, el aporte queda pendiente en la app
  -- y se puede reintentar tras sincronizar; nunca se cuenta como FEN por defecto.
  select u.data->>'tenant', u.data->>'onboardingDone' = 'true'
    into tenant_guardado, onboarding_guardado
    from public.user_ramos as u
   where u.user_id = uid;
  if not coalesce(onboarding_guardado, false)
     or tenant_guardado is distinct from p_tenant then
    raise exception 'La universidad del reporte no coincide con la cuenta sincronizada';
  end if;

  if periodo_reporte !~ '^[0-9]{4}-[12v]$' or p_origen not in ('automatico','explicito') or p_origen is null then
    raise exception 'Período u origen inválido';
  end if;
  if p_seccion is not null and p_seccion not between 1 and 999 then
    raise exception 'La sección debe estar entre 1 y 999';
  end if;

  if jsonb_typeof(p_estructura) <> 'array'
     or jsonb_array_length(p_estructura) not between 2 and 30
     or octet_length(p_estructura::text) > 32768 then
    raise exception 'La estructura debe tener entre 2 y 30 evaluaciones y un tamaño razonable';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_estructura) as e(valor)
    where jsonb_typeof(e.valor) is distinct from 'object'
       or jsonb_typeof(e.valor->'nombre') is distinct from 'string'
       or length(trim(e.valor->>'nombre')) not between 1 and 120
       or jsonb_typeof(e.valor->'peso') is distinct from 'number'
       or case when jsonb_typeof(e.valor->'peso') = 'number'
          then ((e.valor->>'peso')::numeric <= 0 or (e.valor->>'peso')::numeric > 100) else false end
       or (e.valor ? 'slots' and (
         jsonb_typeof(e.valor->'slots') <> 'number'
         or case when jsonb_typeof(e.valor->'slots') = 'number'
            then (e.valor->>'slots')::numeric <> trunc((e.valor->>'slots')::numeric)
              or (e.valor->>'slots')::numeric not between 1 and 100
            else false end
       ))
       or (e.valor ? 'min' and (
         jsonb_typeof(e.valor->'min') <> 'number'
         or case when jsonb_typeof(e.valor->'min') = 'number'
            then (e.valor->>'min')::numeric not between 1 and 7 else false end
       ))
       or (e.valor ? 'cap' and (
         jsonb_typeof(e.valor->'cap') <> 'number'
         or case when jsonb_typeof(e.valor->'cap') = 'number'
            then (e.valor->>'cap')::numeric not between 1 and 7 else false end
       ))
  ) then
    raise exception 'La estructura contiene una evaluación inválida';
  end if;

  select coalesce(sum((e.valor->>'peso')::numeric), 0)
    into total
    from jsonb_array_elements(p_estructura) as e(valor);

  if abs(total - 100) >= 0.05 then
    raise exception 'Las ponderaciones deben sumar 100%%';
  end if;

  -- Un nombre no es una sigla (ver es_sigla_uc más arriba).
  if p_tenant = 'uc' and not public.es_sigla_uc(sigla) then
    sigla := public.sigla_catalogo_uc(p_ramo);
  end if;

  -- Si el estudiante ya reportó ese ramo, actualiza su aporte sin reescribir
  -- la carrera histórica. Un reporte nuevo guarda null; p_carrera se conserva
  -- en la firma para apps viejas y no decide la identidad de la pauta.
  -- También toma reportes antiguos sin sigla por nombre, para migrarlos al
  -- identificador canónico la próxima vez que su autor los actualice.
  if p_origen='automatico' and exists(select 1 from public.catalog_reports cr where cr.user_id=uid and cr.tenant=p_tenant and cr.periodo=periodo_reporte and cr.origen='explicito' and (cr.ramo_sigla=sigla or cr.ramo_norm=p_ramo_norm)) then return; end if;
  update public.catalog_reports
     set ramo = p_ramo,
         ramo_norm = p_ramo_norm,
         ramo_sigla = sigla,
         estructura = p_estructura,
         huella = public.huella_catalogo(p_estructura),
         nota = nullif(trim(p_nota), ''),
         -- Una app vieja no manda sección: no borra la que ya estaba.
         seccion = coalesce(p_seccion, seccion),
         origen = case when origen='explicito' then 'explicito' else p_origen end,
         updated_at = now()
   where user_id = uid
     and tenant = p_tenant
     and periodo = periodo_reporte
     and (
       (sigla is not null and ramo_sigla = sigla)
       or (ramo_sigla is null and ramo_norm = p_ramo_norm)
       -- Su reporte viejo con el nombre como sigla se corrige, no se duplica.
       or (ramo_norm = p_ramo_norm and not public.es_sigla_uc(ramo_sigla))
     );

  if not found then
    insert into public.catalog_reports
      (user_id, tenant, carrera, ramo, ramo_norm, ramo_sigla, estructura, huella, nota, seccion, periodo, origen)
    values
      (uid, p_tenant, null, p_ramo, p_ramo_norm, sigla,
       p_estructura, public.huella_catalogo(p_estructura), nullif(trim(p_nota), ''), p_seccion, periodo_reporte, p_origen);
  end if;
end;
$$;

create or replace function public.submit_catalog_report(p_tenant text,p_carrera text,p_ramo text,p_ramo_norm text,p_ramo_sigla text,p_estructura jsonb,p_huella text,p_nota text default null,p_seccion integer default null)
returns void language sql security definer set search_path=public as $$
 select public.submit_catalog_report_periodo(p_tenant,p_carrera,p_ramo,p_ramo_norm,p_ramo_sigla,p_estructura,p_huella,p_nota,p_seccion,null,'automatico');
$$;
create or replace function public.catalog_consensus_periodo(p_tenant text,p_periodo text,p_seccion integer default null)
returns table(ramo text,ramo_key text,estructura jsonb,huella text,respaldos integer,periodo text,seccion integer)
language sql stable security definer set search_path=public as $$
 with vigentes as (
 select distinct on(cr.user_id,coalesce(nullif(cr.ramo_sigla,''),cr.ramo_norm)) cr.*,
 coalesce(nullif(cr.ramo_sigla,''),cr.ramo_norm) as clave
 from public.catalog_reports cr join public.user_ramos u on u.user_id=cr.user_id
 where cr.tenant=p_tenant and cr.periodo=p_periodo
 and u.data->>'onboardingDone'='true' and u.data->>'tenant'=cr.tenant
 and (cr.origen='explicito' or (jsonb_array_length(cr.estructura)>=2 and not exists(select 1 from jsonb_array_elements(cr.estructura) e where nullif(trim(e->>'nombre'),'') is null or coalesce((e->>'peso')::numeric,0)<=0)))
 and (cr.origen='explicito' or not exists(select 1 from public.pautas_catalogo_registro p where p.tenant=cr.tenant and (p.clave=cr.ramo_sigla or p.nombre_norm=cr.ramo_norm) and p.periodo in ('',cr.periodo)))
 and (p_seccion is null or cr.seccion is null or cr.seccion=p_seccion)
 order by cr.user_id,coalesce(nullif(cr.ramo_sigla,''),cr.ramo_norm),cr.updated_at desc,cr.id desc
 ), ambiguos as (
 select clave from vigentes where seccion is not null group by clave having count(distinct seccion)>1 and count(distinct huella)>1
 ), totales as (select clave,count(distinct user_id) n from vigentes group by clave),
 grupos as(select clave,huella,min(ramo) ramo,count(distinct user_id)::int n from vigentes group by clave,huella)
 select g.ramo,g.clave,
 (select v.estructura from vigentes v where v.clave=g.clave and v.huella=g.huella group by v.estructura order by count(*) desc,max(v.updated_at) desc,v.estructura::text limit 1),
 g.huella,g.n,p_periodo,p_seccion
 from grupos g join totales t using(clave)
 where g.n>=3 and g.n::numeric/t.n>=0.60
 and (p_seccion is not null or not exists(select 1 from ambiguos a where a.clave=g.clave))
 order by g.n desc,g.clave;
$$;
create or replace function public.catalog_consensus(p_tenant text)
returns table(ramo text,ramo_key text,estructura jsonb,huella text,respaldos integer)
language sql stable security definer set search_path=public as $$
 select ramo,ramo_key,estructura,huella,respaldos from public.catalog_consensus_periodo(p_tenant,public.periodo_catalogo(now()),null);
$$;
revoke all on function public.submit_catalog_report_periodo(text,text,text,text,text,jsonb,text,text,integer,text,text) from public,anon;
grant execute on function public.submit_catalog_report_periodo(text,text,text,text,text,jsonb,text,text,integer,text,text) to authenticated;
revoke all on function public.catalog_consensus_periodo(text,text,integer) from public,anon;
grant execute on function public.catalog_consensus_periodo(text,text,integer) to authenticated;
revoke all on function public.submit_catalog_report(text,text,text,text,text,jsonb,text,text,integer) from public,anon;
grant execute on function public.submit_catalog_report(text,text,text,text,text,jsonb,text,text,integer) to authenticated;
revoke all on function public.catalog_consensus(text) from public,anon;
grant execute on function public.catalog_consensus(text) to authenticated;
commit;
