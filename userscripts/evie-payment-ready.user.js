// ==UserScript==
// @name         Evie · Payment-Ready Lead Alerts
// @namespace    https://kissedbyevie-menu.onrender.com/
// @version      1.0.0
// @description  Show "username is payment ready!" when Evie Admin detects explicit buying intent.
// @match        https://kissedbyevie-menu.onrender.com/admin.html*
// @match        https://web.telegram.org/*
// @match        https://web.snapchat.com/*
// @match        https://x.com/*
// @match        https://stripchat.com/*
// @match        https://*.stripchat.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function(){
 'use strict';
 // The signed-in admin tab supplies authenticated inbox signals.
 // Other matched tabs display these only. No API tokens or chats are stored.
 const ADMIN_URL='https://kissedbyevie-menu.onrender.com/admin.html';
 const SIGNAL_KEY='evie-payment-ready-signal-v1';
 const SENT_KEY='evie-payment-ready-sent-v1';
 const MAX_AGE=2*60*1000;
 const shownInTab=new Set();
 let host=null;
 GM_addStyle([
  '#evie-ready-alerts {position:fixed!important;top:16px;right:16px;z-index:2147483647!important;width:min(385px,calc(100vw - 32px));display:grid;gap:10px;pointer-events:none;font-family:Arial,Helvetica,sans-serif}',
  '#evie-ready-alerts .evie-ready-card{pointer-events:auto;background:linear-gradient(140deg,#3d172b,#160913);color:#fff8f2;border:1px solid #f0d5a5;border-radius:14px;padding:19px 20px;box-shadow:0 15px 65px #0008;font-size:14px;line-height:1.45;text-align:left}',
  '#evie-ready-alerts .evie-ready-tag{font-weight:800;letter-spacing:.11em;font-size:10px;color:#e8cfab}',
  '#evie-ready-alerts .evie-ready-title{margin:9px 0 8px;font-size:21px;font-weight:800;line-height:1.22;color:#fff7ef;overflow-wrap:anywhere}',
  '#evie-ready-alerts .evie-ready-note{color:#efcfd7;font-size:12px;margin-bottom:15px}',
  '#evie-ready-alerts .evie-ready-actions{display:flex;gap:10px;flex-wrap:wrap}',
  '#evie-ready-alerts button{cursor:pointer;border:1px solid #dcbf99;border-radius:7px;min-height:40px;padding:9px 13px;background:#f0d8b5;color:#25121d;font-size:13px;font-weight:800}',
  '#evie-ready-alerts button.evie-ready-dismiss{background:transparent;color:#f8e0cb}',
  '@media(max-width:520px){#evie-ready-alerts{top:8px;right:8px;width:calc(100vw - 16px)}}'
 ].join('\n'));
 function ensureHost(){
  if(host&&host.isConnected)return host;
  if(!document.body)return null;
  host=document.createElement('section');
  host.id='evie-ready-alerts';
  host.setAttribute('aria-label','Evie payment-ready lead alerts');
  document.body.appendChild(host);
  return host;
 }
 function safeEvent(raw){
  if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||raw.id.length>130)return null;
  const at=Date.parse(raw.occurred_at||'');
  if(!Number.isFinite(at)||at>Date.now()+60000||at<Date.now()-24*3600000)return null;
  const strip=value=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,90);
  const handle=strip(raw.contact_handle).replace(/^@/,'');
  const name=strip(raw.contact_name);
  const user=handle&&/^[\w.-]{2,80}$/.test(handle)?'@'+handle:name;
  if(!user)return null;
  const platform=['telegram','snapchat','x'].includes(raw.platform)?raw.platform:'inbox';
  return {id:raw.id,user,platform,occurred_at:raw.occurred_at,sent_at:Date.now()};
 }
 function show(raw){
  const data=raw&&raw.user?raw:safeEvent(raw);
  if(!data||shownInTab.has(data.id))return;
  const container=ensureHost();
  if(!container)return;
  shownInTab.add(data.id);
  if(shownInTab.size>200)shownInTab.clear();
  const card=document.createElement('article');card.className='evie-ready-card';
  card.setAttribute('role','alert');
  const tag=document.createElement('div');tag.className='evie-ready-tag';tag.textContent='💸 KISSEDBYEVIE · NEW LEAD';
  const title=document.createElement('div');title.className='evie-ready-title';
  title.textContent=data.user+' is payment ready!';
  const note=document.createElement('div');note.className='evie-ready-note';
  note.textContent=(data.platform==='inbox'?'Inbox':data.platform.toUpperCase())+
   ' · Ready to discuss payment — payment NOT verified.';
  const actions=document.createElement('div');actions.className='evie-ready-actions';
  const open=document.createElement('button');open.type='button';open.textContent='Open my inbox';
  open.addEventListener('click',()=>window.open(ADMIN_URL,'_blank','noopener,noreferrer'));
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='evie-ready-dismiss';dismiss.textContent='Dismiss';
  dismiss.addEventListener('click',()=>card.remove());
  actions.append(open,dismiss);card.append(tag,title,note,actions);
  container.prepend(card);
  while(container.childElementCount>3)container.lastElementChild.remove();
 }
 function seenBefore(id){
  const now=Date.now();
  const history=GM_getValue(SENT_KEY,{});
  if(history&&typeof history==='object'&&history[id]&&now-history[id]<7*24*3600000)return true;
  const entries=Object.entries(history&&typeof history==='object'?history:{})
    .filter(([key,time])=>typeof time==='number'&&now-time<7*24*3600000&&key!==id)
    .slice(-140);
  const updated=Object.fromEntries(entries);
  updated[id]=now;
  GM_setValue(SENT_KEY,updated);
  return false;
 }
 const isAdmin=location.origin==='https://kissedbyevie-menu.onrender.com'&&location.pathname==='/admin.html';
 if(isAdmin){
  window.addEventListener('evie:payment-ready',event=>{
   const data=safeEvent(event.detail);
   if(!data||seenBefore(data.id))return;
   GM_setValue(SIGNAL_KEY,data);
   show(data);
  });
 }
 GM_addValueChangeListener(SIGNAL_KEY,(_key,_old,newValue,remote)=>{
  if(!remote||!newValue||typeof newValue!=='object')return;
  if(Date.now()-Number(newValue.sent_at||0)>MAX_AGE)return;
  show(newValue);
 });
 GM_registerMenuCommand('💸 Test Evie payment-ready alert',()=>{
  show({id:'test:'+Date.now(),user:'@examplebuyer',platform:'telegram',
        occurred_at:new Date().toISOString(),sent_at:Date.now()});
 });
})();