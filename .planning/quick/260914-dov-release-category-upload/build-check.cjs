
const fs = require('node:fs'); const path = require('node:path'); const {spawnSync} = require('node:child_process');
const prefix='/tmp/team4s-quick-dov-build-';
const work=fs.mkdtempSync(prefix); const marker=path.join(work,'.quick-dov-owned'); fs.writeFileSync(marker,'260914-dov');
try {
 fs.cpSync('/app',work,{recursive:true,filter: source => {
  const first=path.relative('/app',source).split(path.sep)[0];
  return !['node_modules','.next','.git'].includes(first) && !first.startsWith('.env') && !first.startsWith('tmp');
 }});
 fs.symlinkSync('/app/node_modules',path.join(work,'node_modules'),'dir');
 const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{cwd:work,env:{...process.env,NODE_ENV:'production'},encoding:'utf8',timeout:150000,maxBuffer:4*1024*1024});
 console.log(result.stdout); console.error(result.stderr); process.exitCode=result.status ?? 1;
} finally {
 if (fs.realpathSync(work)===work && work.startsWith(prefix) && fs.readFileSync(marker,'utf8')==='260914-dov') fs.rmSync(work,{recursive:true});
}
