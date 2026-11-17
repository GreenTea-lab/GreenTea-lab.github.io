const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
async function main(){
  process.chdir(__dirname);
  const check=spawnSync(process.execPath,[path.join(__dirname,'check-build.cjs'),'--require-app'],{cwd:__dirname,stdio:'inherit'});
  if(check.status!==0){process.exitCode=check.status||1;return;}
  const dev=process.argv.includes('--dev'),environment=dev?'dev':'production';
  const cfg={...JSON.parse(fs.readFileSync(path.join(__dirname,'vk-hosting-config.json'),'utf8')),update_prod:!dev,update_dev:true};
  // The selected mode and checked app ID take priority over inherited CLI overrides.
  process.env.MINI_APPS_ENVIRONMENT=environment;
  delete process.env.MINI_APPS_APP_ID;
  console.log(dev?'VK: только dev; рабочие URL не меняются.':'VK: production + dev; рабочие URL игры будут обновлены.');
  if(process.argv.includes('--dry-run')){
    console.log(JSON.stringify({environment,app_id:cfg.app_id,update_prod:cfg.update_prod,update_dev:cfg.update_dev,static_path:cfg.static_path,endpoints:cfg.endpoints},null,2));
    return;
  }
  const deployed=await require('@vkontakte/vk-miniapps-deploy').run(cfg);
  if(!deployed)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
