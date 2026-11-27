# Modelo simple de unit economics GradeHub (supuestos explícitos)
FX=1044  # CLP por USD, dólar observado 26-nov-2026
IVA=1.19
# Precios propuestos (IVA incluido)
p_mes=2490; p_sem=7990; p_anual=12990
def neto_web(p):  # Flow 2,89%+IVA => 3,44% del bruto
    return p/IVA - p*0.0344
def neto_store(p): # 15% comisión sobre precio sin impuesto (supuesto: tienda retiene IVA)
    return p/IVA*0.85
for n,p in [('mes',p_mes),('semestre',p_sem),('anual',p_anual)]:
    print(f"{n}: bruto {p} | neto web {neto_web(p):.0f} | neto tienda {neto_store(p):.0f}")
# Mix: 60% pase semestral, 25% anual, 15% mensual (x5 meses promedio pagados por semestre? no) -> ingreso neto por pagador por semestre
mix_web=0.6
def neto(p): return mix_web*neto_web(p)+(1-mix_web)*neto_store(p)
arppu_sem = 0.60*neto(p_sem) + 0.25*neto(p_anual)/2 + 0.15*neto(p_mes)*3.5
print("ARPPU neto por semestre", round(arppu_sem))
# Costos variables por usuario
supabase_fijo_usd=35 # Pro + 1 compute extra (staging)
ia_consulta_usd = 3000/1e6*0.30 + 500/1e6*2.50  # Gemini 3.5 Flash-Lite
print("costo IA por consulta USD", round(ia_consulta_usd,5), "CLP", round(ia_consulta_usd*FX,2))
ia_pago_mes = 60*ia_consulta_usd*FX
ia_free_mes = 8*ia_consulta_usd*FX
print("IA por pagador/mes CLP", round(ia_pago_mes), "por free/mes", round(ia_free_mes,1))
# Retención semestral de pagadores
for r in (0.4,0.5,0.6):
    margen = arppu_sem - ia_pago_mes*5
    ltv = margen/(1-r)
    print(f"retención sem {r:.0%}: margen/sem {margen:.0f} LTV {ltv:.0f} CLP (~US${ltv/FX:.1f})")
# CAC
for cac_signup in (300,800,1500):
    for conv in (0.03,0.05):
        cac_pago = cac_signup/conv
        print(f"CAC/registro {cac_signup} conv {conv:.0%} -> CAC/pagador {cac_pago:.0f}; payback semestres {cac_pago/(arppu_sem - ia_pago_mes*5):.2f}")
# Escenarios 24 meses (MAU peak semestre y pagadores)
esc={'conservador':(6000,0.025),'base':(15000,0.04),'optimista':(35000,0.06)}
for k,(mau,c) in esc.items():
    pag=mau*c
    ing_anual = pag*arppu_sem*2*0.75  # 75% renuevan 2º semestre aprox
    infra = (supabase_fijo_usd*FX*12) + mau*0.7*ia_free_mes*10 + pag*ia_pago_mes*10
    print(f"{k}: MAU {mau} pagadores {pag:.0f} ingresos netos/año {ing_anual/1e6:.1f}M CLP infra+IA/año {infra/1e6:.2f}M CLP")
