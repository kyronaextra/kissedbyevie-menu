/* Evie Admin — secure per-customer upload and dashboard note workspace.
   All mutations require fresh admin permissions in the Edge API.
   Browser uploads enter a private bucket; access is granted only by RLS and
   an authenticated admin's recipient assignment. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const BUCKET="evie-customer-deliveries";
const supported={
 "image/jpeg":{kind:"photo",extension:"jpg"},
 "image/png":{kind:"photo",extension:"png"},
 "image/webp":{kind:"photo",extension:"webp"},
 "video/mp4":{kind:"video",extension:"mp4"},
 "video/webm":{kind:"video",extension:"webm"}
};
let req=null,sb=null,selected=null,epoch=0;
const node=(tag,cls,text)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
};
const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString()};
function feedback(text,error=false){const el=$("customerDeliveryStatus");el.textContent=text||"";el.dataset.error=String(error)}
function reset(){
 epoch++;
 selected=null;
 $("customerDeliveryPanel").hidden=true;
 $("customerUploadForm").reset();
 $("customerMessageForm").reset();
 $("customerDeliveryList").replaceChildren();
 $("customerMessageList").replaceChildren();
 feedback("");
}
async function load(){
 if(!selected||!req)return;
 const ref=selected.id;const ticket=++epoch;
 $("customerDeliveryList").replaceChildren(node("p","hint","Loading assigned files…"));
 $("customerMessageList").replaceChildren(node("p","hint","Loading messages…"));
 try{
  const data=await req("customer_content",null,{user_id:ref});
  if(ticket!==epoch||selected?.id!==ref)return;
  const files=$("customerDeliveryList");
  files.replaceChildren();
  if(!(data.files||[]).length)files.append(node("p","hint","No files delivered to this customer yet."));
  for(const file of data.files||[]){
   const line=node("div","customer-delivery-entry");
   const title=node("strong","",file.title+" · "+(file.kind==="video"?"Video":"Photo"));
   const dateLine=node("small","",date(file.delivered_at)+" · "+file.status);
   const revoke=node("button","secondary small","Revoke access");
   revoke.type="button";revoke.disabled=file.status!=="ready";
   revoke.addEventListener("click",async()=>{
    if(!confirm("Revoke this customer's access to this file?"))return;
    revoke.disabled=true;
    try{
     await req("revoke_customer_delivery",{user_id:ref,file_id:file.id});
     feedback("Delivery revoked. Previously issued links can remain valid briefly.");
     await load();
    }catch(e){feedback(e.message||"Could not revoke",true);revoke.disabled=false}
   });
   line.append(title,dateLine,revoke);files.append(line);
  }
  const messages=$("customerMessageList");
  messages.replaceChildren();
  if(!(data.messages||[]).length)messages.append(node("p","hint","No dashboard messages yet."));
  for(const item of data.messages||[]){
   const p=node("div","customer-message-entry");
   p.append(node("small","",date(item.posted_at)),node("p","",item.body));
   messages.append(p);
  }
 }catch(error){
  if(ticket!==epoch)return;
  feedback(error.message||"Unable to load customer's private items",true);
 }
}
function select(customer){
 if(!customer?.id)return;
 selected=customer;
 $("customerDeliveryPanel").hidden=false;
 $("deliveryCustomerName").textContent=(customer.nickname||customer.username||customer.email||"Customer")+" · "+customer.id;
 $("deliveryAdultStatus").textContent=customer.age_verified
  ? "Age verification is recorded. Assigned media will be visible in the customer's account once delivered."
  : "Age verification is NOT recorded. You can assign files, but the customer cannot view purchased adult media until independently age-verified.";
 feedback("");
 load();
 $("customerDeliveryPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
$("customerUploadForm").addEventListener("submit",async event=>{
 event.preventDefault();
 if(!selected||!sb||!req)return feedback("Select a customer first.",true);
 const file=$("customerUploadFile").files?.[0];
 const title=$("customerUploadTitle").value.trim();
 if(!file||!title||title.length>120)return feedback("Choose a file and enter a title.",true);
 const type=supported[file.type];
 if(!type)return feedback("Use JPG, PNG, WebP, MP4 or WebM only.",true);
 if(file.size<=0||file.size>50*1024*1024)return feedback("File must be between 1 byte and 50 MB.",true);
 const id=selected.id,filename=crypto.randomUUID()+"."+type.extension;
 const path=id+"/"+filename,btn=$("customerUploadButton");
 btn.disabled=true;feedback("Uploading privately… This may take a moment.");
 try{
  const upload=await sb.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false,cacheControl:"private"});
  if(upload.error)throw upload.error;
  feedback("Uploaded. Assigning it to the customer's account…");
  await req("deliver_content",{user_id:id,storage_path:path,mime_type:file.type,kind:type.kind,title});
  $("customerUploadForm").reset();
  feedback("Delivered to "+(selected.nickname||selected.email||"the selected account")+" ♡");
  await load();
 }catch(error){
  feedback((error.message||"Upload failed")+". An unassigned upload may need cleanup in Supabase Storage.",true);
 }finally{btn.disabled=false}
});
$("customerMessageForm").addEventListener("submit",async event=>{
 event.preventDefault();
 if(!selected||!req)return feedback("Select a customer first.",true);
 const body=$("customerMessageText").value.trim();
 if(!body||body.length>1200)return feedback("Enter a message up to 1200 characters.",true);
 const id=selected.id,btn=$("customerMessageButton");
 btn.disabled=true;feedback("Saving private message…");
 try{
  await req("send_customer_message",{user_id:id,body});
  $("customerMessageForm").reset();
  feedback("Posted to the customer's account ♡");
  await load();
 }catch(error){feedback(error.message||"Could not post your message",true)}
 finally{btn.disabled=false}
});
window.EvieAdminCustomers=Object.freeze({
 start({request,client}){req=request;sb=client},
 select,reset,
 stop(){reset();req=null;sb=null}
});
})();