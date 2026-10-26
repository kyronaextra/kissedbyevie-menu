'use strict';
(function(){
  var reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroRail=document.getElementById('heroRail');
  var heroSlides=Array.from(heroRail.querySelectorAll('.hero-slide'));
  var galleryRail=document.getElementById('galleryRail');
  var current=document.getElementById('heroCurrent');
  var photoButtons=Array.from(document.querySelectorAll('[data-photo]')).filter(function(el){return !el.classList.contains('hero-slide')});
  var photoSets={
  "hero": [
    "/assets/photos/evie-hero-01.png",
    "/assets/photos/evie-hero-02.jpg",
    "/assets/photos/evie-featured-01.jpg",
    "/assets/photos/evie-featured-02.jpg"
  ],
  "diary": [
    "/assets/photos/evie-about-01.jpg",
    "/assets/photos/evie-featured-01.jpg",
    "/assets/photos/evie-featured-02.jpg",
    "/assets/photos/evie-featured-03.jpg",
    "/assets/photos/evie-gallery-01.jpg",
    "/assets/photos/evie-gallery-02.jpg",
    "/assets/photos/evie-gallery-03.jpg",
    "/assets/photos/evie-gallery-04.jpg",
    "/assets/photos/evie-gallery-05.jpg",
    "/assets/photos/evie-gallery-06.jpg",
    "/assets/photos/evie-gallery-07.jpg",
    "/assets/photos/evie-gallery-08.jpg",
    "/assets/photos/evie-gallery-09.jpg",
    "/assets/photos/evie-gallery-10.jpg",
    "/assets/photos/evie-gallery-11.jpg",
    "/assets/photos/evie-gallery-12.jpg",
    "/assets/photos/evie-gallery-13.jpg",
    "/assets/photos/evie-gallery-14.jpg",
    "/assets/photos/evie-menu-01.jpg",
    "/assets/photos/evie-menu-02.jpg",
    "/assets/photos/evie-menu-03.jpg",
    "/assets/photos/evie-menu-04.jpg",
    "/assets/photos/evie-menu-05.jpg",
    "/assets/photos/evie-menu-06.jpg",
    "/assets/photos/evie-about-02.jpg"
  ]
};
  var photoAlts={
  "hero": [
    "Evie posing in a light patterned outfit against a burgundy backdrop",
    "Evie in a beaded top and jeans against a deep red curtain",
    "Evie seated in a red outfit for an editorial portrait",
    "Evie posing for a mirror selfie in a black lace outfit"
  ],
  "diary": [
    "Evie sitting comfortably on a couch in warm natural light",
    "Evie seated in a red outfit for an editorial portrait",
    "Evie posing for a mirror selfie in a black lace outfit",
    "Evie reclining on a couch in a black outfit",
    "Evie in a burgundy outfit indoors",
    "Evie in a purple set posing beside a window",
    "Evie posing in a burgundy set from behind",
    "Evie posing with a pink ribbon indoors",
    "Evie taking a mirror selfie wearing a cap and brown top",
    "Evie lounging on a couch in a light green outfit",
    "Evie at a warmly lit bar in a patterned top",
    "Evie sharing a moment with a friend at a restaurant",
    "Evie posing in a burgundy lingerie set at home",
    "Evie posing in a coordinated burgundy outfit",
    "Evie seated in a casual green outfit",
    "Evie posing indoors in warm light",
    "Evie posing in a bright room",
    "Evie taking a mirror selfie in a brown top and denim shorts",
    "Close-up portrait of Evie with soft makeup",
    "Evie in a pale blue outfit in front of a plain wall",
    "Evie standing in a pale green matching set",
    "Evie seated in a violet lingerie set",
    "Evie standing in a burgundy lace set",
    "Evie on a couch in a dark matching outfit",
    "Evie smiling for a casual mirror selfie"
  ]
};
  var activeSet='diary';
  var photoIndex=0;
  var lightbox=document.getElementById('lightbox');
  var lightboxImage=document.getElementById('lightboxImage');
  var lightboxCount=document.getElementById('lightboxCount');
  var bag=document.getElementById('bagDrawer');
  var bagPill=document.getElementById('bagPill');
  var cart=[];
  function singleQty(exclusive,name){
    return ['membership','of','vault'].includes(exclusive)||/monthly|renewal/i.test(name||'');
  }
  function saveCart(){
    try{sessionStorage.setItem('evie-bag-v2',JSON.stringify(cart))}catch(e){}
  }
  function loadCart(){
    try{
      var parsed=JSON.parse(sessionStorage.getItem('evie-bag-v2')||'[]');
      if(!Array.isArray(parsed))return;
      cart=parsed.filter(function(item){
        return item&&typeof item.name==='string'&&Number.isFinite(Number(item.price))&&item.qty>0;
      }).map(function(item){
        return {name:item.name,price:Number(item.price),qty:Math.min(10,Math.round(item.qty)),exclusive:item.exclusive||null};
      });
    }catch(e){cart=[]}
  }
  var toastTimer=null;
  function toast(message){
    var el=document.getElementById('addedToast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){el.classList.remove('show')},2200);
  }
  var lastLightboxTrigger=null;
  var lastBagTrigger=null;
  var reduceBehavior=reducedMotion?'instant':'smooth';

  function heroPosition(){
    var index=Math.min(heroSlides.length-1,Math.max(0,Math.round(heroRail.scrollLeft/Math.max(1,heroRail.clientWidth))));
    current.textContent=String(index+1).padStart(2,'0');
    document.getElementById('heroPrev').disabled=(index===0);
    document.getElementById('heroNext').disabled=(index===heroSlides.length-1);
  }
  function moveHero(direction){
    var index=Math.round(heroRail.scrollLeft/Math.max(1,heroRail.clientWidth));
    var next=Math.max(0,Math.min(heroSlides.length-1,index+direction));
    heroRail.scrollTo({left:next*heroRail.clientWidth,behavior:reduceBehavior});
  }
  document.getElementById('heroPrev').addEventListener('click',function(){moveHero(-1)});
  document.getElementById('heroNext').addEventListener('click',function(){moveHero(1)});
  heroRail.addEventListener('scroll',heroPosition,{passive:true});
  heroRail.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      e.preventDefault();
      moveHero(e.key==='ArrowRight'?1:-1);
    }
  });
  heroPosition();
  document.getElementById('galleryPrev').addEventListener('click',function(){
    galleryRail.scrollBy({left:-Math.round(galleryRail.clientWidth*.78),behavior:reduceBehavior});
  });
  document.getElementById('galleryNext').addEventListener('click',function(){
    galleryRail.scrollBy({left:Math.round(galleryRail.clientWidth*.78),behavior:reduceBehavior});
  });

  function updateLightbox(){
    var urls=photoSets[activeSet];
    lightboxImage.src=urls[photoIndex];
    lightboxImage.alt=photoAlts[activeSet][photoIndex]||'Kissed by Evie portrait';
    lightboxCount.textContent=String(photoIndex+1).padStart(2,'0')+' / '+String(urls.length).padStart(2,'0');
  }
  function openLightbox(setName,index,trigger){
    lastLightboxTrigger=trigger;
    activeSet=photoSets[setName]?setName:'diary';
    photoIndex=index;
    updateLightbox();
    lightbox.showModal();
  }
  function closeLightbox(){lightbox.close()}
  function shiftLightbox(delta){
    var urls=photoSets[activeSet];
    photoIndex=(photoIndex+delta+urls.length)%urls.length;
    updateLightbox();
  }
  photoButtons.forEach(function(btn){
    btn.addEventListener('click',function(){openLightbox(btn.dataset.set||'diary',Number(btn.dataset.photo),btn)});
  });
  heroSlides.forEach(function(slide){
    slide.addEventListener('click',function(e){
      if(e.target.closest('a,button'))return;
      if(slide.dataset.photo==null)return;
      openLightbox('hero',Number(slide.dataset.photo),slide);
    });
  });
  document.getElementById('closeLightbox').addEventListener('click',closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click',function(){shiftLightbox(-1)});
  document.getElementById('lightboxNext').addEventListener('click',function(){shiftLightbox(1)});
  lightbox.addEventListener('click',function(e){if(e.target===lightbox)closeLightbox()});
  lightbox.addEventListener('close',function(){if(lastLightboxTrigger)lastLightboxTrigger.focus()});
  var touchX=null;
  lightbox.addEventListener('touchstart',function(e){if(e.touches.length===1)touchX=e.touches[0].clientX},{passive:true});
  lightbox.addEventListener('touchend',function(e){
    if(touchX===null||!e.changedTouches.length)return;
    var dist=e.changedTouches[0].clientX-touchX;touchX=null;
    if(Math.abs(dist)>60)shiftLightbox(dist<0?1:-1);
  },{passive:true});
  document.addEventListener('keydown',function(e){
    if(!lightbox.open)return;
    if(e.key==='ArrowLeft'){e.preventDefault();shiftLightbox(-1)}
    if(e.key==='ArrowRight'){e.preventDefault();shiftLightbox(1)}
  });

  var tabs=Array.from(document.querySelectorAll('.category-tab'));
  var panels=Array.from(document.querySelectorAll('.product-panel'));
  function activateTab(tab){
    tabs.forEach(function(button){
      var selected=button===tab;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
    });
    panels.forEach(function(panel){panel.hidden=panel.id!=='panel-'+tab.dataset.tab});
  }
  tabs.forEach(function(tab,index){
    tab.addEventListener('click',function(){activateTab(tab)});
    tab.addEventListener('keydown',function(e){
      var next=index;
      if(e.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(e.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=tabs.length-1;
      else return;
      e.preventDefault();
      activateTab(tabs[next]);tabs[next].focus();
    });
  });

  function money(number){return '$'+Number(number).toFixed(0)}
  function cartTotal(){return cart.reduce(function(sum,item){return sum+item.price*item.qty},0)}
  function openBag(){
    lastBagTrigger=document.activeElement;
    renderCart();
    bag.showModal();
  }
  function closeBag(){bag.close()}
  document.getElementById('closeBag').addEventListener('click',closeBag);
  bagPill.addEventListener('click',openBag);
  bag.addEventListener('click',function(e){if(e.target===bag)closeBag()});
  bag.addEventListener('close',function(){if(lastBagTrigger&&lastBagTrigger.focus)lastBagTrigger.focus()});
  function addItem(name,price,exclusive){
    // Choose one membership or OnlyFans plan; avoid double-charging for included access.
    if(exclusive==='membership'){
      const isVip=/VIP Daddy|Ultimate VIP|Membership Renewal/i.test(name);
      cart=cart.filter(function(i){
        if(i.exclusive==='membership'||i.exclusive==='of')return false;
        if(isVip&&i.exclusive==='vault')return false;
        return true;
      });
    }
    if(exclusive==='of'&&cart.some(function(i){return i.exclusive==='membership'})){
      document.getElementById('cartFeedback').textContent='OnlyFans access is already included in your selected membership.';
      openBag();return;
    }
    if(exclusive==='of')cart=cart.filter(function(i){return i.exclusive!=='of'});
    if(exclusive==='vault'&&cart.some(function(i){return i.exclusive==='membership'&&/VIP Daddy|Ultimate VIP/i.test(i.name)})){
      document.getElementById('cartFeedback').textContent='Dropbox access is already included in your selected VIP Daddy package.';
      openBag();return;
    }
    var item=cart.find(function(existing){return existing.name===name});
    if(item){if(!singleQty(exclusive,name))item.qty++}
    else cart.push({name:name,price:price,qty:1,exclusive:exclusive||null});
    renderCart();
    toast('Added to your bag ♡');
    var feedback=document.getElementById('cartFeedback');
    feedback.textContent=name+' added to your bag.';
  }
  document.querySelectorAll('.add-product').forEach(function(button){
    button.addEventListener('click',function(){
      addItem(button.dataset.name,Number(button.dataset.price),button.dataset.exclusive||null);
      button.setAttribute('aria-label',button.dataset.name+' added to bag');
      window.setTimeout(function(){button.removeAttribute('aria-label')},1400);
    });
  });
  function modifyItem(name,delta){
    var item=cart.find(function(entry){return entry.name===name});
    if(!item|| (delta>0 && singleQty(item.exclusive,item.name)))return;
    item.qty+=delta;
    if(item.qty<=0)cart=cart.filter(function(entry){return entry!==item});
    renderCart();
  }
  function renderCart(){
    var lines=document.getElementById('cartLines');
    lines.replaceChildren();
    cart.forEach(function(item){
      var row=document.createElement('div');row.className='cart-item';
      var info=document.createElement('div');
      var name=document.createElement('strong');name.textContent=item.name;
      var price=document.createElement('small');price.textContent=money(item.price)+' each';
      info.append(name,price);
      var controls=document.createElement('div');controls.className='cart-controls';
      var minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Remove one '+item.name);minus.addEventListener('click',function(){modifyItem(item.name,-1)});
      var qty=document.createElement('span');qty.textContent=String(item.qty);qty.setAttribute('aria-label','Quantity '+item.qty);
      var plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Add one '+item.name);plus.disabled=singleQty(item.exclusive,item.name);plus.addEventListener('click',function(){modifyItem(item.name,1)});
      controls.append(minus,qty,plus);
      var subtotal=document.createElement('strong');subtotal.textContent=money(item.price*item.qty);
      var remove=document.createElement('button');remove.type='button';remove.className='remove-item';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+item.name+' from bag');
      remove.addEventListener('click',function(){cart=cart.filter(function(entry){return entry!==item});renderCart()});
      var right=document.createElement('div');right.style.textAlign='right';right.append(subtotal,controls,remove);
      row.append(info,right);lines.append(row);
    });
    if(!cart.length){
      var empty=document.createElement('p');empty.className='empty-cart';empty.textContent='Nothing in your bag yet. Pick something you love from the menu. ♡';lines.append(empty);
    }
    var voiceUpsell=document.getElementById('voiceNoteUpsell');
    if(voiceUpsell)voiceUpsell.hidden=cart.some(function(item){return item.name==='Voice Note'});
    document.getElementById('drawerTotal').textContent=money(cartTotal());
    document.getElementById('bagTotal').textContent=money(cartTotal());
    document.getElementById('bagCount').textContent=String(cart.reduce(function(sum,item){return sum+item.qty},0));
    document.getElementById('monthlyNote').hidden=!cart.some(function(item){return item.exclusive==='membership'||item.exclusive==='of'});
    document.getElementById('copyOrder').disabled=cart.length===0;
    document.getElementById('confirmOrder').disabled=cart.length===0;
    bagPill.classList.toggle('visible',cart.length>0);
    saveCart();
  }
  function orderMessage(){
    return 'Hey Evie ♡ Here are my picks:\n\n'+cart.map(function(item){
      return '• '+item.qty+' × '+item.name+' — '+money(item.price*item.qty);
    }).join('\n')+'\n\nEstimated total: '+money(cartTotal())+
    '\n\nMy Snap/Telegram: [your username]'+
    '\nExtras or requests: [optional]'+
    '\n\nPlease confirm availability, delivery time, final custom quotes and how to pay!';
  }
  async function copyOrderText(){
    var message=orderMessage();
    if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(message);
    else{
      var area=document.createElement('textarea');area.value=message;area.style.position='fixed';area.style.opacity='0';
      document.body.appendChild(area);area.select();var ok=document.execCommand('copy');area.remove();
      if(!ok)throw new Error('Copy not supported');
    }
  }
  document.getElementById('copyOrder').addEventListener('click',async function(){
    try{await copyOrderText();document.getElementById('cartFeedback').textContent='Copied! Paste into your preferred chat with Evie.'}
    catch(e){document.getElementById('cartFeedback').textContent='Copy unavailable. Please copy your item list manually.'}
  });
  const reviewOrder=document.getElementById('reviewOrder');
  if(reviewOrder)reviewOrder.addEventListener('click',function(){
    if(!cart.length){
      const hint=document.getElementById('reviewOrderHint');
      if(hint)hint.textContent='Choose an item above first ♡';
      document.getElementById('boutiqueCatalog').scrollIntoView({behavior:reduceBehavior,block:'start'});
      return;
    }
    openBag();
  });
  document.getElementById('confirmOrder').addEventListener('click',async function(){
    var feedback=document.getElementById('cartFeedback');
    try{
      await copyOrderText();
      feedback.textContent='Copied! Paste your picks into our Telegram chat and hit send ♡';
      window.location.assign('https://t.me/kissedbyevie');
    }catch(e){
      feedback.textContent='Copy failed. Tap Copy order only, then paste your picks into our chat.';
    }
  });
  var voiceButton=document.getElementById('addVoiceNote');
  if(voiceButton)voiceButton.addEventListener('click',function(){addItem('Voice Note',12,null)});
  loadCart();
  renderCart();
  window.EvieCart = {
    items: function(){return cart.map(function(i){return {name:i.name,qty:i.qty,price:i.price}})},
    total: cartTotal,
    close: closeBag,
    open: openBag,
    reset: function(){cart=[];renderCart()}
  };

  var progress=document.getElementById('scrollProgress');
  var scrollQueued=false;
  function onScroll(){
    if(scrollQueued)return;scrollQueued=true;
    requestAnimationFrame(function(){
      var available=document.documentElement.scrollHeight-window.innerHeight;
      progress.style.width=(available>0?Math.min(100,window.scrollY/available*100):0)+'%';
      document.querySelector('.site-header').classList.toggle('is-scrolled',window.scrollY>24);
      scrollQueued=false;
    });
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  if(!reducedMotion&&window.gsap&&window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.reveal').forEach(function(element){
      gsap.fromTo(element,{opacity:0,y:34},{opacity:1,y:0,duration:.85,ease:'power2.out',
        scrollTrigger:{trigger:element,start:'top 92%',once:true}});
    });

  }
})();
