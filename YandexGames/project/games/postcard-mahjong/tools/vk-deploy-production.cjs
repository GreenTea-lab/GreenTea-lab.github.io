const {spawnSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const check=spawnSync(process.execPath,[path.join(__dirname,'check-build.cjs'),'--require-app'],{cwd:__dirname,stdio:'inherit',windowsHide:true});
if(check.error){console.error(check.error.message);process.exit(1);}
if(check.status!==0)process.exit(check.status||1);
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'vk-hosting-config.json'),'utf8'));
console.log('Обычная выкладка VK: production. Update prod URLs = Yes, Update dev URLs = Yes.');
const run=spawnSync(process.execPath,[path.join(__dirname,'node_modules/@vkontakte/vk-miniapps-deploy/bin/vk-miniapps-deploy')],{
  cwd:__dirname,stdio:'inherit',windowsHide:true,
  env:{...process.env,MINI_APPS_ENVIRONMENT:'production',MINI_APPS_APP_ID:String(config.app_id)}
});
if(run.error){console.error(run.error.message);process.exit(1);}
process.exit(run.status??1);
