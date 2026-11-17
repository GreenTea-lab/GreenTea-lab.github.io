#!/bin/sh
# Сборка и архивы: ./tools/pack.sh [имя] [папка вывода]
#   <имя>-yandex.zip  — для консоли Яндекс Игр (index.html в корне)
#   <имя>-source.zip  — исходники без node_modules и сборок
#   inapps/           — иконки покупок 256×256 и inapps.csv
set -e
cd "$(dirname "$0")/.."
NAME=${1:-sudoku}
OUT=${2:-release}
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
node build.mjs
rm -f "$OUT/$NAME-yandex.zip" "$OUT/$NAME-source.zip"
(cd dist && zip -qr "$OUT/$NAME-yandex.zip" .)
zip -qr "$OUT/$NAME-source.zip" src static tools test promo build.mjs package.json package-lock.json README.md .gitignore -x "test/out/*"
node promo/inapps.mjs "$OUT/inapps"
unzip -l "$OUT/$NAME-yandex.zip" | grep -q " index.html$" && echo "index.html в корне архива"
ls -la "$OUT"
