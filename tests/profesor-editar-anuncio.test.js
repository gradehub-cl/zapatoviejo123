// El profesor edita su anuncio publicado y, si GradeHub se lo habilita, le
// pone descuento y código (Lucas, 2026-11-24). Datos sintéticos escritos acá.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return stub},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{classList:{contains(){return false}},style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
ctx.URL=URL;
vm.createContext(ctx);
['data.js','engine.js','app.js','marketplace.js'].forEach(f=>vm.runInContext(fs.readFileSync(raiz+f,'utf8'),ctx));
const run=s=>vm.runInContext(s,ctx);
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

console.log('\n=== Tus anuncios ===');
const ahora=Date.parse('2026-11-24T15:00:00Z');
ctx.ahora=ahora;
const tarjeta=estado=>run(`tarjetaPanelClase({id:'a-sintetico',titulo:'Clase sintética',estado:'${estado}',ramos_siglas:['MAT1620'],precio_clp:10000,
  publicado_at:'2026-11-20T12:00:00Z',vence_at:'2026-12-10T12:00:00Z',revisado_at:'2026-11-20T12:00:00Z',pagado_at:'2026-11-20T12:00:00Z'},n=>'$'+n,ahora)`);
chk('un anuncio publicado ofrece Editar en la web',/data-editar-publicado="a-sintetico"/.test(tarjeta('publicado')));
chk('y sigue ofreciendo Pausar',/data-pausar="a-sintetico"/.test(tarjeta('publicado')));
chk('un borrador no usa el editar de publicados',!/data-editar-publicado/.test(tarjeta('borrador')));
ctx.enAppNativa=()=>true;
chk('en la app no aparece Editar (el editor es de la web)',!/data-editar-publicado/.test(tarjeta('publicado')));
delete ctx.enAppNativa;

console.log('\n=== Editor ===');
const mk=fs.readFileSync(raiz+'marketplace.js','utf8');
chk('el editor guarda con profesor_editar_anuncio',/rpc\(propio\?'profesor_editar_anuncio':'admin_editar_anuncio'/.test(mk));
chk('el descuento solo aparece si puedo_poner_descuento dice que sí',/rpc\('puedo_poner_descuento'\)/.test(mk)&&/data!==true/.test(mk));
chk('el público queda bloqueado en un anuncio publicado',/propio\?'<p class="profesor-info">En un anuncio publicado, el ramo y el público no cambian/.test(mk)&&/<fieldset disabled/.test(mk));

console.log('\n=== SQL ===');
const sql=fs.readFileSync(raiz+'supabase/profesor_editar_anuncio.sql','utf8');
const funcion=sql.slice(sql.indexOf('function public.profesor_editar_anuncio'));
chk('solo el dueño edita',/autor_id = auth\.uid\(\)/.test(funcion));
chk('público, ramos, universidad y tipo no se editan',!/'(criterios|ramos_siglas|tenant|tipo)'/.test(funcion.slice(0,funcion.indexOf('cambios jsonb'))));
chk('editar no toca estado, publicación ni medición',!/estado\s*=|publicado_at\s*=|medicion_desde\s*=/.test(funcion.slice(funcion.indexOf('update public.tutor_anuncios'),funcion.indexOf('where id = p_anuncio_id;'))));
chk('el descuento exige el permiso del perfil',/not public\.puedo_poner_descuento\(\)/.test(funcion));
chk('el permiso parte apagado y el cliente no lo escribe',/descuento_propio boolean not null default false/.test(sql)&&!/grant update \(descuento_propio\)/.test(sql));
chk('se registra en el historial sin el aviso de GradeHub',/'editar_anuncio_profesor'/.test(funcion));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
if(fail)process.exit(1);
