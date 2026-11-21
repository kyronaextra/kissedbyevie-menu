(function(){
'use strict';
// KissedByEvie storefront display. Checkout prices live in checkout-catalog.js.
const FACE_TIME_RULE='FaceTimes are reserved for those who have purchased a bundle or got VIP. VIP members only Friday-Sunday.';
const sections=[
  {id:'Bundles',title:'Bundles',jump:'Bundles'},
  {id:'Customs',title:'Customs',jump:'Customs'},
  {id:'FaceTime',title:'FaceTime',jump:'FaceTime'},
  {id:'VIP',title:'VIP',jump:'VIP'}
];
const products=[
  {section:'Bundles',name:'10 pics/vids',price:10,
   description:'Ten pics and vids. That’s the taste.'},
  {section:'Bundles',name:'20 pics/vids',price:20,badge:'JUST A TASTE',
   description:'Twenty. Yes, it’s hard. That’s the point.'},
  {section:'Bundles',name:'50 pics/vids',price:50,
   description:'Fifty pics and vids — full videos, mostly videos.'},
  {section:'Bundles',name:'B/G Dropbox',price:35,
   description:'B/G Dropbox with 17+ files.'},
  {section:'Bundles',name:'Deluxe Dropbox (900+ vault)',price:75,salePrice:55,wasPrice:75,group:'vault',badge:'BEST VALUE',todayOnly:true,
   description:'The whole vault. 900+ pics and videos. One payment, lifetime access. Live pics/videos thrown in if you pay today.',
   note:'One Dropbox per order.',bagName:'Deluxe Dropbox Today Promo'},
  {section:'Bundles',name:'Deluxe Dropbox Today Promo',price:55,group:'vault',badge:'TODAY ONLY',promoOnly:true,
   description:'Same 900+ vault, today’s price + live pics/videos if you pay today.'},
  {section:'Bundles',name:'EVIE’s Picks',price:35,
   description:'EVIE’s Picks — 20+ files.'},
  {section:'Bundles',name:'Video Dick Rate',price:35,
   description:'Video dick rate, 30 secs + teasers.'},
  {section:'Customs',name:'Custom 1-min Video',price:85,priceDisplay:'from $85',
   description:'Starting at $85. One minute, your idea. Subject to discount or extra charges.'},
  {section:'FaceTime',name:'FaceTimes',price:55,priceDisplay:'from $55',
   description:'FaceTimes starting at $55. Only for fans who’ve bought a bundle or have VIP.',
   rule:FACE_TIME_RULE},
  {section:'FaceTime',name:'Sexting · 10 Minutes',price:55,unit:'text only',
   description:'Sexting starting at $55 for 10 mins.'},
  {section:'VIP',name:'VIP 1 Month',price:150,group:'membership',badge:'VIP · ONE MONTH',
   description:'One month. Priority messages, casual FaceTimes, and me actually replying. Renews at $60/month.',
   features:['One month of VIP','The 900+ vault','Priority messages and calls','Renews at $60/month'],
   rule:FACE_TIME_RULE},
  {section:'VIP',name:'VIP 3 Months',price:300,group:'membership',badge:'BEST VALUE',
   description:'Three months for $300, then $60/month.',
   features:['Three months of VIP','The 900+ vault','Priority messages and calls','Then $60/month'],
   rule:FACE_TIME_RULE},
  {section:'VIP',name:'1 Month GFE',price:70,group:'membership',
   description:'1 Month GFE. Priority replies, daily content, casual calls.',
   features:['Daily Snaps and clips','Priority replies','Casual calls only'],
   note:'This is not full VIP and does not include the vault.'}
];
const notes={
  Bundles:['Every delivery also comes with your free OnlyFans link.'],
  Customs:['Customs starting at $85, subject to discount or extra charges. Give me a real idea and I’ll get into it. Nothing starts until I agree.'],
  FaceTime:[FACE_TIME_RULE,'Live things get scheduled with me. I confirm the time before you pay. Don’t send money for a live without a confirmed time.'],
  VIP:['1 Month is $150. Renews at $60/month.',FACE_TIME_RULE]
};
const TEASERS={
  'Customs':'/assets/photos/evie-gallery-13.jpg',
  'Custom 1-min Video':'/assets/photos/evie-gallery-13.jpg'
};
const root=document.getElementById('boutiqueCatalog');
if(!root)return;

function el(tag,cls,value){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!=null)node.textContent=value;
  return node;
}
function menuAction(p){
  const price=Number.isFinite(p.salePrice)?p.salePrice:p.price;
  const display=p.priceDisplay||('$'+price);
  const request=p.section==='Customs'||(p.name&&/custom/i.test(p.name));
  return {label:(request?'Request · ':'Add · ')+display,variant:'btn-primary'};
}
function isCustomsCard(p, section){
  return section==='Customs'||/custom/i.test((p&&p.name)||'');
}
function appendTeaser(card, p, section){
  if(!isCustomsCard(p, section))return;
  const src=TEASERS[p.name];
  if(!src)return;
  const wrap=el('div','card-teaser');
  const img=el('img','card-teaser-img');
  img.src=src;img.alt='';img.loading='lazy';img.decoding='async';
  img.width=640;img.height=800;
  wrap.append(img);
  card.append(wrap);
}
function buildCard(p, section){
  const card=el('article','product-card menu-v2-card card-calm'+(p.badge||p.todayOnly?' featured':''));
  appendTeaser(card,p,section);
  if(p.todayOnly||p.salePrice===55){
    card.append(el('p','today-only-banner','Today only: $55 (was $75) + live pics/videos if you pay today'));
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
  const effectivePrice=onSale?p.salePrice:p.price;
  const cta=menuAction(p);
  const action=el('button','offer-btn add-product btn '+cta.variant);
  action.type='button';
  action.dataset.name=p.bagName||p.name;
  action.dataset.price=String(effectivePrice);
  action.dataset.cta=cta.label;
  if(p.group)action.dataset.exclusive=p.group;
  action.append(el('span','menu-v2-add-label',cta.label));
  action.setAttribute('aria-label',cta.label+': '+(p.bagName||p.name)+'. Adds to your bag for review.');

  const checkoutItemIds={
    '10 pics/vids':'bundle10','20 pics/vids':'bundle20','50 pics/vids':'bundle50',
    'Deluxe Dropbox (900+ vault)':'deluxe55','Deluxe Dropbox Today Promo':'deluxe55',
    'B/G Dropbox':'bg','EVIE’s Picks':'picks','Video Dick Rate':'dickrate',
    'Custom 1-min Video':'custom1',
    'VIP 1 Month':'vip1','VIP 3 Months':'vip3'
  };
  const sku=checkoutItemIds[p.bagName||p.name]||checkoutItemIds[p.name];
  if(sku)action.dataset.sku=sku;

  const actions=el('div','menu-actions');
  actions.append(action);
  const buy=el('div','menu-v2-buy');
  buy.append(actions);
  card.append(info,buy);
  return card;
}

const jump=el('nav','menu-category-controls');
const jumpList=el('div','menu-jump');
jumpList.setAttribute('role','navigation');
jumpList.setAttribute('aria-label','Menu sections');
sections.forEach(function(sec){
  const a=el('a','menu-jump-chip',sec.jump);
  a.href='#menu-'+sec.id.toLowerCase();
  jumpList.append(a);
});
jump.append(jumpList);
const onlyfans=el('a','onlyfans-quiet');
onlyfans.href='https://onlyfans.com/kissedbyevie';
onlyfans.target='_blank';onlyfans.rel='noopener noreferrer';
onlyfans.setAttribute('aria-label','Open the OnlyFans free trial for Kissed by Evie in a new tab');
const onlyfansIcon=el('img','onlyfans-brand-icon');
onlyfansIcon.src='/assets/brand/onlyfans-mark.webp';onlyfansIcon.alt='';onlyfansIcon.width=26;onlyfansIcon.height=26;
onlyfans.append(onlyfansIcon,el('span','','Free OnlyFans trial'));
jump.append(onlyfans);
root.append(jump);

sections.forEach(function(sec){
  const panel=el('section','menu-section');
  panel.id='menu-'+sec.id.toLowerCase();
  panel.append(el('h3','menu-section-title',sec.title));
  const list=notes[sec.id]||[];
  if(list.length){
    const note=el('div','menu-section-notes');
    list.forEach(s=>note.append(el('p','',s)));
    panel.append(note);
  }
  const grid=el('div','menu-calm-grid');
  products.filter(p=>p.section===sec.id && !p.promoOnly).forEach(p=>grid.append(buildCard(p,sec.id)));
  panel.append(grid);
  root.append(panel);
});
})();
