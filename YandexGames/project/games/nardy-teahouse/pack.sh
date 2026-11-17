#!/bin/bash
# Сборка выдачи: архив для Яндекса, исходники, промо, покупки, инструкция
set -e
cd "$(dirname "$0")"
OUT=${OUT:-/mnt/project-files/nardy-teahouse}
node build.mjs
mkdir -p "$OUT"
rm -f "$OUT/nardy-teahouse-yandex.zip" "$OUT/nardy-teahouse-source.zip"
(cd dist && zip -qr "$OUT/nardy-teahouse-yandex.zip" .)
zip -qr "$OUT/nardy-teahouse-source.zip" . -x 'node_modules/*' 'dist/*' 'dist-single/*' 'release/*' 'test/out/*' '*.log'
rm -rf "$OUT/promo" "$OUT/inapps"
cp -r release/promo "$OUT/promo"
cp -r release/inapps "$OUT/inapps"
cp release/КАК_ОПУБЛИКОВАТЬ.md "$OUT/"
ls -la "$OUT"
