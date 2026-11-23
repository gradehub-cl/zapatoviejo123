// Grupos: «Ahora en la u», «Libres juntos» y «Estudiar juntos» (Lucas, 2026-11-22).
// Horarios y personas sintéticos; funciones reales de los bundles.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js'].map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
const nuevo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return null;},querySelectorAll(){return [];},focus(){},dataset:{}});
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>nuevo(),createElement:nuevo,addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],documentElement:nuevo(),body:nuevo()},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},
  history:{replaceState(){}},setTimeout,clearTimeout,console,gtag(){},requestAnimationFrame(){return 0;},cancelAnimationFrame(){},URL,
  matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=(codigo,datos)=>{ctx.__d=datos;const v=vm.runInContext(codigo,ctx);return v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v;};
let ok=0;const chk=(n,f)=>{f();ok++;console.log('  OK   '+n);};

const ramo=(sigla,bloques)=>({nombre:'Curso '+sigla,sigla,horario:bloques.map(([dias,inicio,fin,extra])=>({dias,inicio,fin,...extra}))});
const L=['L','M','W','J','V'];
const yo={clave:'ana',yo:true,ramos:[ramo('SYN1',[[L,'08:20','09:30'],[L,'12:00','13:00']])]};
const beto={clave:'beto',ramos:[ramo('SYN1',[[L,'08:20','09:30'],[L,'14:00','15:00']])]};
const carla={clave:'carla',ramos:[ramo('SYN2',[[L,'10:00','11:00'],[L,'13:00','14:00']])]};

console.log('\n=== Libres juntos en un día ===');
chk('parte donde cambia quién está, y siempre contigo',()=>{
  assert.deepEqual(run('libresJuntosDia(__d,"L")',[yo,beto,carla]).map(v=>[v.inicio,v.fin,v.claves.join()]),
    [['09:30','11:00','ana,beto'],['11:00','12:00','ana,beto,carla']]);
});
chk('sin tu horario, igual muestra cuándo coinciden los demás',()=>{
  const sinHorario={clave:'ana',yo:true,ramos:[]};
  assert.deepEqual(run('libresJuntosDia(__d,"L")',[sinHorario,beto,carla]).map(v=>[v.inicio,v.fin,v.claves.join()]),[['11:00','13:00','beto,carla']]);
});
chk('una ventana corta no es un plan (mínimo 45 minutos)',()=>{
  assert.equal(run('libresJuntosDia(__d,"L",{desde:10*60+30})',[yo,beto,carla]).map(v=>v.inicio).join(),'11:00');
});
chk('quien no tiene clases ese día no está en la u',()=>{
  assert.equal(run('libresJuntosDia(__d,"S")',[yo,beto,carla]).length,0);
});
chk('una clase «no voy» no ocupa',()=>{
  const conNoVoy={clave:'ana',yo:true,ramos:[ramo('SYN1',[[L,'08:20','09:30'],[L,'10:00','11:00',{noVoy:true}],[L,'12:00','13:00']])]};
  assert.equal(run('libresJuntosDia(__d,"L")',[conNoVoy,beto]).map(v=>v.inicio+'-'+v.fin).join(),'09:30-12:00');
});

console.log('\n=== Próximas ventanas y estudiar juntos ===');
// Un lunes a las 10:00 en Chile (13:00 UTC en verano).
const lunes=(()=>{for(let d=5;d<12;d++){const t=new Date(Date.UTC(2099,0,d,13));if(t.getUTCDay()===1)return t.toISOString();}})();
chk('de hoy en adelante, desde ahora, en orden',()=>{
  const v=run(`proximasLibresJuntos(__d,new Date('${lunes}'))`,[yo,beto,carla]);
  assert.equal(v.length,2);
  assert.equal(v[0].fecha,lunes.slice(0,10));assert.equal(v[0].inicio,'10:00');assert.equal(v[0].fin,'11:00');
  assert.equal(v[1].inicio,'11:00');assert.equal(v[1].claves.length,3);
});
chk('estudiar juntos: la ventana con más gente y, si empatan, la más cercana a la prueba',()=>{
  const miercoles=run(`sumarDiasAgenda('${lunes.slice(0,10)}',2)`);
  const v=run(`mejorLibreAntesDe(__d,{fecha:'${miercoles}',inicio:'09:00'},new Date('${lunes}'))`,[yo,beto,carla]);
  assert.equal(v.fecha,run(`sumarDiasAgenda('${lunes.slice(0,10)}',1)`));assert.equal(v.inicio,'11:00');assert.equal(v.claves.length,3);
});
chk('una prueba que ya pasó no propone nada',()=>{
  assert.equal(run(`mejorLibreAntesDe(__d,{fecha:'2000-01-01'},new Date('${lunes}'))`,[yo,beto]),null);
});

console.log('\n=== Pantalla del grupo ===');
run(`S.ramos=__d.yo;currentUser={id:'u'};`,{yo:yo.ramos});
const filas=[{username:'ana',nombre:'Ana',estado:'miembro',yo:true},{username:'beto',nombre:'Beto',estado:'miembro',ramos:beto.ramos},
  {username:'carla',nombre:'Carla',estado:'miembro',ramos:carla.ramos},{username:'dani',nombre:'Dani',estado:'miembro',ramos:null},{username:'flor',nombre:'Flor',estado:'invitado'}];
chk('Ahora en la u: libres primero, con una etiqueta corta, y tú sin botón',()=>{
  const h=run(`ahoraGrupoHTML({id:'g1',filas:__d},new Date('${lunes}'))`,filas);
  assert.match(h,/Ahora en la u/);assert.match(h,/2 libres · 1 en clases/);
  assert.ok(h.indexOf('Libre')<h.indexOf('Hasta 11:00'));assert.match(h,/Sin horario/);
  assert.ok(!/Flor/.test(h),'las invitaciones no cuentan como del grupo');
  assert.ok(/<span class="amigos-historia" aria-label="Tú:/.test(h)&&/data-amigos="grupo-miembro"[^>]*data-user="beto"/.test(h));
});
chk('si nadie más comparte su horario, no aparece',()=>{
  assert.equal(run(`ahoraGrupoHTML({id:'g1',filas:__d})`,[filas[0],filas[3]]),'');
});
chk('Libres juntos: cada ventana anota una sala con día y horas ya puestos',()=>{
  const h=run(`libresJuntosHTML({id:'g1',filas:__d},new Date('${lunes}'))`,filas);
  assert.match(h,/Libres juntos/);assert.match(h,/data-amigos="reserva-nueva"[^>]*data-fecha="\d{4}-\d{2}-\d{2}" data-inicio="10:00" data-fin="11:00"/);
  assert.match(h,/Tú, Beto y Carla/);
});
chk('Estudiar juntos solo en una prueba compartida contigo',()=>{
  const cal=[{tipo:'prueba',username:'ana',nombre:'Ana',yo:true,fecha:'2099-02-10',inicio:'18:30',titulo:'Prueba 2',detalle:'SYN1'},
    {tipo:'prueba',username:'beto',nombre:'Beto',yo:false,fecha:'2099-02-10',inicio:'18:30',titulo:'Prueba 2',detalle:'SYN1'},
    {tipo:'prueba',username:'carla',nombre:'Carla',yo:false,fecha:'2099-02-12',inicio:null,titulo:'Control',detalle:'SYN2'}];
  const h=run(`calendarioGrupoHTML('g1',__d)`,cal);
  assert.equal((h.match(/data-amigos="grupo-estudiar"/g)||[]).length,1);
});
chk('la lista dice lo próximo del grupo, sin inventar',()=>{
  assert.equal(run('proximoGrupoTexto([])'),'');
  const t=run(`proximoGrupoTexto(__d)`,[{tipo:'reserva',id:'r',username:'beto',fecha:'2099-02-09',inicio:'14:00',fin:'16:00',titulo:'Sala 1'}]);
  assert.match(t,/^Sala .+ a las 14:00$/);
});
chk('Anotar sala acepta día y horas, y los valida',()=>{
  const f=fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8');
  assert.match(f,/function abrirReservaNueva\(id,pre=\{\}\)/);assert.match(f,/pre\.fecha>=hoy&&pre\.fecha<=max/);
  assert.match(f,/abrirReservaNueva\(id,\{fecha:b\.dataset\.fecha,inicio:b\.dataset\.inicio,fin:b\.dataset\.fin\}\)/);
});
console.log(`\nPASS: ${ok}`);
