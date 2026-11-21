(function(){
'use strict';
// KissedByEvie storefront: this is the single source of truth for item names and prices.
// Prices marked "from" are minimums; all orders are reviewed before payment.
const categories=[
  ["BestSellers","Best sellers"],
  ["Dropbox","The Dropbox"],
  ["VIP","VIP Access"],
  ["Customs","Customs"],
  ["More","More"]
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
   note:'Sale price $55. Was $75. One Dropbox per order.',bagName:'Deluxe Dropbox Today Promo'},
  {section:'BestSellers',name:'Deluxe Dropbox Today Promo',price:55,group:'vault',badge:'TODAY ONLY',promoOnly:true,
   description:'Same 900+ vault, today’s price. This is not an add-on to the $75 Dropbox.'},
  {section:'BestSellers',name:'B/G Folder (3 vids)',price:35,
   description:'Three B/G videos. That’s the folder.'},
  {section:'BestSellers',name:'Dick Rating',price:35,
   description:'On camera, out loud. $35.'},
  {section:'BestSellers',name:'Custom 1-min Video',price:50,
   description:'One minute, your idea. $50.'},
  {section:'BestSellers',name:'VIP 1 Month',price:150,group:'membership',badge:'VIP · ONE MONTH',
   description:'One month. Priority messages, casual FaceTimes, and me actually replying.',
   features:['One month of VIP','The 900+ vault','Priority messages and calls'],
   note:'FaceTime eligibility comes with VIP. Checkout charges $150.'},
  {section:'BestSellers',name:'VIP 3 Months',price:350,group:'membership',badge:'BEST VALUE',
   description:'Three months. This is the one people actually finish.',
   features:['Three months of VIP','The 900+ vault','Priority messages and calls'],
   note:'Checkout charges $350 for the three months.'},
  {section:'Dropbox',name:'Deluxe Dropbox (900+ vault)',price:75,salePrice:55,wasPrice:75,group:'vault',
   description:'The whole thing. 900+ pics and videos. Lifetime access.',
   note:'Sale price $55. Was $75. JOI, B/G, solo, clips, and the rest of the vault.',bagName:'Deluxe Dropbox Today Promo',
   badge:'900+ ITEMS'},
  {section:'Dropbox',name:'Deluxe Dropbox Today Promo',price:55,group:'vault',badge:'TODAY ONLY',promoOnly:true,
   description:'Same 900+ vault for $55 today.'},
  {section:'Dropbox',name:'B/G Folder (3 vids)',price:35,
   description:'Three B/G videos.'},
  {section:'VIP',name:'VIP 1 Month',price:150,group:'membership',badge:'$150',
   description:'One month of VIP. Priority messages and FaceTime eligibility.',
   features:['One month','900+ vault','Priority messages and calls']},
  {section:'VIP',name:'VIP 3 Months',price:350,group:'membership',badge:'$350',
   description:'Three months of VIP.',
   features:['Three months','900+ vault','Priority messages and calls'],
   note:'$350 for the three months.'},
  {section:'VIP',name:'GFE',price:70,priceDisplay:'$70/mo',group:'membership',
   description:'The starter month. No vault and no explicit calls.',
   features:['Daily Snaps and clips','Priority replies','Casual calls only'],
   note:'This is not VIP. VIP is $150 for one month or $350 for three.'},
  {section:'Customs',name:'Custom 1-min Video',price:50,
   description:'One minute, your idea. $50 on the card and at checkout.'},
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
  "BestSellers": [
    "These card prices are the checkout prices. 10 is $10, 20 is $20, 50 is $50, the vault is $75, B/G is $35, a dick rating is $35, a 1-minute custom is $50, VIP is $150 or $350."
  ],
  "Dropbox": [
    "The 900+ vault is $75. One Dropbox per order."
  ],
  "VIP": [
    "VIP 1 Month is $150. VIP 3 Months is $350. GFE is the separate $70 starter and does not include the vault."
  ],
  "Customs": [
    "A custom 1-minute video is $50. A 5-photo set is $45, plus $7 a photo after that. A 3-minute video is $60, plus $15 a minute after that. Rush is $15. Nothing starts until I’ve agreed.",
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
 const tab=el('button','category-tab'+(i===0?' active':''),label);
 tab.type='button';tab.id='tab-'+key;tab.dataset.tab=key;
 tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(i===0));
 tab.setAttribute('aria-controls','panel-'+key);tab.tabIndex=i===0?0:-1;
 tabs.append(tab);
});
// OnlyFans takes visitors to the creator's actual profile, not the shopping bag.
const onlyfans=el('a','onlyfans-category-link');
onlyfans.href='https://onlyfans.com/kissedbyevie';
onlyfans.target='_blank';onlyfans.rel='noopener noreferrer';
onlyfans.setAttribute('aria-label','Open the OnlyFans free trial for Kissed by Evie in a new tab');
const onlyfansIcon=el('img','onlyfans-brand-icon');
onlyfansIcon.src='/assets/onlyfans-icon.svg';onlyfansIcon.alt='';onlyfansIcon.width=23;onlyfansIcon.height=23;
onlyfans.append(onlyfansIcon,el('span','','START MY FREE TRIAL'));
controls.append(onlyfans);
function menuAction(p){
  if(p.name==='GFE')return {label:'Try me · $70',variant:'btn-primary'};
  if(p.name==='20 pics/vids')return {label:'Fine. $20',variant:'btn-primary'};
  if(p.name==='VIP 1 Month')return {label:'Go VIP · $150',variant:'btn-primary'};
  if(p.name==='VIP 3 Months')return {label:'Go VIP · $350',variant:'btn-primary'};
  if(p.name==='Deluxe Dropbox Today Promo'||p.salePrice===55)return {label:'Add to bag',variant:'btn-primary'};
  if(p.name==='Dick Rating')return {label:'Add · $35',variant:'btn-primary'};
  if(p.name==='Custom 1-min Video')return {label:'Request this custom',variant:'btn-primary'};
  if(p.quoteOnly)return {label:'Request a quote',variant:'btn-secondary'};
  if(p.name==='Evidence Mystery Box')return {label:'Make my mystery box',variant:'btn-spotlight'};
  if(p.name.startsWith('Evidence Mystery Bag'))return {label:'Choose this evidence bag',variant:'btn-primary'};
 if(p.section==='VideoCalls')return {label:'Request this video call',variant:'btn-primary'};
 if(p.group==='vault')return {label:'Add to bag',variant:'btn-primary'};
  if(p.name==='Live Clips · Sent to Your Chat')return {label:'Add these clips',variant:'btn-primary'};
  if(p.name.includes('Live Teasy Snaps'))return {label:'Pick this pack',variant:'btn-primary'};
  if(p.name.startsWith('Live Snap Show'))return {label:'Choose this live',variant:'btn-primary'};
 if(p.name.includes('Sexting'))return {label:'Choose this session',variant:'btn-primary'};
 if(p.name.includes('Phone Call'))return {label:'Request a call',variant:'btn-secondary'};
 if(p.name.includes('Custom'))return {label:'Request this custom',variant:'btn-primary'};
 if(p.section==='Mid')return {label:'Add this pick',variant:'btn-primary'};
 return {label:'Add to bag',variant:'btn-secondary'};
}
categories.forEach(([section],i)=>{
 const panel=el('div','product-panel menu-v2-panel'+(section==='VIP'?' vip-three':''));
 panel.id='panel-'+section;
 panel.setAttribute('role','tabpanel');
 panel.setAttribute('aria-labelledby','tab-'+section);
 panel.hidden=i!==0;
 const categoryProducts=products.filter(p=>p.section===section && !p.promoOnly);
 if(section==='Customs'){
   const customsIntro=el('div','customs-intro');
   customsIntro.append(el('p','','Tell me the idea. Nothing starts until I agree.'));
   panel.append(customsIntro);
 }
 if(section==='More'){
   categoryProducts.push(...products.filter(p=>p.section==='VideoCalls'));
 }
 let videoHeadingAdded=false;
 categoryProducts.forEach(p=>{
   if(p.section==='VideoCalls'&&!videoHeadingAdded){
     const videoHeading=el('div','video-call-intro');
     videoHeading.append(el('h3','','VIDEO CALLS. MY RATES, MY RULES.'),el('p','','Calls are scheduled and approved by me before payment.'));
     panel.append(videoHeading);
     videoHeadingAdded=true;
   }
   const card=el('article','product-card menu-v2-card'+(p.badge?' featured':''));
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
    const onSale=Number.isFinite(p.salePrice);
    const effectivePrice=onSale?p.salePrice:(p.price);
    const amount=el('strong','offer-price',p.priceDisplay||((p.extra?'+':'')+'$'+effectivePrice+(p.from?'+':'')));
    const priceStack=el('div','price-stack');
    if(onSale)priceStack.append(el('span','offer-was','was $'+p.wasPrice));
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
     const categoryId='menu-category-'+section+'-'+panel.children.length;
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
       input.name='addon-'+section+'-'+panel.children.length+'-'+j;
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
   actions.append(action,payLink);
   const buy=el('div','menu-v2-buy');buy.append(priceStack,actions);
   card.append(info,buy);
   panel.append(card);
   if(p.name==='Sexting · 30 Minutes'){
     panel.append(el('div','menu-v2-notes',el('p','','Sexting & live shows are where the mess usually happens. Bring a towel, or don’t. I’m not your mother.')));
   }
 });
 const list=notes[section]||[];
 if(list.length){
   const note=el('div','menu-v2-notes');
   list.forEach(s=>note.append(el('p','',s)));
   panel.append(note);
 }
 root.append(panel);
});
})();
