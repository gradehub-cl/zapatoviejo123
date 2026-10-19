// Un requisito que el catálogo agrega se le ofrece a quien ya tenía el ramo (#627).
//
// cambioDePauta() comparaba nombres, pesos y reglas de fórmula, pero no las
// compuertas. Si el programa decía "sin 4,0 en lo individual repruebas" y lo
// cargábamos después, quien ya tenía el ramo seguía viendo un promedio
// aprobado mientras reprobaba, y la app nunca se lo ofrecía. Ese es el peor
// error que puede tener: un promedio más alto que el real.
//
// No se aplica solo: baja un promedio, así que se muestra y la persona decide,
// igual que un cambio de pesos. Y una pauta recién creada no puede recibir un
// aviso falso: eso llenaría de avisos a todas las cuentas que están al día.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console,
};
vm.createContext(ctx);
['data.js', 'engine.js', 'app.js'].forEach(f => vm.runInContext(fs.readFileSync(raiz + f, 'utf8'), ctx));
const g = n => vm.runInContext(n, ctx);

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

// La pauta va escrita acá: es un test de mecanismo y el catálogo se edita.
const RAMO = 'Ramo de prueba requisito nuevo';
const EVALS = [['Pitch', 20], ['Columna', 20], ['Solemne', 20], ['Presentación grupal', 40]];
const GRUPO = { nombre: 'Trabajo individual', evals: ['Pitch', 'Columna', 'Solemne'], min: 4.0, cap: 'self' };
const ponerPreset = (extra = {}) => g('PRESETS_FEN')[RAMO] = { evals: EVALS, ...extra };

// El ramo como lo guardó la app el día que se creó, sin el requisito.
const guardado = notas => {
  ponerPreset();
  const p = g('presetRamo')(RAMO, 'fen', 'IC');
  const r = { id: 'r1', nombre: RAMO, color: '#000', creditos: null, origen: { tenant: 'fen', carrera: 'IC' },
    categorias: p.categorias, gates: p.gates, pautaHuella: g('huellaPauta')(p.categorias) };
  r.categorias.forEach((c, i) => { if (notas[c.nombre] != null) c.notas = [{ id: 'n' + i, nombre: c.nombre, valor: notas[c.nombre], peso: 1 }]; });
  return r;
};
const cargar = ramo => g('normalize')({ tenant: 'fen', carrera: 'IC', ramos: [JSON.parse(JSON.stringify(ramo))] }).ramos[0];
g("S.tenant='fen';S.carrera='IC';S.onboardingDone=true;S.ramos=[]");
const promedio = r => { g('S').ramos = [r]; return g('ramoAvg')(r); };
// 3,0 en lo individual y 7,0 en lo grupal: 0,6·3 + 0,4·7 = 4,6 sin el requisito.
const NOTAS = { Pitch: 3.0, Columna: 3.0, Solemne: 3.0, 'Presentación grupal': 7.0 };

console.log('\n=== Sin el requisito, el promedio sale aprobado ===');
const viejo = guardado(NOTAS);
chk('4,6 mientras el programa dice que reprueba', Math.abs(promedio(viejo) - 4.6) < 1e-9);

console.log('\n=== El catálogo agrega el requisito: se ofrece, no se aplica solo ===');
ponerPreset({ grupos: [GRUPO] });
{
  const r = cargar(viejo);
  const cambio = g('cambioDePauta')(r);
  chk('ofrece el cambio aunque los pesos sean los mismos', !!cambio);
  chk('dice qué requisito llega', !!cambio && cambio.cambios.length === 1 && /Requisito nuevo del programa\. Trabajo individual: el promedio de «Pitch», «Columna», «Solemne» tiene que ser al menos 4,0;/.test(cambio.cambios[0].nombre));
  chk('y en cuánto queda la final si no se cumple', !!cambio && /tu final queda en ese promedio/.test(cambio.cambios[0].nombre));
  chk('cargar no lo aplica: el promedio sigue igual hasta que la persona decide', Math.abs(promedio(r) - 4.6) < 1e-9 && !(r.gates || []).some(x => x.type === 'group_min'));

  console.log('\n=== Al aceptar ===');
  g('S').ramos = [r];
  chk('actualizar funciona', g('actualizarPauta')('r1') === true);
  chk('queda la compuerta de grupo', r.gates.some(x => x.type === 'group_min' && x.catIds.length === 3 && x.cap === 'self'));
  chk('el promedio queda en lo individual, reprobado', Math.abs(promedio(r) - 3.0) < 1e-9);
  chk('las notas siguen en su lugar', JSON.stringify(r.categorias.map(c => c.notas.map(n => n.valor))) === '[[3],[3],[3],[7]]');
  chk('y ya no lo ofrece', g('cambioDePauta')(r) === null);
  chk('cargarlo de nuevo no lo vuelve a ofrecer', g('cambioDePauta')(cargar(r)) === null);
}

console.log('\n=== Lo que la persona editó manda ===');
{
  const editado = JSON.parse(JSON.stringify(viejo));
  editado.categorias[3].peso = 45; editado.categorias[0].peso = 15;
  chk('una pauta editada no recibe el requisito', g('cambioDePauta')(cargar(editado)) === null);
}

console.log('\n=== Un requisito que el catálogo saca también se dice ===');
{
  const conRequisito = cargar(viejo);
  g('S').ramos = [conRequisito]; g('actualizarPauta')('r1');
  ponerPreset();
  const cambio = g('cambioDePauta')(cargar(conRequisito));
  chk('se ofrece', !!cambio && cambio.cambios.length === 1);
  chk('como "deja de aplicarse"', !!cambio && /^Deja de aplicarse: Trabajo individual/.test(cambio.cambios[0].nombre));
}

console.log('\n=== Un mínimo por evaluación, igual ===');
{
  ponerPreset();
  const r = guardado({ Solemne: 2.0, Pitch: 7, Columna: 7, 'Presentación grupal': 7 });
  g('PRESETS_FEN')[RAMO] = { evals: [['Pitch', 20], ['Columna', 20], ['Solemne', 20, { min: 3.0, cap: 3.9 }], ['Presentación grupal', 40]] };
  const cambio = g('cambioDePauta')(cargar(r));
  chk('se ofrece el mínimo nuevo', !!cambio && cambio.cambios.length === 1 && /«Solemne» con mínimo 3,0: si no llegas, tu final queda en máximo 3,9/.test(cambio.cambios[0].nombre));
}

console.log('\n=== Todo el catálogo: una pauta recién creada está al día ===');
// La propiedad que importa para no llenar de avisos a nadie: cualquier ramo
// recién creado desde cualquier pauta, de cualquier universidad y carrera, no
// tiene nada que ofrecer.
delete g('PRESETS_FEN')[RAMO];
{
  const falsos = [];
  let revisados = 0;
  const porTenant = g('PRESETS_POR_TENANT');
  const carreras = g('CARRERAS_DECLARABLES');
  for (const tenant of Object.keys(porTenant)) {
    const codigos = [null, ...((carreras[tenant] || []).map(c => c.malla).filter(Boolean))];
    for (const nombre of Object.keys(porTenant[tenant])) {
      for (const carrera of codigos) {
        const p = g('presetRamo')(nombre, tenant, carrera);
        if (!p || !(p.categorias || []).length) continue;
        revisados++;
        const r = { id: 'x', nombre, color: '#000', creditos: null, origen: { tenant, carrera },
          categorias: p.categorias, gates: p.gates, aporta: p.aporta || null, pautaHuella: g('huellaPauta')(p.categorias) };
        g('S').tenant = tenant; g('S').carrera = carrera;
        const cambio = g('cambioDePauta')(r);
        if (cambio) falsos.push(`${tenant}/${carrera || '-'}/${nombre}: ${cambio.cambios.map(c => c.nombre).join(' / ')}`);
      }
    }
  }
  chk(`ninguna de las ${revisados} pautas recién creadas recibe un aviso falso`, revisados > 100 && falsos.length === 0);
  falsos.slice(0, 10).forEach(f => console.log('       ' + f));
}

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
