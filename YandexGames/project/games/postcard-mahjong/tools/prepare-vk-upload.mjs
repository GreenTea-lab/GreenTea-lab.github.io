import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const version=JSON.parse(fs.readFileSync('package.json')).version,tag=process.argv[2]||'personal-records';
if(!/^[a-z0-9-]+$/.test(tag))throw Error('Invalid release tag');
const stage=path.resolve('deliverables/vk-upload-'+version);fs.mkdirSync(stage,{recursive:true});
function write(name,text){fs.writeFileSync(path.join(stage,name),text.replaceAll('2.3.0',version),'utf8');}
fs.cpSync('dist-vk',path.join(stage,'build'),{recursive:true});
fs.mkdirSync(path.join(stage,'archives'),{recursive:true});
for(const name of [`postcard-mahjong-vk-ok-${tag}-2026-11-15.zip`,`postcard-mahjong-source-${tag}-2026-11-15.zip`])fs.copyFileSync(path.join('deliverables',name),path.join(stage,'archives',name));
fs.copyFileSync('dist-vk-single/index.html',path.join(stage,'preview.html'));
fs.copyFileSync('VK_RELEASE_GUIDE.md',path.join(stage,'КАК_ЗАГРУЗИТЬ_И_ЗАПОЛНИТЬ_КАРТОЧКУ.md'));
if(fs.existsSync('ТЕКСТЫ_ДЛЯ_КАРТОЧКИ_VK.md'))fs.copyFileSync('ТЕКСТЫ_ДЛЯ_КАРТОЧКИ_VK.md',path.join(stage,'ТЕКСТЫ_ДЛЯ_КАРТОЧКИ_VK.md'));
const pkg={name:'postcard-mahjong-vk',version:'2.3.0',private:true,homepage:'./',engines:{node:'>=18'},scripts:{check:'node check-build.cjs',setup:'node configure-app.cjs',predeploy:'node check-build.cjs --require-app',deploy:'node deploy-production.cjs','deploy:prod':'node deploy-production.cjs','deploy:dev':'node deploy-dev.cjs'},dependencies:{'@vkontakte/vk-miniapps-deploy':'1.0.3'}};
write('package.json',JSON.stringify(pkg,null,2)+'\n');
const lock=JSON.parse(fs.readFileSync('[local-path]','utf8'));lock.name=pkg.name;lock.version=pkg.version;lock.packages['']={name:pkg.name,version:pkg.version,dependencies:pkg.dependencies,engines:pkg.engines};write('package-lock.json',JSON.stringify(lock,null,2)+'\n');
if(!fs.existsSync(path.join(stage,'vk-hosting-config.json')))write('vk-hosting-config.json',JSON.stringify({static_path:'build',app_id:0,endpoints:{mobile:'index.html',web:'index.html',mvk:'index.html'}},null,2)+'\n');
write('.gitignore','node_modules/\ndeploy_log*.txt\n.env\n');
write('configure-app.cjs',`const fs=require('node:fs'),path=require('node:path');const {createInterface}=require('node:readline/promises');
(async()=>{const rl=createInterface({input:process.stdin,output:process.stdout});try{const answer=(await rl.question('Введите числовой ID игры «Маджонг с открытками» из кабинета VK: ')).trim();if(!/^[1-9]\\d*$/.test(answer)||!Number.isSafeInteger(Number(answer))||answer==='54817546')throw Error('Нужен ID маджонга, а не ID Неонового Роя.');const file=path.join(__dirname,'vk-hosting-config.json'),cfg=JSON.parse(fs.readFileSync(file));cfg.app_id=Number(answer);fs.writeFileSync(file,JSON.stringify(cfg,null,2)+'\\n');console.log('ID сохранён: '+cfg.app_id);}finally{rl.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
`);
write('check-build.cjs',`const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
try{const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'vk-hosting-config.json'))),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'release-manifest.json')));if(cfg.static_path!=='build'||['mobile','web','mvk'].some(k=>cfg.endpoints[k]!=='index.html'))throw Error('Не меняйте static_path/endpoints: сборка лежит в build/.');for(const f of manifest.buildFiles){const file=path.resolve(__dirname,'build',f.path);if(!file.startsWith(path.join(__dirname,'build')+path.sep))throw Error('Некорректный путь.');if(!fs.existsSync(file)||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==f.sha256)throw Error('Файл сборки отсутствует или изменён: '+f.path);}if(process.argv.includes('--require-app')&&(!Number.isSafeInteger(cfg.app_id)||cfg.app_id<=0||cfg.app_id===54817546))throw Error('Сначала выполните npm run setup и укажите ID маджонга.');console.log('Сборка 2.3.0 проверена: '+manifest.buildFiles.length+' файлов. '+(cfg.app_id?'App ID: '+cfg.app_id:'App ID пока не задан; выполните npm run setup.'));}catch(e){console.error(e.message);process.exitCode=1;}
`);
write('deploy-dev.cjs',`const {spawnSync}=require('node:child_process'),path=require('node:path');const check=spawnSync(process.execPath,[path.join(__dirname,'check-build.cjs'),'--require-app'],{cwd:__dirname,stdio:'inherit'});if(check.status!==0)process.exit(check.status||1);const run=spawnSync(process.execPath,[path.join(__dirname,'node_modules/@vkontakte/vk-miniapps-deploy/bin/vk-miniapps-deploy')],{cwd:__dirname,stdio:'inherit',env:{...process.env,MINI_APPS_ENVIRONMENT:'dev'}});process.exit(run.status||0);
`);
write('deploy-production.cjs',fs.readFileSync('tools/vk-deploy-production.cjs','utf8'));
write('ЗАГРУЗИТЬ_В_VK.bat',fs.readFileSync('tools/vk-upload-production.bat','utf8').replace(/\r?\n/g,'\r\n'));
write('ПРОВЕРИТЬ_СБОРКУ.bat','@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\nnode check-build.cjs\r\npause\r\n');
write('ПРОЧТИ_МЕНЯ.txt','Маджонг с открытками · 2.3.0 · 15.11.2026\r\n\r\n1. Откройте КАК_ЗАГРУЗИТЬ_И_ЗАПОЛНИТЬ_КАРТОЧКУ.md.\r\n2. Создайте отдельное приложение в VK и укажите его ID через npm run setup.\r\n3. Запустите ЗАГРУЗИТЬ_В_VK.bat — это обычная выкладка production с обновлением основных URL.\r\n4. Скриншоты, видео и оформление лежат в media/.\r\n5. preview.html — автономная проверка, не файл для хостинга.\r\n\r\nВ VK отправляется только build/. Материалы и видео в build/ не кладите.\r\nID берётся из vk-hosting-config.json; если он не задан, выполните npm run setup.\r\nНикаких загрузок или публикаций в VK при подготовке папки не выполнялось.\r\n');
const buildFiles=[];for(const folder of fs.readdirSync(path.join(stage,'build'),{withFileTypes:true})){
  const walk=rel=>{const file=path.join(stage,'build',rel);if(fs.statSync(file).isDirectory())for(const n of fs.readdirSync(file))walk(path.join(rel,n));else buildFiles.push({path:rel.replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});};walk(folder.name);
}
write('release-manifest.json',JSON.stringify({game:'postcard-mahjong',version:'2.3.0',date:'2026-11-15',applicationIdConfigured:false,buildFiles},null,2)+'\n');
console.log('Upload kit prepared:',stage,'build files:',buildFiles.length);
