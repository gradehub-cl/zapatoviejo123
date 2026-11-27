#!/usr/bin/env python3
"""Ingeniería Civil PUCV: lee la página «Plan de estudios» (11 semestres, cada
ramo con su programa en PDF cuando lo publica), baja los programas y la malla y
deja su texto. Mismas reglas de lectura que crawl.py.
Uso: python3 -I pucv_eic.py <pdftexto>"""
import sys, os, re, json, html, shutil, subprocess, hashlib
AQUI = os.path.dirname(os.path.abspath(__file__))
PDFTEXTO = sys.argv[1]
sys.argv = ['crawl.py', os.path.join(AQUI, 'pucv', '_tmp')]
sys.path.insert(0, AQUI)
import crawl
PAG = 'https://eic.pucv.cl/estudia-con-nosotros/plan-de-estudios/'
limpio = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
b = crawl.fetch(PAG)['body']
plan, otros = [], []
for m in re.finditer(r'<h2[^>]*>\s*(\d{2})\s*</h2>(.*?)(?=<h2|\Z)', b, re.S):
    sem = int(m.group(1))
    lista = re.search(r'<ul[^>]*>(.*?)</ul>', m.group(2), re.S)
    for li in re.findall(r'<li[^>]*>(.*?)</li>', lista.group(1) if lista else '', re.S):
        a = re.search(r'href\s*=\s*["\']([^"\']+)["\']', li)
        plan.append({'semestre': sem, 'nombre': limpio(li), 'url': a.group(1) if a else ''})
for u, t in crawl.enlaces(PAG, b):
    if u.lower().endswith('.pdf') and re.search(r'malla|plan_de_estudios', u, re.I):
        otros.append({'semestre': 0, 'nombre': t.replace('arrow_right_alt', '').strip(), 'url': u})
os.makedirs(os.path.join(AQUI, 'pucv', 'pdf'), exist_ok=True); os.makedirs(os.path.join(AQUI, 'pucv', 'txt'), exist_ok=True)
for r in plan + otros:
    r.update(status='', bytes=0, paginas=0, id='', sha256='')
    if not r['url']:
        continue
    res = crawl.fetch(r['url'], 25000000)
    tmp = os.path.join(crawl.OUT, '_body.tmp')
    r['status'] = res['status']
    if res['status'] == 200 and os.path.exists(tmp) and open(tmp, 'rb').read(5) == b'%PDF-':
        datos = open(tmp, 'rb').read()
        r['id'] = hashlib.md5(r['url'].encode()).hexdigest()[:10]; r['bytes'] = len(datos); r['sha256'] = hashlib.sha256(datos).hexdigest()
        pdf = os.path.join(AQUI, 'pucv', 'pdf', r['id'] + '.pdf'); shutil.copyfile(tmp, pdf)
        t = subprocess.run([PDFTEXTO, pdf], capture_output=True, text=True, timeout=120).stdout
        open(os.path.join(AQUI, 'pucv', 'txt', r['id'] + '.txt'), 'w').write(t)
        r['paginas'] = int(t.split('\n', 1)[0].replace('PAGINAS=', '') or 0) if t.startswith('PAGINAS=') else 0
        r['chars'] = len(t)
    print('%s %2d %3dp %8d %s' % (r['status'], r['semestre'], r['paginas'], r['bytes'], r['nombre'][:60]), flush=True)
    if res['status'] in (403, 429, -1): print('Host detenido'); break
json.dump({'plan': plan, 'otros': otros}, open(os.path.join(AQUI, 'pucv', 'indice.json'), 'w'), ensure_ascii=False, indent=1)
print('ramos en el plan:', len(plan), 'con programa:', sum(1 for r in plan if r['id']), 'peticiones:', crawl.nreq[0])
print({s: sum(1 for r in plan if r['semestre'] == s) for s in sorted(set(r['semestre'] for r in plan))})
print('sin programa:', [(r['semestre'], r['nombre']) for r in plan if not r['url']])
