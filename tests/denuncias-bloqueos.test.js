// Denunciar y bloquear en el cliente (App Review 1.2). Datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const fuente=leer('src/marketplace/denuncias.js');
const funcion=(archivo,nombre)=>{const s=leer(archivo),i=s.indexOf(`async function ${nombre}(`);assert(i>=0,nombre);let n=0,j=s.indexOf('){',i)+1;for(;j<s.length;j++){if(s[j]==='{')n++;else if(s[j]==='}'&&!--n)break;}return s.slice(i,j+1);};

function contexto({usuario={id:'cuenta-a'},respuestas=[]}={}){
  const llamadas=[];
  const ctx={currentUser:usuario,console,Promise,Set,Map,JSON,Number,String,Array,Error,Date,encodeURIComponent,
    esc:s=>String(s??'').replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`),
    sqlClasesDesactualizado:e=>!!e&&['42883','PGRST202','42P01'].includes(e.code),
    supabaseClient:{rpc:async(nombre,args)=>{llamadas.push([nombre,args]);const r=respuestas.shift();if(r instanceof Error)throw r;return r||{data:[],error:null};}}};
  vm.createContext(ctx);vm.runInContext(fuente,ctx);
  return {ctx,llamadas};
}

(async()=>{
  // Nunca toca gradehub_v1 ni el dispositivo: el bloqueo vive en la cuenta.
  assert.doesNotMatch(fuente.replace(/^\s*\/\/.*$/gm,''),/localStorage|gradehub_v1|sessionStorage/);

  // Índice y filtros.
  {
    const {ctx}=contexto();
    const i=ctx.indiceBloqueos([{id:1,nombre:'Profe Sintético',perfiles:['p1'],anuncios:['a1','a2']}]);
    assert.deepEqual(ctx.sinAnunciosBloqueados([{id:'a1'},{id:'a3'},{id:'a2'}],i).map(a=>a.id),['a3']);
    assert.deepEqual(ctx.sinPerfilesBloqueados([{id:'p1'},{id:'p2'}],i).map(p=>p.id),['p2']);
    const vacio=ctx.indiceBloqueos(null),lista=[{id:'a1'}];
    assert.equal(ctx.sinAnunciosBloqueados(lista,vacio),lista,'sin bloqueos devuelve la misma lista');
  }

  // Una lectura por cuenta; un error no queda guardado; sin SQL no filtra ni falla.
  {
    const {ctx,llamadas}=contexto({respuestas:[{data:null,error:{code:'500',message:'caído'}},{data:[{id:1,nombre:'X',perfiles:[],anuncios:['a1']}],error:null}]});
    const primero=await ctx.bloqueosVigentes();assert.equal(primero.error,true);assert.equal(primero.anuncios.size,0);
    const segundo=await ctx.bloqueosVigentes();assert.equal(segundo.anuncios.has('a1'),true,'reintenta tras un error');
    await ctx.bloqueosVigentes();assert.equal(llamadas.length,2,'cachea la respuesta buena');
    ctx.currentUser={id:'cuenta-b'};await ctx.bloqueosVigentes();assert.equal(llamadas.length,3,'otra cuenta vuelve a preguntar');
    ctx.olvidarBloqueos();await ctx.bloqueosVigentes();assert.equal(llamadas.length,4);
    assert.deepEqual(llamadas.map(l=>l[0]),Array(4).fill('mis_bloqueos'));
  }
  {
    const {ctx}=contexto({respuestas:[{data:null,error:{code:'PGRST202',message:'no existe'}}]});
    const i=await ctx.bloqueosVigentes();assert.equal(i.error,false,'SQL sin aplicar = sin bloqueos, sin error');
    const {ctx:anonimo,llamadas}=contexto({usuario:null});
    assert.equal((await anonimo.bloqueosVigentes()).anuncios.size,0);assert.equal(llamadas.length,0,'sin sesión no consulta');
    assert.equal(anonimo.botonDenunciaHTML('anuncio','a1','Clase'),'','sin sesión no se ofrece denunciar');
  }

  // cargarAnunciosClases (catálogo, directorio e Inicio pasan por acá) deja fuera lo bloqueado.
  {
    const {ctx}=contexto({respuestas:[{data:[{id:1,nombre:'X',perfiles:['p1'],anuncios:['a2']}],error:null}]});
    const consulta={select(){return this;},eq(){return this;},or(){return this;},order(){return this;},range(){return Promise.resolve({data:[{id:'a1'},{id:'a2'},{id:'a3'}],error:null});}};
    const rpc=ctx.supabaseClient.rpc;ctx.supabaseClient={rpc,from:()=>consulta};
    ctx.CAMPOS_PUBLICOS_ANUNCIO='id';ctx.consultaCamposClase=(hacer,base)=>hacer(base);
    vm.runInContext(funcion('src/marketplace/campanas-precio.js','cargarAnunciosClases'),ctx);
    assert.deepEqual(Array.from(await ctx.cargarAnunciosClases('uc'),a=>a.id),['a1','a3']);
  }

  // La hoja: motivos según el contenido; en opiniones no hay a quién bloquear.
  {
    const {ctx}=contexto();
    const anuncio=ctx.vistaDenunciaHTML({tipo:'anuncio',nombre:'Clase <sintética>',conVolver:true});
    assert.match(anuncio,/name="denuncia-motivo" value="enganoso"/);assert.match(anuncio,/data-denuncia-bloquear/);
    assert.match(anuncio,/Clase &#60;sintética&#62;/,'escapa el nombre');assert.match(anuncio,/gradehub\.app@gmail\.com/,'contacto publicado');
    assert.match(anuncio,/maxlength="500"/);assert.match(anuncio,/data-denuncia-volver/);
    const opinion=ctx.vistaDenunciaHTML({tipo:'opinion',nombre:'Docente Sintético'});
    assert.doesNotMatch(opinion,/data-denuncia-bloquear/,'una calificación anónima no tiene autor que bloquear');
    assert.match(opinion,/value="incorrecto"/);assert.doesNotMatch(opinion,/value="spam"/);
    assert.match(ctx.botonDenunciaHTML('perfil','p1','Profe "Sintético"'),/data-denunciar-tipo="perfil" data-denunciar-id="p1" data-denunciar-nombre="Profe &#34;Sintético&#34;"/);
    assert.match(ctx.errorDenuncia({message:'demasiadas denuncias'}),/muchas/);
    assert.match(ctx.errorDenuncia({code:'PGRST202'}),/gradehub\.app@gmail\.com/,'sin SQL ofrece el correo');
    assert.match(ctx.errorDenuncia({message:'contenido no disponible'}),/ya no está publicado/);
  }

  // Administración: agrupa por contenido y nunca muestra quién denunció.
  {
    const {ctx}=contexto();
    const filas=[
      {id:1,tipo:'anuncio',motivo:'spam',detalle:'Texto sintético',creada:'2026-11-15T12:00:00Z',autor_id:'u1',autor_estado:'aprobado',anuncio_id:'a1',anuncio_titulo:'Clase de ejemplo',anuncio_descripcion:'Descripción sintética'},
      {id:2,tipo:'anuncio',motivo:'ofensivo',detalle:null,creada:'2026-11-15T13:00:00Z',autor_id:'u1',autor_estado:'aprobado',anuncio_id:'a1'},
      {id:3,tipo:'opinion',motivo:'incorrecto',detalle:null,creada:'2026-11-15T14:00:00Z',opinion:{tenant:'uc',ramo_clave:'test101',seccion:1,periodo:'2026-2',docente:'Docente Sintético'},docente_oculto:false}];
    const grupos=ctx.gruposDenunciasAdmin(filas);
    assert.equal(grupos.length,2);assert.equal(grupos[0].total,2);assert.deepEqual(Array.from(grupos[0].motivos),['spam','ofensivo']);
    const html=grupos.map(ctx.denunciaAdminHTML).join('');
    assert.match(html,/data-denuncia-pausar="1" data-autor="u1"/);assert.match(html,/data-denuncia-ocultar="3"/);
    assert.match(html,/2 denuncias/);assert.match(html,/«Texto sintético»/);assert.match(html,/UC · test101 · sección 1/);
    const pausado=ctx.denunciaAdminHTML({...grupos[0],autor_estado:'suspendido'});
    assert.doesNotMatch(pausado,/data-denuncia-pausar/);assert.match(pausado,/Profesor pausado/);
  }

  // Cableado: dónde aparece y dónde se filtra.
  {
    const catalogo=leer('src/marketplace/catalogo.js'),directorio=leer('src/marketplace/directorio.js');
    assert.match(catalogo,/<div class="catalogo-clase-perfil"[^\n]*\n\s*\$\{botonDenunciaHTML\('anuncio',a\.id,/,'anuncio abierto');
    assert.match(catalogo,/\$\{previa\?'':botonDenunciaHTML\('perfil',p\.id,p\.nombre_publico\)\}/,'perfil, no en la vista previa del dueño');
    assert.match(directorio,/perfiles=sinPerfilesBloqueados\(r\.data,await bloqueosVigentes\(\)\);/);
    assert.match(leer('src/render-main/profesor-calificar.js'),/abrirDenuncia\(\{tipo:'opinion',nombre:publico,contexto/);
    const ajustes=leer('src/app/ajustes.js');assert.match(ajustes,/id="s-bloqueos"/);assert.match(ajustes,/pintarBloqueosAjustes\(\)/);
    assert.match(leer('src/marketplace/admin-estadisticas.js'),/id="admin-denuncias"[\s\S]*pintarDenunciasAdmin\(raiz\)/);
    const orden=JSON.parse(leer('src/orden.json'))['marketplace.js'];
    assert(orden.includes('src/marketplace/denuncias.js'));
  }
  console.log('denuncias-bloqueos OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
