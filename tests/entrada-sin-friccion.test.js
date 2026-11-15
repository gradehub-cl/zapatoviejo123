// La pantalla de entrada (2026-11-03): un dispositivo nuevo parte en Crear
// cuenta, la otra opción es un botón de contorno bajo el principal, y quien da
// clases entra por «Soy profesor particular» o por gradehub.cl/?dar-clases.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const html=leer('index.html'),sesion=leer('app-session.js'),app=leer('app.js'),css=leer('styles.css');
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function arnes(busqueda=''){
  const almacen=new Map(),reemplazos=[];
  const ctx={
    window:{supabase:{createClient:()=>({auth:{},from:()=>({})})}},
    document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}},
    localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
    sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    location:{search:busqueda,href:'https://gradehub.cl/'+busqueda+'#x'},
    history:{state:null,replaceState:(s,t,u)=>reemplazos.push(u)},
    URL,URLSearchParams,console:{warn(){},log(){}},setTimeout(){},clearTimeout(){},
  };
  vm.createContext(ctx);
  vm.runInContext(sesion,ctx);
  return {ctx,almacen,reemplazos,run:c=>vm.runInContext(c,ctx)};
}

console.log('\n=== Parte en Crear cuenta si el dispositivo nunca entró ===');
{
  const h=arnes();
  chk('sin método recordado: Crear cuenta',h.run('modoAuthInicial()')==='signup');
  h.run("recordarMetodoLogin('google')");
  chk('con un método recordado: Iniciar sesión',h.run('modoAuthInicial()')==='login');
  chk('mostrar la pantalla aplica el modo inicial',/marcarUltimoLogin\(\);\s*\n\s*ponerModoAuth\(modoAuthInicial\(\)\);/.test(sesion));
}

console.log('\n=== Los botones de entrar ===');
const orden=['id="auth-btn"','id="auth-toggle"','id="auth-fp"','id="auth-legal"'].map(s=>html.indexOf(s));
chk('principal, luego crear/iniciar, luego olvidé mi contraseña y el aviso',orden.every((p,i)=>p>0&&(i===0||p>orden[i-1])));
chk('la otra opción es un botón de contorno',/class="btn-contorno" id="auth-toggle"/.test(html));
chk('el contorno va en el color del texto, sin turquesa',/\.btn-contorno\{[^}]*border:1\.5px solid var\(--fg\)[^}]*color:var\(--fg\)/.test(css));
chk('el principal de la entrada es turquesa con su tinta',/#screen-auth #auth-btn\{background:var\(--primary\);color:var\(--primary-fg\);\}/.test(css));
chk('el principal respira dos veces al llegar y se calla',/#screen-auth #auth-btn\{[^}]*animation:auth-respira [^;}]* 2;/.test(css));
chk('y se apaga con movimiento reducido',/prefers-reduced-motion:reduce\)\{#screen-auth #auth-btn,[^{]*\{animation:none/.test(css));
chk('listo: el principal queda iluminado hasta que se aprieta',/#screen-auth:has\(input\) #auth-btn\.auth-listo:not\(:disabled\)\{box-shadow:/.test(css));
chk('dos puntos de luz recorren el contorno, fuera del texto del botón',/id="auth-btn"[^>]*>[^<]*<\/button>\s*<!--[\s\S]*?-->\s*<svg class="auth-laser" id="auth-laser" aria-hidden="true" focusable="false"><\/svg>/.test(html)&&/#auth-btn\.auth-listo:not\(:disabled\)\+\.auth-laser\{opacity:1;\}/.test(css));
chk('el láser se apaga con movimiento reducido',/prefers-reduced-motion:reduce\)\{[^@]*\.auth-laser\{display:none;\}/.test(css));
chk('mide al menos 44 pt',/\.btn-contorno\{[^}]*min-height:44px/.test(css));

console.log('\n=== Entrada de profesor ===');
{
  const h=arnes('?dar-clases');
  chk('el link guarda la intención en su propia clave',h.almacen.get('gradehub_entrada_profesor')==='1'&&!h.almacen.has('gradehub_v1'));
  chk('y se saca de la barra de direcciones',h.reemplazos.length===1&&!/dar-clases/.test(h.reemplazos[0])&&/#x$/.test(h.reemplazos[0]));
  chk('el onboarding la consume una sola vez',h.run('consumirEntradaProfesor()')===true&&h.run('consumirEntradaProfesor()')===false);
}
{
  const h=arnes();
  chk('sin link no hay intención',h.run('entradaProfesor()')===false&&h.reemplazos.length===0);
  h.run('alternarEntradaProfesor()');
  chk('«Soy profesor particular» la activa',h.run('entradaProfesor()')===true);
  h.run('alternarEntradaProfesor()');
  chk('y «Soy estudiante» la deshace',h.run('entradaProfesor()')===false);
}
chk('el botón está al pie, junto a términos y privacidad',/auth-footer-links[\s\S]{0,700}id="auth-dar-clases"[^>]*>Soy profesor particular</.test(html));
chk('el onboarding parte como profesor si entró por ahí',/consumirEntradaProfesor\(\)\?'profesor':'estudiante'/.test((app.match(/function obIniciar\(\)\{[\s\S]*?\n\}/)||[''])[0]));
// Una cuenta que ya existía no pasa por el onboarding: la intención no puede
// quedar esperando y marcar como profesor a la próxima cuenta del dispositivo.
chk('entrar a la app la olvida',/function enterApp\(\)\{[\s\S]{0,300}guardarEntradaProfesor\(false\)/.test(sesion));

console.log('\n=== El halo de «listo» ===');
{
  const campos={'auth-user':{value:''},'auth-pass':{value:''},'auth-pass2':{value:''}};
  const clases=new Set();
  const btn={classList:{toggle:(c,si)=>si?clases.add(c):clases.delete(c)}};
  const h=arnes();
  h.ctx.document.getElementById=id=>id==='auth-btn'?btn:campos[id]||null;
  h.run("authMode='signup'");
  h.run('revisarAuthListo()');
  chk('vacío no está listo',!clases.has('auth-listo'));
  campos['auth-user'].value='ana@ejemplo.cl';campos['auth-pass'].value='clave1234';campos['auth-pass2'].value='clave123';
  h.run('revisarAuthListo()');
  chk('crear cuenta con contraseñas distintas no está listo',!clases.has('auth-listo'));
  campos['auth-pass2'].value='clave1234';
  h.run('revisarAuthListo()');
  chk('correo y contraseñas iguales: listo',clases.has('auth-listo'));
  h.run("authMode='login'");campos['auth-pass'].value='abc';
  h.run('revisarAuthListo()');
  chk('al iniciar sesión no se exige el mínimo',clases.has('auth-listo'));
}

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
