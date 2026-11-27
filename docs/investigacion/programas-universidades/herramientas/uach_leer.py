#!/usr/bin/env python3
"""Lee identificación y evaluaciones de los programas de Derecho UACh. Cada
programa trae una lista «Evaluaciones (fechas y ponderaciones)»: se guarda el
texto y los porcentajes, sin armar una pauta. No se copian nombres ni correos de
docentes. Uso: python3 -I uach_leer.py <carpeta uach> <destino>"""
import sys, os, re, json, collections, unicodedata
UACH, DEST = sys.argv[1], sys.argv[2]
uno = lambda s: re.sub(r'\s+', ' ', re.sub(r'[\x00-\x08\x0b-\x1f\x7f]', ' ', s)).strip()   # algunos PDF traen caracteres de control
def norm(s):
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()
def programa(t):
    g = lambda rx: (lambda m: uno(m.group(1)) if m else '')(re.search(rx, t))
    p = {'nombre_programa': g(r'NOMBRE ASIGNATURA:\s*(.*)'), 'codigo': g(r'C[óo]digo:\s*(.*)'),
         'periodo': g(r'A[ñn]o y semestre\s+(.*)'), 'semestre_plan': g(r'\n([IVX]+) semestre')}
    m = re.search(r'(?s)Evaluaciones \(fechas y ponderaciones\)\s*:?(.*?)(?:Las fechas de cada una de las evaluaciones|\*Los requisitos de aprobaci|Recursos de aprendizaje)', t)
    ev = uno(re.sub(r'\n--- pág \d+\n', '\n', m.group(1))) if m else ''
    p['en_tabla'] = False
    if not ev:
        # Otros programas no traen la lista: los pesos van dentro de la tabla de
        # unidades («40% de NPE», «Examen Final / 40% NF»). Se juntan las líneas
        # con porcentaje, sin repetir, para que alguien las lea contra el PDF.
        vistas = []
        for l in t.splitlines():
            l = uno(l)
            if re.search(r'\d\s?%', l) and l not in vistas and len(l) < 160:
                vistas.append(l)
        if vistas:
            ev = ' | '.join(vistas); p['en_tabla'] = True
    p['evaluacion'] = ev
    p['porcentajes'] = re.findall(r'\d{1,3}(?:[.,]\d+)?\s?%', ev)
    npe = re.search(r'(?i)(?:NPE\)?|presentaci[óo]n a examen)[^%\d]{0,40}?(\d{1,3})\s?%', ev)
    exa = re.search(r'(?i)(?:(?<!presentación a )(?<!presentacion a )examen(?: final| oral| escrito)*(?: \(EF\))?|\bEF\b)[^%\d]{0,40}?(\d{1,3})\s?%', ev)
    nf = re.search(r'(\d{1,3})\s?% (?:de )?(?:la )?NF\b', ev)
    p['npe'] = npe.group(1) if npe and not p['en_tabla'] else ''
    p['examen'] = exa.group(1) if exa and not p['en_tabla'] else (nf.group(1) if nf else '')
    return p
if __name__ == '__main__':
    F = json.load(open(os.path.join(UACH, 'indice.json')))
    filas, est = [], collections.Counter()
    for r in F:
        if r['nombre'].startswith('*'):
            continue
        f = {'seccion': r['seccion'], 'semestre': r['semestre'] or '', 'nombre': r['nombre'], 'url': r['url'], 'sha256': r.get('sha256', ''), 'paginas': r.get('paginas', '')}
        if r.get('id'):
            f.update(programa(open(os.path.join(UACH, 'txt', r['id'] + '.txt')).read()))
            a, b = norm(re.sub(r'\(disponible.*', '', r['nombre'])), norm(f['nombre_programa'])
            f['enlace_calza'] = 'sí' if a and b and (a in b or b in a) else 'NO: el enlace lleva a «%s»' % f['nombre_programa']
            f['estado'] = 'sin texto' if r.get('chars', 0) < 400 else (('porcentajes solo en la tabla de unidades' if f['en_tabla'] else 'con lista de evaluaciones') if f['porcentajes'] else ('sin porcentajes' if f['evaluacion'] else 'sin porcentajes'))
        else:
            f['estado'] = 'sin programa publicado'
        est[(('obligatoria' if r['semestre'] else 'optativa'), f['estado'])] += 1; filas.append(f)
    cols = ['seccion', 'semestre', 'nombre', 'nombre_programa', 'enlace_calza', 'codigo', 'periodo', 'semestre_plan', 'estado', 'porcentajes', 'evaluacion', 'paginas', 'url', 'sha256']
    with open(os.path.join(DEST, 'programas.tsv'), 'w') as out:
        out.write('\t'.join(cols) + '\n')
        for f in filas:
            out.write('\t'.join(str('; '.join(f.get(c, '')) if isinstance(f.get(c, ''), list) else f.get(c, '')).replace('\t', ' ') for c in cols) + '\n')
    print(len(filas), {' / '.join(k): v for k, v in est.items()})
    obl = [f for f in filas if f['semestre']]
    print('enlaces que no calzan:', [(f['semestre'], f['nombre'][:38], f['nombre_programa'][:38]) for f in filas if f.get('enlace_calza', 'sí') != 'sí'])
    print('períodos:', collections.Counter(f.get('periodo', '')[:26] for f in filas if f.get('nombre_programa')).most_common(6))
    print('con código:', sum(1 for f in filas if f.get('codigo')), '· npe+examen:', sum(1 for f in filas if f.get('npe') and f.get('examen')), '· esquemas NPE/examen:', collections.Counter((f.get('npe'), f.get('examen')) for f in obl if f.get('npe')).most_common(6))
    ROM = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10}
    print('semestre página ≠ programa:', [(f['nombre'][:30], f['semestre'], f['semestre_plan']) for f in obl if f.get('semestre_plan') and f.get('enlace_calza') == 'sí' and ROM.get(f['semestre_plan']) != f['semestre']])
    for f in obl[1:2] + obl[30:32]:
        print('==', f['semestre'], f['nombre'], '|', f.get('codigo', '')[:50], '|', f.get('periodo')); print('   ', f.get('npe'), f.get('examen'), f.get('porcentajes'), '|', f.get('evaluacion', '')[:300])
