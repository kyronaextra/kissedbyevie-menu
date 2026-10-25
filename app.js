'use strict';
(function(){
  var reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroRail=document.getElementById('heroRail');
  var heroSlides=Array.from(heroRail.querySelectorAll('.hero-slide'));
  var galleryRail=document.getElementById('galleryRail');
  var current=document.getElementById('heroCurrent');
  var photoButtons=Array.from(document.querySelectorAll('[data-photo]'));
  var photoSets={
    hero:[
      'https://pbs.twimg.com/media/HUx87RPbsAATeex.jpg',
      'https://pbs.twimg.com/media/HVVP5Y0aQAEXPXT.jpg',
      'https://pbs.twimg.com/media/HVVPymJakAALc0v.jpg',
      'https://pbs.twimg.com/media/HSskohOagAAA6CG.jpg'
    ],
    diary:[
      'https://pbs.twimg.com/media/HVVP5Y5aIAAe901.jpg',
      'https://pbs.twimg.com/media/HSskohNa0AA6DBF.jpg',
      'https://pbs.twimg.com/media/HS3eluHbsAAuNxr.jpg',
      'https://pbs.twimg.com/media/HS3elt-aQAA3x0C.jpg'
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
    return exclusive==='bundle'||exclusive==='daddy'||exclusive==='deal'||/monthly/i.test(name||'');
  }
  function saveCart(){
    try{sessionStorage.setItem('evie-bag-v1',JSON.stringify(cart))}catch(e){}
  }
  function loadCart(){
    try{
      var parsed=JSON.parse(sessionStorage.getItem('evie-bag-v1')||'[]');
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
    lightboxImage.alt='Kissed by Evie photo '+(photoIndex+1)+' of '+urls.length;
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
    if(['bundle','daddy','deal'].includes(exclusive))cart=cart.filter(function(i){return i.exclusive!==exclusive});
    if(exclusive==='daddy')cart=cart.filter(function(i){return i.name!=='Deluxe Dropbox / Full Vault'});
    if(exclusive==='vault'&&cart.some(function(i){return i.exclusive==='daddy'})){document.getElementById('cartFeedback').textContent='Vault is included in the Daddy Package.';openBag();return;}
    var item=cart.find(function(existing){return existing.name===name});
    if(item){if(!singleQty(exclusive,name))item.qty++}
    else cart.push({name:name,price:price,qty:1,exclusive:exclusive||null});
    renderCart();
    toast(name+' added');
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
      var empty=document.createElement('p');empty.className='empty-cart';empty.textContent='Your bag is waiting. Explore the boutique to add something you love.';lines.append(empty);
    }
    document.getElementById('drawerTotal').textContent=money(cartTotal());
    document.getElementById('bagTotal').textContent=money(cartTotal());
    document.getElementById('bagCount').textContent=String(cart.reduce(function(sum,item){return sum+item.qty},0));
    document.getElementById('monthlyNote').hidden=!cart.some(function(item){return /monthly/i.test(item.name)});
    document.getElementById('copyOrder').disabled=cart.length===0;
    document.getElementById('confirmOrder').disabled=cart.length===0;
    bagPill.classList.toggle('visible',cart.length>0);
    saveCart();
  }
  function orderMessage(){
    return 'Hi Evie! I would like to order:\n\n'+cart.map(function(item){
      return '• '+item.qty+' × '+item.name+' — '+money(item.price*item.qty);
    }).join('\n')+'\n\nEstimated total: '+money(cartTotal())+
    '\n\nMy username: [add your Snapchat/Telegram username]'+
    '\nSpecial requests / add-ons: [optional]'+
    '\n\nPlease confirm availability, final price and payment instructions. Thank you!';
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
  document.getElementById('confirmOrder').addEventListener('click',async function(){
    var feedback=document.getElementById('cartFeedback');
    try{
      await copyOrderText();
      feedback.textContent='Order copied. Opening Telegram — paste your order into the chat and send it.';
      window.open('https://t.me/kissedbyevie','_blank','noopener,noreferrer');
    }catch(e){
      feedback.textContent='Could not copy automatically. Copy your order manually before opening Telegram.';
    }
  });
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
    if(window.matchMedia('(min-width: 801px)').matches){
      gsap.fromTo('.vault-emblem',{y:-15},{y:25,ease:'none',scrollTrigger:{trigger:'.vault-section',start:'top bottom',end:'bottom top',scrub:true}});
    }
  }
})();
