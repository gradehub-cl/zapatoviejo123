// «Usar mis notas para elegir anuncios» (Ajustes, Lucas 2026-11-17).
// Prendido por defecto: las cuentas existentes, sin el campo, siguen igual.
// Apagado: Inicio no compara notas ni avance y no muestra recomendaciones; no
// se pide nada al servidor para elegir. La preferencia viaja con la cuenta.
// Todo sintético.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

(async()=>{
  console.log('=== Inicio ===');
  const llamadas=[],guardados=[];
  const ctx={console:{...console,warn(){}},Intl,setTimeout,clearTimeout,
    S:{tenant:'uc',ramos:[]},currentUser:{id:'estudiante-sintetico'},save(){guardados.push(1);},track(){},
    supabaseClient:{rpc:async n=>{llamadas.push(n);return {data:null,error:null};}},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}}};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(raiz,'marketplace.js'),'utf8'),ctx);
  const contenedor={isConnected:true,querySelectorAll:()=>[],querySelector:()=>null};ctx.contenedor=contenedor;
  chk('sin el campo cuenta como prendido',vm.runInContext('anunciosConNotasActivos()',ctx)===true);
  vm.runInContext('cambiarAnunciosConNotas(false)',ctx);
  chk('apagar guarda false en la cuenta',ctx.S.anunciosConNotas===false&&guardados.length===1);
  vm.runInContext('pintarRecomendacionClase(contenedor)',ctx);await new Promise(r=>setImmediate(r));
  chk('apagado: Inicio no pide nada para elegir un anuncio',llamadas.length===0);
  vm.runInContext('cambiarAnunciosConNotas(true)',ctx);
  vm.runInContext('pintarRecomendacionClase(contenedor)',ctx);await new Promise(r=>setImmediate(r));
  chk('prendido: Inicio sigue su camino de siempre',ctx.S.anunciosConNotas===true&&llamadas.includes('mi_cierre_anuncios'));

  // Versión B: en la app no hay recomendación en Inicio, aunque esté prendido.
  ctx.enAppNativa=()=>true;llamadas.length=0;
  vm.runInContext('pintarRecomendacionClase(contenedor)',ctx);await new Promise(r=>setImmediate(r));
  chk('versión B: en la app Inicio no recomienda ni pide nada',llamadas.length===0&&vm.runInContext('recomendacionesEnInicio()',ctx)===false);
  ctx.enAppNativa=()=>false;
  chk('versión B: en la web sigue recomendando',vm.runInContext('recomendacionesEnInicio()',ctx)===true);

  console.log('\n=== La cuenta ===');
  const nodo={style:{setProperty(){}},classList:{add(){},remove(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},innerHTML:'',textContent:''};
  const app={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
    document:{getElementById:()=>nodo,createElement:()=>nodo,addEventListener(){},documentElement:nodo,querySelector:()=>nodo,querySelectorAll:()=>[],body:nodo},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout,clearTimeout,console,syncToCloud(){}};
  vm.createContext(app);
  vm.runInContext(['data.js','engine.js','app.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n'),app);
  vm.runInContext(fs.readFileSync(path.join(raiz,'src/app-session/sync-fusion.js'),'utf8'),app);
  chk('normalize conserva el apagado al recargar',vm.runInContext('normalize({ramos:[],anunciosConNotas:false}).anunciosConNotas',app)===false);
  chk('una cuenta vieja sin el campo no lo recibe inventado',!('anunciosConNotas' in vm.runInContext('normalize({ramos:[]})',app)));
  chk('sync conserva el apagado de este dispositivo',vm.runInContext('fusionarSync({ramos:[]},{ramos:[],anunciosConNotas:false},{ramos:[]}).anunciosConNotas',app)===false);
  chk('sync trae el apagado hecho en otro dispositivo',vm.runInContext('fusionarSync({ramos:[]},{ramos:[]},{ramos:[],anunciosConNotas:false}).anunciosConNotas',app)===false);
  const ajustes=fs.readFileSync(path.join(raiz,'src/app/ajustes.js'),'utf8');
  chk('Ajustes usa el interruptor único dentro de su label',/<label class="toggle-row" for="s-anuncios-notas">[\s\S]*?<input id="s-anuncios-notas" type="checkbox" role="switch"/.test(ajustes));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
