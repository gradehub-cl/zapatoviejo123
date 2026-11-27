// Al llenar varias notas seguidas con Tab o Enter, la casilla siguiente puede
// ser una evaluación pendiente, que en la ficha es un botón. El foco quedaba en
// ese botón: la nota siguiente se tecleaba sin campo que la recibiera y se
// perdía sin aviso (auditoría #1376, cuentas 1 y 3). Ahora se abre su campo.
const fs=require('fs'),vm=require('vm'),path=require('path');
const fuente=fs.readFileSync(path.join(__dirname,'..','src','app','hojas-modales.js'),'utf8');

let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function ficha(){
  const oyentes=[];
  const ctx={console,setTimeout,clearTimeout,casillas:[],
    document:{addEventListener:(t,f)=>{if(t==='keydown')oyentes.push(f);},
      querySelectorAll:()=>ctx.casillas,
      getElementById:()=>({classList:{contains:()=>false}})},
    window:{addEventListener(){}}};
  vm.createContext(ctx);vm.runInContext(fuente,ctx);
  const campo=(value,defaultValue='')=>({tipo:'campo',value,defaultValue,soltado:0,enfocado:0,seleccionado:0,
    matches:s=>/input\.eval-row-input/.test(s),
    blur(){this.soltado++;},focus(){this.enfocado++;},select(){this.seleccionado++;}});
  const pendiente=()=>({tipo:'pendiente',abierto:0,enfocado:0,
    matches:s=>/button\.nota-en-fila/.test(s),
    click(){this.abierto++;},focus(){this.enfocado++;}});
  const tecla=(target,key,shiftKey=false)=>{
    const e={target,key,shiftKey,prevenido:false,preventDefault(){this.prevenido=true;}};
    oyentes.forEach(f=>f(e));return e;
  };
  return {ctx,campo,pendiente,tecla};
}

{
  const f=ficha(),a=f.campo('5,5'),b=f.pendiente(),c=f.pendiente();
  f.ctx.casillas=[a,b,c];
  const e=f.tecla(a,'Tab');
  chk('Tab con una nota escrita la guarda (suelta el campo)',e.prevenido&&a.soltado===1);
  chk('y abre el campo de la evaluación pendiente siguiente',b.abierto===1&&b.enfocado===0);
  chk('sin tocar las demás',c.abierto===0);
}
{
  const f=ficha(),a=f.campo('5,5'),b=f.pendiente();
  f.ctx.casillas=[a,b];
  f.tecla(a,'Enter');
  chk('Enter hace lo mismo: no deja el foco en un botón',a.soltado===1&&b.abierto===1);
}
{
  const f=ficha(),a=f.pendiente(),b=f.campo('6,0');
  f.ctx.casillas=[a,b];
  f.tecla(b,'Tab',true);
  chk('Shift+Tab abre la pendiente anterior',a.abierto===1);
}
{
  const f=ficha(),a=f.campo('5,5'),b=f.campo('4,0','4,0');
  f.ctx.casillas=[a,b];
  f.tecla(a,'Tab');
  chk('si la siguiente ya tiene nota, se enfoca y se selecciona como antes',b.enfocado===1&&b.seleccionado===1);
}
{
  const f=ficha(),a=f.campo('4,0','4,0'),b=f.pendiente();
  f.ctx.casillas=[a,b];
  const e=f.tecla(a,'Tab');
  chk('Tab sin cambios sigue el orden nativo y no abre nada',!e.prevenido&&a.soltado===0&&b.abierto===0);
}
{
  const f=ficha(),a=f.campo('5,5');
  f.ctx.casillas=[a];
  f.tecla(a,'Enter');
  chk('en la última casilla solo guarda',a.soltado===1);
}

console.log(`\n${ok} ok, ${fail} fallas`);
process.exit(fail?1:0);
