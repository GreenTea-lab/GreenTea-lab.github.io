# dist-single/index.html → страница для Artifact (без doctype/html/head/body, обёртку добавит публикация)
import re, sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
body = re.search(r'<body[^>]*>(.*)</body>', s, re.S).group(1)
head = re.sub(r'<meta[^>]*>\s*', '', head)
extra = '<style>html,body{height:100%;background:#0b0d36;color-scheme:dark}</style>'
open(out, 'w', encoding='utf-8').write(head.strip() + '\n' + extra + '\n' + body.strip() + '\n')
