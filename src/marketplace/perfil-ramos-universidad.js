// La asociación es declarada por el dueño. Nunca se deduce por nombre o catálogo.
function validarRamosUniversidadPerfil(e,universidades){
  const error=texto=>({ok:false,campo:'ramos',error:texto});
  if(e.ramos_sin_universidad)return error('Asigna los ramos pendientes a una universidad antes de guardar.');
  if(!Object.prototype.hasOwnProperty.call(e,'ramos_por_universidad'))return {ok:true,datos:{}};
  const mapa=e.ramos_por_universidad;
  if(mapa===null)return {ok:true,datos:{ramos_por_universidad:null}};
  if(typeof mapa!=='object'||Array.isArray(mapa))return error('Revisa los ramos de cada universidad.');
  const limpio={},union=[];let total=0;
  for(const [uni,siglas] of Object.entries(mapa)){
    if(!universidades.includes(uni)||!UNIVERSIDADES_PERFIL.some(([v])=>v===uni)||!Array.isArray(siglas))return error('Revisa las universidades de tus ramos.');
    if(siglas.some(s=>typeof s!=='string'||!/^[A-Z0-9-]{2,24}$/.test(s)))return error('Escribe siglas de 2 a 24 caracteres, sin espacios.');
    total+=siglas.length;if(total>20)return error('Puedes poner hasta 20 ramos entre todas las universidades.');
    limpio[uni]=[...new Set(siglas)];
  }
  universidades.forEach(u=>(limpio[u]||[]).forEach(s=>{if(!union.includes(s))union.push(s);}));
  return {ok:true,datos:{ramos_por_universidad:limpio},union};
}
function ramosUniversidadPerfilHTML(p){
  const mapa=p.ramos_por_universidad;
  if(mapa&&typeof mapa==='object'&&!Array.isArray(mapa))return Object.entries(mapa).filter(([,s])=>s.length).map(([u,s])=>`<section><h4>${esc((UNIVERSIDADES_PERFIL.find(([v])=>v===u)||[])[1]||u)}</h4><p class="profesor-info">${s.map(esc).join(' · ')}</p></section>`).join('');
  return (p.ramos_siglas||[]).length?`<p class="profesor-info">${esc(p.ramos_siglas.join(' · '))}${(p.universidades||[]).length>1?' · Sin universidad asignada':''}</p>`:'';
}
function buscadorRamosPerfilHTML(siglas,sufijo='',titulo='Ramos'){
  const id='pf-ramos'+sufijo;
  return `<label class="modal-label" for="${id}-buscar">${esc(titulo)}</label><div class="profesor-ramos" id="${id}-elegidos" aria-live="polite"></div>
    <div class="profesor-ramos-buscar"><input id="${id}-buscar" type="search" autocomplete="off" autocapitalize="characters" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-resultados" placeholder="Busca por sigla o nombre">
    <ul class="profesor-ramos-resultados" id="${id}-resultados" role="listbox" hidden></ul></div><input id="${id}" type="hidden" value="${esc(siglas.join(', '))}">`;
}
function camposRamosUniversidadHTML(p){
  return `<div data-pf-ramos-editor>${buscadorRamosPerfilHTML(p.ramos_siglas||[])}</div><p class="directorio-error" data-error-directorio="ramos" role="alert"></p>`;
}
function entradaRamosUniversidadFormulario(form){return form.ramosUniversidad?.entrada()||{};}
function enlazarRamosUniversidadPerfil(form,p){
  if(!Object.prototype.hasOwnProperty.call(p,'ramos_por_universidad'))return activarBuscadorRamosPerfil(form);
  const caja=form.querySelector('[data-pf-ramos-editor]'),casillas=[...form.querySelectorAll('[name="pf-uni"]')];
  let unis=casillas.filter(c=>c.checked).map(c=>c.value),editado=false;
  const original=p.ramos_por_universidad,mapa=original?JSON.parse(JSON.stringify(original)):{};
  let pendientes=!original&&unis.length!==1?(p.ramos_siglas||[]).slice():[];
  if(!original&&unis.length===1)mapa[unis[0]]=(p.ramos_siglas||[]).slice();
  const total=()=>pendientes.length+unis.reduce((n,u)=>n+(mapa[u]||[]).length,0);
  const union=()=>[...new Set([...unis.flatMap(u=>mapa[u]||[]),...pendientes])];
  let lectores=[];
  const entrada=()=>{
    if(!unis.length||!editado&&!original||pendientes.length&&unis.length===1)return {ramos_por_universidad:null};
    return {ramos_por_universidad:Object.fromEntries(unis.map(u=>[u,(mapa[u]||[]).slice()])),ramos_sin_universidad:pendientes.length};
  };
  form.ramosUniversidad={entrada};
  const actualizar=()=>{
    const oculto=form.querySelector('#pf-ramos');if(oculto)oculto.value=union().join(', ');
    const error=form.querySelector('[data-error-directorio="ramos"]');error.textContent=total()>20?'Puedes poner hasta 20 ramos entre todas las universidades.':'';
    caja.querySelectorAll('input[type=search]').forEach(n=>{n.disabled=total()>=20;if(unis.length>1)n.placeholder=n.disabled?'Llegaste a 20 ramos. Quita uno para agregar otro.':'Busca por sigla o nombre';});
    if(oculto)oculto.dispatchEvent(new Event('input',{bubbles:true}));
  };
  const pintar=()=>{
    lectores=[];
    if(unis.length<=1){
      caja.innerHTML=buscadorRamosPerfilHTML(union());
      const leerNombres=activarBuscadorRamosPerfil(caja,{universidades:unis,cambio:s=>{if(unis[0]){mapa[unis[0]]=s;pendientes=[];}else pendientes=s;editado=true;actualizar();}});
      lectores.push(leerNombres);return;
    }
    const aviso=pendientes.length>0||!unis.some(u=>(mapa[u]||[]).length);
    caja.innerHTML=`${aviso?'<p class="profesor-info" role="status"><b>Ordena tus ramos por universidad</b></p>':''}
      ${pendientes.length?`<fieldset class="profesor-linea"><legend class="modal-label">Ramos sin universidad</legend>${pendientes.map(s=>`<label class="profesor-info">${esc(s)}<select data-pf-asignar="${esc(s)}" aria-label="Universidad de ${esc(s)}"><option value="">Asignar universidad</option>${unis.map(u=>`<option value="${u}">${(UNIVERSIDADES_PERFIL.find(([v])=>v===u)||[])[1]}</option>`).join('')}</select></label>`).join('')}</fieldset>`:''}
      ${unis.map(u=>`<fieldset class="profesor-linea" data-pf-ramos-uni="${u}"><legend class="modal-label">${(UNIVERSIDADES_PERFIL.find(([v])=>v===u)||[])[1]}</legend>${buscadorRamosPerfilHTML(mapa[u]||[],'-'+u,'Ramos en '+(UNIVERSIDADES_PERFIL.find(([v])=>v===u)||[])[1])}</fieldset>`).join('')}
      <input id="pf-ramos" type="hidden" value="${esc(union().join(', '))}">`;
    lectores=[];
    unis.forEach(u=>{
      const leerNombres=activarBuscadorRamosPerfil(caja.querySelector(`[data-pf-ramos-uni="${u}"]`),{sufijo:'-'+u,universidades:[u],puedeAgregar:()=>total()<20,
        cambio:s=>{mapa[u]=s;editado=true;actualizar();}});
      lectores.push(leerNombres);
    });
    caja.querySelectorAll('[data-pf-asignar]').forEach(n=>n.addEventListener('change',()=>{
      if(!n.value)return;
      const lista=mapa[n.value]||[];mapa[n.value]=[...new Set([...lista,n.dataset.pfAsignar])];pendientes=pendientes.filter(s=>s!==n.dataset.pfAsignar);editado=true;pintar();actualizar();
      (caja.querySelector('[data-pf-asignar]')||caja.querySelector('input[type=search]'))?.focus();
    }));
  };
  casillas.forEach(c=>c.addEventListener('change',()=>{
    const quitar=!c.checked&&unis.includes(c.value),ramos=mapa[c.value]||[];
    const aplicar=()=>{
      if(quitar){delete mapa[c.value];c.checked=false;}
      unis=casillas.filter(n=>n.checked).map(n=>n.value);editado=true;pintar();actualizar();
    };
    if(quitar&&ramos.length){
      c.checked=true;showConfirm('¿Quitar esta universidad?',`Se quitarán sus ${ramos.length} ramos: ${ramos.join(', ')}. Cancela para conservarlos.`,aplicar,{label:'Quitar universidad y ramos',focusCancel:true});
    }else aplicar();
  }));
  pintar();return ()=>Object.assign({},...lectores.map(f=>f()));
}
