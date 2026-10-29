
// ─── LOGO DEL PROFESOR ──────────────────────────────────────────────────────
//
// Uno por profesor, en todos sus anuncios. Desde el 2026-09-25 se muestra al
// tiro, sin revisión (lo resuelve un trigger en el servidor). El estado "en
// revisión" se mantiene por si se vuelve a revisar, o si el SQL no está al día.
// Mismas reglas de archivo que el flyer: JPG, PNG o WebP ≤ 5 MB.
function estadoLogoProfesor(perfil){
  if(!perfil||!('logo_id' in perfil))return 'no-disponible';
  if(perfil.logo_path&&perfil.logo_path!==perfil.logo_aprobado_path)return 'en-revision';
  return perfil.logo_aprobado_path?'aprobado':'sin-logo';
}

// Logos sin fondo. Un PNG o WebP transparente se muestra tal cual, sin marco.
// El riesgo es el contraste: un logo verde oscuro sin fondo desaparece en el
// tema oscuro. Al cargar se mira la imagen en chico y, solo si es transparente
// y no se leería sobre el fondo que tiene detrás, se le dibuja un contorno
// claro: sigue sin fondo, como lo subió el profesor.
// Un logo con fondo propio (un JPG) no se toca.
function imgLogoClase(url,extra=''){
  return `<img class="logo-clase" src="${esc(url)}" alt="" crossorigin="anonymous"${extra}>`;
}
function luminanciaClase(r,g,b){
  const c=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};
  return .2126*c(r)+.7152*c(g)+.0722*c(b);
}
// El color de fondo real detrás del logo: el primer antepasado que no es
// transparente. Chrome devuelve color-mix() como color(srgb …), en 0–1.
function fondoDetrasClase(el){
  for(let n=el;n&&n.nodeType===1;n=n.parentElement){
    const bg=String(getComputedStyle(n).backgroundColor||'');
    const nums=(bg.match(/-?[\d.]+/g)||[]).map(Number);
    if(nums.length<3)continue;
    const srgb=/^color\(/.test(bg),alfa=nums.length>3?nums[3]:1;
    if(alfa<.5)continue;
    const [r,g,b]=srgb?nums.slice(0,3).map(v=>v*255):nums.slice(0,3);
    return luminanciaClase(r,g,b);
  }
  return 1;
}
function revisarLogoClase(img){
  const caja=img.parentElement;
  if(!caja||!img.naturalWidth)return;
  // Primero el margen transparente: si se recorta, el logo vuelve a cargar y
  // esta función corre de nuevo con la imagen ya recortada.
  try{if(recortarMargenLogoClase(img))return;}catch(e){}
  if(img.dataset.contorno==='1')return;
  // Un logo casi cuadrado o redondo, a la misma altura que uno ancho, queda
  // chico y su texto ilegible (TuApunte, 2026-10-25): se le da más alto.
  if(caja.classList)caja.classList.toggle('logo-cuadrado',img.naturalWidth/img.naturalHeight<1.4);
  let px;
  try{
    const lado=24,canvas=document.createElement('canvas');canvas.width=canvas.height=lado;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,lado,lado);px=ctx.getImageData(0,0,lado,lado).data;
  }catch(e){return;}
  let transparentes=0,suma=0,visibles=0;
  for(let k=0;k<px.length;k+=4){
    if(px[k+3]<200){transparentes++;continue;}
    suma+=luminanciaClase(px[k],px[k+1],px[k+2]);visibles++;
  }
  caja.classList.remove('logo-contorno');
  if(!visibles||transparentes/(px.length/4)<.1)return;
  const logo=suma/visibles,fondo=fondoDetrasClase(caja);
  if((Math.max(logo,fondo)+.05)/(Math.min(logo,fondo)+.05)<2)dibujarContornoLogoClase(img,caja);
}
// Se prepara una vez, a la resolución original (sin achicar nada; después el
// navegador escala la imagen como cualquier otra). Dos arreglos (TuApunte,
// 2026-10-25: un círculo dentro de un PNG de 1080×1350, con las letras
// caladas):
// - El margen transparente se recorta: si no, el logo ocupa dos tercios de su
//   espacio y se ve chico.
// - Si el logo es una insignia (un círculo o un cuadrado lleno), sus huecos se
//   rellenan de blanco. Las letras caladas se diseñaron sobre blanco: en el
//   tema oscuro dejaban ver el fondo y desaparecían. Un logo de solo letras no
//   se toca: el interior de su «o» no es un hueco de insignia.
function recortarMargenLogoClase(img){
  if(img.dataset.recorte)return false;
  img.dataset.recorte='1';
  const W=img.naturalWidth,H=img.naturalHeight,esc=128/Math.max(W,H);
  const sw=Math.max(1,Math.round(W*esc)),sh=Math.max(1,Math.round(H*esc));
  const c=document.createElement('canvas');c.width=sw;c.height=sh;
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,sw,sh);
  const d=x.getImageData(0,0,sw,sh).data;
  let x0=sw,y0=sh,x1=-1,y1=-1;
  for(let y=0;y<sh;y++)for(let i=0;i<sw;i++)if(d[(y*sw+i)*4+3]>8){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return false;
  // A píxeles originales, con un píxel de muestra de holgura por lado.
  const ox=Math.max(0,Math.floor((x0-1)/esc)),oy=Math.max(0,Math.floor((y0-1)/esc));
  let ow=Math.min(W,Math.ceil((x1+2)/esc))-ox,oh=Math.min(H,Math.ceil((y1+2)/esc))-oy;
  const recorta=ow*oh<=W*H*.85;
  // Un logo enorme se trabaja a 1200 px como máximo, bajando de a la mitad.
  const tope=Math.min(1,1200/Math.max(ow,oh)),fw=Math.max(1,Math.round(ow*tope)),fh=Math.max(1,Math.round(oh*tope));
  const recorte=document.createElement('canvas');recorte.width=ow;recorte.height=oh;
  recorte.getContext('2d').drawImage(img,ox,oy,ow,oh,0,0,ow,oh);
  const r=tope<1?reducirImagenClase({naturalWidth:ow,naturalHeight:oh,_c:recorte},fw,fh):recorte;
  const rellena=rellenarHuecosInsigniaClase(r);
  if(!recorta&&!rellena)return false;
  img.src=r.toDataURL('image/png');
  return true;
}
// Lo transparente que toca el borde es el exterior; lo transparente encerrado
// es un hueco. Solo si lo encerrado por la silueta ocupa al menos el 60% del
// recuadro (un círculo ocupa el 78%) es una insignia y se rellena.
function rellenarHuecosInsigniaClase(canvas){
  const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d',{willReadFrequently:true});
  const im=ctx.getImageData(0,0,w,h),d=im.data,n=w*h;
  const fuera=new Uint8Array(n),cola=new Int32Array(n);let ini=0,fin=0;
  const mirar=p=>{if(!fuera[p]&&d[p*4+3]<250){fuera[p]=1;cola[fin++]=p;}};
  for(let i=0;i<w;i++){mirar(i);mirar((h-1)*w+i);}
  for(let y=0;y<h;y++){mirar(y*w);mirar(y*w+w-1);}
  while(ini<fin){
    const p=cola[ini++],px=p%w;
    if(px>0)mirar(p-1);if(px<w-1)mirar(p+1);if(p>=w)mirar(p-w);if(p<n-w)mirar(p+w);
  }
  let dentro=0,huecos=0;
  for(let p=0;p<n;p++)if(!fuera[p]){dentro++;if(d[p*4+3]<250)huecos++;}
  if(!huecos||dentro<n*.6)return false;
  for(let p=0;p<n;p++){
    if(fuera[p])continue;
    const k=p*4,a=d[k+3]/255;
    if(a>=1)continue;
    d[k]=Math.round(d[k]*a+255*(1-a));d[k+1]=Math.round(d[k+1]*a+255*(1-a));d[k+2]=Math.round(d[k+2]*a+255*(1-a));d[k+3]=255;
  }
  ctx.putImageData(im,0,0);
  return true;
}
// Safari achica una imagen grande en un canvas de una vez y sin suavizado;
// bajando de a la mitad cada paso promedia bien. Se usa para la silueta.
function reducirImagenClase(img,w,h){
  let fuente=img._c||img,fw=img.naturalWidth,fh=img.naturalHeight;
  while(fw/2>=w*1.5&&fh/2>=h*1.5){
    const paso=document.createElement('canvas');paso.width=Math.round(fw/2);paso.height=Math.round(fh/2);
    const cp=paso.getContext('2d');cp.imageSmoothingEnabled=true;cp.imageSmoothingQuality='high';
    cp.drawImage(fuente,0,0,paso.width,paso.height);fuente=paso;fw=paso.width;fh=paso.height;
  }
  const out=document.createElement('canvas');out.width=w;out.height=h;
  const co=out.getContext('2d');co.imageSmoothingEnabled=true;co.imageSmoothingQuality='high';
  co.drawImage(fuente,0,0,w,h);
  return out;
}
// El contorno va en una capa aparte, detrás del logo. Antes el logo se
// redibujaba dentro del canvas del contorno, y Safari al achicarlo borraba
// las letras finas (TuApunte en iPhone, 2026-10-25). Ahora el logo es la
// imagen original, que el navegador escala bien, y el canvas solo lleva el
// borde fino del color del texto y un halo suave. Antes era un `filter:
// drop-shadow`, que Safari dibujaba como un halo borroso (2026-09-26).
function dibujarContornoLogoClase(img,caja){
  try{
    caja.querySelectorAll('.logo-clase-borde').forEach(b=>b.remove());
    const dpr=Math.min(3,Math.max(1,(typeof devicePixelRatio==='number'&&devicePixelRatio)||1));
    // El tamaño con que se ve el logo: object-fit: contain dentro de su caja.
    const bw=img.clientWidth||caja.clientWidth||44,bh=img.clientHeight||caja.clientHeight||44;
    const k=Math.min(bw/img.naturalWidth,bh/img.naturalHeight);
    const w=Math.max(1,Math.round(img.naturalWidth*k*dpr)),h=Math.max(1,Math.round(img.naturalHeight*k*dpr));
    const borde=1.2*dpr,halo=3.5*dpr,pad=Math.ceil(halo+1);
    const color=String(getComputedStyle(caja).getPropertyValue('--fg')||'').trim()||'#f1f1f3';
    // La silueta del logo en el color del texto.
    const sil=document.createElement('canvas');sil.width=w;sil.height=h;
    const cs=sil.getContext('2d');cs.drawImage(reducirImagenClase(img,w,h),0,0);
    cs.globalCompositeOperation='source-in';cs.fillStyle=color;cs.fillRect(0,0,w,h);
    const out=document.createElement('canvas');out.width=w+2*pad;out.height=h+2*pad;
    const co=out.getContext('2d');
    // Halo suave: la silueta corrida en un anillo ancho, casi transparente.
    co.globalAlpha=.07;
    for(let n=0;n<24;n++){const a=n/24*2*Math.PI;co.drawImage(sil,pad+Math.cos(a)*halo,pad+Math.sin(a)*halo);}
    // Borde fino y opaco.
    co.globalAlpha=1;
    for(let n=0;n<16;n++){const a=n/16*2*Math.PI;co.drawImage(sil,pad+Math.cos(a)*borde,pad+Math.sin(a)*borde);}
    // Debajo del logo no queda nada: solo el anillo de afuera.
    co.globalCompositeOperation='destination-out';co.drawImage(sil,pad,pad);
    const capa=document.createElement('img');
    capa.className='logo-clase-borde';capa.alt='';capa.setAttribute('aria-hidden','true');
    capa.src=out.toDataURL('image/png');
    capa.style.width=out.width/dpr+'px';capa.style.height=out.height/dpr+'px';
    capa.style.left=img.offsetLeft+img.offsetWidth/2+'px';capa.style.top=img.offsetTop+img.offsetHeight/2+'px';
    caja.insertBefore(capa,img);
    img.dataset.contorno='1';
    caja.classList.add('logo-contorno');
  }catch(e){}
}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
  // load y error no burbujean: se escuchan en captura para todos los logos.
  document.addEventListener('load',e=>{
    const img=e.target;if(img&&img.classList&&img.classList.contains('logo-clase'))revisarLogoClase(img);
  },true);
  // Si el almacenamiento no respondiera con CORS, la imagen se carga igual,
  // sin revisión de contraste: nunca un logo roto por esto.
  document.addEventListener('error',e=>{
    const img=e.target;
    if(img&&img.classList&&img.classList.contains('logo-clase')&&img.hasAttribute('crossorigin')){const src=img.src;img.removeAttribute('crossorigin');img.src=src;}
  },true);
}

async function subirLogoProfesor(file){
  const valido=validarFlyerClase(file);
  if(!valido.ok)return {ok:false,error:valido.error.replace(/flyer/gi,'logo')};
  if(valido.opcional)return {ok:false,error:'Elige una imagen para tu logo.'};
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para subir tu logo.'};
  const ficha=await perfilProfesorActual();
  if(!ficha.ok||!ficha.perfil)return {ok:false,error:'No pudimos leer tu ficha de profesor.'};
  const logoId=String(ficha.perfil.logo_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(logoId))return {ok:false,error:'Los logos todavía no están disponibles.'};
  const aleatorio=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'';
  if(!aleatorio)return {ok:false,error:'Tu navegador no pudo preparar un nombre seguro para el logo.'};
  const path=`logos/${logoId}/${aleatorio}.${extensionFlyerClase(file.type)}`;
  try{
    const {error:subidaError}=await supabaseClient.storage.from('tutor-flyers').upload(path,file,{contentType:file.type,upsert:false});
    if(subidaError)return {ok:false,error:'No pudimos subir el logo. Intenta de nuevo.'};
    const {data,error}=await supabaseClient.from('tutor_perfiles').update({logo_path:path})
      .eq('user_id',uid).select('logo_path,logo_aprobado_path').single();
    if(error||!data||data.logo_path!==path){
      await supabaseClient.storage.from('tutor-flyers').remove([path]);
      return {ok:false,error:'El logo subió, pero no pudimos guardarlo en tu ficha. Intenta de nuevo.'};
    }
    // Lo que ya no se muestra sobra. Sin revisión el servidor iguala las dos
    // columnas al tiro, así que el logo anterior también se va. Si algún día
    // se vuelve a revisar, el que se sigue mostrando se conserva.
    const enUso=new Set([path,data.logo_aprobado_path].filter(Boolean));
    const sobran=[...new Set([ficha.perfil.logo_path,ficha.perfil.logo_aprobado_path].filter(r=>r&&!enUso.has(r)))];
    if(sobran.length)try{await supabaseClient.storage.from('tutor-flyers').remove(sobran);}catch(e){}
    return {ok:true,perfil:{...ficha.perfil,...data}};
  }catch(e){return {ok:false,error:'No pudimos subir el logo. Intenta de nuevo.'};}
}

async function quitarLogoProfesor(){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para quitar tu logo.'};
  const ficha=await perfilProfesorActual();
  if(!ficha.ok||!ficha.perfil)return {ok:false,error:'No pudimos leer tu ficha de profesor.'};
  try{
    const {error}=await supabaseClient.rpc('quitar_mi_logo');
    if(error)return {ok:false,error:'No pudimos quitar el logo. Intenta de nuevo.'};
    // Ya no se muestra en ninguna parte aunque falle la limpieza de Storage.
    const rutas=[ficha.perfil.logo_path,ficha.perfil.logo_aprobado_path].filter(Boolean);
    if(rutas.length)try{await supabaseClient.storage.from('tutor-flyers').remove([...new Set(rutas)]);}catch(e){}
    return {ok:true};
  }catch(e){return {ok:false,error:'No pudimos quitar el logo. Intenta de nuevo.'};}
}

// Logos aprobados de los anuncios del catálogo, por id de anuncio. El
// catálogo no conoce al autor de cada anuncio y no tiene por qué conocerlo.
async function logosDeAnuncios(ids){
  const lista=[...new Set((ids||[]).filter(id=>/^[0-9a-f-]{36}$/i.test(String(id))))].slice(0,100);
  if(!supabaseClient||!lista.length)return new Map();
  try{
    const {data,error}=await supabaseClient.rpc('logos_de_anuncios',{p_ids:lista});
    if(error||!Array.isArray(data))return new Map();
    return new Map(data.filter(f=>f&&f.anuncio_id&&f.logo_path).map(f=>[f.anuncio_id,f.logo_path]));
  }catch(e){return new Map();}
}

function siglaAnuncio(sigla){
  return String(sigla||'').trim().toUpperCase();
}

function siglaRamoParaClases(ramo){
  const origen=ramo&&ramo.origen;
  if(!origen||!origen.tenant)return '';
  // La app ya sella siglas al cargar el catálogo, incluidas UAI y UAndes.
  // Los ramos antiguos recurren al mismo resolutor que la ficha, sin inferir
  // que cualquier ramoKey sea una sigla (en FEN suele ser un nombre).
  return siglaAnuncio(ramo.sigla||siglaDeRamo(ramo,origen.tenant));
}

// Recibe anuncios ya descargados y ramos que YA viven en el navegador. Esta
// operación no llama a Supabase ni envía notas o ramos para elegir el aviso.
function anunciosParaRamosLocales(anuncios,ramos){
  const porUniversidad=new Map();
  (Array.isArray(ramos)?ramos:[]).forEach(r=>{
    const sigla=siglaRamoParaClases(r),tenant=r&&r.origen&&r.origen.tenant;
    if(!sigla||!tenant)return;
    if(!porUniversidad.has(tenant))porUniversidad.set(tenant,new Set());
    porUniversidad.get(tenant).add(sigla);
  });
  return (Array.isArray(anuncios)?anuncios:[]).map(anuncio=>{
    const siglas=porUniversidad.get(anuncio&&anuncio.tenant);
    if(!siglas)return null;
    const coinciden=(Array.isArray(anuncio&&anuncio.ramos_siglas)?anuncio.ramos_siglas:[])
      .map(siglaAnuncio).filter(sigla=>siglas.has(sigla));
    return coinciden.length?{...anuncio,siglasCoincidentes:coinciden}:null;
  }).filter(Boolean);
}

// No hay una regla oculta por defecto: cada campaña declara su público.
// Un aviso antiguo sin criterios sigue en el catálogo general, pero no se
// personaliza hasta que el anunciante y el equipo acuerden ese público.
function criteriosClaseValidos(c){
  return !!c&&typeof c==='object'&&!Array.isArray(c)&&
    Object.keys(c).length===2&&Number.isFinite(c.promedioMenorA)&&
    c.promedioMenorA>1&&c.promedioMenorA<=7&&Number.isFinite(c.avanceMinimo)&&
    c.avanceMinimo>=0&&c.avanceMinimo<100;
}
// La próxima evaluación sin nota del ramo según su Agenda, si cae entre hoy y
// los próximos DIAS_ANTES_EVALUACION_CLASES días; si no, null. Misma regla
// que agendaEvents: una nota con fecha propia es su propia evaluación, y la
// fecha del grupo cuenta mientras le falten notas para sus casillas.
const DIAS_ANTES_EVALUACION_CLASES=7;
function proximaEvaluacionClases(ramo,ahora=Date.now()){
  const desde=diaLocalClases(ahora),hasta=diaLocalClases(ahora+DIAS_ANTES_EVALUACION_CLASES*864e5);
  const enVentana=f=>typeof f==='string'&&f>=desde&&f<=hasta;
  let proxima=null;
  const anotar=f=>{if(enVentana(f)&&(!proxima||f<proxima))proxima=f;};
  (ramo&&ramo.categorias||[]).forEach(c=>{
    if(typeof categoriaEximida==='function'&&categoriaEximida(ramo,c))return;
    const notas=c.notas||[];
    notas.forEach(n=>{if(n.fecha&&(n.valor===null||n.valor===undefined))anotar(n.fecha);});
    if(c.fecha&&notas.filter(n=>!n.fecha).length<(c.slots||1))anotar(c.fecha);
  });
  return proxima;
}

function seleccionarClaseApoyo(anuncios,ramos,tenant,{descartados=[],ahora=Date.now(),turno=0}={}){
  // Primero los ramos con una evaluación en los próximos días, la más cercana
  // antes (#664: con la prueba encima es cuando alguien escribe a un profesor).
  // Los demás quedan detrás en el orden que eligió la persona, así que quien no
  // tiene fechas en la Agenda ve lo mismo que antes.
  const propios=(Array.isArray(ramos)?ramos:[]).filter(r=>r&&r.origen&&r.origen.tenant===tenant)
    .map((r,i)=>({r,i,f:proximaEvaluacionClases(r,ahora)}))
    .sort((x,y)=>x.f&&y.f?(x.f<y.f?-1:x.f>y.f?1:x.i-y.i):x.f?-1:y.f?1:x.i-y.i)
    .map(x=>x.r);
  const omitidos=new Set(descartados);
  const disponibles=anunciosParaRamosLocales(anuncios,propios).filter(a=>
    a.tenant===tenant&&a.estado==='publicado'&&!omitidos.has(a.id)&&
    (a.vence_at==null||Date.parse(a.vence_at)>ahora)&&criteriosClaseValidos(a.criterios));
  // Después de la próxima evaluación, el orden de ramos que eligió la persona
  // manda. Si varios avisos calzan con
  // el mismo ramo, se alternan en cada apertura de la app: antes ganaba siempre
  // el publicado último, y un profesor con dos clases del mismo ramo casi no
  // veía la otra en Inicio (Salva Ramos, 2026-09-30). Se entrega como máximo
  // una tarjeta, sin escribir ninguna preferencia en S.
  for(const ramo of propios){
    const sigla=siglaRamoParaClases(ramo);
    const candidatos=disponibles.filter(a=>a.siglasCoincidentes.includes(sigla));
    if(!candidatos.length)continue;
    const cats=ramo.categorias||[];
    const total=cats.reduce((s,c)=>s+Number(c.peso||0),0);
    // Las evaluaciones del ramo suman 100 aunque tenga un laboratorio
    // vinculado: el motor combina ese `aporta` encima (Dinámica: 70% cátedra,
    // 30% laboratorio). Esperar 100 menos el laboratorio dejaba sin
    // recomendación a todo el que cursa Dinámica.
    if(!Number.isFinite(total)||Math.abs(total-100)>0.01||
      cats.some(c=>!Number.isFinite(Number(c.peso))||Number(c.peso)<0||c.lista))continue;
    const avance=ramoProgress(ramo);
    if(!Number.isFinite(avance.total)||avance.total<=0||!Number.isFinite(avance.pending)||avance.pending<=0)continue;
    // `pct` está redondeado para la pantalla: 19,9% no debe cumplir 20%.
    const evaluado=100*(avance.total-avance.pending)/avance.total;
    const promedio=ramoAvg(ramo,undefined,ramos);
    if(!Number.isFinite(promedio))continue;
    // Orden estable por id: la rotación no cambia porque llegue otro aviso a la lista.
    const calzan=candidatos.filter(a=>promedio<a.criterios.promedioMenorA&&evaluado+1e-9>=a.criterios.avanceMinimo)
      .sort((x,y)=>String(x.id)<String(y.id)?-1:String(x.id)>String(y.id)?1:0);
    if(calzan.length){
      const i=Number.isSafeInteger(turno)?((turno%calzan.length)+calzan.length)%calzan.length:0;
      return {anuncio:calzan[i],ramo};
    }
  }
  return null;
}
