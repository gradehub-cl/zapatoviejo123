// Una nota escrita en la ficha se guarda al soltar el campo. Si la persona sale
// de la app con el campo aún enfocado (iOS lo deja así en segundo plano), la nota
// no llegaba a guardarse (2026-11-25). Al esconderse la página se suelta el campo
// y lo que quede esperando se sube de inmediato.
const fs=require('fs'),vm=require('vm'),path=require('path');
const fuente=fs.readFileSync(path.join(__dirname,'..','src','app-session','visitas-y-subidas.js'),'utf8');

let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function dispositivo(){
  const oyentes={doc:{},win:{}};
  const ctx={
    console,setTimeout,clearTimeout,
    supabaseClient:{},currentUser:{id:'u-sintetico'},
    subidas:0,guardadas:[],
    document:{visibilityState:'visible',activeElement:null,
      addEventListener:(t,f)=>{(oyentes.doc[t]=oyentes.doc[t]||[]).push(f);}},
    window:{addEventListener:(t,f)=>{(oyentes.win[t]=oyentes.win[t]||[]).push(f);}},
  };
  vm.createContext(ctx);
  vm.runInContext(fuente,ctx);
  // La subida real habla con Supabase: acá solo se cuenta.
  vm.runInContext('syncNow=()=>{subidas++;};',ctx);
  ctx.esconder=()=>{ctx.document.visibilityState='hidden';(oyentes.doc.visibilitychange||[]).forEach(f=>f());};
  ctx.pagehide=()=>(oyentes.win.pagehide||[]).forEach(f=>f());
  // Un campo de nota como el de «+ Nota»: guarda al soltarlo (setSlotNota → save → syncToCloud).
  ctx.campoNota=(valor,clase='eval-row-input nota-campo')=>{
    const clases=new Set(clase.split(' '));
    const el={valor,value:valor,classList:{contains:c=>clases.has(c)},
      blur(){if(ctx.document.activeElement!==el)return;ctx.document.activeElement=null;ctx.guardadas.push(el.valor);ctx.syncToCloud();}};
    ctx.document.activeElement=el;
    return el;
  };
  return ctx;
}

console.log('\n=== Nota a medio escribir al salir de la app ===');
{
  const d=dispositivo();
  d.campoNota('6');
  d.esconder();
  chk('al esconder la app, el 6 escrito se guarda',d.guardadas.length===1&&d.guardadas[0]==='6');
  chk('y se sube en ese momento, sin esperar los 800 ms',d.subidas===1);
}
{
  const d=dispositivo();
  d.campoNota('5,5');
  d.pagehide();
  chk('cerrar la pestaña (pagehide) también guarda la nota',d.guardadas[0]==='5,5'&&d.subidas===1);
}
{
  const d=dispositivo();
  const otro=d.campoNota('hola','buscador');
  d.esconder();
  chk('un campo que no es de notas no se toca',d.guardadas.length===0&&d.document.activeElement===otro);
  chk('sin nada pendiente no sube',d.subidas===0);
}
{
  // Borró el 5,5 para escribir otro y cambió de app: el vacío no se confirma.
  const d=dispositivo();
  const vacio=d.campoNota('','eval-row-input sm');
  d.esconder();
  chk('un campo vaciado no se suelta al salir',d.guardadas.length===0&&d.document.activeElement===vacio&&d.subidas===0);
}
{
  const d=dispositivo();
  d.esconder();
  chk('sin foco en ningún campo no pasa nada',d.guardadas.length===0&&d.subidas===0);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
