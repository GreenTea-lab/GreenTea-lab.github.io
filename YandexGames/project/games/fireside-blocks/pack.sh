#!/bin/bash
# Сборка выдачи: release/fireside-blocks-yandex.zip, -source.zip, -promo.zip и копия в общую папку проекта
set -e
cd "$(dirname "$0")"
G=fireside-blocks
node build.mjs
rm -f release/$G-yandex.zip release/$G-source.zip release/$G-promo.zip
(cd dist && zip -qr ../release/$G-yandex.zip .)
zip -qr release/$G-source.zip src static test promo build.mjs package.json package-lock.json pack.sh КАК_ОПУБЛИКОВАТЬ.md -x 'test/mock/*.png'
(cd release && zip -qr $G-promo.zip promo inapps)
OUT=${OUT:-/mnt/project-files/$G}
mkdir -p "$OUT"
cp -r release/promo release/inapps "$OUT/"
cp release/$G-yandex.zip release/$G-source.zip release/$G-promo.zip КАК_ОПУБЛИКОВАТЬ.md "$OUT/"
ls -la release/*.zip
