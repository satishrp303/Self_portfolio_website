import {readFile} from 'node:fs/promises';
if(process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdout.write('Ready for upload details on hidden stdin.\n');
process.stdin.setEncoding('utf8');
let buffer='';
process.stdin.on('data',async chunk=>{
  buffer+=chunk;
  if(!/[\r\n]/.test(buffer)) return;
  process.stdin.pause();
  try {
    const {url,headers,file}=JSON.parse(buffer.trim());
    if(!url.startsWith('https://')) throw new Error('HTTPS required');
    const body=await readFile(file);
    const response=await fetch(url,{method:'PUT',headers,body});
    console.log(JSON.stringify({status:response.status,ok:response.ok,bytes:body.length}));
    process.exit(response.ok?0:1);
  } catch(error) { console.error('Upload failed: '+error.name); process.exit(1); }
});
