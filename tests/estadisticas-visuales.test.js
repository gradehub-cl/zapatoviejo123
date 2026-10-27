// Estadísticas con cada número en su escala (2026-10-26): "Qué mueve tu
// promedio", las palabras de la nota necesaria y las piezas que se dibujan.
// Datos inventados; la pauta va escrita acá.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return stub},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);
['data.js','engine.js','app.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(raiz,f),'utf8'),ctx));
const g=n=>vm.runInContext(n,ctx);
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const cerca=(a,b)=>Math.abs(a-b)<1e-9;
const ramo=(id,nota,creditos)=>({id,nombre:id,color:'#3aa',creditos,origen:null,gates:[],
  categorias:[{id:'c'+id,nombre:'Prueba',peso:100,directNota:true,notas:[{id:'n'+id,valor:nota,peso:1}]}]});

console.log('\n=== Qué mueve tu promedio ===');
{
  const ramos=[ramo('a',6,10),ramo('b',4,10),ramo('c',5,20)];
  ctx.__r=ramos;const ap=g('aporteAlPromedio(__r)'),prom=g('gpa(__r)');
  chk(`los aportes suman cero (promedio ${prom})`,cerca(ap.reduce((s,x)=>s+x.aporte,0),0));
  const a=ap.find(x=>x.ramo.id==='a'),b=ap.find(x=>x.ramo.id==='b');
  chk('con créditos, cada ramo pesa lo suyo: (6 − 5) × 10/40 = +0,25',cerca(a.aporte,0.25));
  chk('y el que va bajo el promedio resta: −0,25',cerca(b.aporte,-0.25));
  chk('ordenados de más a menos',ap[0].ramo.id==='a'&&ap[ap.length-1].ramo.id==='b');
  const simples=[ramo('a',6),ramo('b',4)];ctx.__s=simples;
  chk('sin créditos en todos, cada ramo pesa lo mismo',cerca(g('aporteAlPromedio(__s)')[0].aporte,0.5));
  ctx.__v=[];chk('sin notas no hay nada que mostrar',g('aporteAlPromedio(__v)').length===0);
}

console.log('\n=== Lo que exige la nota necesaria, en palabras ===');
{
  const p=n=>g('exigenciaNotaNecesaria')(n);
  chk('3,8 está al alcance',p(3.8).palabra==='Al alcance');
  chk('5,0 es exigente',p(5).palabra==='Exigente');
  chk('6,2 es muy exigente',p(6.2).palabra==='Muy exigente');
  chk('más de 7 no tiene salida',p(7.3).palabra==='Sin salida');
}

console.log('\n=== Las piezas ===');
{
  const anillo=g('htmlAnillo')({fraccion:0.5,color:'var(--primary)',marca:0.5,etiqueta:'Promedio 4.0',centro:'<b>4.0</b>'});
  chk('el anillo se llena hasta la mitad',/--anillo-fin:50\.00/.test(anillo));
  chk('VoiceOver lee la etiqueta y no el centro',/role="img" aria-label="Promedio 4\.0"/.test(anillo)&&/anillo-centro" aria-hidden="true"/.test(anillo));
  chk('la marca del 4,0 queda abajo (media vuelta desde arriba)',/anillo-marca" x1="26\.0" y1="100\.0"/.test(anillo));
  chk('un valor fuera de rango no rompe el arco',/--anillo-fin:0\.00/.test(g('htmlAnillo')({fraccion:3})));
  const escala=g('htmlEscalaNotas')({piso:4,techo:7,actual:5.5});
  chk('la escala ubica el 4,0 en la mitad y la banda hasta el 7',/escala-cuatro" style="left:50\.0%"/.test(escala)&&/width:calc\(100\.0% - 50\.0%\)/.test(escala));
  chk('la barra centrada va hacia la izquierda cuando resta',/left:25\.0%;width:25\.0%/.test(g('htmlBarraCentrada')(-0.1,0.2,'red')));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail?1:0);
