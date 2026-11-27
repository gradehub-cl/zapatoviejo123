#!/usr/bin/env node
// Capturas de revisión visual de GradeHub con Playwright.
// Sirve el repo local por un host ficticio (red externa bloqueada, service worker
// bloqueado), carga datos SINTÉTICOS y toma capturas en la matriz:
//   anchos 390 y 1280 × modo claro/oscuro × texto normal/grande  (+ --nativa)
// y además mide problemas objetivos: desborde horizontal, objetivos táctiles
// < 44 px, texto con punto decimal, "NaN/undefined", textos pegados, contraste.
//
// Uso (desde la raíz del repo, después de `npm run build`):
//   node .claude/skills/gradehub-ux-review/scripts/capturas.cjs \
//        [--pantallas home,ramo,stats,agenda] [--salida /tmp/gh-ux] [--nativa] [--solo-movil]
//   PLAYWRIGHT_MODULE=/ruta/a/playwright CHROME_PATH=/ruta/Chrome  (opcionales, igual que tests/browser)
//
// Salida: PNG por combinación + informe.json + informe.md en --salida.
// No usa cuentas ni datos reales: no le pases datos de personas.

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path');

const args=process.argv.slice(2);
const opt=(n,d)=>{const i=args.indexOf('--'+n);return i<0?d:(args[i+1]&&!args[i+1].startsWith('--')?args[i+1]:true);};
const repo=path.resolve(process.env.REPO||process.cwd());
const salida=path.resolve(opt('salida','/tmp/gradehub-ux'));
const pantallas=String(opt('pantallas','home,ramo,stats,agenda')).split(',').map(s=>s.trim()).filter(Boolean);
const nativa=!!opt('nativa',false);
const anchos=opt('solo-movil',false)?[390]:[390,1280];
const HOST='gradehub-ux.test';
fs.mkdirSync(salida,{recursive:true});

const TIPOS={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};

// Datos ficticios: nombres genéricos, notas inventadas. Cubren casos de diseño:
// nombre largo, ramo aprobado, al borde, reprobado, sin notas y ramo cerrado.
const ESCENARIO=()=>{
  S.tenant=S.tenant||'uc';S.onboardingDone=true;
  if(typeof currentUser!=='undefined')currentUser={id:'cuenta-sintetica'};
  const cat=(id,nombre,peso,notas)=>({id,nombre,peso,directNota:true,notas:notas.map((v,i)=>({id:id+'n'+i,nombre:nombre+' '+(i+1),valor:v,peso:1}))});
  S.ramos=[
    {id:'r1',nombre:'Cálculo de varias variables con un nombre bastante largo para probar cortes',creditos:10,categorias:[cat('a','Interrogación',30,[5.5,6.1]),cat('b','Certamen',40,[4.8]),cat('c','Examen',30,[])],gates:[]},
    {id:'r2',nombre:'Ramo sintético al borde',creditos:10,categorias:[cat('d','Prueba',60,[3.6,4.2]),cat('e','Examen',40,[])],gates:[]},
    {id:'r3',nombre:'Ramo sintético reprobando',creditos:10,categorias:[cat('f','Control',50,[2.1,3.0]),cat('g','Examen',50,[])],gates:[]},
    {id:'r4',nombre:'Ramo sin notas',creditos:5,categorias:[cat('h','Tarea',100,[])],gates:[]},
    {id:'r5',nombre:'Ramo cerrado',creditos:10,categorias:[cat('i','Prueba',100,[5.6,5.6])],gates:[]},
  ];
};

const IR={
  home:async p=>p.evaluate(()=>{showMainApp();typeof showTab==='function'&&showTab('home',true);}),
  ramo:async p=>p.evaluate(()=>{showMainApp();openRamo('r1');}),
  stats:async p=>p.evaluate(()=>{showMainApp();showTab('stats',true);}),
  agenda:async p=>p.evaluate(()=>{showMainApp();showTab('agenda',true);}),
};

// Mediciones objetivas dentro de la página.
const MEDIR=()=>{
  const out={desborde:null,tactiles:[],puntoDecimal:[],basura:[],pegados:[],contraste:[]};
  const doc=document.documentElement;
  if(doc.scrollWidth>window.innerWidth+1)out.desborde=`documento ${doc.scrollWidth}px > ventana ${window.innerWidth}px`;
  // Visible = renderizado, no oculto por CSS/opacity, dentro del ancho de la ventana
  // (las pantallas inactivas suelen quedar desplazadas en X) y fuera de [hidden]/[inert].
  const visible=e=>{const r=e.getBoundingClientRect();
    if(!(r.width>0&&r.height>0)||r.right<=0||r.left>=innerWidth)return false;
    if(e.closest('[hidden],[inert],[aria-hidden="true"]'))return false;
    return e.checkVisibility?e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}):getComputedStyle(e).visibility!=='hidden';};
  const nombre=e=>(e.getAttribute('aria-label')||e.textContent||e.id||e.className||e.tagName).toString().trim().slice(0,50);
  for(const e of document.querySelectorAll('button,a[href],input,select,textarea,[role=button],[role=switch],[role=tab],[onclick]')){
    if(!visible(e))continue;const r=e.getBoundingClientRect();
    if(r.width<44||r.height<44){
      // tolera si un pseudo-elemento o padding del padre amplía el área: se reporta como "revisar"
      out.tactiles.push(`${Math.round(r.width)}×${Math.round(r.height)} ${e.tagName.toLowerCase()} «${nombre(e)}»`);
    }
  }
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=walker.nextNode())){
    const t=n.textContent;if(!t.trim()||!n.parentElement||!visible(n.parentElement))continue;
    if(n.parentElement.closest('script,style,code,pre,[data-ux-ignorar]'))continue;
    if(/(^|[^\d\w.])[1-7]\.\d(\d)?(?!\d)/.test(t)&&!/\d\.\d{3}/.test(t))out.puntoDecimal.push(t.trim().slice(0,70));
    if(/\b(NaN|undefined|null|Infinity)\b|\[object Object\]/.test(t))out.basura.push(t.trim().slice(0,70));
    if(/\d[a-záéíóúñ]{3,}/i.test(t)&&!/\d+(º|°|er|do|ro|to|vo|mo|no)\b/i.test(t)&&!/[A-Z]{2,}\d/.test(t))out.pegados.push(t.trim().slice(0,70));
    const sinMarcas=t.replace(/\b(GradeHub|iPhone|iPad|iOS|macOS|WhatsApp|YouTube|LinkedIn|TikTok|PowerPoint|OneDrive|iCloud|TestFlight|FaceID|Ucampus|UCursos)\b/g,'');
    if(/[a-záéíóúñ][A-ZÁÉÍÓÚ][a-záéíóúñ]/.test(sinMarcas))out.pegados.push(t.trim().slice(0,70));
  }
  // Contraste WCAG 2.x aproximado sobre el color de fondo efectivo (sin imágenes).
  // Normaliza cualquier color CSS (rgb, color(srgb…), oklch, color-mix) pintándolo en un canvas 1×1.
  const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
  const rgb=c=>{if(!c||c==='transparent'||/rgba?\(0, 0, 0, 0\)/.test(c))return null;cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=c;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255];};
  const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
  const fondo=e=>{for(let x=e;x;x=x.parentElement){const c=rgb(getComputedStyle(x).backgroundColor);if(c&&c[3]>.9)return c;}return [255,255,255];};
  const vistos=new Set();
  for(const e of document.querySelectorAll('body *')){
    if(!visible(e)||![...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim()))continue;
    const s=getComputedStyle(e),c=rgb(s.color);if(!c)continue;const f=fondo(e);
    const a=lum(c),b=lum(f),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const grande=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&+s.fontWeight>=700);
    if(ratio<(grande?3:4.5)){const k=e.textContent.trim().slice(0,40);if(!vistos.has(k)){vistos.add(k);out.contraste.push(`${ratio.toFixed(2)}:1 «${k}» (${s.color} sobre rgb(${f.slice(0,3).join(',')}))`);}}
  }
  for(const k of ['tactiles','puntoDecimal','basura','pegados','contraste'])out[k]=[...new Set(out[k])].slice(0,40);
  return out;
};

(async()=>{
  const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
  const informe=[];
  try{
    for(const ancho of anchos)for(const modo of ['claro','oscuro'])for(const grande of [false,true]){
      const alto=ancho<600?844:800;
      const ctx=await browser.newContext({viewport:{width:ancho,height:alto},deviceScaleFactor:2,isMobile:ancho<600,hasTouch:ancho<600,
        colorScheme:modo==='oscuro'?'dark':'light',reducedMotion:'reduce',serviceWorkers:'block',locale:'es-CL',timezoneId:'America/Santiago'});
      const page=await ctx.newPage();const errores=[];
      page.on('pageerror',e=>errores.push(e.message));
      // La red externa está bloqueada a propósito: esos fallos son ruido, no errores de la app.
      page.on('console',m=>{const t=m.text();if(m.type()==='error'&&!/ERR_FAILED|ERR_BLOCKED|net::/.test(t))errores.push(t.slice(0,200));});
      await page.route('**/*',route=>{
        const u=new URL(route.request().url());if(u.hostname!==HOST)return route.abort();
        const p=path.join(repo,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
        if(!p.startsWith(repo)||!fs.existsSync(p)||!fs.statSync(p).isFile())return route.fulfill({status:404,body:''});
        return route.fulfill({body:fs.readFileSync(p),contentType:TIPOS[path.extname(p)]||'application/octet-stream'});
      });
      if(nativa)await page.addInitScript(()=>{window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{}};document.documentElement.classList.add('app-nativa');});
      await page.goto(`https://${HOST}/`);await page.waitForTimeout(400);
      await page.evaluate(ESCENARIO);
      for(const pantalla of pantallas){
        const id=`${pantalla}-${ancho}-${modo}${grande?'-texto-grande':''}${nativa?'-nativa':''}`;
        try{
          if(!IR[pantalla])throw new Error(`pantalla desconocida: ${pantalla} (agrega su navegación en IR)`);
          await IR[pantalla](page);
          await page.evaluate(({modo,grande})=>{S.modo=modo;typeof applyTheme==='function'&&applyTheme();document.documentElement.style.fontSize=grande?'22px':'';},{modo,grande});
          await page.waitForTimeout(250);
          const archivo=path.join(salida,id+'.png');
          await page.screenshot({path:archivo,fullPage:true});
          const m=await page.evaluate(MEDIR);
          informe.push({id,archivo,errores:[...errores],...m});errores.length=0;
        }catch(e){informe.push({id,fallo:e.message});}
      }
      await ctx.close();
    }
  }finally{await browser.close();}
  fs.writeFileSync(path.join(salida,'informe.json'),JSON.stringify(informe,null,2));
  const md=['# Informe de capturas','',`Repo: ${repo}`,`Fecha: ${new Date().toISOString()}`,''];
  for(const r of informe){
    md.push(`## ${r.id}`);
    if(r.fallo){md.push(`- **No se pudo capturar:** ${r.fallo}`,'');continue;}
    md.push(`- Captura: ${r.archivo}`);
    if(r.desborde)md.push(`- **Desborde horizontal:** ${r.desborde}`);
    for(const [k,t] of [['errores','Errores de consola'],['basura','Texto basura (NaN/undefined)'],['puntoDecimal','Posible punto decimal'],['pegados','Posible texto pegado'],['tactiles','Objetivos < 44 px (revisar)'],['contraste','Contraste bajo (aprox.)']])
      if(r[k]?.length)md.push(`- **${t} (${r[k].length}):**`,...r[k].map(x=>`  - ${x}`));
    md.push('');
  }
  fs.writeFileSync(path.join(salida,'informe.md'),md.join('\n'));
  const graves=informe.filter(r=>r.fallo||r.desborde||r.basura?.length||r.errores?.length).length;
  console.log(`Capturas e informe en ${salida} (${informe.length} combinaciones, ${graves} con problemas graves)`);
  process.exitCode=graves?2:0;
})();
