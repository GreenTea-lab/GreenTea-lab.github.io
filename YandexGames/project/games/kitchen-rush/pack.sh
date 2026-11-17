# Упаковка выдачи в /mnt/project-files/kitchen-rush
set -e
cd "$(dirname "$0")"
name=kitchen-rush
O=/mnt/project-files/$name
rm -f release/$name-yandex.zip release/$name-source.zip
(cd dist && zip -qr ../release/$name-yandex.zip .)
zip -qr release/$name-source.zip src static promo test build.mjs package.json package-lock.json README.md pack.sh -x "test/*.png"
mkdir -p $O
rm -rf $O/promo $O/inapps
cp -r release/* $O/
echo "$name ok"
