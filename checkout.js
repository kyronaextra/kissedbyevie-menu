(function(){
'use strict';
const el=id=>document.getElementById(id);
const d=el('checkoutDialog'),form=el('checkoutForm'),result=el('checkoutResult'),stat=el('checkoutStatus');
const api=String(window.EVIE_ORDER_API_URL||'').trim();
let lastRequestId=null,orderText='';
const val=id=>el(id).value.trim();
const platform=()=>document.querySelector('input[name="platform"]:checked').value;
const payment=()=>val('checkoutPayment');
const cart=()=>window.EvieCart;
const money=n=>'$'+Number(n).toFixed(0);
function orderInfo(){
  const items=cart().items();
  return items.map(i=>i.qty+' × '+i.name+' — '+money(i.qty*i.price)).join('\n')+
  '\nInitial estimated total: '+money(cart().total());
}
function compose(){
  return 'Kissed by Evie order request\n'+orderInfo()+
  '\nContact: '+platform()+' '+val('checkoutHandle')+
  '\nPayment: '+el('checkoutPayment').selectedOptions[0].text+
  '\nNotes: '+(val('checkoutNotes')||'None')+
  '\nPlease confirm the order and payment instructions.';
}
function open(){
 if(!cart()||!cart().items().length)return;
 lastRequestId=crypto.randomUUID();
 el('checkoutSummary').textContent=orderInfo();
 result.hidden=true;form.hidden=false;stat.textContent='';
 cart().close();d.showModal();
}
function close(){d.close()}
el('confirmOrder').addEventListener('click',open);
el('closeCheckout').addEventListener('click',close);
el('backToBag').addEventListener('click',()=>{close();cart().open()});
d.addEventListener('click',e=>{if(e.target===d)close()});
el('checkoutNotes').addEventListener('input',()=>el('notesCount').textContent=val('checkoutNotes').length+' / 500');
function resultView(heading,message,success){
 form.hidden=true;result.hidden=false;
 el('resultHeading').textContent=heading;el('resultCopy').textContent=message;
 const p=el('resultPayment');p.replaceChildren();p.hidden=!success;
 if(!success)return;
 const amount=document.createElement('p');amount.textContent='Initial estimated amount: '+money(cart().total())+'. Recurring subscriptions are confirmed separately.';p.append(amount);
 const note=document.createElement('p');note.textContent='Evie will send payment instructions on Telegram. Nothing is charged until she confirms.';p.append(note);
}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!form.reportValidity()||!cart().items().length)return;
 const handle=val('checkoutHandle');
 if(!/^[A-Za-z0-9_.@-]{2,80}$/.test(handle)){stat.textContent='Enter a valid Snapchat or Telegram username.';return}
 orderText=compose();
 if(!api){
  resultView('Send this to me','Nothing is charged here. Copy your order and message me on Telegram so I can confirm it.',false);
  return;
 }
 const btn=el('submitCheckout');btn.disabled=true;btn.textContent='Sending securely…';stat.textContent='Submitting your order request…';
 const body={request_id:lastRequestId,items:cart().items().map(i=>({name:i.name,qty:i.qty})),
  contact_platform:platform(),contact_handle:handle,notes:val('checkoutNotes'),
  payment_method:payment(),adult_confirmed:el('checkoutConsent').checked,website:val('checkoutWebsite')};
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  let response;
  try{response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal})}
  finally{clearTimeout(timer)}
  const data=await response.json();
  if(!response.ok||data.ok!==true||!data.order_id)throw Error('Unconfirmed request');
  resultView('Request received','Reference: '+data.order_id+'. Pending payment and manual confirmation.',true);
  cart().reset();el('bagPill').classList.remove('visible');
 }catch(err){
  resultView('Unable to confirm storage','No payment was taken. Your request may not have saved. Please avoid repeated submissions; copy your order and contact Evie.',false);
 }finally{btn.disabled=false;btn.textContent='Send order request →';stat.textContent=''}
});
el('copyCheckout').addEventListener('click',async function(){
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(orderText);
  else{
   const area=document.createElement('textarea');area.value=orderText;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();
   const ok=document.execCommand('copy');area.remove();if(!ok)throw Error('No copy permission');
  }
  this.textContent='Copied!';
 }catch(e){el('resultCopy').textContent+=' Automatic copy was blocked; manually copy the order and username.'}
});
})();