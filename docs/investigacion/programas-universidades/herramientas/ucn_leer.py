#!/usr/bin/env python3
"""Lee la identificación y la sección de evaluación de los programas de la
Escuela de Ingeniería UCN (Coquimbo). La evaluación viene en prosa: se guarda el
texto y los porcentajes que nombra, no una tabla.
Uso: python3 -I ucn_leer.py <carpeta ucn> <destino>"""
import sys, os, re, json, collections
UCN, DEST = sys.argv[1], sys.argv[2]
R = 'https://losvilos.ucn.cl/InstructivosEscuelaIngenieria/'
def campo(t, rx):
    m = re.search(r'(?m)^\s*' + rx + r'\s*:?\s*(.*)$', t)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
def lista(t, ini, fin):
    m = re.search(ini + r'(.*?)' + fin, t, re.S)
    if not m: return []
    xs = [re.sub(r'\s+', ' ', x).strip(' ▪•-–·') for x in re.split(r'[▪•]|\n(?=[-–] )', m.group(1))]
    return [x for x in xs if x and not re.match(r'^(Pre ?- ?Requisitos|Requisito para)', x)]
def programa(t):
    # Una de las tres carreras publica sus PDF sin espacios en las etiquetas
    # («Nombredelaasignatura:») y con guion blando en los códigos.
    t = t.replace('\u00ad', '-')
    e = lambda frase: r'\s*'.join(frase.split())
    p = {'carrera': campo(t, e('Carrera o Programa')), 'unidad': campo(t, e('Unidad responsable')),
         'nombre': campo(t, e('Nombre de la asignatura')),
         'semestre': re.sub(r'\D', '', campo(t, e('Semestre en la malla') + r'\s*\d{0,2}?\s*(?=:)'))[:2],
         'creditos_sct': re.sub(r'\D', '', campo(t, r'Créditos\s*SCT\s*[–-]\s*Chile'))[:2]}
    m = re.search(r'(?m)^\s*Código\s*:?\s*([A-Z]{3,5})[ -]?(\d{4,5})\b', t)
    p['codigo'] = m.group(1) + '-' + m.group(2) if m else ''
    juntos = re.search(r'Pre\s*-\s*[Rr]equisitos\s*:\s*Requisito\s*para\s*:', t)
    if juntos:   # las dos columnas quedan mezcladas en el texto: no se sabe cuál es cuál
        p['prerrequisitos'], p['requisito_para'] = [], []
        p['requisitos_sin_separar'] = lista(t, r'Pre\s*-\s*[Rr]equisitos\s*:\s*Requisito\s*para\s*:', r'\n\s*II\.\s*ORGANIZACI')
    else:
        p['prerrequisitos'] = lista(t, r'Pre ?- ?Requisitos\s*:', r'Requisito para\s*:')
        p['requisito_para'] = lista(t, r'Requisito para\s*:', r'\n\s*(?:II\.|2\.)?\s*ORGANIZACI[ÓO]N SEMESTRAL')
        p['requisitos_sin_separar'] = []
    m = re.search(r'(?is)ORIENTACIONES\s*Y\s*CRITERIOS\s*PARA\s*(?:LA\s*)?EVALUACI[ÓO]N(.*?)(?:\n\s*(?:[IVX]+\.|\d+\.)?\s*RECURSOS\s*BIBLIOGR|\n\s*Bibliograf[íi]a\s*m[íi]nima)', t)
    ev = ''
    if m:
        ev = re.sub(r'\n\d{1,3}\n--- pág \d+\n', '\n', m.group(1))      # número de página y salto
        ev = re.sub(r'\s+', ' ', ev).strip()
    p['evaluacion'] = ev
    p['porcentajes'] = re.findall(r'\d{1,3}(?:[.,]\d+)?\s?%', ev)
    asis = re.search(r'(?i)asistencia[^.%]{0,60}?(\d{2,3})\s?%|(\d{2,3})\s?%[^.]{0,40}asistencia', ev)
    p['asistencia'] = (asis.group(1) or asis.group(2)) + '%' if asis else ''
    return p
if __name__ == '__main__':
    I = [json.loads(l) for l in open(os.path.join(UCN, 'indice.jsonl'))]
    P = sorted((r for r in I if '/Programas/' in r['ruta'] and r['id']), key=lambda r: r['ruta'])
    est = collections.Counter(); filas = []
    for r in P:
        t = open(os.path.join(UCN, 'txt', r['id'] + '.txt')).read()
        p = programa(t)
        _, _, plan, sem, archivo = r['ruta'].split('/', 4)
        p.update(plan=plan, carpeta=sem, archivo=archivo, paginas=r['paginas'], url=R + __import__('urllib.parse').parse.quote(r['ruta']))
        pesos = [x for x in p['porcentajes'] if x.rstrip('% ') != p['asistencia'].rstrip('%')]
        p['estado'] = 'sin texto' if r.get('chars', 0) < 400 else ('sin sección de evaluación' if not p['evaluacion'] else ('con porcentajes' if pesos else 'sin porcentajes'))
        est[p['estado']] += 1; filas.append(p)
    with open(os.path.join(DEST, 'programas.tsv'), 'w') as f:
        cols = ['plan', 'carpeta', 'codigo', 'nombre', 'creditos_sct', 'semestre', 'unidad', 'prerrequisitos', 'requisito_para', 'requisitos_sin_separar', 'estado', 'asistencia', 'porcentajes', 'evaluacion', 'paginas', 'url']
        f.write('\t'.join(cols) + '\n')
        for p in filas:
            f.write('\t'.join(str('; '.join(p[c]) if isinstance(p[c], list) else p[c]).replace('\t', ' ') for c in cols) + '\n')
    print(len(filas), dict(est))
    for c in ('codigo', 'nombre', 'creditos_sct', 'semestre', 'carrera', 'prerrequisitos', 'requisito_para', 'requisitos_sin_separar'):
        print('  con %s: %d' % (c, sum(1 for p in filas if p[c])))
    print('códigos distintos:', len(set(p['codigo'] for p in filas)), '· prefijos:', collections.Counter(p['codigo'].split()[0] if p['codigo'] else '' for p in filas).most_common(8))
    for p in filas[:1] + filas[70:72]:
        print('==', p['plan'], p['carpeta'], '|', p['codigo'], '|', p['nombre'], '|', p['creditos_sct'], '| sem', p['semestre'], '| pre', p['prerrequisitos'], '| para', p['requisito_para'][:3]); print('   ', p['estado'], p['asistencia'], p['porcentajes'], '|', p['evaluacion'][:260])
    print('sin sección:', [(p['plan'], p['archivo'][:40]) for p in filas if p['estado'] == 'sin sección de evaluación'][:8])
