

function buildICS(){
  const evs=agendaEvents();
  const stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const lines=[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GradeHub//Evaluaciones//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:GradeHub — Evaluaciones',
    'X-WR-TIMEZONE:America/Santiago',
  ];
  evs.forEach(e=>{
    // Una casilla con fecha propia ("Control 2" dentro de "Controles") es un
    // evento aparte: con el nombre y el peso de la casilla, y con UID propio.
    // Antes todas las casillas de una categoría salían con el mismo UID y el
    // mismo título, y el calendario se quedaba con una sola.
    const pesoEv=pesoEventoAgenda(e);
    const titulo=`${nombreEventoAgenda(e)} — ${e.ramo.nombre}`;
    // `pesoEventoAgenda` devuelve null cuando el porcentaje de UNA entrega no se
    // puede saber: el grupo descarta la más baja, o no dice cuántas son. Poner
    // ahí el peso del grupo afirma que ese control vale el 30% que se reparten
    // tres, que es un número falso en el calendario del estudiante. La Agenda no
    // lo hace —muestra "Peso variable"— y esto tampoco.
    const desc=(pesoEv==null
      ?`Parte de «${e.cat.nombre}», que vale ${r2(e.cat.peso||0)}% de ${e.ramo.nombre}.`
      :`Vale ${r2(pesoEv)}% de ${e.ramo.nombre}.`)+(e.pending?'':' Ya evaluada.');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.cat.id}-${e.ramo.id}${e.nota?'-'+e.nota.id:''}@gradehub.app`);
    lines.push(`DTSTAMP:${stamp}`);
    // Con hora, el evento deja de ser de día completo. Se emite como hora
    // LOCAL FLOTANTE —sin Z y sin TZID—, que el RFC define como "la hora del
    // reloj de quien lo mira". Es lo correcto acá y además esquiva el problema
    // que hacía temer este cambio: Chile mueve el reloj en septiembre, así que
    // convertir a UTC obliga a saber el huso vigente EN LA FECHA DE LA PRUEBA, y
    // equivocarse corre la evaluación una hora. Flotante no se calcula: las
    // 14:00 son las 14:00.
    //
    // La hora de término no está en ningún dato: nadie dice cuánto dura una
    // prueba. Se usa una hora como convención visible, no como afirmación.
    if(e.hora){
      lines.push(`DTSTART:${icsDateTime(e.fecha,e.hora)}`);
      // La hora convencional de duración cruza de día si parte a las 23:xx.
      const fin=e.hora.startsWith('23')?icsDatePlus1(e.fecha):e.fecha;
      lines.push(`DTEND:${icsDateTime(fin,sumaUnaHora(e.hora))}`);
    }else{
      lines.push(`DTSTART;VALUE=DATE:${icsDate(e.fecha)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDatePlus1(e.fecha)}`);
    }
    lines.push(icsFold(`SUMMARY:${icsEscape(titulo)}`));
    lines.push(icsFold(`DESCRIPTION:${icsEscape(desc)}`));
    lines.push('TRANSP:TRANSPARENT');
    // Recordatorio el día anterior a las 9:00 (solo para pendientes). Sin hora,
    // el evento parte a las 00:00: 15 horas antes son las 9:00 del día anterior.
    // -P1DT9H eran 33 horas: dos días antes a las 15:00, diciendo "Mañana".
    if(e.pending){
      lines.push('BEGIN:VALARM');
      lines.push(e.hora?'TRIGGER:-P1D':'TRIGGER:-PT15H');
      lines.push('ACTION:DISPLAY');
      lines.push(icsFold(`DESCRIPTION:${icsEscape('Mañana: '+titulo)}`));
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
