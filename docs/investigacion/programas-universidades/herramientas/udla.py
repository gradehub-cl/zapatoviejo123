#!/usr/bin/env python3
"""Programas de asignatura de la UDLA (programas.udla.cl/<período><SIGLA>.pdf).

Parte de las siglas que el buscador tiene indexadas, baja la versión más nueva
que encuentre de cada una y sigue los prerrequisitos que declara cada programa.
Mismas reglas de lectura que crawl.py. No adivina siglas: solo pide las que
aparecen escritas en una fuente.

Uso: python3 -I udla.py <carpeta_salida> <ruta_a_pdftexto>
"""
import sys, os, re, json, shutil, subprocess, unicodedata
AQUI = os.path.dirname(os.path.abspath(__file__))
SAL, PDFTEXTO = sys.argv[1], sys.argv[2]
sys.argv = ['crawl.py', os.path.join(SAL, '_tmp')]
sys.path.insert(0, AQUI)
import crawl

# Sigla -> URL que devolvió el buscador (2026-11-26/27)
SEMILLAS = {
 'CBI302': '202610CBI302', 'TAG1009': '202610TAG1009', 'ACI4067': '202510ACI4067', 'CCC725': '202510CCC725',
 'ADP101': '202520ADP101', 'AEP1077': '202420AEP1077', 'LEX002': '202410LEX002', 'NYD305': '202410NYD305',
 'TOC708': '2023101TOC708', 'MAT140': '2020103MAT140', 'EDD605': '2016201EDD605', 'EDD406': '2016201EDD406',
 'EDU302': '2016101EDU302', 'AEA555': '2016101AEA555', 'FIS611': '2016201FIS611', 'ING400': '2016201ING400',
 'EDF107': '2016101EDF107', 'ENF501': '2016101ENF501', 'TEN304': '2016101TEN304', 'ENF500': '2015201ENF500',
 'ENF901': '2015201ENF901', 'ACI302': '2015101ACI302', 'ACI102': '2015101ACI102', 'ACI550': '2015101ACI550',
 'SIC112': '2014101SIC112',
}
PERIODOS = ['202620', '202610', '202520', '202510']   # versiones vigentes que se prueban antes de la indexada
TOPE_SIGLAS, TOPE_PETICIONES = 900, 2600

def norm(s):
    s = unicodedata.normalize('NFD', s)
    return re.sub(r'\s+', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Mn')).strip().upper()

def bajar(nombre):
    url = 'https://programas.udla.cl/%s.pdf' % nombre
    res = crawl.fetch(url, 9000000)
    tmp = os.path.join(crawl.OUT, '_body.tmp')
    if res['status'] == 200 and os.path.exists(tmp):
        with open(tmp, 'rb') as f:
            if f.read(5) == b'%PDF-':
                d = os.path.join(SAL, 'pdf')
                os.makedirs(d, exist_ok=True)
                dest = os.path.join(d, nombre + '.pdf')
                shutil.copyfile(tmp, dest)
                return dest, 200
    return None, res['status']

def texto(pdf):
    r = subprocess.run([PDFTEXTO, pdf], capture_output=True, text=True, timeout=60)
    return r.stdout

def campo(t, etiqueta):
    m = re.search(r'(?m)^' + etiqueta + r'\s*(.*)$', t)
    return m.group(1).strip() if m else ''

def leer_programa(t):
    p = {'sigla': campo(t, 'Sigla'), 'nombre': campo(t, 'Nombre'), 'creditos_scudla': campo(t, r'Créditos Totales \(SCUDLA\)'),
         'vigencia_desde': campo(t, 'Vigencia de la Asignatura Desde'), 'actualizado': campo(t, 'Última Actualización'),
         'modalidad': campo(t, 'Modalidad / Jornada'), 'version': campo(t, 'Versión:')}
    req = campo(t, 'Requisito')
    p['requisito_texto'] = req
    p['requisitos'] = sorted(set(re.sub(r'[-\s]', '', s) for s in re.findall(r'\b[A-Z]{3}[-\s]?\d{3,4}\b', req)))
    # Siglas nombradas en el resto del texto («es prerrequisito de CCC 907»): pistas, no requisitos.
    cuerpo = t.split('3. RESULTADOS DE APRENDIZAJE')[0]
    p['siglas_mencionadas'] = sorted(set(re.sub(r'[-\s]', '', s) for s in re.findall(r'\b[A-Z]{3}[-\s]?\d{3,4}\b', cuerpo)) - {p['sigla']} - set(p['requisitos']))
    m = re.search(r'7\.1\.?\s*PONDERACIONES(.*?)(?:Nota Informativa|7\.2\.)', t, re.S)
    crudo = [l.strip() for l in (m.group(1).splitlines() if m else []) if l.strip() and not l.startswith(('--- pág', 'Publicado por', 'Fecha:', 'Página:', 'Programa:', 'Versión:'))]
    crudo = [l for l in crudo if not l.startswith('Modalidad / Jornada')]
    p['ponderaciones_crudo'] = crudo
    comp, sub, otras, esquemas = {}, [], [], []
    for l in crudo:
        # «TODOS 93-1», «EXECUTIVE 64-1»: jornada y código del esquema, no un componente
        m2 = re.match(r'^(TODOS|DIURNO|VESPERTINO|EXECUTIVE|ONLINE|PRESENCIAL|SEMIPRESENCIAL|TRADICIONAL)\b.*? (\S+)$', l)
        if m2:
            esquemas.append(l); continue
        # «EXAMEN 25 EXAMEN 100»: componente y su único subcomponente en una línea
        m2 = re.match(r'^([A-ZÁÉÍÓÚÑ]+) (\d+(?:\.\d+)?) ([A-ZÁÉÍÓÚÑ ]+?) (\d+(?:\.\d+)?)$', l)
        if m2:
            comp[m2.group(1)] = float(m2.group(2)); sub.append([m2.group(3), float(m2.group(4))]); continue
        m2 = re.match(r'^([A-ZÁÉÍÓÚÑ]+) (\d+(?:\.\d+)?)$', l)
        if m2:
            comp[m2.group(1)] = float(m2.group(2)); continue
        m2 = re.match(r'^([A-ZÁÉÍÓÚÑ ]+? ?\d*) (\d+(?:\.\d+)?)$', l)
        if m2:
            sub.append([m2.group(1).strip(), float(m2.group(2))]); continue
        otras.append(l)
    p['componentes'] = comp
    p['subcomponentes'] = sub
    p['lineas_sin_clasificar'] = otras
    p['esquemas'] = esquemas   # más de uno: la tabla mezcla jornadas y hay que leerla a mano
    p['componentes_suman_100'] = abs(sum(comp.values()) - 100) < 0.01 if comp and len(esquemas) <= 1 else False
    exi = re.search(r'(?is)(eximi[^.]*\.)', t)
    p['eximicion'] = re.sub(r'\s+', ' ', exi.group(1))[:300] if exi else ''
    return p

if __name__ == '__main__':
    os.makedirs(SAL, exist_ok=True)
    hecho = {}
    ruta = os.path.join(SAL, 'programas.jsonl')
    if os.path.exists(ruta):
        for l in open(ruta):
            r = json.loads(l); hecho[r['sigla_pedida']] = r
    cola = [s for s in SEMILLAS if s not in hecho]
    for r in hecho.values():
        cola += [s for s in r.get('requisitos', []) if s not in hecho and s not in cola]
    origen = {s: 'buscador' for s in SEMILLAS}
    with open(ruta, 'a') as out:
        while cola and len(hecho) < TOPE_SIGLAS and crawl.nreq[0] < TOPE_PETICIONES:
            sigla = cola.pop(0)
            if sigla in hecho:
                continue
            candidatos = [per + sigla for per in PERIODOS] + ([SEMILLAS[sigla]] if sigla in SEMILLAS else [])
            pdf, intentos, estados = None, 0, []
            for nombre in candidatos:
                intentos += 1
                pdf, st = bajar(nombre)
                estados.append(st)
                if pdf or st in (403, 429, -1):
                    break
            r = {'sigla_pedida': sigla, 'origen': origen.get(sigla, 'requisito'), 'archivo': os.path.basename(pdf) if pdf else '', 'intentos': intentos, 'estados': estados}
            if pdf:
                r['url'] = 'https://programas.udla.cl/' + os.path.basename(pdf)
                r.update(leer_programa(texto(pdf)))
                for s in r['requisitos']:
                    if s not in hecho and s not in cola:
                        cola.append(s); origen.setdefault(s, 'requisito de ' + sigla)
            hecho[sigla] = r
            out.write(json.dumps(r, ensure_ascii=False) + '\n'); out.flush()
            print('%-8s %-22s %-14s cred=%-3s comp=%s %s req=%s' % (sigla, r['archivo'] or estados, r['origen'][:14], r.get('creditos_scudla', ''),
                  json.dumps(r.get('componentes', {}), ensure_ascii=False), 'OK' if r.get('componentes_suman_100') else '--', ','.join(r.get('requisitos', []))), flush=True)
            if estados and estados[-1] in (403, 429, -1):
                print('Host detenido:', estados[-1]); break
    print('siglas:', len(hecho), 'con programa:', sum(1 for r in hecho.values() if r['archivo']), 'peticiones:', crawl.nreq[0], 'pendientes en cola:', len(cola))
