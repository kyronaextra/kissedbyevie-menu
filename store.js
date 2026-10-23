(function(){
'use strict';
const products=[["Premium","Daddy Package Monthly",150,"Daddy Package · Monthly","Deluxe Dropbox (800+ items), daily content, priority replies, 1 complimentary live, 3 months free OnlyFans. Customs extra.","daddy"],["Premium","Daddy Package One-time",350,"Daddy Package · One-time","Deluxe Dropbox, daily content, priority replies, complimentary live, and 3 months free OnlyFans. Confirm duration of one-time access.","daddy"],["Premium","Deluxe Dropbox / Full Vault",75,"Deluxe Dropbox / Full Vault","800+ photos and videos: squirt, some B/G, solo, feet, striptease, selfies, close-ups, oil, some anal. Regular updates. Free 1-month OnlyFans trial. Included with Daddy Package.","vault"],["Premium","OnlyFans Monthly",3,"OnlyFans · Monthly","Includes surprise 10–20 photo bundle.",""],["Bundles","10 pics/videos",15,"10 pics / videos","Choose one bundle.","bundle"],["Bundles","20 pics/videos",30,"20 pics / videos","Choose one bundle.","bundle"],["Bundles","50 pics/videos",60,"50 pics / videos","Choose one bundle.","bundle"],["Bundles","B/G Dropbox",35,"B/G Dropbox","15+ videos.",""],["Live","5 min Video Chat",50,"Video Chat · 5 minutes","",""],["Live","10 min Video Chat",85,"Video Chat · 10 minutes","",""],["Live","15 min Live Snaps",45,"Live Snaps · 15 minutes","",""],["Live","30 min Live Snaps",75,"Live Snaps · 30 minutes","",""],["Live","1 hour Live Snaps",130,"Live Snaps · 1 hour","",""],["Customs","45 sec Short Custom",45,"45-second short custom","",""],["Customs","2 min Custom + Photo Set",90,"2-minute custom + photo set","",""],["Customs","3 min Custom + Photo Set",100,"3-minute custom + photo set","",""],["Customs","4 min Custom + Photo Set",110,"4-minute custom + photo set","",""],["Extras","Live / Detailed Rating",25,"Live / detailed 🍆 rate","",""],["Extras","3 Live Snaps + 2 Pics",20,"3 live snaps + 2 pics","",""],["Extras","Make a Deal $50",50,"Make a Deal · $50","Custom offer worth more than the price.","deal"],["Extras","Make a Deal $100",100,"Make a Deal · $100","Custom offer worth more than the price.","deal"],["Extras","Make a Deal $150",150,"Make a Deal · $150","Custom offer worth more than the price.","deal"],["Extras","Make a Deal $200",200,"Make a Deal · $200","Custom offer worth more than the price.","deal"]];
const categories=[['Premium','Premium'],['Bundles','Bundles'],['Live','Video Chats & Live Snaps'],['Customs','Customs'],['Extras','Add-ons & Make a Deal']];
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
  const card=document.createElement('article');card.className='product-card';
  const info=document.createElement('div'),label=document.createElement('p');label.className='card-label';label.textContent=p[3];info.append(label);
  if(p[4]){const desc=document.createElement('p');desc.textContent=p[4];info.append(desc)}
  const button=document.createElement('button');button.type='button';button.className='offer-btn add-product';button.dataset.name=p[1];button.dataset.price=p[2];
  if(p[5])button.dataset.exclusive=p[5];
  button.append(document.createTextNode('$'+p[2]+(p[1].includes('Monthly')?' / month':'')));
  const add=document.createElement('span');add.textContent='ADD +';button.append(add);
  card.append(info,button);panel.append(card);
 });
 if(key==='Customs'){const disclaimer=document.createElement('p');disclaimer.className='fine-print';disclaimer.textContent='Finished within 48 hours. Previous purchase required. Taboo / labor-heavy requests priced individually.';panel.append(disclaimer)}
 root.append(panel);
});
})();