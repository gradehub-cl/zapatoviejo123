#!/usr/bin/env bash
# Entrada compacta; --completo conserva el inventario detallado.
# --rapido omite tests explícitamente; --sin-red usa solo referencias locales.
set -uo pipefail
cd "$(dirname "$0")/.."
completo=false
rapido=false
sin_red=false
for opcion in "$@"; do
  case "$opcion" in
    --completo) completo=true ;;
    --rapido) rapido=true ;;
    --sin-red) sin_red=true ;;
    --help) echo 'Uso: bash bin/estado.sh [--completo] [--rapido] [--sin-red]'; exit 0 ;;
    *) echo "Opción desconocida: $opcion" >&2; exit 1 ;;
  esac
done

if "$sin_red"; then
  echo '(--sin-red: referencias remotas locales, no verificadas)'
else
  git fetch -q origin 2>/dev/null || echo '(no se pudo actualizar: referencias remotas no verificadas)'
fi

echo "=== RAMA: $(git branch --show-current) ==="
echo '=== TRABAJO LOCAL ==='
if "$completo"; then
  git status --short || true
else
  git status --short --untracked-files=no || true
  nuevos=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')
  echo "$nuevos archivos sin seguimiento (ver --completo; no borrar trabajo ajeno)."
fi

echo '=== MAIN Y DIFERENCIAS ==='
limite=3
if "$completo"; then limite=8; fi
git log --oneline -"$limite" origin/main
if git rev-parse --verify -q origin/main >/dev/null; then
  echo "$(git rev-list --count origin/main..HEAD) commits propios; $(git rev-list --count HEAD..origin/main) por incorporar."
  git log --oneline -"$limite" origin/main..HEAD || true
  if "$completo"; then git diff --stat origin/main...HEAD || true
  else git diff --stat --stat-count=6 origin/main...HEAD || true; fi
fi
if "$completo"; then
  echo '=== RAMAS REMOTAS RECIENTES ==='
  git for-each-ref --sort=-committerdate --count=8 refs/remotes/origin \
    --format='%(committerdate:short) %(refname:short)'
fi

GH=''
if command -v gh >/dev/null 2>&1; then GH=gh
elif [ -x /opt/homebrew/bin/gh ]; then GH=/opt/homebrew/bin/gh
elif [ -x /usr/local/bin/gh ]; then GH=/usr/local/bin/gh
fi
if ! "$sin_red"; then
  echo '=== PRs E ISSUES ==='
  if [ -n "$GH" ]; then
    limite=8
    if "$completo"; then limite=30; fi
    "$GH" pr list --state open --limit "$limite" --json number,headRefName,title \
      --template '{{range .}}#{{.number}} {{.headRefName}} · {{truncate 85 .title}}{{"\n"}}{{end}}' 2>/dev/null \
      || echo '(PRs no consultados: revisa red, permisos y autenticación)'
    "$GH" issue list --state open --assignee @me --limit "$limite" 2>/dev/null \
      || echo '(issues no consultadas: revisa red, permisos y autenticación)'
    if ! "$completo"; then echo 'Lista acotada; gh pr list o --completo para ampliar.'; fi
  else echo '(gh no instalado; estado de PRs e issues no verificado)'; fi
fi

node bin/compilar-js.js || exit 1
if "$completo"; then
  echo '=== TAMAÑOS GENERADOS (editar src/) ==='
  wc -c index.html data.js engine.js app.js app-session.js marketplace.js render-main.js render-agenda.js styles.css sw.js | sed '$d'
fi

echo '=== TESTS ==='
if "$rapido"; then
  echo 'SKIP (--rapido): esta ejecución NO verificó la suite.'
elif ! command -v npm >/dev/null 2>&1; then
  echo 'SKIP: npm no está instalado en este entorno.'
else
  mkdir -p .cache
  registro=$(mktemp .cache/estado-tests.XXXXXX)
  trap 'rm -f "$registro"' EXIT
  if npm test >"$registro" 2>&1; then
    mv "$registro" .cache/estado-tests.log
    echo 'PASS (suite completa); detalle en .cache/estado-tests.log'
  else
    mv "$registro" .cache/estado-tests.log
    echo 'FAIL; detalle en .cache/estado-tests.log (no repitas la suite para leerlo).'
    tail -15 .cache/estado-tests.log
    exit 1
  fi
fi

echo 'Fuentes: npm run buscar -- consulta; mapa: npm run buscar -- --mapa.'
