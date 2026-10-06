#!/bin/sh
# Архивы для консоли и исходники: release/parkour-yandex.zip и release/parkour-source.zip
set -e
cd "$(dirname "$0")/.."
mkdir -p release
rm -f release/parkour-yandex.zip release/parkour-source.zip
(cd dist && zip -qr ../release/parkour-yandex.zip .)
zip -qr release/parkour-source.zip src static tools test promo build.mjs package.json package-lock.json README.md .gitignore -x "test/out/*"
mkdir -p play && cp dist-single/index.html play/index.html
echo "pack ok"; ls -la release/*.zip
