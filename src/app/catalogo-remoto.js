// ─── Catálogo UC en el servidor ────────────────────────────────────────────
// Buscar un ramo ya no descarga los ~618 KB de cursos-uc.js (en iPhone se
// sentía pegado, 2026-09-26). Se muestran al tiro la malla y los cursos que
// más toma la gente de tu carrera (`cursos_frecuentes_uc`), y lo demás se
// busca en `public.catalogo_uc` mientras escribes (supabase/catalogo_uc.sql).
// Lo que llega se suma a `_cursosUcRemotos` y entra al mismo índice y al mismo
// orden de siempre. Si la tabla no existe todavía o falla la red, se vuelve a
// descargar el archivo como antes: nadie se queda sin buscador.
let _cursosUcRemotos=[];
let _catalogoUcServidor='?';   // '?' sin probar · 'ok' responde · 'no' → archivo
let _busquedaUcPendiente=false,_busquedaUcTimer=null,_busquedaUcUltima='';
const _frecuentesUcPedidos=new Set();
let _frecuentesUc=[];
function agregarCursosUcRemotos(filas){
  const vistas=new Set(_cursosUcRemotos.map(f=>f[0]));
  const nuevas=(Array.isArray(filas)?filas:[]).filter(f=>f&&typeof f.sigla==='string'&&typeof f.nombre==='string'&&f.nombre.trim()&&!vistas.has(f.sigla)&&vistas.add(f.sigla))
    .map(f=>[f.sigla,f.nombre,Number.isInteger(f.creditos)?f.creditos:null]);
  if(!nuevas.length)return false;
  // Una referencia nueva: el índice de búsqueda la compara para rearmarse.
  _cursosUcRemotos=_cursosUcRemotos.concat(nuevas).slice(-3000);
  return true;
}
// Las palabras de la consulta tal como las compara la columna `busqueda`:
// minúsculas, sin tildes y con romanos en cifras. Solo letras y números, así
// que no hay forma de meter sintaxis en el filtro del servidor.
function consultaCatalogoUc(q){
  const n=normBusqueda(normName(q)).replace(/[^a-z0-9 ]+/g,' ');
  const tokens=n.split(/\s+/).filter(t=>t&&!ENLACES_BUSQUEDA.has(t)).slice(0,4);
  return tokens.join('').length>=2?tokens:null;
}
// supabaseClient y currentUser viven en app-session.js, que carga después.
function clienteCatalogoUc(){return typeof supabaseClient!=='undefined'&&supabaseClient&&typeof supabaseClient.from==='function'?supabaseClient:null;}
let _creditosUcServidorPendiente=null;
// Recupera solo las filas necesarias para una cuenta ya existente. Los ramos
// con sigla se identifican por ella; los escritos a mano se consultan por la
// `busqueda` exacta y pasan por la misma guarda de siempre
// (creditosUCPorNombreUnico: un nombre repetido con SCT distintos no recibe
// nada). Cualquier falla conserva el respaldo anterior: cursos-uc.js completo.
function completarCreditosUCPendientes(){
  if(S.tenant!=='uc'||!S.onboardingDone)return Promise.resolve(false);
  const pendientes=(S.ramos||[]).filter(r=>(!r.origen||r.origen.tenant==='uc')&&(r.creditos===null||r.creditos===undefined));
  if(!pendientes.length)return Promise.resolve(false);
  if(cursosUcExtra())return Promise.resolve(completarCreditosUCTrasCarga());
  if(_creditosUcServidorPendiente)return _creditosUcServidorPendiente;
  const cliente=clienteCatalogoUc();
  if(!cliente)return cargarCursosUC();

  const siglas=[],nombres=[],vistasSiglas=new Set(),vistosNombres=new Set();
  pendientes.forEach(r=>{
    if(r.origen&&r.origen.tenant==='uc'){
      const sigla=siglaDeRamo(r,'uc');
      if(sigla&&!vistasSiglas.has(sigla.toUpperCase())){
        vistasSiglas.add(sigla.toUpperCase());siglas.push(sigla.toUpperCase());
      }
      return;
    }
    if(r.origen)return;
    const busqueda=normBusqueda(normName(r.nombre||''));
    if(busqueda&&!vistosNombres.has(busqueda)){vistosNombres.add(busqueda);nombres.push(busqueda);}
  });
  // Un ramo de catálogo antiguo sin sigla resoluble no se puede consultar de
  // forma inequívoca. En ese caso se conserva el archivo que ya resolvía esto.
  if(pendientes.some(r=>r.origen&&r.origen.tenant==='uc'&&!siglaDeRamo(r,'uc')))return cargarCursosUC();

  _creditosUcServidorPendiente=(async()=>{
    try{
      const pedir=async(campo,valores)=>{
        if(!valores.length)return [];
        const {data,error}=await cliente.from('catalogo_uc').select('sigla,nombre,creditos,busqueda').in(campo,valores);
        if(error)throw error;
        if(!Array.isArray(data))throw new Error('Respuesta inválida de catalogo_uc');
        return data;
      };
      const [porSigla,porNombre]=await Promise.all([pedir('sigla',siglas),pedir('busqueda',nombres)]);
      _catalogoUcServidor='ok';
      agregarCursosUcRemotos(porSigla.concat(porNombre));
      return completarCreditosUCTrasCarga();
    }catch(e){
      // Tabla sin aplicar, cliente sin conexión o red caída: mismo respaldo
      // que tenía la app antes de consultar filas puntuales.
      _catalogoUcServidor='no';
      return cargarCursosUC();
    }finally{
      _creditosUcServidorPendiente=null;
    }
  })();
  return _creditosUcServidorPendiente;
}
function pedirFrecuentesUc(carrera,repintar){
  const cliente=clienteCatalogoUc();
  if(!carrera||!cliente||typeof currentUser==='undefined'||!currentUser||_frecuentesUcPedidos.has(carrera))return;
  _frecuentesUcPedidos.add(carrera);
  Promise.resolve(cliente.rpc('cursos_frecuentes_uc',{p_carrera:carrera})).then(({data,error})=>{
    if(error||!Array.isArray(data))return;
    _frecuentesUc=data.map(f=>f&&f.sigla).filter(Boolean);
    agregarCursosUcRemotos(data);
    repintar();
  }).catch(()=>{});
}
function buscarCatalogoUcServidor(q,repintar){
  const tokens=consultaCatalogoUc(q);
  clearTimeout(_busquedaUcTimer);
  if(!tokens){_busquedaUcPendiente=false;return;}
  const clave=tokens.join(' ');
  if(clave===_busquedaUcUltima){_busquedaUcPendiente=false;return;}
  _busquedaUcPendiente=true;
  _busquedaUcTimer=setTimeout(async()=>{
    try{
      let consulta=clienteCatalogoUc().from('catalogo_uc').select('sigla,nombre,creditos')
        .or(`sigla.ilike.${tokens[0].toUpperCase()}%,busqueda.ilike.%${tokens[0]}%`);
      tokens.slice(1).forEach(t=>{consulta=consulta.ilike('busqueda',`%${t}%`);});
      const {data,error}=await consulta.limit(40);
      if(error)throw error;
      _catalogoUcServidor='ok';_busquedaUcUltima=clave;
      agregarCursosUcRemotos(data);
    }catch(e){
      // Tabla sin crear, sin red o cualquier otra cosa: el archivo de siempre.
      _catalogoUcServidor='no';
      cargarCursosUC().then(ok=>{if(ok)repintar();});
    }finally{
      _busquedaUcPendiente=false;
      repintar();
    }
  },220);
}
// "Buscando…" mientras no haya una respuesta que permita decir que un ramo no
// existe: sin probar el servidor, con una búsqueda en curso, o bajando el
// archivo porque el servidor no respondió.
function catalogoUcEnCamino(tenant){
  if(tenant!=='uc'||cursosUcExtra())return false;
  return _catalogoUcServidor!=='ok'||_busquedaUcPendiente;
}
function repintarAlCargarCursosUC(tenant,repintar,q,carrera){
  if(tenant!=='uc'||cursosUcExtra())return;
  if(_catalogoUcServidor==='no'||!clienteCatalogoUc()){cargarCursosUC().then(ok=>{if(ok)repintar();});return;}
  if(!String(q||'').trim())pedirFrecuentesUc(carrera||S.carrera,repintar);
  buscarCatalogoUcServidor(q,repintar);
}
// Al abrir el buscador, primero lo que más toma la gente de tu carrera, sin
// repetir lo que ya tienes. Solo reordena: no agrega ni quita resultados.
function priorizarFrecuentesUc(res,yaTengo){
  if(!_frecuentesUc.length)return res;
  const lugar=new Map(_frecuentesUc.map((s,i)=>[s,i]));
  const frec=res.filter(r=>r.sigla&&lugar.has(r.sigla)&&!yaTengo.has(normName(r.nombre)))
    .sort((a,b)=>lugar.get(a.sigla)-lugar.get(b.sigla));
  const usados=new Set(frec);
  return frec.concat(res.filter(r=>!usados.has(r)));
}
// El buscador cubre toda la universidad, no solo tu carrera: se piden las
// mallas diferidas aunque la tuya venga en el archivo base (Ingeniería UC).
function repintarAlCargarMallas(tenant,repintar){
  if(!ARCHIVO_MALLAS[tenant]||mallasExtraDe(tenant))return;
  cargarMallasUC(tenant).then(ok=>{if(ok)repintar();});
}
function selectTenant(t){
  selectedTenant=t;selectedCarrera=null;applyTheme();renderTenantPick();initCarreraGrid();checkOb();
  // En onboarding avanzamos solo: el usuario ve la selección y pasa al siguiente paso
  if(typeof obStep!=='undefined' && obStep===2 && document.getElementById('screen-onboard').classList.contains('active')){
    setTimeout(()=>{if(obStep===2)obNext();},260);
  }
}
function renderTenantPick(){
  const g=document.getElementById('tenant-grid');if(!g)return;g.innerHTML='';
  tenantsVisibles(selectedTenant).forEach(([code,cfg])=>{
    const b=document.createElement('button');
    b.className='tenant-opt'+(code===selectedTenant?' sel':'');
    b.style.setProperty('--tb','var(--primary)');
    b.innerHTML=`${tenantBadge(code,'lg')}
      <span class="tenant-opt-info">
        <span class="tenant-opt-name">${esc(cfg.label||cfg.name)}</span>
        <span class="tenant-opt-sub">${esc(cfg.sub||'')}</span>
      </span>`;
    b.onclick=()=>selectTenant(code);
    g.appendChild(b);
  });
}

function portalFor(tenant){return tenant==='uc'?PORTAL_UC:PORTAL;}
