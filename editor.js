(function(){
'use strict';
const $=id=>document.getElementById(id);
const status=$('studioStatus');
function say(message){status.textContent=message||''}
const client=window.supabase&&window.EVIE_SUPABASE_URL&&window.EVIE_SUPABASE_PUBLISHABLE_KEY?
window.supabase.createClient(window.EVIE_SUPABASE_URL,window.EVIE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}}):null;
const bucket='evie-public-gallery';
let owner=null;
function view(isOwner){$('studioMain').hidden=!isOwner;$('studioLogin').hidden=isOwner}
async function authenticate(){
 if(!client){say('The photo studio is not connected.');view(false);return}
 const {data,error}=await client.auth.getUser();
 const user=error?null:data?.user;
 if(!user){owner=null;view(false);return}
 const check=await client.from('evie_gallery_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(check.error||!check.data){owner=null;view(false);say('This account cannot manage the gallery.');return}
 owner=user;view(true);await refresh();
}
$('studioLoginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!client)return;
 const button=e.currentTarget.querySelector('button');button.disabled=true;say('Opening your studio…');
 const {error}=await client.auth.signInWithPassword({email:$('studioEmail').value.trim(),password:$('studioPassword').value});
 $('studioPassword').value='';
 if(error){say('That sign-in did not work. Check your email and password.');button.disabled=false;return}
 await authenticate();button.disabled=false;if(owner)say('You’re in. Choose your photos below. ♡');
});
$('studioSignout').addEventListener('click',async()=>{if(client)await client.auth.signOut();owner=null;view(false);say('Signed out.');});
function optimize(file){
 return new Promise((resolve,reject)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){reject(Error('Choose a JPG, PNG or WebP image.'));return}
  if(file.size>25*1024*1024){reject(Error('That file is too large. Choose one under 25 MB.'));return}
  const blobUrl=URL.createObjectURL(file),image=new Image();
  image.onload=()=>{
   URL.revokeObjectURL(blobUrl);
   const factor=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.naturalWidth*factor));
   canvas.height=Math.max(1,Math.round(image.naturalHeight*factor));
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);
   canvas.toBlob(out=>{
    if(!out){reject(Error('Could not prepare this photo.'));return}
    const ext=out.type==='image/webp'?'webp':'jpg';
    resolve({blob:out,ext});
   },'image/webp',.78);
  };
  image.onerror=()=>{URL.revokeObjectURL(blobUrl);reject(Error('Could not open this image.'))};
  image.src=blobUrl;
 });
}
async function refresh(){
 if(!client||!owner)return;
 const {data,error}=await client.from('evie_public_photos').select('id,storage_path,alt_text,placement,published,is_featured,created_at').order('created_at',{ascending:false}).limit(200);
 const root=$('studioCards');root.replaceChildren();
 if(error){say('Could not load the photo list.');return}
 if(!data.length){root.textContent='No photos here yet. Upload your first one above.';return}
 for(const item of data){
  const card=document.createElement('article');card.className='studio-card';
  const img=document.createElement('img');img.alt=item.alt_text||'Photo preview';img.loading='lazy';
  img.src=client.storage.from(bucket).getPublicUrl(item.storage_path).data.publicUrl;
  const caption=document.createElement('input');caption.value=item.alt_text||'';caption.maxLength=160;
  caption.setAttribute('aria-label','Photo description');
  const where=document.createElement('select');where.setAttribute('aria-label','Photo placement');
  for(const [value,label] of [['gallery','Gallery'],['hero','Homepage'],['about','About'],['menu','Menu preview'],['featured','Featured']]){
   const opt=document.createElement('option');opt.value=value;opt.textContent=label;opt.selected=item.placement===value;where.append(opt);
  }
  const published=document.createElement('label');published.className='studio-check';
  const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=item.published;
  published.append(toggle,document.createTextNode(' Visible on site'));
  const actions=document.createElement('div');actions.className='studio-actions';
  const save=document.createElement('button');save.type='button';save.textContent='Save';
  save.addEventListener('click',async()=>{
   save.disabled=true;
   const {error}=await client.from('evie_public_photos').update({alt_text:caption.value.trim(),placement:where.value,published:toggle.checked}).eq('id',item.id);
   say(error?'Could not save this photo.':'Saved! Your site will show the change shortly.');save.disabled=false;
  });
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.className='studio-remove';
  remove.addEventListener('click',async()=>{
   if(!confirm('Remove this photo from the public gallery?'))return;
   remove.disabled=true;
   const {error}=await client.from('evie_public_photos').delete().eq('id',item.id);
   if(error){say('Could not remove that photo.');remove.disabled=false;return}
   const result=await client.storage.from(bucket).remove([item.storage_path]);
   say(result.error?'Removed from the gallery. Could not delete the stored file.':'Photo removed.');
   await refresh();
  });
  actions.append(save,remove);card.append(img,caption,where,published,actions);root.append(card);
 }
}
$('studioUploadForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!client||!owner)return;
 const files=[...$('studioFiles').files];
 if(!files.length)return;
 const placement=$('studioPlacement').value,alt=$('studioCaption').value.trim();
 const button=$('studioUpload');button.disabled=true;
 let done=0,errors=[];
 for(let i=0;i<files.length;i++){
  const file=files[i];say('Adding photo '+(i+1)+' of '+files.length+'…');
  try{
   const converted=await optimize(file);
   const base='evie-'+placement+'-'+Date.now()+'-'+crypto.randomUUID().slice(0,8);
   const path=base+'.'+converted.ext;
   const upload=await client.storage.from(bucket).upload(path,converted.blob,{contentType:converted.blob.type,upsert:false,cacheControl:'3600'});
   if(upload.error)throw upload.error;
   const description=alt||(files.length===1?'Evie in a favorite photo':'A new moment from Evie');
   const add=await client.from('evie_public_photos').insert({storage_path:path,alt_text:description,placement,published:true,is_featured:placement==='featured'||placement==='hero'});
   if(add.error){await client.storage.from(bucket).remove([path]);throw add.error}
   done++;
  }catch(error){errors.push(file.name+': '+(error?.message||'could not upload'))}
 }
 button.disabled=false;$('studioFiles').value='';$('studioCaption').value='';
 say(done+' photo'+(done===1?'':'s')+' added.'+(errors.length?' '+errors.join(' | '):''));
 await refresh();
});
$('studioMain').hidden=true;authenticate().catch(()=>say('Could not load your studio. Refresh and try again.'));
})();