const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {generarOFG}=require('../bin/generar-uc-ofg');
const memoria=new Map(),eventos=[];let bloqueado=false,guardados=0,repintados=0;
function elemento(){return {style:{setProperty(){}},classList:{add(){},remove(){},contains(){return false}},innerHTML:'',value:'',attrs:{},listeners:{},isConnected:true,
 setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},getAttribute(k){return this.attrs[k]},addEventListener(k,v){this.listeners[k]=v},querySelector(){return null},querySelectorAll(){return[]},appendChild(){},replaceWith(n){this.reemplazo=n},focus(){this.enfocado=true},select(){}};}
const nodos=new Map(),doc={getElementById(id){if(!nodos.has(id))nodos.set(id,elemento());return nodos.get(id)},createElement:elemento,querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},documentElement:elemento(),body:elemento()};
const ctx={console,setTimeout,clearTimeout,document:doc,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},navigator:{},location:{origin:'',pathname:'/',hash:''},localStorage:{getItem(k){if(bloqueado)throw Error('sin lectura');return memoria.get(k)||null},setItem(k,v){if(bloqueado)throw Error('sin escritura');memoria.set(k,String(v))},removeItem(k){memoria.delete(k)}}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','render-main.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),plano=s=>JSON.parse(run('JSON.stringify('+s+')'));
ctx.__track=(...args)=>eventos.push(args);ctx.__save=()=>guardados++;ctx.__render=()=>repintados++;
run("var currentUser={id:'cuenta-sintetica'},supabaseClient=null;track=__track;save=__save;renderRamo=__render;showToast=()=>{};openModal=()=>{};pintarProfesorEditarRamo=()=>{};");
const propio=(sigla='TTF010')=>({id:'ofg',nombre:'Ramo sintético',sigla,creditos:10,gates:[],categorias:[{id:'p',nombre:'Prueba',peso:100,directNota:true,notas:[]}]});
function cargar(r=propio()){ctx.__r=r;run("S=normalize({tenant:'uc',tipoCuenta:'estudiante',onboardingDone:true,ramos:[__r]});currentRamoId=S.ramos[0].id;var r=S.ramos[0];");}
cargar();assert.equal(run('esOFG(r)'),true);assert.equal(run('tieneAvisoAsistencia(r)'),true);
assert.equal(run("esOFG({...r,sigla:'MAT1620',nombre:'Ramo de malla sintético'})"),false);
assert.equal(run("esOFG({...r,sigla:null,nombre:'Sin sigla sintético'})"),false);
run("S.tenant='uai'");assert.equal(run('esOFG(r)'),false);run("S.tenant='uc'");
run("PRESETS_UC['Pauta asistencia sintética']={asistenciaMinima:true,evals:[['Prueba',100]]};PRESETS_UC['Pauta sin asistencia sintética']={evals:[['Prueba',100]]};");
assert.equal(run("tieneAvisoAsistencia({...r,nombre:'Pauta asistencia sintética',sigla:'SYN100',origen:{tenant:'uc',carrera:'ING-PC'}})"),true);
assert.equal(run("tieneAvisoAsistencia({...r,nombre:'Pauta sin asistencia sintética',sigla:'SYN100',origen:{tenant:'uc',carrera:'ING-PC'}})"),false);
assert.equal(run("tieneAvisoAsistencia({...r,nombre:'Pauta asistencia sintética',sigla:null,origen:null})"),false,'manual no hereda una regla por nombre');
const antes=run('JSON.stringify(S)');
run('openRamo(r.id)');assert.equal(run('mostrarAvisoAsistencia(r)'),true);
run('renderRamo();renderRamo();renderRamo()');assert.equal(run('leerAvisoAsistencia(r).aperturas'),1);
run('openRamo(r.id)');assert.equal(run('mostrarAvisoAsistencia(r)'),true);assert.equal(run('leerAvisoAsistencia(r).aperturas'),2);
run('openRamo(r.id)');assert.equal(run('mostrarAvisoAsistencia(r)'),false);
assert.equal(run('JSON.stringify(S)'),antes);assert.equal(guardados,0);assert(!memoria.has('gradehub_v1'));
run("currentUser={id:'otra-cuenta'};openRamo(r.id)");assert.equal(run('mostrarAvisoAsistencia(r)'),true,'frecuencia separada por cuenta');
run('cerrarAvisoAsistencia();openRamo(r.id)');assert.equal(run('mostrarAvisoAsistencia(r)'),false);
run("currentUser={id:'tercera-cuenta'};openRamo(r.id);activarFaltasDesdeAviso();openRamo(r.id)");
assert.deepEqual(plano('r.faltas'),{activo:true,cantidad:0,limite:null});assert.equal(run('mostrarAvisoAsistencia(r)'),false);assert.equal(guardados,1);
assert(eventos.filter(x=>x[0].startsWith('aviso_ofg_')).every(x=>x.length===1),'analítica sin datos del ramo');
assert(eventos.some(x=>x[0]==='aviso_ofg_activar')&&eventos.some(x=>x[0]==='aviso_ofg_cerrar'));
// El mismo límite que lee Editar ramo, sin inferirlo de porcentajes.
let campo;doc.createElement=()=>campo=elemento();
const editar=()=>{ctx.__boton=elemento();run('editarLimiteFaltas(__boton)');return campo;};
let input=editar();input.value='8';input.listeners.keydown({key:'Enter',preventDefault(){}});assert.equal(run('r.faltas.limite'),8);
run('openEditRamoModal(r.id)');assert.match(doc.getElementById('modal-content').innerHTML,/id="m-ramo-faltas-limite" value="8"/);
input=editar();input.value='';input.listeners.blur();assert.equal(run('r.faltas.limite'),null);
const sinCambio=guardados;input=editar();input.value='1.5';input.listeners.blur();assert.equal(input.attrs['aria-invalid'],'true');assert.equal(guardados,sinCambio);assert.equal(run('r.faltas.limite'),null);
input=editar();input.value='9';input.listeners.keydown({key:'Escape',preventDefault(){}});input.listeners.blur();assert.equal(run('r.faltas.limite'),null);assert.equal(input.reemplazo,ctx.__boton);
// Cuenta de profesor, ramo cerrado, contador activo y almacenamiento bloqueado.
for(const cambio of ["S.tipoCuenta='profesor'","r.cierre={tenant:'uc'}","r.faltas=copiarFaltas({activo:true})"]){
 cargar();run("currentUser={id:'no-aviso-"+cambio.length+"'}");run(cambio);run('openRamo(r.id)');assert.equal(run('mostrarAvisoAsistencia(r)'),false);
}
cargar();run("currentUser={id:'sin-almacenamiento'}");bloqueado=true;assert.doesNotThrow(()=>run('openRamo(r.id)'));assert.equal(run('mostrarAvisoAsistencia(r)'),false);bloqueado=false;
const fuente={version:1,fuente:'https://buscacursos.uc.cl',fecha:'2026-11-04T12:00:00Z',periodos:[{periodo:'2026-2',secciones:[{sigla:'SYN200',area_fg:null},{sigla:'SYN100',area_fg:'Humanidades'},{sigla:'SYN100',area_fg:'Humanidades'},{sigla:'SYN100',area_fg:'Artes'}]}]};
const generado=generarOFG(fuente,'2026-2');assert.match(generado,/"SYN100":\["Artes","Humanidades"\]/);assert(!generado.includes('SYN200'));
assert.throws(()=>generarOFG({...fuente,periodos:[{periodo:'2026-2',secciones:[{sigla:'SYN100'}]}]},'2026-2'),/Área de FG/);
assert.throws(()=>generarOFG(fuente,'2027-1'),/período/);
console.log('OK: OFG oficial, preset sin inferencias, dos aperturas por cuenta, descarte, activar, máximo inline, profesor/cierre/almacenamiento y generación reproducible');
