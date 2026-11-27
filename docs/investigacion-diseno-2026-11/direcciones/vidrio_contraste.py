"""Contraste de texto sobre vidrio (dirección 5 y variante híbrida recomendada).
Modelo: el vidrio es una capa de tinte con alfa a sobre el fondo desenfocado.
Peor caso = el blob más claro (modo oscuro) o más oscuro (modo claro) del mesh, sin promediar.
color_compuesto = a*tinte + (1-a)*fondo  (en sRGB lineal, como compone el navegador con color-interpolation lineal aproximado en sRGB gamma; usamos gamma sRGB = lo que hacen los navegadores por defecto)."""
from paletas import cr, hex2rgb
def mix(t,b,a):
    tr,tg,tb=hex2rgb(t); br,bg,bb=hex2rgb(b)
    return '#'+''.join(f"{round((a*x+(1-a)*y)*255):02X}" for x,y in ((tr,br),(tg,bg),(tb,bb)))
CASOS={
 'oscuro':dict(tinte='#11131A',texto=['#F5F7FA','#BAC1CC','#5EEAD4','#5BE3A0','#FFC857','#FF7B8A'],
               blobs={'teal':'#0E7C70','violeta':'#4B2FA8','tarjeta-ramo-clara':'#3BCFCF','foto/blanco (peor absoluto)':'#FFFFFF'}),
 'claro':dict(tinte='#FFFFFF',texto=['#0E1116','#434A55','#0A7468','#157146','#8D5400','#BB2533'],
               blobs={'aqua':'#9FE7DC','lila':'#C9B8FF','durazno':'#FFD7A8','tarjeta-ramo-oscura':'#007EB5','negro (peor absoluto)':'#000000'}),
}
out=["# Contraste sobre vidrio — peor caso por blob (generado por vidrio_contraste.py)\n",
     "Regla: el alfa mínimo del tinte es el menor que deja TODOS los textos ≥ 4,5:1 sobre TODOS los blobs del mesh (no sobre el promedio).\n"]
for modo,c in CASOS.items():
    out.append(f"\n## Modo {modo} — tinte `{c['tinte']}`\n")
    out.append("| alfa | "+" | ".join(c['blobs'])+" | ¿todos ≥4,5? |\n|---|"+"---|"*len(c['blobs'])+"---|")
    minimo={}
    for a in [x/100 for x in range(40,100,4)]:
        fila=[];ok_all=True
        for bn,b in c['blobs'].items():
            comp=mix(c['tinte'],b,a); peor=min(cr(t,comp) for t in c['texto'])
            fila.append(f"{peor:.2f}"); ok=peor>=4.5; ok_all&=ok
            if ok and bn not in minimo: minimo[bn]=a
        out.append(f"| {a:.2f} | "+" | ".join(fila)+f" | {'✅' if ok_all else '❌'} |")
    out.append("\nAlfa mínimo por blob (peor texto ≥4,5): "+", ".join(f"{k}: {v:.2f}" for k,v in minimo.items()))
open('vidrio-contraste.md','w').write("\n".join(out)+"\n"); print("\n".join(out))
