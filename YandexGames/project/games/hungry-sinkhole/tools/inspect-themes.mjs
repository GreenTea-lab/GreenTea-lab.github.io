import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {THEME_NAMES} from '../src/theme-catalog.js';
const out=path.resolve('test-results/theme-variety');fs.mkdirSync(out,{recursive:true});
await build({entryPoints:['test/model-gallery.js'],bundle:true,format:'iife',outfile:out+'/gallery.js'});
fs.writeFileSync(out+'/gallery.html','<!doctype html><style>html,body{margin:0;background:#e9eef3}canvas{display:block}</style><body><script src="gallery.js"></script>');
const browser=await chromium.launch({channel:'chrome'});const errors=[];
try{const p=await browser.newPage({viewport:{width:768,height:576}});p.on('pageerror',e=>errors.push(e.stack));
 for(const map of Object.keys(THEME_NAMES)){await p.goto(pathToFileURL(out+'/gallery.html').href+'?theme='+map);await p.waitForFunction(()=>window.__GALLERY_READY);await p.screenshot({path:out+'/'+map+'.png'});console.log('THEME GALLERY',map);}
 fs.writeFileSync(out+'/overview.html','<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#17223b;color:#fff3d3;font:18px system-ui}main{display:grid;grid-template-columns:repeat(4,384px);gap:14px}img{width:384px;display:block}h2{font-size:18px;margin:6px 0}</style><h1>16 уникальных наборов локаций</h1><main>'+Object.entries(THEME_NAMES).map(([id,label])=>'<section><h2>'+label+'</h2><a href="gallery.html?theme='+id+'"><img src="'+id+'.png"></a></section>').join('')+'</main>');
 await p.setViewportSize({width:1618,height:1450});await p.goto(pathToFileURL(out+'/overview.html').href);await p.screenshot({path:out+'/overview.png',fullPage:true});if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
