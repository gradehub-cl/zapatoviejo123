#!/usr/bin/env python3
"""Recorre el sitio público de cada universidad y anota dónde publica mallas y
programas de asignatura. Solo lectura: respeta robots.txt, una petición a la
vez con 1,15 s entre inicios, sin sesión, y se detiene en un host ante 403/429.
No descarga PDF: solo registra sus URL.

Uso: python3 -I crawl.py <carpeta_salida> [codigo ...]
"""
import sys, os, re, json, time, subprocess, html
import urllib.parse as up
import urllib.robotparser

UA = 'Mozilla/5.0 (compatible; lector-academico/1.0; lectura unica de paginas publicas)'
TOKEN = 'lector-academico'
# Quien lee es un agente de IA: si robots.txt le cierra la puerta a Claude, no se lee.
AGENTES = (TOKEN, 'Claude-Code', 'Claude-User', 'ClaudeBot', 'anthropic-ai')
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

UNIS = {
 'uach':'https://www.uach.cl/', 'uac':'https://www.uac.cl/', 'uah':'https://www.uahurtado.cl/',
 'uahc':'https://www.academia.cl/', 'uda':'https://www.uda.cl/', 'uay':'https://www.uaysen.cl/',
 'uautonoma':'https://www.uautonoma.cl/', 'ubo':'https://www.ubo.cl/', 'ubio':'https://www.ubiobio.cl/',
 'ubolivariana':'https://www.ubolivariana.cl/', 'ucen':'https://www.ucentral.cl/', 'ucm':'https://portal.ucm.cl/',
 'ucn':'https://www.ucn.cl/', 'ucsc':'https://www.ucsc.cl/', 'ucsh':'https://www.ucsh.cl/',
 'uct':'https://www.uct.cl/', 'udec':'https://www.udec.cl/', 'udalba':'https://www.udalba.cl/',
 'udla':'https://www.udla.cl/', 'udp':'https://www.udp.cl/', 'uft':'https://www.uft.cl/',
 'ufro':'https://www.ufro.cl/', 'ugm':'https://www.ugm.cl/', 'ula':'https://www.ulagos.cl/',
 'ulaleones':'https://www.ulosleones.cl/', 'ulrep':'https://www.ulare.cl/', 'umag':'https://www.umag.cl/',
 'umayor':'https://www.umayor.cl/', 'umc':'https://www.umcervantes.cl/', 'umce':'https://www.umce.cl/',
 'unab':'https://www.unab.cl/', 'unach':'https://www.unach.cl/', 'uniacc':'https://www.uniacc.cl/',
 'unap':'https://www.unap.cl/', 'uoh':'https://www.uoh.cl/', 'upla':'https://www.upla.cl/',
 'pucv':'https://www.pucv.cl/', 'usach':'https://www.usach.cl/', 'usek':'https://www.usek.cl/',
 'userena':'https://www.userena.cl/', 'usm':'https://www.usm.cl/', 'uss':'https://www.uss.cl/',
 'ust':'https://www.ust.cl/', 'uta':'https://www.uta.cl/', 'utal':'https://www.utalca.cl/',
 'utem':'https://www.utem.cl/', 'uantof':'https://www.uantof.cl/', 'uv':'https://www.uv.cl/',
 'uvm':'https://www.uvm.cl/',
}
if os.environ.get('UNIS_EXTRA'):
    UNIS.update(json.loads(os.environ['UNIS_EXTRA']))

MALLA = re.compile(r'malla|plan(es)?[-_ ]?de[-_ ]?estudios?|plan[-_]estudio|itinerario[-_ ]formativo')
PROG = re.compile(r'programas?[-_ ]?(de[-_ ]?)?(las?[-_ ]?)?(asignaturas?|cursos?|actividad(es)?[-_ ]curricular(es)?)|syllabus|s[ií]labo|programa[-_ ]anal[ií]tico|gu[ií]as?[-_ ]de[-_ ]aprendizaje|descriptor(es)?[-_ ]de[-_ ]asignatura')
CARR = re.compile(r'/carreras?(/|-|$)|/pregrado(/|$)|/carrera-|/programas?-de-pregrado')
TXT_PROG = re.compile(r'programas? de (la |las )?(asignaturas?|cursos?)|syllabus|s[ií]labo|programas? de estudio|descriptor', re.I)
TXT_MALLA = re.compile(r'malla|plan de estudios?', re.I)
INDICE = re.compile(r'carreras|pregrado|admisi', re.I)

last = [0.0]
blocked = {}
robots = {}
nreq = [0]

def raw_fetch(url, maxbytes=4000000):
    wait = 1.15 - (time.time() - last[0])
    if wait > 0:
        time.sleep(wait)
    last[0] = time.time()
    nreq[0] += 1
    tmp = os.path.join(OUT, '_body.tmp')
    try:
        os.remove(tmp)
    except OSError:
        pass
    cmd = ['curl', '-sS', '-L', '--max-redirs', '5', '--max-time', '25', '--connect-timeout', '10',
           '-A', UA, '--compressed', '--proto', '=http,https', '--max-filesize', str(maxbytes),
           '-o', tmp, '-w', '%{http_code}\t%{url_effective}\t%{content_type}', url]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
    except subprocess.TimeoutExpired:
        return {'status': 0, 'url': url, 'ctype': '', 'body': '', 'err': 'timeout'}
    parts = (r.stdout or '').split('\t')
    status = int(parts[0]) if parts and parts[0].isdigit() else 0
    final = parts[1] if len(parts) > 1 and parts[1] else url
    ctype = parts[2] if len(parts) > 2 else ''
    body = ''
    if os.path.exists(tmp) and 'pdf' not in ctype:
        with open(tmp, 'rb') as f:
            data = f.read(maxbytes)
        body = data.decode('utf-8', 'replace')
        if body.count('�') > 50:
            body = data.decode('latin-1', 'replace')
    return {'status': status, 'url': final, 'ctype': ctype, 'body': body,
            'err': (r.stderr or '').strip()[:160] if status == 0 else ''}

def allowed(url):
    p = up.urlsplit(url)
    host = p.netloc.lower()
    if host in blocked:
        return False
    if host not in robots:
        res = raw_fetch(p.scheme + '://' + host + '/robots.txt', 500000)
        rp = None
        if res['status'] == 200 and '<html' not in res['body'][:500].lower():
            rp = urllib.robotparser.RobotFileParser()
            rp.parse(res['body'].splitlines())
        robots[host] = {'status': res['status'], 'rp': rp,
                        'ia': bool(rp) and not all(rp.can_fetch(a, p.scheme + '://' + host + '/') for a in AGENTES[1:]),
                        'sitemaps': re.findall(r'(?im)^\s*sitemap:\s*(\S+)', res['body']) if res['status'] == 200 else []}
        if res['status'] in (403, 429):
            blocked[host] = res['status']
            return False
    rp = robots[host]['rp']
    return True if rp is None else all(rp.can_fetch(a, url) for a in AGENTES)

def fetch(url, maxbytes=4000000):
    if not url.startswith(('http://', 'https://')):
        return {'status': -2, 'url': url, 'ctype': '', 'body': '', 'err': 'esquema'}
    if not allowed(url):
        host = up.urlsplit(url).netloc.lower()
        return {'status': -1, 'url': url, 'ctype': '', 'body': '',
                'err': 'host detenido' if host in blocked else 'robots'}
    res = raw_fetch(url, maxbytes)
    if res['status'] in (403, 429):
        blocked[up.urlsplit(url).netloc.lower()] = res['status']
    return res

def dominio(url):
    h = up.urlsplit(url).netloc.lower().split(':')[0]
    parts = h.split('.')
    return '.'.join(parts[-2:])

def enlaces(base, body):
    out = []
    for m in re.finditer(r'<a\b[^>]*?href\s*=\s*["\']([^"\'#]+)["\'][^>]*>(.*?)</a>', body, re.I | re.S):
        href = html.unescape(m.group(1)).strip()
        if href.startswith(('mailto:', 'tel:', 'javascript:', 'whatsapp:')):
            continue
        texto = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', m.group(2)))).strip()[:120]
        try:
            out.append((up.urljoin(base, href), texto))
        except ValueError:
            pass
    return out

def clave(url):
    return up.unquote(url).lower()

def recorrer(code, base):
    blocked.clear(); robots.clear(); nreq[0] = 0
    dom = dominio(base)
    r = {'code': code, 'base': base, 'dominio': dom, 'notas': []}
    home = fetch(base)
    titulo = re.search(r'<title[^>]*>(.*?)</title>', home['body'], re.I | re.S)
    r['home'] = {'status': home['status'], 'url': home['url'], 'err': home['err'],
                 'titulo': re.sub(r'\s+', ' ', html.unescape(titulo.group(1))).strip()[:100] if titulo else ''}
    dom = dominio(home['url']) if home['status'] == 200 else dom
    r['dominio'] = dom
    vistos = {}   # url -> texto del enlace
    anclas = []   # (texto, url, pagina) con texto de programa/malla
    def anotar(pagina, links):
        for u, t in links:
            if dominio(u) != dom and not u.lower().endswith('.pdf'):
                continue
            vistos.setdefault(u, t)
            if TXT_PROG.search(t) or TXT_MALLA.search(t):
                anclas.append((t, u, pagina))
    if home['status'] == 200:
        anotar(home['url'], enlaces(home['url'], home['body']))
    # Sitemaps
    host0 = up.urlsplit(home['url'] if home['status'] == 200 else base)
    raiz = host0.scheme + '://' + host0.netloc
    cola = list(robots.get(host0.netloc.lower(), {}).get('sitemaps', [])) + [raiz + '/sitemap.xml', raiz + '/sitemap_index.xml', raiz + '/wp-sitemap.xml']
    hechos, locs, archivos = set(), set(), 0
    while cola and archivos < 10 and len(hechos) < 14 and len(locs) < 60000:
        sm = cola.pop(0)
        if sm in hechos or dominio(sm) != dom:
            continue
        hechos.add(sm)
        res = fetch(sm, 12000000)
        if res['status'] != 200 or '<loc' not in res['body']:
            continue
        archivos += 1
        encontrados = [html.unescape(x.strip()) for x in re.findall(r'<loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</loc>', res['body'], re.S)]
        if '<sitemapindex' in res['body']:
            pri = sorted(encontrados, key=lambda u: (0 if re.search(r'carrera|pregrado|malla|programa|asignatura|page', u, re.I) else 1))
            cola = pri + cola
        else:
            locs.update(encontrados)
    r['sitemap'] = {'archivos': archivos, 'urls': len(locs)}
    for u in locs:
        vistos.setdefault(u, '')
    # Páginas a leer: índices de carreras y una muestra de páginas de carrera
    paginas = []
    for u, t in list(vistos.items()):
        if dominio(u) == dom and (INDICE.search(t) or CARR.search(clave(u))) and not u.lower().endswith('.pdf'):
            paginas.append(u)
    indices = sorted(set(paginas), key=lambda u: (up.urlsplit(u).path.count('/'), len(u)))[:4]
    leidas = set([home['url'], base])
    def leer(u):
        if u in leidas:
            return
        leidas.add(u)
        res = fetch(u)
        if res['status'] == 200 and 'html' in res['ctype']:
            anotar(res['url'], enlaces(res['url'], res['body']))
    for u in indices:
        leer(u)
    carreras = sorted(set(u for u in vistos if dominio(u) == dom and CARR.search(clave(u)) and not re.search(r'\.(pdf|jpg|png|docx?)$', u, re.I)
                          and up.urlsplit(u).path.rstrip('/').count('/') >= 2))
    paso = max(1, len(carreras) // 12)
    for u in carreras[::paso][:12]:
        leer(u)
    # Páginas cuyo enlace dice «programas de asignatura» o parecido
    for t, u, _ in anclas[:60]:
        if TXT_PROG.search(t) and not u.lower().endswith('.pdf') and dominio(u) == dom and len(leidas) < 24:
            leer(u)
    r['paginas_leidas'] = len(leidas)
    def grupo(rx):
        us = sorted(u for u in vistos if rx.search(clave(u)))
        pdf = [u for u in us if u.lower().split('?')[0].endswith('.pdf')]
        return {'n': len(us), 'pdf': len(pdf), 'muestra': (pdf[:12] + [u for u in us if u not in pdf][:12])}
    r['malla'] = grupo(MALLA)
    r['programa'] = grupo(PROG)
    r['carreras'] = {'n': len(carreras), 'muestra': carreras[:8]}
    r['pdf_total'] = sum(1 for u in vistos if u.lower().split('?')[0].endswith('.pdf'))
    visto_a = set()
    r['anclas'] = []
    for t, u, pag in anclas:
        if (t.lower(), u) in visto_a:
            continue
        visto_a.add((t.lower(), u))
        if TXT_PROG.search(t) and len(r['anclas']) < 40:
            r['anclas'].append({'texto': t, 'url': u, 'pagina': pag})
    r['robots'] = {h: v['status'] for h, v in robots.items()}
    r['robots_ia'] = sorted(h for h, v in robots.items() if v.get('ia'))
    r['detenidos'] = dict(blocked)
    r['peticiones'] = nreq[0]
    return r

if __name__ == '__main__':
    codes = sys.argv[2:] or list(UNIS)
    for code in codes:
        dest = os.path.join(OUT, code + '.json')
        if os.path.exists(dest):
            continue
        t0 = time.time()
        try:
            r = recorrer(code, UNIS[code])
        except Exception as e:  # una universidad que falla no detiene a las demás
            r = {'code': code, 'base': UNIS[code], 'error': repr(e)[:300]}
        with open(dest, 'w') as f:
            json.dump(r, f, ensure_ascii=False, indent=1)
        print('%-13s home=%s sitemap=%s carreras=%s malla=%s/%s prog=%s/%s anclas=%s det=%s ia=%s req=%s %ds' % (
            code, r.get('home', {}).get('status'), r.get('sitemap', {}).get('urls'), r.get('carreras', {}).get('n'),
            r.get('malla', {}).get('n'), r.get('malla', {}).get('pdf'), r.get('programa', {}).get('n'), r.get('programa', {}).get('pdf'),
            len(r.get('anclas', [])), ','.join(r.get('detenidos', {}).keys()) or '-', ','.join(r.get('robots_ia', [])) or '-', r.get('peticiones'), time.time() - t0), flush=True)
