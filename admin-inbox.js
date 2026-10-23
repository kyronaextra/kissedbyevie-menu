(function(){
'use strict';
// Evie Inbox displays trusted-worker thread summaries and explicitly labeled
// manual reminders. No site code reads private social accounts or sends replies.
const $=id=>document.getElementById(id);
const clientState={request:null,sb:null,timer:null,channel:null,refreshing:false,
 online:false,initialLoaded:false,alerts:false,items:[],stopped:true,session:0};
const defaultTitle=document.title;
const statuses={
 needs_reply:'Needs reply',waiting:'Replied elsewhere / waiting',handled:'Handled'
};
const nowText=()=>new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
const ago=(value,manual=false)=>{
 if(!value)return manual?'Manual reminder':'Not dated';
 const ms=Math.max(0,Date.now()-new Date(value).getTime());
 if(!Number.isFinite(ms))return 'Unknown time';
 const min=Math.floor(ms/60000);
 const since=min<1?'Just now':min<60?min+'m ago':min<1440?Math.floor(min/60)+'h ago':Math.floor(min/1440)+'d ago';
 return manual?'Added '+since:since;
};
const node=(tag,cls,value)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(value!==undefined)element.textContent=String(value);
 return element;
};
function busy(form,yes){
 const button=form.querySelector('[type="submit"]');
 if(button)button.disabled=yes;
}
function setError(message){
 $('inboxError').textContent=message||'';
 $('inboxError').hidden=!message;
}
function notify(text){
 if(clientState.alerts&&typeof Notification!=='undefined'&&Notification.permission==='granted'){
  try{new Notification('Evie Admin · new message',{body:text,tag:'evie-admin-message',silent:true})}
  catch(_){}
 }
}
function getPlatformUrl(row){
 if(row.platform==='telegram'){
  const name=String(row.contact_handle||'').replace(/^@/,'');
  if(/^[a-zA-Z0-9_]{5,32}$/.test(name))return 'https://t.me/'+encodeURIComponent(name);
  return 'https://web.telegram.org/';
 }
 if(row.platform==='x')return 'https://x.com/messages';
 return 'https://web.snapchat.com/';
}
function filterRows(){
 const state=$('inboxStateFilter').value,platform=$('inboxPlatformFilter').value;
 const query=$('inboxSearch').value.trim().toLowerCase();
 const ranks={high:0,normal:1,low:2};
 return clientState.items
 .filter(row=>(state==='all'||row.reply_state===state) &&
     (platform==='all'||row.platform===platform) &&
     (!query||[row.contact_name,row.contact_handle,row.note,row.last_preview].some(x=>String(x||'').toLowerCase().includes(query))))
 .sort((a,b)=>{
  if(state==='all'){
   const needs=(row)=>row.reply_state==='needs_reply'?0:row.reply_state==='waiting'?1:2;
   if(needs(a)!==needs(b))return needs(a)-needs(b);
  }
  if(a.priority!==b.priority)return ranks[a.priority]-ranks[b.priority];
  if(a.reply_state==='needs_reply'&&b.reply_state==='needs_reply'){
   // Oldest unanswered message first within a priority band.
   return new Date(a.last_message_at)-new Date(b.last_message_at);
  }
  return new Date(b.last_message_at)-new Date(a.last_message_at);
 });
}
function statusTag(row){
 const parts=[];
 parts.push(row.platform==='x'?'X':row.platform==='snapchat'?'Snapchat':'Telegram');
 parts.push(row.origin==='manual'?'Manual reminder':'Worker event');
 if(row.priority==='high')parts.push('High priority');
 return parts.join(' · ');
}
function createAction(label,doIt,cls=''){
 const btn=node('button',cls,label);btn.type='button';
 btn.addEventListener('click',doIt);
 return btn;
}
async function changeRow(row,change,extra){
 setError('');
 try{
  await clientState.request('inbox_update',{id:row.id,change,...(extra||{})});
  await refresh(true);
 }catch(error){setError(error?.message||'Could not update conversation')}
}
function render(){
 const filtered=filterRows(),host=$('inboxQueue');
 host.replaceChildren();
 $('inboxQueueLabel').textContent=filtered.length+' CONTACT'+(filtered.length===1?'':'S');
 if(!filtered.length){
  const empty=node('div','inbox-empty');
  empty.append(node('h3','',clientState.items.length?'Nothing matching this filter.':'No conversations connected yet.'));
  empty.append(node('p','',clientState.items.length?
   'Try another status or platform, or add a manual follow-up.':
   'Incoming messages will appear once an authorized platform worker is connected. Meanwhile, add Snapchat or other conversations as manual reminders.'));
  host.append(empty);return;
 }
 filtered.forEach(row=>{
  const article=node('article','inbox-thread '+row.reply_state+' '+row.priority),
    head=node('div','inbox-thread-header'),contact=node('div','inbox-contact'),
    meta=node('div','inbox-meta'),tools=node('div','inbox-thread-actions');
  contact.append(node('strong','',row.contact_name));
  const name=String(row.contact_handle||'').trim();
  if(name)meta.append(node('span','',name.startsWith('@')?name:'@'+name));
  meta.append(node('span',row.origin==='manual'?'source-manual':'source-worker',statusTag(row)));
  const status=node('span','inbox-state-badge'+(row.priority==='high'?' urgent':''),statuses[row.reply_state]||'Needs reply');
  meta.append(status);
  if(row.unread_count>0)meta.append(node('span','inbox-unread-dot',row.unread_count+' new'));
  contact.append(meta);
  const date=node('time','inbox-when',ago(row.last_message_at,row.origin==='manual'));
  if(row.last_message_at)date.dateTime=row.last_message_at;
  head.append(contact,date);article.append(head);
  const preview=node('p','inbox-thread-preview',row.last_preview||'No message preview supplied.');
  article.append(preview);
  if(row.note)article.append(node('p','inbox-thread-note','Note: '+row.note));
  if(row.reply_state==='needs_reply'){
   tools.append(createAction('Marked replied elsewhere',()=>changeRow(row,'waiting'),'inbox-action-primary'));
   tools.append(createAction('Handled',()=>changeRow(row,'handled')));
  }else if(row.reply_state==='waiting'){
   tools.append(createAction('Needs reply again',()=>changeRow(row,'needs_reply'),'inbox-action-primary'));
   tools.append(createAction('Handled',()=>changeRow(row,'handled')));
  }else{
   tools.append(createAction('Reopen follow-up',()=>changeRow(row,'needs_reply'),'inbox-action-primary'));
  }
  tools.append(createAction(row.priority==='high'?'Normal priority':'★ High priority',
    ()=>changeRow(row,row.priority==='high'?'normal':'high')));
  if(row.unread_count>0)tools.append(createAction('Mark reviewed',()=>changeRow(row,'mark_seen')));
  tools.append(createAction('Internal note',()=>{
   const note=prompt('Private reminder about '+row.contact_name+' (do not enter passwords or private tokens)',row.note||'');
   if(note!==null)changeRow(row,'save_note',{note});
  }));
  const link=node('a','','Open '+(row.platform==='x'?'X':row.platform==='snapchat'?'Snapchat':'Telegram')+' ↗');
  link.href=getPlatformUrl(row);link.target='_blank';link.rel='noopener noreferrer';
  link.title='Opens the platform; does not guarantee opening the exact chat';
  tools.append(link);article.append(tools);
  host.append(article);
 });
}
function updateCounters(payload){
 const st=payload.stats||{};
 $('inboxNeedCount').textContent=st.waiting_for_me??0;
 $('inboxUrgentCount').textContent=st.urgent??0;
 $('inboxUnreadCount').textContent=st.unread??0;
 $('inboxNavBadge').textContent=st.waiting_for_me??0;
 $('inboxNavBadge').hidden=!st.waiting_for_me;
 $('inboxLastCheck').textContent=nowText();
 $('inboxSyncNote').textContent='Live signals + 20-second backup refresh';
 document.title=st.waiting_for_me? '('+st.waiting_for_me+') Evie Admin · messages':defaultTitle;
}
async function refresh(silent=false){
 if(clientState.stopped||clientState.refreshing||!clientState.request)return;
 clientState.refreshing=true;
 if(!silent)setError('');
 const turn=clientState.session;
 try{
  const payload=await clientState.request('inbox');
  if(clientState.stopped||turn!==clientState.session)return;
  const before=new Map(clientState.items.map(row=>[row.id,{time:row.last_message_at,unread:row.unread_count}]));
  const list=Array.isArray(payload.threads)?payload.threads:[];
  clientState.items=list;
  updateCounters(payload);
  render();
  $('inboxTelegramStatus').textContent='Authorized worker needed to deliver updates';
  $('inboxXStatus').textContent='Connect approved X DM API integration';
  $('inboxSnapStatus').textContent='Manual reminders available';
  if(clientState.initialLoaded&&document.visibilityState==='visible'){
   const incoming=list.filter(row=>{
    const old=before.get(row.id);
    return row.origin==='worker'&&row.last_direction==='inbound'&&row.unread_count>0 &&
      (!old||new Date(row.last_message_at)>new Date(old.time));
   });
   if(incoming.length){
    const first=incoming[0];
    notify('New '+(first.platform==='x'?'X':first.platform==='snapchat'?'Snapchat':'Telegram')+
      ' message from '+first.contact_name);
   }
  }
  clientState.initialLoaded=true;
 }catch(error){
  if(!clientState.stopped&&turn===clientState.session){
   setError(error?.message||'Could not refresh follow-ups');
   $('inboxRealtimeStatus').textContent='Connection unavailable';
  }
 }finally{clientState.refreshing=false}
}
async function subscribe(){
 try{
  const {data,error}=await clientState.sb.auth.getSession();
  if(error||!data?.session?.access_token)return;
  await clientState.sb.realtime.setAuth(data.session.access_token);
  if(clientState.stopped)return;
  const channel=clientState.sb.channel('evie-admin-inbox',{config:{private:true}});
  channel.on('broadcast',{event:'inbox_changed'},()=>refresh(true));
  channel.subscribe(status=>{
   if(clientState.stopped)return;
   clientState.online=status==='SUBSCRIBED';
   $('inboxRealtimeStatus').textContent=clientState.online?'Live signals on':'Checking every 20 seconds';
  });
  clientState.channel=channel;
 }catch(_){
  $('inboxRealtimeStatus').textContent='Checking every 20 seconds';
 }
}
function start({request,client}){
 stop();
 clientState.session++;
 clientState.stopped=false;
 clientState.request=request;clientState.sb=client;
 clientState.initialLoaded=false;
 clientState.items=[];
 clientState.online=false;
 $('inboxRealtimeStatus').textContent='Connecting live feed…';
 refresh(true);subscribe();
 clientState.timer=setInterval(()=>{
  if(document.visibilityState==='visible')refresh(true);
 },20000);
}
function stop(){
 clientState.stopped=true;
 clientState.session++;
 if(clientState.timer){clearInterval(clientState.timer);clientState.timer=null}
 if(clientState.channel&&clientState.sb)clientState.sb.removeChannel(clientState.channel);
 clientState.channel=null;
 clientState.request=null;clientState.sb=null;
 clientState.online=false;
 clientState.items=[];clientState.initialLoaded=false;
 document.title=defaultTitle;
 $('inboxNavBadge').hidden=true;
}
$('inboxStateFilter').addEventListener('change',render);
$('inboxPlatformFilter').addEventListener('change',render);
$('inboxSearch').addEventListener('input',render);
$('inboxRefresh').addEventListener('click',()=>refresh(false));
$('inboxNotify').addEventListener('click',async()=>{
 if(typeof Notification==='undefined'){
  setError('This browser does not support desktop notifications. The dashboard will still update.');return;
 }
 if(!window.isSecureContext){setError('Browser notifications require an HTTPS page.');return}
 try{
  const permission=await Notification.requestPermission();
  clientState.alerts=permission==='granted';
  $('inboxNotify').textContent=clientState.alerts?'Alerts enabled ✓':'Enable alerts';
  if(!clientState.alerts)setError('Notification permission was not granted; on-screen updates still work.');
 }catch(_){setError('Could not enable notifications. The dashboard will still update.')}
});
$('inboxManualForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.currentTarget;
 if(!form.reportValidity())return;
 busy(form,true);setError('');
 try{
  await clientState.request('inbox_add_manual',{
   platform:$('inboxManualPlatform').value,name:$('inboxManualName').value.trim(),
   handle:$('inboxManualHandle').value.trim(),
   summary:$('inboxManualSummary').value.trim(),
   priority:$('inboxManualPriority').value
  });
  form.reset();
  $('inboxStateFilter').value='needs_reply';
  await refresh(true);
 }catch(error){setError(error?.message||'Could not add a manual reminder')}
 finally{busy(form,false)}
});
document.addEventListener('visibilitychange',()=>{
 if(!clientState.stopped&&document.visibilityState==='visible')refresh(true);
});
window.EvieAdminInbox={start,stop,refresh};
})();
