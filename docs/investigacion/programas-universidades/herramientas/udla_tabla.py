#!/usr/bin/env python3
"""Lee la tabla «7.1 Ponderaciones» de un programa UDLA a partir del texto que
entrega PDFKit, donde las celdas combinadas quedan intercaladas con las filas.

Cada línea trae, de izquierda a derecha, lo que haya de: jornada, código del
esquema, componente, % componente, subcomponente(s), % subcomponente(s).
Una línea de una sola palabra y un número («CATEDRA 60», «TALLER 67») puede ser
componente o subcomponente: se decide por la única combinación en que los
componentes suman 100. Si no hay exactamente una, la tabla queda «revisar».
"""
import re, itertools
JORNADA = re.compile(r'^((?:(?:A DISTANCIA|SEMIPRESENCIAL|PRESENCIAL|ONLINE|TODOS|DIURNO|VESPERTINO|EXECUTIVE|TRADICIONAL|ADVANCE)\s?)+)\s*(\d+(?:-\d+)?)\b\s*')
NUM = re.compile(r'^\d+(?:\.\d+)?$')

def tabla(lineas):
    esquemas, fijos_comp, subs, dudas, raras = [], [], [], [], []
    pendientes = []   # subcomponentes cuyo % viene en la línea siguiente
    for l in lineas:
        l = l.strip()
        if not l or l.startswith(('Régimen Ponderación', 'Modalidad / Jornada')):
            continue
        m = JORNADA.match(l)
        if m:
            esquemas.append(m.group(1).strip() + ' ' + m.group(2)); l = l[m.end():].strip()
            if not l: continue
        tok = l.split()
        if all(NUM.match(t) for t in tok):          # solo números: completan nombres pendientes
            for t in tok:
                if pendientes: subs.append([pendientes.pop(0), float(t)])
                else: raras.append(l); break
            continue
        # Partir en grupos «NOMBRE [índice]» y números
        grupos, i = [], 0
        while i < len(tok):
            if NUM.match(tok[i]):
                grupos.append(('n', float(tok[i]))); i += 1; continue
            j = i
            while j < len(tok) and not NUM.match(tok[j]): j += 1
            nombre = ' '.join(tok[i:j])
            # ¿El número que sigue al nombre es un índice («CATEDRA 1 25») o su porcentaje?
            # Índice si después viene otro número; o si es un subcomponente (no va primero en
            # la línea) y después viene otro nombre: «EJERCICIO 30 EJERCICIO 1 EJERCICIO 2 50».
            # El primero de la línea seguido de un nombre es componente con su %: «DIAGNOSTICO 5 CATEDRA DIAGNOSTICO 100».
            if j + 1 < len(tok) and re.match(r'^\d{1,2}$', tok[j]):
                if NUM.match(tok[j + 1]) or (grupos and int(tok[j]) <= 12):
                    nombre += ' ' + tok[j]; j += 1
            grupos.append(('s', nombre)); i = j
        nombres = [g[1] for g in grupos if g[0] == 's']
        numeros = [g[1] for g in grupos if g[0] == 'n']
        forma = ''.join(g[0] for g in grupos)
        if forma == 'sn':
            if len(nombres[0].split()) == 1: dudas.append([nombres[0], numeros[0]])      # componente o subcomponente
            else: subs.append([nombres[0], numeros[0]])
        elif forma == 'snsn':
            fijos_comp.append([nombres[0], numeros[0]]); subs.append([nombres[1], numeros[1]])
        elif forma.startswith('sn') and set(forma[2:]) <= {'s', 'n'} and forma[2:].count('s') >= 1:
            # componente + varios subcomponentes, con sus % al final o en la línea siguiente
            fijos_comp.append([nombres[0], numeros[0]])
            resto_n, resto_v = nombres[1:], numeros[1:]
            for k, nom in enumerate(resto_n):
                if k < len(resto_v): subs.append([nom, resto_v[k]])
                else: pendientes.append(nom)
        elif set(forma) == {'s'} or (forma.count('s') > forma.count('n') and forma[0] == 's'):
            for k, nom in enumerate(nombres):
                if k < len(numeros): subs.append([nom, numeros[k]])
                else: pendientes.append(nom)
        else:
            raras.append(l)
    # Resolver las dudas por la suma de componentes
    base = sum(v for _, v in fijos_comp)
    soluciones = []
    for combo in itertools.product([0, 1], repeat=len(dudas)) if len(dudas) <= 12 else []:
        if abs(base + sum(d[1] for d, c in zip(dudas, combo) if c) - 100) < 0.05:
            soluciones.append(combo)
    estado = 'sin_tabla' if not lineas else ('varias_jornadas' if len(esquemas) > 1 else 'revisar')
    comp = list(fijos_comp)
    if len(soluciones) == 1 and not raras and not pendientes and len(esquemas) <= 1:
        estado = 'cerrada'
        for d, c in zip(dudas, soluciones[0]):
            (comp if c else subs).append(d)
            # Un «EXAMEN 40» que queda de subcomponente delata una tabla de dos niveles
            # (práctica y teoría por un lado, examen por otro): no se da por cerrada.
            if not c and d[0] in ('EXAMEN', 'CATEDRA', 'EJERCICIO', 'PRACTICA', 'TEORIA') and d[1] < 100:
                estado = 'revisar'
        dudas = []
    return {'estado': estado, 'esquemas': esquemas, 'componentes': comp, 'subcomponentes': subs,
            'sin_decidir': dudas, 'lineas_raras': raras + pendientes}
