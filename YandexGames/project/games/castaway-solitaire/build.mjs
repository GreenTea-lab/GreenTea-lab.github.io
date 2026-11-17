import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const fonts=fs.readdirSync('static').filter(f=>f.endsWith('.woff2'));
const images=fs.readdirSync('static/backgrounds').filter(f=>f.endsWith('.webp')).map(f=>'backgrounds/'+f);
const licenses=['@fontsource/nunito/LICENSE','@fontsource/lobster/LICENSE','three/LICENSE','@vkontakte/vk-bridge/LICENSE'];
const notices=licenses.map(f=>f+'\n'+fs.readFileSync('node_modules/'+f,'utf8')).join('\n\n');
let html=fs.readFileSync('static/index.html','utf8').replace('</head>','<style>'+fs.readFileSync('static/polish.css','utf8')+'</style></head>');
for(const vk of [false,true]){
  const out=vk?'dist-vk':'dist',single=vk?'dist-vk-single':'dist-single';
  for(const dir of [out,single]){fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});}
  await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',target:['es2019'],outfile:out+'/game.js',legalComments:'none',
    ...(vk?{plugins:[{name:'vk-sdk',setup(b){b.onResolve({filter:/\/sdk\.js$/},a=>a.importer.startsWith(path.resolve('src')+path.sep)?{path:path.resolve('src/sdk_vk.js')}:null);}}]}:{})});
  fs.mkdirSync(out+'/backgrounds',{recursive:true});
  for(const f of [...fonts,...images])fs.copyFileSync('static/'+f,out+'/'+f);
  const normal=html.replace('<!--SDK-->',vk?'':'<script async src="/sdk.js"></script>');
  fs.writeFileSync(out+'/index.html',normal);fs.writeFileSync(out+'/THIRD_PARTY_NOTICES.txt',notices);
  let doc=html.replace('<!--SDK-->','');
  for(const f of fonts)doc=doc.replaceAll('url('+f+')','url(data:font/woff2;base64,'+fs.readFileSync('static/'+f).toString('base64')+')');
  for(const f of images)doc=doc.replaceAll('url('+f+')','url(data:image/webp;base64,'+fs.readFileSync('static/'+f).toString('base64')+')');
  doc=doc.replace('<script src="game.js"></script>',()=>'<script>'+fs.readFileSync(out+'/game.js','utf8').replace(/<\/script/gi,'<\\/script')+'</script>');
  doc=doc.replace('</head>',()=>'<template id="third-party-notices"><pre>'+notices.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre></template></head>');
  fs.writeFileSync(single+'/index.html',doc);
  console.log(out,Math.round(fs.statSync(out+'/game.js').size/1024)+' KiB JS;',single,(Buffer.byteLength(doc)/1024/1024).toFixed(2)+' MiB');
}
