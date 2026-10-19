// El 2026-10-15 la corrección automática de la pauta del Laboratorio de
// Dinámica (corrigePautas) dejó cuentas con todas sus evaluaciones dos veces:
// la copia del teléfono y la de la nube se corrigieron por separado, cada una
// con ids nuevos al azar, y la sincronización —que empareja por id— sumó las
// dos. Esto reproduce ese camino con datos inventados y comprueba el arreglo y
// la reparación de las cuentas que ya quedaron duplicadas.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false},toggle(){}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return[]},querySelector(){return stub},clientWidth:400,dataset:{},click(){}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console};
vm.createContext(ctx);
['data.js','engine.js','app.js','app-session.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(raiz,f),'utf8'),ctx));
const g=n=>vm.runInContext(n,ctx);
let ok=0,fail=0;const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const clon=x=>JSON.parse(JSON.stringify(x));
const nombres=r=>r.categorias.filter(c=>!c.fueraDePauta).map(c=>c.nombre);
const normalizar=d=>g('normalize')({...g('freshState')(),...clon(d)});
g("S.tenant='uc'");

// Un laboratorio con la pauta que publicamos mal (10/70/20) y notas puestas.
function estadoViejo(){
  const p=g('presetRamo')('Laboratorio de Dinámica','uc','ING-PC');
  p.categorias.forEach(c=>{if(c.nombre==='Controles')c.peso=10;if(c.nombre==='Evaluación de pares'){c.peso=20;delete c.pesosCasillas;}});
  const cat=n=>p.categorias.find(c=>c.nombre===n);
  cat('Controles').notas.push({id:'n-c1',nombre:'Control 1',valor:7,peso:1,slot:0});
  cat('Evaluación de pares').notas.push({id:'n-p0',nombre:'Pares',valor:7,peso:1,slot:0},{id:'n-p1',nombre:'Pares',valor:7,peso:1,slot:1});
  const r={id:'lab-1',nombre:'Laboratorio de Dinámica',color:'#a73',creditos:0,origen:{tenant:'uc',carrera:'ING-PC'},
    categorias:p.categorias,gates:p.gates};
  r.pautaHuella=g('huellaPauta')(g('catsDePauta')(r.categorias));
  return {...g('freshState')(),tenant:'uc',carrera:'ING-PC',ramos:[r]};
}

console.log('\n=== El teléfono y la nube se corrigen por separado ===');
{
  const base=estadoViejo();                       // lo último que se sincronizó
  const local=normalizar(base);                   // el teléfono abre la app nueva
  const nube=normalizar(base);                    // la nube, leída y normalizada aparte
  chk('las dos copias corregidas quedan idénticas',JSON.stringify(local)===JSON.stringify(nube));
  const junto=normalizar(g('fusionarSync')(clon(base),clon(local),clon(nube)));
  chk(`la sincronización no duplica nada (${nombres(junto.ramos[0]).join(', ')})`,
    nombres(junto.ramos[0]).join('|')==='Controles|Informes|Evaluación de pares');
  const pares=junto.ramos[0].categorias.find(c=>c.nombre==='Evaluación de pares');
  chk('las notas siguen en su casilla',pares.notas.map(n=>n.id+':'+n.slot).join()==='n-p0:0,n-p1:1');
  chk('el mínimo de pares apunta a la evaluación que existe',junto.ramos[0].gates.some(gt=>gt.catId===pares.id));
  chk('cada evaluación conserva el id que tenía',base.ramos[0].categorias.map(c=>c.id).join()===junto.ramos[0].categorias.map(c=>c.id).join());
}

console.log('\n=== Las cuentas que ya quedaron duplicadas se reparan ===');
{
  // Así quedó una cuenta: las tres evaluaciones dos veces, con las mismas
  // notas, y el mínimo apuntando solo a una de las copias.
  const viejo=estadoViejo().ramos[0];
  const copia=(sufijo,peso)=>viejo.categorias.map(c=>({...clon(c),id:c.id+sufijo,
    peso:c.nombre==='Controles'?25/3:c.nombre==='Evaluación de pares'?65/3:c.peso,
    ...(c.nombre==='Evaluación de pares'?{pesosCasillas:[1.5,1,1,1,1,1]}:{})}));
  const roto={...clon(viejo),promedioParcial:'por-casilla',categorias:[...copia('-x'),...copia('-y')],
    gates:[{type:'min_grade_required',catId:viejo.categorias[2].id+'-y',min:4,cap:3.9,nombre:'Evaluación de pares'}]};
  roto.pautaHuella=g('huellaPauta')(g('catsDePauta')(copia('-x')));
  // Otra nota se anotó en una sola de las copias después de duplicarse.
  roto.categorias[4].notas.push({id:'n-i2',nombre:'Informe 2',valor:6,peso:1,slot:2});
  const enTelefono={...g('freshState')(),tenant:'uc',ramos:[roto]};
  const enNube={...g('freshState')(),tenant:'uc',ramos:[{...clon(roto),categorias:[...clon(roto.categorias)].reverse()}]};
  const a=normalizar(enTelefono),b=normalizar(enNube);
  chk(`queda cada evaluación una vez (${nombres(a.ramos[0]).join(', ')})`,nombres(a.ramos[0]).length===3);
  const total=a.ramos[0].categorias.reduce((s,c)=>s+c.peso,0);
  chk(`vuelve a sumar 100% (${total.toFixed(2)})`,Math.abs(total-100)<1e-6);
  const informes=a.ramos[0].categorias.find(c=>c.nombre==='Informes');
  chk('no se pierde la nota que estaba en una sola copia',informes.notas.some(n=>n.id==='n-i2'));
  const pares=a.ramos[0].categorias.find(c=>c.nombre==='Evaluación de pares');
  chk('las notas repetidas quedan una vez',pares.notas.map(n=>n.id).join()==='n-p0,n-p1');
  chk('el mínimo de pares pasa a la que queda',a.ramos[0].gates.length===1&&a.ramos[0].gates[0].catId===pares.id);
  chk('el teléfono y la nube se reparan igual, aunque las tengan en otro orden',
    JSON.stringify([...a.ramos[0].categorias].sort((x,y)=>x.id.localeCompare(y.id)))===JSON.stringify([...b.ramos[0].categorias].sort((x,y)=>x.id.localeCompare(y.id))));
  const junto=normalizar(g('fusionarSync')(clon(enTelefono),clon(a),clon(b)));
  chk('y al sincronizar no se vuelven a duplicar',nombres(junto.ramos[0]).length===3);
}

console.log('\n=== Lo que no es este error no se toca ===');
{
  const cat=(id,nombre,peso)=>({id,nombre,peso,directNota:true,notas:[{id:'n'+id,valor:5,peso:1}]});
  const manual={id:'m',nombre:'Taller',origen:null,categorias:[cat('a','Tarea',50),cat('b','Tarea',50)],gates:[]};
  chk('un ramo manual con dos "Tarea" que suman 100% sigue igual',
    normalizar({tenant:'uc',ramos:[manual]}).ramos[0].categorias.length===2);
  const cien={...manual,origen:{tenant:'uc',carrera:'ING-PC'},categorias:[cat('a','Prueba',50),cat('b','Prueba',50)]};
  chk('uno del catálogo con dos evaluaciones iguales que suman 100% tampoco',
    normalizar({tenant:'uc',ramos:[cien]}).ramos[0].categorias.length===2);
  const distinto={...cien,categorias:[cat('a','Prueba',60),cat('b','Prueba',50),cat('c','Examen',40)]};
  chk('ni si las repetidas tienen pesos distintos',normalizar({tenant:'uc',ramos:[distinto]}).ramos[0].categorias.length===3);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail?1:0);
