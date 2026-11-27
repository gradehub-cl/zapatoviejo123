#!/usr/bin/env python3
"""Lee identificación y evaluación de los programas de Ingeniería Civil PUCV.
La evaluación viene en prosa: se guarda el texto, los porcentajes y las fórmulas
que nombra, sin interpretarlos. Uso: python3 -I pucv_leer.py <carpeta pucv> <destino>"""
import sys, os, re, json, collections
PUCV, DEST = sys.argv[1], sys.argv[2]
uno = lambda s: re.sub(r'\s+', ' ', s).strip()
def entre(t, ini, fin):
    m = re.search(ini + r'(.*?)' + fin, t, re.S)
    return uno(m.group(1)) if m else ''
def programa(t):
    p = {'sigla': re.sub(r'\s*[-–]\s*|\s+', '', entre(t, r'\nSigla\s+', r'\n')).upper(),
         'nombre_programa': entre(t, r'\nNombre Asignatura\s+', r'\nCr[ée]ditos'),
         'creditos': re.sub(r'\D', '', entre(t, r'\nCr[ée]ditos\s+', r'\n'))[:2],
         'semestre_programa': re.sub(r'\D', '', entre(t, r'\nSemestre\s+', r'\n'))[:2],
         'requisitos': entre(t, r'\nRequisitos\s+', r'\nHoras Te[óo]ricas'),
         'decreto': entre(t, r'Decreto Programa\s*\n?\s*de\s*\n?\s*Estudio\s+', r'\n')}
    m = re.search(r'(?s)VI\.\s*EVALUACI[ÓO]N DE LOS RESULTADOS DE APRENDIZAJE(.*?)\n\s*VII\.', t)
    ev = uno(re.sub(r'\n--- pág \d+\n', '\n', m.group(1))) if m else ''
    p['evaluacion'] = ev
    p['porcentajes'] = re.findall(r'\d{1,3}(?:[.,]\d+)?\s?%', ev)
    p['formulas'] = [uno(x) for x in re.findall(r'(?:NF|NP|Nota [Ff]inal|N\.?F\.?)\s*=\s*[^\n.;]{4,80}', m.group(1) if m else '')]
    ex = re.search(r'(?i)(exim[^.]{0,160}\.)', ev)
    p['eximicion'] = ex.group(1) if ex else ''
    return p
if __name__ == '__main__':
    I = json.load(open(os.path.join(PUCV, 'indice.json')))
    filas, est = [], collections.Counter()
    for r in I['plan']:
        f = {'semestre': r['semestre'], 'nombre': r['nombre'], 'url': r['url'], 'sha256': r.get('sha256', ''), 'paginas': r.get('paginas', '')}
        if r.get('id'):
            f.update(programa(open(os.path.join(PUCV, 'txt', r['id'] + '.txt')).read()))
            f['estado'] = 'con porcentajes' if f['porcentajes'] else ('sin porcentajes' if f['evaluacion'] else 'sin sección de evaluación')
        else:
            f['estado'] = 'sin programa publicado'
        est[f['estado']] += 1; filas.append(f)
    cols = ['semestre', 'nombre', 'sigla', 'creditos', 'semestre_programa', 'requisitos', 'decreto', 'estado', 'porcentajes', 'formulas', 'eximicion', 'evaluacion', 'paginas', 'url', 'sha256']
    with open(os.path.join(DEST, 'programas.tsv'), 'w') as out:
        out.write('\t'.join(cols) + '\n')
        for f in filas:
            out.write('\t'.join(str('; '.join(f.get(c, '')) if isinstance(f.get(c, ''), list) else f.get(c, '')).replace('\t', ' ') for c in cols) + '\n')
    print(len(filas), dict(est))
    con = [f for f in filas if f.get('sigla')]
    print('con sigla', len(con), 'créditos', sum(1 for f in con if f['creditos']), 'requisitos', sum(1 for f in con if f['requisitos']), 'fórmulas', sum(1 for f in con if f['formulas']), 'eximición', sum(1 for f in con if f['eximicion']))
    print('semestre página ≠ programa:', [(f['nombre'], f['semestre'], f['semestre_programa']) for f in con if f['semestre_programa'] and int(f['semestre_programa']) != f['semestre']])
    print('nombre página vs programa distintos:', [(f['nombre'], f['nombre_programa']) for f in con if re.sub(r'\W', '', f['nombre'].lower()) != re.sub(r'\W', '', f['nombre_programa'].lower())][:8])
    for f in con[:1] + con[20:22]:
        print('==', f['semestre'], f['sigla'], '|', f['nombre'], '|', f['creditos'], '| req:', f['requisitos'][:70]); print('   ', f['porcentajes'], f['formulas'], '|', f['eximicion'][:110]); print('   ', f['evaluacion'][:330])
