import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const SOURCE='https://bottlemail.pichikyo.chatgpt.site/api/feed';
const PUBLIC='https://pichikyo.github.io/astra-bottle-mail/feed.json';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function normalizeFeed(data,generatedAt=new Date().toISOString()){
 if(!data||!Array.isArray(data.letters)||data.letters.length>50)throw Error('Invalid feed: maximum 50 letters');
 const ids=new Set();
 const letters=data.letters.map(l=>{
  if(!l||typeof l.id!=='string'||!l.id||l.id.length>128||ids.has(l.id)||typeof l.body!=='string'||typeof l.sender!=='string'||Array.from(l.body.replace(/\n/g,'')).length>100||Array.from(l.sender).length>10)throw Error('Invalid letter');
  if(typeof l.date!=='string'||!/^\d{4}\.\d{2}\.\d{2}$/.test(l.date))throw Error('Invalid submission date');
  ids.add(l.id);
  return {id:l.id,body:l.body,sender:l.sender,date:l.date};
 });
 const revision=Number.isSafeInteger(data.source_revision)&&data.source_revision>=0?data.source_revision:0;
 return {version:1,mode:'latest',cutoff:null,source_revision:revision,generated_at:generatedAt,letters};
}
export async function syncFeed(){
 let response,lastError;
 for(let attempt=0;attempt<3;attempt++){
  if(attempt)await pause(attempt*1000);
  try{
   response=await fetch(SOURCE,{headers:{Accept:'application/json','Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
   if(response.ok)break;
   throw Error('Source returned HTTP '+response.status);
  }catch(error){lastError=error;response=null;}
 }
 if(!response)throw lastError;
 const data=normalizeFeed(await response.json());
 await mkdir('public',{recursive:true});
 const json=JSON.stringify(data)+'\n';
 await writeFile('public/feed.json',json);
 await mkdir('public/feeds',{recursive:true});
 await Promise.all(Array.from({length:16},(_,i)=>writeFile('public/feeds/'+i+'.json',json)));
 console.log('Validated '+data.letters.length+' public letters; revision '+data.source_revision);
}
export async function verifyPublished(){
 const expected=(await readFile('public/feed.json','utf8')).trim();
 for(let attempt=0;attempt<12;attempt++){
  if(attempt)await pause(5000);
  try{
   const response=await fetch(PUBLIC+'?verification='+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(10000)});
   if(response.ok&&(await response.text()).trim()===expected){
    console.log('Verified deployed feed matches the publication snapshot');
    return;
   }
  }catch{}
 }
 throw Error('Published feed did not match the new snapshot');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fileURLToPath(new URL('file:///'+process.argv[1].replace(/\\/g,'/').replace(/^\/+/,'')))){
 if(process.argv.includes('--verify'))await verifyPublished();else await syncFeed();
}
