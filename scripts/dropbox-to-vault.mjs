#!/usr/bin/env node
/**
 * One-way Dropbox shared-folder import to private Supabase Daddy vault.
 * Run locally with Node 20+. Never place secrets in your public repository.
 * Default mode is READ-ONLY dry run. --upload explicitly starts transfer.
 *
 * Required: DROPBOX_ACCESS_TOKEN, DROPBOX_SHARED_LINK
 * For --upload also: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Dropbox API scopes: files.metadata.read + sharing.read.
 * NOTE: Dropbox server_modified is NOT guaranteed to be original upload time.
 */
import { createHash } from 'node:crypto';

const shared=process.env.DROPBOX_SHARED_LINK||'';
const token=process.env.DROPBOX_ACCESS_TOKEN||'';
const supabaseUrl=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const upload=process.argv.includes('--upload');
const maxMB=Number(process.env.EVIE_MAX_SINGLE_FILE_MB||50);
if(!token||!shared){
  console.error('Missing DROPBOX_ACCESS_TOKEN or DROPBOX_SHARED_LINK environment variable.');
  process.exit(1);
}
if(!/^https:\/\/www\.dropbox\.com\//.test(shared))throw Error('Expected a Dropbox shared folder URL.');
if(upload&&(!/^https:\/\/[^/]+\.supabase\.co$/.test(supabaseUrl)||!key)){
  throw Error('For --upload configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your own environment.');
}
if(!Number.isFinite(maxMB)||maxMB<=0)throw Error('EVIE_MAX_SINGLE_FILE_MB must be positive.');

const types=new Map([
 ['.jpg',['photo','image/jpeg']],['.jpeg',['photo','image/jpeg']],['.png',['photo','image/png']],
 ['.webp',['photo','image/webp']],['.gif',['photo','image/gif']],['.avif',['photo','image/avif']],
 ['.heic',['photo','image/heic']],['.heif',['photo','image/heif']],
 ['.tif',['photo','image/tiff']],['.tiff',['photo','image/tiff']],
 ['.mp4',['video','video/mp4']],['.m4v',['video','video/mp4']],['.mov',['video','video/quicktime']],
 ['.webm',['video','video/webm']],['.avi',['video','video/x-msvideo']],
 ['.mkv',['video','video/x-matroska']]
]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function headers(){return {Authorization:'Bearer '+token,'Content-Type':'application/json'};}
async function retryFetch(url,options){
  for(let attempt=0;attempt<4;attempt++){
    const response=await fetch(url,options);
    if(![429,500,502,503,504].includes(response.status)||attempt===3)return response;
    const wait=Math.min(15000,Math.max(1000,Number(response.headers.get('Retry-After')||0)*1000||1000*(attempt+1)));
    try{await response.body?.cancel()}catch(_){}
    await sleep(wait);
  }
}
async function rpc(endpoint,arg){
  const response=await retryFetch('https://api.dropboxapi.com/2/'+endpoint,{
    method:'POST',headers:headers(),body:JSON.stringify(arg)
  });
  if(!response.ok)throw Error('Dropbox '+endpoint+' rejected with HTTP '+response.status+': '+(await response.text()).slice(0,500));
  return response.json();
}
async function listFolder(path){
  let page=await rpc('files/list_folder',{path,shared_link:{url:shared},limit:500,recursive:false});
  const entries=[...(page.entries||[])];
  while(page.has_more){
    page=await rpc('files/list_folder/continue',{cursor:page.cursor});
    entries.push(...(page.entries||[]));
  }
  return entries;
}
async function listMedia(){
  const queue=[''];const seen=new Set();const files=[];
  while(queue.length){
    const folder=queue.shift();
    if(seen.has(folder))continue;
    seen.add(folder);
    const entries=await listFolder(folder);
    for(const entry of entries){
      const path=folder+'/'+entry.name;
      if(entry['.tag']==='folder'){queue.push(path);continue}
      if(entry['.tag']!=='file')continue;
      const ext=/\.[a-z0-9]+$/i.exec(entry.name)?.[0]?.toLowerCase()||'';
      const type=types.get(ext);
      if(!type)continue;
      files.push({path,meta:entry,kind:type[0],mime:type[1],ext});
    }
  }
  files.sort((a,b)=>String(b.meta.server_modified||'').localeCompare(String(a.meta.server_modified||'')));
  return files;
}
function asciiHeaderJSON(value){
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
}
function sbHeaders(extra={}){
  return {...extra,apikey:key,Authorization:'Bearer '+key};
}
async function alreadyIndexed(sourceId){
  const url=new URL(supabaseUrl+'/rest/v1/evie_daddy_media');
  url.searchParams.set('select','id');
  url.searchParams.set('source_id','eq.'+sourceId);
  url.searchParams.set('limit','1');
  const response=await retryFetch(url,{headers:sbHeaders()});
  if(!response.ok)throw Error('Supabase metadata lookup failed: '+response.status);
  return (await response.json()).length>0;
}
async function uploadOne(item){
  const meta=item.meta,sourceId=meta.id||item.path;
  if(await alreadyIndexed(sourceId))return 'existing';
  if(Number(meta.size||0)>maxMB*1024*1024)return 'oversize';
  const basename=createHash('sha256').update(sourceId).digest('hex');
  const storagePath='dropbox/'+basename+item.ext;
  const drop=await retryFetch('https://content.dropboxapi.com/2/sharing/get_shared_link_file',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Dropbox-API-Arg':asciiHeaderJSON({url:shared,path:item.path})}
  });
  if(!drop.ok)throw Error('Dropbox file HTTP '+drop.status+': '+(await drop.text()).slice(0,300));
  const streamHeaders=sbHeaders({'Content-Type':item.mime,'cache-control':'private, max-age=0'});
  if(Number.isInteger(meta.size)&&meta.size>=0)streamHeaders['Content-Length']=String(meta.size);
  const response=await fetch(supabaseUrl+'/storage/v1/object/evie-daddy-vault/'+storagePath,{
    method:'POST',headers:streamHeaders,body:drop.body,duplex:'half'
  });
  if(!response.ok&&response.status!==409){
    throw Error('Private storage upload HTTP '+response.status+': '+(await response.text()).slice(0,450));
  }
  const timestamp=meta.server_modified&&Number.isFinite(Date.parse(meta.server_modified))?
    meta.server_modified:new Date().toISOString();
  const metadata={
    source_id:sourceId,storage_path:storagePath,title:item.meta.name.slice(0,255),
    kind:item.kind,mime_type:item.mime,file_bytes:meta.size??null,
    source_modified_at:meta.server_modified||null,sort_at:timestamp,published:true
  };
  const saved=await retryFetch(supabaseUrl+'/rest/v1/evie_daddy_media?on_conflict=source_id',{
    method:'POST',headers:sbHeaders({
      'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'
    }),body:JSON.stringify(metadata)
  });
  if(!saved.ok)throw Error('Supabase metadata save HTTP '+saved.status+': '+(await saved.text()).slice(0,500));
  return 'added';
}
const files=await listMedia();
const totalBytes=files.reduce((sum,f)=>sum+Number(f.meta.size||0),0);
const oversize=files.filter(f=>Number(f.meta.size||0)>maxMB*1024*1024);
const summary={
  mediaFiles:files.length,photos:files.filter(f=>f.kind==='photo').length,
  videos:files.filter(f=>f.kind==='video').length,
  totalGB:Number((totalBytes/1024**3).toFixed(2)),
  tooLargeForConfiguredSingleFileLimit:oversize.length,
  configuredSingleFileLimitMB:maxMB
};
console.log('Dropbox shared-folder inventory:',JSON.stringify(summary,null,2));
if(!upload){
  console.log('Dry run only. Review Supabase capacity, video compatibility and date semantics.');
  console.log('Pass --upload only when you are ready to import into the private vault.');
}else{
  const stats={added:0,existing:0,oversize:0,failed:0};
  for(let i=0;i<files.length;i++){
    const f=files[i];
    try{
      const status=await uploadOne(f);stats[status]++;
      console.log((i+1)+'/'+files.length+': '+status);
    }catch(error){
      stats.failed++;
      console.error((i+1)+'/'+files.length+': failed ('+String(error.message||error).slice(0,200)+')');
    }
  }
  console.log('Import result:',JSON.stringify(stats,null,2));
  if(stats.failed||stats.oversize)process.exitCode=2;
}
