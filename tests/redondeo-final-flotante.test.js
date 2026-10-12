// Un final de exactamente 3,95 se redondea a 4,0 aunque el punto flotante lo
// entregue como 3,9499999… Con pesos 10/10/23/23/34 pasaba: la ficha decía
// 3,9 y reprobado a alguien que aprobaba. La pauta va escrita acá adentro: es
// un test del mecanismo, no del catálogo.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
const root=path.join(__dirname,'..');
const element=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return null},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>element(),createElement:element,addEventListener(){},documentElement:element(),body:element(),querySelector(){return null},querySelectorAll(){return []}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx);

const pesos=[10,10,23,23,34];
function ramo(notas){
  return {id:'f',nombre:'Ramo sintético',creditos:10,gates:[],
    categorias:pesos.map((p,i)=>({id:'c'+i,nombre:'Evaluación '+(i+1),peso:p,notas:[{id:'n'+i,valor:notas[i],peso:1}]}))};
}
ctx.r=ramo([5.1,3.3,4.9,6.7,1.3]);
// (5,1·10 + 3,3·10 + 4,9·23 + 6,7·23 + 1,3·34) / 100 = 3,95 exacto
assert.ok(run('ramoAvg(r)')<3.95,'el caso de prueba sigue reproduciendo el punto flotante');
assert.equal(run('fmtPromedio(ramoAvg(r))'),'4.0','la ficha muestra 4,0');
assert.equal(run('notaAprobadaRamo(r,ramoAvg(r))'),true,'y lo cuenta aprobado');

// Barrido: toda combinación con final exacto en x,x5 redondea hacia arriba.
let probados=0;
for(let a=10;a<=70;a+=3)for(let b=10;b<=70;b+=7)for(let c=10;c<=70;c+=2)for(let d=10;d<=70;d+=5){
  const resto=395*10-(a*10+b*10+c*23+d*23); // décimas×peso del último
  if(resto%34!==0)continue;
  const e=resto/34;if(e<10||e>70)continue;
  const notas=[a,b,c,d,e].map(x=>x/10);
  ctx.r=ramo(notas);probados++;
  assert.equal(run('fmtPromedio(ramoAvg(r))'),'4.0',`${notas.join(' / ')} da 3,95 exacto`);
}
assert.ok(probados>20,'el barrido encontró casos');

// El motor redondea igual (lo usan el MCP y el recuperativo).
assert.equal(run('gh_notaOficial(3.9499999999999993)'),4.0);
assert.equal(run('gh_notaOficial(3.94)'),3.9);
assert.equal(run('notaFinalOficial(3.9449)'),3.9,'el margen no sube lo que de verdad está bajo');
console.log(`OK: un 3,95 exacto redondea a 4,0 (${probados} combinaciones)`);
