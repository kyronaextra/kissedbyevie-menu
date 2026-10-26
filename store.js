#!/usr/bin/env node
// scripts/build-menu.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const data = JSON.parse(readFileSync(resolve(root, "evie-menu.json"), "utf8"));

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const money = (n, from) => `${from ? "from " : ""}$${n}`;

function renderItem(it) {
  const price = it.price != null ? `<span class="price">${money(it.price, it.from)}</span>` : "";
  const unit  = it.unit ? `<span class="unit"> / ${esc(it.unit)}</span>` : "";
  const note  = it.note ? `<p class="item-note">${esc(it.note)}</p>` : "";
  const inc   = it.includes
    ? `<ul class="includes">${it.includes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`
    : "";
  return `<article class="item${it.modifier ? " modifier" : ""}">
    <header><h3>${esc(it.name)}</h3>${price}${unit}</header>
    ${inc}${note}
  </article>`;
}

const sections = data.sections.map(s => `
  <section id="${esc(s.id)}" class="menu-section">
    <h2>${esc(s.title)}</h2>
    ${s.note ? `<p class="section-note">${esc(s.note)}</p>` : ""}
    <div class="items">${s.items.map(renderItem).join("")}</div>
  </section>`).join("");

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kissed by Evie — Menu</title>
<link rel="stylesheet" href="style.css">
</head><body>
<header class="hero" style="background-image:url('${esc(data.hero.image)}')">
  <h1>${esc(data.hero.tagline)}</h1>
</header>
<main class="menu">${sections}</main>
<footer><small>Menu ${esc(data.version)}</small></footer>
</body></html>`;

writeFileSync(resolve(root, "menu.generated.html"), html);
writeFileSync(resolve(root, "menu.generated.js"),
  `// AUTO-GENERATED from evie-menu.json — do not edit\nexport const MENU = ${JSON.stringify(data, null, 2)};\n`);
console.log(`Built ${data.sections.length} sections, ${data.sections.reduce((a,s)=>a+s.items.length,0)} items.`);
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
   description:'A month of extra attention, daily content and casual calls.',
   features:['1 month of OnlyFans access','Priority replies','Daily selfies and nudes','20 random photos','Casual calls only — no sexual FaceTimes']},
  {section:'Memberships',name:'VIP Daddy Package',price:150,unit:'membership',group:'membership',badge:'Most Popular',
   description:'3 months of VIP perks, content and FaceTime eligibility.',
   features:['3 months OnlyFans + full Dropbox (800+ and growing)','Daily nudes, videos and selfies','50 photos/videos total','10 live photos + a 2-minute custom video','Discounted FaceTimes or live shows','FaceTime eligible','1 free custom request each time I go live on Stripchat — I’ll notify you when I’m on'],
   note:'Specialty/taboo custom requests may cost extra; details confirmed first.'},
  {section:'Memberships',name:'Ultimate VIP Daddy Package',price:350,unit:'6 months',group:'membership',badge:'Best Value',
   description:'Six months of premium access, extras and two live-show requests.',
   features:['6 months OnlyFans + full Dropbox (800+ items, updated regularly)','Priority replies and voice notes','One custom video (JOI option available)','10 photos + a 2-minute video','Daily content','Discounted FaceTimes or live shows','FaceTime eligible','2 free custom requests each time I go live on Stripchat — I’ll notify you when I’m on']},
  {section:'Memberships',name:'VIP / Daddy Membership Renewal',price:60,unit:'per renewal',group:'membership',
   description:'Renew an existing VIP/Daddy membership after the current term ends.',
   note:'Renewal and next membership term are confirmed directly before payment.'},

  {section:'OnlyFans',name:'OnlyFans Monthly',price:3,unit:'per month',group:'of',
   description:'One month of OnlyFans access.'},
  {section:'OnlyFans',name:'OnlyFans — One Year',price:45,unit:'1 year',group:'of',
   description:'12 months of access, arranged and paid outside OnlyFans.'},

  {section:'Bundles',name:'10 Random Pics & Videos',price:10,
   description:'A surprise mix of 10 photos and videos.'},
  {section:'Bundles',name:'20 Surprise Pics & Videos',price:20,
   description:'A bigger surprise mix — 20 photos and videos.'},
  {section:'Bundles',name:'50 Surprise Pics & Videos',price:40,badge:'Bundle Favorite',
   description:'50 surprise photos and videos in one bundle.'},
  {section:'Bundles',name:'Deluxe Dropbox — 800+',price:75,group:'vault',
   description:'800+ photos and videos, with new additions over time.',
   note:'Collection access is arranged after your order is confirmed.'},

  {section:'Themed',name:'Signature Set',price:35,badge:'Most Popular',
   description:'5 themed photos + a 1-minute video.'},
  {section:'Themed',name:'Full Shoot Collection',price:50,
   description:'10 themed photos + a 2-minute video.'},
  {section:'Themed',name:'Custom Full Shoot — 2-Minute Video',price:90,
   description:'10 custom photos + a 2-minute custom video.'},
  {section:'Themed',name:'Custom Full Shoot — 4-Minute Video',price:150,
   description:'10 custom photos + a 4-minute custom video.'},

  {section:'AlaCarte',name:'Custom 10-Photo Set',price:45,from:true,
   description:'A custom 10-photo set made for your request.'},
  {section:'AlaCarte',name:'Custom 1-Minute Video',price:50,from:true,
   description:'One minute, made to your request.'},

  {section:'Quick',name:'Detailed Rating',price:15,
   description:'A personal, detailed rating.'},
  {section:'Quick',name:'Voice Note',price:12,
   description:'A personalized voice note.'},
  {section:'Quick',name:'Flash + 5 Live Teaser Videos',price:25,
   description:'A flash with five short live teaser videos.'},
  {section:'Quick',name:'1-Minute Live Ass / Tit / Spit Play',price:45,
   description:'One minute of your selected live interaction.'},
  {section:'Quick',name:'Five Feet Photos',price:20,
   description:'A set of five feet photos.'},

  {section:'Addons',name:'Dick Rating',price:35,
   description:'A personalized rating add-on.'},
  {section:'Addons',name:'Custom Request',price:50,from:true,
   description:'Customs start at $50; final quote depends on your request.'},
  {section:'Addons',name:'Live Show',price:55,
   description:'A live show, scheduled with me.'},
  {section:'Addons',name:'Say Your Name / Talk Dirty',price:25,extra:true,
   description:'Personalize an eligible custom or live request.'},
  {section:'Addons',name:'Dommy Mommy Mode',price:30,extra:true,
   description:'A themed add-on to an eligible custom request.'},
  {section:'Addons',name:'Submissive Mode',price:20,extra:true,
   description:'A themed add-on to an eligible custom request.'},
  {section:'Addons',name:'Panty Play',price:20,extra:true,
   description:'A panty-play add-on to an eligible request.'},
  {section:'Addons',name:'Themed Shoot Priority — 12 Hours',price:15,extra:true,
   description:'Priority after any requested lingerie has arrived.'},
  {section:'Addons',name:'À la Carte Priority — 6 Hours',price:15,extra:true,
   description:'Priority delivery for eligible custom photos or videos.'},
  {section:'Addons',name:'Quick Interaction Priority — 30 Minutes',price:10,extra:true,
   description:'Only if I’m home and available — confirm first.'}
];
const notes={
  Memberships:[
    'Membership perks are arranged directly with me; the private website member lounge is still coming soon.',
    'FaceTimes are for eligible VIP members only. I’ll send payment details once we confirm.'
  ],
  OnlyFans:['The yearly plan is paid outside OnlyFans. No payments are collected on this site.'],
  Bundles:['Available content: Squirt • B/G • Solo • Dildo. Choose your bundle ♡'],
  Themed:['If I don’t have the lingerie you want, you can purchase it through Amazon.','Delivery is 1–2 days after the lingerie arrives; 12-hour priority after arrival is +$15, subject to confirmation.'],
  AlaCarte:['Usual delivery: within 24 hours. Priority within 6 hours: +$15, if available.'],
  Quick:['Usual delivery: within 6 hours. Priority within 30 minutes: +$10 if I’m home and available.','10-minute delivery is only possible if I’m already dressed and ready — ask me first.'],
  Addons:['FaceTimes are VIP-only. Add-ons need an eligible item, and delivery or scheduling is confirmed before payment.']
};
const root=document.getElementById('boutiqueCatalog');
if(!root)return;
const intro=document.createElement('p');intro.className='menu-helper';
intro.textContent='Choose a section, add your picks, then send me your order ♡ All prices are upfront; customs marked “from” are quoted before payment.';
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