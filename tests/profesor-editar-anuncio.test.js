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
chk('el editor envía con profesor_editar_anuncio',/rpc\(propio\?'profesor_editar_anuncio':'admin_editar_anuncio'/.test(mk));
chk('el botón dice que va a revisión',/propio\?'Enviar cambios a revisión'/.test(mk));
chk('el descuento solo aparece si puedo_poner_descuento dice que sí',/rpc\('puedo_poner_descuento'\)/.test(mk)&&/data!==true/.test(mk));
chk('el público queda bloqueado en un anuncio publicado',/propio\?'<p class="profesor-info">En un anuncio publicado, el ramo y el público no cambian/.test(mk)&&/<fieldset disabled/.test(mk));

console.log('\n=== Tarjeta del profesor con cambios enviados ===');
const conEdicion=estado=>run(`tarjetaPanelClase({id:'a-sintetico',titulo:'Clase sintética',estado:'publicado',ramos_siglas:['MAT1620'],precio_clp:10000,
  publicado_at:'2026-11-20T12:00:00Z',vence_at:'2026-12-10T12:00:00Z',revisado_at:'2026-11-20T12:00:00Z',pagado_at:'2026-11-20T12:00:00Z',
  edicion_propia:{estado:'${estado}',comentario:'Comentario sintético de revisión',datos:{titulo:'Otro'}}},n=>'$'+n,ahora)`);
chk('pendiente: avisa que sigue la versión anterior',/Tus cambios están en revisión/.test(conEdicion('pendiente')));
chk('rechazada: muestra el comentario',/No aprobamos tus cambios/.test(conEdicion('rechazada'))&&/Comentario sintético de revisión/.test(conEdicion('rechazada')));
chk('y deja seguir editando',/data-editar-publicado="a-sintetico">Editar cambios/.test(conEdicion('pendiente')));

console.log('\n=== Admin ===');
const fila={p:{nombre:'Profe sintético'},a:{id:'a-sintetico',titulo:'Clase sintética',estado:'publicado',ramos_siglas:['MAT1620'],precio_clp:10000,
  publicado_at:'2026-11-20T12:00:00Z',vence_at:'2026-12-10T12:00:00Z',edicion_pendiente:{cambios:{titulo:{antes:'Clase sintética',despues:'Clase nueva'},precio_clp:{antes:10000,despues:12000}},enviada_at:'2026-11-24T12:00:00Z'}},costo:null,estado:['Publicada','publicado']};
ctx.fila=fila;
const adminHTML=run(`filaAdminHigHTML(fila,ahora)`);
chk('la fila avisa «Cambios por revisar»',/Cambios por revisar/.test(adminHTML));
chk('muestra antes y después',/<del>Clase sintética<\/del>/.test(adminHTML)&&/<ins>Clase nueva<\/ins>/.test(adminHTML));
chk('se aprueba o se rechaza con comentario',/data-admin-aprobar-edicion="a-sintetico"/.test(adminHTML)&&/data-admin-rechazar-edicion="a-sintetico"/.test(adminHTML));
chk('aparece en «Por revisar»',run(`filtrarAdminHig([fila],{seccion:'revision'})`).length===1);

console.log('\n=== SQL ===');
const sql=fs.readFileSync(raiz+'supabase/profesor_editar_anuncio.sql','utf8');
const tramo=(desde,hasta)=>sql.slice(sql.indexOf(desde),sql.indexOf(hasta,sql.indexOf(desde)));
const enviar=tramo('function public.profesor_editar_anuncio','grant execute on function public.profesor_editar_anuncio');
const resolver=tramo('function public.admin_resolver_edicion_anuncio','grant execute on function public.admin_resolver_edicion_anuncio');
chk('solo el dueño envía cambios',/autor_id = auth\.uid\(\)/.test(enviar));
chk('enviar NO cambia el anuncio publicado',!/update public\.tutor_anuncios/.test(enviar)&&/insert into public\.tutor_anuncio_ediciones/.test(enviar));
chk('público, ramos, universidad y tipo no se proponen',!/'(criterios|ramos_siglas|tenant|tipo)'/.test(tramo('function admin.campos_edicion_profesor','$$;\nrevoke')));
chk('aprobar exige administrador',/admin\.exigir_administrador\(\)/.test(resolver));
chk('aprobar no toca estado, publicación ni medición',!/estado\s*=\s*'|publicado_at\s*=|medicion_desde\s*=/.test(resolver.slice(resolver.indexOf('update public.tutor_anuncios'),resolver.indexOf('where id = p_anuncio_id;'))));
chk('el descuento exige el permiso del perfil',/not public\.puedo_poner_descuento\(\)/.test(enviar));
chk('el permiso parte apagado y el cliente no lo escribe',/descuento_propio boolean not null default false/.test(sql)&&!/grant update \(descuento_propio\)/.test(sql));
chk('la tabla de ediciones tiene RLS y FK a auth.users con cascade',/alter table public\.tutor_anuncio_ediciones enable row level security/.test(sql)&&/autor_id\s+uuid not null references auth\.users\(id\) on delete cascade/.test(sql));
chk('el cliente solo lee sus ediciones',/grant select on public\.tutor_anuncio_ediciones to authenticated/.test(sql)&&!/grant (insert|update|delete)[^;]*tutor_anuncio_ediciones/.test(sql));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
if(fail)process.exit(1);
