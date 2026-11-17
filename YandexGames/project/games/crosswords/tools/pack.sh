#!/bin/sh
# Архивы для консоли и исходники: release/crosswords-yandex.zip и release/crosswords-source.zip
set -e
cd "$(dirname "$0")/.."
mkdir -p release
rm -f release/crosswords-yandex.zip release/crosswords-source.zip
(cd dist && zip -qr ../release/crosswords-yandex.zip .)
zip -qr release/crosswords-source.zip src static tools test promo build.mjs package.json package-lock.json README.md .gitignore -x "test/out/*"
mkdir -p play && cp dist-single/index.html play/index.html
echo "pack ok"; ls -la release/*.zip
