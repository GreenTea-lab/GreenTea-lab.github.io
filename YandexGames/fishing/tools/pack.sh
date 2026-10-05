#!/bin/sh
# Архивы для консоли и исходники: release/fishing-yandex.zip и release/fishing-source.zip
set -e
cd "$(dirname "$0")/.."
mkdir -p release
rm -f release/fishing-yandex.zip release/fishing-source.zip
(cd dist && zip -qr ../release/fishing-yandex.zip .)
zip -qr release/fishing-source.zip src static tools test promo build.mjs package.json package-lock.json README.md .gitignore -x "test/out/*"
mkdir -p play && cp dist-single/index.html play/index.html
echo "pack ok"; ls -la release/*.zip
