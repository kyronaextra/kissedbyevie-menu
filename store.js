(function(){
'use strict';
// KissedByEvie storefront: this is the single source of truth for item names and prices.
// Prices marked "from" are minimums; all orders are reviewed before payment.
const vipSaleActive=Date.now()<Date.parse('2026-11-01T00:00:00-07:00');
const vipSaleNames=new Set(['VIP Daddy Package','Ultimate VIP Daddy Package']);
const categories=[
  [
    "Mid",
    "$20 to $50 · Lives & More"
  ],
  [
    "Budget",
    "Under $20"
  ],
  [
    "VideoCalls",
    "VIDEO CALLS"
  ],
  [
    "Memberships",
    "VIP & GFE"
  ],
  [
    "Customs",
    "Custom Videos"
  ],
  [
    "More",
    "Calls & Extras"
  ]
];
const products=[
{
    "section": "Mid",
    "name": "Live Snaps, 15 Minutes",
    "price": 45,
    "badge": "LIVE FAVORITE",
    "description": "15 minutes of live Snapchat content, scheduled when I'm available.",
    "note": "Live availability confirmed before payment."
  },
  {
    "section": "Mid",
    "name": "10 Live Pics & Videos",
    "price": 20,
    "description": "Ten pics and videos made live for you. We confirm the timing first."
  },
  {
    "section": "Mid",
    "name": "20 Live Pics & Videos",
    "price": 40,
    "description": "Double the live snaps. Twenty real time pics and videos."
  },
  {
    "section": "Mid",
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
    "section": "Mid",
    "name": "Big Photo Set With Videos",
    "price": 30,
    "pickCategory": true,
    "description": "A bigger premade set with photos and videos. You pick the category."
  },
  {
    "section": "Mid",
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
    "section": "Mid",
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
    "section": "Budget",
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
{section:'VideoCalls',name:'VIP Video Call, 5 Minutes',price:50,unit:'5 minutes · VIP flat rate',
    description:'A 5-minute video call at my VIP-only price.',
    note:'Active VIP membership required. I confirm your membership and availability before payment.'},
  {section:'VideoCalls',name:'VIP Video Call, 8 Minutes',price:70,unit:'8 minutes · VIP flat rate',
    badge:'VIP RATE',description:'An 8-minute video call at the flat VIP rate of $70.',
    note:'Active VIP membership required. I confirm your membership and availability before payment.'},
  {section:'VideoCalls',name:'Non-VIP Video Call, 5 Minutes',price:80,unit:'5 minutes · standard flat rate',
    description:'A 5-minute video call at my standard non-VIP rate.',
    note:'Non-VIP calls are selective and subject to my approval before payment.'},
  {section:'VideoCalls',name:'Non-VIP Video Call, 8 Minutes',price:105,unit:'8 minutes · standard flat rate',
    description:'An 8-minute video call. Flat rate. No VIP discount.',
    note:'Non-VIP calls are selective and subject to my approval before payment.'},
  {section:'Memberships',name:'Basic GFE',price:70,unit:'1 month',group:'membership',
   description:'Daily content, priority replies, and a little more of my time. For a month.',
   features:['1 month of OnlyFans access','Priority replies','Daily selfies and nudes','20 random photos','Casual calls only — no sexual FaceTimes']},
  {section:'Memberships',name:'VIP Daddy Package',price:150,unit:'3 months',group:'membership',badge:'Most Popular',
   description:'Three months, the vault, VIP rates, and FaceTime eligibility. You\'re in.',
   features:['3 months OnlyFans + full Dropbox (800+ and growing)','Daily nudes, videos and selfies','50 photos/videos total','10 live photos + a 2-minute custom video','Discounted FaceTimes or live shows','FaceTime eligible','1 free custom request each time I go live on Stripchat — I’ll notify you when I’m on'],
   note:'Specialty/taboo custom requests may cost extra; details confirmed first.'},
  {section:'Memberships',name:'Ultimate VIP Daddy Package',price:350,unit:'6 months',group:'membership',badge:'Best Value',
   description:'Six months of extra perks and priority replies. You went all in.',
   features:['6 months OnlyFans + full Dropbox (800+ items, updated regularly)','Priority replies and voice notes','One custom video (JOI option available)','10 photos + a 2-minute video','Daily content','Discounted FaceTimes or live shows','FaceTime eligible','2 free custom requests each time I go live on Stripchat — I’ll notify you when I’m on']},
  {section:'Memberships',name:'VIP / Daddy Membership Renewal',price:60,unit:'per renewal',group:'membership',
   description:'Already one of my favorites? Keep it going when your term ends.',
   note:'Renewal and next membership term are confirmed directly before payment.'},
{
    "section": "Memberships",
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
    "name": "Worn Panties",
    "price": 50,
    "from": true,
    "description": "Worn panties, from $50 up to $200 depending on the request.",
    "note": "Availability, shipping details and the final price are confirmed before payment."
  },
  {
    "section": "More",
    "name": "Worn Socks",
    "price": 50,
    "from": true,
    "description": "Worn socks, from $50 up to $200 depending on the request.",
    "note": "Availability, shipping details and the final price are confirmed before payment."
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
if(vipSaleActive){
  products.filter(p=>vipSaleNames.has(p.name)).forEach(p=>{
    p.features.push('October sale bonus: one 30-minute live sexting, Snap session, or show. Format and scheduling confirmed with me.');
  });
}
const notes={
  "Mid": [
    "Live content and calls are scheduled with me. Please confirm availability before paying.",
    "All times and quantities refer to the item you select. There are no automatic bookings."
  ],
  "Budget": [
    "For premade photos and videos, choose your content category before adding to the bag.",
    "Premade video pricing is $5 per minute. Single photos are $2 to $3 each. Quotes are confirmed before payment."
  ],
  "VideoCalls": [
    "WITH VIP: 5 minutes $50 or 8 minutes $70, flat rates. Active VIP membership is required and verified.",
    "WITHOUT VIP: 5 minutes $80 or 8 minutes $105, flat rates. Non-VIP calls are selective and approved before payment.",
    "No, I’m not lowering it if you don’t have VIP and especially if you have no interest in anything else."
  ],
  "Memberships": [
    "Membership perks are arranged directly with me; private lounge access is still being built.",
    "Video calls are paid separately at the listed flat rates. Eligibility and scheduling are confirmed directly."
  ],
  "Customs": [
    "Custom video base prices: 1 minute $45, 2 minutes $55, 3 minutes $65, 4 minutes $75.",
    "Optional add ons cost extra and all requests are subject to approval."
  ],
  "More": [
    "Worn items range from $50 to $200. Any shipping charges are confirmed separately.",
    "Calls are casual voice calls. Custom add ons and priority delivery must be approved before payment."
  ]
};
const root=document.getElementById('boutiqueCatalog');
if(!root)return;
const intro=document.createElement('div');intro.className='menu-picker-intro';
const introHeading=document.createElement('h3');introHeading.className='menu-picker-title';introHeading.textContent='Pick a category';
const introHint=document.createElement('p');introHint.className='menu-helper';introHint.textContent='Start with the $20 to $50 picks, then shop under $20, video calls, VIP, customs and extras. For premade content, pick your category first.';
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
onlyfans.setAttribute('aria-label','Visit Kissed by Evie on OnlyFans (opens a new tab)');
const onlyfansIcon=el('img','onlyfans-brand-icon');
onlyfansIcon.src='assets/onlyfans-icon.svg';onlyfansIcon.alt='';onlyfansIcon.width=23;onlyfansIcon.height=23;
onlyfans.append(onlyfansIcon,el('span','','ONLYFANS'));
controls.append(onlyfans);
function menuAction(p){
  if(p.section==='VideoCalls')return {label:'Request this video call',variant:p.name.startsWith('VIP')?'btn-spotlight':'btn-primary'};
 if(p.name==='VIP Daddy Package')return {label:'Choose VIP Daddy',variant:'btn-spotlight'};
 if(p.name==='Ultimate VIP Daddy Package')return {label:'Go Ultimate VIP',variant:'btn-ultimate'};
 if(p.name==='Basic GFE')return {label:'Start with GFE',variant:'btn-primary'};
 if(p.name.includes('Membership Renewal'))return {label:'Renew my VIP',variant:'btn-secondary'};
 if(p.group==='vault')return {label:'Get the vault',variant:'btn-primary'};
 if(p.name.includes('Live'))return {label:'Choose this live',variant:'btn-primary'};
 if(p.name.includes('Sexting'))return {label:'Choose this session',variant:'btn-primary'};
 if(p.name.includes('Phone Call'))return {label:'Request a call',variant:'btn-secondary'};
 if(p.name.includes('Custom'))return {label:'Request this custom',variant:'btn-primary'};
 if(p.name.includes('Worn'))return {label:'Ask about this',variant:'btn-secondary'};
 if(p.section==='Mid')return {label:'Add this pick',variant:'btn-primary'};
 return {label:'Add to bag',variant:'btn-secondary'};
}
categories.forEach(([section],i)=>{
 const panel=el('div','product-panel menu-v2-panel');
 panel.id='panel-'+section;
 panel.setAttribute('role','tabpanel');
 panel.setAttribute('aria-labelledby','tab-'+section);
 panel.hidden=i!==0;
 if(section==='VideoCalls'){
   const intro=el('div','video-call-intro');
   intro.append(el('h3','','VIDEO CALLS. MY RATES, MY RULES.'),el('p','','VIP saves you money. No VIP? You pay the standard flat rate. Calls are scheduled and approved by me before payment.'));
   panel.append(intro);
 }
 products.filter(p=>p.section===section).forEach(p=>{
   const spotlight=p.name==='VIP Daddy Package';
   const ultimate=p.name==='Ultimate VIP Daddy Package';
   const card=el('article','product-card menu-v2-card'+(p.badge?' featured':'')+(spotlight?' is-spotlight':'')+(ultimate?' is-ultimate':''));
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
    const onSale=vipSaleActive&&vipSaleNames.has(p.name);
    const effectivePrice=onSale?Math.round(p.price*0.60*100)/100:p.price;
    const amount=el('strong','offer-price'+(onSale?' vip-sale-price':''),onSale?null:(p.priceDisplay||((p.extra?'+':'')+'$'+p.price+(p.from?'+':''))));
    if(onSale)amount.append(el('s','vip-sale-was','$'+p.price),el('span','vip-sale-now','$'+effectivePrice),el('span','vip-sale-flag','40% OFF · ENDS 10/31'));
   const cta=menuAction(p);
   const action=el('button','offer-btn add-product btn '+cta.variant);
   action.type='button';
   const baseName=p.name+(p.from?' (starting at $'+p.price+')':'');
   action.dataset.name=baseName;
   action.dataset.price=String(effectivePrice);
   action.dataset.cta=cta.label;
   if(p.group)action.dataset.exclusive=p.group;
   action.setAttribute('aria-label',cta.label+': '+p.name+', '+(p.from?'from ':'')+'$'+effectivePrice+'. Adds to your bag for review.');
   action.append(el('span','menu-v2-add-label',cta.label));
   if(p.pickCategory){
     const categoryLabel=el('label','menu-v2-choice-label','Pick a category');
     const categorySelect=el('select','menu-v2-category-select');
     const categoryId='menu-category-'+section+'-'+panel.children.length;
     categorySelect.id=categoryId; categoryLabel.htmlFor=categoryId;
     const prompt=el('option','','Choose a category');prompt.value='';prompt.disabled=true;prompt.selected=true;categorySelect.append(prompt);
     ['Solo','B/G','Squirt','Dildo','Feet','Surprise me'].forEach(function(choice){const opt=el('option','',choice);opt.value=choice;categorySelect.append(opt)});
     action.disabled=true;
     categorySelect.addEventListener('change',function(){
       action.dataset.name=baseName+' | '+categorySelect.value;
       action.disabled=!categorySelect.value;
       action.setAttribute('aria-label',cta.label+': '+action.dataset.name+'. Adds to your bag for review.');
     });
     info.append(categoryLabel,categorySelect);
   }
   const buy=el('div','menu-v2-buy');buy.append(amount,action);
   card.append(info,buy);panel.append(card);
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