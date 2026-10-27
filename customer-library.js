/* Kissed by Evie — private per-account purchases & admin dashboard notes.
   Only a verified customer session can select its own rows via Supabase RLS.
   Paid adult files additionally require independent recorded age verification.
   Private Storage signed links are short lived and refreshed for each view. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const BUCKET="evie-customer-deliveries";
let client=null,userId=null,version=0,entries=[];
const make=(tag,cls,text)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(text!==undefined)n.textContent=String(text);
 return n;
};
const readableDate=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toLocaleDateString()};
function feedback(id,message){$(id).textContent=message||""}
function clearMedia(){
 const v=$("purchaseVideo"),img=$("purchaseImage");
 v.pause();v.removeAttribute("src");v.load();
 img.removeAttribute("src");img.hidden=true;v.hidden=true;
}
function deactivate(){
 version++;client=null;userId=null;entries=[];
 $("purchasesSection").hidden=true;$("messagesSection").hidden=true;
 $("purchasesGrid").replaceChildren();$("messagesList").replaceChildren();
 feedback("purchasesFeedback","");feedback("messagesFeedback","");
 if($("purchaseViewer").open)$("purchaseViewer").close();
 clearMedia();
}
async function showFile(entry){
 if(!client||!userId||!entries.some(x=>x.id===entry.id))return;
 const btn=$("purchasesRefresh");btn.disabled=true;
 feedback("purchasesFeedback","Opening your private file…");
 try{
  // Supabase Storage validates ownership + age verification, not just the UI.
  const {data,error}=await client.storage.from(BUCKET).createSignedUrl(entry.storage_path,entry.kind==="video"?3600:600);
  if(error||!data?.signedUrl)throw error||new Error("Media is unavailable");
  if(!userId)return;
  clearMedia();
  $("purchaseViewerTitle").textContent=entry.title;
  const media=entry.kind==="video"?$("purchaseVideo"):$("purchaseImage");
  media.src=data.signedUrl;media.hidden=false;
  if(!$("purchaseViewer").open)$("purchaseViewer").showModal();
  feedback("purchasesFeedback","");
 }catch(error){
  feedback("purchasesFeedback","This media couldn't open. Check your verification or refresh your account.");
  console.warn("Private media unavailable:",error?.message||error);
 }finally{btn.disabled=false}
}
async function refreshPurchases(){
 if(!client||!userId)return;
 const ticket=++version,recipient=userId;
 const grid=$("purchasesGrid");grid.replaceChildren(make("p","micro","Loading your private deliveries…"));
 feedback("purchasesFeedback","");
 try{
  const auth=await client.auth.getUser();
  if(auth.error||auth.data?.user?.id!==recipient)throw new Error("Sign in again");
  const {data,error}=await client.from("evie_customer_deliveries")
   .select("id,title,kind,storage_path,delivered_at")
   .eq("user_id",recipient).eq("status","ready")
   .order("delivered_at",{ascending:false}).limit(80);
  if(error)throw error;
  if(ticket!==version||userId!==recipient)return;
  entries=(data||[]).filter(row=>row.storage_path?.startsWith(recipient+"/"));
  grid.replaceChildren();
  if(!entries.length)grid.append(make("p","micro","Your delivered photos and videos will appear here after Evie assigns them and completes any required age verification. ♡"));
  else entries.forEach(entry=>{
   const card=make("article","purchase-item");
   const symbol=make("div","purchase-symbol",entry.kind==="video"?"▶":"♡");
   const info=make("div","purchase-info");
   info.append(make("strong","",entry.title),make("small","",readableDate(entry.delivered_at)+" · "+entry.kind));
   const open=make("button","btn primary purchase-open","Open "+entry.kind+" ↗");
   open.type="button";open.addEventListener("click",()=>showFile(entry));
   card.append(symbol,info,open);grid.append(card);
  });
 }catch(error){
  if(ticket!==version)return;
  grid.replaceChildren(make("p","micro","Couldn't load your delivered media."));
  feedback("purchasesFeedback","Please sign in again or try refreshing.");
  console.warn("Deliveries unavailable:",error?.message||error);
 }
}
async function refreshMessages(){
 if(!client||!userId)return;
 const ticket=version,recipient=userId;
 const list=$("messagesList");list.replaceChildren(make("p","micro","Checking for messages…"));
 try{
  const {data,error}=await client.from("evie_customer_messages")
   .select("id,body,posted_at").eq("user_id",recipient)
   .order("posted_at",{ascending:false}).limit(80);
  if(error)throw error;
  if(ticket!==version||userId!==recipient)return;
  list.replaceChildren();
  if(!(data||[]).length)list.append(make("p","micro","No messages yet. If I leave you a note, it'll appear here. ♡"));
  else(data||[]).forEach(entry=>{
   const card=make("article","account-message");
   card.append(make("small","",readableDate(entry.posted_at)),make("p","",entry.body));
   list.append(card);
  });
  feedback("messagesFeedback","");
 }catch(error){
  if(ticket!==version)return;
  list.replaceChildren(make("p","micro","Messages aren't available right now."));
  feedback("messagesFeedback","Please refresh your account.");
  console.warn("Dashboard messages unavailable:",error?.message||error);
 }
}
function activate(newClient,user){
 if(!newClient||!user?.id||user.is_anonymous)return deactivate();
 if(client===newClient&&userId===user.id)return;
 client=newClient;userId=user.id;
 $("purchasesSection").hidden=false;
 $("messagesSection").hidden=false;
 refreshPurchases();refreshMessages();
}
$("purchasesRefresh").addEventListener("click",refreshPurchases);
$("messagesRefresh").addEventListener("click",refreshMessages);
$("purchaseClose").addEventListener("click",()=>$("purchaseViewer").close());
$("purchaseViewer").addEventListener("click",event=>{if(event.target===$("purchaseViewer"))$("purchaseViewer").close()});
$("purchaseViewer").addEventListener("close",clearMedia);
window.EvieCustomerLibrary=Object.freeze({activate,deactivate,refreshPurchases,refreshMessages});
})();