#!/bin/bash
# сборка и упаковка: release/neon-tanks-yandex.zip и release/neon-tanks-source.zip
set -e
cd "$(dirname "$0")"
node build.mjs
mkdir -p release
rm -f release/neon-tanks-yandex.zip release/neon-tanks-source.zip
(cd dist && zip -qr ../release/neon-tanks-yandex.zip .)
zip -qr release/neon-tanks-source.zip src static promo test build.mjs package.json package-lock.json README.md pack.sh -x 'test/*.png' 'promo/*.png'
ls -la release/*.zip
