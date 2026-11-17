import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {ROOM_SCENES} from './src/room-scenes.js';
const fonts=['nunito-cyr.woff2','nunito-lat.woff2','nunito9-cyr.woff2','nunito9-lat.woff2','kurale-cyr.woff2','kurale-lat.woff2'];
const artFiles=fs.readdirSync('static/backgrounds').filter(x=>x.endsWith('.webp')).sort();
if(artFiles.length!==16)throw new Error('Expected 16 backgrounds: run node tools/prepare-backgrounds.mjs');
const itemFiles=fs.readdirSync('static/items').filter(x=>x.endsWith('.webp')).sort();
if(itemFiles.length!==24)throw new Error('Expected 24 item sprites');
const itemURLs=Object.fromEntries(itemFiles.map(f=>[path.basename(f,'.webp'),'items/'+f]));
const itemInline=Object.fromEntries(itemFiles.map(f=>[path.basename(f,'.webp'),'data:image/webp;base64,'+fs.readFileSync('static/items/'+f).toString('base64')]));
const urls=Object.fromEntries(artFiles.map(f=>[path.basename(f,'.webp'),'backgrounds/'+f]));
const inline=Object.fromEntries(artFiles.map(f=>[path.basename(f,'.webp'),'data:image/webp;base64,'+fs.readFileSync('static/backgrounds/'+f).toString('base64')]));
const extras=['decor','ui'];
const roomKeys=ROOM_SCENES.flatMap(s=>['wide','phone'].map(o=>s.key+'-'+o));
const roomFiles=fs.readdirSync('static/rooms').filter(x=>x.endsWith('.webp')).sort();
if(!process.argv.includes('--allow-partial-room-art'))for(const key of roomKeys)if(!roomFiles.includes(key+'.webp'))throw Error('Missing full room scene '+key);
const roomURLs=Object.fromEntries(roomFiles.map(f=>[path.basename(f,'.webp'),'rooms/'+f]));
const roomInline=Object.fromEntries(roomFiles.map(f=>[path.basename(f,'.webp'),'data:image/webp;base64,'+fs.readFileSync('static/rooms/'+f).toString('base64')]));
const extraURLs={},extraInline={};
for(const dir of extras){const files=fs.readdirSync('static/'+dir).filter(x=>x.endsWith('.webp')).sort();extraURLs[dir]=Object.fromEntries(files.map(f=>[path.basename(f,'.webp'),dir+'/'+f]));extraInline[dir]=Object.fromEntries(files.map(f=>[path.basename(f,'.webp'),'data:image/webp;base64,'+fs.readFileSync('static/'+dir+'/'+f).toString('base64')]));}
if(Object.keys(extraURLs.decor).length!==26||Object.keys(extraURLs.ui).length!==2)throw new Error('Missing decor/loading art');
const html=fs.readFileSync('static/index.html','utf8').replace('<!--POLISH-->',()=>'<style>'+['polish','controls','refinement','loader'].map(n=>fs.readFileSync('static/'+n+'.css','utf8')).join('\n')+'</style>');
const fontsNotice=['nunito','kurale'].map(n=>n.toUpperCase()+'\n'+fs.readFileSync('static/licenses/'+n+'-OFL.txt','utf8')).join('\n\n');
const vkNotice=fontsNotice+'\n\nVK Bridge\n'+fs.readFileSync('node_modules/@vkontakte/vk-bridge/LICENSE','utf8');
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
function documentHTML(vk, single, js){
 let s=html.replace('<!--SDK-->',vk||single?'':'<script async src="/sdk.js"></script>')
   .replace('<!--ART-->',()=>'<script>window.__FB_ART__='+JSON.stringify(single?inline:urls)+';window.__FB_ITEMS__='+JSON.stringify(single?itemInline:itemURLs)+';window.__FB_DECOR__='+JSON.stringify((single?extraInline:extraURLs).decor)+';window.__FB_ROOMS__='+JSON.stringify(single?roomInline:roomURLs)+'</script>')
   .replace('</head>',()=>'<template id="third-party-notices"><pre>'+escape(vk?vkNotice:fontsNotice)+'</pre></template></head>');
 if(single){
  for(const f of fonts)s=s.replace('url('+f+')','url(data:font/woff2;base64,'+fs.readFileSync('static/'+f).toString('base64')+')');
  s=s.replaceAll('url(backgrounds/hearth.webp)','url('+inline.hearth+')');
  for(const [id,data]of Object.entries(extraInline.ui))s=s.replaceAll('url(ui/'+id+'.webp)','url('+data+')');
  s=s.replace('<script src="game.js"></script>',()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
 }
 return s;
}
for(const vk of [false,true]){
 const out=vk?'dist-vk':'dist', single=vk?'dist-vk-single':'dist-single';
 for(const d of [out,single])fs.mkdirSync(d,{recursive:true});
 await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',target:['es2019'],outfile:out+'/game.js',legalComments:'none',
  ...(vk?{plugins:[{name:'vk-sdk',setup(b){b.onResolve({filter:/\/sdk\.js$/},a=>a.importer.startsWith(path.resolve('src')+path.sep)?{path:path.resolve('src/sdk_vk.js')}:null);}}]}:{})});
 fs.mkdirSync(out+'/backgrounds',{recursive:true});
 for(const f of artFiles)fs.copyFileSync('static/backgrounds/'+f,out+'/backgrounds/'+f);
 fs.mkdirSync(out+'/items',{recursive:true});for(const f of itemFiles)fs.copyFileSync('static/items/'+f,out+'/items/'+f);
 for(const dir of extras){fs.mkdirSync(out+'/'+dir,{recursive:true});for(const file of Object.values(extraURLs[dir]))fs.copyFileSync('static/'+file,out+'/'+file);}
 fs.mkdirSync(out+'/rooms',{recursive:true});for(const f of roomFiles)fs.copyFileSync('static/rooms/'+f,out+'/rooms/'+f);
 for(const f of fonts)fs.copyFileSync('static/'+f,out+'/'+f);
 const js=fs.readFileSync(out+'/game.js','utf8');
 fs.writeFileSync(out+'/index.html',documentHTML(vk,false,js));
 fs.writeFileSync(out+'/THIRD_PARTY_NOTICES.txt',vk?vkNotice:fontsNotice);
 fs.writeFileSync(single+'/index.html',documentHTML(vk,true,js));
 console.log(out, (Buffer.byteLength(js)/1024).toFixed(0)+' KiB JS;',single,(fs.statSync(single+'/index.html').size/1024/1024).toFixed(2)+' MiB');
}
