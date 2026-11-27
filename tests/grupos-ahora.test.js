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
chk('Ahora en la u: quiénes libres, quiénes en clases (hasta cuándo) y el próximo módulo',()=>{
  const h=run(`ahoraGrupoHTML({id:'g1',filas:__d},new Date('${lunes}'))`,filas);
  assert.match(h,/Ahora en la u/);
  assert.match(h,/3 de 4 en la u/,'en la u: libres más en clases, de los integrantes');
  assert.match(h,/class="grupo-ahora-par"/,'Libres y En clases van mitad y mitad');
  assert.match(h,/<b>Libres<\/b>[\s\S]*?<small>Tú y Beto<\/small>/);
  assert.match(h,/<b>En clases<\/b>[\s\S]*?<small>Carla hasta las 11:00<\/small>/);
  assert.ok(!/Flor|Dani/.test(h),'sin horario o invitado no se cuenta como libre ni en clases');
  assert.ok(/data-amigos="grupo-miembro"[^>]*data-user="beto"/.test(h)&&!/data-user="ana"/.test(h),'tocar a otro abre su ficha; tú no eres botón');
});
chk('libre ahora es estar en la u entre clases; el próximo bloque es el siguiente módulo',()=>{
  const mods={1:['08:20','09:30'],2:['09:40','10:50'],3:['11:00','12:10'],4:['12:20','13:30']};
  const r=run(`libresAhoraYProximo(__d,new Date('${lunes}'),${JSON.stringify(mods)})`,[yo,beto,carla]);
  assert.deepEqual(r.ahora,['ana','beto']);
  assert.equal(r.proximo.modulo,3);assert.equal(r.proximo.inicio,'11:00');
  assert.deepEqual(r.proximo.claves,['beto','carla'],'Ana tiene clase a las 12:00, dentro del módulo 3; Carla está libre de 11:00 a 13:00');
  const sinMod=run(`libresAhoraYProximo(__d,new Date('${lunes}'),null)`,[yo,beto]);
  assert.equal(sinMod.proximo.inicio,'11:00');assert.equal(sinMod.proximo.modulo,null);
});
chk('si nadie más comparte su horario, no aparece',()=>{
  assert.equal(run(`ahoraGrupoHTML({id:'g1',filas:__d})`,[filas[0],filas[3]]),'');
});
chk('Libres juntos: cada ventana dice cuándo y con quiénes, sin acción',()=>{
  const h=run(`libresJuntosHTML({id:'g1',filas:__d},new Date('${lunes}'))`,filas);
  assert.match(h,/Libres juntos/);assert.match(h,/<b>[^<]+<\/b><span>10:00–11:00<\/span>/);
  assert.ok(!/data-amigos=|<button/.test(h),'tocar una ventana no abre Anotar sala ni nada');
  assert.match(h,/Tú, Beto y Carla/);
  assert.ok(!/anotar una sala<\/span>|Anotar sala</.test(h),'«Anotar sala» se ve una sola vez, en Lo que viene');
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

chk('sin nadie en la u, una sola línea en vez de tres «Nadie ahora»',()=>{
  const noche=new Date(new Date(lunes).getTime()+11*3600e3).toISOString();
  const h=run(`ahoraGrupoHTML({id:'g1',filas:__d},new Date('${noche}'))`,filas);
  assert.match(h,/Nadie del grupo está en la u ahora/);
  assert.ok(!/Nadie ahora|grupo-ahora-par|de 4 en la u/.test(h));
});
chk('Lo próximo: la sala o la prueba compartida contigo, con cuánto falta; lo que ya terminó no',()=>{
  const ahora=Date.parse(lunes);
  const hoy=run(`fechaHorarioChile(${ahora})`),manana=run(`sumarDiasAgenda('${hoy}',1)`),en3=run(`sumarDiasAgenda('${hoy}',3)`);
  const cal=[{tipo:'reserva',id:'r0',username:'beto',nombre:'Beto',fecha:hoy,inicio:'08:00',fin:'09:00',titulo:'Sala vieja'},
    {tipo:'prueba',username:'carla',nombre:'Carla',fecha:manana,inicio:'10:00',titulo:'Control solo de Carla',detalle:'SYN2'},
    {tipo:'prueba',username:'ana',nombre:'Ana',yo:true,fecha:en3,inicio:'18:30',titulo:'Prueba 2',detalle:'SYN1'},
    {tipo:'prueba',username:'beto',nombre:'Beto',fecha:en3,inicio:'18:30',titulo:'Prueba 2',detalle:'SYN1'}];
  const h=run(`proximoDestacadoHTML({id:'g1',cal:__d},${ahora})`,cal);
  assert.match(h,/<b>En 3 días<\/b>/);assert.match(h,/Prueba 2/);assert.match(h,/SYN1 · Tú y Beto la tienen/);
  assert.ok(!/Sala vieja|Control solo de Carla/.test(h),'ni lo que terminó ni una prueba que no es tuya');
  assert.equal((h.match(/data-amigos="grupo-estudiar"/g)||[]).length,1,'una sola acción principal');
  const sala=run(`proximoDestacadoHTML({id:'g1',cal:__d},${ahora})`,[...cal,{tipo:'reserva',id:'r1',username:'beto',nombre:'Beto',fecha:manana,inicio:'15:00',fin:'17:00',titulo:'Sala B-12',detalle:'K7Q2'}]);
  assert.match(sala,/<b>Mañana<\/b> · 15:00–17:00/);assert.match(sala,/Código <b>K7Q2<\/b>/);assert.match(sala,/anotada por Beto/);assert.match(sala,/Después: Prueba 2/);
  assert.ok(!/grupo-estudiar/.test(sala));
  assert.equal(run(`proximoDestacadoHTML({id:'g1',cal:[]})`),'','sin plan no hay tarjeta');
});
console.log('\n=== Novedades del grupo ===');
run(`S.ramos=[{id:'r1',nombre:'Curso Uno',sigla:'SYN101',horario:[{dias:['W'],inicio:'10:00',fin:'11:10'}],categorias:[{id:'c1',nombre:'Interrogación 2',peso:25,directNota:true,notas:[]},{id:'c2',nombre:'Controles',peso:20,slots:3,notas:[{id:'n1',slot:0,valor:null}]}],gates:[]}];`);
chk('encuentra tu evaluación por sigla y nombre (I2 = Interrogación 2)',()=>{
  assert.equal(run(`evaluacionParaFecha({ramo:'Otro nombre',sigla:'syn101',nombre:'I2',fecha:'2099-03-04'})?.item.id`),'c1');
  assert.equal(run(`evaluacionParaFecha({ramo:'Curso Uno',sigla:'SYN999',nombre:'Interrogación 2'})`),null,'otra sigla no es tu ramo');
});
chk('el hilo: sala con código, fecha con «Ponerla» si la tienes y quién entró',()=>{
  const nov=[{id:'e1',tipo:'fecha',username:'beto',nombre:'Beto',yo:false,creado:new Date().toISOString(),datos:{ramo:'Curso Uno',sigla:'SYN101',nombre:'Interrogación 2',fecha:'2099-03-04',hora:'18:30'}},
    {id:'e2',tipo:'sala',username:'beto',nombre:'Beto',yo:false,creado:new Date().toISOString(),datos:{reserva:'r9',lugar:'Sala 9',fecha:'2099-03-03',inicio:'12:10',fin:'14:00',codigo:'4821'}},
    {id:'e3',tipo:'fecha',username:'dani',nombre:'Dani',yo:false,creado:new Date().toISOString(),datos:{ramo:'Otro',sigla:'SYN777',nombre:'Control 4',fecha:'2099-03-05',hora:null}},
    {id:'e4',tipo:'union',username:'dani',nombre:'Dani',yo:false,creado:new Date().toISOString(),datos:{}}];
  const h=run(`novedadesGrupoHTML({id:'g1',nov:__d})`,nov);
  assert.match(h,/Fecha nueva · Beto/);assert.match(h,/Sala reservada · Beto/);assert.equal((h.match(/data-amigos="grupo-ponerla"/g)||[]).length,1,'solo donde tienes la evaluación');
  assert.match(h,/Código <b>4821<\/b>/);assert.match(h,/Nuevo en el grupo<\/small><b>Dani<\/b>/);
  run(`S.ramos[0].categorias[0].fecha='2099-03-04';S.ramos[0].categorias[0].hora='18:30';`);
  assert.match(run(`novedadesGrupoHTML({id:'g1',nov:__d})`,nov),/Ya está en tu Agenda/);
});
chk('sin novedades lo dice; «Ponerla» guarda como decisión tuya',()=>{
  assert.match(run(`novedadesGrupoHTML({id:'g1',nov:[]})`),/Todavía no hay novedades/);
  const f=fs.readFileSync(raiz+'src/app/amigos-pantalla.js','utf8');
  assert.match(f,/marcarFechaUsuario\(actual\.item,f,h\)/);assert.match(f,/rpcAmigos\('grupo_novedades'[^)]*\)\.catch\(\(\)=>null\)/);
});
chk('«Nuevo» marca lo que llegó desde tu última visita, no lo tuyo ni la primera vez',()=>{
  const t=h=>new Date(Date.now()-h*3600e3).toISOString();
  const nov=[{id:'a',tipo:'union',username:'dani',nombre:'Dani',creado:t(40),datos:{}},
    {id:'b',tipo:'union',username:'eli',nombre:'Eli',creado:t(2),datos:{}},
    {id:'c',tipo:'union',username:'ana',nombre:'Ana',yo:true,creado:t(1),datos:{}}];
  const h=run(`novedadesGrupoHTML({id:'g1',nov:__d,vistoAntes:'${t(10)}'})`,nov);
  assert.equal((h.match(/grupo-nuevo-raya/g)||[]).length,1);
  assert.ok(h.indexOf('grupo-nuevo-raya')<h.indexOf('<b>Eli</b>')&&h.indexOf('grupo-nuevo-raya')>h.indexOf('<b>Dani</b>'));
  assert.ok(!/grupo-nuevo-raya/.test(run(`novedadesGrupoHTML({id:'g1',nov:__d,vistoAntes:null})`,nov)),'la primera visita no marca todo como nuevo');
});
console.log(`\nPASS: ${ok}`);
