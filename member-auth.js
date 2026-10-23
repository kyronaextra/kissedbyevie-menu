(function(){
'use strict';
const $=id=>document.getElementById(id);
const dialog=$('memberDialog'),notice=$('memberSetupNotice'),sdk=window.supabase;
const enabled=Boolean(window.EVIE_SUPABASE_URL&&window.EVIE_SUPABASE_PUBLISHABLE_KEY&&sdk&&typeof sdk.createClient==='function');
const client=enabled?sdk.createClient(window.EVIE_SUPABASE_URL,window.EVIE_SUPABASE_PUBLISHABLE_KEY,{
  auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
}):null;
const forms={
  login:$('memberLoginForm'),email:$('memberEmailLoginForm'),signup:$('memberSignupForm'),
  verify:$('memberVerifyForm'),reset:$('memberResetForm')
};
const tabs=[$('memberTabLogin'),$('memberTabSignup')];
const redirectTo=window.EVIE_AUTH_REDIRECT_URL||window.location.origin+window.location.pathname;
let verificationEmail='',pendingHandles=null,statusLoading=false;
const validPin=value=>/^[0-9]{8}$/.test(value);
const strongPin=value=>validPin(value)&&!/^([0-9])\1{7}$/.test(value)&&!['12345678','87654321','00000000','11111111','12341234','12121212'].includes(value);
function emailFrom(value){
  const email=String(value||'').trim().toLowerCase();
  if(email.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    throw new Error('Enter a valid email address.');
  return email;
}
function loginName(value){
  const name=String(value||'').trim().replace(/^@/,'');
  if(!/^[A-Za-z0-9._-]{3,30}$/.test(name))throw new Error('Use 3–30 letters, numbers, periods, underscores or dashes for your username.');
  return name;
}
function textValue(id){return $(id).value.trim()}
function writeMessage(value){$('memberMessage').textContent=value||''}
function safeError(error){return error&&typeof error.message==='string'?error.message:'Unable to complete that request. Please try again.'}
function busy(form,value){
  const submit=form.querySelector('button[type="submit"]');
  if(submit){submit.disabled=value;submit.setAttribute('aria-busy',String(value))}
}
function visibleView(view){
  for(const key of Object.keys(forms))forms[key].hidden=key!==view;
  $('memberAuthArea').hidden=false;$('memberDashboard').hidden=true;
  const isTab=view==='login'||view==='signup';
  $('memberAuthArea').querySelector('.member-auth-tabs').hidden=!isTab;
  tabs.forEach(tab=>{
    const on=tab.dataset.authView===view;
    tab.setAttribute('aria-selected',String(on));
    tab.tabIndex=on?0:-1;
  });
  writeMessage('');
}
function showAccount(){
  $('memberAuthArea').hidden=true;
  $('memberDashboard').hidden=false;
}
function handleValue(s){
  const value=String(s||'').trim();
  if(!value)return null;
  if(!/^@?[A-Za-z0-9._-]{1,79}$/.test(value))throw new Error('Username can contain letters, numbers, underscores, periods, dashes and an optional @.');
  return value;
}
function handlesFrom(prefix){
  const platform=textValue(prefix+'Platform'),handle=handleValue(textValue(prefix+'Handle'));
  if(!platform&&handle)throw new Error('Choose Telegram, X or Snapchat for your username, or leave both blank.');
  if(platform&&!handle)throw new Error('Enter your username, or select Skip for now.');
  if(platform&&!['telegram','x','snapchat'].includes(platform))throw new Error('Select a valid social platform.');
  return {telegram:platform==='telegram'?handle:null,x:platform==='x'?handle:null,snapchat:platform==='snapchat'?handle:null};
}
function displaySocial(handles){
  const platform=handles?.telegram?'telegram':handles?.x?'x':handles?.snapchat?'snapchat':'';
  $('memberProfilePlatform').value=platform;
  $('memberProfileHandle').value=platform?handles[platform]||'':'';
}
async function saveUsername(user,proposed){
  const username=loginName(proposed);
  const {error}=await client.from('evie_member_usernames').insert({user_id:user.id,username});
  if(error){
    if(error.code==='23505')throw new Error('This username is taken. Please choose another.');
    throw error;
  }
  return username;
}
function renderUsername(name,warning){
  $('memberUsernameDisplay').textContent=name?'@'+name:'Choose a username';
  $('memberUsernameHelp').textContent=warning||(name?'Sign in using this username and your PIN. Social references are optional.':'Choose a unique username to finish account setup.');
  $('memberUsernameForm').hidden=Boolean(name);
}
async function ensureUsername(user){
  const {data:existing,error}=await client.from('evie_member_usernames').select('username').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  if(existing){renderUsername(existing.username);return}
  const candidate=user.user_metadata?.evie_login_username;
  if(!candidate){renderUsername(null);return}
  try{renderUsername(await saveUsername(user,candidate))}
  catch(error){
    renderUsername(null,safeError(error));
    $('memberUsernameRetry').value=String(candidate).replace(/^@/,'');
  }
}
async function profileSave(user,handles){
  const {error}=await client.from('evie_member_profiles').upsert({
    user_id:user.id,telegram_handle:handles.telegram,x_handle:handles.x,snapchat_handle:handles.snapchat
  },{onConflict:'user_id'});
  if(error)throw error;
}
async function loadStatus(){
  if(!client||statusLoading)return;
  statusLoading=true;
  try{
    const {data,error}=await client.auth.getUser();
    if(error)throw error;
    const user=data?.user;
    if(!user){visibleView('login');return}
    showAccount();
    $('memberAccountEmail').textContent=user.email||'Verified member account';
    await ensureUsername(user);
    $('memberStatusName').textContent='Checking access…';
    $('memberStatusDescription').textContent='Confirming your membership status.';
    $('memberGalleryEntry').hidden=true;
    const {data:profile,error:pErr}=await client.from('evie_member_profiles')
      .select('telegram_handle,x_handle,snapchat_handle').eq('user_id',user.id).maybeSingle();
    if(pErr)throw pErr;
    let social=pendingHandles;
    if(!social&&!profile){
      const kind=user.user_metadata?.evie_social_platform;
      const handle=user.user_metadata?.evie_social_handle;
      if(['telegram','x','snapchat'].includes(kind)&&handle){
        try{social={telegram:null,x:null,snapchat:null};social[kind]=handleValue(handle)}
        catch(_){social=null}
      }
    }
    if(!profile&&social){
      await profileSave(user,social);
      displaySocial(social);
    }else{
      displaySocial(profile?{telegram:profile.telegram_handle,x:profile.x_handle,snapchat:profile.snapchat_handle}:null);
    }
    pendingHandles=null;
    let {data:membership,error:mErr}=await client.from('evie_memberships')
      .select('tier,status,expires_at,age_verified_at').eq('user_id',user.id).maybeSingle();
    if(mErr)throw mErr;
    if(!membership){
      const {error:createError}=await client.from('evie_memberships').insert({user_id:user.id,tier:'none',status:'pending'});
      if(createError&&createError.code!=='23505')throw createError;
      const {data:newMembership,error:readError}=await client.from('evie_memberships')
        .select('tier,status,expires_at,age_verified_at').eq('user_id',user.id).maybeSingle();
      if(readError)throw readError;
      membership=newMembership;
    }
    if(!membership){
      window.EvieDaddyGallery?.deactivate();
      $('memberStatusName').textContent='Pending review';
      $('memberStatusDescription').textContent='Your account exists, but membership access has not been activated.';
      return;
    }
    const expired=membership.expires_at&&Date.parse(membership.expires_at)<=Date.now();
    if(membership.status==='active'&&!expired&&membership.tier==='daddy'&&membership.age_verified_at){
      $('memberStatusName').textContent='Daddy Member · Active';
      $('memberStatusDescription').textContent='Your private gallery is ready.'+
        (membership.expires_at?' Approved through '+new Date(membership.expires_at).toLocaleDateString()+'.':'');
      $('memberGalleryEntry').hidden=false;
      window.EvieDaddyGallery?.activate(client,user);
    }else if(membership.status==='active'&&!expired&&membership.tier==='daddy'){
      window.EvieDaddyGallery?.deactivate();
      $('memberStatusName').textContent='Age verification required';
      $('memberStatusDescription').textContent='Contact Evie to complete age verification before private media access can be activated.';
    }else if(membership.status==='active'&&!expired&&membership.tier==='vault'){
      window.EvieDaddyGallery?.deactivate();
      $('memberStatusName').textContent='Vault Member · Active';
      $('memberStatusDescription').textContent='Your Vault membership has been approved. Daddy gallery access is a separate membership.';
    }else{
      window.EvieDaddyGallery?.deactivate();
      const isExpired=Boolean(expired||membership.status==='expired');
      $('memberStatusName').textContent=isExpired?'Membership expired':membership.status==='revoked'?'Access revoked':'Pending approval';
      $('memberStatusDescription').textContent=isExpired?'Your access has ended. Contact Evie about renewal.':
        membership.status==='revoked'?'This membership is no longer active. Contact Evie for details.':
        'Your account is ready. Paid membership and age verification remain separately approved.';
    }
  }catch(error){
    window.EvieDaddyGallery?.deactivate();
    showAccount();
    $('memberStatusName').textContent='Unable to check membership';
    $('memberStatusDescription').textContent='Membership information could not be confirmed yet.';
    $('memberGalleryEntry').hidden=true;
    writeMessage(safeError(error));
  }finally{statusLoading=false}
}
function open(){
  if(!dialog.open)dialog.showModal();
  if(!enabled){
    notice.hidden=false;$('memberAuthArea').hidden=true;$('memberDashboard').hidden=true;
    return;
  }
  notice.hidden=true;loadStatus();
}
$('openMemberAccount').addEventListener('click',open);
$('closeMemberAccount').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
dialog.addEventListener('close',()=>window.EvieDaddyGallery?.deactivate());
tabs.forEach(tab=>{
  tab.addEventListener('click',()=>visibleView(tab.dataset.authView));
  tab.addEventListener('keydown',event=>{
    const index=tabs.indexOf(tab);
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    event.preventDefault();
    const next=tabs[(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length];
    visibleView(next.dataset.authView);next.focus();
  });
});
forms.login.addEventListener('submit',async event=>{
  event.preventDefault();if(!client||!forms.login.reportValidity())return;
  let username;
  try{username=loginName(textValue('memberLoginUsername'))}catch(error){writeMessage(safeError(error));return}
  const pin=$('memberLoginPin').value;
  if(!validPin(pin)){writeMessage('The private PIN must be exactly eight digits.');return}
  busy(forms.login,true);writeMessage('Signing in…');
  try{
    const response=await fetch(window.EVIE_SUPABASE_URL+'/functions/v1/evie-username-login',{
      method:'POST',cache:'no-store',
      headers:{'Content-Type':'application/json',apikey:window.EVIE_SUPABASE_PUBLISHABLE_KEY},
      body:JSON.stringify({username,pin})
    });
    const body=await response.json().catch(()=>null);
    if(!response.ok||!body?.access_token||!body?.refresh_token){
      throw new Error(response.status===429?'Too many attempts. Please try again later.':'Could not sign in. Check your username/PIN or finish setup using email.');
    }
    const {error}=await client.auth.setSession({access_token:body.access_token,refresh_token:body.refresh_token});
    if(error)throw error;
    forms.login.reset();await loadStatus();writeMessage('');
  }catch(error){writeMessage(safeError(error))}
  finally{busy(forms.login,false)}
});
$('memberEmailFallback').addEventListener('click',()=>visibleView('email'));
$('memberEmailLoginBack').addEventListener('click',()=>visibleView('login'));
forms.email.addEventListener('submit',async event=>{
  event.preventDefault();if(!client||!forms.email.reportValidity())return;
  let email;
  try{email=emailFrom(textValue('memberEmailLoginEmail'))}catch(error){writeMessage(safeError(error));return}
  const pin=$('memberEmailLoginPin').value;
  if(!validPin(pin)){writeMessage('PIN must be eight digits.');return}
  busy(forms.email,true);writeMessage('Finishing setup…');
  try{
    const {error}=await client.auth.signInWithPassword({email,password:pin});
    if(error)throw error;
    forms.email.reset();await loadStatus();writeMessage('Your username is ready after setup. Paid access requires approval.');
  }catch(error){
    if(/email not confirmed/i.test(safeError(error))){
      verificationEmail=email;visibleView('verify');writeMessage('Confirm your email before finishing setup.');
    }else{writeMessage('Could not verify email and PIN. Please try again or contact Evie.')}
  }finally{busy(forms.email,false)}
});
$('memberUsernameForm').addEventListener('submit',async event=>{
  event.preventDefault();const form=$('memberUsernameForm');
  if(!client||!form.reportValidity())return;
  busy(form,true);writeMessage('Saving username…');
  try{
    const {data,error}=await client.auth.getUser();
    if(error||!data?.user)throw error||new Error('Sign in first.');
    const username=await saveUsername(data.user,textValue('memberUsernameRetry'));
    renderUsername(username);writeMessage('Username saved! You can use username + PIN next time.');
  }catch(error){writeMessage(safeError(error))}
  finally{busy(form,false)}
});
forms.signup.addEventListener('submit',async event=>{
  event.preventDefault();if(!client||!forms.signup.reportValidity())return;
  let email,handles,username;
  try{
    email=emailFrom(textValue('memberSignupEmail'));
    username=loginName(textValue('memberSignupUsername'));
    handles=handlesFrom('memberSignup');
  }catch(error){writeMessage(safeError(error));return}
  const pin=$('memberSignupPin').value;
  if(!strongPin(pin)||pin!==$('memberSignupConfirm').value){
    writeMessage('Choose a less predictable 8-digit PIN and enter it the same way twice.');return;
  }
  busy(forms.signup,true);writeMessage('Creating your private account…');
  try{
    const platform=handles.telegram?'telegram':handles.x?'x':handles.snapchat?'snapchat':'';
    const handle=platform?handles[platform]:'';
    const {data,error}=await client.auth.signUp({
      email,password:pin,
      options:{emailRedirectTo:redirectTo,data:{
        age_asserted_18_plus:true,evie_login_username:username,evie_social_platform:platform,evie_social_handle:handle
      }}
    });
    if(error)throw error;
    verificationEmail=email;pendingHandles=handles;
    $('memberSignupPin').value='';$('memberSignupConfirm').value='';
    if(data?.session){
      await loadStatus();
      writeMessage('Your account was created. Membership approval is separate.');
    }else{
      visibleView('verify');
      $('memberVerifyDescription').textContent='Check '+email+' for a confirmation link. After verifying, return and finish claiming your username if needed.';
      writeMessage('Account request received. Check your email to verify.');
    }
  }catch(error){writeMessage(safeError(error))}
  finally{busy(forms.signup,false)}
});
$('memberResendConfirmation').addEventListener('click',async ()=>{
  if(!client||!verificationEmail){
    writeMessage('Enter your email in the sign-in form first.');return;
  }
  const button=$('memberResendConfirmation');button.disabled=true;writeMessage('Requesting a new email…');
  try{
    const {error}=await client.auth.resend({type:'signup',email:verificationEmail,options:{emailRedirectTo:redirectTo}});
    if(error)throw error;
    writeMessage('If the account is awaiting verification, another link will be sent.');
  }catch(error){writeMessage('Unable to resend right now. Please wait and try again.')}
  finally{button.disabled=false}
});
$('memberVerifyBack').addEventListener('click',()=>visibleView('login'));
$('memberForgot').addEventListener('click',()=>visibleView('reset'));
$('memberResetBack').addEventListener('click',()=>visibleView('login'));
$('memberSocialForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!client)return;
  let handles;
  try{handles=handlesFrom('memberProfile')}
  catch(error){writeMessage(safeError(error));return}
  const form=$('memberSocialForm');busy(form,true);writeMessage('Saving username…');
  try{
    const {data,error}=await client.auth.getUser();
    if(error||!data?.user)throw error||new Error('Sign in first.');
    await profileSave(data.user,handles);
    displaySocial(handles);
    writeMessage('Your optional social username has been saved.');
  }catch(error){writeMessage('Could not save your social username. Please try again.')}
  finally{busy(form,false)}
});
$('memberSignOut').addEventListener('click',async ()=>{
  if(!client)return;
  writeMessage('Signing out…');
  try{
    const {error}=await client.auth.signOut();
    if(error)throw error;
    window.EvieDaddyGallery?.deactivate();pendingHandles=null;visibleView('login');writeMessage('Signed out.');
  }catch(error){writeMessage('Unable to sign out. Please try again.')}
});
if(client){
  client.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT'){window.EvieDaddyGallery?.deactivate();visibleView('login')}
  });
}
})();
