#!/usr/bin/env python3
"""Baja los PDF de programas, mallas, calendarios, reglamentos y electivos del
listado de la UCN y deja su texto en ucn/txt/. Uso: python3 -I ucn_bajar.py <arbol.json> <pdftexto>"""
import sys, os, json, shutil, subprocess, hashlib, urllib.parse as up
AQUI = os.path.dirname(os.path.abspath(__file__))
ARBOL, PDFTEXTO = sys.argv[1], sys.argv[2]
sys.argv = ['crawl.py', os.path.join(AQUI, 'ucn', '_tmp')]
sys.path.insert(0, AQUI)
import crawl
R = 'https://losvilos.ucn.cl/InstructivosEscuelaIngenieria/'
QUIERO = ('E. Mallas y programas de estudios/', 'B. Calendarios/', 'C. Calendario Académico/', 'J. Reglamentos/', 'D. Electivos EIC/')
arch = json.load(open(ARBOL))['archivos']
os.makedirs(os.path.join(AQUI, 'ucn', 'pdf'), exist_ok=True); os.makedirs(os.path.join(AQUI, 'ucn', 'txt'), exist_ok=True)
idx = os.path.join(AQUI, 'ucn', 'indice.jsonl')
hechos = set(json.loads(l)['url'] for l in open(idx)) if os.path.exists(idx) else set()
with open(idx, 'a') as out:
    for u in sorted(arch):
        rel = up.unquote(u[len(R):])
        if u in hechos or not rel.startswith(QUIERO) or not rel.lower().endswith('.pdf'):
            continue
        res = crawl.fetch(R + up.quote(rel), 25000000)   # el listado enlaza con espacios y tildes sin codificar
        tmp = os.path.join(crawl.OUT, '_body.tmp')
        r = {'url': u, 'ruta': rel, 'status': res['status'], 'err': res['err'], 'bytes': 0, 'paginas': 0, 'id': ''}
        if res['status'] == 200 and os.path.exists(tmp) and open(tmp, 'rb').read(5) == b'%PDF-':
            r['id'] = hashlib.md5(rel.encode()).hexdigest()[:10]
            r['bytes'] = os.path.getsize(tmp)
            pdf = os.path.join(AQUI, 'ucn', 'pdf', r['id'] + '.pdf')
            shutil.copyfile(tmp, pdf)
            t = subprocess.run([PDFTEXTO, pdf], capture_output=True, text=True, timeout=120).stdout
            open(os.path.join(AQUI, 'ucn', 'txt', r['id'] + '.txt'), 'w').write(t)
            r['paginas'] = int(t.split('\n', 1)[0].replace('PAGINAS=', '') or 0) if t.startswith('PAGINAS=') else 0
            r['chars'] = len(t)
        out.write(json.dumps(r, ensure_ascii=False) + '\n'); out.flush()
        print('%s %3dp %7d %s' % (res['status'], r['paginas'], r['bytes'], rel[-80:]), flush=True)
        if res['status'] in (403, 429, -1): print('Host detenido'); break
print('peticiones:', crawl.nreq[0])
