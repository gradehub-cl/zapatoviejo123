// "Necesitas X" tiene que considerar las compuertas. Pautas sintéticas escritas
// acá: ningún caso depende del catálogo.
//
// El solver resolvía solo el promedio ponderado y las compuertas se aplicaban
// después, así que la cifra podía ser una con la que se reprueba igual: con
// "presentación a examen ≥ 3,0" decía 4,7 y con 4,7 en todo lo pendiente la
// presentación quedaba en 2,85 y topaba la final ahí. O decía "ya tienes el
// 4,0 asegurado" con un examen pendiente que exige 4,0.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const src=['data.js','engine.js','app.js','render-agenda.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelectorAll(){return [];},querySelector(){return stub;},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=c=>vm.runInContext(c,ctx);
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

const nota=(id,valor)=>({id,nombre:id,valor,peso:1});
const cat=(id,nombre,peso,notas=[])=>({id,nombre,peso,directNota:true,notas});
const ramo=(categorias,gates)=>({id:'r1',nombre:'Ramo Sintético',color:'#456',creditos:null,origen:null,categorias,gates});
// Pone `x` en cada evaluación sin nota y devuelve la nota final oficial.
function finalCon(r,x){
  ctx.__r=JSON.stringify(r);ctx.__x=x;
  return run(`(()=>{const r=JSON.parse(__r);r.categorias.forEach(c=>{if(!c.notas.length)c.notas.push({id:'x-'+c.id,nombre:c.nombre,valor:__x,peso:1});});S.ramos=[r];return notaFinalOficial(ramoAvg(r));})()`);
}
function necesita(r,tenant,meta){
  ctx.__r=JSON.stringify(r);ctx.__t=tenant;ctx.__m=meta;
  return run(`(()=>{S.tenant=__t;const r=JSON.parse(__r);S.ramos=[r];return notaNecesaria(r,__m);})()`);
}
// La cifra que se muestra (nfNecesaria redondea hacia arriba a la décima)
// aprueba, y una décima menos ya no.
function justa(nombre,r,tenant,meta=4){
  const n=necesita(r,tenant,meta);
  const mostrada=Number(run(`nfNecesaria(${n})`));
  run(`S.tenant=${JSON.stringify(tenant)}`);
  chk(`${nombre}: con ${mostrada} en todo lo pendiente llega a ${meta}`,finalCon(r,mostrada)>=meta);
  chk(`${nombre}: con ${(mostrada-0.1).toFixed(1)} no llega`,finalCon(r,Math.round((mostrada-0.1)*10)/10)<meta);
  return n;
}

console.log('\n=== Compuerta de grupo sin aproximación (presentación a examen, UAndes) ===');
const presentacion=ramo([cat('c1','Control',20,[nota('n1',1)]),cat('c2','Trabajo',20),cat('ex','Examen',60)],
  [{type:'group_min',catIds:['c1','c2'],min:3,cap:'self',exacto:true,nombre:'Presentación a examen'}]);
// El ponderado pide 4,68; la presentación, (1 + X) / 2 ≥ 3,0 → X ≥ 5,0.
const n1=justa('presentación',presentacion,'uandes');
chk(`pide 5,0 y no el 4,68 del ponderado (${n1.toFixed(3)})`,Math.abs(n1-5)<0.001);

console.log('\n=== Examen pendiente con mínimo: no está asegurado ===');
const examen=ramo([cat('p','Pruebas',70,[nota('n1',6)]),cat('ex','Examen',30)],
  [{type:'min_grade_required',catId:'ex',min:4,cap:3.9,nombre:'Examen'}]);
// Sin la compuerta salía negativo: "Ya tienes el 4,0 asegurado".
const n2=justa('examen con mínimo',examen,'uc');
chk(`pide 3,95 en el examen (${n2.toFixed(3)})`,Math.abs(n2-3.95)<0.001);
chk('con 3,9 en el examen la final queda topada en 3,9',finalCon(examen,3.9)===3.9);

console.log('\n=== Compuerta que ya cerró bajo el mínimo ===');
const cerrada=ramo([cat('p','Pruebas',60),cat('ex','Examen',40,[nota('n1',3)])],
  [{type:'min_grade_required',catId:'ex',min:4,cap:3.9,nombre:'Examen'}]);
const n3=necesita(cerrada,'uc',4);
chk(`ya no es posible: fuera de escala (${n3})`,n3>7);
chk('y de verdad ni con 7,0 se aprueba',finalCon(cerrada,7)<4);

console.log('\n=== Un tope sobre la meta no cambia nada ===');
// Meta 3,5 con tope 3,9: aunque la compuerta se incumpla, la meta se alcanza.
const n4=necesita(examen,'uc',3.5);
chk(`meta 3,5 resuelve solo el ponderado (${n4.toFixed(3)})`,n4<1);
const sinCompuertas=ramo([cat('p','Pruebas',70,[nota('n1',3)]),cat('ex','Examen',30)],[]);
const n5=necesita(sinCompuertas,'uc',4);
chk(`sin compuertas sigue igual: (3,95 − 2,1) / 0,3 (${n5.toFixed(3)})`,Math.abs(n5-(3.95-2.1)/0.3)<0.001);

console.log('\n=== El agente (MCP) calcula con el mismo motor ===');
const motor={module:{exports:{}},console};vm.createContext(motor);
vm.runInContext(fs.readFileSync(path.join(raiz,'engine.js'),'utf8'),motor);
const norm=s=>String(s||'').trim().toLowerCase();
const calculo=motor.module.exports.gh_crearCalculoRamo({normName:norm,copiarRecuperativo:()=>null,definicionPresetDelRamo:()=>null,ramos:()=>[presentacion],tenant:()=>'uandes'});
chk('el MCP pide lo mismo que la app',Math.abs(calculo.notaNecesaria(JSON.parse(JSON.stringify(presentacion)),4)-n1)<1e-9);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
