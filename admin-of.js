/* Evie Admin — manual creator confirmation of OnlyFans subscriber claims. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const node=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
let request=null,revision=0;
function state(s){$("adminOfFeedback").textContent=s||""}
async function refresh(){
 if(!request)return;
 const ticket=++revision,list=$("adminOfQueue");
 list.replaceChildren(node("p","hint","Loading verification claims…"));
 try{
  const data=await request("of_claims");
  if(ticket!==revision)return;
  list.replaceChildren();
  const claims=data.claims||[];
  if(!claims.length)list.append(node("p","hint","No subscriber verification requests yet."));
  for(const claim of claims){
   const item=node("article","customer-message-entry");
   item.append(node("strong","",claim.of_username+" · "+claim.status));
   item.append(node("small","", " · Requested "+new Date(claim.requested_at).toLocaleString()));
   const detail=node("p","",claim.status==="pending"?"Challenge code: "+claim.challenge_code:"Expires: "+(claim.verified_until?new Date(claim.verified_until).toLocaleDateString():"—"));
   item.append(detail);
   if(claim.status==="pending"){
    const expired=new Date(claim.challenge_expires_at).getTime()<=Date.now();
    const instructions=node("p","hint",expired?"Code expired. Customer must request another.":"Match this exact code to a message FROM the claimed OnlyFans username and confirm the subscription is active.");
    item.append(instructions);
    const approve=node("button","secondary small","Approve verified subscriber");
    approve.type="button";approve.disabled=expired;
    const reject=node("button","secondary small","Reject claim");
    reject.type="button";
    const submit=async decision=>{
      if(decision==="verified"&&!confirm("Did you personally find this exact code in the claimed subscriber's OnlyFans DM and confirm an active subscription?"))return;
      approve.disabled=true;reject.disabled=true;
      try{
       await request("review_of_claim",{user_id:claim.user_id,decision});
       state("Saved. Status only: this does not unlock paid gallery access.");
       await refresh();
      }catch(error){state(error.message||"Review failed");approve.disabled=expired;reject.disabled=false;}
    };
    approve.addEventListener("click",()=>submit("verified"));
    reject.addEventListener("click",()=>submit("rejected"));
    item.append(approve,reject);
   }
   list.append(item);
  }
 }catch(error){
  if(ticket===revision){list.replaceChildren(node("p","hint","Unable to load subscriber claims."));state(error.message||"Request failed")}
 }
}
$("adminOfRefresh").addEventListener("click",refresh);
window.EvieAdminOf=Object.freeze({
 start({request:req}){request=req},
 refresh,
 stop(){revision++;request=null;$("adminOfQueue").replaceChildren();state("")}
});
})();