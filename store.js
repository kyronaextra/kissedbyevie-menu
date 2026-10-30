(function(){
'use strict';
// KissedByEvie storefront: this is the single source of truth for item names and prices.
// Prices marked "from" are minimums; all orders are reviewed before payment.
const categories=[
  ["BestSellers","Best sellers"],
  ["Dropbox","The Dropbox"],
  ["VIP","VIP Access"],
  ["Customs","Customs"],
  ["More","Quick interactions"]
];
const products=[
  {section:'BestSellers',name:'10 Items · This Month’s Set',price:10,
   description:'10 items from this month’s set.',unit:'$1 per item'},
  {section:'BestSellers',name:'20 Items + Free Voice Note',price:20,
   description:'20 items from this month’s set plus one free voice note.',unit:'$1 per item'},
  {section:'BestSellers',name:'50 Items + Live Teasy Snaps',price:50,
   description:'50 items from this month’s set with live, teasing Snaps.',unit:'$1 per item'},
  {section:'Dropbox',name:'The Dropbox · 800+ Items',price:75,group:'vault',
   description:'The whole archive with lifetime access and one new drop added monthly.',
   note:'Includes squirting, JOI, B/G, anal, teasers, pics, clips, BJ, BJ POV, solo content, orgasms, cream, feet, fetish content, and collabs.'},
  {section:'VIP',name:'VIP',price:70,group:'membership',
   description:'Dropbox access, one 5 minute FaceTime per month, 30 minutes of sexting per month, custom content, and priority booking.',
   note:'10 seats. New drops have standard access. Additional FaceTime is $60 per 8 minutes and is available only to VIP members.'},
  {section:'VIP',name:'VIP Elite',price:150,group:'membership',
   description:'Dropbox access, one 15 minute FaceTime per month, 60 minutes of sexting per month, custom content, first access to new drops and live content, and priority expedited booking.',
   note:'5 seats. Includes one 2 minute video custom.'},
  {section:'Customs',name:'Custom Photo Set · 5 Photos',price:45,
   description:'Five custom photos. Add $7 per additional photo.'},
  {section:'Customs',name:'Custom Video · 3 Minutes',price:60,
   description:'Three minute custom video. Add $15 per minute after the first three. Potential add on fees are quoted first.'},
  {section:'Customs',name:'Same Day Turnaround',price:15,extra:true,
   description:'Priority delivery when my schedule allows. Ask first.'},
  {section:'More',name:'Live Content Add On',price:10,
   description:'Live content made for you and sent in chat.'},
  {section:'More',name:'Moan Your Name',price:10,
   description:'Add your name to an approved custom. This keeps the content exclusive to your order.'},
  {section:'More',name:'JOI Add On',price:20,
   description:'Dirty talk and JOI added to an approved session.'},
  {section:'More',name:'Voice Note',price:10,
   description:'A personal voice note from me.'},
  {section:'More',name:'Dick Rate · Text',price:20,
   description:'A personalized written rating.'},
  {section:'More',name:'Dick Rate · Video',price:35,
   description:'A personalized video rating.'},
  {section:'More',name:'Sexting · 10 Minutes',price:30,unit:'text only',
   description:'Ten minutes of private sexting, scheduled with me.'},
  {section:'More',name:'Sexting · 15 Minutes',price:40,unit:'text only',
   description:'Fifteen minutes of private sexting, scheduled with me.'},
  {section:'More',name:'Sexting · 30 Minutes',price:75,unit:'text only',
   description:'Thirty minutes of private sexting, scheduled with me.'},
  {section:'More',name:'Live Snap Show · 2 Minutes',price:45,
   description:'A 2 minute live Snap show.'},
  {section:'More',name:'Live Snap Show · 5 Minutes',price:65,
   description:'A 5 minute live Snap show. Sit back and relax, like a FaceTime, without me needing to see you.'}
];
const notes={
  "BestSellers": [
    "A new set drops on the 1st. Last month’s set is pulled and moved to the Dropbox, so it becomes archive only.",
    "The 10, 20, and 50 item offers are from this month’s set."
  ],
  "Dropbox": [
    "The Dropbox is the whole archive with lifetime access and one new drop added monthly."
  ],
  "VIP": [
    "VIP has 10 seats. VIP Elite has 5 seats. FaceTime and sexting minutes reset monthly.",
    "Additional FaceTime is $60 per 8 minutes and is only available to VIP members."
  ],
  "Customs": [
    "Custom photo sets start at 5 for $45, plus $7 per additional photo.",
    "Custom videos start at 3 minutes for $60, plus $15 per minute after the first three. Same day priority is $15 when my schedule allows."
  ],
  "More": [
    "Live content and add ons are scheduled with me. Please confirm availability before paying."
  ]
};
const root=document.getElementById('boutiqueCatalog');
if(!root)return;
const intro=document.createElement('div');intro.className='menu-picker-intro';
const introHeading=document.createElement('h3');introHeading.className='menu-picker-title';introHeading.textContent='Pick a category';
const introHint=document.createElement('p');introHint.className='menu-helper';introHint.textContent='Start with the best sellers, then browse the rest of the menu. For premade content, pick your category first.';
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