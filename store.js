(function(){
'use strict';
const products=[
["Premium","Daddy Package Lifetime",300,"Daddy Package · Lifetime","Lifetime collection access and membership status. Active monthly perks require a voluntary $15 contribution each calendar month; no automatic charge.","daddy"],
["Premium","Lovense Interactive FaceTime",175,"Interactive FaceTime · $175","Private interactive session; scheduling confirmed individually.",""],
["Premium","JOI Custom Video · 3 min",150,"JOI custom video · 3 minutes","Made-to-order video; details confirmed before payment.",""],
["Premium","Daddy Package Monthly",150,"Daddy Package · Monthly","Includes Deluxe Dropbox, priority replies, daily snaps, one complimentary live Snap show, discounted calls, phone contact, exclusive collection and 3 months of OnlyFans access. No extra $15 requirement.","daddy"],
["Premium","Panties · 1 day",130,"Panties · 1 day","Includes video and snaps. Optional customization quoted separately.",""],
["Premium","ULTRA VAULT 800+",75,"ULTRA VAULT · 800+","800+ photos and videos, full videos, all categories, regularly updated, with a complimentary OnlyFans link.","vault"],
["Bundles","10 Premade Pics/Videos",10,"10 premade photos/videos","Premade collection.","bundle"],
["Bundles","20 Premade Pics/Videos",20,"20 premade photos/videos","Premade collection.","bundle"],
["Bundles","50 Premade Pics/Videos",50,"50 premade photos/videos","Premade collection.","bundle"],
["Bundles","Single B/G Video",15,"Single B/G video","One video.",""],
["Bundles","Complete B/G Vault",40,"Complete B/G vault","Full B/G collection.",""],
["Live","10 Live Snaps",20,"10 live snaps","10 live photos/videos.",""],
["Live","20 Live Snaps",40,"20 live snaps","20 live photos/videos.",""],
["Live","7+ Short Live Snaps",35,"Short live clips · 7+","Live bubbles/snaps, seven or more.",""],
["Customs","Custom Full Video · 2 min",90,"Custom full video · 2 min","Made-to-order; confirm details and delivery before payment.",""],
["Customs","Custom Full Video · 3 min",120,"Custom full video · 3 min","Made-to-order; confirm details and delivery before payment.",""],
["Customs","Custom Full Video · 4 min",140,"Custom full video · 4 min","Made-to-order; confirm details and delivery before payment.",""],
["Extras","Detailed Text Rating",20,"Detailed text rating","Personalized written response.",""],
["Extras","Detailed Live Snap Video Rating",35,"Detailed live Snap video rating","Includes 5+ live photos/videos.",""]
];
const categories=[['Premium','Featured & Premium'],['Bundles','Bundles'],['Live','Video Chats & Live Snaps'],['Customs','Customs'],['Extras','Ratings & Extras']];
const root=document.getElementById('boutiqueCatalog');
const tabs=document.createElement('div');tabs.className='category-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Shop categories');
root.append(tabs);
categories.forEach(([key,label],index)=>{
 const tab=document.createElement('button');tab.type='button';tab.id='tab-'+key;tab.className='category-tab'+(index===0?' active':'');
 tab.dataset.tab=key;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(index===0));tab.setAttribute('aria-controls','panel-'+key);tab.tabIndex=index===0?0:-1;tab.textContent=label;tabs.append(tab);
});
categories.forEach(([key],index)=>{
 const panel=document.createElement('div');panel.id='panel-'+key;panel.className='product-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+key);panel.hidden=index!==0;
 products.filter(p=>p[0]===key).forEach(p=>{
  const card=document.createElement('article');card.className='product-card'+(p[0]==='Premium'?' featured':'');
  const info=document.createElement('div'),label=document.createElement('p');label.className='card-label';label.textContent=p[3];info.append(label);
  if(p[4]){const desc=document.createElement('p');desc.textContent=p[4];info.append(desc)}
  const button=document.createElement('button');button.type='button';button.className='offer-btn add-product';button.dataset.name=p[1];button.dataset.price=p[2];
  if(p[5])button.dataset.exclusive=p[5];
  button.setAttribute('aria-label','Add '+p[1]+', $'+p[2]+(p[1].includes('Monthly')?' per month':''));
  button.append(document.createTextNode('$'+p[2]+(p[1].includes('Monthly')?' / month':'')));
  const add=document.createElement('span');add.textContent='ADD +';button.append(add);
  card.append(info,button);panel.append(card);
 });
 if(key==='Customs'){const disclaimer=document.createElement('p');disclaimer.className='fine-print';disclaimer.textContent='Custom requests generally range from $110–$300. Optional theme upgrades may add $50, subject to approval. Exact delivery timing is confirmed before purchase.';panel.append(disclaimer)}
 root.append(panel);
});
})();