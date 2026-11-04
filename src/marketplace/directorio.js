// Piezas compartidas por el editor y el directorio. Nunca dependen de notas.
const CATEGORIAS_DIRECTORIO=[['clases','Clases particulares'],['material','Material y apuntes'],['laboratorio','Laboratorios y proyectos'],['otro','Otro']];
const CAMPOS_DIRECTORIO='directorio_id,categorias,etiqueta,color_tarjeta,en_directorio,contacto_tipo,contacto_valor,destacado_hasta';
function colorTarjetaDirectorio(color){return /^#[0-9a-f]{6}$/.test(String(color))?color:'#126b63';}
function luminanciaDirectorio(color){
  const rgb=colorTarjetaDirectorio(color).slice(1).match(/../g).map(x=>parseInt(x,16)/255)
    .map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb.reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
}
function textoTarjetaDirectorio(color){
  const l=luminanciaDirectorio(color);
  return (l+.05)/.05>=1.05/(l+.05)?'#000000':'#ffffff';
}
// Misma escala y mínimo público que el rating de docentes universitarios.
// Los perfiles del directorio aún no tienen esa fuente: nunca se cruza por nombre.
function valoracionDirectorioHTML(estado){
  const total=Math.max(0,Number(estado&&estado.total)||0),promedio=estado&&estado.promedio!=null?Number(estado.promedio):NaN;
  if(total<3||!Number.isFinite(promedio)||promedio<1||promedio>5)
    return '<span class="directorio-valoracion directorio-sin-valoraciones">Sin valoraciones</span>';
  const nota=promedio.toFixed(1);
  return `<span class="directorio-valoracion" aria-label="${nota} de 5 estrellas"><span aria-hidden="true">★</span> <strong aria-hidden="true">${nota}</strong></span>`;
}
function tarjetaDirectorioHTML(p,{previa=false,logoURL=''}={}){
  const color=colorTarjetaDirectorio(p.color_tarjeta),texto=textoTarjetaDirectorio(color);
  const tag=previa?'div':'button',id=String(p.id||p.directorio_id||'');
  return `<${tag} ${previa?'':`type="button" data-directorio-perfil="${esc(id)}"`} class="directorio-tarjeta" style="--directorio-color:${color};--directorio-texto:${texto}">
    <span class="directorio-tarjeta-cabeza"><span class="directorio-etiqueta">${esc(p.etiqueta||'Tu etiqueta')}</span>${valoracionDirectorioHTML(p.calificacion)}</span>
    <span class="directorio-identidad"><span class="directorio-textos"><strong class="directorio-nombre">${esc(p.nombre_publico||'Tu nombre público')}</strong>
      <span class="directorio-siglas">${esc((p.ramos_siglas||[]).slice(0,3).join(' · '))}</span></span>
      <span class="directorio-avatar" aria-hidden="true"${p.logo_path?` data-directorio-logo="${esc(p.logo_path)}"`:''}>${logoURL?imgLogoClase(logoURL):esc(String(p.nombre_publico||'P').charAt(0))}</span></span>
  </${tag}>`;
}
async function perfilConDirectorio(p){
  const uid=sesionProfesorClase();
  if(!uid||!p)return p;
  try{
    const {data,error}=await supabaseClient.from('tutor_perfiles').select(CAMPOS_DIRECTORIO).eq('user_id',uid).maybeSingle();
    if(uid!==sesionProfesorClase())return null;
    return !error&&data?{...p,...data,directorioDisponible:true}:{...p,directorioDisponible:false};
  }catch(e){return uid===sesionProfesorClase()?{...p,directorioDisponible:false}:null;}
}
