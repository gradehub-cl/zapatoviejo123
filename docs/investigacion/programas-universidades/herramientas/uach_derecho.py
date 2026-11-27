#!/usr/bin/env python3
"""Derecho UACh: lee la página «Programas y Malla» (diez semestres de ramos
obligatorios y las optativas, cada uno con su programa en PDF), baja los PDF y
deja su texto. Mismas reglas de lectura que crawl.py.
Uso: python3 -I uach_derecho.py <pdftexto>"""
import sys, os, re, json, html, shutil, subprocess, hashlib
AQUI = os.path.dirname(os.path.abspath(__file__))
PDFTEXTO = sys.argv[1]
sys.argv = ['crawl.py', os.path.join(AQUI, 'uach', '_tmp')]
sys.path.insert(0, AQUI)
import crawl
PAG = 'https://derecho.uach.cl/programas-y-mallas/'
ROM = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10}
limpio = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
b = crawl.fetch(PAG)['body']
filas, seccion, sem = [], '', 0
for m in re.finditer(r'<h1\b[^>]*>(.*?)</h1>|<h2\b[^>]*>(.*?)</h2>|<li\b[^>]*>(.*?)</li>', b, re.S | re.I):
    if m.group(1) is not None:
        seccion, sem = limpio(m.group(1)), 0
    elif m.group(2) is not None:
        t = re.match(r'^([IVX]+) Semestre$', limpio(m.group(2)))
        sem = ROM[t.group(1)] if t else 0
    else:
        li = m.group(3)
        a = re.search(r'href\s*=\s*["\']([^"\']+\.pdf)["\']', li, re.I)
        nombre = limpio(li)
        if not nombre or len(nombre) > 120 or not (a or sem):
            continue
        filas.append({'seccion': seccion, 'semestre': sem, 'nombre': nombre, 'url': __import__('urllib.parse').parse.urljoin(PAG, html.unescape(a.group(1)).strip()) if a else ''})
os.makedirs(os.path.join(AQUI, 'uach', 'pdf'), exist_ok=True); os.makedirs(os.path.join(AQUI, 'uach', 'txt'), exist_ok=True)
vistos = {}
for r in filas:
    r.update(status='', bytes=0, paginas=0, id='', sha256='')
    if not r['url']:
        continue
    if r['url'] in vistos:
        r.update({k: vistos[r['url']][k] for k in ('status', 'bytes', 'paginas', 'id', 'sha256', 'chars') if k in vistos[r['url']]}); continue
    ya = os.path.join(AQUI, 'uach', 'pdf', hashlib.md5(r['url'].encode()).hexdigest()[:10] + '.pdf')
    if os.path.exists(ya):   # ya se bajó en una corrida anterior: no se vuelve a pedir
        res = {'status': 200}; tmp = ya
    else:
        res = crawl.fetch(r['url'], 25000000); tmp = os.path.join(crawl.OUT, '_body.tmp')
    r['status'] = res['status']
    if res['status'] == 200 and os.path.exists(tmp) and open(tmp, 'rb').read(5) == b'%PDF-':
        datos = open(tmp, 'rb').read()
        r['id'] = hashlib.md5(r['url'].encode()).hexdigest()[:10]; r['bytes'] = len(datos); r['sha256'] = hashlib.sha256(datos).hexdigest()
        pdf = os.path.join(AQUI, 'uach', 'pdf', r['id'] + '.pdf')
        if tmp != pdf: shutil.copyfile(tmp, pdf)
        t = subprocess.run([PDFTEXTO, pdf], capture_output=True, text=True, timeout=120).stdout
        open(os.path.join(AQUI, 'uach', 'txt', r['id'] + '.txt'), 'w').write(t)
        r['paginas'] = int(t.split('\n', 1)[0].replace('PAGINAS=', '') or 0) if t.startswith('PAGINAS=') else 0
        r['chars'] = len(t)
    vistos[r['url']] = r
    print('%s %2d %3dp %8d %-40s %s' % (r['status'], r['semestre'], r['paginas'], r['bytes'], r['nombre'][:40], r['url'].rsplit('/', 1)[-1][:45]), flush=True)
    if res['status'] in (403, 429, -1): print('Host detenido'); break
json.dump(filas, open(os.path.join(AQUI, 'uach', 'indice.json'), 'w'), ensure_ascii=False, indent=1)
obl = [r for r in filas if r['semestre']]
print('filas:', len(filas), '· obligatorias:', len(obl), 'con PDF:', sum(1 for r in obl if r['id']), '· peticiones:', crawl.nreq[0])
print({s: sum(1 for r in obl if r['semestre'] == s) for s in range(1, 11)})
print('secciones:', {s: sum(1 for r in filas if r['seccion'] == s) for s in dict.fromkeys(r['seccion'] for r in filas)})
print('obligatorias sin PDF:', [(r['semestre'], r['nombre']) for r in obl if not r['url']])
