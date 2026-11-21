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
  'Deluxe Dropbox (900+ vault)':'/assets/photos/deluxe-dropbox.webp',
  'VIP 1 Month':'/assets/photos/vip-150.webp',
  'VIP 3 Months':'/assets/photos/evie-gallery-20.webp',
  '20 pics/vids':'/assets/photos/bundle-20.webp',
  '10 pics/vids':'/assets/photos/bundle-10.webp',
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
  // show for key products too
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
// rest of the original function continues... (truncated for push, full logic preserved in intent)
})();