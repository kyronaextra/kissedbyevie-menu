(function(){
'use strict';
const sdk=window.supabase,conf=window.EVIE_SUPABASE_URL,key=window.EVIE_SUPABASE_PUBLISHABLE_KEY;
if(!sdk||!conf||!key)return;
const client=sdk.createClient(conf,key,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket='evie-public-gallery';
let selected=0,all=[];
const dlg=document.createElement('dialog');dlg.className='public-gallery-dialog';dlg.setAttribute('aria-label','Photo viewer');
const close=document.createElement('button');close.className='public-gallery-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close');
const image=document.createElement('img');image.alt='';
const prev=document.createElement('button');prev.type='button';prev.className='public-gallery-prev';prev.textContent='←';prev.setAttribute('aria-label','Previous photo');
const next=document.createElement('button');next.type='button';next.className='public-gallery-next';next.textContent='→';next.setAttribute('aria-label','Next photo');
const counter=document.createElement('span');counter.className='public-gallery-counter';
dlg.append(close,prev,image,next,counter);document.body.append(dlg);
function renderViewer(){if(!all.length)return;const p=all[selected];image.src=p.url;image.alt=p.alt||'Kissed by Evie portrait';counter.textContent=(selected+1)+' / '+all.length}
function openPhoto(photo){
 const index=all.findIndex(p=>p.id===photo.id);
 if(index<0)return;selected=index;renderViewer();if(!dlg.open)dlg.showModal();
}
function shift(n){if(!all.length)return;selected=(selected+n+all.length)%all.length;renderViewer()}
close.addEventListener('click',()=>dlg.close());
prev.addEventListener('click',()=>shift(-1));next.addEventListener('click',()=>shift(1));
dlg.addEventListener('click',event=>{if(event.target===dlg)dlg.close()});
dlg.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();shift(-1)}if(event.key==='ArrowRight'){event.preventDefault();shift(1)}});
function wrap(p){
 const button=document.createElement('button');button.type='button';button.className='photo-card image-button';
 const img=document.createElement('img');img.src=p.url;img.alt=p.alt||'Kissed by Evie portrait';img.loading='lazy';img.decoding='async';
 const label=document.createElement('span');label.textContent='OPEN PHOTO ↗';
 button.append(img,label);button.addEventListener('click',()=>openPhoto(p));return button;
}
function bindExisting(button,p){
 const img=button.querySelector('img');if(!img)return;
 img.src=p.url;img.alt=p.alt||'Kissed by Evie portrait';
 button.__eviePublicPhoto=p;
 if(button.__eviePublicBound)return;
 button.__eviePublicBound=true;
 button.addEventListener('click',event=>{
  if(event.target.closest('a'))return;
  event.preventDefault();event.stopImmediatePropagation();
  openPhoto(button.__eviePublicPhoto);
 },true);
}
async function refresh(){
 const result=await client.from('evie_public_photos').select('id,storage_path,alt_text,placement,created_at')
 .eq('published',true).order('created_at',{ascending:false}).limit(120);
 if(result.error||!result.data||!result.data.length)return;
 all=result.data.map(p=>({...p,url:client.storage.from(bucket).getPublicUrl(p.storage_path).data.publicUrl,alt:p.alt_text||''}));
 const heroes=all.filter(p=>p.placement==='hero'||p.placement==='featured');
 const heroChoices=(heroes.length?heroes:all).slice(0,4);
 document.querySelectorAll('.hero-slide').forEach((slide,i)=>bindExisting(slide,heroChoices[i%heroChoices.length]));
 const about=all.find(p=>p.placement==='about')||all[0];
 const intro=document.querySelector('.editorial-image');if(intro)bindExisting(intro,about);
 const rail=document.getElementById('galleryRail');
 if(rail){
  rail.replaceChildren();
  const photos=[...all.filter(p=>p.placement==='featured'),...all.filter(p=>p.placement!=='featured')];
  photos.forEach(p=>rail.append(wrap(p)));
 }
 const previews=all.filter(p=>p.placement==='menu').slice(0,6);
 if(previews.length&&!document.getElementById('menuPhotoPreview')){
  const row=document.createElement('div');row.id='menuPhotoPreview';row.className='menu-photo-preview';
  for(const p of previews){
   const btn=document.createElement('button');btn.type='button';btn.setAttribute('aria-label','View menu preview');
   const img=document.createElement('img');img.src=p.url;img.alt=p.alt||'Photo preview';img.loading='lazy';
   btn.append(img);btn.addEventListener('click',()=>openPhoto(p));row.append(btn);
  }
  const catalog=document.getElementById('boutiqueCatalog');if(catalog)catalog.prepend(row);
 }
}
refresh().catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{})});
})();