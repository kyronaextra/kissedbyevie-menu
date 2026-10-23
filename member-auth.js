(function(){
'use strict';
const $=id=>document.getElementById(id);
const dialog=$('memberDialog'),notice=$('memberSetupNotice');
const sdk=window.supabase;
const enabled=Boolean(window.EVIE_SUPABASE_URL&&window.EVIE_SUPABASE_PUBLISHABLE_KEY&&sdk&&typeof sdk.createClient==='function');
const client=enabled?sdk.createClient(window.EVIE_SUPABASE_URL,window.EVIE_SUPABASE_PUBLISHABLE_KEY,{
  auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
}):null;
const forms={
  login:$('memberLoginForm'),signup:$('memberSignupForm'),
  verify:$('memberVerifyForm'),reset:$('memberResetForm'),newpin:$('memberNewPinForm')
};
const tabs=[$('memberTabLogin'),$('memberTabSignup')];
let activeView='login';
let verifyPhone='';
let resetPhone='';
let pendingHandles=null;
let pendingProfileSave=false;
let statusLoading=false;
const validPin=x=>/^[0-9]{8}$/.test(x);
const validOtp=x=>/^[0-9]{6}$/.test(x);
function phoneFrom(value){
  const phone=String(value||'').replace(/[\s().-]/g,'');
  if(!/^\+[1-9][0-9]{7,14}$/.test(phone))throw new Error('Enter your number with country code, for example +1 253 555 0100.');
  return phone;
}
function textValue(id){return $(id).value.trim()}
function writeMessage(value){$('memberMessage').textContent=value||''}
function safeError(error){return error&&typeof error.message==='string'?error.message:'Unable to complete that request. Please try again.'}
function busy(form,value){
  const submit=form.querySelector('button[type=submit]');
  if(submit){submit.disabled=value;submit.setAttribute('aria-busy',String(value))}
}
function visibleView(view){
  activeView=view;
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
async function profileSave(handles){
  if(!client||!handles)return;
  const {data,error}=await client.auth.getUser();
  if(error||!data||!data.user)throw error||new Error('Sign in before saving your socials.');
  const payload={
    user_id:data.user.id,
    telegram_handle:handles.telegram,
    x_handle:handles.x,
    snapchat_handle:handles.snapchat
  };
  const {error:upsertError}=await client.from('evie_member_profiles').upsert(payload,{onConflict:'user_id'});
  if(upsertError)throw upsertError;
}
function handleValue(s){
  const value=String(s||'').trim();
  if(!value)return null;
  if(!/^@?[A-Za-z0-9._-]{1,79}$/.test(value))throw new Error('Social handles may contain letters, numbers, underscores, periods and an optional @.');
  return value;
}
function handlesFrom(prefix){
  return {
    telegram:handleValue(textValue(prefix+'Telegram')),
    x:handleValue(textValue(prefix+'X')),
    snapchat:handleValue(textValue(prefix+'Snapchat'))
  };
}
async function loadStatus(){
  if(!client||statusLoading)return;
  statusLoading=true;
  try{
    const {data,error}=await client.auth.getUser();
    if(error)throw error;
    const user=data&&data.user;
    if(!user){visibleView('login');return}
    showAccount();
    $('memberAccountPhone').textContent=user.phone||'Verified member account';
    $('memberStatusName').textContent='Checking access…';
    $('memberStatusDescription').textContent='Confirming your membership status.';
    $('memberGalleryEntry').hidden=true;
    // Member profile is readable/editable by only its own authenticated user via RLS.
    const {data:profile,error:pErr}=await client.from('evie_member_profiles')
      .select('telegram_handle,x_handle,snapchat_handle').eq('user_id',user.id).maybeSingle();
    if(pErr)throw pErr;
    if(pendingHandles){
      await profileSave(pendingHandles);
      $('memberProfileTelegram').value=pendingHandles.telegram||'';
      $('memberProfileX').value=pendingHandles.x||'';
      $('memberProfileSnapchat').value=pendingHandles.snapchat||'';
      pendingHandles=null;
    }else{
      $('memberProfileTelegram').value=profile?.telegram_handle||'';
      $('memberProfileX').value=profile?.x_handle||'';
      $('memberProfileSnapchat').value=profile?.snapchat_handle||'';
    }
    const {data:membership,error:mErr}=await client.from('evie_memberships')
      .select('tier,status,expires_at').eq('user_id',user.id).maybeSingle();
    if(mErr)throw mErr;
    if(!membership){
      $('memberStatusName').textContent='Pending review';
      $('memberStatusDescription').textContent='Your account exists, but membership access has not been activated.';
      return;
    }
    const expired=membership.expires_at&&Date.parse(membership.expires_at)<=Date.now();
    if(membership.status==='active'&&!expired){
      $('memberStatusName').textContent=membership.tier==='daddy'?'Daddy Member · Active':'Vault Member · Active';
      $('memberStatusDescription').textContent='Your paid access has been approved'+
        (membership.expires_at?' through '+new Date(membership.expires_at).toLocaleDateString():'')+'.';
      $('memberGalleryEntry').hidden=false;
    }else{
      const isExpired=Boolean(expired||membership.status==='expired');
      $('memberStatusName').textContent=isExpired?'Membership expired':membership.status==='revoked'?'Access revoked':'Pending approval';
      $('memberStatusDescription').textContent=isExpired?'Your access has ended. Contact Evie about renewal.':
        membership.status==='revoked'?'This membership is no longer active. Contact Evie for details.':
        'Your account is ready. Paid membership requires separate payment verification and approval.';
    }
  }catch(error){
    showAccount();
    $('memberStatusName').textContent='Unable to check membership';
    $('memberStatusDescription').textContent='Membership data is not available yet. Your access has not been confirmed.';
    $('memberGalleryEntry').hidden=true;
    writeMessage(safeError(error));
  }finally{statusLoading=false}
}
function open(){
  dialog.showModal();
  if(!enabled){
    notice.hidden=false;
    $('memberAuthArea').hidden=true;
    $('memberDashboard').hidden=true;
    return;
  }
  notice.hidden=true;
  loadStatus();
}
$('openMemberAccount').addEventListener('click',open);
$('closeMemberAccount').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
tabs.forEach(tab=>{
  tab.addEventListener('click',()=>visibleView(tab.dataset.authView));
  tab.addEventListener('keydown',e=>{
    const index=tabs.indexOf(tab);
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    e.preventDefault();const next=tabs[(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];
    visibleView(next.dataset.authView);next.focus();
  });
});
forms.login.addEventListener('submit',async e=>{
  e.preventDefault();if(!client||!forms.login.reportValidity())return;
  let phone;
  try{phone=phoneFrom(textValue('memberLoginPhone'))}catch(err){writeMessage(safeError(err));return}
  const pin=$('memberLoginPin').value;
  if(!validPin(pin)){writeMessage('Your PIN must contain exactly 8 digits.');return}
  busy(forms.login,true);writeMessage('Checking your account…');
  try{
    const {error}=await client.auth.signInWithPassword({phone,password:pin});
    if(error)throw error;
    forms.login.reset();
    writeMessage('');await loadStatus();
  }catch(err){writeMessage('Could not sign in. Check your phone number, PIN and SMS verification status.')}
  finally{busy(forms.login,false)}
});
forms.signup.addEventListener('submit',async e=>{
  e.preventDefault();if(!client||!forms.signup.reportValidity())return;
  let phone,handles;
  try{phone=phoneFrom(textValue('memberSignupPhone'));handles=handlesFrom('memberSignup')}
  catch(err){writeMessage(safeError(err));return}
  const pin=$('memberSignupPin').value;
  if(!validPin(pin)||pin!==$('memberSignupConfirm').value){writeMessage('Choose an 8-digit PIN and enter it the same way twice.');return}
  if(!/^(?!([0-9])\1{7})[0-9]{8}$/.test(pin)){writeMessage('Choose a less predictable eight-digit PIN.');return}
  busy(forms.signup,true);writeMessage('Creating your account…');
  try{
    const {data,error}=await client.auth.signUp({
      phone,password:pin,
      options:{data:{age_asserted_18_plus:true}}
    });
    if(error)throw error;
    pendingHandles=handles;
    verifyPhone=phone;
    $('memberSignupPin').value='';$('memberSignupConfirm').value='';
    // The production Supabase project must have phone confirmation AND an SMS provider enabled.
    if(data.session){
      writeMessage('');
      await loadStatus();
    }else{
      visibleView('verify');
      writeMessage('Enter the separate six-digit SMS verification code to finish registration.');
    }
  }catch(err){writeMessage(safeError(err))}
  finally{busy(forms.signup,false)}
});
forms.verify.addEventListener('submit',async e=>{
  e.preventDefault();if(!client||!forms.verify.reportValidity())return;
  const token=textValue('memberSmsCode');
  if(!validOtp(token)||!verifyPhone){writeMessage('Enter the six-digit SMS code sent during signup.');return}
  busy(forms.verify,true);writeMessage('Verifying phone…');
  try{
    const {error}=await client.auth.verifyOtp({phone:verifyPhone,token,type:'sms'});
    if(error)throw error;
    forms.verify.reset();
    await loadStatus();
    writeMessage('Phone verified. Your account is pending membership approval.');
  }catch(err){writeMessage(safeError(err))}
  finally{busy(forms.verify,false)}
});
$('memberVerifyBack').addEventListener('click',()=>visibleView('login'));
$('memberForgot').addEventListener('click',()=>visibleView('reset'));
$('memberResetBack').addEventListener('click',()=>visibleView('login'));
forms.reset.addEventListener('submit',async e=>{
  e.preventDefault();if(!client||!forms.reset.reportValidity())return;
  try{resetPhone=phoneFrom(textValue('memberResetPhone'))}
  catch(err){writeMessage(safeError(err));return}
  busy(forms.reset,true);writeMessage('Requesting a verification code…');
  try{
    const {error}=await client.auth.signInWithOtp({phone:resetPhone,options:{shouldCreateUser:false}});
    if(error)throw error;
    visibleView('newpin');
    writeMessage('If the number has an account, a six-digit verification code has been sent.');
  }catch(err){writeMessage('Unable to send the code. Check the phone number or try again later.')}
  finally{busy(forms.reset,false)}
});
forms.newpin.addEventListener('submit',async e=>{
  e.preventDefault();if(!client||!forms.newpin.reportValidity())return;
  const pin=$('memberNewPin').value,token=textValue('memberResetCode');
  if(!validPin(pin)||pin!==$('memberNewPinConfirm').value||!validOtp(token)){
    writeMessage('Please enter the SMS code and matching eight-digit PINs.');return;
  }
  busy(forms.newpin,true);writeMessage('Updating PIN…');
  try{
    const {error:vError}=await client.auth.verifyOtp({phone:resetPhone,token,type:'sms'});
    if(vError)throw vError;
    const {error:pError}=await client.auth.updateUser({password:pin});
    if(pError)throw pError;
    forms.newpin.reset();
    await loadStatus();writeMessage('PIN changed. Your account is ready.');
  }catch(err){writeMessage('Unable to update your PIN. Verify the SMS code or request a new one.')}
  finally{busy(forms.newpin,false)}
});
$('memberSocialForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!client)return;
  let handles;
  try{handles=handlesFrom('memberProfile')}
  catch(err){writeMessage(safeError(err));return}
  busy($('memberSocialForm'),true);writeMessage('Saving your socials…');
  try{await profileSave(handles);writeMessage('Your optional social profiles were saved.')}
  catch(err){writeMessage('Could not save your socials. Please try again.')}
  finally{busy($('memberSocialForm'),false)}
});
$('memberSignOut').addEventListener('click',async ()=>{
  if(!client)return;
  writeMessage('Signing out…');
  try{const {error}=await client.auth.signOut();if(error)throw error;visibleView('login');writeMessage('Signed out.')}
  catch(err){writeMessage('Unable to sign out. Please try again.')}
});
if(client){
  client.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT'){visibleView('login')}
  });
}
})();
