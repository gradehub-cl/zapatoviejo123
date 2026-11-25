// gradehub.cl/.well-known/apple-app-site-association: con esto iOS abre en la
// app los links para agregar un amigo (gradehub.cl/?amigo=usuario) cuando la
// app está instalada. Desde #1188 la raíz entera abre la app; login y
// recuperación siguen en el navegador (detalle en universal-links.test.js).
const fs=require('fs'),assert=require('assert/strict');
const raiz=__dirname+'/../';
let ok=0;const chk=(n,c)=>{assert.ok(c,n);ok++;console.log('  OK   '+n);};
const aasa=JSON.parse(fs.readFileSync(raiz+'.well-known/apple-app-site-association','utf8'));
const d=aasa.applinks.details;
chk('una sola app: Team PH6XQV8L2M y cl.gradehub.app',d.length===1&&JSON.stringify(d[0].appIDs)==='["PH6XQV8L2M.cl.gradehub.app"]');
const c=d[0].components;
const incluidos=c.filter(x=>!x.exclude);
chk('la raíz abre la app, y con ella el link de amigos',incluidos.length===1&&incluidos[0]['/']==='/'&&!incluidos[0]['?']&&!incluidos[0]['#']);
chk('el link de amigos no cae en una exclusión de login',!c.some(x=>x.exclude&&x['?']&&(typeof x['?']==='string'?/^\*?&?amigo/.test(x['?']):'amigo' in x['?'])));
const headers=fs.readFileSync(raiz+'_headers','utf8');
chk('se sirve como JSON',/\/\.well-known\/apple-app-site-association\n\s+Content-Type: application\/json/.test(headers));
const deploy=fs.readFileSync(raiz+'.github/workflows/deploy.yml','utf8');
chk('está en la lista cerrada del deploy',/\.well-known\/apple-app-site-association/.test(deploy));
console.log(`\nPASS: ${ok}   FAIL: 0`);
