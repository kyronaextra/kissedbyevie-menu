/* Terms acknowledgement is client-side UI only. No orders or payments are processed here. */
(function(){
  'use strict';
  const dialog=document.getElementById('vipTerms');
  const agree=document.getElementById('termsAgreeButton');
  const checkbox=document.getElementById('termsAgreeCheck');
  const close=document.getElementById('termsClose');
  if(!dialog||!agree||!checkbox||!close)return;

  const KEY='evie-fulfillment-agreement-accepted-2026-10-30';
  let previousFocus=null;
  function hasAccepted(){
    try{return sessionStorage.getItem(KEY)==='yes'}catch(_e){return false}
  }
  function openTerms(){
    previousFocus=document.activeElement;
    checkbox.checked=hasAccepted();
    agree.disabled=!checkbox.checked;
    if(!dialog.open)dialog.showModal();
  }
  function closeTerms(){if(dialog.open)dialog.close()}
  document.querySelectorAll('[data-open-vip-terms]').forEach(function(button){
    button.addEventListener('click',openTerms);
  });
  close.addEventListener('click',closeTerms);
  dialog.addEventListener('click',function(e){if(e.target===dialog)closeTerms()});
  checkbox.addEventListener('change',function(){agree.disabled=!checkbox.checked});
  agree.addEventListener('click',function(){
    if(!checkbox.checked)return;
    try{sessionStorage.setItem(KEY,'yes')}catch(_e){}
    closeTerms();
    const feedback=document.getElementById('cartFeedback');
    if(feedback)feedback.textContent='Fulfillment agreement acknowledged ♡ You can now send your order.';
  });
  dialog.addEventListener('close',function(){
    if(previousFocus&&previousFocus.isConnected&&previousFocus.focus)previousFocus.focus();
  });

  // Capture before app.js checkout handlers. A separate, explicit acknowledgment is
  // required before copying any order or opening the Telegram order link.
  document.addEventListener('click',function(e){
    const target=e.target.closest('#copyOrder, #confirmOrder');
    if(!target||target.disabled||hasAccepted())return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openTerms();
  },true);
})();