// Invitar alumnos: el mensaje se ve tal como llega, se manda en un toque y al
// lado se ve si está funcionando. Datos sintéticos.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return nodo()},querySelectorAll(){return []},dataset:{}});
const ctx={console,setTimeout,clearTimeout,Intl,URL,encodeURIComponent,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
 document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},
 navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},history:{replaceState(){}}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','marketplace.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const ahora=Date.parse('2026-11-05T12:00:00-03:00');ctx.__ahora=ahora;
const link='https://gradehub.cl/?profe=AB3CDEFG';ctx.__link=link;
const wa=run('whatsappInvitacionAlumnos(__link)');
assert.match(wa,/^https:\/\/wa\.me\/\?text=/,'sin número: la persona elige a quién mandarlo');
const texto=decodeURIComponent(wa.split('text=')[1]);
assert.ok(texto.endsWith('\n'+link),'el link va completo al final');
assert.match(texto,/Tú eliges los ramos y puedes dejar de compartir/,'el consentimiento va en el mensaje');
ctx.__al=[{id:'a',desde:'2026-11-03T10:00:00Z',ramos:[{},{}]},{id:'b',desde:'2026-09-01T10:00:00Z',ramos:[{}]},{id:'c',desde:null,ramos:[]}];
assert.equal(run('JSON.stringify(progresoInvitacionPanel(__al,__ahora))'),'{"total":3,"semana":1,"ramos":3}','una fecha ausente no cuenta como reciente');
const con=run("invitacionAlumnosHTML({link:__link,codigo:'AB3CDEFG',alumnos:__al,ahora:__ahora})");
assert.match(con,/Invita a más alumnos/);assert.match(con,/est-sube">\+1<\/b> esta semana · 3 ramos/);
for(const id of ['alumnos-link','alumnos-whatsapp','alumnos-compartir','alumnos-copiar','alumnos-renovar'])assert.match(con,new RegExp(`id="${id}"`),id);
assert.match(con,/target="_blank" rel="noopener"/);
assert.match(con,/>Copiar invitación</,'sin hoja de compartir dice lo que hace');
ctx.navigator.share=()=>{};assert.match(run("invitacionAlumnosHTML({link:__link,codigo:'X',alumnos:[]})"),/>Compartir invitación</);
const cero=run("invitacionAlumnosHTML({link:__link,codigo:'AB3CDEFG',alumnos:[],ahora:__ahora})");
assert.match(cero,/Invita a tu primer alumno/);assert.match(cero,/Aparecen acá cuando aceptan/);assert.doesNotMatch(cero,/esta semana/);
assert.match(run("invitacionAlumnosHTML({link:'x\"><b',codigo:'<i>',alumnos:[]})"),/&lt;i&gt;/,'el código va escapado');
console.log('PASS invitar alumnos: WhatsApp, consentimiento, progreso, estados y escape');
