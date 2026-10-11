import { writeFile } from 'node:fs/promises';
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdout.write('Ready for video download details on hidden stdin.\n');
process.stdin.setEncoding('utf8');
let input='';
process.stdin.on('data',async chunk=>{
  input+=chunk;
  if(!/[\r\n]/.test(input)) return;
  process.stdin.pause();
  try {
    const {url,file}=JSON.parse(input.trim());
    const response=await fetch(url);
    if(!response.ok) throw new Error('HTTP '+response.status);
    const bytes=new Uint8Array(await response.arrayBuffer());
    await writeFile(file,bytes);
    console.log(JSON.stringify({status:response.status,bytes:bytes.length,saved:true}));
    if(process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.unref?.();
  } catch(error) { console.error('Download failed: '+error.name); process.exitCode=1; if(process.stdin.isTTY)process.stdin.setRawMode(false); process.stdin.unref?.(); }
});
