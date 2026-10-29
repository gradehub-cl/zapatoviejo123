

// ─── EXPORTAR AL CALENDARIO (.ics) ───────────────────────────────────────────
// Genera un archivo .ics estándar con todas las evaluaciones que tienen fecha.
// Funciona con Apple Calendar, Google Calendar, Outlook — cualquiera.
// Sin API, sin auth, sin backend: se arma en el navegador.

function icsEscape(s){
  return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
}
// RFC 5545: hasta 75 octetos UTF-8, incluido el espacio de continuación.
// Recorrer puntos de código evita partir un emoji al serializar el archivo.
function icsFold(line){
  const out=[];let actual='',largo=0;
  for(const ch of line){
    const cp=ch.codePointAt(0),bytes=cp<0x80?1:cp<0x800?2:cp<0x10000?3:4;
    if(largo+bytes>75){out.push(actual);actual=' ';largo=1;}
    actual+=ch;largo+=bytes;
  }
  if(actual)out.push(actual);
  return out.join('\r\n');
}
function isoOf(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function icsDate(iso){return iso.replace(/-/g,'');}
// YYYYMMDDTHHMMSS, sin Z: hora local flotante (ver buildICS).
function icsDateTime(iso,hora){return `${icsDate(iso)}T${String(hora).replace(':','')}00`;}
function sumaUnaHora(hora){
  const [h,m]=String(hora).split(':').map(Number);
  return `${String((h+1)%24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function icsDatePlus1(iso){
  const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+1);
  return isoOf(d.getFullYear(),d.getMonth(),d.getDate()).replace(/-/g,'');
}
