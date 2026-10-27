(function(){
'use strict';
const sdk=window.supabase, url=window.EVIE_SUPABASE_URL, key=window.EVIE_SUPABASE_PUBLISHABLE_KEY;
if(!sdk||!url||!key)return;
const client=sdk.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket='evie-public-gallery';
let photos=[],selected=0,lastFocus=null;
const dialog=document.createElement('dialog');
dialog.className='public-gallery-dialog';
dialog.setAttribute('aria-label','Photo gallery viewer');
const close=document.createElement('button');
close.type='button';close.className='public-gallery-close';close.textContent='×';close.setAttribute('aria-label','Close photo');
const image=document.createElement('img');image.alt='';
const prev=document.createElement('button');
prev.type='button';prev.className='public-gallery-prev';prev.textContent='←';prev.setAttribute('aria-label','Previous photo');
const next=document.createElement('button');
next.type='button';next.className='public-gallery-next';next.textContent='→';next.setAttribute('aria-label','Next photo');
const counter=document.createElement('span');counter.className='public-gallery-counter';
dialog.append(close,prev,image,next,counter);
document.body.append(dialog);
function showCurrent(){
 if(!photos.length)return;
 const p=photos[selected];
 image.src=p.url;
 image.alt=p.alt||'Kissed by Evie photo';
 counter.textContent=String(selected+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0');
}
function openPhoto(id,trigger){
 const idx=photos.findIndex(p=>String(p.id)===String(id));
 if(idx<0)return;
 selected=idx;lastFocus=trigger||document.activeElement;showCurrent();
 if(!dialog.open)dialog.showModal();
}
function shift(n){
 if(!photos.length)return;
 selected=(selected+n+photos.length)%photos.length;showCurrent();
}
close.addEventListener('click',()=>dialog.close());
prev.addEventListener('click',()=>shift(-1));
next.addEventListener('click',()=>shift(1));
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
dialog.addEventListener('close',()=>{if(lastFocus&&lastFocus.isConnected)lastFocus.focus()});
dialog.addEventListener('keydown',e=>{
 if(e.key==='ArrowLeft'){e.preventDefault();shift(-1)}
 if(e.key==='ArrowRight'){e.preventDefault();shift(1)}
});
function makePhotoCard(p){
 const button=document.createElement('button');
 button.className='photo-card image-button evie-uploaded-photo';
 button.type='button';button.dataset.publicPhotoId=p.id;
 button.setAttribute('aria-label','Open '+(p.alt||'a photo of Evie'));
 const img=document.createElement('img');
 img.src=p.url;img.alt=p.alt||'Kissed by Evie photo';img.loading='lazy';img.decoding='async';
 const caption=document.createElement('span');caption.textContent='OPEN PHOTO';
 button.append(img,caption);
 button.addEventListener('click',()=>openPhoto(p.id,button));
 return button;
}
function bindExisting(button,p){
 const img=button.querySelector('img');if(!img)return;
 img.src=p.url;img.alt=p.alt||'Kissed by Evie photo';
 button.__evieDynamicPhoto=p;
 if(button.__evieDynamicBound)return;
 button.__evieDynamicBound=true;
 button.addEventListener('click',event=>{
  if(event.target.closest('a,button'))return;
  event.preventDefault();event.stopImmediatePropagation();
  openPhoto(button.__evieDynamicPhoto.id,button);
 },true);
}
function makeMenuPreview(p){
 const button=document.createElement('button');button.type='button';
 button.setAttribute('aria-label','Open '+(p.alt||'menu preview'));
 const img=document.createElement('img');img.src=p.url;img.alt=p.alt||'Menu preview';img.loading='lazy';img.decoding='async';
 button.append(img);
 button.addEventListener('click',()=>openPhoto(p.id,button));
 return button;
}
async function refresh(){
 const response=await client.from('evie_public_photos')
 .select('id,storage_path,alt_text,placement,created_at')
 .eq('published',true).order('created_at',{ascending:false}).limit(120);
 if(response.error||!response.data)return;
 photos=response.data.map(p=>({...p,url:client.storage.from(bucket).getPublicUrl(p.storage_path).data.publicUrl,alt:p.alt_text||''}));
 // Keep the original homepage photography unless an image is specifically assigned there.
 const heroes=photos.filter(p=>p.placement==='hero'||p.placement==='featured').slice(0,4);
 if(heroes.length){
  document.querySelectorAll('.hero-slide').forEach((slide,i)=>{
   if(heroes[i])bindExisting(slide,heroes[i]);
  });
 }
 const about=photos.find(p=>p.placement==='about');
 const editorial=document.querySelector('.editorial-image');
 if(about&&editorial)bindExisting(editorial,about);
 // Add uploads before the original gallery cards without deleting the existing collection.
 const rail=document.getElementById('galleryRail');
 if(rail){
  rail.querySelectorAll('[data-public-photo-id]').forEach(node=>node.remove());
  const chosen=photos.filter(p=>p.placement==='gallery'||p.placement==='featured')
   .sort((a,b)=>Number(b.placement==='featured')-Number(a.placement==='featured'));
  const fragment=document.createDocumentFragment();
  chosen.forEach(p=>fragment.append(makePhotoCard(p)));
  rail.prepend(fragment);
 }
 const catalog=document.getElementById('boutiqueCatalog');
 if(catalog){
  const existing=document.getElementById('menuPhotoPreview');if(existing)existing.remove();
  const menu=photos.filter(p=>p.placement==='menu').slice(0,6);
  if(menu.length){
   const row=document.createElement('div');row.id='menuPhotoPreview';row.className='menu-photo-preview';
   menu.forEach(p=>row.append(makeMenuPreview(p)));
   catalog.prepend(row);
  }
 }
}
refresh().catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{})});
})();
