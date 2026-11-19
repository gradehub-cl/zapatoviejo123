// Cruzar horarios entre amigos (src/app/amigos-horario.js). Horarios sintéticos.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const nuevo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return null;},querySelectorAll(){return [];}});
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>nuevo(),createElement:nuevo,addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],documentElement:nuevo(),body:nuevo()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},
  history:{replaceState(){}},setTimeout,clearTimeout,console,gtag(){},requestAnimationFrame(){return 0;},cancelAnimationFrame(){},
  matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
vm.createContext(ctx);vm.runInContext(src,ctx);
// Lo que sale del contexto vm se copia: así deepStrictEqual compara valores y no prototipos de otro realm.
const run=(codigo,datos)=>{ctx.__d=datos;const v=vm.runInContext(codigo,ctx);return v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v;};
let ok=0;const chk=(n,f)=>{f();ok++;console.log('  OK   '+n);};

const ramo=(nombre,sigla,bloques,seccion=null)=>({id:sigla,nombre,sigla,seccion,horario:bloques.map((b,i)=>({id:sigla+i,...b}))});
const mios=[
  ramo('Curso Uno','SYN101',[{dias:['L','W'],inicio:'08:20',fin:'09:30',sala:'K201'},{dias:['L'],inicio:'11:00',fin:'12:10'}],2),
  ramo('Curso Dos','SYN202',[{dias:['L'],inicio:'14:00',fin:'15:10'},{dias:['V'],inicio:'10:00',fin:'11:10',noVoy:true}]),
];
// Como llega del servidor: sin ids, con null en sala y tipo.
const servidor=[
  {nombre:'Curso Uno',sigla:'SYN101',seccion:2,horario:[{dias:['L','W'],inicio:'08:20',fin:'09:30',sala:null,tipo:null}]},
  {nombre:'Curso Tres',sigla:'SYN303',seccion:null,horario:[{dias:['L'],inicio:'12:30',fin:'13:40',sala:'B12',tipo:'CLAS'},{dias:['L'],inicio:'13:40',fin:'14:50',sala:'B12',tipo:'AYU'}]},
  {nombre:'Curso Cuatro',sigla:null,seccion:1,horario:[]},
];

chk('lo del servidor se normaliza sin perder bloques',()=>{
  const n=run('normalizarRamosAmigo(__d)',servidor);
  assert.equal(n.length,3);assert.equal(n[0].horario[0].sala,'');
  assert.equal(run('copiarHorario(__d)',n[1].horario).length,2,'los bloques con null pasan la validación');
  assert.deepEqual(run('normalizarRamosAmigo(__d)',null),[]);
  assert.deepEqual(run('normalizarRamosAmigo(__d)',[null,{sigla:'X'}]),[],'sin nombre no es un ramo');
});
const suyos=run('normalizarRamosAmigo(__d)',servidor);

chk('ventanas libres en común dentro de la jornada de ambos',()=>{
  // Lunes: yo 08:20-09:30, 11:00-12:10, 14:00-15:10. Él 08:20-09:30, 12:30-14:50.
  assert.deepEqual(JSON.parse(JSON.stringify(run('ventanasLibresEnComun(__d[0],__d[1],"L")',[mios,suyos]))),[
    {inicio:'09:30',fin:'11:00',minutos:90},{inicio:'12:10',fin:'12:30',minutos:20}].filter(v=>v.minutos>=30));
  assert.equal(run('ventanasLibresEnComun(__d[0],__d[1],"L",{minimo:15}).length',[mios,suyos]),2,'con mínimo menor aparece el recreo');
  assert.equal(run('ventanasLibresEnComun(__d[0],__d[1],"J").length',[mios,suyos]),0,'sin clases ninguno, nada que proponer');
  assert.equal(run('ventanasLibresEnComun(__d[0],__d[1],"V").length',[mios,suyos]),0,'«no voy» no ocupa, y él no tiene clases el viernes');
});
chk('la semana muestra solo los días con ventanas',()=>{
  const s=run('semanaLibresEnComun(__d[0],__d[1])',[mios,suyos]);
  assert.deepEqual(s.map(d=>d.dia),['L']);assert.equal(s[0].nombre,'Lunes');
});
chk('ramos en común por sigla, con la misma sección cuando coincide',()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(run('ramosEnComun(__d[0],__d[1])',[mios,suyos]))),[{nombre:'Curso Uno',sigla:'SYN101',mismaSeccion:true}]);
  const otraSec=run('normalizarRamosAmigo(__d)',[{...servidor[0],seccion:3}]);
  assert.equal(run('ramosEnComun(__d[0],__d[1])[0].mismaSeccion',[mios,otraSec]),false);
});
// Lunes 2026-11-16 en Santiago (UTC-3 en noviembre).
const a=h=>new Date(`2026-11-16T${h}:00-03:00`);
chk('qué hace ahora, solo con el horario',()=>{
  const e=h=>JSON.parse(JSON.stringify(run('estadoAhoraAmigo(__d[0],__d[1])',[suyos,a(h)])));
  assert.deepEqual(e('08:30'),{estado:'clase',ramo:'Curso Uno',sigla:'SYN101',sala:null,hasta:'09:30'});
  assert.deepEqual(e('12:45'),{estado:'clase',ramo:'Curso Tres',sigla:'SYN303',sala:'B12',hasta:'14:50'},'clases seguidas cuentan como una');
  assert.equal(e('10:00').estado,'libre');assert.equal(e('10:00').proxima.inicio,'12:30');
  assert.equal(e('16:00').estado,'termino');
  assert.equal(JSON.parse(JSON.stringify(run('estadoAhoraAmigo(__d[0],__d[1])',[suyos,new Date('2026-11-19T10:00:00-03:00')]))).estado,'sinclases');
  assert.equal(run('estadoAhoraAmigo(__d[0],__d[1]).estado',[[{nombre:'X',horario:[]}],a('10:00')]),'sinhorario');
});
chk('la frase de la lista no inventa sala',()=>{
  assert.equal(run('textoEstadoAmigo(__d)',{estado:'clase',hasta:'09:30',sala:null}),'En clases hasta las 09:30');
  assert.equal(run('textoEstadoAmigo(__d)',{estado:'clase',hasta:'09:30',sala:'K201'}),'En clases hasta las 09:30 · K201');
  assert.equal(run('textoEstadoAmigo(__d)',{estado:'libre',proxima:{inicio:'12:30'}}),'Libre · clase a las 12:30');
});
console.log(`\nPASS: ${ok}   FAIL: 0`);
