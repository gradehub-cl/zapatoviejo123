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
chk('grupos: libres a la vez entre quienes van ese día',()=>{
  const tercero=run('normalizarRamosAmigo(__d)',[{nombre:'Curso Cinco',sigla:'SYN505',horario:[{dias:['L'],inicio:'10:00',fin:'10:40'},{dias:['W'],inicio:'08:00',fin:'09:00'}]}]);
  // Lunes: yo y él como antes; el tercero ocupa 10:00-10:40, así la ventana
  // 09:30-11:00 se parte en 30 y 20 minutos, y la de 20 no alcanza.
  const l=run('ventanasLibresGrupo(__d,"L")',[mios,suyos,tercero]);
  assert.equal(l.personas,3);
  assert.deepEqual(l.ventanas.map(v=>v.inicio+'-'+v.fin),['09:30-10:00']);
  // Miércoles: yo 08:20-09:30, él 08:20-09:30, el tercero 08:00-09:00: nadie libre entre medio.
  assert.equal(run('ventanasLibresGrupo(__d,"W").ventanas.length',[mios,suyos,tercero]),0);
  assert.equal(run('ventanasLibresGrupo(__d,"J").personas',[mios,suyos,tercero]),0);
  const sem=run('semanaLibresGrupo(__d)',[mios,suyos,tercero]);
  assert.deepEqual(sem.map(d=>d.dia),['L']);
  assert.deepEqual(run('ventanasLibresGrupo(__d,"L")',[mios]),{personas:1,ventanas:[]},'una sola persona no es grupo');
});
const R=(sigla,bloques)=>({nombre:'Curso '+sigla,sigla,horario:bloques.map(([dias,inicio,fin,noVoy])=>({dias,inicio,fin,...(noVoy?{noVoy:true}:{})}))});
const norm=l=>run('normalizarRamosAmigo(__d)',l);
chk('hacer turno: un día cuenta solo si llegan Y se van juntos',()=>{
  const yo=norm([R('A',[[['L','W'],'08:20','12:00'],[['M'],'10:00','13:00']])]);
  // Lunes: llega 08:30 y se va 12:10 (dentro de 20 min). Martes: llega igual pero se va 16:00. Miércoles: no va.
  const el=norm([R('B',[[['L'],'08:30','12:10'],[['M'],'10:00','16:00']])]);
  const m=run('matchTurno(__d[0],__d[1])',[yo,el]);
  assert.equal(m.tipo,'dia');
  assert.deepEqual(m.dias,[{dia:'L',nombre:'Lunes',llegada:'08:20',salida:'12:10'}],'el martes llegan juntos pero no se van juntos');
  assert.equal(run('textoMatchTurno(__d)',m),'Match de turno el lunes');
  assert.equal(run('textoTurno(__d)',m.dias[0]),'Llegan 08:20 · se van 12:10');
  assert.equal(run('listaDiasTurno(__d)',[{nombre:'Lunes'},{nombre:'Martes'},{nombre:'Jueves'}]),'lunes, martes y jueves');
});
chk('match perfecto: mismos días y todos coinciden',()=>{
  const yo=norm([R('A',[[['L','W'],'08:20','12:00']])]),igual=norm([R('B',[[['L','W'],'08:30','11:50']])]);
  assert.equal(run('matchTurno(__d[0],__d[1]).tipo',[yo,igual]),'perfecto');
  assert.equal(run('textoMatchTurno(matchTurno(__d[0],__d[1]))',[yo,igual]),'Match perfecto de turno');
  // Si además va el viernes, ese día yo voy sola: ya no es perfecto.
  const masDias=norm([R('B',[[['L','W'],'08:30','11:50'],[['V'],'09:00','10:00']])]);
  assert.equal(run('matchTurno(__d[0],__d[1]).tipo',[yo,masDias]),'dia');
  assert.equal(run('matchTurno(__d[0],__d[1]).tipo',[yo,norm([R('C',[[['L'],'14:00','18:00']])])]),'ninguno');
});
chk('«no voy» cuenta en todo: turno, libres, grupo y qué hace ahora',()=>{
  // La de 08:20 del lunes está marcada «no voy»: llego a las 10:00.
  const yo=norm([R('A',[[['L'],'08:20','09:30',true],[['L'],'10:00','12:00']])]);
  const el=norm([R('B',[[['L'],'10:00','12:00']])]);
  assert.equal(run('matchTurno(__d[0],__d[1]).tipo',[yo,el]),'perfecto','sin la clase a la que no voy, llegamos juntos');
  assert.deepEqual(run('tramosOcupados(__d,"L")',yo),[[600,720]]);
  // Libres: con la de 08:20 marcada, de 08:20 a 10:00 no hay jornada mía que partir.
  const temprano=norm([R('C',[[['L'],'08:00','09:00'],[['L'],'11:00','12:00']])]);
  assert.deepEqual(run('ventanasLibresEnComun(__d[0],__d[1],"L")',[yo,temprano]).map(v=>v.inicio+'-'+v.fin),['09:00-10:00']);
  assert.deepEqual(run('ventanasLibresGrupo(__d,"L")',[yo,temprano,el]).ventanas.map(v=>v.inicio+'-'+v.fin),['09:00-10:00']);
  // Qué hace ahora: a las 08:30 no está en clases; su próxima es la de las 10:00.
  const e=run('estadoAhoraAmigo(__d[0],__d[1])',[yo,new Date('2026-11-16T08:30:00-03:00')]);
  assert.equal(e.estado,'libre');assert.equal(e.proxima.inicio,'10:00');
  // Si no va a ninguna clase ese día, ese día no va a la u.
  const nada=norm([R('D',[[['L'],'10:00','12:00',true]])]);
  assert.equal(run('estadoAhoraAmigo(__d[0],__d[1]).estado',[nada,new Date('2026-11-16T11:00:00-03:00')]),'sinclases');
  assert.equal(run('matchTurno(__d[0],__d[1]).tipo',[nada,el]),'ninguno');
});
console.log(`\nPASS: ${ok}   FAIL: 0`);
