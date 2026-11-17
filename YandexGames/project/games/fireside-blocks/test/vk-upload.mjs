import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';
const stage=path.resolve('deliverables/vk-upload-2.5.0'),source=fs.readFileSync(path.join(stage,'deploy.cjs'),'utf8');
async function simulate(dev,{checkStatus=0,success=true}={}){
 const calls=[],logs=[],proc={argv:['node','deploy.cjs',...(dev?['--dev']:[])],execPath:process.execPath,env:{MINI_APPS_ENVIRONMENT:dev?'production':'dev',MINI_APPS_APP_ID:'54817546'},exitCode:0,chdir(){}},config={app_id:123456789,static_path:'build',endpoints:{web:'index.html'},update_prod:dev,update_dev:false};
 const require=name=>{
  if(name==='node:fs')return {readFileSync:()=>JSON.stringify(config)};
  if(name==='node:path')return path;
  if(name==='node:child_process')return {spawnSync:(...args)=>{calls.push({type:'check',args});return {status:checkStatus};}};
  if(name==='@vkontakte/vk-miniapps-deploy')return {run:async cfg=>{calls.push({type:'deploy',cfg,env:{...proc.env}});return success;}};
  throw Error('Unexpected dependency: '+name);
 };
 vm.runInNewContext(source,{require,__dirname:stage,process:proc,console:{log:(...x)=>logs.push(x),error:(...x)=>logs.push(x)}});
 await new Promise(r=>setImmediate(r));return {calls,proc};
}
for(const dev of[false,true]){
 const {calls,proc}=await simulate(dev),deployment=calls.find(c=>c.type==='deploy');assert(deployment);assert.equal(calls[0].type,'check');assert(calls[0].args[1].includes('--require-app'));assert.equal(deployment.cfg.update_prod,!dev);assert.equal(deployment.cfg.update_dev,true);assert.equal(deployment.env.MINI_APPS_ENVIRONMENT,dev?'dev':'production');assert.equal(deployment.env.MINI_APPS_APP_ID,undefined);assert.equal(deployment.cfg.app_id,123456789);assert.equal(proc.exitCode,0);
 const blocked=await simulate(dev,{checkStatus:1});assert.equal(blocked.calls.length,1);assert.equal(blocked.proc.exitCode,1);
 const failure=await simulate(dev,{success:false});assert.equal(failure.proc.exitCode,1);
}
const main=fs.readFileSync(path.join(stage,'ЗАГРУЗИТЬ_В_VK.bat'),'utf8'),dev=fs.readFileSync(path.join(stage,'ЗАГРУЗИТЬ_ТОЛЬКО_DEV.bat'),'utf8');assert(main.includes('call npm run deploy\r\n'));assert(!main.includes('call npm run deploy:dev'));assert(dev.includes('call npm run deploy:dev\r\n'));
console.log('PASS production default, dev isolation, validated app ID, failed checks and deploy failures (mock SDK; no upload).');
