// El Laboratorio de Dinámica tiene que dar exactamente la "Nota lab" de la
// planilla oficial: el promedio de los laboratorios hechos, donde el Lab 0 (sin
// control) es 0,7·Informe + 0,3·Pares y los Labs 1–5 son
// 0,7·Informe + 0,1·Control + 0,2·Pares. Se comprobó contra la planilla real
// (630 de 630 filas iguales); acá van datos inventados.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return stub},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);
['data.js','engine.js','app.js','app-session.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(raiz,f),'utf8'),ctx));
const g=n=>vm.runInContext(n,ctx);
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const cerca=(a,b)=>a!==null&&Math.abs(a-b)<1e-9;
g("S.tenant='uc'");

const notaLab=l=>l.lab===0?0.7*l.informe+0.3*l.pares:0.7*l.informe+0.1*l.control+0.2*l.pares;
// El laboratorio tal como lo crea el catálogo, con las notas en su casilla.
function laboratorio(labs){
  const p=g('presetRamo')('Laboratorio de Dinámica','uc','ING-PC');
  const cat=n=>p.categorias.find(c=>c.nombre===n);let i=0;
  labs.forEach(l=>{
    if(l.informe!=null)cat('Informes').notas.push({id:'i'+i++,nombre:'Informe',valor:l.informe,peso:1,slot:l.lab});
    if(l.pares!=null)cat('Evaluación de pares').notas.push({id:'p'+i++,nombre:'Pares',valor:l.pares,peso:1,slot:l.lab});
    if(l.lab>=1&&l.control!=null)cat('Controles').notas.push({id:'c'+i++,nombre:'Control',valor:l.control,peso:1,slot:l.lab-1});
  });
  const r={id:'lab',nombre:'Laboratorio de Dinámica',color:'#000',creditos:0,origen:{tenant:'uc',carrera:'ING-PC'},
    categorias:p.categorias,gates:p.gates,promedioParcial:p.promedioParcial,pautaHuella:g('huellaPauta')(p.categorias)};
  g('S').ramos=[r];return r;
}

console.log('\n=== Igual a la planilla, laboratorio por laboratorio ===');
{
  const labs=[{lab:0,informe:6.2,pares:6.5},{lab:1,informe:5.4,control:3.0,pares:6.8}];
  const r=laboratorio(labs);
  const planilla=(notaLab(labs[0])+notaLab(labs[1]))/2;
  chk(`con el Lab 0 y el Lab 1 hechos da su promedio (${planilla.toFixed(4)})`,cerca(g('ramoAvg')(r),planilla));
  const solo0=laboratorio([labs[0]]);
  chk('con solo el Lab 0 da 0,7·Informe + 0,3·Pares',cerca(g('ramoAvg')(solo0),notaLab(labs[0])));
  const todos=[{lab:0,informe:6.0,pares:7.0},...[1,2,3,4,5].map(n=>({lab:n,informe:5+n/10,control:2+n/2,pares:6.5}))];
  const completo=laboratorio(todos);
  const esperado=todos.reduce((s,l)=>s+notaLab(l),0)/6;
  chk(`con los 6 laboratorios da el promedio de las 6 "Nota lab" (${esperado.toFixed(4)})`,cerca(g('ramoAvg')(completo),esperado));
}

console.log('\n=== El Lab 0 no tiene control: su 10% va a su evaluación de pares ===');
{
  // Antes (10/70/20 parejos) quedaba corrido en (pares Lab 0 − controles) ÷ 60.
  const todos=[{lab:0,informe:5,pares:7},...[1,2,3,4,5].map(n=>({lab:n,informe:5,control:1,pares:5}))];
  const r=laboratorio(todos);
  const esperado=todos.reduce((s,l)=>s+notaLab(l),0)/6;
  chk(`pares altos en el Lab 0 y controles bajos: ${esperado.toFixed(4)}, no ${(esperado-0.1).toFixed(4)}`,cerca(g('ramoAvg')(r),esperado));
}

console.log('\n=== El mínimo de pares mira el promedio simple de las seis ===');
{
  // Ponderado (Lab 0 vale 1,5) daría (1,5·5,0 + 3,0)/2,5 = 4,2 y cumpliría;
  // simple da 4,0 y cumple justo. Con 3,0 y 4,8: simple 3,9 no cumple.
  const cumple=laboratorio([{lab:0,informe:6,pares:5.0},{lab:1,informe:6,control:6,pares:3.0}]);
  chk('pares 5,0 y 3,0: promedio simple 4,0, no topa',g('gatesActivas')(cumple).length===0);
  const baja=laboratorio([{lab:0,informe:6,pares:4.8},{lab:1,informe:6,control:6,pares:3.0}]);
  chk('pares 4,8 y 3,0: promedio simple 3,9, topa en 3,9 aunque el ponderado sea 4,1',
    g('gatesActivas')(baja).length===1&&cerca(g('ramoAvg')(baja),3.9));
  const yaBaja=laboratorio([{lab:0,informe:2,pares:3},{lab:1,informe:2,control:2,pares:3}]);
  const nf=(notaLab({lab:0,informe:2,pares:3})+notaLab({lab:1,informe:2,control:2,pares:3}))/2;
  chk(`si la nota ya es menor que 3,9, queda esa (${nf.toFixed(2)})`,cerca(g('ramoAvg')(yaBaja),nf));
}

console.log('\n=== Mecanismo: peso por casilla y promedio por casilla ===');
{
  // La pauta va escrita acá: esto prueba el motor, no el catálogo.
  const cat=(id,peso,notas,extra={})=>({id,nombre:id,peso,directNota:true,notas,...extra});
  const r={id:'m',nombre:'M',categorias:[
    cat('a',50,[{id:'a0',valor:7,peso:1,slot:0}],{slots:2,pesosCasillas:[3,1]}),
    cat('b',50,[{id:'b0',valor:1,peso:1,slot:0}],{slots:2})],gates:[]};
  g('S').ramos=[r];
  chk('sin marca especial también pondera las casillas rendidas (4,6)',cerca(g('ramoAvg')(r),4.6));
  r.promedioParcial='por-casilla';
  // a0 pesa 50·3/4 = 37,5 y b0 pesa 25: (7·37,5 + 1·25)/62,5 = 4,6
  chk('por casilla, cada nota con su peso en el ramo (4,6)',cerca(g('ramoAvg')(r),4.6));
  r.categorias[0].notas.push({id:'a1',valor:3,peso:1,slot:1});r.categorias[1].notas.push({id:'b1',valor:5,peso:1,slot:1});
  r.promedioParcial=null;const sin=g('ramoAvg')(r);r.promedioParcial='por-casilla';
  chk('con todo rendido, las dos cuentas dan lo mismo',cerca(g('ramoAvg')(r),sin)&&cerca(sin,0.5*(7*0.75+3*0.25)+0.5*3));
}

console.log('\n=== Las cuentas que ya existen ===');
{
  // Un laboratorio creado con la pauta vieja (10/70/20) se corrige solo al
  // cargar y conserva sus notas en su casilla.
  const r=laboratorio([{lab:0,informe:6.2,pares:6.5},{lab:1,informe:5.4,control:3.0,pares:6.8}]);
  r.categorias.forEach(c=>{if(c.nombre==='Controles')c.peso=10;if(c.nombre==='Evaluación de pares'){c.peso=20;delete c.pesosCasillas;}});
  delete r.promedioParcial;r.pautaHuella=g('huellaPauta')(g('catsDePauta')(r.categorias));
  const datos=g('normalize')({...g('freshState')(),tenant:'uc',ramos:[JSON.parse(JSON.stringify(r))]});
  const c=datos.ramos[0];
  const pares=c.categorias.find(x=>x.nombre==='Evaluación de pares');
  chk('la pauta vieja se corrige al cargar',cerca(c.categorias.find(x=>x.nombre==='Controles').peso,25/3)&&JSON.stringify(pares.pesosCasillas)==='[1.5,1,1,1,1,1]'&&c.promedioParcial==='por-casilla');
  chk('y las notas siguen en su casilla',pares.notas.map(n=>n.slot+':'+n.valor).join(',')==='0:6.5,1:6.8');
  g('S').ramos=[c];
  chk('y da lo mismo que la planilla',cerca(g('ramoAvg')(c),(0.7*6.2+0.3*6.5+0.7*5.4+0.1*3+0.2*6.8)/2));
  // Quien la editó no se toca: decide con el aviso de pauta cambiada.
  const editado=JSON.parse(JSON.stringify(r));editado.categorias.find(x=>x.nombre==='Informes').peso=69;editado.categorias.find(x=>x.nombre==='Controles').peso=11;
  editado.pautaHuella=g('huellaPauta')(g('catsDePauta')(editado.categorias));
  const d2=g('normalize')({...g('freshState')(),tenant:'uc',ramos:[editado]});
  chk('una pauta editada a mano no se corrige sola',d2.ramos[0].categorias.find(x=>x.nombre==='Controles').peso===11);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail?1:0);
