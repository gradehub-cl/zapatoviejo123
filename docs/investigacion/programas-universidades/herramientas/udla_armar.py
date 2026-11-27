#!/usr/bin/env python3
"""Arma udla/programas.tsv y udla/cruce_mallas.tsv. Uso: python3 -I udla_armar.py <datos> <mallas> <destino>"""
import sys, os, re, json, glob, unicodedata, collections, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import udla_tabla
DATOS, MALLAS, DEST = sys.argv[1:4]
def norm(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').upper()
    return re.sub(r'\s+', ' ', re.sub(r'[^A-Z0-9 ]+', ' ', s)).strip()
P = [json.loads(l) for l in open(os.path.join(DATOS, 'programas.jsonl'))]
con = sorted((p for p in P if p['archivo']), key=lambda p: p['sigla_pedida'])
fmt = lambda xs: '; '.join('%s %s' % (n, ('%g' % v)) for n, v in xs)
est = collections.Counter()
with open(os.path.join(DEST, 'programas.tsv'), 'w') as f:
    f.write('sigla\tnombre\tcreditos_scudla\tversion\tvigente_desde\tactualizado\tmodalidad\trequisitos\tllego_por\testado_tabla\tesquema\tcomponentes\tsubcomponentes\tsin_decidir\teximicion\turl\n')
    for p in con:
        t = udla_tabla.tabla(p['ponderaciones_crudo']); p['_t'] = t; est[t['estado']] += 1
        f.write('\t'.join([p['sigla_pedida'], p.get('nombre', ''), p.get('creditos_scudla', ''), p['archivo'][:-4].replace(p['sigla_pedida'], ''), p.get('vigencia_desde', ''),
            p.get('actualizado', ''), p.get('modalidad', ''), ' '.join(p.get('requisitos', [])), p['origen'], t['estado'], ' | '.join(t['esquemas']),
            fmt(t['componentes']), fmt(t['subcomponentes']), fmt(t['sin_decidir']) + (' // ' + ' / '.join(t['lineas_raras']) if t['lineas_raras'] else ''),
            p.get('eximicion', '').replace('\t', ' '), p['url']]) + '\n')
filas = []
for fpath in sorted(glob.glob(os.path.join(MALLAS, '*.txt'))):
    t = open(fpath).read()
    m = re.search(r'MALLA CURRICULAR(.*?)(?:Contenido y mallas sujet|TÍTULO PROFESIONAL|$)', t, re.S)
    if not m: continue
    malla = ' ' + norm(m.group(1)) + ' '
    carrera = re.sub(r'-UDLA-2027(-1)?$', '', os.path.basename(fpath)[:-4]).replace('-', ' ')
    por_nombre = collections.defaultdict(list)
    for p in con:
        if p.get('nombre') and ' ' + norm(p['nombre']) + ' ' in malla:
            por_nombre[p['nombre']].append(p['sigla_pedida'])
    filas.append((carrera, len(set(re.findall(r'SEMESTRE (\d+)', malla))), por_nombre))
with open(os.path.join(DEST, 'cruce_mallas.tsv'), 'w') as f:
    f.write('carrera\tsemestres_en_el_folleto\tnombres_de_la_malla_con_programa\tdetalle (nombre = siglas con ese nombre)\n')
    for c, sem, pn in filas:
        f.write('%s\t%d\t%d\t%s\n' % (c, sem, len(pn), '; '.join('%s = %s' % (n.title(), '/'.join(s)) for n, s in sorted(pn.items()))))
print('programas:', len(con), dict(est), '· no encontradas:', sum(1 for p in P if not p['archivo']))
print('carreras:', len(filas), '· nombres distintos que calzan por carrera:', sorted(((len(pn), c) for c, s, pn in filas), reverse=True)[:6], '…', sorted((len(pn), c) for c, s, pn in filas)[:3])
print('modalidades:', collections.Counter(p.get('modalidad', '') for p in con).most_common(6))
for s in ('LCE001', 'LCE0016', 'LCE0017', 'MAT100', 'MAT1007', 'MAT1009'):
    p = next((x for x in con if x['sigla_pedida'] == s), None)
    if p: print(' ', s, '|', p['nombre'], '|', p['modalidad'], '|', fmt(p['_t']['componentes']))
random.seed(7)
for p in random.sample([x for x in con if x['_t']['estado'] == 'cerrada'], 3):
    print('== muestra', p['sigla_pedida'], p['nombre']); print('   crudo:', ' | '.join(p['ponderaciones_crudo'])[:300]); print('   comp:', fmt(p['_t']['componentes']), '· sub:', fmt(p['_t']['subcomponentes'])[:200])
print('creditos vacíos:', sum(1 for p in con if not p.get('creditos_scudla')), '· sin nombre:', sum(1 for p in con if not p.get('nombre')))
