// Armador de horarios: combina secciones de BuscaCursos sin topes y ordena por
// días en la U y ventanas. Siglas, nombres de ramos y profesores INVENTADOS:
// no hay datos de ninguna persona ni de la oferta real.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const elementos={};
function elemento(){return {innerHTML:'',textContent:'',value:'',disabled:false,checked:true,dataset:{},style:{setProperty(){}},
  classList:{add(){},remove(){},contains(){return true}},addEventListener(){},appendChild(){},focus(){},
  setAttribute(){},removeAttribute(){},querySelector(){return null}};}
const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>elementos[id]||(elementos[id]=elemento()),querySelector:()=>elemento(),querySelectorAll:()=>[],
    createElement:elemento,addEventListener(){},documentElement:elemento(),body:elemento(),head:{appendChild(){}}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},
  location:{origin:'https://gradehub.cl',pathname:'/',search:'',hash:''},history:{replaceState(){}},
  setTimeout,clearTimeout,requestAnimationFrame(){return 1},cancelAnimationFrame(){}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(path.join(raiz,f),'utf8'),ctx,{filename:f});
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const armar=(secciones,siglas,pref)=>JSON.parse(JSON.stringify(ctx.armarHorarios(secciones,siglas,pref)));

// Fila con la forma de catalogo_uc_secciones_publicas.
let nrc=1000;
const sec=(sigla,seccion,horario,profesores=['Docente Ficticio'])=>({periodo:'2027-1',nrc:++nrc,sigla,seccion,
  nombre:'Ramo '+sigla,profesores,campus:'San Joaquín',formato:'Presencial',creditos:10,vacantes_total:50,
  vacantes_disponibles:20,horario,retirable:true,ingles:false,aprobacion_especial:false,vigente:true});
const b=(dias,modulo,tipo='CLAS')=>({dias,modulo,tipo,sala:'SIN SALA'});
const nrcs=c=>c.ramos.map(r=>r.sigla+'-'+r.secciones.map(s=>s.seccion).join('/')).join(' ');

console.log('\nCupos');
{
  const lleno=sec('CUP1000',1,[b(['L'],1)]);lleno.vacantes_disponibles=0;
  const libre=sec('CUP1000',2,[b(['L'],1)]);
  const r=armar([lleno,libre],['CUP1000']);
  chk('mismo horario: primero la sección con cupos',r.combinaciones[0].ramos[0].secciones[0].seccion===2&&r.combinaciones[0].ramos[0].secciones[0].cupos===20);
  chk('con una sección libre no hay aviso',!r.combinaciones[0].avisos.some(a=>a.tipo==='sin_cupos'));
  const sinLugar=sec('CUP2000',1,[b(['M'],1)]);sinLugar.vacantes_disponibles=0;
  const conLugar=sec('CUP2000',2,[b(['W'],1)]);
  const r2=armar([sinLugar,conLugar],['CUP2000']);
  chk('horario sin cupos: se propone igual, pero abajo y con aviso',r2.combinaciones.length===2&&r2.combinaciones[0].ramos[0].secciones[0].seccion===2
    &&r2.combinaciones[1].avisos.some(a=>a.tipo==='sin_cupos'&&a.siglas[0]==='CUP2000'));
  const sinDato=sec('CUP3000',1,[b(['J'],1)]);delete sinDato.vacantes_disponibles;
  const r3=armar([sinDato],['CUP3000']);
  chk('sin dato de cupos: no se avisa ni se inventa',r3.combinaciones[0].ramos[0].secciones[0].cupos===null&&!r3.combinaciones[0].avisos.length);
  chk('el texto dice los cupos',ctx.proximoSeccionTexto({seccion:1,profesores:[],cupos:0}).includes('sin cupos')&&ctx.proximoSeccionTexto({seccion:1,profesores:[],cupos:1}).includes('1 cupo'));
  chk('el aviso se lee',ctx.proximoAvisoHorario({tipo:'sin_cupos',siglas:['CUP2000']}).includes('no tiene cupos libres'));
}

console.log('\nTopes de cátedra');
{
  const oferta=[sec('TST1001',1,[b(['L','W'],1)]),sec('TST1001',2,[b(['M','J'],1)]),sec('TST2002',1,[b(['L','W'],1)])];
  const r=armar(oferta,['TST1001','TST2002']);
  chk('una sola combinación posible',r.total===1&&r.combinaciones.length===1);
  chk('evita el tope: TST1001-2 con TST2002-1',nrcs(r.combinaciones[0])==='TST1001-2 TST2002-1');
  const sin=armar([sec('TST1001',1,[b(['L'],1)]),sec('TST2002',1,[b(['L'],1)])],['TST1001','TST2002']);
  chk('si todo topa no propone nada',sin.combinaciones.length===0&&sin.total===0&&!sin.sinOpciones.length);
}

console.log('\nOrden: menos días, luego menos ventanas');
{
  const oferta=[
    sec('TST1001',1,[b(['L','W'],1)]),sec('TST1001',2,[b(['M','J'],1)]),
    sec('TST2002',1,[b(['L','W'],2)]),sec('TST2002',2,[b(['L','W'],4)]),sec('TST2002',3,[b(['V'],1)]),
  ];
  const r=armar(oferta,['TST1001','TST2002']);
  const c=r.combinaciones;
  chk('primera: dos días y sin ventanas',c[0].diasFijos===2&&c[0].ventanas===0&&nrcs(c[0])==='TST1001-1 TST2002-1');
  chk('segunda: mismos días con dos ventanas por día',c[1].diasFijos===2&&c[1].ventanas===4&&nrcs(c[1])==='TST1001-1 TST2002-2');
  chk('las de tres días quedan después',c.slice(2).every(x=>x.diasFijos>=3));
  chk('nunca más de 5 por defecto',c.length<=5);
  chk('maximo acota',armar(oferta,['TST1001','TST2002'],{maximo:2}).combinaciones.length===2);
  const almuerzo=armar([sec('TST1001',1,[b(['L'],4)]),sec('TST2002',1,[b(['L'],5)])],['TST1001','TST2002']);
  chk('el almuerzo entre módulos 4 y 5 no es ventana',almuerzo.combinaciones[0].ventanas===0);
}

console.log('\nDías libres y hora');
{
  const oferta=[sec('TST1001',1,[b(['V'],1)]),sec('TST1001',2,[b(['L'],3),b(['V'],3,'AYU')]),sec('TST1001',3,[b(['M'],1)])];
  const r=armar(oferta,['TST1001'],{diasLibres:['V']});
  chk('descarta la cátedra del viernes',r.combinaciones.every(c=>c.ramos[0].secciones[0].seccion!==1));
  const conAyu=r.combinaciones.find(c=>c.ramos[0].secciones[0].seccion===2);
  chk('la ayudantía del viernes queda con aviso',!!conAyu&&conAyu.avisos.some(a=>a.tipo==='dia_libre'&&a.dia==='V'));
  chk('sin aviso va primero a igual número de días',r.combinaciones[0].ramos[0].secciones[0].seccion===3);
  const temprano=armar(oferta,['TST1001'],{diasLibres:['V'],moduloDesde:2});
  chk('moduloDesde saca el módulo 1',temprano.combinaciones.length===1&&temprano.combinaciones[0].ramos[0].secciones[0].seccion===2);
  const nada=armar([sec('TST1001',1,[b(['V'],1)])],['TST1001'],{diasLibres:['V']});
  chk('si un ramo queda sin secciones lo dice y por qué',nada.combinaciones.length===0&&nada.sinOpciones.length===1
    &&nada.sinOpciones[0].sigla==='TST1001'&&nada.sinOpciones[0].motivo==='dia_libre');
  const tarde=armar([sec('TST1001',1,[b(['L'],9)])],['TST1001'],{moduloHasta:8});
  chk('moduloHasta descarta con motivo hora',tarde.sinOpciones[0]&&tarde.sinOpciones[0].motivo==='hora');
}

console.log('\nAyudantías');
{
  const oferta=[sec('TST1001',1,[b(['L'],1),b(['V'],2,'AYU')]),sec('TST2002',1,[b(['M'],1),b(['V'],2,'AYUD')])];
  const r=armar(oferta,['TST1001','TST2002']);
  chk('dos ayudantías que topan se proponen con aviso',r.combinaciones.length===1
    &&r.combinaciones[0].avisos.some(a=>a.tipo==='tope'&&a.dia==='V'&&a.modulo===2));
  chk('días fijos no cuenta la ayudantía; días totales sí',r.combinaciones[0].diasFijos===2&&r.combinaciones[0].diasTotales===3);
  chk('con ayudantiaFlexible:false el tope se descarta',armar(oferta,['TST1001','TST2002'],{ayudantiaFlexible:false}).combinaciones.length===0);
  const lab=[sec('TST1001',1,[b(['L'],1)]),sec('TST2002',1,[b(['L'],1,'LAB')])];
  chk('un laboratorio es fijo: topa con cátedra',armar(lab,['TST1001','TST2002']).combinaciones.length===0);
  // Decisión de Lucas (2026-11-18): en la UC se puede inscribir con tope de
  // ayudantía, pero no es lo ideal. Se propone con aviso y, a igual número de
  // días y ventanas, va después de la combinación sin tope.
  const elegir=[sec('TST1001',1,[b(['L'],1),b(['M'],3,'AYU')]),sec('TST2002',1,[b(['L'],2),b(['M'],3,'AYU')]),
    sec('TST2002',2,[b(['L'],2),b(['M'],4,'AYU')])];
  const orden=armar(elegir,['TST1001','TST2002']).combinaciones;
  chk('a igual días y ventanas, sin tope de ayudantía va primero',orden.length===2
    &&orden[0].avisos.length===0&&orden[1].avisos.some(a=>a.tipo==='tope'&&a.dia==='M'&&a.modulo===3));
}

console.log('\nSecciones con el mismo horario y profe preferido');
{
  const oferta=[
    sec('TST1001',1,[b(['L','W'],2)],['Ficticia Andrea']),
    sec('TST1001',2,[b(['L','W'],2)],['Inventado Tomás']),
    sec('TST1001',3,[b(['M','J'],2)],['Ejemplo Camila']),
  ];
  const r=armar(oferta,['TST1001']);
  chk('mismo horario = una sola combinación con dos secciones',r.total===2
    &&r.combinaciones.some(c=>c.ramos[0].secciones.length===2));
  const p=armar(oferta,['TST1001'],{profes:{tst1001:'Tomás Inventado'}});
  const g=p.combinaciones.find(c=>c.ramos[0].secciones.length===2);
  chk('reconoce «Nombre Apellido» contra «Apellido Nombre»',g.ramos[0].secciones[0].seccion===2&&g.ramos[0].secciones[0].preferido===true);
  chk('el preferido no rompe el orden por días',p.combinaciones[0].diasFijos===2);
  const desempate=armar(oferta,['TST1001'],{profes:{TST1001:'Ejemplo'}});
  chk('a igual horario gana el profe preferido',desempate.combinaciones[0].ramos[0].secciones[0].seccion===3
    &&desempate.combinaciones[0].profesPreferidos===1);
  chk('sin tildes ni mayúsculas',ctx.armadorProfeCoincide('tomas inventado','INVENTADO TOMÁS')&&!ctx.armadorProfeCoincide('Tomás','Ficticia Andrea'));
  chk('un nombre vacío no coincide con nadie',!ctx.armadorProfeCoincide('  ','Ficticia Andrea'));
}

console.log('\nDatos incompletos y bordes');
{
  const oferta=[sec('TST1001',1,[b(['L'],1),{dias:[],modulo:null,tipo:'CLAS',sala:''},{dias:['L'],modulo:12,tipo:'CLAS'}])];
  const r=armar(oferta,['TST1001']);
  chk('un bloque sin día o módulo no se inventa',r.combinaciones[0].bloques.length===1);
  chk('y queda un aviso de horario incompleto',r.combinaciones[0].avisos.some(a=>a.tipo==='horario_incompleto'));
  const falta=armar(oferta,['TST1001','TST9999']);
  chk('una sigla sin oferta va a sinSecciones',falta.sinSecciones.join()==='TST9999'&&falta.combinaciones.length===0);
  chk('sin siglas no hace nada',armar(oferta,[]).combinaciones.length===0);
  chk('ignora secciones no vigentes',armar([{...sec('TST1001',1,[b(['L'],1)]),vigente:false}],['TST1001']).sinSecciones.join()==='TST1001');
  chk('sigla en minúsculas',armar(oferta,['tst1001']).combinaciones.length===1);
  const dias=armar([sec('TST1001',1,[b(['J','L'],1)])],['TST1001']).combinaciones[0].bloques.map(x=>x.dia).join('');
  chk('bloques de lunes a domingo, no alfabético',dias==='LJ');
  const nulos=armar(null,null,null);
  chk('entradas nulas no se caen',Array.isArray(nulos.combinaciones)&&nulos.combinaciones.length===0);
}

console.log('\nNo muta y no depende del orden');
{
  const oferta=[sec('TST1001',1,[b(['L','W'],1)]),sec('TST1001',2,[b(['M','J'],1)]),sec('TST2002',1,[b(['L','W'],2)]),sec('TST2002',2,[b(['M','J'],3)])];
  const copia=JSON.stringify(oferta);
  const a=armar(oferta,['TST1001','TST2002']);
  chk('no modifica las filas recibidas',JSON.stringify(oferta)===copia);
  const b2=armar(oferta.slice().reverse(),['TST2002','TST1001']);
  chk('mismo resultado con otro orden de entrada',JSON.stringify(a)===JSON.stringify(b2));
}

console.log('\nCarga grande');
{
  const dias=['L','M','W','J','V'];
  const oferta=[];
  for(let r=0;r<7;r++)for(let s=1;s<=12;s++){
    const d1=dias[(r+s)%5],d2=dias[(r+s+2)%5];
    oferta.push(sec('TST'+(3000+r),s,[b([d1,d2],1+((r*3+s)%9)),b(['V'],1+(s%9),'AYU')],['Docente '+s]));
  }
  const t=Date.now();
  const r=armar(oferta,[0,1,2,3,4,5,6].map(i=>'TST'+(3000+i)));
  const ms=Date.now()-t;
  chk('7 ramos × 12 secciones termina en menos de 2 s ('+ms+' ms)',ms<2000);
  chk('propone combinaciones sin tope de fijos',r.combinaciones.length>0&&r.combinaciones.every(c=>{
    const vistos=new Set();
    return c.bloques.filter(x=>x.fijo).every(x=>{const k=x.dia+x.modulo;if(vistos.has(k))return false;vistos.add(k);return true;});
  }));
  chk('ordenadas por días fijos',r.combinaciones.every((c,i,a)=>!i||a[i-1].diasFijos<=c.diasFijos));
}

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
