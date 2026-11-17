import '../test/remote-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const out=path.resolve('test-results/traffic-models');fs.mkdirSync(out,{recursive:true});
await build({entryPoints:['test/model-gallery.js'],bundle:true,format:'iife',outfile:out+'/gallery.js'});
fs.writeFileSync(out+'/gallery.html','<!doctype html><style>html,body{margin:0;background:#e9eef3}canvas{display:block}</style><body><script src="gallery.js"></script>');
const browser=await chromium.launch({channel:'chrome'});
try{const p=await browser.newPage({viewport:{width:1536,height:400}});const errors=[];p.on('pageerror',e=>errors.push(e.stack));await p.goto(pathToFileURL(out+'/gallery.html').href);await p.waitForFunction(()=>window.__GALLERY_READY);const size=await p.evaluate(()=>__GALLERY_SIZE);await p.setViewportSize({width:size.width,height:size.height});await p.screenshot({path:out+'/all-models.png',fullPage:true});
 for(let row=0;row<size.rows;row+=3)await p.screenshot({path:out+'/models-'+row+'.png',clip:{x:0,y:row*192,width:size.width,height:Math.min(576,size.height-row*192)}});
 await p.goto(pathToFileURL(out+'/gallery.html').href+'?new=1');await p.waitForFunction(()=>window.__GALLERY_READY);await p.screenshot({path:out+'/new-models.png',clip:{x:0,y:0,width:1536,height:768}});
 if(errors.length)throw Error(errors.join('\n'));console.log('Gallery:',size.count,'models');
}finally{await browser.close();}
