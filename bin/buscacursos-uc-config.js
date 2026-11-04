// El diario es a las 06:17 UTC: 03:17 verano / 02:17 invierno en Santiago.
// Lucas debe confirmar estos MESES PROVISIONALES, no son fechas oficiales.
// Al cambiarlos, actualizar también el campo mes del cron horario del workflow;
// GitHub no admite leer JS en schedule y el test comprueba que coincidan.
module.exports={horaDiariaUTC:6,mesesTomaUTC:[1,3,7,8,12],ventanasToma:[
 // Fechas de Chile, inclusivas. Lucas completa las ventanas oficiales.
 // {desde:'2027-MM-DD',hasta:'2027-MM-DD'}, // Toma 2027-1: pendiente confirmar.
]};
