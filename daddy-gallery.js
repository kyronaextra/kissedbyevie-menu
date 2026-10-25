(function(){
'use strict';
// All media URLs are short-lived Supabase private-bucket signed URLs.
// Database and storage RLS independently require an active, age-verified Daddy membership.
const $=id=>document.getElementById(id);
const gallery=$('evieGalleryDialog'),viewer=$('evieMediaDialog'),grid=$('evieGalleryGrid');
const status=$('evieGalleryStatus'),more=$('evieGalleryMore');
const filters=Array.from(document.querySelectorAll('[data-evie-filter]'));
const PAGE=36,BUCKET='evie-daddy-vault';
let client=null,user=null,filter='all',offset=0,loading=false,exhausted=false;
let favorites=new Set(),cards=[],generation=0,opened=null,lastDay='';
const safeDate=value=>{
  const dt=new Date(value);
  return !Number.isNaN(dt.getTime())?dt:null;
};
const formatDate=value=>{
  const date=safeDate(value);
  return date?new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(date):'Undated';
};
function emptyGrid(){grid.replaceChildren();lastDay='';cards=[]}
function updateCount(){$('evieFavoriteCount').textContent=String(favorites.size)}
function updateFilters(){
  filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.evieFilter===filter)));
}
function updateFavoriteControls(id){
  grid.querySelectorAll('[data-favorite-id]').forEach(button=>{
    if(button.dataset.favoriteId!==id)return;
    const active=favorites.has(id);
    button.textContent=active?'♥':'♡';
    button.setAttribute('aria-label',active?'Remove favorite':'Add to favorites');
    button.setAttribute('aria-pressed',String(active));
  });
  if(opened?.id===id){
    const active=favorites.has(id);
    $('evieMediaFavorite').textContent=active?'♥ Favorited':'♡ Favorite';
    $('evieMediaFavorite').setAttribute('aria-pressed',String(active));
  }
  updateCount();
}
async function toggleFavorite(id){
  if(!client||!user)return;
  const was=favorites.has(id);
  if(was)favorites.delete(id);else favorites.add(id);
  updateFavoriteControls(id);
  try{
    let response;
    if(was){
      response=await client.from('evie_daddy_favorites').delete().eq('user_id',user.id).eq('media_id',id);
    }else{
      response=await client.from('evie_daddy_favorites').insert({user_id:user.id,media_id:id});
    }
    if(response.error)throw response.error;
    if(filter==='favorites'&&gallery.open)refresh();
  }catch(error){
    if(was)favorites.add(id);else favorites.delete(id);
    updateFavoriteControls(id);
    status.textContent='Could not update your favorites. Your membership may have expired; please try again.';
  }
}
function cardElement(item,url){
  const card=document.createElement('article');
  card.className='evie-media-card';
  const openButton=document.createElement('button');
  openButton.className='evie-media-open';
  openButton.type='button';
  openButton.setAttribute('aria-label','View '+item.kind+': '+item.title);
  if(item.kind==='photo'&&url){
    const image=document.createElement('img');
    image.src=url;image.alt=item.title;image.loading='lazy';image.decoding='async';
    image.referrerPolicy='no-referrer';
    image.addEventListener('error',async ()=>{
      if(image.dataset.retried||!client){image.remove();openButton.textContent='Image preview unavailable';return}
      image.dataset.retried='1';
      try{
        const {data,error}=await client.storage.from(BUCKET).createSignedUrl(item.storage_path,600);
        if(error||!data?.signedUrl)throw error||new Error('No link');
        image.src=data.signedUrl;
      }catch{image.remove();openButton.textContent='Image preview unavailable'}
    });
    openButton.append(image);
  }else{
    const preview=document.createElement('div');
    preview.className='evie-video-preview';
    const icon=document.createElement('span');icon.textContent=item.kind==='video'?'▶':'✧';
    const label=document.createElement('small');label.textContent=item.kind==='video'?'Play video':'Open photo';
    preview.append(icon,label);openButton.append(preview);
  }
  openButton.addEventListener('click',()=>view(item));
  const details=document.createElement('div');details.className='evie-media-caption';
  const title=document.createElement('span');title.className='evie-media-filename';title.textContent=item.title;title.title=item.title;
  const fav=document.createElement('button');
  fav.type='button';fav.className='evie-favorite-button';
  fav.dataset.favoriteId=item.id;
  fav.addEventListener('click',()=>toggleFavorite(item.id));
  details.append(title,fav);card.append(openButton,details);
  updateCount();
  return card;
}
function addItems(items,urlByPath){
  for(const item of items){
    const day=formatDate(item.sort_at);
    if(day!==lastDay){
      const title=document.createElement('h3');
      title.className='evie-gallery-day';title.textContent=day;
      grid.append(title);lastDay=day;
    }
    const url=urlByPath.get(item.storage_path)||null;
    const card=cardElement(item,url);
    grid.append(card);cards.push(item);
    updateFavoriteControls(item.id);
  }
}
async function loadPage(){
  if(loading||exhausted||!client||!user)return;
  loading=true;const stamp=generation;
  more.disabled=true;status.textContent='Loading private gallery…';
  try{
    let query=client.from('evie_daddy_media')
      .select('id,title,kind,storage_path,sort_at,mime_type')
      .eq('published',true);
    if(filter==='photo'||filter==='video')query=query.eq('kind',filter);
    if(filter==='favorites'){
      if(!favorites.size){
        exhausted=true;
        status.textContent='No favorites yet. Tap ♡ on a photo or video to save it.';
        more.hidden=true;return;
      }
      query=query.in('id',Array.from(favorites));
    }
    const newest=$('evieGallerySort').value==='new';
    const {data,error}=await query.order('sort_at',{ascending:!newest})
      .order('id',{ascending:true}).range(offset,offset+PAGE-1);
    if(error)throw error;
    if(stamp!==generation)return;
    const items=data||[];
    const paths=items.filter(item=>item.kind==='photo').map(item=>item.storage_path);
    const urls=new Map();
    if(paths.length){
      const {data:signed,error:signError}=await client.storage.from(BUCKET).createSignedUrls(paths,1200);
      if(signError)throw signError;
      if(stamp!==generation)return;
      (signed||[]).forEach((entry,i)=>{
        if(entry.signedUrl)urls.set(entry.path||paths[i],entry.signedUrl);
      });
    }
    addItems(items,urls);
    offset+=items.length;exhausted=items.length<PAGE;
    more.hidden=exhausted;
    status.textContent=cards.length?(cards.length+' items loaded · '+favorites.size+' favorites'):
      'No photos or videos have been imported to the private gallery yet.';
  }catch(error){
    if(stamp===generation){
      status.textContent='Unable to load the gallery. Check your active Daddy membership or try again.';
      more.hidden=true;
    }
  }finally{if(stamp===generation){loading=false;more.disabled=false}}
}
function refresh(){
  generation++;loading=false;offset=0;exhausted=false;emptyGrid();more.hidden=true;updateFilters();
  loadPage();
}
async function view(item){
  if(!client||!user)return;
  opened=item;
  $('evieMediaTitle').textContent=item.title;
  $('evieMediaDate').textContent=formatDate(item.sort_at);
  $('evieMediaStage').replaceChildren();
  updateFavoriteControls(item.id);
  if(!viewer.open)viewer.showModal();
  const wait=document.createElement('p');wait.textContent='Opening private media…';
  $('evieMediaStage').append(wait);
  try{
    const {data,error}=await client.storage.from(BUCKET).createSignedUrl(item.storage_path,600);
    if(error||!data?.signedUrl)throw error||new Error('No secure link');
    if(opened?.id!==item.id||!viewer.open)return;
    const node=document.createElement(item.kind==='video'?'video':'img');
    node.src=data.signedUrl;
    if(item.kind==='video'){
      node.controls=true;node.playsInline=true;node.preload='metadata';
      node.setAttribute('controlsList','nodownload');
    }else{
      node.alt=item.title;node.referrerPolicy='no-referrer';
    }
    $('evieMediaStage').replaceChildren(node);
  }catch(error){
    if(opened?.id===item.id)wait.textContent='This media could not be opened. Please check your membership or try again.';
  }
}
function deactivate(){
  generation++;loading=false;client=null;user=null;opened=null;favorites.clear();emptyGrid();updateCount();
  if(viewer.open)viewer.close();
  if(gallery.open)gallery.close();
  status.textContent='';more.hidden=true;
}
async function activate(nextClient,nextUser){
  if(!nextClient||!nextUser)return;
  if(client===nextClient&&user?.id===nextUser.id)return;
  deactivate();client=nextClient;user=nextUser;
  const stamp=generation;
  try{
    const {data,error}=await client.from('evie_daddy_favorites').select('media_id').eq('user_id',user.id);
    if(error)throw error;
    if(stamp!==generation)return;
    favorites=new Set((data||[]).map(row=>row.media_id));updateCount();
  }catch(error){
    if(stamp===generation)status.textContent='Favorites could not be loaded right now.';
  }
}
function openGallery(requested='all'){
  if(!client||!user)return false;
  filter=requested==='favorites'?'favorites':'all';
  if(requested==='latest')$('evieGallerySort').value='new';
  if(!gallery.open)gallery.showModal();
  refresh();
  return true;
}
$('evieGalleryOpen').addEventListener('click',()=>openGallery('all'));
$('evieGalleryClose').addEventListener('click',()=>gallery.close());
gallery.addEventListener('click',event=>{if(event.target===gallery)gallery.close()});
gallery.addEventListener('close',()=>window.EvieDaddyLounge?.refreshStats?.());
filters.forEach(button=>button.addEventListener('click',()=>{
  filter=button.dataset.evieFilter;refresh();
}));
$('evieGallerySort').addEventListener('change',refresh);
more.addEventListener('click',loadPage);
$('evieMediaClose').addEventListener('click',()=>viewer.close());
viewer.addEventListener('close',()=>{
  opened=null;$('evieMediaStage').replaceChildren();
});
$('evieMediaFavorite').addEventListener('click',()=>{if(opened)toggleFavorite(opened.id)});
window.EvieDaddyGallery={activate,deactivate,open:openGallery};
})();
