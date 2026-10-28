(function(){
'use strict';
const $=id=>document.getElementById(id);
const sdk=window.supabase;
const ready=!!(sdk&&typeof sdk.createClient==='function'&&window.EVIE_SUPABASE_URL&&window.EVIE_SUPABASE_PUBLISHABLE_KEY);
const sb=ready?sdk.createClient(window.EVIE_SUPABASE_URL,window.EVIE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'evie-member-auth'}}):null;
let busy=false,refreshCounter=0;
const feedback=message=>$('accountMessage').textContent=message||'';
const errorText=e=>e&&e.message?e.message:'Something went wrong. Please try again.';
const validEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
const validUsername=s=>/^[A-Za-z0-9._-]{3,30}$/.test(s);
const validPin=s=>/^\d{8}$/.test(s)&&!(/^(\d)\1{7}$/.test(s))&&!['12345678','87654321','12341234','12121212'].includes(s);
function mode(which){
 $('signupArea').hidden=which!=='signup';$('loginArea').hidden=which!=='login';
 $('tabSignup').classList.toggle('selected',which==='signup');$('tabLogin').classList.toggle('selected',which==='login');
 $('tabSignup').setAttribute('aria-selected',String(which==='signup'));$('tabLogin').setAttribute('aria-selected',String(which==='login'));
 $('dashboard').hidden=true;$('authPanel').hidden=false;
 feedback('');
}
function formBusy(form,on){busy=on;form.querySelector('button[type="submit"]').disabled=on;}
async function usernameFor(user){
 const {data,error}=await sb.from('evie_member_usernames').select('username').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 if(data?.username)return data.username;
 const candidate=String(user.user_metadata?.evie_login_username||'').trim().replace(/^@/,'');
 if(!validUsername(candidate))return null;
 const save=await sb.from('evie_member_usernames').insert({user_id:user.id,username:candidate});
 if(save.error&&save.error.code!=='23505')throw save.error;
 const read=await sb.from('evie_member_usernames').select('username').eq('user_id',user.id).maybeSingle();
 return read.data?.username||null;
}
async function syncSocial(user){
 const platform=user.user_metadata?.evie_social_platform,handle=user.user_metadata?.evie_social_handle;
 if(!['snapchat','telegram','x'].includes(platform)||!handle)return;
 const existing=await sb.from('evie_member_profiles').select('user_id').eq('user_id',user.id).maybeSingle();
 if(existing.error||existing.data)return;
 const profile={user_id:user.id,telegram_handle:null,x_handle:null,snapchat_handle:null};
 profile[platform+'_handle']=handle;
 await sb.from('evie_member_profiles').insert(profile);
}
async function renderDashboard(user){
 const turn=++refreshCounter;
 const [name,prefs,membership]=await Promise.all([
  usernameFor(user),
  sb.from('evie_alert_preferences').select('stripchat_email,availability_email').eq('user_id',user.id).maybeSingle(),
  sb.from('evie_memberships').select('tier,status,expires_at').eq('user_id',user.id).maybeSingle()
 ]);
 if(turn!==refreshCounter)return;
 if(prefs.error)throw prefs.error;
 $('accountUsername').textContent=name?'@'+name:(user.email?.split('@')[0]||'Member');
 $('accountEmail').textContent=user.email||'Account email';
 $('alertStripchat').checked=Boolean(prefs.data?.stripchat_email);
 $('alertAvailability').checked=Boolean(prefs.data?.availability_email);
 const m=membership.data;
 const active=m?.status==='active'&&(!m.expires_at||Date.parse(m.expires_at)>Date.now());
 $('membershipStatus').textContent=active?(m.tier==='daddy'?'VIP Daddy member':m.tier==='vault'?'Vault member':'Free account'):'Free account';
 $('authPanel').hidden=true;$('dashboard').hidden=false;
 syncSocial(user).catch(()=>{});
}
async function refresh(){
 if(!sb)return;
 try{
  const {data,error}=await sb.auth.getUser();
  if(error||!data?.user){$('authPanel').hidden=false;$('dashboard').hidden=true;return;}
  await renderDashboard(data.user);
 }catch(e){feedback('Unable to load your account right now. '+errorText(e));}
}
$('tabSignup').addEventListener('click',()=>mode('signup'));
$('tabLogin').addEventListener('click',()=>mode('login'));
// Signup uses no email confirmation link.
$('signupForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!sb||busy||!e.currentTarget.reportValidity())return;
 const email=$('signupEmail').value.trim().toLowerCase(),username=$('signupUsername').value.trim();
 const pin=$('signupPin').value,confirm=$('signupConfirm').value;
 const platform=$('signupPlatform').value,handle=$('signupHandle').value.trim().replace(/^@/,'');
 if(!validEmail(email)||!validUsername(username)){feedback('Please check your email and username.');return;}
 if(!validPin(pin)||pin!==confirm){feedback('Choose a less predictable 8 digit PIN and enter it twice.');return;}
 if((platform&&!handle)||(!platform&&handle)||handle&&!/^[a-zA-Z0-9._-]{1,79}$/.test(handle)){feedback('Enter a valid social username and select its platform, or skip both.');return;}
 if(!$('ageConsent').checked){feedback('Accounts on this site are for adults only.');return;}
 formBusy(e.currentTarget,true);feedback('Creating your account...');
 try{
  const {data,error}=await sb.auth.signUp({email,password:pin,options:{data:{age_asserted_18_plus:true,evie_login_username:username,evie_social_platform:platform||null,evie_social_handle:handle||null}}});
  if(error)throw error;
  $('signupPin').value='';$('signupConfirm').value='';
  if(!data?.session || !data?.user) {
    // If Confirm email is still enabled, Supabase returns a user but no session.
    // Never claim their account is ready or tell them a link was required.
    throw new Error('Instant signup is not enabled in the site settings yet. Please contact Evie to activate signups without email confirmation.');
  }
  await renderDashboard(data.user);
  feedback('Account created! Pick your notification preferences below.');
 }catch(err){feedback(errorText(err))}
 finally{formBusy(e.currentTarget,false)}
});
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!sb||busy||!e.currentTarget.reportValidity())return;
 const identity=$('loginIdentity').value.trim(),pin=$('loginPin').value;
 const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity);
 const username=identity.replace(/^@/,'');
 if(!/^\d{8}$/.test(pin)){feedback('Enter your 8 digit PIN.');return;}
 formBusy(e.currentTarget,true);feedback('Signing in...');
 try{
  if(isEmail){
   const {error}=await sb.auth.signInWithPassword({email:identity.toLowerCase(),password:pin});
   if(error)throw error;
  }else{
   if(!validUsername(username))throw Error('Please enter your username or email.');
   const response=await fetch(window.EVIE_SUPABASE_URL+'/functions/v1/evie-username-login',{method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json',apikey:window.EVIE_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({username,pin})});
   const result=await response.json().catch(()=>null);
   if(!response.ok||!result?.access_token||!result?.refresh_token)throw Error('Username or PIN not recognized. Try your email or check your details.');
   const {error}=await sb.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});
   if(error)throw error;
  }
  $('loginPin').value='';
  await refresh();feedback('Signed in.');
 }catch(err){feedback('Could not sign in. '+errorText(err))}
 finally{formBusy(e.currentTarget,false)}
});
$('alertsForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!sb||busy)return;
 formBusy(e.currentTarget,true);feedback('Saving your choices...');
 try{
  const {data,error}=await sb.auth.getUser();
  if(error||!data?.user)throw Error('Your session expired. Please sign in again.');
  const payload={user_id:data.user.id,stripchat_email:$('alertStripchat').checked,availability_email:$('alertAvailability').checked};
  const saved=await sb.from('evie_alert_preferences').upsert(payload,{onConflict:'user_id'});
  if(saved.error)throw saved.error;
  feedback('Saved! You can change or turn off these preferences anytime. Actual email sending is not enabled yet.');
 }catch(err){feedback(errorText(err))}
 finally{formBusy(e.currentTarget,false)}
});
$('signOut').addEventListener('click',async()=>{
 if(!sb)return;
 try{await sb.auth.signOut();mode('login');feedback('Signed out.');}
 catch(err){feedback(errorText(err))}
});
if(window.location.hash.toLowerCase()==='#login')mode('login');
if(!ready){$('setupError').hidden=false;document.querySelectorAll('form button[type="submit"]').forEach(b=>b.disabled=true);}
else{
 sb.auth.onAuthStateChange((event)=>{
  if(['SIGNED_IN','INITIAL_SESSION','SIGNED_OUT','TOKEN_REFRESHED'].includes(event)){
   setTimeout(()=>{if(event==='SIGNED_OUT'){mode('login');return;}refresh();},0);
  }
 });
 refresh();
}
})();