// gradehub.cl/.well-known/apple-app-site-association: con esto iOS abre en la
// app los links para agregar un amigo (gradehub.cl/?amigo=usuario) cuando la
// app está instalada. Solo ese link: login, recuperación y el resto siguen en
// el navegador (ver #1188 para ampliarlo).
const fs=require('fs'),assert=require('assert/strict');
const raiz=__dirname+'/../';
let ok=0;const chk=(n,c)=>{assert.ok(c,n);ok++;console.log('  OK   '+n);};
const aasa=JSON.parse(fs.readFileSync(raiz+'.well-known/apple-app-site-association','utf8'));
const d=aasa.applinks.details;
chk('una sola app: Team PH6XQV8L2M y cl.gradehub.app',d.length===1&&JSON.stringify(d[0].appIDs)==='["PH6XQV8L2M.cl.gradehub.app"]');
const c=d[0].components.filter(r=>r['/']==='/');
chk('solo se suma la ruta de invitación al grupo',d[0].components.length===2&&d[0].components.some(r=>r['/']==='/unirse'));
chk('solo el link de amigos, en la raíz',c.length===1&&c[0]['/']==='/'&&c[0]['?']&&c[0]['?'].amigo==='?*'&&!c[0].exclude);
const headers=fs.readFileSync(raiz+'_headers','utf8');
chk('se sirve como JSON',/\/\.well-known\/apple-app-site-association\n\s+Content-Type: application\/json/.test(headers));
const deploy=fs.readFileSync(raiz+'.github/workflows/deploy.yml','utf8');
chk('está en la lista cerrada del deploy',/\.well-known\/apple-app-site-association/.test(deploy));
console.log(`\nPASS: ${ok}   FAIL: 0`);
