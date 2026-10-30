(function(){
'use strict';
// KissedByEvie storefront: this is the single source of truth for item names and prices.
// Prices marked "from" are minimums; all orders are reviewed before payment.
const categories=[
  [
    "Mid",
    "$20 to $50 · Lives"
  ],
  [
    "Budget",
    "Under $20"
  ],
  [
    "Customs",
    "Customs & Photo Sets"
  ],
  [
    "More",
    "Calls, Live Snaps & Extras"
  ]
];
const products=[
{
    "section": "More",
    "name": "Live Snaps, 15 Minutes",
    "price": 45,
    "badge": "LIVE FAVORITE",
    "description": "15 minutes of live Snapchat content, scheduled when I'm available.",
    "note": "Live availability confirmed before payment."
  },
  {
    "section": "More",
    "name": "10 Live Pics & Videos",
    "price": 20,
    "description": "Ten pics and videos made live for you. We confirm the timing first."
  },
  {
    "section": "More",
    "name": "20 Live Pics & Videos",
    "price": 40,
    "description": "Double the live snaps. Twenty real time pics and videos."
  },
  {
    "section": "More",
    "name": "Live Bubble, 2+ Minutes",
    "price": 35,
    "description": "A personal live Snapchat bubble plus pics. Available when I'm online."
  },
  {
    "section": "Mid",
    "name": "1 Minute Live Interaction",
    "price": 45,
    "description": "A quick live request, subject to my approval and availability."
  },
  {
    "section": "Mid",
    "name": "Sexting, 10 Minutes",
    "price": 20,
    "unit": "text only",
    "description": "Ten minutes of private one on one texting. Let's schedule it."
  },
  {
    "section": "Mid",
    "name": "Sexting, 15 Minutes",
    "price": 35,
    "unit": "text only",
    "description": "Fifteen minutes of private one on one texting, scheduled with me."
  },
  {
    "section": "Mid",
    "name": "Casual Phone Call, 20 Minutes",
    "price": 30,
    "description": "A normal voice call and some one on one time. Casual conversation only."
  },
  {
    "section": "Mid",
    "name": "Video Dick Rate",
    "price": 30,
    "from": true,
    "description": "A personalized video rating, priced from $30 up to $55 depending on the request.",
    "note": "Final quote confirmed before payment."
  },
  {
    "section": "Customs",
    "name": "Big Photo Set With Videos",
    "price": 30,
    "pickCategory": true,
    "description": "A bigger premade set with photos and videos. You pick the category."
  },
  {
    "section": "Customs",
    "name": "Custom Video, 1 Minute",
    "price": 45,
    "description": "One minute made for you, based on an approved request.",
    "note": "Base price $45. Optional add ons may cost extra."
  },
  {
    "section": "Mid",
    "name": "20 Surprise Pics & Videos",
    "price": 20,
    "description": "Twenty surprises. Let me choose for you."
  },
  {
    "section": "Mid",
    "name": "50 Surprise Pics & Videos",
    "price": 40,
    "badge": "BEST CONTENT",
    "description": "50 of my best pics and videos, with long videos included."
  },
  {
    "section": "More",
    "name": "Flash & 5 Live Teasers",
    "price": 25,
    "description": "A quick flash and five live teaser videos, when available."
  },
  {
    "section": "Mid",
    "name": "Five Feet Photos",
    "price": 20,
    "description": "Five feet photos, picked for you."
  },
{
    "section": "Budget",
    "name": "Premade Video, 1 Minute",
    "price": 5,
    "unit": "$5 per minute",
    "pickCategory": true,
    "description": "Pick a category. Add a quantity for more minutes. Subject to available videos."
  },
  {
    "section": "Budget",
    "name": "Single Photo",
    "price": 2,
    "from": true,
    "pickCategory": true,
    "priceDisplay": "$2 to $3",
    "description": "Pick a category and choose your photo. Each photo is $2 or $3.",
    "note": "The final price is confirmed for your selection."
  },
  {
    "section": "Customs",
    "name": "Premade Photo Set",
    "price": 15,
    "pickCategory": true,
    "description": "A ready made photo set in the category you choose."
  },
  {
    "section": "Budget",
    "name": "Sexting, 5 Minutes",
    "price": 15,
    "unit": "text only",
    "description": "Five minutes of private one on one texting. Scheduled with me."
  },
  {
    "section": "Budget",
    "name": "Text Dick Rate",
    "price": 15,
    "description": "A personalized written rating. No video included."
  },
  {
    "section": "Budget",
    "name": "Voice Note",
    "price": 12,
    "description": "A personal voice note from me."
  },
  {
    "section": "Budget",
    "name": "10 Surprise Pics & Videos",
    "price": 10,
    "description": "Ten surprise photos and videos. I choose the mix."
  },
    {section:'VideoCalls',name:'Non-VIP Video Call, 5 Minutes',price:80,unit:'5 minutes · standard flat rate',
    description:'A 5-minute video call at my standard non-VIP rate.',
    note:'Non-VIP calls are selective and subject to my approval before payment.'},
  {section:'VideoCalls',name:'Non-VIP Video Call, 8 Minutes',price:105,unit:'8 minutes · standard flat rate',
    description:'An 8-minute video call. Flat rate. No VIP discount.',
    note:'Non-VIP calls are selective and subject to my approval before payment.'},
        {
    "section": "More",
    "name": "OnlyFans, One Year",
    "price": 45,
    "unit": "1 year",
    "group": "of",
    "description": "A whole year of OnlyFans, arranged directly with me."
  },
{
    "section": "Customs",
    "name": "Custom Video, 2 Minutes",
    "price": 55,
    "description": "Two minutes made to order after I approve the idea.",
    "note": "Base price $55. Optional add ons may cost extra."
  },
  {
    "section": "Customs",
    "name": "Custom Video, 3 Minutes",
    "price": 65,
    "description": "Three minutes made to order after I approve the idea.",
    "note": "Base price $65. Optional add ons may cost extra."
  },
  {
    "section": "Customs",
    "name": "Custom Video, 4 Minutes",
    "price": 75,
    "description": "Four minutes made to order after I approve the idea.",
    "note": "Base price $75. Optional add ons may cost extra."
  },
{
    "section": "More",
    "name": "Casual Phone Call, 40 Minutes",
    "price": 60,
    "description": "A longer casual voice call, scheduled with me."
  },
  {
    "section": "More",
    "name": "Casual Phone Call, 1 Hour",
    "price": 70,
    "description": "A full hour to talk. Casual conversation only."
  },
  {
    "section": "More",
    "name": "Deluxe Dropbox, 800+ Items",
    "price": 75,
    "group": "vault",
    "description": "800+ photos and videos, with new uploads added regularly."
  },
  {
    "section": "More",
    "name": "Custom Request Add On",
    "price": 20,
    "from": true,
    "extra": true,
    "description": "Want a little something extra on an approved custom? Ask first.",
    "note": "Price varies by request and is always confirmed before payment."
  },
  {
    "section": "More",
    "name": "Quick Delivery Priority",
    "price": 10,
    "extra": true,
    "description": "Priority delivery within 30 minutes when I am home and available.",
    "note": "Ask before buying. This is not guaranteed."
  }
];
const notes={
  "Mid": [
    "Live sessions are scheduled with me. Please confirm availability before paying.",
    "All times and quantities refer to the item you select. There are no automatic bookings."
  ],
  "Budget": [
    "For premade photos and videos, choose your content category before adding to the bag.",
    "Premade video pricing is $5 per minute. Single photos are $2 to $3 each. Quotes are confirmed before payment."
  ],
  "Customs": [
    "Custom video base prices: 1 minute $45, 2 minutes $55, 3 minutes $65, 4 minutes $75.",
    "Optional add ons cost extra and all requests are subject to approval."
  ],
  "More": [
    "Live Snaps and videos are scheduled with me. Calls are casual voice calls. Custom add ons and priority delivery must be approved before payment.",
    "Video calls are selective, scheduled with me, and confirmed before payment."
  ]
};
const root=document.getElementById('boutiqueCatalog');
if(!root)return;
const intro=document.createElement('div');intro.className='menu-picker-intro';
const introHeading=document.createElement('h3');introHeading.className='menu-picker-title';introHeading.textContent='Pick a category';
const introHint=document.createElement('p');introHint.className='menu-helper';introHint.textContent='Start with the $20 to $50 picks, then under $20, customs & photo sets, and more. For premade content, pick your category first.';
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
onlyfansIcon.src='assets/onlyfans-icon.svg';onlyfansIcon.alt='';onlyfansIcon.width=23;onlyfansIcon.height=23;
onlyfans.append(onlyfansIcon,el('span','','START MY FREE TRIAL'));
controls.append(onlyfans);
function menuAction(p){
  if(p.quoteOnly)return {label:'Request a quote',variant:'btn-secondary'};
  if(p.name==='Evidence Mystery Box')return {label:'Make my mystery box',variant:'btn-spotlight'};
  if(p.name.startsWith('Evidence Mystery Bag'))return {label:'Choose this evidence bag',variant:'btn-primary'};
  if(p.section==='VideoCalls')return {label:'Request this video call',variant:'btn-primary'};
 if(p.group==='vault')return {label:'Get the vault',variant:'btn-primary'};
 if(p.name.includes('Live'))return {label:'Choose this live',variant:'btn-primary'};
 if(p.name.includes('Sexting'))return {label:'Choose this session',variant:'btn-primary'};
 if(p.name.includes('Phone Call'))return {label:'Request a call',variant:'btn-secondary'};
 if(p.name.includes('Custom'))return {label:'Request this custom',variant:'btn-primary'};
 if(p.section==='Mid')return {label:'Add this pick',variant:'btn-primary'};
 return {label:'Add to bag',variant:'btn-secondary'};
}
categories.forEach(([section],i)=>{
 const panel=el('div','product-panel menu-v2-panel');
 panel.id='panel-'+section;
 panel.setAttribute('role','tabpanel');
 panel.setAttribute('aria-labelledby','tab-'+section);
 panel.hidden=i!==0;
 const categoryProducts=products.filter(p=>p.section===section);
 // More stays last, with calls, live Snaps and videos, and video call options at the end.
 if(section==='More')categoryProducts.push(...products.filter(p=>p.section==='VideoCalls'));
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
    const onSale=false;
    const effectivePrice=onSale?Math.round(p.price*0.60*100)/100:p.price;
    const amount=el('strong','offer-price'+(onSale?' vip-sale-price':''),onSale?null:(p.priceDisplay||((p.extra?'+':'')+'$'+p.price+(p.from?'+':''))));

   const cta=menuAction(p);
   const action=el('button','offer-btn add-product btn '+cta.variant);
   action.type='button';
   const baseName=p.name+(p.from?' (starting at $'+p.price+')':'');
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
   refreshChoices();
   const buy=el('div','menu-v2-buy');buy.append(amount,action);
   if(p.price>=55){
     const photo=el('div','menu-high-value-photo');
     const image=document.createElement('img');
     const photoIndex=(Math.abs(p.name.split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0))%6)+1;
     image.src='/assets/photos/evie-menu-0'+photoIndex+'.jpg';
     image.alt='Evie photo preview for '+p.name;
     image.loading='lazy';image.decoding='async';
     photo.append(image);
     card.append(info,photo,buy);
   }else card.append(info,buy);
   panel.append(card);
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