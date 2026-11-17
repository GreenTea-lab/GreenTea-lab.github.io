#!/bin/sh
# Архивы для консоли и исходники: release/garage-flipper-yandex.zip и release/garage-flipper-source.zip
set -e
cd "$(dirname "$0")/.."
mkdir -p release
rm -f release/garage-flipper-yandex.zip release/garage-flipper-source.zip
(cd dist && zip -qr ../release/garage-flipper-yandex.zip .)
zip -qr release/garage-flipper-source.zip src static tools test promo build.mjs package.json package-lock.json README.md .gitignore release/КАК_ОПУБЛИКОВАТЬ.md -x "test/out/*"
mkdir -p play && cp dist-single/index.html play/index.html
echo "pack ok"; ls -la release/*.zip
