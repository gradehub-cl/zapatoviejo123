// App Review 5.1.1 (Lucas, 2026-11-23): en la app la analítica parte recién con
// sesión iniciada (quien entra aceptó términos y privacidad) y se apaga en
// Ajustes → Estadísticas de uso. En la web no cambia nada. Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const fuente=leer('src/app/analitica.js');
let ok=0;const chk=(n,c)=>{assert.ok(c,n);ok++;console.log('  OK   '+n);};

function contexto({nativa,usuario}){
  const almacen=new Map(),gtags=[];
  const ctx={console,setTimeout:()=>0,location:{hostname:'gradehub.cl',protocol:nativa?'capacitor:':'https:'},
    localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
    currentUser:usuario?{id:'00000000-0000-4000-8000-0000000000aa'}:null,S:{tenant:'uc'},
    esCuentaProfesor:()=>false,enAppNativa:()=>nativa,enAppIOS:()=>true,
    gtag:(...a)=>gtags.push(a),cargarGoogleAnalytics(){ctx.__gaCargado=(ctx.__gaCargado||0)+1;}};
  ctx.window=ctx;
  vm.createContext(ctx);vm.runInContext(fuente,ctx);
  return {ctx,gtags,almacen,run:s=>vm.runInContext(s,ctx)};
}

console.log('=== web: igual que antes ===');
{const w=contexto({nativa:false,usuario:false});w.run(`track('abrio_calculadora')`);
 chk('sin cuenta, la web sigue mandando eventos',w.gtags.length===1);}

console.log('=== app: nada antes de entrar ===');
{const a=contexto({nativa:true,usuario:false});a.run(`track('vio_acceso')`);
 chk('sin sesión no sale ningún evento',a.gtags.length===0);
 chk('ni queda en la cola de PostHog',a.run('_analiticaPropiaCola.length')===0);
 a.run(`activarAnaliticaApp()`);chk('ni carga Google Analytics',!a.ctx.__gaCargado);}

console.log('=== app: con sesión ===');
{const a=contexto({nativa:true,usuario:true});
 a.run(`registrarEntradaAnalitica('login')`);
 chk('al entrar carga Google Analytics',a.ctx.__gaCargado===1);
 chk('y el evento de login sale',a.gtags.some(g=>g[1]==='login'));
 const ph={opt:[],reset(){this.opt.push('reset');},opt_out_capturing(){this.opt.push('out');},opt_in_capturing(){this.opt.push('in');}};
 a.ctx.__ph=ph;a.run('_analiticaPropia=__ph;_analiticaPropiaEstado="lista"');
 a.run(`cambiarAnaliticaApp(false)`);
 chk('apagar guarda la preferencia en este teléfono',a.almacen.get('gradehub_sin_analitica')==='1');
 chk('apagar corta Google Analytics con su interruptor',a.ctx['ga-disable-G-TS791S6PDM']===true);
 chk('apagar saca a PostHog y borra su identidad',ph.opt.join(',')==='out,reset');
 const antes=a.gtags.length;a.run(`track('agrego_ramo')`);
 chk('apagado, no sale nada más',a.gtags.length===antes);
 a.run(`cambiarAnaliticaApp(true)`);
 chk('prenderla vuelve a enviar',a.ctx['ga-disable-G-TS791S6PDM']===false&&ph.opt.at(-1)==='in'&&!a.almacen.has('gradehub_sin_analitica'));
 a.run(`track('agrego_ramo')`);chk('y el siguiente evento sale',a.gtags.length===antes+1);}

console.log('=== index.html y Ajustes ===');
const html=leer('index.html');
chk('index.html no carga gtag.js con un <script src> fijo',!/<script[^>]*src="https:\/\/www\.googletagmanager\.com/.test(html));
chk('en la web GA carga al abrir; en la app no',/if \(!\(window\.Capacitor && Capacitor\.isNativePlatform && Capacitor\.isNativePlatform\(\)\)\) cargarGoogleAnalytics\(\);/.test(html));
const ajustes=leer('src/app/ajustes.js');
const i=ajustes.indexOf('id="s-analitica"');
chk('Ajustes tiene el interruptor de estadísticas',i>0&&/cambiarAnaliticaApp\(this\.checked\)/.test(ajustes.slice(i,i+300)));
chk('y solo aparece en la app',/enAppNativa\(\)&&typeof cambiarAnaliticaApp==='function'\?`<div class="settings-pautas">\s*<label class="toggle-row" for="s-analitica">/.test(ajustes));
console.log(`\nPASS: ${ok}   FAIL: 0`);
