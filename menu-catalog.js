(function(){
'use strict';
// KissedByEvie storefront: this is the single source of truth for item names and prices.
// Prices marked "from" are minimums; all orders are reviewed before payment.
const categories=[
  ["Bundles","Bundles"],
  ["VIP","VIP & GFE"],
  ["Customs","Customs"],
  ["More","Live & extras"]
];
const products=[
  {section:'BestSellers',name:'10 pics/vids',price:10,
   description:'Ten pics and vids. That’s the taste.'},
  {section:'BestSellers',name:'20 pics/vids',price:20,badge:'JUST A TASTE',
   description:'Twenty. Yes, it’s hard. That’s the point.'},
  {section:'BestSellers',name:'50 pics/vids',price:50,
   description:'Fifty pics and vids.'},
  {section:'BestSellers',name:'Deluxe Dropbox (900+ vault)',price:75,salePrice:55,wasPrice:75,group:'vault',badge:'BEST VALUE',
   description:'The whole vault. 900+ pics and videos. One payment, lifetime access.',
   note:'One Dropbox per order.',bagName:'Deluxe Dropbox Today Promo',todayOnly:true},
  {section:'BestSellers',name:'Deluxe Dropbox Today Promo',price:55,group:'vault',badge:'TODAY ONLY',promoOnly:true,
   description:'Same 900+ vault, today’s price. This is not an add-on to the $75 Dropbox.'},
  {section:'BestSellers',name:'B/G Folder (3 vids)',price:35,
   description:'Three B/G videos. That’s the folder.'},
  {section:'BestSellers',name:'Dick Rating',price:35,
   description:'On camera, out loud.'},
  {section:'BestSellers',name:'Custom 1-min Video',price:50,
   description:'One minute, your idea.'},
  {section:'BestSellers',name:'VIP 1 Month',price:150,group:'membership',badge:'VIP · ONE MONTH',
   description:'One month. Priority messages, casual FaceTimes, and me actually replying.',
   features:['One month of VIP','The 900+ vault','Priority messages and calls'],
   rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'},
  {section:'BestSellers',name:'VIP 3 Months',price:350,group:'membership',badge:'BEST VALUE',
   description:'Three months. This is the one people actually finish.',
   features:['Three months of VIP','The 900+ vault','Priority messages and calls'],
   rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'},
  {section:'Dropbox',name:'Deluxe Dropbox (900+ vault)',price:75,salePrice:55,wasPrice:75,group:'vault',
   description:'The whole thing. 900+ pics and videos. Lifetime access.',
   note:'One Dropbox per order.',bagName:'Deluxe Dropbox Today Promo',
   badge:'900+ ITEMS',todayOnly:true},
  {section:'Dropbox',name:'Deluxe Dropbox Today Promo',price:55,group:'vault',badge:'TODAY ONLY',promoOnly:true,
   description:'Same 900+ vault for $55 today.'},
  {section:'Dropbox',name:'B/G Folder (3 vids)',price:35,
   description:'Three B/G videos.'},
  {section:'VIP',name:'VIP 1 Month',price:150,group:'membership',badge:'$150',
   description:'One month of VIP. Priority messages and FaceTime eligibility.',
   features:['One month','900+ vault','Priority messages and calls'],
   rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'},
  {section:'VIP',name:'VIP 3 Months',price:350,group:'membership',badge:'$350',
   description:'Three months of VIP.',
   features:['Three months','900+ vault','Priority messages and calls'],
   rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'},
  {section:'VIP',name:'GFE',price:70,priceDisplay:'$70/mo',group:'membership',
   description:'The starter month. No vault and no explicit calls.',
   features:['Daily Snaps and clips','Priority replies','Casual calls only'],
   note:'This is not VIP, and it does not include the vault.'},
  {section:'Customs',name:'Custom 1-min Video',price:50,
   description:'One minute, your idea. Nothing starts until I’ve agreed.'},
  {section:'Customs',name:'Custom Photo Set · 5 Photos',price:45,
   description:'Five photos, exactly what you ask for. Add $7 for each one after that.'},
  {section:'Customs',name:'Custom Video · 3 Minutes',price:60,
   description:'Three minutes, your idea. Add $15 a minute after that. Anything unusual gets quoted before I start.'},
  {section:'Customs',name:'Same Day Turnaround',price:15,extra:true,
   description:'If my schedule allows. It usually doesn’t. Ask anyway.'},
  {section:'More',name:'Live Clips · Sent to Your Chat',price:10,
   description:'A few live clips, sent to your chat. Don’t ask what they are. You’ll see.'},
  {section:'More',name:'Moan Your Name',price:10,
   description:'Your name in my mouth on an approved custom. This version is just for you.'},
  {section:'More',name:'JOI Add-On',price:20,
   description:'Dirty talk and JOI on top of a session you already booked.'},
  {section:'More',name:'Voice Note',price:10,
   description:'Me, saying something to you specifically. I’ll be nice. Probably.'},
  {section:'More',name:'Sexting · 10 Minutes',price:30,unit:'text only',
   description:'Text only. Ten minutes.'},
  {section:'More',name:'Sexting · 15 Minutes',price:40,unit:'text only',
   description:'Fifteen. Use them well.'},
  {section:'More',name:'Sexting · 30 Minutes',price:75,unit:'text only',
   description:'Half an hour of my full attention. That’s a lot of time I could be making sales.'},
  {section:'More',name:'Live Snap Show · 2 Minutes',price:35,
   description:'Like a FaceTime, except I don’t have to look at you. Sit back and watch. Includes a few live pics. Content only, no extended chatting or dirty talk.'},
  {section:'More',name:'Live Snap Show · 4 Minutes',price:60,
   description:'Four minutes, plus a few live pics. Content only, no extended chatting or dirty talk.'}
];
const notes={
  "Bundles": [],
  "VIP": [],
  "Customs": [
    "Give me a real idea and I’ll get into it. Tell me what to do or where to aim. I’ll make a real mess and send you the evidence. :)"
  ],
  "More": [
    "Live things get scheduled with me. I confirm the time before you pay. Don’t send money for a live without a confirmed time."
  ]
};
const root=document.getElementById('boutiqueCatalog');
if(!root)return;
const intro=document.createElement('div');intro.className='menu-picker-intro';
const introHeading=document.createElement('h3');introHeading.className='menu-picker-title';introHeading.textContent='Pick a category.';
const introHint=document.createElement('p');introHint.className='menu-helper';introHint.textContent='Choose what you want. I’ll confirm the total before you pay.';
intro.append(introHeading,introHint);root.append(intro);
const controls=document.createElement('div');controls.className='menu-category-controls';
const tabs=document.createElement('div');tabs.className='category-tabs';
tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Content menu categories');
controls.append(tabs);
root.append(controls);
function el(tag,cls,value){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!=null)node.textContent=value;
 return node;
}
categories.forEach(([key,label],i)=>{
 const tab=el('button','category-tab'+(i===0?' active':''));
 tab.type='button';tab.id='tab-'+key;tab.dataset.tab=key;
 tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(i===0));
 tab.setAttribute('aria-controls','panel-'+key);tab.tabIndex=i===0?0:-1;
 if(key==='Dropbox'){
  const icon=el('img','category-brand-mark');
  icon.src='/assets/brand/dropbox-mark.webp';icon.alt='';icon.width=22;icon.height=22;
  tab.append(icon, document.createTextNode(label));
 }else{
  tab.textContent=label;
 }
 tabs.append(tab);
});
// OnlyFans takes visitors to the creator's actual profile, not the shopping bag.
const onlyfans=el('a','onlyfans-quiet');
onlyfans.href='https://onlyfans.com/kissedbyevie';
onlyfans.target='_blank';onlyfans.rel='noopener noreferrer';
onlyfans.setAttribute('aria-label','Open the OnlyFans free trial for Kissed by Evie in a new tab');
const onlyfansIcon=el('img','onlyfans-brand-icon');
onlyfansIcon.src='/assets/brand/onlyfans-mark.webp';onlyfansIcon.alt='';onlyfansIcon.width=26;onlyfansIcon.height=26;
onlyfans.append(onlyfansIcon,el('span','','Free OnlyFans trial'));
controls.append(onlyfans);
function menuAction(p){
  const price=Number.isFinite(p.salePrice)?p.salePrice:p.price;
  const display=p.priceDisplay||('$'+price);
  const request=p.section==='Customs'||(p.name&&p.name.includes('Custom'));
  return {label:(request?'Request · ':'Add · ')+display,variant:'btn-primary'};
}
function cardMood(p, section){
  if(section!=='BestSellers')return 'calm';
  if(p.name==='VIP 3 Months')return 'hero-vip';
  if(p.name==='Deluxe Dropbox (900+ vault)')return 'hero-deluxe';
  if(p.name==='20 pics/vids')return 'hero-sweet';
  return 'calm';
}
const TEASERS={
  'Deluxe Dropbox (900+ vault)':'/assets/photos/evie-gallery-16.webp',
  'VIP 1 Month':'/assets/photos/evie-gallery-15.webp',
  'VIP 3 Months':'/assets/photos/evie-gallery-20.webp',
  '20 pics/vids':'/assets/photos/evie-gallery-17.webp',
  '10 pics/vids':'/assets/photos/evie-gallery-19.webp',
  '50 pics/vids':'/assets/photos/evie-gallery-23.webp',
  'B/G Folder (3 vids)':'/assets/photos/evie-gallery-18.webp',
  'Dick Rating':'/assets/photos/evie-gallery-08.jpg',
  'Custom 1-min Video':'/assets/photos/evie-gallery-13.jpg',
  'Custom Photo Set · 5 Photos':'/assets/photos/evie-gallery-14.jpg',
  'Custom Video · 3 Minutes':'/assets/photos/evie-gallery-12.jpg',
  'GFE':'/assets/photos/evie-gallery-15.webp',
  'Live Clips · Sent to Your Chat':'/assets/photos/evie-gallery-11.jpg',
  'Moan Your Name':'/assets/photos/evie-gallery-09.jpg',
  'JOI Add-On':'/assets/photos/evie-gallery-10.jpg',
  'Voice Note':'/assets/photos/evie-gallery-07.jpg',
  'Sexting · 10 Minutes':'/assets/photos/evie-gallery-06.jpg',
  'Sexting · 15 Minutes':'/assets/photos/evie-gallery-05.jpg',
  'Sexting · 30 Minutes':'/assets/photos/evie-gallery-04.jpg',
  'Live Snap Show · 2 Minutes':'/assets/photos/evie-gallery-03.jpg',
  'Live Snap Show · 4 Minutes':'/assets/photos/evie-gallery-02.jpg',
  'Same Day Turnaround':'/assets/photos/evie-gallery-01.jpg'
};
function isCustomsCard(p, section){
  if(section==='Customs')return true;
  const name=(p&&p.name)||'';
  return /custom/i.test(name);
}
function teaserFor(name){return TEASERS[name]||''}
function appendTeaser(card, p, section){
  if(!isCustomsCard(p, section))return;
  const src=teaserFor(p.name);
  if(!src)return;
  const wrap=el('div','card-teaser');
  const img=el('img','card-teaser-img');
  img.src=src;
  img.alt='';
  img.loading='lazy';
  img.decoding='async';
  img.width=640;img.height=800;
  wrap.append(img);
  card.append(wrap);
}
function buildCard(p, section, mood){
  const card=el('article','product-card menu-v2-card'+(p.badge?' featured':'')+(mood==='calm'?' card-calm':''));
  appendTeaser(card,p,section);
  if(p.todayOnly||p.salePrice===55){
    card.append(el('p','today-only-banner','Today only: $55 (was $75) + live pics if u pay today'));
  }
  if(mood==='hero-vip')card.classList.add('hero-card','hero-card--vip');
  if(mood==='hero-deluxe')card.classList.add('hero-card','hero-card--deluxe');
  if(mood==='hero-sweet')card.classList.add('hero-card','hero-card--sweet');
  if(mood==='hero-deluxe'){
    card.append(el('span','holo'));
    const charm=el('img','hero-deluxe-charm');
    charm.src='/assets/brand/dropbox.webp';charm.alt='';
    card.append(charm);
  }
  if(mood==='hero-vip'){
    const crown=document.createElementNS('http://www.w3.org/2000/svg','svg');
    crown.setAttribute('class','hero-crown');
    crown.setAttribute('viewBox','0 0 24 24');
    crown.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('fill','currentColor');
    path.setAttribute('d','M3 18h18v2H3v-2zm1.5-8 3.2 4.2L12 6l4.3 8.2L19.5 10 21 16H3l1.5-6z');
    crown.append(path);
    card.append(crown);
  }
  const info=el('div','menu-v2-info');
  if(p.badge)info.append(el('span','menu-v2-badge',p.badge));
  info.append(el('h3','card-label',p.name));
  if(p.unit)info.append(el('p','menu-v2-unit',p.unit));
  info.append(el('p','menu-v2-desc',p.description));
  if(p.features&&p.features.length){
    const list=el('ul','menu-v2-features');
    p.features.forEach(item=>list.append(el('li','',item)));
    info.append(list);
  }
  if(p.note)info.append(el('p','menu-v2-fine',p.note));
  if(p.rule)info.append(el('p','menu-v2-rule',p.rule));
  const onSale=Number.isFinite(p.salePrice);
  const effectivePrice=onSale?p.salePrice:(p.price);
  const amount=el('strong','offer-price',p.priceDisplay||((p.extra?'+':'')+'$'+effectivePrice+(p.from?'+':'')));
  const priceStack=el('div','price-stack');
  if(onSale){
    amount.textContent='$'+p.salePrice+' (was $'+p.wasPrice+')';
  }
  priceStack.append(amount);

  const cta=menuAction(p);
  const action=el('button','offer-btn add-product btn '+cta.variant);
  action.type='button';
  const baseName=(p.bagName||p.name)+(p.from?' (starting at $'+effectivePrice+')':'');
  action.dataset.name=baseName;
  action.dataset.price=String(effectivePrice);
  action.dataset.cta=cta.label;
  if(p.group)action.dataset.exclusive=p.group;
  if(p.quoteOnly)action.dataset.exclusive='quote';
  action.append(el('span','menu-v2-add-label',cta.label));
  let categorySelect=null;
  const addonInputs=[];
  function refreshChoices(){
    const addons=addonInputs.filter(entry=>entry.input.checked).map(entry=>entry.addon);
    const parts=[];
    if(categorySelect&&categorySelect.value)parts.push(categorySelect.value);
    addons.forEach(addon=>parts.push(addon.label+' (+$'+addon.price+')'));
    const selectedName=baseName+(parts.length?' | '+parts.join(' | '):'');
    const selectedPrice=effectivePrice+addons.reduce((sum,addon)=>sum+addon.price,0);
    action.dataset.name=selectedName;
    action.dataset.price=String(selectedPrice);
    action.disabled=!!(categorySelect&&!categorySelect.value);
    action.setAttribute('aria-label',p.quoteOnly?cta.label+': '+selectedName+'. Price to be confirmed before payment.':cta.label+': '+selectedName+', $'+selectedPrice+'. Adds to your bag for review.');
    if(!onSale&&!p.quoteOnly&&p.addons&&p.addons.length)amount.textContent='$'+selectedPrice;
  }
  if(p.pickCategory){
    const categoryLabel=el('label','menu-v2-choice-label','Pick a category');
    categorySelect=el('select','menu-v2-category-select');
    const categoryId='menu-category-'+section+'-'+Math.random().toString(36).slice(2,7);
    categorySelect.id=categoryId;categoryLabel.htmlFor=categoryId;
    const prompt=el('option','','Choose a category');prompt.value='';prompt.disabled=true;prompt.selected=true;categorySelect.append(prompt);
    ['Solo','B/G','Squirt','Dildo','Feet','Surprise me'].forEach(function(choice){const opt=el('option','',choice);opt.value=choice;categorySelect.append(opt)});
    categorySelect.addEventListener('change',refreshChoices);
    info.append(categoryLabel,categorySelect);
  }
  if(p.addons&&p.addons.length){
    const addonSet=el('fieldset','menu-v2-addons');
    addonSet.append(el('legend','menu-v2-addon-heading','Make it yours'));
    p.addons.forEach((addon,j)=>{
      const label=el('label','menu-v2-addon');
      const input=document.createElement('input');
      input.type='checkbox';
      input.name='addon-'+section+'-'+j+'-'+Math.random().toString(36).slice(2,7);
      input.value=addon.label;
      input.addEventListener('change',refreshChoices);
      label.append(input,el('span','',addon.label+' (+$'+addon.price+')'));
      addonInputs.push({input,addon});
      addonSet.append(label);
    });
    info.append(addonSet);
  }
  const checkoutItemIds={
   '10 pics/vids':'bundle10','20 pics/vids':'bundle20','50 pics/vids':'bundle50',
   'Deluxe Dropbox (900+ vault)':'deluxe','B/G Folder (3 vids)':'bg','Dick Rating':'dickrate',
   'Custom 1-min Video':'custom1','VIP 1 Month':'vip1','VIP 3 Months':'vip3'
  };
  const sku=p.salePrice===55?'deluxe55':checkoutItemIds[p.name];
  let payLink=null;
  if(sku){
   payLink=el('a','menu-pay-link','Checkout');
   payLink.href='/checkout?item='+sku+(sku==='deluxe55'?'&promo=55':'');
  }else{
   payLink=el('button','menu-pay-link checkout-now','Checkout');
   payLink.type='button';
  }
  refreshChoices();
  function syncPayLink(){
   if(payLink.tagName!=='BUTTON')return;
   payLink.dataset.name=action.dataset.name;
   payLink.dataset.price=action.dataset.price;
   if(action.dataset.exclusive)payLink.dataset.exclusive=action.dataset.exclusive;
   else delete payLink.dataset.exclusive;
   payLink.disabled=action.disabled;
  }
  const originalRefresh=refreshChoices;
  refreshChoices=function(){originalRefresh();syncPayLink();};
  refreshChoices();
  const actions=el('div','menu-actions');
  actions.append(action);
  const buy=el('div','menu-v2-buy');buy.append(priceStack,actions);
  card.append(info,buy);
  return card;
}
function findProduct(name){
  const all=products.filter(p=>p.name===name && !p.promoOnly);
  if(!all.length)return null;
  if(name==='Deluxe Dropbox (900+ vault)')return all.find(p=>p.salePrice===55)||all[0];
  return all[0];
}
function productsFor(section){
  const names={
    Bundles:['10 pics/vids','50 pics/vids','B/G Folder (3 vids)','Dick Rating'],
    VIP:['VIP 3 Months','GFE'],
    Customs:['Custom 1-min Video','Custom Photo Set · 5 Photos','Custom Video · 3 Minutes','Same Day Turnaround'],
    More:['Live Clips · Sent to Your Chat','Moan Your Name','JOI Add-On','Voice Note','Sexting · 10 Minutes','Sexting · 15 Minutes','Sexting · 30 Minutes','Live Snap Show · 2 Minutes','Live Snap Show · 4 Minutes']
  };
  return (names[section]||[]).map(findProduct).filter(Boolean);
}

const showcase=el('section','menu-showcase');
showcase.setAttribute('aria-labelledby','showcaseHeading');
showcase.append(el('p','menu-showcase-kicker','Start here'));
showcase.append(el('h2','menu-showcase-title','The vault, VIP, or just a taste.'));
const showGrid=el('div','menu-showcase-grid');
const showItems=[
  {
    product:findProduct('Deluxe Dropbox (900+ vault)'),
    mood:'deluxe',
    eyebrow:'The vault',
    badge:'Today only',
    title:'Deluxe Dropbox',
    blurb:'900+ in the vault. One payment, lifetime access.',
    banner:'Today only: $55 (was $75) + live pics if u pay today',
    mark:{src:'/assets/brand/dropbox-mark.webp',cls:'hero-mark',w:28,h:28}
  },
  {
    product:findProduct('VIP 1 Month'),
    mood:'vip',
    eyebrow:'Membership',
    badge:'VIP · one month',
    title:'VIP 1 Month',
    blurb:'One month. Priority messages, casual FaceTimes, and me actually replying.',
    rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'
  },
  {
    product:findProduct('20 pics/vids'),
    mood:'sweet',
    eyebrow:'Just a taste',
    badge:'',
    title:'20 pics/vids',
    blurb:'Twenty. Yes, it’s hard. That’s the point.',
    mark:{src:'/assets/charms/cherries.webp',cls:'hero-mark hero-mark--cherries',w:36,h:36}
  }
];
showItems.forEach(function(item){
  const p=item.product;
  if(!p)return;
  const card=el('article','hero-offer hero-offer--'+item.mood);
  if(item.mark){
    const img=el('img',item.mark.cls);
    img.src=item.mark.src;img.alt='';img.width=item.mark.w;img.height=item.mark.h;
    card.append(img);
  }
  if(item.banner)card.append(el('p','today-only-banner',item.banner));
  card.append(el('p','eyebrow',item.eyebrow));
  if(item.badge)card.append(el('span','badge',item.badge));
  card.append(el('h3','',item.title));
  const onSale=Number.isFinite(p.salePrice);
  const effective=onSale?p.salePrice:p.price;
  const price=el('p','price',onSale?('$'+p.salePrice+' (was $'+p.wasPrice+')'):(p.priceDisplay||('$'+p.price)));
  card.append(price);
  card.append(el('p','blurb',item.blurb));
  if(item.rule)card.append(el('p','menu-v2-rule',item.rule));
  const cta=menuAction(p);
  const btn=el('button','hero-cta offer-btn add-product btn '+cta.variant);
  btn.type='button';
  btn.dataset.name=p.bagName||p.name;
  btn.dataset.price=String(effective);
  btn.dataset.cta=cta.label;
  if(p.group)btn.dataset.exclusive=p.group;
  btn.append(el('span','menu-v2-add-label',cta.label));
  card.append(btn);
  showGrid.append(card);
});
showcase.append(showGrid);
root.insertBefore(showcase, controls);

categories.forEach(([section],i)=>{
 const panel=el('div','product-panel menu-v2-panel');
 panel.id='panel-'+section;
 panel.setAttribute('role','tabpanel');
 panel.setAttribute('aria-labelledby','tab-'+section);
 panel.hidden=i!==0;
 const categoryProducts=productsFor(section);
 if(section==='Customs'){
   const customsIntro=el('div','customs-intro');
   customsIntro.append(el('p','','Tell me the idea. Nothing starts until I agree.'));
   panel.append(customsIntro);
 }
 const grid=el('div','menu-calm-grid');
 categoryProducts.forEach(p=>grid.append(buildCard(p,section,'calm')));
 panel.append(grid);
 const noteKey=section;
 const list=notes[noteKey]||[];
 if(list.length){
   const note=el('div','menu-v2-notes');
   list.forEach(s=>note.append(el('p','',s)));
   panel.append(note);
 }
 root.append(panel);
});
})();
