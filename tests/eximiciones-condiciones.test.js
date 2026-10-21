const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const raiz=__dirname+'/../';
const src=['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js']
  .map(f=>fs.readFileSync(raiz+f,'utf8')).join('\n');
function el(){return {style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},
  children:[],dataset:{},innerHTML:'',textContent:'',value:'',hidden:false,
  addEventListener(){},appendChild(h){this.children.push(h);return h;},setAttribute(){},removeAttribute(){},
  getAttribute(){return null},querySelector(){return this},querySelectorAll(){return []},focus(){},remove(){}};}
const ids={};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>ids[id]||(ids[id]=el()),createElement:el,addEventListener(){},documentElement:el(),querySelector(){return el()},querySelectorAll(){return []},body:el()},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},
  location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},
  getComputedStyle:()=>({getPropertyValue:()=>''}),setTimeout(fn){fn();return 0},clearTimeout(){},
  requestAnimationFrame(){return 0},cancelAnimationFrame(){},console,gtag(){}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const api=vm.runInContext('({presetRamo,ramoAvg,estadoEximicion,estadoSegundaFecha,categoriaEximida,ramoCompletamenteEvaluado,gh_notaOficial,gh_reglasNota,PRESETS_UAI,PRESETS_UANDES,PRESETS_POR_TENANT,CARRERAS_DECLARABLES,definicionPresetDelRamo})',ctx);
const run=code=>vm.runInContext(code,ctx);
let id=0;
function nota(valor,slot){return {id:'n'+(++id),nombre:'Nota',valor,peso:1,...(slot===undefined?{}:{slot})};}
function ramo(nombre,tenant,carrera){
  const p=api.presetRamo(nombre,tenant,carrera);
  assert.ok(p,`pauta ${tenant}/${carrera}/${nombre}`);
  return {id:'r'+(++id),nombre,origen:{tenant,carrera},categorias:p.categorias,gates:p.gates||[],
    recuperativo:p.recuperativo,reglasAusenciaJustificada:p.reglasAusenciaJustificada};
}
function poner(r,nombre,valores){
  const c=r.categorias.find(x=>x.nombre===nombre);
  assert.ok(c,nombre);
  c.notas=valores.map((valor,i)=>nota(valor,Number.isInteger(c.slots)&&c.slots>1?i:undefined));
}
function todas(r,teoria,practica){
  poner(r,'Teoría',[teoria]);poner(r,'Laboratorios',[practica,practica,practica,practica,practica]);
  poner(r,'Trabajo',[practica]);
}
api.PRESETS_UAI['Curso sintético']={evals:[
  ['Teoría',35],['Laboratorios',26.25,{slots:5,dropLowest:{count:1}}],['Trabajo',8.75],
  ['Examen teórico',15],['Examen práctico',15]],
  eximicion:{evaluaciones:['Examen teórico','Examen práctico'],segun:['Teoría','Laboratorios','Trabajo'],
    min:5,minimos:[{evaluaciones:['Teoría'],min:4},{evaluaciones:['Laboratorios','Trabajo'],min:4}],
    ignoraDescartes:false,comparaNotaOficial:true,requiereConfirmacion:true,
    sinAusenciasJustificadas:true,requierePautaOriginal:true,ocultaEvaluacion:true,
    etiqueta:'los dos exámenes',confirmar:'rendiste todas las pruebas'}};
const r=ramo('Curso sintético','uai','UAI-INGENIERIA-COMERCIAL');
run("S={...freshState(),tenant:'uai',ramos:[]}");
todas(r,4.94,4.94);
assert.equal(api.gh_notaOficial(4.94,api.gh_reglasNota('uai')),4.9);
assert.equal(api.estadoEximicion(r).elegible,false,'4,94 no alcanza 5,0 oficial');
todas(r,4.95,4.95);
assert.equal(api.gh_notaOficial(4.95,api.gh_reglasNota('uai')),5);
assert.equal(api.estadoEximicion(r).elegible,true,'4,95 es 5,0 oficial en UAI');
assert.equal(api.estadoEximicion(r).activa,false,'la parte no verificable exige confirmar');
todas(r,5,5);
assert.equal(api.estadoEximicion(r).puedeConfirmar,true,'5,0 exacto habilita la confirmación');
todas(r,3.8,6.2);
assert.equal(api.estadoEximicion(r).razon,'minimo_categoria','ET insuficiente bloquea aunque presentación sea 5,0');
todas(r,3.94,6.06);
assert.equal(api.estadoEximicion(r).razon,'minimo_categoria','3,94 en ET queda bajo 4,0 oficial');
todas(r,3.95,6.05);
assert.equal(api.estadoEximicion(r).elegible,true,'3,95 en ET llega a 4,0 oficial');
todas(r,6.2,3.8);
assert.equal(api.estadoEximicion(r).razon,'minimo_categoria','EP insuficiente bloquea');
todas(r,5,6);
poner(r,'Laboratorios',[1,6,6,6,6]);
assert.equal(api.estadoEximicion(r).promedio,5.5,'la presentación usa los cuatro mejores laboratorios');
r.eximicionConfirmada=true;
assert.equal(api.estadoEximicion(r).activa,true);
assert.equal(api.ramoCompletamenteEvaluado(r),true,'los dos exámenes quedan cubiertos');
assert.equal(api.ramoAvg(r),5.5,'la final sin exámenes es 50% teoría y 50% práctica');
assert.equal(r.categorias.filter(c=>api.categoriaEximida(r,c)).length,2);
r.categorias[0].peso=36;
assert.equal(api.estadoEximicion(r),null,'una pauta personalizada no activa una regla de la pauta original');
r.categorias[0].peso=35;
r.ausenciasJustificadas=[r.categorias[0].id];
assert.equal(api.estadoEximicion(r).razon,'ausencia_justificada');
assert.equal(api.ramoCompletamenteEvaluado(r),false);
r.ausenciasJustificadas=[];
poner(r,'Examen práctico',[6]);
assert.equal(api.estadoEximicion(r).razon,'examen_rendido','un examen rendido impide eximir ambos');
assert.equal(r.categorias.filter(c=>api.categoriaEximida(r,c)).length,0);
poner(r,'Examen práctico',[]);delete r.eximicionConfirmada;
ctx.__cursoSintetico=r;
run("S={...freshState(),tenant:'uai',ramos:[__cursoSintetico]};currentRamoId=__cursoSintetico.id;showConfirm=(titulo,cuerpo,accion)=>{__dialogo={titulo,cuerpo,accion}}");
run('confirmarEximicionActual()');
const dialogo=ctx.__dialogo;
assert.match(dialogo.cuerpo,/rendiste todas las pruebas/,'el flujo pregunta solo lo que la app no sabe');
assert.match(dialogo.cuerpo,/los dos exámenes/);
r.eximicionConfirmada=true;
run('renderRamo()');
assert.match(ids['ramo-min-chip'].textContent,/los dos exámenes/);
assert.equal(ids['cat-list'].children.some(c=>/Examen teórico|Examen práctico/.test(c.innerHTML)),false,
  'la ficha oculta ambos exámenes al confirmar');

api.PRESETS_UANDES['Curso sintético']={...api.PRESETS_UAI['Curso sintético']};
const andes=ramo('Curso sintético','uandes',null);
run("S.tenant='uandes'");
todas(andes,4.944,4.944);
assert.equal(api.gh_notaOficial(4.944,api.gh_reglasNota('uandes')),4.9);
assert.equal(api.estadoEximicion(andes).elegible,false);
todas(andes,4.945,4.945);
assert.equal(api.gh_notaOficial(4.945,api.gh_reglasNota('uandes')),5);
assert.equal(api.estadoEximicion(andes).elegible,true,'se aplica el redondeo doble de UAndes');

api.PRESETS_UAI['Segunda fecha sintética']={evals:[['Presentación',70],['Examen',30]],
  segundaFecha:{evaluacion:'Examen',finalMin:3.5,finalMax:3.9,aviso:'Consulta la fecha'}};
const segunda=ramo('Segunda fecha sintética','uai',null);
run("S.tenant='uai'");
poner(segunda,'Presentación',[3.7]);
assert.equal(api.estadoSegundaFecha(segunda).aviso,false,'sin examen no aparece el aviso');
poner(segunda,'Examen',[3.7]);
assert.equal(api.estadoSegundaFecha(segunda).aviso,true,'solo avisa en el rango');
assert.equal(api.ramoAvg(segunda),3.7,'el aviso no modifica la nota');
ctx.__segunda=segunda;
run("S={...freshState(),tenant:'uai',ramos:[__segunda]};currentRamoId=__segunda.id;renderRamo()");
assert.match(ids['eximicion-warning'].innerHTML,/Podrías rendir un segundo examen/);
poner(segunda,'Presentación',[4.2]);poner(segunda,'Examen',[4.2]);
assert.equal(api.estadoSegundaFecha(segunda).aviso,false);
run('renderRamo()');
assert.equal(ids['eximicion-warning'].innerHTML,'','fuera del rango no se muestra el aviso');

for(const nombre of ['Razonamiento Cuantitativo con Datos I','Razonamiento Cuantitativo con Datos II']){
  const def=api.PRESETS_UAI[nombre];
  assert.equal(def.eximicion.evaluaciones.length,2,`${nombre}: ambos exámenes declarados`);
  assert.equal(def.eximicion.minimos.length,2,`${nombre}: teoría y práctica declaradas`);
  assert.equal((def.noCalcula||[]).some(t=>/exim/i.test(t)),false,`${nombre}: la eximición ya se calcula`);
}
assert.ok(api.PRESETS_UAI['Matemáticas Avanzadas I'].segundaFecha,'la segunda fecha solo avisa');

// Todas las pautas disponibles en cada carrera: con presentación sintética
// insuficiente, quitar la regla de eximición no puede cambiar el promedio.
let combinaciones=0,intentadas=0;
for(const [tenant,presets] of Object.entries(api.PRESETS_POR_TENANT)){
  const carreras=(api.CARRERAS_DECLARABLES[tenant]||[]).map(c=>c.malla||c.codigo||c.id||null);
  for(const carrera of carreras){
    run(`S.tenant=${JSON.stringify(tenant)}`);
    for(const nombre of Object.keys(presets)){
      intentadas++;
      const p=api.presetRamo(nombre,tenant,carrera);
      if(!p)continue;
      const curso={id:'reg'+(++id),nombre,origen:{tenant,carrera},categorias:p.categorias,gates:p.gates||[],
        recuperativo:p.recuperativo,reglasAusenciaJustificada:p.reglasAusenciaJustificada};
      for(const c of curso.categorias){
        if((presets[nombre].eximicion?.evaluaciones||[presets[nombre].eximicion?.evaluacion]).includes(c.nombre))continue;
        c.notas=Array.from({length:Number.isInteger(c.slots)&&c.slots>1?c.slots:1},(_,i)=>
          nota(2,Number.isInteger(c.slots)&&c.slots>1?i:undefined));
      }
      const conRegla=api.ramoAvg(curso);
      const def=api.definicionPresetDelRamo(curso);
      const original=def.eximicion;
      delete def.eximicion;
      let sinRegla;
      try{sinRegla=api.ramoAvg(curso);}finally{if(original)def.eximicion=original;}
      assert.equal(conRegla,sinRegla,`${tenant}/${carrera}/${nombre}: sin condición no cambia`);
      combinaciones++;
    }
  }
}
assert.ok(combinaciones>1000,`se probaron ${combinaciones} combinaciones`);
console.log(`Eximiciones con condiciones: OK (${combinaciones} pautas disponibles de ${intentadas} combinaciones pauta × carrera)`);
