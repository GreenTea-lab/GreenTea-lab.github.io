#!/bin/sh
# Архивы для консоли и исходники: release/garage-yandex.zip и release/garage-source.zip
set -e
cd "$(dirname "$0")/.."
mkdir -p release
rm -f release/garage-yandex.zip release/garage-source.zip
(cd dist && zip -qr ../release/garage-yandex.zip .)
zip -qr release/garage-source.zip src static tools test promo build.mjs package.json package-lock.json README.md .gitignore -x "test/out/*"
mkdir -p play && cp dist-single/index.html play/index.html
echo "pack ok"; ls -la release/*.zip
