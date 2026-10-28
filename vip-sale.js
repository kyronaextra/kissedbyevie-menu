(function(){
 'use strict';
 const banner=document.getElementById('vipSaleAnnouncement'),menu=document.getElementById('boutique');
 if(!banner||!menu)return;
 const expires=Date.parse('2026-11-01T00:00:00-07:00');
 let started=false,timer=null;
 function hide(){banner.hidden=true;if(timer!==null){clearTimeout(timer);timer=null;}}
 function jumpToMenu(){
  if(location.hash&&location.hash!=='#top')return;
  const root=document.documentElement,original=root.style.scrollBehavior;
  root.style.scrollBehavior='auto';
  menu.scrollIntoView({block:'start',behavior:'auto'});
  requestAnimationFrame(function(){root.style.scrollBehavior=original;});
 }
 function start(){
  if(started)return;
  started=true;
  jumpToMenu();
  if(Date.now()>=expires){banner.remove();return;}
  banner.hidden=false;
  timer=setTimeout(hide,7000);
 }
 function startWhenReady(){
  if(document.readyState==='complete')start();
  else window.addEventListener('load',start,{once:true});
 }
 document.getElementById('vipSaleClose').addEventListener('click',hide);
 document.getElementById('vipSaleShop').addEventListener('click',function(){
  const vipTab=document.getElementById('tab-Memberships');
  if(vipTab)vipTab.click();
  hide();
 });
 window.addEventListener('evie:access-granted',startWhenReady);
 window.addEventListener('load',function(){if(!document.getElementById('accessGate'))start();});
})();
