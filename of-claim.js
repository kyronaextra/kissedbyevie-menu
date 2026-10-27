/* OnlyFans subscriber claims — manual proof by creator DM, not OF OAuth. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
let client=null,userId=null,requestVersion=0;
const endpoint=()=>window.EVIE_SUPABASE_URL+"/functions/v1/evie-of-claim";
function say(text){$("ofFeedback").textContent=text||""}
function deactivate(){
 requestVersion++;client=null;userId=null;
 $("ofSection").hidden=true;$("ofInstructions").hidden=true;
 $("ofStatus").textContent="Not verified";$("ofClaimForm").hidden=false;say("");
}
function display(claim){
 const state=claim?.status||"not_requested";
 $("ofStatus").textContent=({
  verified:"♡ Verified OF subscriber",pending:"Verification requested · waiting for Evie's approval",
  expired:"Your verified status expired",code_expired:"Verification code expired",
  rejected:"Verification was not approved",not_requested:"Not verified yet"
 })[state]||"Not verified yet";
 $("ofInstructions").hidden=!(state==="pending"&&claim?.challenge_code);
 $("ofCode").textContent=claim?.challenge_code||"";
 $("ofExpiry").textContent=claim?.challenge_expires_at?"Code expires "+new Date(claim.challenge_expires_at).toLocaleString():"";
 $("ofClaimForm").hidden=state==="verified"||state==="pending";
 if(state==="verified"&&claim?.verified_until)say("Verified until "+new Date(claim.verified_until).toLocaleDateString()+". This does not unlock paid VIP content.");
 else if(state==="pending")say("Once you send the code, Evie will manually confirm your active OnlyFans subscription.");
 else say("");
}
async function call(method,body){
 if(!client)throw Error("Sign in first.");
 const session=await client.auth.getSession();
 const token=session.data?.session?.access_token;
 if(!token)throw Error("Session expired. Please sign in again.");
 const res=await fetch(endpoint(),{
  method,cache:"no-store",
  headers:{apikey:window.EVIE_SUPABASE_PUBLISHABLE_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:body?JSON.stringify(body):undefined
 });
 const json=await res.json().catch(()=>null);
 if(!res.ok)throw Error(json?.error||"Subscriber verification is unavailable right now.");
 return json;
}
async function refresh(){
 if(!client||!userId)return;
 const ticket=++requestVersion;
 try{
  const data=await call("GET");
  if(ticket!==requestVersion)return;
  display(data.claim);
 }catch(error){if(ticket===requestVersion)say(error.message||"Unable to check verification status.");}
}
function activate(c,u){
 if(!c||!u?.id||u.is_anonymous)return deactivate();
 if(client===c&&userId===u.id)return;
 client=c;userId=u.id;$("ofSection").hidden=false;refresh();
}
$("ofClaimForm").addEventListener("submit",async event=>{
 event.preventDefault();
 if(!client||!userId)return;
 const name=$("ofUsername").value.trim().replace(/^@/,"");
 if(!/^[A-Za-z0-9_.-]{3,50}$/.test(name))return say("Enter a valid OnlyFans username (3–50 characters).");
 const submit=$("ofClaimButton");submit.disabled=true;say("Creating your one-time code…");
 try{const result=await call("POST",{of_username:name});display(result.claim)}
 catch(error){say(error.message||"Unable to create claim.")}
 finally{submit.disabled=false}
});
$("ofCopyCode").addEventListener("click",async()=>{
 const code=$("ofCode").textContent||"";
 if(!code)return;
 try{await navigator.clipboard.writeText(code);say("Copied. Send that exact code from your OnlyFans inbox to Evie. ♡")}
 catch(_){say("Copy isn't available. Select the code above to copy it manually.")}
});
window.EvieOfClaims=Object.freeze({activate,deactivate,refresh});
})();