import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const kit=path.resolve('deliverables/vk-upload-2.2.1'),cfgFile=kit+'/vk-hosting-config.json',original=fs.readFileSync(cfgFile,'utf8');
const run=(args)=>spawnSync(process.execPath,args,{cwd:kit,encoding:'utf8',windowsHide:true});
const report={networkCalls:false,modes:[]};
try{
 let r=run(['check-build.cjs']);assert.equal(r.status,0,r.stderr);
 if(JSON.parse(original).app_id===0){r=run(['check-build.cjs','--require-app']);assert.notEqual(r.status,0,'Unset app ID blocks upload');}
 fs.writeFileSync(cfgFile,JSON.stringify({...JSON.parse(original),app_id:123},null,2));
 for(const dev of [false,true]){const r=run(['deploy.cjs','--dry-run',...(dev?['--dev']:[])]);assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.includes(dev?'"update_prod": false':'"update_prod": true'));assert.ok(r.stdout.includes('"update_dev": true'));report.modes.push({mode:dev?'dev':'production+dev',passed:true});}
 const media=JSON.parse(fs.readFileSync(kit+'/media/manifest.json'));assert.equal(media.screenshots.length,12);assert.equal(media.videos.length,2);assert.ok(media.videos.every(v=>v.duration<30));
 assert.deepEqual(media.errors,[]);
 const release=JSON.parse(fs.readFileSync(kit+'/release-manifest.json'));assert.equal(release.features.models,312);assert.equal(release.features.newModels,192);
 const themes=JSON.parse(fs.readFileSync(kit+'/theme-inspection/report.json'));assert.equal(themes.maps.length,95);
 assert.ok(themes.maps.every(m=>m.exclusivePercent>75&&m.exclusiveKindsPercent>50));
 for(const map of new Set(themes.maps.map(m=>m.map)))assert.ok(fs.existsSync(kit+'/theme-inspection/'+map+'.png'));
 assert.ok(fs.existsSync(kit+'/theme-inspection/overview.html'));report.themeSamples=themes.maps.length;
}finally{fs.writeFileSync(cfgFile,original);}
fs.copyFileSync('test-results/media-validation.json',kit+'/media-validation.json');
fs.writeFileSync('test-results/upload-kit-v2.json',JSON.stringify(report,null,2)+'\n');console.log(report);
