// Export only this game and its isolated Pages preview. Does not publish or use credentials.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),workspace=path.resolve(root,'../..');
const version=JSON.parse(fs.readFileSync(root+'/package.json')).version;
const prefix='YandexGames/test/hungry-sinkhole-'+version+'/',source='YandexGames/project/games/hungry-sinkhole/';
const entries=[],patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{45,})/,/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}/,/\bvk1\.[a-z]\.[A-Za-z0-9_-]{45,}/,/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,/(?:password|api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'][^"'\s]{20,}["']/i];
function add(local,target){
 let b=fs.readFileSync(local),content;
 if(/\.(?:js|mjs|cjs|json|html|css|md|txt|svg|ps1|yml)$/.test(local)){
  content=b.toString('utf8');
  for(const p of [workspace,workspace.replaceAll('\\','/'),workspace.replaceAll('\\','\\\\')])content=content.replaceAll(p,'.');
  content=content.replace(/[A-Z]:[\\/](?:Users|Documents and Settings)[\\/][^\s"'<>\r\n)]+/gi,'[local-path]');
  if(patterns.some(re=>re.test(content)))throw Error('Credential pattern in '+path.relative(root,local));b=Buffer.from(content);
 }
 entries.push({path:target,sha:crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),bytes:b.length,...(content!==undefined?{content}:{})});
}
function walk(dir,target){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('No symlinks');e.isDirectory()?walk(f,target+e.name+'/'):add(f,target+e.name);}}
walk(root+'/dist-vk',prefix);
for(const folder of ['src','static','test','tools'])walk(root+'/'+folder,source+folder+'/');
for(const e of fs.readdirSync(root,{withFileTypes:true}))if(e.isFile()&&(/\.md$/.test(e.name)||['package.json','package-lock.json','build.mjs'].includes(e.name)))add(root+'/'+e.name,source+e.name);
add(root+'/COMPETITORS_2026_11_17.md',prefix+'competitors.md');
if(fs.existsSync(root+'/deliverables/competitors-2026-11-17.html'))add(root+'/deliverables/competitors-2026-11-17.html',prefix+'competitors.html');
add(workspace+'/.github/workflows/hungry-sinkhole-release.yml','.github/workflows/hungry-sinkhole-release.yml');
const out=root+'/deliverables/phone-export-'+version;fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/upload.json',JSON.stringify({version,prefix,entries}));
fs.writeFileSync(out+'/manifest.json',JSON.stringify({version,url:'https://greentea-lab.github.io/'+prefix,files:entries.map(({content,...e})=>e),secretsFound:0},null,2)+'\n');
console.log(JSON.stringify({version,files:entries.length,bytes:entries.reduce((n,e)=>n+e.bytes,0),export:path.relative(root,out)}));
