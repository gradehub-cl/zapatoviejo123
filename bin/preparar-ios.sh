#!/usr/bin/env bash
# Arma `ios-web/` —lo que Capacitor mete dentro de la app iOS— con los mismos
# archivos que publica el deploy en gradehub.cl, y lo sincroniza con `ios/`.
#
#   npm run ios:preparar
#
# LA LISTA DE EXCLUSIONES ESTÁ DUPLICADA A PROPÓSITO: es la del `rsync` de
# .github/workflows/deploy.yml, más `ios`, `ios-web` y `capacitor.config.*`.
# Unificarla con el deploy es un PR de refactor aparte. Mientras tanto,
# tests/ios-fuera-del-deploy.test.js falla si el deploy excluye algo que acá
# no, para que no terminen dentro de la app tests/, supabase/, docs/ ni los .md.
#
# No sella CACHE_NAME ni `?v=` como el deploy: dentro de la app los archivos
# viajan con el binario y no hay una versión anterior en caché que confundir.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf ios-web
mkdir -p ios-web
rsync -a ./ ios-web/ \
  --exclude '.git' --exclude '.github' --exclude '.netlify' \
  --exclude '.wrangler' --exclude '.cache' --exclude '.claude' \
  --exclude 'node_modules' --exclude 'dist' --exclude 'docs' \
  --exclude 'tests' --exclude 'supabase' --exclude 'bin' \
  --exclude '*.md' --exclude 'package.json' --exclude 'package-lock.json' \
  --exclude '.gitignore' --exclude '.ignore' \
  --exclude 'ios' --exclude 'ios-web' --exclude 'capacitor.config.*'

npx --no-install cap sync ios

# Xcode se niega a firmar si los archivos traen atributos extendidos de macOS
# ("resource fork, Finder information, or similar detritus not allowed"). Los
# pone, por ejemplo, un repo dentro de ~/Desktop sincronizado con iCloud.
xattr -cr ios/App/App/public 2>/dev/null || true
