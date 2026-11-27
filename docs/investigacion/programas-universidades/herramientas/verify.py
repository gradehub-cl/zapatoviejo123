#!/usr/bin/env python3
"""Lee una vez cada URL encontrada por el buscador y anota si responde, si es un
PDF de verdad y cuánto pesa. Mismas reglas que crawl.py (robots, 1,15 s, sin
sesión, detenerse ante 403/429). Los PDF quedan en pdf/<codigo>/ solo para
leerlos; no se ejecuta nada de ellos.

Uso: python3 -I verify.py urls | indices | ucampus
"""
import sys, os, re, json, shutil, html
AQUI = os.path.dirname(os.path.abspath(__file__))
modo = sys.argv[1]
sys.argv = ['crawl.py', os.path.join(AQUI, 'out_verif')]
sys.path.insert(0, AQUI)
import crawl
import urllib.parse as up
# Hosts que ya respondieron 403 en esta investigación: no se vuelven a tocar.
for h in os.environ.get('DETENIDOS', '').split():
    crawl.blocked[h] = 403

def leer(url, code, nombre):
    res = crawl.fetch(url, 9000000)
    tmp = os.path.join(crawl.OUT, '_body.tmp')
    es_pdf, peso = False, 0
    if res['status'] == 200 and os.path.exists(tmp):
        peso = os.path.getsize(tmp)
        with open(tmp, 'rb') as f:
            es_pdf = f.read(5) == b'%PDF-'
        if es_pdf and nombre:
            d = os.path.join(AQUI, 'pdf', code)
            os.makedirs(d, exist_ok=True)
            shutil.copyfile(tmp, os.path.join(d, nombre + '.pdf'))
    return res, es_pdf, peso

if modo == 'urls':
    filas = [l.rstrip('\n').split('\t') for l in open(os.path.join(AQUI, 'hallazgos.tsv'))]
    cont = {}
    with open(os.path.join(AQUI, 'verif_urls.jsonl'), 'a') as out:
        for f in filas:
            code, tipo, url = f[0], f[1], f[2]
            if not url or tipo not in ('programas', 'norma'):
                continue
            cont[code] = cont.get(code, 0) + 1
            res, es_pdf, peso = leer(url, code, '%s%d' % (tipo[0], cont[code]) if tipo == 'programas' else '')
            r = {'code': code, 'tipo': tipo, 'url': url, 'status': res['status'], 'err': res['err'], 'ctype': res['ctype'][:40],
                 'pdf': es_pdf, 'bytes': peso, 'final': res['url'] if res['url'] != url else ''}
            out.write(json.dumps(r, ensure_ascii=False) + '\n'); out.flush()
            print('%-12s %-9s %4s pdf=%-5s %8d %s %s' % (code, tipo, res['status'], es_pdf, peso, res['err'], url[:90]), flush=True)

elif modo == 'indices':
    INDICES = json.load(open(os.path.join(AQUI, 'indices.json')))
    with open(os.path.join(AQUI, 'verif_indices.jsonl'), 'a') as out:
        for code, url in INDICES:
            res = crawl.fetch(url)
            links = crawl.enlaces(res['url'], res['body']) if res['status'] == 200 else []
            pdfs = sorted(set(u for u, t in links if u.lower().split('?')[0].endswith('.pdf')))
            prog = sorted(set(u for u, t in links if 'programa' in up.unquote(u).lower() or re.search(r'programa|syllabus', t, re.I)))
            titulo = re.search(r'<title[^>]*>(.*?)</title>', res['body'], re.I | re.S)
            r = {'code': code, 'url': url, 'status': res['status'], 'err': res['err'], 'ctype': res['ctype'][:40],
                 'titulo': re.sub(r'\s+', ' ', html.unescape(titulo.group(1))).strip()[:90] if titulo else '',
                 'enlaces': len(links), 'pdf': len(pdfs), 'prog': len(prog), 'muestra_pdf': pdfs[:6], 'muestra_prog': prog[:10],
                 'texto': re.sub(r'\s+', ' ', html.unescape(re.sub(r'<(script|style)\b.*?</\1>|<[^>]+>', ' ', res['body'], flags=re.S | re.I))).strip()[:500]}
            out.write(json.dumps(r, ensure_ascii=False) + '\n'); out.flush()
            print('%-10s %4s enlaces=%-4d pdf=%-4d prog=%-4d %s | %s' % (code, res['status'], len(links), len(pdfs), len(prog), url[:80], r['titulo'][:50]), flush=True)

elif modo == 'ucampus':
    with open(os.path.join(AQUI, 'verif_ucampus.jsonl'), 'a') as out:
        for code, base in crawl.UNIS.items():
            dom = crawl.dominio(base)
            url = 'https://ucampus.%s/m/catalogo/' % dom
            res = crawl.fetch(url)
            titulo = re.search(r'<title[^>]*>(.*?)</title>', res['body'], re.I | re.S)
            links = crawl.enlaces(res['url'], res['body']) if res['status'] == 200 else []
            r = {'code': code, 'url': url, 'status': res['status'], 'err': res['err'][:80], 'final': res['url'],
                 'titulo': re.sub(r'\s+', ' ', html.unescape(titulo.group(1))).strip()[:80] if titulo else '',
                 'enlaces': len(links), 'muestra': [u for u, t in links if 'catalogo' in u][:8]}
            out.write(json.dumps(r, ensure_ascii=False) + '\n'); out.flush()
            if res['status'] not in (0, -1):
                print('%-12s %4s enlaces=%-4d %s | %s' % (code, res['status'], len(links), res['url'][:70], r['titulo']), flush=True)
