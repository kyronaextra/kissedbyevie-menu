/* Shared 18+ gate. The confirmation flag is evie-age-confirmed-v2. */
(function () {
  'use strict';
  var gate = document.getElementById('ageGate');
  var botStep = document.getElementById('botGateStep');
  var ageStep = document.getElementById('ageGateStep');
  var notBot = document.getElementById('notBotConfirm');
  var confirm = document.getElementById('ageGateConfirm');
  if (!gate || !botStep || !ageStep || !notBot || !confirm) return;
  var key = 'evie-age-confirmed-v2';
  var pageParts = Array.from(document.body.children).filter(function (node) { return node !== gate; });
  function setPageBlocked(blocked) {
    document.body.style.overflow = blocked ? 'hidden' : '';
    pageParts.forEach(function (node) { node.inert = blocked; });
  }
  var already = false;
  try { already = localStorage.getItem(key) === 'yes'; } catch (err) { /* private mode */ }
  if (already) {
    gate.hidden = true;
    setPageBlocked(false);
    return;
  }
  setPageBlocked(true);
  notBot.focus();
  notBot.addEventListener('click', function () {
    botStep.hidden = true;
    ageStep.hidden = false;
    gate.setAttribute('aria-labelledby', 'ageGateTitle');
    gate.setAttribute('aria-describedby', 'ageGateDescription');
    confirm.focus();
  });
  confirm.addEventListener('click', function () {
    try { localStorage.setItem(key, 'yes'); } catch (err) { /* private mode */ }
    gate.hidden = true;
    setPageBlocked(false);
  });
  document.addEventListener('keydown', function (event) {
    if (gate.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
    }
    if (event.key !== 'Tab') return;
    var focusable = Array.from(gate.querySelectorAll('button,a[href]')).filter(function (el) {
      return !el.closest('[hidden]');
    });
    if (!focusable.length) return;
    var index = focusable.indexOf(document.activeElement);
    var next = event.shiftKey
      ? (index <= 0 ? focusable.length - 1 : index - 1)
      : (index === focusable.length - 1 ? 0 : index + 1);
    event.preventDefault();
    focusable[next].focus();
  }, true);
})();
