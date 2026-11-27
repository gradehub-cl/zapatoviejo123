"""Paletas de las 5 direcciones gráficas de GradeHub + verificación WCAG 2.x y OKLCH.
Uso: python3 paletas.py  -> escribe paletas.json y contraste.md"""
import json, math
def hex2rgb(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def lin(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lum(h):
    r,g,b=[lin(c) for c in hex2rgb(h)]; return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
def oklch(h):
    r,g,b=[lin(c) for c in hex2rgb(h)]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l_,m_,s_=[x**(1/3) for x in (l,m,s)]
    L=0.2104542553*l_+0.7936177850*m_-0.0040720468*s_
    A=1.9779984951*l_-2.4285922050*m_+0.4505937099*s_
    B=0.0259040371*l_+0.7827717662*m_-0.8086757660*s_
    C=math.hypot(A,B); H=math.degrees(math.atan2(B,A))%360
    return f"oklch({L:.3f} {C:.3f} {H:.1f})" if C>0.002 else f"oklch({L:.3f} 0 0)"
K=['bg','surface','surface2','border','borderStrong','fg','fg2','fg3','primary','onPrimary','accent','ok','okBg','warn','warnBg','bad','badBg','focus']
P={
 "D1-acta":{
  "light":dict(bg="#F7F7F5",surface="#FFFFFF",surface2="#EFEFEB",border="#E3E3DF",borderStrong="#7E7E79",fg="#121212",fg2="#46464A",fg3="#66666B",primary="#0B6E62",onPrimary="#FFFFFF",accent="#DDF3EE",ok="#146C43",okBg="#E6F4EA",warn="#8A5300",warnBg="#FCF0DB",bad="#B42318",badBg="#FDECEA",focus="#0B6E62"),
  "dark":dict(bg="#0A0B0D",surface="#16181C",surface2="#1F2227",border="#2C3036",borderStrong="#737980",fg="#F2F2F0",fg2="#BABDC2",fg3="#9297A0",primary="#3DD9C1",onPrimary="#03201B",accent="#0F2E2A",ok="#4ADE80",okBg="#0E2416",warn="#FBBF24",warnBg="#2A1F06",bad="#FF7A6B",badBg="#2D1311",focus="#3DD9C1")},
 "D2-pulso":{
  "light":dict(bg="#F3F2F8",surface="#FFFFFF",surface2="#ECEAF4",border="#E0DDEA",borderStrong="#7F7A92",fg="#16131F",fg2="#4A4559",fg3="#69637A",primary="#6941E0",onPrimary="#FFFFFF",accent="#EEE8FF",ok="#0F7A4A",okBg="#E4F5EC",warn="#945700",warnBg="#FDF0DA",bad="#C0262D",badBg="#FDEBEC",focus="#6941E0"),
  "dark":dict(bg="#0E0C14",surface="#1A1724",surface2="#242032",border="#363048",borderStrong="#7A7390",fg="#F4F2FA",fg2="#C3BED3",fg3="#9C96AF",primary="#A78BFA",onPrimary="#160D2E",accent="#2A2147",ok="#4ADE9A",okBg="#0D2519",warn="#FFC54D",warnBg="#2B2108",bad="#FF7A85",badBg="#2E1216",focus="#A78BFA")},
 "D3-cuaderno":{
  "light":dict(bg="#FBF8F1",surface="#FFFDF8",surface2="#F3EEE2",border="#E6DFCF",borderStrong="#857C69",fg="#1D1B16",fg2="#4D483D",fg3="#696254",primary="#1E3A9E",onPrimary="#FFFFFF",accent="#BDF0D5",ok="#1C6B3A",okBg="#E5F3E8",warn="#8F5200",warnBg="#FBEFD7",bad="#B3261E",badBg="#FBE9E6",focus="#1E3A9E"),
  "dark":dict(bg="#15140F",surface="#1F1D17",surface2="#29261E",border="#3A362D",borderStrong="#7F7867",fg="#F3EEE2",fg2="#CFC7B5",fg3="#A59D8B",primary="#9DB2FF",onPrimary="#0E1A4A",accent="#1D3A2C",ok="#6EDC9A",okBg="#142619",warn="#F5C150",warnBg="#2B2209",bad="#FF8A7A",badBg="#301512",focus="#9DB2FF")},
 "D4-pop":{
  "light":dict(bg="#FFF7EC",surface="#FFFFFF",surface2="#FFEFD9",border="#14121A",borderStrong="#14121A",fg="#14121A",fg2="#3F3B47",fg3="#5E5966",primary="#2DD4BF",onPrimary="#14121A",accent="#FFE15A",ok="#0B6B3A",okBg="#B6F5CF",warn="#7A4800",warnBg="#FFE15A",bad="#B8111F",badBg="#FFC9CC",focus="#6941E0"),
  "dark":dict(bg="#121019",surface="#1C1926",surface2="#262234",border="#6A6385",borderStrong="#8E87A8",fg="#FBF8FF",fg2="#D1CADF",fg3="#A9A1BC",primary="#2DD4BF",onPrimary="#0B1F1C",accent="#FFE15A",ok="#5BE39A",okBg="#11301F",warn="#FFE15A",warnBg="#2E2808",bad="#FF7A85",badBg="#3A151B",focus="#C4B5FD")},
 "D5-vidrio":{
  "light":dict(bg="#EEF1F5",surface="#FFFFFF",surface2="#F3F5F8",border="#DDE2E9",borderStrong="#7A8290",fg="#0E1116",fg2="#434A55",fg3="#5F6774",primary="#0A7468",onPrimary="#FFFFFF",accent="#6D4AE0",ok="#157146",okBg="#E3F4EA",warn="#8D5400",warnBg="#FCEFD8",bad="#BB2533",badBg="#FCE9EB",focus="#6D4AE0"),
  "dark":dict(bg="#07080C",surface="#11131A",surface2="#191C25",border="#2A2E3A",borderStrong="#6D7484",fg="#F5F7FA",fg2="#BAC1CC",fg3="#8F97A5",primary="#5EEAD4",onPrimary="#042420",accent="#B9A4FF",ok="#5BE3A0",okBg="#0E261B",warn="#FFC857",warnBg="#2C2209",bad="#FF7B8A",badBg="#301318",focus="#B9A4FF")},
}
# pares a verificar: (fg, bg, mínimo, descripción)
def pares(p):
    return [
     ('fg','bg',4.5,'Texto principal / fondo'),('fg','surface',4.5,'Texto principal / tarjeta'),
     ('fg2','surface',4.5,'Texto secundario / tarjeta'),('fg3','surface',4.5,'Texto terciario / tarjeta'),
     ('fg3','surface2',4.5,'Texto terciario / superficie 2'),
     ('primary','surface',4.5 if p['primary'] else 3,'Primario como texto/enlace / tarjeta'),
     ('onPrimary','primary',4.5,'Texto sobre botón primario'),
     ('borderStrong','surface',3.0,'Borde de input / tarjeta (1.4.11)'),
     ('focus','surface',3.0,'Anillo de foco / tarjeta (2.4.13)'),
     ('ok','surface',4.5,'Aprobado texto / tarjeta'),('ok','okBg',4.5,'Aprobado texto / su fondo'),
     ('warn','surface',4.5,'En riesgo texto / tarjeta'),('warn','warnBg',4.5,'En riesgo texto / su fondo'),
     ('bad','surface',4.5,'Reprobado texto / tarjeta'),('bad','badBg',4.5,'Reprobado texto / su fondo'),
     ('fg','okBg',4.5,'Texto principal / fondo aprobado'),('fg','warnBg',4.5,'Texto principal / fondo riesgo'),('fg','badBg',4.5,'Texto principal / fondo reprobado'),
    ]
out={}; md=["# Verificación de contraste WCAG 2.x (generado por paletas.py)\n","Mínimos: 4,5:1 texto normal (1.4.3), 3:1 componentes y foco (1.4.11 / 2.4.13). ✅ pasa · ❌ falla.\n"]
fails=0
for d,modes in P.items():
    out[d]={}
    md.append(f"\n## {d}\n")
    for mode,p in modes.items():
        out[d][mode]={k:{"hex":v,"oklch":oklch(v)} for k,v in p.items()}
        md.append(f"\n### {mode}\n\n| Par | Colores | Ratio | Mín. | |\n|---|---|---|---|---|")
        for a,b,mn,desc in pares(p):
            # D4 light: primary es relleno (texto oscuro encima); como texto se usa ok/fg
            if d=='D4-pop' and mode=='light' and a=='primary': a,desc='fg','(Pop: el turquesa es relleno; texto/enlace usa tinta) Tinta / tarjeta'
            r=cr(p[a],p[b]); ok=r>=mn; fails+= (not ok)
            md.append(f"| {desc} | `{p[a]}` / `{p[b]}` | {r:.2f}:1 | {mn} | {'✅' if ok else '❌'} |")
        # superficies: tarjeta vs fondo (informativo)
        md.append(f"\n_Tarjeta vs fondo: {cr(p['surface'],p['bg']):.2f}:1 (informativo; la separación se garantiza con borde `{p['border']}` = {cr(p['border'],p['surface']):.2f}:1 y/o sombra)._")
json.dump(out,open('paletas.json','w'),indent=1,ensure_ascii=False)
open('contraste.md','w').write("\n".join(md)+"\n")
print("fallos:",fails)
for d,modes in P.items():
    for mode,p in modes.items():
        bad=[(a,b,round(cr(p[a],p[b]),2)) for a,b,mn,_ in pares(p) if not (d=='D4-pop' and mode=='light' and a=='primary') and cr(p[a],p[b])<mn]
        if bad: print(d,mode,bad)

# ---- Colores por ramo (identidad, no estado): misma L y C en OKLCH, 8 tonos ----
def oklch2hex(L,C,H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    l_=L+0.3963377774*a+0.2158037573*b; m_=L-0.1055613458*a-0.0638541728*b; s_=L-0.0894841775*a-1.2914855480*b
    l,m,s=l_**3,m_**3,s_**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s; g=-1.2684380046*l+2.6097574011*m-0.3413193965*s; bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    def enc(x):
        x=max(0,min(1,x)); return 12.92*x if x<=0.0031308 else 1.055*x**(1/2.4)-0.055
    return '#'+''.join(f"{round(enc(v)*255):02X}" for v in (r,g,bb))
HUES=[30,70,105,150,195,235,280,330]
NOMBRES=['coral','ámbar','oliva','verde','turquesa','azul','violeta','magenta']
ramo={}
lines=["\n## Colores por ramo (todas las direcciones; L y C fijas en OKLCH)\n","Se usan solo como etiqueta de identidad (punto, borde izquierdo o anillo) junto al nombre del ramo; nunca para comunicar estado. Mínimo 3:1 contra la tarjeta (1.4.11).\n","| Tono | Claro (L .56 C .13) | ratio vs #FFFFFF | Oscuro (L .78 C .12) | ratio vs #16181C |","|---|---|---|---|---|"]
for n,h in zip(NOMBRES,HUES):
    lt=oklch2hex(0.56,0.13,h); dk=oklch2hex(0.78,0.12,h)
    ramo[n]={"light":lt,"dark":dk,"oklch_light":f"oklch(0.56 0.13 {h})","oklch_dark":f"oklch(0.78 0.12 {h})"}
    lines.append(f"| {n} | `{lt}` | {cr(lt,'#FFFFFF'):.2f}:1 | `{dk}` | {cr(dk,'#16181C'):.2f}:1 |")
out['colores_ramo']=ramo
json.dump(out,open('paletas.json','w'),indent=1,ensure_ascii=False)
open('contraste.md','a').write("\n".join(lines)+"\n")
print("\n".join(lines))
