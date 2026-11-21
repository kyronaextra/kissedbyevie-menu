(function(){
'use strict';
const sdk=window.supabase, url=window.EVIE_SUPABASE_URL, key=window.EVIE_SUPABASE_PUBLISHABLE_KEY;
if(!sdk||!url||!key)return;
const client=sdk.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'evie-reviews-public'}});
const list=document.getElementById('reviewsList');
const form=document.getElementById('reviewForm');
const statusEl=document.getElementById('reviewStatus');
if(!list&&!form)return;

function status(msg,err){if(statusEl){statusEl.textContent=msg||'';statusEl.dataset.error=err?'1':'0'}}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function handleUrl(platform, handle){
  if(platform==='x')return 'https://x.com/'+encodeURIComponent(handle);
  if(platform==='telegram')return 'https://t.me/'+encodeURIComponent(handle);
  return '';
}

async function loadReviews(){
  if(!list)return;
  const {data,error}=await client.from('evie_reviews')
    .select('id,body,display_handle,platform,created_at')
    .eq('status','approved')
    .order('created_at',{ascending:false})
    .limit(12);
  if(error){list.innerHTML='<p class="reviews-empty">Reviews will show up here once Evie approves a few.</p>';return}
  const rows=data||[];
  if(!rows.length){list.innerHTML='<p class="reviews-empty">No public notes yet. Yours can be the first — Evie reads every one.</p>';return}
  list.innerHTML=rows.map(row=>{
    const handle=row.display_handle&&row.platform?esc(row.display_handle):'';
    const href=handle?handleUrl(row.platform,row.display_handle):'';
    const label=handle?(row.platform==='telegram'?'Telegram':'X'):'';
    const who=href
      ? '<a class="review-handle" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">@'+handle+' <span>'+label+'</span></a>'
      : '<span class="review-anon">A buyer</span>';
    return '<article class="review-card"><p class="review-body">'+esc(row.body)+'</p><p class="review-by">'+who+'</p></article>';
  }).join('');
}

if(form){
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const body=(document.getElementById('reviewBody')||{}).value||'';
    const handle=(document.getElementById('reviewHandle')||{}).value||'';
    const platform=(document.getElementById('reviewPlatform')||{}).value||'';
    const website=(document.getElementById('reviewWebsite')||{}).value||'';
    status('Sending…');
    try{
      const res=await fetch(url+'/functions/v1/evie-reviews',{
        method:'POST',
        headers:{'content-type':'application/json',apikey:key},
        body:JSON.stringify({body:body.trim(),handle:handle.trim(),platform,website})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data.ok!==true){
        status(data.error||'Could not send that.',true);
        return;
      }
      form.reset();
      status('Got it. It only shows on the site after Evie approves it.');
    }catch(err){status('Could not send that.',true)}
  });
}

loadReviews().catch(()=>{});
})();
