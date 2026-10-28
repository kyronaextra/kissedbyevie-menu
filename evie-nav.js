/* Accessible custom navigation. No framework required. */
(function(){
  'use strict';
  var trigger=document.getElementById('evieNavToggle');
  var dialog=document.getElementById('evieNavDialog');
  var closeButton=document.getElementById('evieNavClose');
  if(!trigger||!dialog||!closeButton)return;
  var navigating=false;
  trigger.addEventListener('click',function(){
    if(dialog.open){dialog.close();return;}
    dialog.showModal();
    trigger.setAttribute('aria-expanded','true');
    document.body.classList.add('evie-nav-open');
    closeButton.focus({preventScroll:true});
  });
  closeButton.addEventListener('click',function(){dialog.close()});
  dialog.addEventListener('click',function(event){
    if(event.target===dialog)dialog.close();
  });
  dialog.querySelectorAll('a[href^="#"],[data-open-vip-terms]').forEach(function(item){
    item.addEventListener('click',function(){
      navigating=true;
      if(dialog.open)dialog.close();
    });
  });
  dialog.addEventListener('close',function(){
    document.body.classList.remove('evie-nav-open');
    trigger.setAttribute('aria-expanded','false');
    if(!navigating)trigger.focus({preventScroll:true});
    navigating=false;
  });
})();
