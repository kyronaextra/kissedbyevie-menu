(function(){
'use strict';
const grid=document.getElementById('curatedPhotoGrid');
const status=document.getElementById('galleryStatus');
const dialog=document.getElementById('photoViewer');
const viewImage=document.getElementById('viewerImage');
const count=document.getElementById('viewerCount');
const photos=[];
let active=0,lastFocus=null;
const config=window.EVIE_SUPABASE_URL&&window.EVIE_SUPABASE_PUBLISHABLE_KEY;
function updateViewer(){const photo=photos[active];if(!photo)return;viewImage.src=photo.url;viewImage.alt=photo.alt;count.textContent=String(active+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0')}
function openPhoto(index,button){active=index;lastFocus=button;updateViewer();dialog.showModal()}
function movePhoto(delta){active=(active+delta+photos.length)%photos.length;updateViewer()}
document.getElementById('viewerClose').addEventListener('click',()=>dialog.close());
document.getElementById('viewerPrev').addEventListener('click',()=>movePhoto(-1));
document.getElementById('viewerNext').addEventListener('click',()=>movePhoto(1));
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
dialog.addEventListener('close',()=>{if(lastFocus&&lastFocus.isConnected)lastFocus.focus()});
dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();movePhoto(-1)}if(event.key==='ArrowRight'){event.preventDefault();movePhoto(1)}});
function showError(message){status.textContent=message;status.classList.add('is-error')}
async function load(){
 if(!window.supabase||!config){showError('The collection is having a little moment. Please try again soon.');return}
 const client=window.supabase.createClient(window.EVIE_SUPABASE_URL,window.EVIE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const result=await client.from('evie_public_photos').select('id,storage_path,alt_text,placement,created_at').eq('published',true).in('placement',['gallery','featured']).order('created_at',{ascending:false}).limit(120);
 if(result.error||!result.data){showError('The collection is having a little moment. Please try again soon.');return}
 const bucket=client.storage.from('evie-public-gallery');
 result.data.forEach(item=>photos.push({url:bucket.getPublicUrl(item.storage_path).data.publicUrl,alt:item.alt_text||'Kissed by Evie photo'}));
 if(!photos.length){showError('I’m adding to this collection. Come back soon.');return}
 const fragment=document.createDocumentFragment();
 photos.forEach((photo,index)=>{const button=document.createElement('button');button.type='button';button.className='photo-card';button.setAttribute('aria-label','Open photo '+(index+1));const image=document.createElement('img');image.src=photo.url;image.alt=photo.alt;image.loading='lazy';image.decoding='async';button.append(image);button.addEventListener('click',()=>openPhoto(index,button));fragment.append(button)});
 grid.replaceChildren(fragment);
}
load().catch(()=>showError('The collection is having a little moment. Please try again soon.'));
})();