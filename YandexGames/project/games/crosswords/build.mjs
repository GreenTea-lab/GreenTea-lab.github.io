import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {LOCATIONS} from './src/locations.js';
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const art={},inlineArt={};
for(const location of LOCATIONS){
  const full=`locations/${location.id}.jpg`,thumb=`locations/${location.id}-thumb.jpg`;
  if(!fs.existsSync('static/'+full)||!fs.existsSync('static/'+thumb)){
    if(process.argv.includes('--allow-partial-art'))continue;
    throw Error('Missing generated location: '+location.id);
  }
  art[location.id]={full,thumb};inlineArt[location.id]={full:'data:image/jpeg;base64,'+fs.readFileSync('static/'+full).toString('base64'),thumb:'data:image/jpeg;base64,'+fs.readFileSync('static/'+thumb).toString('base64')};
}
const check=spawnSync(process.execPath,['tools/validate.mjs'],{stdio:'inherit'});if(check.status!==0)throw Error('Level validation failed');
const fonts=fs.readdirSync('static').filter(f=>f.endsWith('.woff2'));
const html=fs.readFileSync('static/index.html','utf8').replace('<!--POLISH-->',()=>'<style>'+fs.readFileSync('static/polish.css','utf8')+'</style>');
const notice='Кроссворды. Классика '+version+'\n\nСловарные определения / Dictionary definitions\nРусский Викисловарь, авторы соответствующих статей; извлечение Kaikki / Wiktextract, дамп 2026-11-01. https://ru.wiktionary.org/ https://kaikki.org/ruwiktionary/\nОпределения отфильтрованы, удалены ударения, выбрано одно значение и иногда первая часть определения. Адаптированные определения Викисловаря распространяются по CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/ . Это условие относится к словарным данным, а не к программному коду игры. Исходную статью и историю авторства можно найти по слову в Викисловаре (Е/Ё нормализованы для сетки).\nАнглийские определения: WordNet 3.0, Princeton University.\nЧастотная сортировка: Hermit Dave, FrequencyWords / OpenSubtitles 2018; https://github.com/hermitdave/FrequencyWords .\nИсходные авторские вопросы из импортированного проекта сохранены отдельно от внешних определений.\n\n'+fs.readFileSync('tools/dictionaries/WordNet-3.0/LICENSE','utf8')+'\n\n'+fs.readFileSync('tools/dictionaries/FREQUENCY_LICENSE.txt','utf8')+'\n\nPT Sans\n'+fs.readFileSync('node_modules/@fontsource/pt-sans/LICENSE','utf8')+'\n\nPT Serif\n'+fs.readFileSync('node_modules/@fontsource/pt-serif/LICENSE','utf8');
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
for(const vk of [false,true]){
  const out=vk?'dist-vk':'dist',single=vk?'dist-vk-single':'dist-single';
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(single,{recursive:true});
  await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',target:['es2019'],charset:'utf8',legalComments:'none',outfile:out+'/game.js',...(vk?{plugins:[{name:'vk-sdk',setup(b){b.onResolve({filter:/\/sdk\.js$/},a=>a.importer.startsWith(path.resolve('src')+path.sep)?{path:path.resolve('src/sdk_vk.js')}:null);}}]}:{})});
  const notices=notice+(vk?'\n\nVK Bridge\n'+fs.readFileSync('node_modules/@vkontakte/vk-bridge/LICENSE','utf8'):'');
  const base=html.replace('<!--SDK-->',vk?'':'<script async src="/sdk.js"></script>').replace('</head>',()=>'<template id="third-party-notices"><pre>'+escape(notices)+'</pre></template></head>');
  for(const f of fonts)fs.copyFileSync('static/'+f,out+'/'+f);
  fs.mkdirSync(out+'/art',{recursive:true});fs.copyFileSync('static/art/reading-room.jpg',out+'/art/reading-room.jpg');
  fs.mkdirSync(out+'/locations',{recursive:true});for(const asset of Object.values(art))for(const file of Object.values(asset))fs.copyFileSync('static/'+file,out+'/'+file);
  fs.mkdirSync(out+'/dictionaries',{recursive:true});
  for(const lang of ['ru','en'])fs.copyFileSync('tools/dictionaries/'+lang+'-used.json',out+'/dictionaries/'+lang+'.json');
  fs.copyFileSync('tools/dictionaries/CC-BY-SA-4.0.txt',out+'/dictionaries/CC-BY-SA-4.0.txt');
  fs.writeFileSync(out+'/THIRD_PARTY_NOTICES.txt',notices);
  fs.writeFileSync(out+'/index.html',base.replace('<!--LOCATION_ART-->',()=>'<script>window.__CW_LOCATION_ART__='+JSON.stringify(art)+'</script>'));
  let s=base.replace(/<script async src="\/sdk.js"><\/script>/,'').replace('<!--LOCATION_ART-->',()=>'<script>window.__CW_LOCATION_ART__='+JSON.stringify(inlineArt)+'</script>');
  for(const f of fonts)s=s.replace('url('+f+')','url(data:font/woff2;base64,'+fs.readFileSync('static/'+f).toString('base64')+')');
  s=s.replaceAll('url(art/reading-room.jpg)','url(data:image/jpeg;base64,'+fs.readFileSync('static/art/reading-room.jpg').toString('base64')+')');
  const js=fs.readFileSync(out+'/game.js','utf8').replace(/<\/script/gi,'<\\/script');
  s=s.replace('<script src="game.js"></script>',()=>'<script>'+js+'</script>');
  fs.writeFileSync(single+'/index.html',s);
  console.log(out,Math.round(fs.statSync(out+'/game.js').size/1024)+' KiB JS;',single,(Buffer.byteLength(s)/1024/1024).toFixed(2)+' MiB');
}
