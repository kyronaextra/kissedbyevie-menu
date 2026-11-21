/* Evie live stage.
   One place to change the Stripchat player, the room link, and the offline loop.

   Official iframe: Stripcash Player widget on creative.stripchat.com.
   stripchat.com/embed/{id} is not a player (404). The widget selects the room
   with modelName. Embed id 287185885 is the Stripchat account eviesquirts
   (confirmed on the public model status API). The token is the legacy snapshot
   token; the video widget ignores unknown params, and it is kept on the URL
   so this constant stays the single embed link.

   Offline loop file: /assets/video/evie-offline-loop.mp4
   Poster: /assets/video/evie-offline-poster.jpg
   Keep the full clip. A replacement should be 720p H.264 MP4, faststart
   (moov before mdat), no audio track, under about 6 MB, and a 6–12 second
   seamless loop. The file Evie sent is the full 31 second, 1280x720, silent,
   ~4.6 MB clip and is what plays until she swaps it.
*/
(function () {
  'use strict';

  var EMBED_ID = '287185885';
  var EMBED_TOKEN = '5d387c913c69b187932e6af8f6f9187d';
  var MODEL_NAME = 'eviesquirts';
  var EMBED_URL = 'https://creative.stripchat.com/widgets/Player'
    + '?modelName=' + encodeURIComponent(MODEL_NAME)
    + '&strict=1&muted=1&autoplay=all&hideLiveBadge=1'
    + '&userId=' + encodeURIComponent(EMBED_ID)
    + '&token=' + encodeURIComponent(EMBED_TOKEN);
  var ROOM_URL = 'https://stripchat.com/' + MODEL_NAME;
  var OFFLINE_VIDEO = '/assets/video/evie-offline-loop.mp4';
  var OFFLINE_POSTER = '/assets/video/evie-offline-poster.jpg';
  var CACHE_KEY = 'evie-stripchat-status-v1';
  var CACHE_MS = 50000;

  var root = document.getElementById('evieLive');
  var frame = document.getElementById('evieLiveFrame');
  var offline = document.getElementById('evieOffline');
  var video = document.getElementById('evieOfflineVideo');
  var fallback = document.getElementById('evieOfflineFallback');
  var badge = document.getElementById('evieLiveBadge');
  var playBtn = document.getElementById('evieOfflinePlay');
  if (!root || !frame || !offline || !video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  video.playsInline = true;
  if (!video.getAttribute('poster')) video.poster = OFFLINE_POSTER;
  if (!video.getAttribute('src')) video.src = OFFLINE_VIDEO;

  var cta = document.getElementById('evieLiveCta');
  if (cta) cta.href = ROOM_URL;

  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) { reduced = false; }
  if (reduced) video.pause();
  var gateNow = document.getElementById('ageGate');
  if (gateNow && !gateNow.hidden) video.pause();

  var previewLive = false;
  try {
    previewLive = new URLSearchParams(window.location.search).get('stripchatPreview') === 'live';
  } catch (err) { previewLive = false; }

  var wantLive = false;
  var iframeMounted = false;
  var nearView = false;
  var showingLive = false;

  function showPosterOnly() {
    if (showingLive || !video.getAttribute('src')) return;
    video.hidden = true;
    if (fallback) fallback.hidden = false;
    if (playBtn) playBtn.hidden = true;
  }

  video.addEventListener('error', showPosterOnly);

  function playLoop() {
    if (showingLive) return;
    if (video.hidden) return;
    video.muted = true;
    var pending = video.play();
    if (pending && typeof pending.catch === 'function') pending.catch(function () {});
  }

  function armOfflineMotion() {
    if (showingLive) return;
    if (reduced) {
      video.removeAttribute('autoplay');
      video.pause();
      if (playBtn) playBtn.hidden = false;
      return;
    }
    if (playBtn) playBtn.hidden = true;
    playLoop();
  }

  if (playBtn) {
    playBtn.addEventListener('click', function () {
      playBtn.hidden = true;
      playLoop();
    });
  }

  function mountIframe() {
    if (!wantLive || iframeMounted) return;
    if (!nearView) return;
    var iframe = document.getElementById('evieLivePlayer');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'evieLivePlayer';
      iframe.title = 'Evie live on Stripchat';
      iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.loading = 'lazy';
      frame.appendChild(iframe);
    }
    if (!iframe.getAttribute('src')) iframe.src = EMBED_URL;
    iframeMounted = true;
  }

  function showLive() {
    showingLive = true;
    wantLive = true;
    offline.hidden = true;
    if (badge) badge.hidden = false;
    frame.classList.add('is-live');
    video.pause();
    video.removeAttribute('src');
    video.load();
    mountIframe();
  }

  function showOffline() {
    showingLive = false;
    wantLive = false;
    offline.hidden = false;
    if (badge) badge.hidden = true;
    frame.classList.remove('is-live');
    var iframe = document.getElementById('evieLivePlayer');
    if (iframe) iframe.removeAttribute('src');
    iframeMounted = false;
    if (!video.getAttribute('src')) {
      video.hidden = false;
      if (fallback) fallback.hidden = true;
      video.src = OFFLINE_VIDEO;
      video.load();
    }
    if (ageCleared()) armOfflineMotion();
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.at !== 'number' || typeof data.live !== 'boolean') return null;
      if (Date.now() - data.at > CACHE_MS) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function writeCache(live) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({live: live, at: Date.now()}));
    } catch (err) { /* private mode */ }
  }

  function statusUrl() {
    var base = window.EVIE_SUPABASE_URL || '';
    if (!base) return '';
    return base.replace(/\/$/, '') + '/functions/v1/evie-stripchat-status';
  }

  function applyLive(live) {
    if (live) showLive();
    else showOffline();
  }

  async function refresh() {
    if (previewLive) {
      applyLive(true);
      return;
    }
    var cached = readCache();
    if (cached) {
      applyLive(cached.live);
      return;
    }
    var endpoint = statusUrl();
    if (!endpoint) {
      if (!showingLive) applyLive(false);
      return;
    }
    var headers = {accept: 'application/json'};
    if (window.EVIE_SUPABASE_PUBLISHABLE_KEY) headers.apikey = window.EVIE_SUPABASE_PUBLISHABLE_KEY;
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : 0;
    try {
      var res = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
        headers: headers,
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) throw new Error('status');
      var data = await res.json();
      var live = !!(data && data.ok === true && data.live === true);
      writeCache(live);
      applyLive(live);
    } catch (err) {
      if (!showingLive) applyLive(false);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function ageCleared() {
    var gate = document.getElementById('ageGate');
    return !gate || gate.hidden;
  }

  function onReady() {
    if (!ageCleared()) return;
    if (!showingLive) armOfflineMotion();
    refresh();
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      nearView = entries.some(function (entry) { return entry.isIntersecting; });
      if (nearView) mountIframe();
    }, {rootMargin: '240px 0px'});
    observer.observe(frame);
  } else {
    nearView = true;
  }

  var gate = document.getElementById('ageGate');
  if (gate && !gate.hidden) {
    video.pause();
    var confirm = document.getElementById('ageGateConfirm');
    if (confirm) confirm.addEventListener('click', onReady);
    if ('MutationObserver' in window) {
      var gateObserver = new MutationObserver(function () {
        if (ageCleared()) onReady();
      });
      gateObserver.observe(gate, {attributes: true, attributeFilter: ['hidden']});
    }
  } else {
    onReady();
  }

  setInterval(function () {
    if (previewLive) return;
    if (document.visibilityState === 'hidden') return;
    try { sessionStorage.removeItem(CACHE_KEY); } catch (err) { /* ignore */ }
    refresh();
  }, CACHE_MS);
})();
