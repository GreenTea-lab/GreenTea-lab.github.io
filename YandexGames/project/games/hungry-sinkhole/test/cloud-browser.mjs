import './remote-browser.mjs';
// Cloud-only compatibility adapter; production code and assertions are unchanged.
import {chromium} from 'playwright';
if(process.platform!=='linux')throw new Error('Cloud browser checks require Linux');
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>{
 const adjusted={...options,executablePath:process.env.CLOUD_CHROME||'/usr/bin/chromium'};
 delete adjusted.channel;
 adjusted.args=[...(options?.args||[]),'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
 return launch(adjusted);
};
// Managed Chromium blocks file://. Serve the same build from loopback instead.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=process.cwd();
const server=http.createServer((req,res)=>{
 if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}
 const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.woff2':'font/woff2','.webp':'image/webp'})[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));server.unref();
const originalLaunch=chromium.launch;
chromium.launch=async options=>{
 const browser=await originalLaunch(options);
 const wrapPage=page=>{
  page.setDefaultTimeout(120000);
  const goto=page.goto.bind(page);
  page.goto=(url,options)=>goto(url.startsWith('file:')?'http://127.0.0.1:'+server.address().port+'/'+path.relative(root,fileURLToPath(url)).split(path.sep).join('/'):url,options);
 };
 const newPage=browser.newPage.bind(browser);browser.newPage=async options=>{const page=await newPage(options);wrapPage(page);return page;};
 const newContext=browser.newContext.bind(browser);browser.newContext=async options=>{const context=await newContext(options);context.on('page',wrapPage);return context;};
 return browser;
};
