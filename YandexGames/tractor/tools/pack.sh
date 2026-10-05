#!/bin/sh
# Архивы для консоли и исходники: release/tractor-yandex.zip и release/tractor-source.zip
set -e
cd "$(dirname "$0")/.."
mkdir -p release
rm -f release/tractor-yandex.zip release/tractor-source.zip
(cd dist && zip -qr ../release/tractor-yandex.zip .)
zip -qr release/tractor-source.zip src static tools test promo build.mjs package.json package-lock.json README.md .gitignore -x "test/out/*"
mkdir -p play && cp dist-single/index.html play/index.html
echo "pack ok"; ls -la release/*.zip
