// #744: convertir puntaje dentro de un ramo sin guardar los puntos de la prueba.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const elemento=(value='')=>({value,checked:false,disabled:false,style:{},dataset:{},textContent:'',innerHTML:'',
  setAttribute(){},removeAttribute(){},focus(){},dispatchEvent(){},addEventListener(){}});
const base=elemento();
base.classList={add(){},remove(){},contains(){return false}};
base.style.setProperty=()=>{};
base.appendChild=()=>{};base.querySelectorAll=()=>[];base.querySelector=()=>base;
const campos={
  'm-puntaje-obtenido':elemento('29,5'),'m-puntaje-total':elemento('50'),
  'm-puntaje-exigencia':elemento('60'),'m-puntaje-truncar':elemento(),
  'm-puntaje-mensaje':elemento(),'m-puntaje-guardar':elemento(),
  'm-puntaje-wrap':elemento(),'modal-content':elemento(),
};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>campos[id]||base,createElement:()=>base,addEventListener(){},
    documentElement:{style:base.style,setAttribute(){},removeAttribute(){}},querySelector:()=>base,querySelectorAll:()=>[],body:base},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},
  location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},
  setTimeout,clearTimeout,console,Event:class Event{},requestAnimationFrame(){},
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=code=>vm.runInContext(code,ctx);
let ok=0,fail=0;
const chk=(nombre,condicion)=>{console.log('  '+(condicion?'OK  ':'FAIL')+' '+nombre);if(condicion)ok++;else fail++;};
run('save=()=>{__guardados++};renderRamo=()=>{};renderAgenda=()=>{};closeModal=()=>{};openModal=()=>{};enfocarEnHoja=()=>{};showToast=()=>{};track=()=>{};vibrar=()=>{};animarPromedio=()=>{};cambioDePromedio=()=>false;lecturaDespuesDeNota=()=>"";');
ctx.__guardados=0;
run("S={tenant:'fen',ramos:[{id:'r1',nombre:'Ramo de prueba',categorias:[{id:'c1',nombre:'Prueba',peso:100,directNota:true,notas:[]}]}]};currentRamoId='r1';");

console.log('\n=== Evaluación directa ===');
chk('un ramo existente parte en 50% sin cambiar sus datos',run('exigenciaPuntajeRamo(S.ramos[0])')===50&&run("!('exigenciaPuntaje' in S.ramos[0])"));
run('definicionPresetDelRamo=()=>({exigenciaPuntaje:65})');
chk('una pauta oficial puede proponer su exigencia',run('exigenciaPuntajeRamo(S.ramos[0])')===65);
chk('29,5 de 50 al 60% calcula 4,0 antes de guardar',run('actualizarNotaDesdePuntaje().nota')===4&&campos['m-puntaje-mensaje'].textContent.includes('4.0'));
run("destinoNotaDesdePuntaje={ramoId:'r1',catId:'c1',slot:null}");
chk('guarda la nota y la exigencia, sin guardar los puntos',run('confirmarNotaDesdePuntaje()')===true&&
  run('S.ramos[0].categorias[0].notas[0].valor')===4&&run('S.ramos[0].exigenciaPuntaje')===60&&
  run('ramoAvg(S.ramos[0])')===4&&JSON.stringify(run('S.ramos[0]')).indexOf('29,5')<0&&ctx.__guardados===1);
chk('la elección guardada prima sobre la pauta',run('exigenciaPuntajeRamo(S.ramos[0])')===60);
run("openNotaDesdePuntajeModal('c1')");
chk('el próximo ingreso del mismo ramo propone 60%',campos['modal-content'].innerHTML.includes('id="m-puntaje-exigencia"')&&campos['modal-content'].innerHTML.includes('value="60"'));

console.log('\n=== Casilla y truncado ===');
ctx.__guardados=0;campos['m-puntaje-truncar'].checked=true;
run("S={tenant:'fen',ramos:[{id:'r2',nombre:'Ramo de prueba',categorias:[{id:'c2',nombre:'Controles',peso:100,slots:3,directNota:true,notas:[]}]}]};currentRamoId='r2';destinoNotaDesdePuntaje={ramoId:'r2',catId:'c2',slot:1};");
chk('29,5 de 50 truncado guarda 3,9 en la casilla correcta',run('confirmarNotaDesdePuntaje()')===true&&
  run('S.ramos[0].categorias[0].notas[0].slot')===1&&run('S.ramos[0].categorias[0].notas[0].valor')===3.9&&ctx.__guardados===1);
campos['m-puntaje-obtenido'].value='51';
chk('puntaje mayor al total no permite guardar',run('actualizarNotaDesdePuntaje().nota')==null&&campos['m-puntaje-guardar'].disabled===true&&run('confirmarNotaDesdePuntaje()')===false&&ctx.__guardados===1);

console.log('\n=== Lista de varias notas ===');
campos['m-puntaje-obtenido'].value='30';campos['m-puntaje-truncar'].checked=false;
Object.assign(campos,{'m-nota-val':elemento(),'m-nota-name':elemento('Control 1'),
  'm-nota-fecha':elemento(),'m-nota-hora':elemento(),'m-pond-toggle':elemento(),
  'm-nota-peso':elemento('40')});
run("S={tenant:'fen',ramos:[{id:'r3',nombre:'Ramo de prueba',categorias:[{id:'c3',nombre:'Controles',peso:100,directNota:false,notas:[]}]}]};currentRamoId='r3';");
chk('la calculadora pasa 4,0 al formulario de nota',run('usarNotaDesdePuntaje()')===true&&campos['m-nota-val'].value==='4.0');
run("confirmAddNota('c3')");
chk('guardar la nota de una lista recuerda 60% en el ramo',run('S.ramos[0].categorias[0].notas[0].valor')===4&&run('S.ramos[0].exigenciaPuntaje')===60);

console.log('\nPASS: '+ok+'   FAIL: '+fail);
process.exit(fail?1:0);
