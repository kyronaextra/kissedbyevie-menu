(function(){
  'use strict';
  var button=document.getElementById('installAppButton');
  var dialog=document.getElementById('installAppDialog');
  var instructions=document.getElementById('installAppInstructions');
  var close=document.getElementById('installAppClose');
  if(!button||!dialog||!instructions||!close)return;
  var promptEvent=null;
  var standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  if(standalone){button.hidden=true;return;}
  window.addEventListener('beforeinstallprompt',function(event){
    event.preventDefault();
    promptEvent=event;
    button.textContent='INSTALL APP';
  });
  window.addEventListener('appinstalled',function(){button.hidden=true;promptEvent=null;});
  button.addEventListener('click',async function(){
    if(promptEvent){
      promptEvent.prompt();
      await promptEvent.userChoice;
      promptEvent=null;
      return;
    }
    var isApple=/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
    var isSafari=isApple&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
    instructions.textContent=isSafari
      ? 'Tap Share in Safari, then choose Add to Home Screen. Open it from your home screen for the full screen version.'
      : isApple
        ? 'Open this page in Safari, tap Share, then choose Add to Home Screen.'
        : 'Open your browser menu and choose Install app or Add to Home screen.';
    if(!dialog.open)dialog.showModal();
  });
  close.addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('click',function(event){if(event.target===dialog)dialog.close();});
})();
