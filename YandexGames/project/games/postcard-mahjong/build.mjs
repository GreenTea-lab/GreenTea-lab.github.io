// Сборка: dist/ (для Яндекс Игр) и dist-single/ (один HTML для превью)
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
const out = 'dist';
const compatibilityGuard={banner:{js:'if (!window.__PM_UNSUPPORTED) {'},footer:{js:'}'}};
const fontNotices=['nunito','kurale','lobster'].map(name=>name.toUpperCase()+'\n'+fs.readFileSync(path.join('static','licenses',name+'-OFL.txt'),'utf8')).join('\n\n');
const vkNotices=fontNotices+'\n\n@vkontakte/vk-bridge\n'+fs.readFileSync('node_modules/@vkontakte/vk-bridge/LICENSE','utf8');
const withNotices=(html,vk=false)=>html.replace('</head>',()=>'<template id="third-party-notices"><pre>\n'+(vk?vkNotices:fontNotices).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'\n</pre></template></head>');
const cityDir=path.join('static','cities');
const cityFiles=fs.readdirSync(cityDir).filter(f=>f.endsWith('.webp')).sort();
if(cityFiles.length!==20)throw new Error('Expected 20 generated city backgrounds');
const cityURLs=Object.fromEntries(cityFiles.map(f=>[path.basename(f,'.webp'),'cities/'+f]));
const cityInline=Object.fromEntries(cityFiles.map(f=>[path.basename(f,'.webp'),'data:image/webp;base64,'+fs.readFileSync(path.join(cityDir,f)).toString('base64')]));
const cityFormats=JSON.parse(fs.readFileSync(path.join(cityDir,'formats/manifest.json')));
if(cityFormats.images.length!==60)throw Error('Expected three responsive formats for all 20 cities');
const cityVariantMap=inline=>Object.fromEntries(Object.keys(cityFormats.formats).map(format=>[format,Object.fromEntries(cityFormats.images.filter(x=>x.format===format).map(x=>[x.id,inline?'data:image/webp;base64,'+fs.readFileSync(path.join('static',x.file)).toString('base64'):x.file]))]));
const cityVariantURLs=cityVariantMap(false),cityVariantInline=cityVariantMap(true);
const emblem=fs.readFileSync(path.join('static','ui','emblem.webp'));
const uiFiles=fs.readdirSync(path.join('static','ui')).filter(f=>f.endsWith('.webp'));
const inlineUI=html=>{for(const f of uiFiles)html=html.replaceAll('ui/'+f,'data:image/webp;base64,'+fs.readFileSync(path.join('static','ui',f)).toString('base64'));return html;};
const tileFiles=['fruits','flowers','gems-a','gems-b','stamps-a','stamps-b','skins-front','skins-back'];
const tileURLs=Object.fromEntries(tileFiles.map(id=>[id,'tiles/'+id+'.webp']));
const tileInline=Object.fromEntries(tileFiles.map(id=>[id,'data:image/webp;base64,'+fs.readFileSync(path.join('static','tiles',id+'.webp')).toString('base64')]));
const postcardDir=path.join('static','postcards'),postcardFiles=fs.existsSync(postcardDir)?fs.readdirSync(postcardDir).filter(x=>x.endsWith('.webp')):[];
if(postcardFiles.length!==22||!fs.existsSync('static/ui/mira.webp'))throw new Error('Expected 20 city, 2 special postcard atlases and Mira portrait; run tools/prepare-postcard-art.mjs');
const postcardURLs=Object.fromEntries(postcardFiles.map(f=>[path.basename(f,'.webp'),'postcards/'+f]));
const postcardInline=Object.fromEntries(postcardFiles.map(f=>[path.basename(f,'.webp'),'data:image/webp;base64,'+fs.readFileSync(path.join(postcardDir,f)).toString('base64')]));
const guideURL=inline=>fs.existsSync('static/ui/mira.webp')?(inline?'data:image/webp;base64,'+fs.readFileSync('static/ui/mira.webp').toString('base64'):'ui/mira.webp'):'';
const artScript=(data,inline=false)=>'<script>window.__CITY_ART__='+JSON.stringify(data)+';window.__CITY_VARIANTS__='+JSON.stringify(inline?cityVariantInline:cityVariantURLs)+';window.__UI_ART__='+JSON.stringify({emblem:inline?'data:image/webp;base64,'+emblem.toString('base64'):'ui/emblem.webp',mira:guideURL(inline)})+';window.__TILE_ART__='+JSON.stringify(inline?tileInline:tileURLs)+';window.__POSTCARD_ART__='+JSON.stringify(inline?postcardInline:postcardURLs)+'</script>';
const copyCities=directory=>{fs.mkdirSync(path.join(directory,'cities'),{recursive:true});for(const f of cityFiles)fs.copyFileSync(path.join(cityDir,f),path.join(directory,'cities',f));fs.mkdirSync(path.join(directory,'ui'),{recursive:true});for(const f of uiFiles)fs.copyFileSync(path.join('static','ui',f),path.join(directory,'ui',f));fs.mkdirSync(path.join(directory,'tiles'),{recursive:true});for(const id of tileFiles)fs.copyFileSync(path.join('static','tiles',id+'.webp'),path.join(directory,'tiles',id+'.webp'));};
const copyPostcards=directory=>{fs.mkdirSync(path.join(directory,'postcards'),{recursive:true});for(const f of postcardFiles)fs.copyFileSync(path.join(postcardDir,f),path.join(directory,'postcards',f));};
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
await build({ ...compatibilityGuard, entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: ['es2019'], outfile: path.join(out, 'game.js'), legalComments: 'none' });
const fonts = ['nunito-cyr.woff2', 'nunito-lat.woff2', 'nunito9-cyr.woff2', 'nunito9-lat.woff2', 'kurale-cyr.woff2', 'kurale-lat.woff2', 'lobster-cyr.woff2', 'lobster-lat.woff2'];
for (const f of fonts) fs.copyFileSync(path.join('static', f), path.join(out, f));
const html = fs.readFileSync('static/index.html', 'utf8').replace('<!--INTERFACE-->',()=>'<style>'+fs.readFileSync('static/interface.css','utf8')+'\n'+fs.readFileSync('static/menu.css','utf8')+'\n'+fs.readFileSync('static/loader.css','utf8')+'\n'+fs.readFileSync('static/travel.css','utf8')+'</style>');
copyCities(out);copyPostcards(out);fs.cpSync(path.join(cityDir,'formats'),path.join(out,'cities/formats'),{recursive:true});
fs.writeFileSync(path.join(out, 'index.html'), withNotices(html.replace('<!--SDK-->', '<script async src="/sdk.js"></script>').replace('<!--CITY_ART-->',()=>artScript(cityURLs))));
fs.writeFileSync(path.join(out,'THIRD_PARTY_NOTICES.txt'),fontNotices);
// один файл
const single = 'dist-single';
fs.rmSync(single, { recursive: true, force: true });
fs.mkdirSync(single, { recursive: true });
let s = html.replace('<!--SDK-->', '').replace('<!--CITY_ART-->',()=>artScript(cityInline,true));
for (const f of fonts) s = s.replace(`url(${f})`, `url(data:font/woff2;base64,${fs.readFileSync(path.join('static', f)).toString('base64')})`);
const js = fs.readFileSync(path.join(out, 'game.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
s = s.replace('<script src="game.js"></script>', () => `<script>${js}</script>`);
fs.writeFileSync(path.join(single, 'index.html'), withNotices(inlineUI(s)));
const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
console.log('game.js', kb(path.join(out, 'game.js')), '| single', kb(path.join(single, 'index.html')));

const vkOut = 'dist-vk';
fs.rmSync(vkOut, { recursive: true, force: true });
fs.mkdirSync(vkOut, { recursive: true });
await build({
  ...compatibilityGuard,
  entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: ['es2019'],
  outfile: path.join(vkOut, 'game.js'), legalComments: 'none',
  plugins: [{ name: 'vk-sdk', setup(b) {
    b.onResolve({ filter: /\/sdk\.js$/ }, args => args.importer.startsWith(path.resolve('src') + path.sep) ? { path: path.resolve('src/sdk_vk.js') } : null);
  } }],
});
for (const f of fonts) fs.copyFileSync(path.join('static', f), path.join(vkOut, f));
copyCities(vkOut);copyPostcards(vkOut);fs.cpSync(path.join(cityDir,'formats'),path.join(vkOut,'cities/formats'),{recursive:true});
fs.writeFileSync(path.join(vkOut, 'index.html'), withNotices(html.replace('<!--SDK-->', '').replace('<!--CITY_ART-->',()=>artScript(cityURLs)),true));
fs.writeFileSync(path.join(vkOut,'THIRD_PARTY_NOTICES.txt'),vkNotices);
// Локальное VK-превью использует data URL, чтобы Canvas мог сохранять открытки при file:.
const vkSingle='dist-vk-single';fs.mkdirSync(vkSingle,{recursive:true});
let vks=html.replace('<!--SDK-->','').replace('<!--CITY_ART-->',()=>artScript(cityInline,true));
for(const f of fonts)vks=vks.replace(`url(${f})`,`url(data:font/woff2;base64,${fs.readFileSync(path.join('static',f)).toString('base64')})`);
const vkJS=fs.readFileSync(path.join(vkOut,'game.js'),'utf8').replace(/<\/script/gi,'<\\/script');
vks=vks.replace('<script src="game.js"></script>',()=>`<script>${vkJS}</script>`);
fs.writeFileSync(path.join(vkSingle,'index.html'),withNotices(inlineUI(vks),true));
console.log('VK game.js', kb(path.join(vkOut, 'game.js')));
