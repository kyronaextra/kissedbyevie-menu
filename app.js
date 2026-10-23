'use strict';
(function(){
  var reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroRail=document.getElementById('heroRail');
  var heroSlides=Array.from(heroRail.querySelectorAll('.hero-slide'));
  var galleryRail=document.getElementById('galleryRail');
  var current=document.getElementById('heroCurrent');
  var photoButtons=Array.from(document.querySelectorAll('[data-photo]'));
  var photoUrls=[
    'https://pbs.twimg.com/media/HUx87RPbsAATeex.jpg',
    'https://pbs.twimg.com/media/HS3eluHbsAAuNxr.jpg',
    'https://pbs.twimg.com/media/HU2FhiLbgAA9HPS.jpg',
    'https://pbs.twimg.com/media/HUxyhppaYAAxpLh.jpg',
    'https://pbs.twimg.com/media/HU2FhiZa4AAz9i9.jpg',
    'https://pbs.twimg.com/media/HUxsmjNaAAABEJJ.jpg',
    'https://pbs.twimg.com/media/HU2FhiVbcAA45Zo.jpg',
    'https://pbs.twimg.com/media/HS3elt-aQAA3x0C.jpg'
  ];
  var photoIndex=0;
  var lightbox=document.getElementById('lightbox');
  var lightboxImage=document.getElementById('lightboxImage');
  var lightboxCount=document.getElementById('lightboxCount');
  var bag=document.getElementById('bagDrawer');
  var bagPill=document.getElementById('bagPill');
  var cart=[];
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
    lightboxImage.src=photoUrls[photoIndex];
    lightboxImage.alt='Kissed by Evie photo '+(photoIndex+1)+' of '+photoUrls.length;
    lightboxCount.textContent=String(photoIndex+1).padStart(2,'0')+' / '+String(photoUrls.length).padStart(2,'0');
  }
  function openLightbox(index,trigger){
    lastLightboxTrigger=trigger;
    photoIndex=index;
    updateLightbox();
    lightbox.showModal();
  }
  function closeLightbox(){lightbox.close()}
  function shiftLightbox(delta){photoIndex=(photoIndex+delta+photoUrls.length)%photoUrls.length;updateLightbox()}
  photoButtons.forEach(function(btn){
    btn.addEventListener('click',function(){openLightbox(Number(btn.dataset.photo),btn)});
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
    if(exclusive==='bundle')cart=cart.filter(function(item){return item.exclusive!=='bundle'});
    var item=cart.find(function(existing){return existing.name===name});
    if(item){if(exclusive==='bundle')item.qty=1;else item.qty++}
    else cart.push({name:name,price:price,qty:1,exclusive:exclusive||null});
    renderCart();
    bagPill.classList.add('visible');
    var feedback=document.getElementById('cartFeedback');
    feedback.textContent='';
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
    if(!item)return;
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
      var plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Add one '+item.name);plus.addEventListener('click',function(){modifyItem(item.name,1)});
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
    document.getElementById('monthlyNote').hidden=!cart.some(function(item){return item.name==='Daddy Package Monthly'});
    document.getElementById('copyOrder').disabled=cart.length===0;
  }
  document.getElementById('copyOrder').addEventListener('click',async function(){
    var message='Kissed by Evie order request\n'+cart.map(function(item){return item.qty+' × '+item.name+' — '+money(item.price*item.qty)}).join('\n')+'\nEstimated initial total: '+money(cartTotal())+'\nPlease confirm availability and payment instructions.';
    var feedback=document.getElementById('cartFeedback');
    try{
      if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(message);
      else{
        var textArea=document.createElement('textarea');textArea.value=message;textArea.style.position='fixed';textArea.style.opacity='0';document.body.appendChild(textArea);textArea.select();
        var success=document.execCommand('copy');textArea.remove();if(!success)throw new Error('Copy not supported');
      }
      feedback.textContent='Order copied. Paste it into your Telegram message.';
    }catch(e){feedback.textContent='Could not copy automatically. Please select your items and total above.'}
  });
  renderCart();

  var progress=document.getElementById('scrollProgress');
  var scrollQueued=false;
  function onScroll(){
    if(scrollQueued)return;scrollQueued=true;
    requestAnimationFrame(function(){
      var available=document.documentElement.scrollHeight-window.innerHeight;
      progress.style.width=(available>0?Math.min(100,window.scrollY/available*100):0)+'%';
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
