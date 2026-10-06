#!/bin/sh
# Привести снимки, снятые с dpr 2, к точным размерам из имени файла
cd "$(dirname "$0")/../release/promo"
for f in cover_*_800x470.png showcase_*_1560x520.png; do
  s=${f%.png}; s=${s##*_}; w=${s%x*}; h=${s#*x}
  ffmpeg -loglevel error -y -i "$f" -vf "scale=$w:$h:flags=lanczos" "_$f" && mv "_$f" "$f"
done
