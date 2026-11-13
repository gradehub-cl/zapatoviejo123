const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const leer=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
const codigo=leer('src/app/experiencia-nativa.js'),vib=leer('src/app/instalacion-nativa.js').match(/let _hapticaSeleccion=null;\nfunction vibrar\(tipo\)\{[\s\S]*?\n\}/)[0];
function arnes(nativa=true){
 const eventos={},raf=[],llamadas=[],plugins={},ids={},clases=new Set();let ahora=1000,oscuro=false;
 const d={body:{},activeElement:null,documentElement:{classList:{contains:k=>clases.has(k),toggle:(k,v)=>v?clases.add(k):clases.delete(k)}},querySelector:()=>null,querySelectorAll:()=>[],getElementById:id=>ids[id]||null,addEventListener:(n,f)=>eventos[n]=f,createElement:()=>({className:'',hidden:false,setAttribute(){}})};
 const w={innerHeight:800,visualViewport:{height:500,offsetTop:0,addEventListener:(n,f)=>eventos['vp-'+n]=f},Capacitor:{Plugins:plugins},addEventListener:(n,f)=>eventos['window-'+n]=f};
 plugins.StatusBar={setStyle:async x=>llamadas.push(['barra',x.style])};plugins.Keyboard={hide:async()=>llamadas.push(['ocultar-teclado']),setStyle:async x=>llamadas.push(['teclado',x.style]),addListener:async(n,f)=>eventos[n]=f};
 plugins.Haptics={notification:async x=>llamadas.push(['notification',x.type]),impact:async x=>llamadas.push(['impact',x.style]),selectionStart:async()=>llamadas.push(['start']),selectionChanged:async()=>llamadas.push(['seleccion'])};
 const ctx={window:w,document:d,navigator:{onLine:true},S:{onboardingDone:true},currentUser:{id:'sintetico'},currentTab:'home',getCacheOwner:()=> 'sintetico',Date:{now:()=>ahora},enAppNativa:()=>nativa,prefersDark:()=>oscuro,requestAnimationFrame:f=>raf.push(f),getComputedStyle:e=>e.css||{overflowY:'visible',fontSize:'16px'},MutationObserver:class{constructor(f){eventos.mutacion=f}observe(){}},setTimeout(){},clearTimeout(){}};
 vm.createContext(ctx);vm.runInContext(vib+'\n'+codigo,ctx);
 const run=s=>vm.runInContext(s,ctx);const cuadros=()=>{for(let f;f=raf.shift();)f();};
 return {ctx,eventos,llamadas,plugins,ids,d,w,clases,run,cuadros,avanzar:n=>ahora+=n,modo:v=>oscuro=v};
}
(async()=>{
 const web=arnes(false);assert.deepEqual(Object.keys(web.eventos),[],'web no instala listeners');for(const f of ['sincronizarAparienciaNativa()','avisoErrorNativo()','actualizarConexionNativa()','vibrar("nota")'])web.run(f);assert.deepEqual(web.llamadas,[]);assert.equal(web.run('ajustarCampoNativo({})'),false);
 const anterior=arnes();delete anterior.plugins.Keyboard;assert.equal(anterior.run('ajustarCampoNativo({})'),false,'binario sin Keyboard conserva el ajuste anterior');
 const a=arnes();a.cuadros();assert.deepEqual(a.llamadas.slice(0,2),[['barra','LIGHT'],['teclado','LIGHT']]);a.modo(true);a.run('sincronizarAparienciaNativa()');assert.deepEqual(a.llamadas.slice(-2),[['barra','DARK'],['teclado','DARK']]);const n=a.llamadas.length;a.run('sincronizarAparienciaNativa()');assert.equal(a.llamadas.length,n);
 a.llamadas.length=0;a.run("vibrar('nota');vibrar('error');vibrar('borrar');vibrar('seleccion');vibrar('seleccion')");await new Promise(setImmediate);assert.deepEqual(a.llamadas,[['notification','SUCCESS'],['notification','WARNING'],['notification','WARNING'],['start'],['seleccion'],['seleccion']]);
 a.llamadas.length=0;a.run('avisoErrorNativo();avisoErrorNativo()');assert.equal(a.llamadas.length,1,'un fallo con varios campos no repite aviso');a.avanzar(600);a.run('avisoErrorNativo()');assert.equal(a.llamadas.length,2);
 const control={disabled:false,isConnected:true,classList:{contains:()=>false},valor:'false',getAttribute(k){return k==='aria-pressed'?this.valor:null}};
 a.llamadas.length=0;a.eventos.click({target:{closest:()=>control}});control.valor='true';a.cuadros();await new Promise(setImmediate);assert.equal(a.llamadas.filter(x=>x[0]==='seleccion').length,1);a.llamadas.length=0;a.eventos.click({target:{closest:()=>control}});a.cuadros();a.eventos.click({target:{closest:()=>null}});await new Promise(setImmediate);assert.deepEqual(a.llamadas,[],'ni selección repetida ni botón normal vibran');
 a.eventos.keyboardWillShow();a.cuadros();assert(a.clases.has('nativa-teclado'));a.eventos['window-keyboardDidHide']();assert(!a.clases.has('nativa-teclado'));
 a.eventos.keyboardWillShow();a.d.activeElement={matches:()=>true,getClientRects:()=>[],blur:()=>a.llamadas.push(['blur'])};a.eventos.mutacion();a.cuadros();assert(!a.clases.has('nativa-teclado'),'al volver de un campo oculto se restaura la barra');assert(a.llamadas.some(x=>x[0]==='ocultar-teclado'));a.d.activeElement=null;
 const cont={parentElement:a.d.body,css:{overflowY:'auto'},scrollHeight:1000,clientHeight:400,scrollTop:0,getBoundingClientRect:()=>({top:100}),querySelector:()=>({getBoundingClientRect:()=>({bottom:150})})};
 const campo={parentElement:cont,getBoundingClientRect:()=>({top:656,bottom:700}),scrollIntoView(){throw Error('No mover la página')}};a.ctx.campo=campo;assert.equal(a.run('ajustarCampoNativo(campo)'),true);assert.equal(cont.scrollTop,216,'campo por encima del teclado, con margen');campo.getBoundingClientRect=()=>({top:200,bottom:244});a.run('ajustarCampoNativo(campo)');assert.equal(cont.scrollTop,216,'campo ya visible queda quieto');
 const chico={style:{},matches:()=>true,css:{fontSize:'12px'}};a.eventos.focusin({target:chico});assert.equal(chico.style.fontSize,'16px');
 const caja={prepend(el){a.ids[el.id]=el;el.parentElement=this}};a.ids['screen-home']={querySelector:()=>caja};a.w.navigator=a.ctx.navigator;a.ctx.navigator.onLine=false;a.run('actualizarConexionNativa()');assert.equal(a.ids['nativa-sin-red'].hidden,false);a.ctx.getCacheOwner=()=> 'otro';a.run('actualizarConexionNativa()');assert.equal(a.ids['nativa-sin-red'].hidden,true,'no informa una copia como propia si cambia el dueño');
 a.plugins.Haptics.notification=()=>Promise.reject(Error('sin motor'));a.run("vibrar('nota')");await new Promise(setImmediate);delete a.plugins.Haptics;a.run("vibrar('nota')");
 const css=leer('styles.css'),bloque=css.slice(css.indexOf('/* Interacción nativa:'));
 const reglas=(bloque.replace(/\/\*[\s\S]*?\*\//g,'').match(/[^{}]+(?=\{)/g)||[]).filter(r=>!r.trim().startsWith('@'));
 assert(reglas.length>15&&reglas.every(r=>r.split(',').every(s=>s.trim().startsWith('.app-nativa'))),'cada selector nuevo exige app-nativa');assert(!bloque.includes('!important'));assert(bloque.includes('#ramo-subtitulo'));assert(bloque.includes('prefers-reduced-motion:reduce'));
 for(const [k,v]of Object.entries({'@capacitor/keyboard':'8.0.6','@capacitor/status-bar':'8.0.4'}))assert.equal(JSON.parse(leer('package.json')).dependencies[k],v);
 console.log('PASS sensación nativa: web intacta, estilos acotados, teclado sin scroll de raíz, contraste, selección, errores y háptica con plugin simulado.');
})().catch(e=>{console.error(e);process.exitCode=1;});
