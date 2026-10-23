(function(){
'use strict';
// The browser only receives a publishable key; all privileged operations
// require a verified admin account + MFA in the separate Supabase Edge API.
const $=id=>document.getElementById(id);
const sdk=window.supabase,url=window.EVIE_SUPABASE_URL,key=window.EVIE_SUPABASE_PUBLISHABLE_KEY;
const ready=Boolean(sdk&&url&&key&&typeof sdk.createClient==='function');
const sb=ready?sdk.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'evie-admin-ephemeral'}}):null;
const sections=['overview','connections','automations','docker','members','activity'];
let current='overview',data=null,page=1,hasMore=false,factorId=null,opening=false;
const presets={
 telegram:{name:'NightShift Telegram Bot',kind:'bot',platform:'render',render_service_id:'srv-db78airbc2fs73e6eakg',endpoint_url:'https://nightshift-telegram-bot.onrender.com',notes:'Existing Render Node service; reference only, no bot access granted.'},
 evieadmin:{name:'EvieAdmin Control',kind:'agent',platform:'render',render_service_id:'srv-db6o577f3r2c73brjcp0',endpoint_url:'https://evieadmin-control.onrender.com',notes:'Existing Render Python service; reference only, no commands issued.'}
};
const msg=e=>e instanceof Error?e.message:'Something went wrong. Please retry.';
function status(message,err=false){const p=$('adminGlobalStatus');p.textContent=message||'';p.dataset.error=String(Boolean(err))}
function gateStatus(message){$('adminGateStatus').textContent=message||''}
function node(tag,cls,content){const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=String(content);return x}
function date(value){const d=new Date(value);return value&&!Number.isNaN(d.getTime())?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—'}
function processing(form,yes){const button=form.querySelector('[type="submit"]');if(button){button.disabled=yes;button.setAttribute('aria-busy',String(yes))}}
function gate(view){
 $('adminGate').hidden=false;$('adminWorkspace').hidden=true;
 $('adminLoginForm').hidden=view!=='login';$('adminMfaGate').hidden=view!=='mfa';$('adminDenied').hidden=view!=='denied';
 $('adminGateSignOut').hidden=view==='login';gateStatus('');
}
function section(view){
 if(!sections.includes(view))return;current=view;
 sections.forEach(id=>{$('panel-'+id).hidden=id!==view});
 document.querySelectorAll('[data-admin-view]').forEach(button=>{
  const isCurrent=button.dataset.adminView===view;button.classList.toggle('selected',isCurrent);
  if(isCurrent)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')
 });
 if(view==='members')loadMembers(1);
 window.scrollTo({top:0,behavior:'smooth'});
}
function showDashboard(){$('adminGate').hidden=true;$('adminWorkspace').hidden=false;section(current)}
async function request(action,content=null,query=null){
 if(!sb)throw Error('Supabase Auth is unavailable. Reload this page.');
 const {data:auth,error}=await sb.auth.getSession();
 if(error||!auth?.session?.access_token)throw Error('Admin session expired. Please sign in again.');
 const endpoint=new URL(url+'/functions/v1/evie-admin-api');
 const method=content===null?'GET':'POST';
 if(method==='GET'){
  endpoint.searchParams.set('action',action);
  if(query)Object.entries(query).forEach(([k,v])=>endpoint.searchParams.set(k,String(v)));
 }
 const response=await fetch(endpoint,{method,cache:'no-store',
  headers:{apikey:key,Authorization:'Bearer '+auth.session.access_token,'Content-Type':'application/json'},
  body:content===null?undefined:JSON.stringify({action,...content})
 });
 const payload=await response.json().catch(()=>null);
 if(!response.ok){const err=new Error(payload?.error||'The protected service could not complete this request.');err.status=response.status;throw err}
 return payload;
}
async function authorize(){
 if(opening)return;opening=true;gateStatus('Checking administrator permissions…');
 try{
  const identity=await request('session');
  if(!identity?.admin)throw Error('This account is not an administrator.');
  $('adminIdentity').textContent=identity.email||'Verified administrator';
  if(identity.needs_mfa){gate('mfa');await prepareMfa()}
  else{showDashboard();await overview()}
 }catch(error){
  if(error.status===403){gate('denied');gateStatus('This account has not been granted administrator access.')}
  else{gate('login');gateStatus(msg(error))}
 }finally{opening=false}
}
async function prepareMfa(){
 factorId=null;$('adminMfaQRCode').hidden=true;$('adminMfaQRCode').removeAttribute('src');
 $('adminMfaSecret').textContent='';$('adminMfaCode').value='';
 const {data,error}=await sb.auth.mfa.listFactors();if(error)throw error;
 const verified=(data?.totp||[]).find(f=>f.status==='verified');
 if(verified){
  factorId=verified.id;$('mfaEnrollBox').hidden=true;$('mfaInstructions').textContent='Enter the six-digit code from your authenticator app.';
  $('adminMfaCode').disabled=false;$('adminMfaForm').querySelector('[type="submit"]').disabled=false;
 }else{
  $('mfaEnrollBox').hidden=false;$('mfaInstructions').textContent='Set up an authenticator app to secure the control room.';
  $('adminMfaCode').disabled=true;$('adminMfaForm').querySelector('[type="submit"]').disabled=true;
 }
}
async function enroll(){
 const button=$('adminMfaEnroll');button.disabled=true;gateStatus('Preparing authenticator setup…');
 try{
  const {data,error}=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Evie Admin'});
  if(error)throw error;factorId=data.id;
  if(data.totp?.qr_code){
   $('adminMfaQRCode').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data.totp.qr_code);
   $('adminMfaQRCode').hidden=false;
  }
  $('adminMfaSecret').textContent=data.totp?.secret||'';
  $('adminMfaCode').disabled=false;$('adminMfaForm').querySelector('[type="submit"]').disabled=false;
  gateStatus('Scan the QR code, then type the six-digit code from your authenticator app.');
 }catch(error){gateStatus(msg(error))}
 finally{button.disabled=false}
}
async function verify(event){
 event.preventDefault();const form=$('adminMfaForm');if(!form.reportValidity()||!factorId)return;
 processing(form,true);gateStatus('Verifying the authenticator…');
 try{
  const {data:challenge,error:ce}=await sb.auth.mfa.challenge({factorId});if(ce)throw ce;
  const {error}=await sb.auth.mfa.verify({factorId,challengeId:challenge.id,code:$('adminMfaCode').value.trim()});if(error)throw error;
  $('adminMfaCode').value='';factorId=null;await authorize();
 }catch(error){gateStatus(msg(error))}
 finally{processing(form,false)}
}
async function signOut(){
 try{await sb?.auth.signOut()}catch(_){}
 data=null;factorId=null;page=1;$('adminLoginForm').reset();gate('login');gateStatus('Signed out of Evie Admin.');
}
function choice(id,text,value){const option=node('option','',text);option.value=value;return option}
function renderConnections(items){
 const host=$('adminConnectionList');host.replaceChildren();$('connCount').textContent=items.length+' REGISTERED';
 if(!items.length){host.append(node('p','empty','No bot or service references yet.'));return}
 items.forEach(item=>{
  const row=node('article','record'),top=node('div','record-top'),actions=node('div','record-actions');
  top.append(node('strong','',item.name),node('small','',item.kind+' / '+item.platform));row.append(top);
  if(item.notes)row.append(node('p','',item.notes));
  const details=[item.render_service_id,item.endpoint_url,item.secret_env_name].filter(Boolean).join(' · ');
  if(details)row.append(node('p','',details));
  const state=node('p','','Reference saved. Runtime not automatically connected.');
  row.append(state);
  if(item.render_service_id){
   const check=node('button','','Check Render');
   check.type='button';check.disabled=!data?.capabilities?.render_status;
   check.title=check.disabled?'Set RENDER_API_KEY as a Supabase Edge secret first':'Read service status from Render';
   check.addEventListener('click',async()=>{
    check.disabled=true;state.textContent='Checking Render service…';
    try{
     const live=await request('render_status',null,{id:item.render_service_id});
     state.textContent=live.configured?'Render: '+live.name+' · '+live.runtime+' · '+live.suspended:'Render API token not configured.';
    }catch(error){state.textContent=msg(error)}
    finally{check.disabled=false}
   });
   actions.append(check);
  }
  if(item.endpoint_url){
   const link=node('a','','Open site ↗');
   link.href=item.endpoint_url;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);
  }
  const archive=node('button','danger','Archive reference');archive.type='button';
  archive.addEventListener('click',async()=>{
   if(!confirm('Archive '+item.name+'? This will not stop the actual bot or container.'))return;
   archive.disabled=true;
   try{await request('archive_connection',{id:item.id});await overview();status('Reference archived. Live service unchanged.')}
   catch(error){status(msg(error),true);archive.disabled=false}
  });
  actions.append(archive);row.append(actions);host.append(row);
 });
}
function renderDrafts(items){
 const host=$('adminAutomationList');host.replaceChildren();$('autoCount').textContent=items.length+' DRAFTS';
 if(!items.length){host.append(node('p','empty','No saved workflow drafts yet.'));return}
 items.forEach(item=>{
  const row=node('article','record'),header=node('div','record-top'),actions=node('div','record-actions');
  header.append(node('strong','',item.name),node('small','','draft'));
  row.append(header,node('p','',item.trigger_type+(item.schedule_description?' · '+item.schedule_description:'')));
  if(item.notes)row.append(node('p','',item.notes));
  const remove=node('button','danger','Delete draft');remove.type='button';
  remove.addEventListener('click',async()=>{
   if(!confirm('Delete the '+item.name+' draft?'))return;
   remove.disabled=true;
   try{await request('delete_automation',{id:item.id});await overview();status('Draft deleted. No jobs were running.')}
   catch(error){status(msg(error),true);remove.disabled=false}
  });
  actions.append(remove);row.append(actions);host.append(row);
 });
}
function renderActivity(items){
 const host=$('adminAuditList');host.replaceChildren();
 if(!items.length){host.append(node('p','empty','No configuration changes recorded yet.'));return}
 items.forEach(e=>{
  const row=node('article','record'),head=node('div','record-top');
  head.append(node('strong','',e.message),node('small','',date(e.created_at)));
  row.append(head,node('p','',e.event_type+' · '+e.resource_type));host.append(row);
 });
}
async function overview(){
 status('Loading protected configuration records…');
 try{
  data=await request('overview');
  const counts=data.counts||{};
  [['statMembers','members'],['statPending','pending'],['statConnections','connections'],['statAutomations','automation_drafts']].forEach(([id,key])=>{
   $(id).textContent=counts[key]??0;
  });
  $('renderCapability').textContent=data.capabilities?.render_status?'Server-side Render status checks are available.':
   'Render API status checks are not configured. Add RENDER_API_KEY as a Supabase Edge Function secret first.';
  renderConnections(data.connections||[]);renderDrafts(data.automations||[]);renderActivity(data.events||[]);
  const select=$('autoConnection'),previous=select.value;select.replaceChildren(choice('','Not selected',''));
  (data.connections||[]).forEach(entry=>select.append(choice('',entry.name+' / '+entry.kind,entry.id)));
  if((data.connections||[]).some(e=>e.id===previous))select.value=previous;
  status('Control room is up to date.');
 }catch(error){status(msg(error),true)}
}
async function loadMembers(nextPage){
 page=Math.max(1,nextPage);$('memberPage').textContent='Page '+page;
 $('memberPrev').disabled=true;$('memberNext').disabled=true;
 const host=$('adminMemberList');host.replaceChildren(node('p','empty','Loading member roster…'));
 try{
  const response=await request('members',null,{page});hasMore=Boolean(response.has_more);
  host.replaceChildren();
  if(!(response.members||[]).length)host.append(node('p','empty','No accounts on this page.'));
  else{
   const table=node('table','member-table'),thead=node('thead'),heading=node('tr');
   ['Username','Email','Social reference','Plan','Status','Adult verified'].forEach(h=>heading.append(node('th','',h)));
   thead.append(heading);table.append(thead);
   const tbody=node('tbody');
   response.members.forEach(m=>{
    const tr=node('tr'),account=node('td');
    account.append(node('strong','',m.username?'@'+m.username:'Pending username'));tr.append(account);
    const socials=[m.snapchat&&'Snap: '+m.snapchat,m.x&&'X: '+m.x,m.telegram&&'TG: '+m.telegram].filter(Boolean).join(' / ');
    [m.email||'—',socials||'—',m.tier||'none',m.status||'not reviewed',m.age_verified?'Yes':'No'].forEach(x=>tr.append(node('td','',x)));
    tbody.append(tr);
   });
   table.append(tbody);host.append(table);
  }
  $('memberPrev').disabled=page<=1;$('memberNext').disabled=!hasMore;
 }catch(error){host.replaceChildren(node('p','empty',msg(error)));status(msg(error),true)}
}
async function saveConnection(event){
 event.preventDefault();const form=$('adminConnectionForm');if(!form.reportValidity())return;
 const connection={name:$('connName').value.trim(),kind:$('connKind').value,platform:$('connPlatform').value.trim(),
  render_service_id:$('connRender').value.trim(),endpoint_url:$('connUrl').value.trim(),
  secret_env_name:$('connEnv').value.trim(),notes:$('connNotes').value.trim()};
 processing(form,true);status('Saving integration reference…');
 try{await request('add_connection',{connection});form.reset();await overview();status('Reference saved. No bot or container was started.')}
 catch(error){status(msg(error),true)}finally{processing(form,false)}
}
async function saveAutomation(event){
 event.preventDefault();const form=$('adminAutomationForm');if(!form.reportValidity())return;
 const automation={name:$('autoName').value.trim(),trigger_type:$('autoTrigger').value,
  schedule_description:$('autoSchedule').value.trim(),connection_id:$('autoConnection').value||null,notes:$('autoNotes').value.trim()};
 processing(form,true);status('Saving workflow draft…');
 try{await request('add_automation',{automation});form.reset();await overview();status('Saved a draft. Nothing was scheduled or executed.')}
 catch(error){status(msg(error),true)}finally{processing(form,false)}
}
function preset(key){
 const p=presets[key];if(!p)return;
 section('connections');
 [['connName','name'],['connKind','kind'],['connPlatform','platform'],['connRender','render_service_id'],['connUrl','endpoint_url'],['connNotes','notes']].forEach(([id,k])=>$(id).value=p[k]);
 $('connEnv').value='';
 status('The reference is prefilled; review and save it. This does not authorize or run the live service.');
 $('connName').focus();
}
$('adminLoginForm').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget;
 if(!ready){gateStatus('Secure Auth could not initialize. Refresh this page.');return}
 if(!form.reportValidity())return;
 processing(form,true);gateStatus('Checking your admin credentials…');
 try{
  const {error}=await sb.auth.signInWithPassword({email:$('adminEmail').value.trim().toLowerCase(),password:$('adminPassword').value});
  if(error)throw Error('Admin sign-in failed. Check your email and password.');
  $('adminPassword').value='';await authorize();
 }catch(error){gateStatus(msg(error))}finally{processing(form,false)}
});
$('adminMfaEnroll').addEventListener('click',enroll);
$('adminMfaForm').addEventListener('submit',verify);
$('adminGateSignOut').addEventListener('click',signOut);
$('adminLogout').addEventListener('click',signOut);
$('adminMobileLogout').addEventListener('click',signOut);
$('adminRefresh').addEventListener('click',overview);
$('adminConnectionForm').addEventListener('submit',saveConnection);
$('adminAutomationForm').addEventListener('submit',saveAutomation);
$('memberPrev').addEventListener('click',()=>loadMembers(page-1));
$('memberNext').addEventListener('click',()=>{if(hasMore)loadMembers(page+1)});
document.querySelectorAll('[data-admin-view]').forEach(b=>b.addEventListener('click',()=>section(b.dataset.adminView)));
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>section(b.dataset.jump)));
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>preset(b.dataset.preset)));
if(!ready)gateStatus('Secure login could not initialize. Please refresh or check Supabase settings.');
})();
