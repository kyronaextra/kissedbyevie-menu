// ==UserScript==
// @name         Evie SnapDesk · private companion
// @namespace    https://kissedbyevie-menu.onrender.com
// @version      0.1.0
// @description  Manual draft tools and synchronized personality settings; does not read or send Snapchat chats.
// @match        https://web.snapchat.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @connect      cmjhecwwjoeqpcownkol.supabase.co
// @run-at       document-idle
// ==/UserScript==
(function () {
  "use strict";
  const ADMIN = "https://kissedbyevie-menu.onrender.com/bot-studio.html";
  const API = "https://cmjhecwwjoeqpcownkol.supabase.co/functions/v1/evie-bot-sync";
  const KEY_NAME = "evie_snapdesk_device_key_v1";
  const FALLBACK = {
    active_profile: "evie",
    profiles: [
      { id: "evie", name: "Evie", tone: "Confident, warm, playful", guidance: "Keep replies short and personable.", quick_replies: [
        { label: "Hello", text: "Hey you 💕 What did you have in mind?" },
        { label: "Busy", text: "Hey! I'm a little busy but I'll get back to you soon." }
      ] }
    ]
  };
  const token = (() => {
    let existing = GM_getValue(KEY_NAME, "");
    if (/^[A-Za-z0-9_-]{43}$/.test(existing)) return existing;
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    existing = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    GM_setValue(KEY_NAME, existing);
    return existing;
  })();

  let config = GM_getValue("evie_snapdesk_config", FALLBACK);
  if (!config || !Array.isArray(config.profiles)) config = FALLBACK;
  let active = config.active_profile || "evie";
  let panel, statusEl, profileSelect, textInput, output, replyList;

  function profile() {
    return config.profiles.find(p => p.id === active) || config.profiles[0] || FALLBACK.profiles[0];
  }
  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }
  function sync() {
    GM_xmlhttpRequest({
      method: "GET",
      url: API + "?action=profile",
      headers: { "X-Evie-Device-Token": token, "Accept": "application/json" },
      timeout: 12000,
      onload(response) {
        if (response.status === 401 || response.status === 403) {
          setStatus("Not paired. Copy the pairing key from the Tampermonkey menu and enter it in Evie Bot Studio.");
          return;
        }
        if (response.status !== 200) {
          setStatus("Sync unavailable (" + response.status + "). Using cached settings.");
          return;
        }
        try {
          const result = JSON.parse(response.responseText);
          if (!result.configuration || !Array.isArray(result.configuration.profiles)) throw Error("Invalid profiles");
          const valid = result.configuration.profiles.every(p =>
            p && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.quick_replies));
          if (!valid) throw Error("Unexpected profile format");
          config = result.configuration;
          active = config.active_profile || config.profiles[0]?.id || "evie";
          GM_setValue("evie_snapdesk_config", config);
          renderProfiles();
          setStatus("Synced with Evie Admin · revision " + Number(result.revision || 1));
        } catch (error) { setStatus("Invalid server configuration. Using cached settings."); }
      },
      ontimeout() { setStatus("Sync timed out. Using cached settings."); },
      onerror() { setStatus("Offline. Using cached settings."); }
    });
  }
  function quickReply(text) {
    output.value = String(text || "").slice(0, 2000);
    output.focus();
  }
  function makeSuggestion() {
    // All text is typed or pasted deliberately by the owner.
    // No Snapchat DOM, network events, private APIs or messages are inspected.
    const query = textInput.value.trim().toLowerCase();
    const p = profile();
    const replies = p.quick_replies || [];
    const match = replies.find(r => r.label && query.includes(r.label.toLowerCase()));
    const suggestion = match?.text || replies[0]?.text || "Thanks for your message! I'll get back to you.";
    quickReply(suggestion);
    setStatus("Rule-based suggestion ready. Review before copying; this is not an AI-generated answer.");
  }
  function renderProfiles() {
    if (!profileSelect) return;
    profileSelect.replaceChildren();
    config.profiles.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      profileSelect.append(opt);
    });
    profileSelect.value = active;
    replyList.replaceChildren();
    const p = profile();
    (p.quick_replies || []).forEach(r => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = r.label;
      btn.addEventListener("click", () => quickReply(r.text));
      replyList.append(btn);
    });
  }
  function build() {
    if (document.getElementById("evie-snapdesk-root")) return;
    const host = document.createElement("div");
    host.id = "evie-snapdesk-root";
    host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483646;";
    const shadow = host.attachShadow({mode:"closed"});
    const style = document.createElement("style");
    style.textContent = `
      *{box-sizing:border-box} button,input,select,textarea{font:inherit}
      .panel{font:13px/1.5 system-ui,Arial;color:#faf3f7;background:#160f19;border:1px solid #bd558c;
        border-radius:16px;width:min(345px,calc(100vw - 28px));box-shadow:0 12px 46px #0009;overflow:hidden}
      header{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;background:#241528}
      header strong{color:#ff83bd;font-size:14px} header button{border:0;background:transparent;color:white;font-size:18px;cursor:pointer}
      main{padding:12px;display:grid;gap:8px}
      label{color:#d5bbca;font-size:12px;display:grid;gap:4px}
      select,textarea{width:100%;background:#261a2b;border:1px solid #534052;border-radius:8px;color:white;padding:8px}
      textarea{min-height:55px;resize:vertical} textarea.output{min-height:70px}
      .actions,.quick{display:flex;gap:6px;flex-wrap:wrap}
      button.action,.quick button{background:#ef74b0;border:0;color:#170d1d;border-radius:8px;padding:7px 10px;cursor:pointer;font-weight:650}
      .quick button{background:#3e293f;color:#ffe2f1}
      a{color:#ff97c6;font-size:12px} .status{font-size:11px;color:#ddbacd;min-height:2em}
      .small{font-size:11px;color:#b5a5b4} [hidden]{display:none!important}
    `;
    shadow.append(style);
    panel = document.createElement("div");
    panel.className = "panel";
    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = "✦ EVIE SNAPDESK";
    const fold = document.createElement("button");
    fold.textContent = "−";
    fold.setAttribute("aria-label", "Collapse SnapDesk");
    header.append(title,fold); panel.append(header);
    const main = document.createElement("main");
    fold.addEventListener("click", () => { main.hidden = !main.hidden; fold.textContent = main.hidden ? "+" : "−"; });
    const profileLabel = document.createElement("label");
    profileLabel.textContent = "Personality";
    profileSelect = document.createElement("select");
    profileSelect.addEventListener("change", () => { active = profileSelect.value; GM_setValue("evie_snapdesk_local_profile", active); renderProfiles(); });
    profileLabel.append(profileSelect);
    main.append(profileLabel);
    const label = document.createElement("label");
    label.textContent = "Optional message context (manually entered)";
    textInput = document.createElement("textarea");
    textInput.placeholder = "Type a topic or paste text you choose to share...";
    label.append(textInput); main.append(label);
    const actions = document.createElement("div");
    actions.className = "actions";
    function action(label, callback) {
      const button = document.createElement("button");
      button.className = "action"; button.type = "button"; button.textContent = label;
      button.addEventListener("click", callback); actions.append(button);
    }
    action("Suggest reply", makeSuggestion);
    action("Refresh settings", sync);
    main.append(actions);
    const quickLabel = document.createElement("div");
    quickLabel.className = "small"; quickLabel.textContent = "Quick replies";
    main.append(quickLabel);
    replyList = document.createElement("div"); replyList.className = "quick"; main.append(replyList);
    const outLabel = document.createElement("label");
    outLabel.textContent = "Draft (manual approval required)";
    output = document.createElement("textarea"); output.className = "output";
    outLabel.append(output); main.append(outLabel);
    const bottom = document.createElement("div"); bottom.className = "actions";
    const copy = document.createElement("button"); copy.className = "action"; copy.textContent = "Copy draft";
    copy.addEventListener("click", () => { GM_setClipboard(output.value, "text"); setStatus("Copied. Paste into Snapchat yourself."); });
    const studio = document.createElement("a"); studio.href = ADMIN; studio.target = "_blank"; studio.rel = "noopener noreferrer"; studio.textContent = "Open Bot Studio ↗";
    bottom.append(copy,studio); main.append(bottom);
    statusEl = document.createElement("div"); statusEl.className = "status"; statusEl.setAttribute("role","status"); main.append(statusEl);
    panel.append(main); shadow.append(panel); document.body.append(host);
    renderProfiles(); setStatus("Ready. Pair this device from the Tampermonkey menu.");
  }
  GM_registerMenuCommand("Copy Evie pairing key", () => {
    GM_setClipboard(token, "text");
    alert("Pairing key copied. Open Evie Bot Studio on your phone, sign in, and choose Pair device. Do not share the key with anyone.");
  });
  GM_registerMenuCommand("Sync personality settings", sync);
  GM_registerMenuCommand("Open Evie Bot Studio", () => window.open(ADMIN, "_blank", "noopener"));
  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build, {once:true});
  sync();
  setInterval(sync, 60000);
})();