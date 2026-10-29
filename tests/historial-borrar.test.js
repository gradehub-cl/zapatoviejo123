// Un semestre entra al historial por dos puertas —archivar el actual o cargar uno
// anterior a mano— y no salía por ninguna. Quien se equivocaba en el año al
// cargarlo quedaba con esa fila para siempre: no se podía renombrar ni borrar, y
// seguía contando en su promedio de carrera. No lanza ningún error; simplemente
// no existe la salida, así que el test la ejerce en vez de mirar el texto.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const app=fs.readFileSync(process.env.GRADEHUB_APP||raiz+'app.js','utf8');
const render=fs.readFileSync(raiz+'render-main.js','utf8');
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

const saca=n=>(app.match(new RegExp('\\nfunction '+n+'\\([\\s\\S]*?\\n\\}'))||[''])[0];

// Se arma el mínimo que estas funciones tocan: el estado y los avisos.
let guardados=0,toasts=[],pedidos=[];
const campo={value:'',style:{},focus(){},setAttribute(){},insertAdjacentHTML(){},remove(){}},campos={};
const ctx={
  S:{tenant:'uc',historial:[
    {id:'a',label:'2024-1',manual:true,ramos:[{id:'r1'},{id:'r2'}]},
    {id:'b',label:'2024-2',ramos:[{id:'r3'}]}
  ]},
  save:()=>{guardados++;},track:()=>{},closeModal:()=>{},renderHome:()=>{},renderStats:()=>{},
  showToast:m=>toasts.push(m),
  showConfirm:(t,d,fn)=>{pedidos.push({t,d,fn});},
  esc:v=>String(v),NOMBRE_MAX:80,COLORS:['#456789'],uid:()=> 'nuevo-'+(++ctx.__uid),__uid:0,
  normName:v=>String(v||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
  creditosDe:nombre=>nombre==='Taller anterior'?20:null,enfocarEnHoja:el=>{if(el&&el.focus)el.focus();},
  document:{getElementById:id=>campos[id]||campo},openModal:()=>{},
  histRamoAvg:r=>typeof r.avgOverride==='number'?r.avgOverride:null,
  nf:(n,d)=>n.toFixed(d==null?1:d),calificacionConceptual:()=>null,
  recomputeHistGpa:h=>{const v=h.ramos.map(r=>r.avgOverride).filter(x=>typeof x==='number');h.gpa=v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}
};
vm.createContext(ctx);
['borrarHistorial','pedirBorrarHistorial','confirmRenombrarHist'].forEach(n=>{
  const src=saca(n);
  if(!src){console.log('  FAIL falta la función '+n);fail++;return;}
  vm.runInContext(src,ctx);
});
const corre=expr=>{try{return vm.runInContext(expr,ctx);}catch(e){console.log('  (error) '+e.message);return undefined;}};

console.log('=== Un semestre del historial se puede eliminar ===');
corre("pedirBorrarHistorial('a')");
// Borrar un semestre entero se pregunta antes: son notas de años que nadie va a
// volver a transcribir.
chk('primero pregunta, no borra al toque', pedidos.length===1 && ctx.S.historial.length===2);
chk('el aviso dice cuánto se pierde', /2 ramos/.test(pedidos[0]?.d||'') && /promedio de carrera/.test(pedidos[0]?.d||''));
if(pedidos[0])pedidos[0].fn();
chk('al confirmar, el semestre desaparece', ctx.S.historial.length===1 && !ctx.S.historial.some(h=>h.id==='a'));
chk('y no se lleva a los demás por delante', ctx.S.historial[0]?.id==='b');
chk('queda guardado en disco', guardados===1);

console.log('\n=== Y se le puede corregir de qué semestre es ===');
// El caso real: el año quedó mal al cargarlo. No se escribe de nuevo —cada quien
// escribía lo que se le ocurría— sino que se elige año y período.
['nombreVerano','cortoPeriodo','etiquetaSemestre','parseEtiquetaSemestre','anioActualSemestre',
 'aniosSemestre','selectorSemestreHTML','openRenombrarHistModal','repintarSelectorHistRename',
 'setAnioHistRename','setPeriodoHistRename','confirmRenombrarHist','semester',
 'alternarBuscadorHistRename','limpiarErrorHistRename','agregarRamoHistRename','quitarRamoHistRename'].forEach(n=>{
  const src=saca(n);
  if(!src){console.log('  FAIL falta la función '+n);fail++;return;}
  vm.runInContext(src,ctx);
});
vm.runInContext((app.match(/\nconst PERIODOS_SEMESTRE=\[[\s\S]*?\n\];/)||[''])[0],ctx);
vm.runInContext((app.match(/\nlet histRename=[^\n]*/)||[''])[0],ctx);

// Se abre sobre el semestre que ya estaba, para no obligar a elegir de nuevo.
corre("openRenombrarHistModal('b')");
chk('se abre en el semestre que la tarjeta ya tenía',
  corre('histRename.anio')===2024 && corre('histRename.periodo')==='2');
corre("setAnioHistRename('2023')");corre("setPeriodoHistRename('1')");
corre("confirmRenombrarHist('b')");
chk('el semestre elegido queda con la forma de siempre', ctx.S.historial[0]?.label==='2023-1');

console.log('\n=== Y "Editar" también corrige las notas finales ===');
vm.runInContext(saca('parseNota'),ctx);
const b=ctx.S.historial[0];
b.ramos=[{id:'r3',nombre:'Cálculo',avgOverride:4.0},{id:'r4',nombre:'Física'}];
corre("openRenombrarHistModal('b')");
chk('muestra la nota que tiene cada ramo', JSON.stringify(corre('histRename.notas'))==='[{"id":"r3","txt":"4.0"},{"id":"r4","txt":""}]');
campos['m-hist-ren-nota-0']={value:'5,5',focus(){}};
campos['m-hist-ren-nota-1']={value:'',focus(){}};
corre("confirmRenombrarHist('b')");
chk('la nota cambiada queda guardada', b.ramos[0].avgOverride===5.5);
chk('y el promedio del semestre se recalcula', b.gpa===5.5);
// Un archivado que nadie toca sigue saliendo de sus evaluaciones.
chk('un ramo en blanco no queda fijo a mano', !('avgOverride' in b.ramos[1]));
campos['m-hist-ren-nota-0']={value:'9',focus(){}};
corre("openRenombrarHistModal('b')");
corre("confirmRenombrarHist('b')");
chk('una nota fuera de escala no se guarda', b.ramos[0].avgOverride===5.5 && /Cálculo/.test(campo.textContent||''));
for(const k in campos)delete campos[k];

console.log('\n=== Agregar ramos al editar conserva lo que ya estaba ===');
ctx.S.historial.push({id:'otro',label:'2020-2',ramos:[{id:'otro-ramo',nombre:'Otro semestre de prueba',avgOverride:6.4}]});
ctx.S.ramos=[{id:'actual',nombre:'Ramo actual',categorias:[{notas:[{valor:6.2}]}]}];
const actualAntes=JSON.stringify(ctx.S.ramos),otroAntes=JSON.stringify(ctx.S.historial.find(h=>h.id!=='b'));
corre("openRenombrarHistModal('b')");
campos['m-hist-ren-nota-0']={value:'5,8',focus(){}};
campos['m-hist-ren-nota-1']={value:'',focus(){}};
const antesAgregar=JSON.stringify(b);
corre("agregarRamoHistRename(encodeURIComponent('Taller anterior'))");
chk('agregar a la hoja todavía no modifica el semestre',JSON.stringify(b)===antesAgregar&&corre('histRename.nuevos.length')===1);
chk('no borra una nota que se estaba corrigiendo',campos['m-hist-ren-nota-0'].value==='5,8');
chk('conserva los créditos conocidos y no inventa evaluaciones',corre('histRename.nuevos[0].creditos')===20&&JSON.stringify(corre('histRename.nuevos[0].categorias'))==='[]');
corre("agregarRamoHistRename(encodeURIComponent('TALLER ANTERIOR'))");
corre("agregarRamoHistRename(encodeURIComponent('Cálculo'))");
chk('no duplica ramos nuevos ni los que ya estaban',corre('histRename.nuevos.length')===1);
const nuevoId=corre('histRename.nuevos[0].id');
campos['m-hist-ren-nueva-'+nuevoId]={value:'',focus(){}};
corre("setAnioHistRename('2022')");
corre("confirmRenombrarHist('b')");
chk('un ramo nuevo sin nota avisa y no guarda cambios parciales',JSON.stringify(b)===antesAgregar&&/Pon la nota final de Taller anterior/.test(campo.textContent));
campos['m-hist-ren-nueva-'+nuevoId].value='8';
corre("confirmRenombrarHist('b')");
chk('una nota nueva fuera de escala tampoco guarda nada',JSON.stringify(b)===antesAgregar&&/Taller anterior/.test(campo.textContent));
corre('limpiarErrorHistRename()');
chk('al corregir no deja un error anterior visible',campo.textContent===''&&campo.style.display==='none');
campos['m-hist-ren-nueva-'+nuevoId].value='6,1';
const guardadosAntes=guardados;
corre("confirmRenombrarHist('b')");
chk('guarda el ramo nuevo en ese semestre con su nota final',b.ramos.length===3&&b.ramos.find(r=>r.id===nuevoId)?.avgOverride===6.1&&b.label==='2022-1');
chk('guarda la corrección anterior en la misma operación',b.ramos[0].avgOverride===5.8&&guardados===guardadosAntes+1);
chk('no toca el semestre actual ni otros semestres',JSON.stringify(ctx.S.ramos)===actualAntes&&JSON.stringify(ctx.S.historial.find(h=>h.id!=='b'))===otroAntes);

corre("openRenombrarHistModal('b')");
corre("agregarRamoHistRename(encodeURIComponent('Electivo sin catálogo'))");
chk('un ramo desconocido queda sin créditos en vez de inventarlos',corre('histRename.nuevos[0].creditos')===null);
const pendienteId=corre('histRename.nuevos[0].id'),antesQuitar=JSON.stringify(b);
corre(`quitarRamoHistRename('${pendienteId}')`);
chk('quitar una fila pendiente no borra ramos guardados',corre('histRename.nuevos.length')===0&&JSON.stringify(b)===antesQuitar);
corre("agregarRamoHistRename(encodeURIComponent('Ramo cancelado'))");
corre("openRenombrarHistModal('b')");
chk('cancelar y volver a abrir descarta únicamente las filas pendientes',corre('histRename.nuevos.length')===0&&JSON.stringify(b)===antesQuitar);
chk('el historial ya no presenta la etiqueta editado',!/hist-edited|Corregido a mano/.test(render));
for(const k in campos)delete campos[k];

// El verano no es "1" ni "2". En la UC se llama TAV; a otra universidad no se le
// presta ese término.
ctx.S.tenant='uc';
chk('en la UC el verano es la TAV', corre("etiquetaSemestre(2024,'v')")==='TAV 2024');
ctx.S.tenant='fen';
chk('en otra universidad se nombra sin pedirle el término prestado a la UC',
  corre("etiquetaSemestre(2024,'v')")==='Verano 2024');

// Ida y vuelta: lo que se guarda se vuelve a leer al reabrir el selector.
ctx.S.tenant='uc';
chk('lo guardado se vuelve a leer', JSON.stringify(corre("parseEtiquetaSemestre(etiquetaSemestre(2022,'v'))"))==='{"anio":2022,"periodo":"v"}');
chk('y también lo que dejó el archivado automático', JSON.stringify(corre("parseEtiquetaSemestre('2025-2')"))==='{"anio":2025,"periodo":"2"}');
// Un semestre cargado a mano antes del selector puede traer cualquier texto: ahí
// no se adivina, se parte del año en curso.
chk('un texto viejo cualquiera no rompe nada', corre("parseEtiquetaSemestre('primero 2024')")===null);

const sel=corre("selectorSemestreHTML(2024,'v','setA','setP')")||'';
chk('el selector ofrece las tres opciones y marca la elegida',
  /Primer semestre/.test(sel) && /Segundo semestre/.test(sel) && /TAV/.test(sel) && /sem-btn sel[\s\S]*TAV/.test(sel));
chk('y ofrece años para atrás, no solo el actual', (corre('aniosSemestre(0)')||[]).length>=10);

// Y el semestre nuevo se elige igual, no se escribe: era el otro lado del mismo
// problema —quien tipeaba mal el año quedaba con esa fila para siempre—.
chk('al cargar un semestre anterior también se elige, no se escribe',
  /<div class="sem-picker" id="m-hist-sem">\$\{selectorSemestreHTML\(histManual\.anio/.test(app) && !/id="m-hist-label"/.test(app));
chk('y lo guardado sale del selector', /const label=etiquetaSemestre\(histManual\.anio,histManual\.periodo\);/.test(app));

console.log('\n=== Se llega a las dos acciones desde el historial ===');
chk('la tarjeta del semestre las ofrece',
  /pedirBorrarHistorial\('\$\{esc\(h\.id\)\}'\)/.test(render) && /openRenombrarHistModal\('\$\{esc\(h\.id\)\}'\)/.test(render));

console.log('\n=== Un semestre cargado a mano no dice "Sem. undefined" ===');
// No viene de ningún semestre de carrera: el archivado sí trae el número, el
// manual no, y el template lo imprimía igual.
const linea=render.split('\n').find(l=>l.includes('margin-top:3px')&&l.includes('ramosHistorial.length'))||'';
const tpl=linea.slice(linea.indexOf('">')+2, linea.lastIndexOf('</div>'));
const pinta=(cs,n)=>{try{return vm.runInNewContext('`'+tpl+'`',{h:{careerSemestre:cs},ramosHistorial:{length:n}});}catch(e){return '';}};
chk('el manual solo muestra sus ramos', pinta(undefined,3)==='3 ramos');
chk('el archivado sigue mostrando su semestre', pinta(4,3)==='Sem. 4 · 3 ramos');
chk('y un ramo no se escribe en plural', pinta(undefined,1)==='1 ramo');

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
