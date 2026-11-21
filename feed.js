(function(){
'use strict';
const sdk=window.supabase, url=window.EVIE_SUPABASE_URL, key=window.EVIE_SUPABASE_PUBLISHABLE_KEY;
if(!sdk||!url||!key)return;
const client=sdk.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'evie-admin-feed'}});
const FN=url+'/functions/v1/evie-feed';
const bucket='evie-public-gallery';
const list=document.getElementById('feedList');
const composer=document.getElementById('feedComposer');
const signin=document.getElementById('feedSignin');
const statusEl=document.getElementById('feedStatus');
if(!list)return;

function status(msg,err){if(statusEl){statusEl.textContent=msg||'';statusEl.dataset.error=err?'1':'0'}}
function publicUrl(path){
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
function fmtWhen(iso){
  if(!iso)return '';
  try{
    return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(iso))+' PT';
  }catch(e){return iso}
}

async function isAdmin(){
  const {data}=await client.auth.getSession();
  const token=data?.session?.access_token;
  if(!token)return null;
  const res=await fetch(url+'/functions/v1/evie-admin-api?action=session',{
    headers:{apikey:key,Authorization:'Bearer '+token}
  });
  if(!res.ok)return null;
  const body=await res.json().catch(()=>null);
  if(!body||body.admin!==true)return null;
  return token;
}

async function loadPosts(){
  const {data:posts,error}=await client.from('evie_feed_posts')
    .select('id,body,link_url,link_kind,pinned,published,created_at')
    .eq('published',true)
    .order('pinned',{ascending:false})
    .order('created_at',{ascending:false})
    .limit(80);
  if(error){list.innerHTML='<p class="feed-empty">The feed is not available yet.</p>';return []}
  if(!posts||!posts.length){list.innerHTML='<p class="feed-empty">Nothing posted yet. Evie can write the first one from this page or with /post in Telegram.</p>';return []}
  const ids=posts.map(p=>p.id);
  const {data:photos}=await client.from('evie_public_photos')
    .select('id,storage_path,alt_text,post_id,created_at')
    .in('post_id',ids)
    .eq('published',true)
    .order('created_at',{ascending:true});
  const byPost={};
  (photos||[]).forEach(ph=>{
    (byPost[ph.post_id]||(byPost[ph.post_id]=[])).push(ph);
  });
  return posts.map(p=>({...p,photos:byPost[p.id]||[]}));
}

function render(posts, adminToken){
  list.replaceChildren();
  posts.forEach(post=>{
    const art=document.createElement('article');
    art.className='feed-post'+(post.pinned?' is-pinned':'');
    art.dataset.id=post.id;
    if(post.pinned){
      const flag=document.createElement('p');flag.className='pin-flag';flag.textContent='Pinned';
      art.append(flag);
    }
    if(post.body){
      const body=document.createElement('p');body.className='body';body.textContent=post.body;
      art.append(body);
    }
    if(post.photos.length){
      const grid=document.createElement('div');
      grid.className='feed-photos'+(post.photos.length===1?' one':'');
      post.photos.forEach(ph=>{
        const img=document.createElement('img');
        img.src=publicUrl(ph.storage_path);
        img.alt=ph.alt_text||'Photo from Evie';
        img.loading='lazy';
        grid.append(img);
      });
      art.append(grid);
    }
    if(post.link_url){
      const a=document.createElement('a');
      a.className='feed-link';
      a.href=post.link_url;
      a.target='_blank';a.rel='noopener noreferrer';
      const kinds={show:'Open the show',custom:'See this custom',sale:'Shop this',url:'Open link'};
      const href=(post.link_url||'').toLowerCase();
      const marks=[
        ['stripchat.com','/assets/brand/stripchat-mark.webp'],
        ['onlyfans.com','/assets/brand/onlyfans-mark.webp'],
        ['t.me/','/assets/brand/telegram-mark.webp'],
        ['telegram.me/','/assets/brand/telegram-mark.webp'],
        ['x.com/','/assets/brand/x-mark.webp'],
        ['twitter.com/','/assets/brand/x-mark.webp']
      ];
      for(let i=0;i<marks.length;i++){
        if(href.indexOf(marks[i][0])!==-1){
          const ic=document.createElement('img');
          ic.className='social-mark';
          ic.src=marks[i][1];
          ic.width=20;ic.height=20;ic.alt='';
          a.append(ic);
          break;
        }
      }
      a.append(document.createTextNode(kinds[post.link_kind]||'Open link'));
      art.append(a);
    }
    const meta=document.createElement('p');meta.className='meta';
    meta.textContent=fmtWhen(post.created_at)+' · '+String(post.id).slice(0,8);
    art.append(meta);
    if(adminToken){
      const row=document.createElement('div');row.className='feed-admin-row';
      const del=document.createElement('button');del.type='button';del.className='quiet';del.textContent='Delete post';
      const also=document.createElement('label');
      const box=document.createElement('input');box.type='checkbox';
      also.append(box,document.createTextNode(' Also remove photos from the gallery'));
      del.addEventListener('click',async()=>{
        if(!confirm('Delete this post?'))return;
        await feedCall(adminToken,'DELETE',{id:post.id,remove_from_gallery:box.checked});
        await refresh(adminToken);
      });
      row.append(del,also);art.append(row);
    }
    list.append(art);
  });
}

async function feedCall(token, method, payload, files){
  const headers={apikey:key,Authorization:'Bearer '+token};
  let res;
  if(files&&files.length){
    const body=new FormData();
    body.append('payload',JSON.stringify(payload||{}));
    files.forEach(f=>body.append('photos',f,f.name));
    res=await fetch(FN,{method:method||'POST',headers,body});
  }else{
    headers['Content-Type']='application/json';
    res=await fetch(FN,{method:method||'POST',headers,body:JSON.stringify(payload||{})});
  }
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.ok===false)throw new Error(data.error||('Request failed ('+res.status+')'));
  return data;
}

async function refresh(token){
  const posts=await loadPosts();
  if(posts&&posts.length)render(posts,token);
}

async function boot(){
  const token=await isAdmin();
  var wantDesk=/(?:[?&]desk=1$|[?&]desk=1&|#desk$)/.test(location.search+location.hash);
  if(signin){ if(token) signin.hidden=true; else if(wantDesk) signin.hidden=false; }
  if(composer)composer.hidden=!token;
  await refresh(token);
  bindComposer();
}

function bindComposer(){
  if(!composer||composer.dataset.bound)return;
  composer.dataset.bound='1';
  composer.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const token=await isAdmin();
    if(!token){status('Sign in as Evie first.',true);return}
    const body=(document.getElementById('feedBody')||{}).value||'';
    const link=(document.getElementById('feedLink')||{}).value||'';
    const kind=(document.getElementById('feedLinkKind')||{}).value||'';
    const pinned=!!(document.getElementById('feedPinned')||{}).checked;
    const gallery=!(document.getElementById('feedSkipGallery')||{}).checked;
    const files=Array.from((document.getElementById('feedPhotos')||{files:[]}).files||[]);
    status('Posting…');
    try{
      await feedCall(token,'POST',{
        body:body.trim(),
        link_url:link.trim(),
        link_kind:kind||null,
        pinned,
        in_gallery:gallery
      },files);
      composer.reset();
      status('Posted.');
      await refresh(token);
    }catch(err){status(err.message||'Could not post.',true)}
  });
}

const login=document.getElementById('feedLogin');
if(login){
  login.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const email=document.getElementById('feedEmail').value.trim().toLowerCase();
    const password=document.getElementById('feedPassword').value;
    status('Checking…');
    const {error}=await client.auth.signInWithPassword({email,password});
    document.getElementById('feedPassword').value='';
    if(error){status(error.message||'Could not sign in.',true);return}
    const token=await isAdmin();
    if(!token){status('This account is not an administrator.',true);await client.auth.signOut();return}
    status('Signed in.');
    if(signin)signin.hidden=true;
    if(composer)composer.hidden=false;
    bindComposer();
    await refresh(token);
  });
}
const signOutBtn=document.getElementById('feedSignOut');
if(signOutBtn){
  signOutBtn.addEventListener('click',async()=>{
    await client.auth.signOut();
    location.reload();
  });
}

boot().catch(()=>{});
})();
