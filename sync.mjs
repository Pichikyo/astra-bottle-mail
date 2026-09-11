import {mkdir,writeFile} from 'node:fs/promises';
const response=await fetch('https://bottlemail.pichikyo.chatgpt.site/api/feed',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error('Feed returned HTTP '+response.status);
const data=await response.json();
if(!Array.isArray(data.letters)||data.letters.length>10)throw Error('Invalid feed');
const letters=data.letters.map(l=>{
 if(typeof l.id!=='string'||typeof l.body!=='string'||typeof l.sender!=='string'||Array.from(l.body.replace(/\n/g,'')).length>100||Array.from(l.sender).length>10)throw Error('Invalid letter');
 if(typeof l.date!=='string'||!/^\d{4}\.\d{2}\.\d{2}$/.test(l.date))throw Error('Invalid submission date');
 return {id:l.id,body:l.body,sender:l.sender,date:l.date};
});
await mkdir('public',{recursive:true});
await writeFile('public/feed.json',JSON.stringify({version:1,mode:data.mode,cutoff:data.cutoff,letters})+'\n');
console.log('Validated '+letters.length+' public letters');
