#!/usr/bin/env python3
"""Verifica la copia que Capacitor entrega a Xcode, sin red ni cambios de archivos."""
import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.fuentes = []

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            fuente = dict(attrs).get("src")
            if fuente:
                self.fuentes.append(fuente)


def verificar(app):
    config = app / "capacitor.config.json"
    try:
        datos = json.loads(config.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise ValueError("Falta capacitor.config.json o no es JSON válido en ios/App/App.")
    if not isinstance(datos, dict):
        raise ValueError("La configuración copiada de Capacitor no es un objeto JSON.")
    servidor = datos.get("server", {})
    if not isinstance(servidor, dict):
        raise ValueError("El campo server de la configuración copiada no es válido.")
    if "url" in servidor:
        raise ValueError("La configuración copiada contiene server.url (modo ios:rama).")

    public = app / "public"
    necesarios = {"index.html", "data.js", "engine.js", "app.js", "app-session.js",
                  "marketplace.js", "render-main.js", "render-agenda.js", "supabase.js"}
    for nombre in sorted(necesarios):
        archivo = public / nombre
        if not archivo.is_file() or archivo.stat().st_size == 0:
            raise ValueError("Falta el recurso empaquetado o está vacío: public/" + nombre)

    scripts = Scripts()
    scripts.feed((public / "index.html").read_text(encoding="utf-8"))
    for fuente in scripts.fuentes:
        url = urlsplit(fuente)
        if url.scheme or url.netloc:
            continue  # Analytics externo no es el código de la app ni server.url.
        archivo = (public / unquote(url.path).lstrip("/")).resolve()
        if public.resolve() not in archivo.parents or not archivo.is_file() or archivo.stat().st_size == 0:
            raise ValueError("Falta un script local de index.html: " + fuente)


if __name__ == "__main__":
    app = Path(sys.argv[1]) if len(sys.argv) == 2 else Path(__file__).resolve().parent.parent / "ios/App/App"
    try:
        verificar(app)
    except (OSError, ValueError) as error:
        print("error: GradeHub no puede compilarse para App Store: " + str(error), file=sys.stderr)
        print("Ejecuta npm run ios:preparar y vuelve a compilar. No uses ios:rama para Release/Archive.", file=sys.stderr)
        sys.exit(1)
    print("GradeHub: configuración sin servidor remoto y web empaquetada verificadas.")
