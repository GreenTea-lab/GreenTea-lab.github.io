import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const fonts=['bubbles-cyr.woff2','bubbles-lat.woff2','rubik600-cyr.woff2','rubik600-lat.woff2','rubik800-cyr.woff2','rubik800-lat.woff2'];
const assetDirs=['backgrounds','maps'];
const assets=Object.fromEntries(assetDirs.map(dir=>[dir,fs.existsSync('static/'+dir)?fs.readdirSync('static/'+dir).filter(f=>f.endsWith('.webp')).sort():[]]));
const urls=dir=>Object.fromEntries(assets[dir].map(f=>[path.basename(f,'.webp'),dir+'/'+f]));
const inline=dir=>Object.fromEntries(assets[dir].map(f=>[path.basename(f,'.webp'),'data:image/webp;base64,'+fs.readFileSync('static/'+dir+'/'+f).toString('base64')]));
const html=fs.readFileSync('static/index.html','utf8').replace('<!--POLISH-->',()=>'<style>'+fs.readFileSync('static/polish.css','utf8')+'</style>').replace('<!--LOADING_STYLE-->',()=>'<style>'+fs.readFileSync('static/loading.css','utf8')+'</style>');
const notice=['Three.js — MIT','Rapier — Apache-2.0','VK Bridge — MIT','Rubik and Rubik Bubbles — SIL Open Font License 1.1'].join('\n');
for(const vk of [false,true]){
 const out=vk?'dist-vk':'dist',single=vk?'dist-vk-single':'dist-single';
 for(const d of [out,single])fs.mkdirSync(d,{recursive:true});
 await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',target:['es2020'],outfile:out+'/game.js',legalComments:'eof',
   ...(vk?{plugins:[{name:'vk-sdk',setup(b){b.onResolve({filter:/\/sdk\.js$/},a=>a.importer.startsWith(path.resolve('src')+path.sep)?{path:path.resolve('src/sdk_vk.js')}:null);}}]}:{})});
 for(const f of fonts)fs.copyFileSync('static/'+f,out+'/'+f);
 for(const[dir,files]of Object.entries(assets)){fs.mkdirSync(out+'/'+dir,{recursive:true});for(const f of files)fs.copyFileSync('static/'+dir+'/'+f,out+'/'+dir+'/'+f);}
 const js=fs.readFileSync(out+'/game.js','utf8');
 for(const one of [false,true]){
   let h=html.replace('<!--SDK-->',vk||one?'':'<script async src="/sdk.js"></script>')
     .replace('<!--ART-->',()=>'<script>window.__HS_ART__='+JSON.stringify(one?inline('backgrounds'):urls('backgrounds'))+';window.__HS_MAPS__='+JSON.stringify(one?inline('maps'):urls('maps'))+';</script>');
   if(one){
     for(const f of fonts)h=h.replace('url('+f+')','url(data:font/woff2;base64,'+fs.readFileSync('static/'+f).toString('base64')+')');
     for(const[key,value]of Object.entries(inline('backgrounds')))h=h.replaceAll('url(backgrounds/'+key+'.webp)','url('+value+')');
     h=h.replace(/<script src="game.js"[^>]*><\/script>/,()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
   }
   fs.writeFileSync((one?single:out)+'/index.html',h);
 }
 fs.writeFileSync(out+'/THIRD_PARTY_NOTICES.txt',notice+'\n\n'+['three/LICENSE','@dimforge/rapier3d-compat/LICENSE','@vkontakte/vk-bridge/LICENSE','@fontsource/rubik/LICENSE','@fontsource/rubik-bubbles/LICENSE'].filter(f=>fs.existsSync('node_modules/'+f)).map(f=>f+'\n'+fs.readFileSync('node_modules/'+f,'utf8')).join('\n\n'));
 console.log(out,(Buffer.byteLength(js)/1024/1024).toFixed(2)+' MiB JS;',single,(fs.statSync(single+'/index.html').size/1024/1024).toFixed(2)+' MiB');
}
