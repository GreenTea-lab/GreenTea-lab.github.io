import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const games=JSON.parse(fs.readFileSync(path.join(root,'catalog/games.json'),'utf8'));
const id=process.argv[2],game=games.find(g=>g.id===id);
if(!game)throw Error('Choose a game ID from npm run list.');
const browser=process.argv.includes('--browser');
if(browser&&(process.platform==='win32'||process.env.GAME_TESTS_REMOTE!=='1'))throw Error('Browser setup requires a remote environment and GAME_TESTS_REMOTE=1. Never run it on the owner’s Windows computer.');
const npm=process.platform==='win32'?'npm.cmd':'npm';
function run(cmd,args,cwd=root){const result=spawnSync(cmd,args,{cwd,stdio:'inherit',shell:process.platform==='win32'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
if(game.kind==='modular-source'){
 run(npm,['ci','--prefix',game.directory]);run(npm,['run','build','--',id]);
 for(const [out,preview]of [['dist-single','preview'],['dist-vk-single','preview-vk']]){
  const file=path.join(root,game.directory,out,'index.html');if(fs.existsSync(file)){const target=path.join(root,game.directory,preview);fs.mkdirSync(target,{recursive:true});fs.copyFileSync(file,path.join(target,'index.html'));}
 }
 if(browser){const npx=process.platform==='win32'?'npx.cmd':'npx';run(npx,['playwright','install','--with-deps','chrome'],path.join(root,game.directory));}
}
console.log('Prepared '+id+(browser?' with a remote browser.':'. No browser started.'));
