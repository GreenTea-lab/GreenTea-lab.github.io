#!/bin/sh
# Архивы для консоли и исходники: release/sudoku-yandex.zip и release/sudoku-source.zip
set -e
cd "$(dirname "$0")/.."
mkdir -p release
rm -f release/sudoku-yandex.zip release/sudoku-source.zip
(cd dist && zip -qr ../release/sudoku-yandex.zip .)
zip -qr release/sudoku-source.zip src static tools test promo build.mjs package.json package-lock.json README.md .gitignore -x "test/out/*"
mkdir -p play && cp dist-single/index.html play/index.html
echo "pack ok"; ls -la release/*.zip
