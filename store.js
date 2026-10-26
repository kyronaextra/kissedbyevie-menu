(function(){
'use strict';
// Menu source of truth: section, order name, price, visible name, short description, exclusive group, optional details.
const products=[
 [
  "Featured",
  "ULTRA VAULT",
  75,
  "The Ultra Vault",
  "The full collection, with current contents and access confirmed before purchase.",
  "vault",
  ""
 ],
 [
  "Featured",
  "Daddy Package Monthly",
  150,
  "Daddy Monthly VIP",
  "Monthly VIP perks: daily snaps, priority replies and one live Snap show.",
  "daddy",
  "Includes the deluxe Dropbox collection, 3 months of OnlyFans access, discounted calls and live shows, direct phone contact and a personal site collection. No extra $15 required. Private website lounge access is still coming soon."
 ],
 [
  "Featured",
  "Daddy Package Lifetime",
  300,
  "Daddy Lifetime Access",
  "One payment for permanent membership status and your personal collection.",
  "daddy",
  "Lifetime status remains yours. Monthly perks are activated only with a voluntary $15 contribution in that calendar month. No automatic charges. Private website lounge access is still coming soon."
 ],
 [
  "Featured",
  "Lovense Interactive Video Call",
  175,
  "Interactive FaceTime",
  "A one-on-one interactive video session arranged directly.",
  "",
  ""
 ],
 [
  "Featured",
  "Panties · 1 day",
  130,
  "One-Day Panties",
  "One day of wear, plus a video and snaps; extras are separate.",
  "",
  ""
 ],
 [
  "Customs",
  "Custom Full Video · 2 min",
  90,
  "Your Custom Video · 2 Min",
  "A made-for-you video; I confirm the details with you first.",
  "",
  ""
 ],
 [
  "Customs",
  "Custom Full Video · 3 min",
  120,
  "Your Custom Video · 3 Min",
  "More time for your personalized video request.",
  "",
  ""
 ],
 [
  "Customs",
  "Custom Full Video · 4 min",
  140,
  "Your Custom Video · 4 Min",
  "The longest standard made-for-you video option.",
  "",
  ""
 ],
 [
  "Customs",
  "JOI Custom Video · 3 min",
  150,
  "JOI Custom · 3 Minutes",
  "A personalized JOI video, three minutes long.",
  "",
  ""
 ],
 [
  "Bundles",
  "10 Premade Pics/Videos",
  10,
  "The Instant Pack · 10",
  "10 premade pics & vids from my collection.",
  "bundle",
  ""
 ],
 [
  "Bundles",
  "20 Premade Pics/Videos",
  20,
  "The Instant Pack · 20",
  "20 premade pics & vids — twice the Instant Pack.",
  "bundle",
  ""
 ],
 [
  "Bundles",
  "50 Premade Pics/Videos",
  50,
  "The Instant Pack · 50",
  "50 premade pics & vids in one bigger bundle.",
  "bundle",
  ""
 ],
 [
  "Bundles",
  "Single B/G Video",
  15,
  "B/G Video · Single",
  "One ready-made B/G video.",
  "",
  ""
 ],
 [
  "Bundles",
  "Complete B/G Vault",
  40,
  "The B/G Vault",
  "The complete B/G video bundle.",
  "",
  ""
 ],
 [
  "Live",
  "10 Live Snaps",
  20,
  "The Live Pack · 10",
  "10 fresh live Snap pics or clips — made in the moment.",
  "",
  ""
 ],
 [
  "Live",
  "20 Live Snaps",
  40,
  "The Live Pack · 20",
  "20 fresh live Snap pics or clips — twice the Live Pack.",
  "",
  ""
 ],
 [
  "Live",
  "7+ Short Live Snaps",
  35,
  "Live Bubbles · 7+",
  "At least seven short live Snap clips or bubbles.",
  "",
  ""
 ],
 [
  "Extras",
  "Detailed Text Rating",
  20,
  "Text Rating",
  "A detailed personalized written rating.",
  "",
  ""
 ],
 [
  "Extras",
  "Detailed Live Snap Video Rating",
  35,
  "Your Live Video Rating",
  "A video rating plus at least five live snaps.",
  "",
  ""
 ]
];
const categories=[["Featured","Start Here"],["Customs","Custom Videos"],["Bundles","Premade & Bundles"],["Live","Live Snaps"],["Extras","Ratings & Extras"]];
const root=document.getElementById('boutiqueCatalog');
if(!root)return;
const quick=document.createElement('p');quick.className='menu-helper';
quick.textContent='Premade = already filmed. Live = made on Snap. Customs = made just for you. Pick your favorites and send me your order ♡';
root.append(quick);
const tabs=document.createElement('div');tabs.className='category-tabs';
tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Browse the menu');root.append(tabs);
categories.forEach(([key,label],index)=>{
 const tab=document.createElement('button');tab.type='button';tab.id='tab-'+key;
 tab.className='category-tab'+(index===0?' active':'');tab.dataset.tab=key;
 tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(index===0));
 tab.setAttribute('aria-controls','panel-'+key);tab.tabIndex=index===0?0:-1;
 tab.textContent=label;tabs.append(tab);
});
categories.forEach(([key],index)=>{
 const panel=document.createElement('div');panel.id='panel-'+key;panel.className='product-panel';
 panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+key);panel.hidden=index!==0;
 products.filter(p=>p[0]===key).forEach(p=>{
  const card=document.createElement('article');card.className='product-card'+(p[0]==='Featured'?' featured':'');
  const info=document.createElement('div'),name=document.createElement('h3');name.className='card-label';name.textContent=p[3];info.append(name);
  const description=document.createElement('p');description.textContent=p[4];info.append(description);
  if(p[6]){
   const details=document.createElement('details');details.className='menu-details';
   const summary=document.createElement('summary');summary.textContent="What's included";
   const copy=document.createElement('p');copy.textContent=p[6];details.append(summary,copy);info.append(details);
  }
  const button=document.createElement('button');button.type='button';button.className='offer-btn add-product';
  button.dataset.name=p[1];button.dataset.price=p[2];
  if(p[5])button.dataset.exclusive=p[5];
  button.setAttribute('aria-label','Add '+p[3]+' for $'+p[2]+(p[1].includes('Monthly')?' per month':''));
  const price=document.createElement('strong');price.className='offer-price';price.textContent='$'+p[2]+(p[1].includes('Monthly')?' / mo':'');info.append(price);
  button.append(document.createTextNode('Add to bag'));
  const add=document.createElement('span');add.textContent='+';button.append(add);
  card.append(info,button);panel.append(card);
 });
 if(key==='Customs'){
  const note=document.createElement('p');note.className='menu-section-note';
  note.textContent='Other customs are quoted individually ($110–$300). Approved specialty themes may add $50.';
  panel.append(note);
 }
 root.append(panel);
});
})();