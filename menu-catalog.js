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
   description:'Ten things from this month. That’s it. Don’t expect me to be grateful.',unit:'$1 per item'},
  {section:'BestSellers',name:'20 Items + Free Voice Note',price:20,
   description:'Twenty, plus a voice note saying your name like I mean it. I won’t.',unit:'$1 per item'},
  {section:'BestSellers',name:'50 Items + Live Teasy Snaps',price:50,
   description:'The whole month, plus live teasy Snaps while I’m in the mood to send them.',unit:'$1 per item'},
  {section:'Dropbox',name:'The Dropbox · 800+ Pieces',price:75,group:'vault',
   description:'Everything I’ve made since 2021. Lifetime access, plus one new drop a month. You really don’t need to ask me for the archive again.',
   note:'Squirting, JOI, B/G, anal, teasers, pics, clips, BJ, BJ POV, solo, orgasms, cream, feet, fetish, collabs. If it’s not in there, I haven’t done it yet.',
   badge:'800+ PIECES'},
  {section:'VIP',name:'GFE',price:70,group:'membership',
   description:'The starter version. Let’s see if you can keep up.',
   features:['A Snap every morning. A clip most nights.','I answer you first. Not always fast. First.','Actual conversation about your day, not just my content.','My real number, not a burner.','OnlyFans on me.','Fifty things I picked for you. No folder dump.','Casual FaceTime or call when I’m free. Free means free. Don’t push it.'],
   note:'No vault and no explicit calls. If that’s what you came for, keep scrolling.'},
  {section:'VIP',name:'VIP · 1 Month GFE',price:150,group:'membership',badge:'MOST AFFORDABLE VIP',
   description:'The real version. Everything in GFE, plus the things I don’t hand out.',
   features:['One month of GFE','My entire vault · 800+ pieces','One custom Snap, made for you','Explicit and casual FaceTimes and calls','Curated clips sent straight to your chat','Priority messages, my real number, and OnlyFans on me'],
   note:'10 seats. That’s the whole thing. I can’t look after more than ten at once.'},
  {section:'VIP',name:'VIP · 3 Months GFE',price:300,group:'membership',badge:'BEST VALUE',
   description:'Three months. One month is a trial run and we both know it.',
   features:['Three months of GFE','Everything in 1 Month VIP','A two-minute custom video','Discounted FaceTimes and calls','OnlyFans on me for a year','One request a week for my Stripchat live. Can’t make it? I’ll record it.','Daily Snaps and videos made just for you','Built around your kinks. Tell me what they are.'],
   note:'$3.30 a day. Less than the coffee you’re drinking while you decide.'},
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
  {section:'More',name:'Dick Rate · Text',price:20,
   description:'Written. Blunt. You asked.'},
  {section:'More',name:'Dick Rate · Video',price:35,
   description:'On camera, out loud, to your face.'},
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
  "BestSellers": [
    "New set on the 1st. Last month’s gets pulled and buried in the Dropbox, so if you wanted it, you should’ve been faster. These packs are this month only."
  ],
  "Dropbox": [
    "Already bought a pack and want VIP? Ask and I’ll send the difference. I’m generous, not stupid. Cheaper per piece than anything else on this page. I’m aware. Don’t get used to it."
  ],
  "VIP": [
    "FaceTime comes with VIP. Extra time is $60 for 8 minutes, for current VIP members only. Minutes reset monthly. Use them or lose them."
  ],
  "Customs": [
    "Custom photo sets start at 5 for $45, plus $7 a photo. Videos start at 3 minutes for $60, plus $15 a minute after that. Rush is $15. Nothing starts until I’ve quoted you and you’ve agreed. No surprise invoices, no surprise requests."
  ],
  "More": [
    "Live things get scheduled with me. I confirm the time before you pay. Don’t send money for a live without a confirmed time."
  ]
};
const root=document.getElementById('boutiqueCatalog');
if(!root)return;
const intro=document.createElement('div');intro.className='menu-picker-intro';
const introHeading=document.createElement('h3');introHeading.className='menu-picker-title';introHeading.textContent='Know what you want?';
const introHint=document.createElement('p');introHint.className='menu-helper';introHint.textContent='Most of you don’t. Start with the Dropbox. It’s the only thing here that’s actually a bargain, and I don’t say that often.';
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
  if(p.name==='Live Clips · Sent to Your Chat')return {label:'Add these clips',variant:'btn-primary'};
  if(p.name.startsWith('Live Snap Show'))return {label:'Choose this live',variant:'btn-primary'};
 if(p.name.includes('Sexting'))return {label:'Choose this session',variant:'btn-primary'};
 if(p.name.includes('Phone Call'))return {label:'Request a call',variant:'btn-secondary'};
 if(p.name.includes('Custom'))return {label:'Request this custom',variant:'btn-primary'};
 if(p.section==='Mid')return {label:'Add this pick',variant:'btn-primary'};
 return {label:'Add to bag',variant:'btn-secondary'};
}
categories.forEach(([section],i)=>{
 const panel=el('div','product-panel menu-v2-panel'+(section==='VIP'?' vip-three':''));
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
   card.append(info,buy);
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
