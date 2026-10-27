(function(){
'use strict';
// KissedByEvie storefront: this is the single source of truth for item names and prices.
// Prices marked "from" are minimums; all orders are reviewed before payment.
const categories=[
  ['Memberships','VIP & GFE'],
  ['OnlyFans','OnlyFans'],
  ['Bundles','Quick Bundles'],
  ['Themed','Themed Sets'],
  ['AlaCarte','À la Carte'],
  ['Quick','Quick Interactions'],
  ['Addons','Extras & Add-ons']
];
const products=[
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

  {section:'OnlyFans',name:'OnlyFans Monthly',price:3,unit:'per month',group:'of',
   description:'One month. Yes, it\'s really $3.'},
  {section:'OnlyFans',name:'OnlyFans — One Year',price:45,unit:'1 year',group:'of',
   description:'The long game. A whole year, sorted directly with me.'},

  {section:'Bundles',name:'10 Random Pics & Videos',price:10,
   description:'Curated chaos. No theme, no rules, just whatever I felt like sending that day.'},
  {section:'Bundles',name:'20 Surprise Pics & Videos',price:20,
   description:'Twenty surprises. You\'re leaving the picking to me.'},
  {section:'Bundles',name:'50 Surprise Pics & Videos',price:40,badge:'Bundle Favorite',
   description:'Fifty surprises. That\'s a lot of scrolling for $40.'},
  {section:'Bundles',name:'Deluxe Dropbox — 800+',price:75,group:'vault',
   description:'800+ photos and videos. Yes, I keep adding more.',
   note:'Collection access is arranged after your order is confirmed.'},

  {section:'Themed',name:'Signature Set',price:35,badge:'Most Popular',
   description:'Five themed photos and a one-minute video. Cute little starter.'},
  {section:'Themed',name:'Full Shoot Collection',price:50,
   description:'Ten themed photos, two minutes of video. More of the good stuff.'},
  {section:'Themed',name:'Custom Full Shoot — 2-Minute Video',price:90,
   description:'Your idea, ten photos, and two minutes on video. If I approve it, I make it.'},
  {section:'Themed',name:'Custom Full Shoot — 4-Minute Video',price:150,
   description:'Four minutes of video and ten photos. You wanted extra.'},

  {section:'AlaCarte',name:'Custom 10-Photo Set',price:45,from:true,
   description:'Tell me your idea. I\'ll make ten photos if we\'re on the same page.'},
  {section:'AlaCarte',name:'Custom 1-Minute Video',price:50,from:true,
   description:'One minute, made to order. Tell me the vibe first.'},

  {section:'Quick',name:'Detailed Rating',price:15,
   description:'A detailed rating of you. Fair warning: I\'m honest.'},
  {section:'Quick',name:'Voice Note',price:12,
   description:'A personalized voice note. Yes, it\'s actually my voice. Yes, you\'ll replay it.'},
  {section:'Quick',name:'Flash + 5 Live Teaser Videos',price:25,
   description:'A quick flash and five live teasers. Try not to get distracted.'},
  {section:'Quick',name:'1-Minute Live Ass / Tit / Spit Play',price:45,
   description:'One minute, your pick. Only when I\'m actually available.'},
  {section:'Quick',name:'Five Feet Photos',price:20,
   description:'Five feet photos for the feet people. You know who you are.'},

  {section:'Addons',name:'Dick Rating',price:35,
   description:'A personalized rating. No sugarcoating.'},
  {section:'Addons',name:'Custom Request',price:50,from:true,
   description:'You tell me what you want, I tell you if it\'s doable. Starts at $50.'},
  {section:'Addons',name:'Live Show',price:55,
   description:'A live show, when we\'re both free. We schedule it first.'},
  {section:'Addons',name:'Say Your Name / Talk Dirty',price:25,extra:true,
   description:'Your name, my voice. Add it to an eligible custom or live.'},
  {section:'Addons',name:'Dommy Mommy Mode',price:30,extra:true,
   description:'Want me to take charge? Add this to an eligible custom request.'},
  {section:'Addons',name:'Submissive Mode',price:20,extra:true,
   description:'Want to switch it up? Add this to an eligible custom request.'},
  {section:'Addons',name:'Panty Play',price:20,extra:true,
   description:'An extra for an eligible request. We\'ll confirm the details first.'},
  {section:'Addons',name:'Themed Shoot Priority — 12 Hours',price:15,extra:true,
   description:'Bought the outfit? Ask to move your shoot up once it arrives.'},
  {section:'Addons',name:'À la Carte Priority — 6 Hours',price:15,extra:true,
   description:'Need it sooner? Six hours if I\'m free. Ask first.'},
  {section:'Addons',name:'Quick Interaction Priority — 30 Minutes',price:10,extra:true,
   description:'In a rush? Thirty minutes if I\'m home. Ask, don\'t assume.'}
];
const notes={
  Memberships:[
    'Membership perks are arranged directly with me; the private website member lounge is still coming soon.',
    'Paid FaceTimes may be requested by active VIP Daddy or Ultimate VIP Daddy members, or consistent buyers of pre-made content/lives. Eligibility does not guarantee scheduling; I confirm the time and price first.'
  ],
  OnlyFans:['The yearly plan is paid outside OnlyFans. No payments are collected on this site.'],
  Bundles:['Available content: Squirt • B/G • Solo • Dildo. Take your pick.'],
  Themed:['If I don’t have the lingerie you want, you can purchase it through Amazon.','Delivery is 1–2 days after the lingerie arrives; 12-hour priority after arrival is +$15, subject to confirmation.'],
  AlaCarte:['Usual delivery: within 24 hours. Priority within 6 hours: +$15, if available.'],
  Quick:['Usual delivery: within 6 hours. Priority within 30 minutes: +$10 if I’m home and available.','10-minute delivery is only possible if I’m already dressed and ready — ask me first.'],
  Addons:['FaceTimes require an active VIP Daddy/Ultimate VIP Daddy package or consistent content/live purchases, plus my approval. All calls are paid; add-ons and scheduling are confirmed before payment.']
};
const root=document.getElementById('boutiqueCatalog');
if(!root)return;
const intro=document.createElement('p');intro.className='menu-helper';
intro.textContent='Pick a category. Load up. Then send me your order. Customs marked “from” get quoted before you pay.';
root.append(intro);
const tabs=document.createElement('div');tabs.className='category-tabs';
tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Content menu categories');
root.append(tabs);
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
categories.forEach(([section],i)=>{
 const panel=el('div','product-panel menu-v2-panel');
 panel.id='panel-'+section;
 panel.setAttribute('role','tabpanel');
 panel.setAttribute('aria-labelledby','tab-'+section);
 panel.hidden=i!==0;
 products.filter(p=>p.section===section).forEach(p=>{
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
   const amount=el('strong','offer-price', (p.extra?'+':'')+'$'+p.price+(p.from?'+':''));
   const action=el('button','offer-btn add-product');
   action.type='button';action.dataset.name=p.name+(p.from?' (starting at $'+p.price+')':'');
   action.dataset.price=String(p.price);
   if(p.group)action.dataset.exclusive=p.group;
   action.setAttribute('aria-label','Add '+p.name+', '+(p.from?'from ':'')+'$'+p.price);
   action.append(el('span','menu-v2-add-label','Add to bag'),el('span','menu-v2-plus','+'));
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