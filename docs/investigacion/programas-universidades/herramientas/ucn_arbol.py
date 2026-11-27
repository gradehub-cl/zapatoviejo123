#!/usr/bin/env python3
"""Recorre el listado público «Documentos Escuela de Ingeniería» de la UCN
(losvilos.ucn.cl/InstructivosEscuelaIngenieria/), siguiendo solo los enlaces
?path= que el propio listado ofrece, y anota los archivos que hay.
Uso: python3 -I ucn_arbol.py <salida.json>"""
import sys, os, json, urllib.parse as up
AQUI = os.path.dirname(os.path.abspath(__file__))
SAL = sys.argv[1]
sys.argv = ['crawl.py', os.path.join(AQUI, 'ucn', '_tmp')]
sys.path.insert(0, AQUI)
import crawl
RAIZ = 'https://losvilos.ucn.cl/InstructivosEscuelaIngenieria/'
cola, vistos, archivos, carpetas = [RAIZ], set(), {}, {}
while cola and len(vistos) < 90:
    u = cola.pop(0)
    if u in vistos: continue
    vistos.add(u)
    res = crawl.fetch(u)
    if res['status'] != 200:
        carpetas[u] = res['status']; print('  ', res['status'], res['err'], up.unquote(u)[-70:]);
        if res['status'] in (403, 429, -1): break
        continue
    n = 0
    for h, t in crawl.enlaces(res['url'], res['body']):
        if not h.startswith(RAIZ): continue
        if '?path=' in h:
            if h not in vistos and h not in cola: cola.append(h)
        elif h.lower().rsplit('.', 1)[-1] in ('pdf', 'xlsx', 'xls', 'docx', 'doc', 'pptx'):
            archivos[h] = t; n += 1
    carpetas[u] = n
    print('%3d archivos  %s' % (n, up.unquote_plus(u.split('?path=')[-1]) if '?path=' in u else '/'), flush=True)
json.dump({'carpetas': carpetas, 'archivos': archivos}, open(SAL, 'w'), ensure_ascii=False, indent=1)
print('carpetas:', len(carpetas), 'archivos:', len(archivos), 'peticiones:', crawl.nreq[0], 'pendientes:', len(cola))
