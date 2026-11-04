#!/usr/bin/env bash
# Publica la versión web en GitHub Pages (rama gh-pages del repositorio "origin").
# La web se sirve en https://<usuario>.github.io/notita/ (ver experiments.baseUrl en app.json).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf web-build
npx expo export -p web --output-dir web-build
# Las rutas directas (p. ej. /notita/calendario) cargan la app en lugar de dar error 404.
cp web-build/index.html web-build/404.html
# Sin esto GitHub Pages ignora la carpeta _expo (la que empieza por guion bajo).
touch web-build/.nojekyll

remote="$(git remote get-url origin)"
name="$(git config user.name)"
email="$(git config user.email)"
cd web-build
git init -q -b gh-pages
git add -A
git -c user.name="$name" -c user.email="$email" commit -q -m "Publicar la versión web"
git push -q -f "$remote" gh-pages
echo "Publicado en la rama gh-pages."
