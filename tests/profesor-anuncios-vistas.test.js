// El panel de producción con DOM y datos sintéticos. Ningún registro ni cobro.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function nodo(dataset={}){
  return {dataset,hidden:false,isConnected:true,attrs:{},eventos:{},value:'',textContent:'',
    setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.eventos[k]=fn}};
}
const activo={id:'activo',estado:'publicado',titulo:'Álgebra publicada',ramos_siglas:['SYN101'],modalidad:'individual',ubicacion:'online'};
const programado={...activo,id:'futuro',titulo:'Taller de química',ramos_siglas:['SYN202'],publicado_at:'2099-01-01T00:00:00Z'};
const borrador={...activo,id:'borrador',estado:'borrador',titulo:'Texto en borrador'};
const pausado={...activo,id:'pausado',estado:'pausado',titulo:'Álgebra de antes'};
const anuncios=[activo,programado,borrador,pausado];
function raiz(items){
  const segmentos=['activas','revision','historial'].map(v=>nodo({profesorSeccion:v}));
  const filas=new Map(), detalles=new Map(), banners=new Map();
  for(const {id,estado} of items){
    const fila=nodo({profesorFila:id}),detalle=nodo({profesorAnuncio:id}),summary=nodo();
    summary.focus=()=>{summary.enfocado=true};summary.scrollIntoView=()=>{};
    detalle.querySelector=s=>s==='summary'?summary:null;
    detalles.set(id,detalle);filas.set(id,fila);
    if(estado==='publicado'){
      const banner=nodo({profesorBanner:id}),boton=nodo();
      banner.querySelector=s=>s==='.clase-apoyo-abrir'?boton:null;
      banners.set(id,banner);
    }
    fila.querySelector=s=>s==='[data-profesor-banner]'?banners.get(id):null;
  }
  const nodos=new Map(['#profesor-anuncios-buscar','#profesor-anuncios-estado','[data-profesor-cantidad]','[data-profesor-vacio]','[data-profesor-comentarios]','[data-profesor-sin-activas]',
    ...items.flatMap(a=>[`[data-metricas="${a.id}"]`,`[data-costo-campana="${a.id}"]`])].map(s=>[s,nodo()]));
  return {innerHTML:'',filas,banners,detalles,segmentos,querySelector:s=>nodos.get(s)||null,querySelectorAll(s){
    return {'[data-profesor-fila]':[...filas.values()],'[data-profesor-seccion]':segmentos,
      '[data-profesor-banner]':[...banners.values()],'[data-profesor-anuncio]':[...detalles.values()]}[s]||[];
  }};
}

(async()=>{
  let medidas=0;
  const llamadas=[];
  const ctx=vm.createContext({console,Intl,esc,S:{tenant:'uc'},currentUser:{id:'profesor-sintetico'},enAppNativa:()=>false,anuncios,
    supabaseClient:{rpc:async n=>{llamadas.push(n);return {data:n==='campana_anuncio_con_tarifa'
      ?[{dias:14,tope_clp:15000,vistas:8,aperturas:2,contactos:1,dias_cobrados:2}]:[]};},
    from:t=>{assert.equal(t,'tutor_anuncio_ediciones');return {select:async()=>({data:[{anuncio_id:'activo',estado:'pendiente',datos:{titulo:'Título privado propuesto'}}]})}}},
    medir:()=>{medidas++}});
  vm.runInContext(leer('marketplace.js'),ctx);
  const run=s=>vm.runInContext(s,ctx);
  run('registrarInteraccionMedida=medir;registrarMetricaAnuncio=medir;registrarAlcanceAnuncio=medir;observarImpresionesClases=medir;observarRecomendacionClase=medir');
  const render=r=>{ctx.panel=r;return run("renderPanelProfesor(panel,anuncios,{cabecera:()=>'',salida:()=>''})")};
  const panel=raiz(anuncios);
  await render(panel);
  const visibles=()=>[...panel.filas].filter(([,f])=>!f.hidden).map(([id])=>id);
  const buscar=panel.querySelector('#profesor-anuncios-buscar'),estado=panel.querySelector('#profesor-anuncios-estado');
  const segmento=v=>panel.segmentos.find(x=>x.dataset.profesorSeccion===v);
  const fila=panel.detalles.get('activo'),metrica=panel.querySelector('[data-metricas="activo"]');
  assert.equal(segmento('activas').attrs['aria-pressed'],'true');
  assert.deepEqual(visibles(),['activo','futuro']);
  assert.equal((panel.innerHTML.match(/<aside class="clase-apoyo"/g)||[]).length,2);
  assert.doesNotMatch(panel.innerHTML,/clase-apoyo-cerrar|Título privado propuesto/);
  assert.match(panel.innerHTML,/Tus cambios están en revisión/);
  assert.equal((panel.innerHTML.match(/data-metricas="activo"/g)||[]).length,1);
  panel.banners.get('activo').querySelector('.clase-apoyo-abrir').eventos.click();
  assert(fila.open&&fila.querySelector('summary').enfocado);
  segmento('revision').eventos.click();
  assert.deepEqual(visibles(),['activo','borrador']);
  assert.equal(panel.banners.get('activo').hidden,true);
  assert.equal(panel.detalles.get('activo'),fila);
  assert(metrica.innerHTML.includes('estadi'), 'el mismo detalle conserva las cifras');
  buscar.value='algebra syn101';buscar.eventos.input();
  assert.deepEqual(visibles(),['activo']);
  estado.value='borrador';estado.eventos.change();
  assert.deepEqual(visibles(),[]);
  assert.match(panel.querySelector('[data-profesor-vacio]').textContent,/No encontramos/);
  segmento('historial').eventos.click();
  assert.equal(buscar.value,'algebra syn101');
  assert.deepEqual(visibles(),['pausado']);
  await render(panel);
  assert.equal(segmento('historial').attrs['aria-pressed'],'true');
  assert.deepEqual(visibles(),['pausado']);
  run("vistaClasesAlVolver='anuncios'");
  await render(panel);
  assert.equal(segmento('activas').attrs['aria-pressed'],'true');
  assert.deepEqual(visibles(),['activo','futuro']);
  assert.equal(medidas,0);
  assert(llamadas.every(n=>!/registrar|impresion|cobrar/.test(n)));
  ctx.anuncios=[borrador,pausado];
  const sinActivas=raiz(ctx.anuncios);await render(sinActivas);
  assert.equal(sinActivas.segmentos[1].attrs['aria-pressed'],'true','sin activas abre En revisión antes de Historial');
  assert.equal(sinActivas.querySelector('[data-profesor-sin-activas]').hidden,false);
  assert.match(sinActivas.innerHTML,/No tienes anuncios activos/);
  console.log('OK vistas del profesor: banner publicado, revisión, filtros, detalle estable y sin medición');
})().catch(e=>{console.error(e);process.exitCode=1;});
