#!/bin/sh
# Архивы для консоли и исходники: release/whale-yandex.zip и release/whale-source.zip
set -e
cd "$(dirname "$0")/.."
mkdir -p release
rm -f release/whale-yandex.zip release/whale-source.zip
(cd dist && zip -qr ../release/whale-yandex.zip .)
zip -qr release/whale-source.zip src static tools test promo build.mjs package.json package-lock.json README.md .gitignore -x "test/out/*"
mkdir -p play && cp dist-single/index.html play/index.html
echo "pack ok"; ls -la release/*.zip
