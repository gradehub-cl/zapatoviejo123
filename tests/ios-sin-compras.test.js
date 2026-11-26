// App Review 3.1.1 (Lucas, 2026-11-17): en la app de iPhone no se compra ni se
// configura publicidad. El profesor crea, renueva y paga sus campañas en la web;
// en la app ve sus anuncios y sus números y puede pausarlos, sin costo, tope,
// presupuesto ni botones que lleven al editor de campañas. En la web no cambia.
// Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'../marketplace.js'),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const ANUNCIO={id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',estado:'publicado',publicado_at:'2026-01-01T00:00:00Z',vence_at:'2099-01-01T00:00:00Z',titulo:'Clase sintética',ramos_siglas:['MAT1620'],precio_clp:15000};
const ANUNCIOS=[ANUNCIO,{...ANUNCIO,id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',estado:'pausado'},
  {...ANUNCIO,id:'cccccccc-cccc-4ccc-cccc-cccccccccccc',estado:'borrador'}];
function contexto(nativa){
  const ctx={console:{...console,warn(){}},Intl,S:{tenant:'uc'},currentUser:{id:'profesor-sintetico'},
    esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])),
    showConfirm(){},showToast(){},enAppNativa:()=>nativa,
    supabaseClient:{rpc:async n=>({data:n==='campana_anuncio_con_tarifa'?[{dias:14,tope_clp:15000,dias_cobrados:4,vistas:120,aperturas:12,contactos:2}]
      :n==='alcance_anuncio'?120:n==='comentarios_devolucion_profesor'?[{anuncio_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc',comentario:'Corrige el contacto.'}]:[],error:null}),
      from(){const q={select(){return q;},eq(){return q;},async maybeSingle(){return {data:null,error:null};},async single(){return {data:null,error:null};}};return q;}}};
  vm.createContext(ctx);vm.runInContext(src,ctx);return ctx;
}
function raiz(){const nodos=new Map();return {innerHTML:'',querySelector(sel){if(!nodos.has(sel))nodos.set(sel,{textContent:'',innerHTML:'',isConnected:true,querySelectorAll(){return [];},querySelector(){return null;},addEventListener(){}});return nodos.get(sel);},querySelectorAll(){return [];},nodos};}
(async()=>{
  for(const nativa of [true,false]){
    const ctx=contexto(nativa),r=raiz();ctx.r=r;ctx.anuncios=ANUNCIOS;
    await vm.runInContext("renderPanelProfesor(r,anuncios,{cabecera:()=>'',salida:()=>''})",ctx);
    const html=r.innerHTML,metricas=r.querySelector(`[data-metricas="${ANUNCIO.id}"]`).innerHTML,kpis=r.querySelector('#clases-kpis').innerHTML;
    const todo=html+metricas+kpis;
    const donde=nativa?'app':'web';
    console.log(`=== ${donde} ===`);
    chk(`${donde}: campanasSeCompranAqui() = ${!nativa}`,vm.runInContext('campanasSeCompranAqui()',ctx)===!nativa);
    chk(`${donde}: se conserva el banner y su fila de campaña`,/data-profesor-banner/.test(html)&&/data-profesor-anuncio/.test(html));
    if(nativa){
      chk('app: sin «Crear anuncio» ni «Crear tu primer anuncio»',!/Crear anuncio|Crear tu primer anuncio|id="clase-nueva"|data-cr-crear/.test(html));
      chk('app: sin «Costo de campaña», «Tope» ni «Presupuesto»',!/Costo de campaña|Costo acumulado|Presupuesto utilizado|>Tope<|Va costando|Por contacto|Costo por concepto/.test(todo));
      chk('app: sin pesos de campaña a la vista (el precio de la clase sí puede estar)',!/\$4\.200|\$15\.000 de tope|de tu tope/.test(todo));
      chk('app: sin «Volver a publicar», «Seguir editando» ni «Revisar»',!/data-retomar|data-editar/.test(html));
      chk('app: Pausar sigue disponible',/data-pausar="aaaaaaaa/.test(html));
      chk('app: el devuelto se ve con su comentario',/Corrige el contacto/.test(html));
      chk('app: las cifras de alcance siguen',/Vistas/.test(kpis)&&/Contactos/.test(kpis));
      const caja={innerHTML:'sin tocar'};ctx.caja=caja;
      vm.runInContext('renderBorradorProfesor(caja,null)',ctx);
      chk('app: el editor de campañas no se abre',caja.innerHTML==='sin tocar');
      chk('app: ni un «hazlo en la web»',!/en la web|gradehub\.cl|desde el computador/i.test(todo));
    }else{
      chk('web: «Crear anuncio» sigue',/id="clase-nueva"/.test(html));
      chk('web: «Costo de campaña» y presupuesto siguen',/Costo de campaña/.test(html)&&/Presupuesto utilizado/.test(metricas));
      chk('web: Volver a publicar y Revisar siguen',/data-retomar="bbbbbbbb/.test(html)&&/data-editar="cccccccc/.test(html));
      chk('web: tarjeta «Campañas activas» sigue',/Campañas activas/.test(kpis));
    }
  }
  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
