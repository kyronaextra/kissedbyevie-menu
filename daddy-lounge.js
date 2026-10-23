(function(){
'use strict';
// Presentation only: the private gallery and its Storage access both enforce RLS.
const $=id=>document.getElementById(id),dlg=$('daddyLoungeDialog');
if(!dlg)return;
let state=null,client=null,generation=0;
const notice=$('dlInlineNotice');
const date=value=>{
  if(!value)return 'Not set';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'Not set':
    new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d);
};
const set=(id,value)=>{$(id).textContent=String(value??'')};
function setNotice(message){
  notice.textContent=message||'';notice.hidden=!message;
  if(message)notice.focus({preventScroll:true});
}
function placeholders(eligible){
  set('dlVaultSummary',eligible?'Browse your personal private collection':'Unlocks with approved Daddy access');
  set('dlFavoritesSummary',eligible?'Your favorite moments, all together':'Available with Daddy access');
  set('dlLatestSummary',eligible?'Explore the latest additions':'New drops unlock with your membership');
}
function update(data,nextClient){
  generation++;
  state=data&&typeof data==='object'?data:null;
  client=nextClient||null;
  setNotice('');
  if(!state){
    set('dlWelcomeUsername','@member');set('dlMembershipUser','@member');
    set('dlStatusShort','Sign in to continue');set('dlStatusDetail','');
    set('dlAccessStatus','Signed out');set('dlPlan','No active plan');
    set('dlExpiration','Not set');set('dlAccessSeal','PRIVATE ACCESS');
    placeholders(false);return;
  }
  const name='@'+String(state.username||'member').replace(/^@/,'');
  set('dlWelcomeUsername',name);set('dlMembershipUser',name);
  set('dlStatusShort',state.status||'Pending review');
  set('dlStatusDetail',state.description||'Private access requires approval.');
  set('dlAccessStatus',state.canAccess?'Verified & active':state.status||'Pending');
  set('dlAccessSeal',state.canAccess?'DADDY ACCESS':'ACCESS PENDING');
  set('dlPlan',state.tier==='daddy'?'Daddy Member':state.tier==='vault'?'Vault Member':'Not active');
  set('dlExpiration',state.canAccess?date(state.expiresAt):'—');
  set('dlMembershipFootnote',state.canAccess?
    'Your private media is protected by your active membership and verified adult access.':
    'Membership, payment, and adult verification are reviewed separately.');
  placeholders(Boolean(state.canAccess));
  if(state.canAccess&&client&&state.userId)refreshStats();
}
async function refreshStats(){
  const snapshot=state,db=client;
  if(!snapshot?.canAccess||!snapshot.userId||!db)return;
  const turn=++generation;
  try{
    const [media,favs,latest]=await Promise.all([
      db.from('evie_daddy_media').select('id',{count:'exact',head:true}).eq('published',true),
      db.from('evie_daddy_favorites').select('media_id',{count:'exact',head:true}).eq('user_id',snapshot.userId),
      db.from('evie_daddy_media').select('kind,sort_at').eq('published',true).order('sort_at',{ascending:false}).limit(1)
    ]);
    if(turn!==generation||state?.userId!==snapshot.userId||!state?.canAccess)return;
    if(media.error||favs.error||latest.error)throw Error('Private counts unavailable');
    const total=media.count||0,liked=favs.count||0;
    set('dlVaultSummary',total?total+' private '+(total===1?'item':'items')+' to explore':'Waiting for the first gallery upload');
    set('dlFavoritesSummary',liked?liked+' saved '+(liked===1?'favorite':'favorites'):'Save your favorite photos and videos here');
    if(latest.data?.length){
      const item=latest.data[0];
      set('dlLatestSummary','Latest '+(item.kind==='video'?'video':'photo')+' · '+date(item.sort_at));
    }else{set('dlLatestSummary','New uploads will appear here once added');}
  }catch{
    if(turn!==generation)return;
    set('dlVaultSummary','Open your private collection');
    set('dlFavoritesSummary','Explore your saved collection');
    set('dlLatestSummary','See what was added recently');
  }
}
function open(){
  if(!state?.userId)return false;
  if(!dlg.open)dlg.showModal();
  setNotice('');
  if(state.canAccess)refreshStats();
  return true;
}
function close(){if(dlg.open)dlg.close()}
function clear(){generation++;state=null;client=null;close();update(null,null)}
function gallery(mode){
  if(!state?.canAccess){
    setNotice('The private gallery unlocks after your Daddy membership and adult verification are approved. Check your status below or contact Evie.');
    return;
  }
  if(!window.EvieDaddyGallery?.open?.(mode)){
    setNotice('The private gallery could not be opened. Please try again.');
  }else{setNotice('')}
}
dlg.addEventListener('click',event=>{
  const target=event.target.closest('button[data-dl-action]');
  if(!target)return;
  const action=target.dataset.dlAction;
  if(action==='vault')gallery('all');
  else if(action==='favorites')gallery('favorites');
  else if(action==='latest')gallery('latest');
  else if(action==='membership')$('dlMembershipSection').scrollIntoView({behavior:'smooth',block:'start'});
  else if(action==='home')$('dlHome').scrollIntoView({behavior:'smooth',block:'start'});
});
$('dlBackPublic').addEventListener('click',close);
$('dlClose').addEventListener('click',close);
window.EvieDaddyLounge={open,close,clear,update,refreshStats,setNotice};
})();
