// Importar un calendario no puede convertirse en "adivinar y cambiar cosas".
//
// El archivo llega de fuera, por lo que primero se valida como texto; después se
// propone una asociación por prefijo y ramo, y solo al confirmar se toca el
// estado. Estas fixtures son sintéticas: no contienen calendarios ni nombres de
// estudiantes reales.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js','engine.js','app.js','render-agenda.js']
  .map(f => fs.readFileSync(raiz + f, 'utf8')).join('\n');

const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '/', search: '', hash: '' }, history: { replaceState() {} }, setTimeout, clearTimeout, console,
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val = n => vm.runInContext(n,ctx);

let ok=0,fail=0;
const chk=(n,cond)=>{if(cond){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const falla=(fn)=>{try{fn();return false;}catch(e){return true;}};

const ics = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'SUMMARY:I1 Cálculo II',
  'DTSTART;VALUE=DATE:20260908',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:C2 Cálculo II',
  'DTSTART:20260915T090000',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:I3 Cálculo II',
  'DTSTART;VALUE=DATE:20260922',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:C3 Cálculo II',
  'DTSTART;VALUE=DATE:20260924',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:EX Física I',
  'DTSTART;VALUE=DATE:20260930',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

val('S='+JSON.stringify({ramos:[{
  id:'r-calculo',nombre:'Cálculo II',categorias:[
    {id:'cat-i1',nombre:'Interrogación 1',peso:30,fecha:null,notas:[]},
    {id:'cat-casos',nombre:'Casos',peso:30,fecha:'2026-10-01',notas:[{id:'nota-c2',nombre:'Control 2',valor:null,peso:1,fecha:null}]},
    {id:'cat-i3',nombre:'Interrogación 3',peso:40,fecha:null,fechaQuitada:true,notas:[]},
    {id:'cat-quitada-nota',nombre:'Taller',peso:0,fecha:'2026-10-02',notas:[{id:'nota-c3',nombre:'Control 3',valor:null,peso:1,fecha:null,fechaQuitada:true}]},
  ]
}]}));

const preparar=val('prepararImportacionIcs');
const aplicar=val('aplicarPropuestasIcs');
const parsear=val('parseIcsCalendario');
const draft=preparar(ics);

console.log('\n=== El archivo se lee como calendario, no como texto confiable ===');
chk('parsea cinco eventos sintéticos', draft.length===5);
chk('rechaza un archivo basura antes de tocar el estado', falla(()=>parsear('esto no es un calendario')));
chk('rechaza eventos sin fecha', falla(()=>parsear('BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:I1 Cálculo II\nEND:VEVENT\nEND:VCALENDAR')));
const muchos=['BEGIN:VCALENDAR'];
for(let i=0;i<251;i++)muchos.push('BEGIN:VEVENT','SUMMARY:I1 Cálculo II','DTSTART:20260908','END:VEVENT');
muchos.push('END:VCALENDAR');
chk('limita la cantidad de eventos', falla(()=>parsear(muchos.join('\n'))));

console.log('\n=== El prefijo y el ramo proponen, no inventan ===');
chk('I1 Cálculo II encuentra Interrogación 1', draft[0].target==='r-calculo|cat-i1|');
chk('C2 Cálculo II encuentra una nota con fecha propia', draft[1].target==='r-calculo|cat-casos|nota-c2');
chk('una fecha quitada a propósito no se vuelve a ofrecer', draft[2].target===null);
chk('una fecha propia quitada tampoco se vuelve a ofrecer', draft[3].target===null);
chk('un ramo que no calza queda sin asignar', draft[4].target===null);

console.log('\n=== Solo lo elegido llega al estado ===');
const aplicadas=aplicar(draft);
chk('aplica solo las dos coincidencias revisables', aplicadas===2);
chk('la categoría recibe su fecha', val('S.ramos[0].categorias[0].fecha')==='2026-09-08');
chk('la nota recibe su fecha propia', val('S.ramos[0].categorias[1].notas[0].fecha')==='2026-09-15');
chk('la fecha quitada sigue ausente', val('S.ramos[0].categorias[2].fecha')===null&&val('S.ramos[0].categorias[2].fechaQuitada')===true);
chk('lo que no calza no se aplica solo', val('S.ramos[0].categorias[3].notas[0].fecha')===null);

const antes=val('JSON.stringify(S)');
chk('ni un destino forzado puede saltarse fechaQuitada',
  falla(()=>aplicar([{titulo:'I3 Cálculo II',fecha:'2026-09-22',target:'r-calculo|cat-i3|'}]))&&val('JSON.stringify(S)')===antes);

console.log('\n=== Webcursos UAI (Moodle) ===');
// Sintético, con la forma de calendar/export_execute.php de Moodle 4.5: horas en
// UTC, el curso en CATEGORIES y el título sin el nombre del ramo.
const evento=(titulo,inicio,curso)=>['BEGIN:VEVENT','SUMMARY:'+titulo,'DESCRIPTION:Texto largo\\, con','\t coma','CLASS:PUBLIC','DTSTART:'+inicio,'DTEND:'+inicio,...(curso?['CATEGORIES:'+curso]:[]),'END:VEVENT'];
const archivo=(prodid,...eventos)=>['BEGIN:VCALENDAR','METHOD:PUBLISH','PRODID:'+prodid,'VERSION:2.0',...eventos.flat(),'END:VCALENDAR',''].join('\r\n');
const MOODLE='-//Moodle Pty Ltd//NONSGML Moodle Version 2024100716//EN';
const moodle=archivo(MOODLE,
  evento('Vencimiento de Control 1','20261202T025900Z','CURSO\\, A-1'),
  evento('Vencimiento de Control 2','20261203T180000Z','CURSO\\, A-1'),
  evento('Vencimiento de Ensayo','20260601T035900Z','CURSO B-2'),
  evento('Feriado','20261208T030000Z'));
val('S='+JSON.stringify({tenant:'uai',ramos:[
  {id:'a',nombre:'Ramo A',categorias:[{id:'c1',nombre:'Control 1',peso:50,fecha:null,notas:[]},{id:'c2',nombre:'Control 2',peso:50,fecha:null,notas:[]}]},
  {id:'b',nombre:'Ramo B',categorias:[{id:'e',nombre:'Ensayo',peso:100,fecha:'2026-06-02',notas:[]}]}]}));
ctx.__moodle=moodle;val('icsImportDraft=prepararImportacionIcs(__moodle)');
const fila=i=>val('icsImportDraft['+i+']');
chk('las 23:59 de Chile en verano quedan en su día', fila(0).fecha==='2026-12-01');
chk('las 23:59 de Chile en invierno también', fila(2).fecha==='2026-05-31');
chk('una hora lejos de la medianoche no se mueve', fila(1).fecha==='2026-12-03');
chk('lee el curso y lo desescapa', fila(0).curso==='CURSO, A-1'&&fila(2).curso==='CURSO B-2');
chk('un evento sin curso no inventa uno', !('curso' in fila(3)));
chk('el título solo no asigna ramo', [0,1,2,3].every(i=>fila(i).ramoId===null&&fila(i).target===null));
val("asignarRamoIcs(0,'a')");
chk('elegir el ramo vale para los otros eventos del curso', fila(1).ramoId==='a'&&fila(1).target===null);
chk('y no para los de otro curso ni los que no traen', fila(2).ramoId===null&&fila(3).ramoId===null);
val("asignarRamoIcs(1,'b')");
chk('cambiar uno después no arrastra al que ya tenía ramo', fila(0).ramoId==='a');
val("asignarRamoIcs(1,'')");
chk('quitar el ramo tampoco arrastra', fila(0).ramoId==='a'&&fila(1).ramoId===null);
chk('nada llega al estado sin elegir evaluación', val('aplicarPropuestasIcs(icsImportDraft)')===0&&val('S.ramos[0].categorias[0].fecha')===null);
val("asignarDestinoIcs(0,'a|c1|')");
chk('lo elegido guarda la fecha de Chile', val('aplicarPropuestasIcs(icsImportDraft)')===1&&val('S.ramos[0].categorias[0].fecha')==='2026-12-01');
chk('y una fecha que ya existía sigue igual', val('S.ramos[1].categorias[0].fecha')==='2026-06-02');
chk('la categoría de otro calendario no es un curso', !('curso' in parsear(archivo('-//Outlook//ES',evento('Reunión','20261202T120000Z','Personal')))[0]));
chk('un día inexistente en UTC se sigue rechazando', falla(()=>parsear(archivo(MOODLE,evento('X','20261399T025900Z')))));
chk('una fecha de día completo no se mueve', parsear(archivo(MOODLE,evento('X','20261202')))[0].fecha==='2026-12-02');

console.log('\n=== Los pasos salen donde hay portal ===');
const modal=t=>{val("S.tenant='"+t+"'");val('abrirImportarCalendario()');return stub.innerHTML;};
chk('la UAI ve cómo exportar desde Webcursos', /webc\.uai\.cl\/calendar\/export\.php" target="_blank" rel="noopener"/.test(modal('uai')));
chk('las demás no', ['uc','fen','uandes','udd'].every(t=>!/Webcursos|avance-pasos/.test(modal(t))));

console.log('\nPASS: '+ok+'   FAIL: '+fail);
process.exit(fail?1:0);
