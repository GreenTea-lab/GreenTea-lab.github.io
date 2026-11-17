#!/bin/sh
# Упаковка выдачи в /mnt/project-files/castaway-solitaire/
set -e
OUT=/mnt/project-files/castaway-solitaire
mkdir -p $OUT
node build.mjs
rm -f $OUT/castaway-solitaire-yandex.zip $OUT/castaway-solitaire-source.zip
(cd dist && zip -qr $OUT/castaway-solitaire-yandex.zip .)
zip -qr $OUT/castaway-solitaire-source.zip . -x 'node_modules/*' 'dist/*' 'dist-single/*' 'release/*'
rm -rf $OUT/promo $OUT/inapps
cp -r release/promo release/inapps $OUT/
cp release/КАК_ОПУБЛИКОВАТЬ.md $OUT/
ls -la $OUT
