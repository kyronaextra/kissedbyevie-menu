(function(){
'use strict';
// KissedByEvie storefront: this is the single source of truth for item names and prices.
// Prices marked "from" are minimums; all orders are reviewed before payment.
// Updated Nov 21 2026 to current menu.
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
   description:'Fifty pics and vids — full videos, mostly videos.'},
  {section:'BestSellers',name:'Deluxe Dropbox (900+ vault)',price:75,salePrice:55,wasPrice:75,group:'vault',badge:'BEST VALUE',
   description:'The whole vault. 900+ pics and videos. One payment, lifetime access. Live pics/videos thrown in if you pay today.',
   note:'One Dropbox per order.',bagName:'Deluxe Dropbox Today Promo',todayOnly:true},
  {section:'BestSellers',name:'Deluxe Dropbox Today Promo',price:55,group:'vault',badge:'TODAY ONLY',promoOnly:true,
   description:'Same 900+ vault, today’s price + live pics/videos if you pay today.'},
  {section:'BestSellers',name:'B/G Dropbox',price:35,
   description:'B/G Dropbox with 17+ files.'},
  {section:'BestSellers',name:'EVIE’s Picks',price:35,
   description:'EVIE’s Picks — 20+ files.'},
  {section:'BestSellers',name:'Video Dick Rate',price:35,
   description:'Video dick rate, 30 secs + teasers.'},
  {section:'BestSellers',name:'VIP 1 Month',price:150,group:'membership',badge:'VIP · ONE MONTH',
   description:'One month. Priority messages, casual FaceTimes, and me actually replying.',
   features:['One month of VIP','The 900+ vault','Priority messages and calls'],
   rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'},
  {section:'BestSellers',name:'VIP 3 Months',price:300,group:'membership',badge:'BEST VALUE',
   description:'Three months for $300, then $60/month.',
   features:['Three months of VIP','The 900+ vault','Priority messages and calls','Then $60/month'],
   rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'},
  {section:'Dropbox',name:'Deluxe Dropbox (900+ vault)',price:75,salePrice:55,wasPrice:75,group:'vault',
   description:'The whole thing. 900+ pics and videos. Lifetime access. Live pics/videos if you pay today.',
   note:'One Dropbox per order.',bagName:'Deluxe Dropbox Today Promo',
   badge:'900+ ITEMS',todayOnly:true},
  {section:'Dropbox',name:'Deluxe Dropbox Today Promo',price:55,group:'vault',badge:'TODAY ONLY',promoOnly:true,
   description:'Same 900+ vault for $55 today + live content.'},
  {section:'Dropbox',name:'B/G Dropbox',price:35,
   description:'B/G Dropbox · 17+ files.'},
  {section:'Dropbox',name:'EVIE’s Picks',price:35,
   description:'EVIE’s Picks · 20+ files.'},
  {section:'VIP',name:'VIP 1 Month',price:150,group:'membership',badge:'$150',
   description:'One month of VIP. Priority messages and FaceTime eligibility.',
   features:['One month','900+ vault','Priority messages and calls'],
   rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'},
  {section:'VIP',name:'VIP 3 Months',price:300,group:'membership',badge:'$300',
   description:'Three months for $300, then $60/month.',
   features:['Three months','900+ vault','Priority messages and calls','Then $60/month'],
   rule:'FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.'},
  {section:'VIP',name:'1 Month GFE',price:70,priceDisplay:'$70',group:'membership',
   description:'1 Month GFE. Priority replies, daily content, casual calls.',
   features:['Daily Snaps and clips','Priority replies','Casual calls only'],
   note:'This is not full VIP and does not include the vault.'},
  {section:'Customs',name:'Customs',price:85,priceDisplay:'from $85',
   description:'Customs starting at $85, subject to discount or extra charges. Nothing starts until I’ve agreed.'},
  {section:'Customs',name:'Custom 1-min Video',price:85,
   description:'Starting at $85. One minute, your idea. Subject to discount or extra charges.'},
  {section:'More',name:'FaceTimes',price:55,priceDisplay:'from $55',
   description:'FaceTimes starting at $55. Only for fans who’ve bought a bundle or have VIP.'},
  {section:'More',name:'Sexting · 10 Minutes',price:55,unit:'text only',
   description:'Sexting starting at $55 for 10 mins.'}
];
const notes={
  "Bundles": ["Every delivery also comes with your free OnlyFans link."],
  "VIP": ["FaceTimes are reserved for those who have purchased a bundle or got VIP."],
  "Customs": [
    "Customs starting at $85, subject to discount or extra charges. Give me a real idea and I’ll get into it."
  ],
  "More": [
    "Live things get scheduled with me. I confirm the time before you pay. Don’t send money for a live without a confirmed time.",
    "Every delivery also comes with your free OnlyFans link."
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
  'Deluxe Dropbox (900+ vault)':'/assets/photos/deluxe-dropbox.webp',
  'VIP 1 Month':'/assets/photos/vip-150.webp',
  'VIP 3 Months':'/assets/photos/evie-gallery-20.webp',
  '20 pics/vids':'/assets/photos/bundle-20.webp',
  '10 pics/vids':'/assets/photos/bundle-10.webp',
  '50 pics/vids':'/assets/photos/evie-gallery-23.webp',
  'B/G Dropbox':'/assets/photos/evie-gallery-18.webp',
  'EVIE’s Picks':'/assets/photos/evie-gallery-15.webp',
  'Video Dick Rate':'/assets/photos/evie-gallery-08.jpg',
  'Customs':'/assets/photos/evie-gallery-13.jpg',
  'Custom 1-min Video':'/assets/photos/evie-gallery-13.jpg',
  '1 Month GFE':'/assets/photos/evie-gallery-15.webp',
  'FaceTimes':'/assets/photos/evie-gallery-05.jpg',
  'Sexting · 10 Minutes':'/assets/photos/evie-gallery-06.jpg'
};
function isCustomsCard(p, section){
  if(section==='Customs')return true;
  const name=(p&&p.name)||'';
  return /custom/i.test(name);
}
function teaserFor(name){return TEASERS[name]||''}
function appendTeaser(card, p, section){
  if(!isCustomsCard(p, section) && !["Deluxe Dropbox (900+ vault)","VIP 1 Month","20 pics/vids","10 pics/vids"].includes(p.name)) return;
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
})();
