// ==UserScript==
// @name         Evie SnapDesk · local-first
// @namespace    https://kissedbyevie-menu.onrender.com
// @version      2.1.0
// @description  Trust-ladder drafts + optional self-send. Works standalone; server sync optional.
// @match        https://web.snapchat.com/*
// @match        https://x.com/*
// @match        https://web.telegram.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @connect      cmjhecwwjoeqpcownkol.supabase.co
// @run-at       document-idle
// @noframes
// ==/UserScript==
(function () {
  "use strict";
  const API = "https://cmjhecwwjoeqpcownkol.supabase.co/functions/v1/evie-bot-sync";
  const KEY_NAME = "evie_snapdesk_device_key_v1";
  const CK = "evie_config_v2";
  const LK = { aut:"evie_autonomy_v1", until:"evie_autonomy_until_v1", kill:"evie_kill_v1",
    take:"evie_takeover_v1", sel:"evie_selector_v1", log:"evie_log_v1", hash:"evie_hash_v1", streak:"evie_streak_v1" };

  const MENU = {
    bundle_10:{label:"10 random photos/videos",amount:10}, bundle_20:{label:"20 surprise photos/videos",amount:20},
    bundle_50:{label:"50 surprise photos/videos",amount:40}, dropbox:{label:"Deluxe Dropbox · 800+ items",amount:75},
    of_month:{label:"OnlyFans · monthly",amount:3}, gfe_basic:{label:"Basic GFE · 1 month",amount:70},
    vip_daddy:{label:"VIP Daddy · 3 months",amount:150}, vip_ultimate:{label:"Ultimate VIP Daddy · 6 months",amount:350},
    set_signature:{label:"Signature Set · 5 photos + 1-min",amount:35}, set_full:{label:"Full Shoot · 10 photos + 2-min",amount:50},
    set_custom_2:{label:"Custom Full Shoot · 10 + 2-min",amount:90}, set_custom_4:{label:"Custom Full Shoot · 10 + 4-min",amount:150},
    custom_1min:{label:"Custom 1-minute video",amount:50,startingAt:true}, custom_10photo:{label:"Custom 10-photo set",amount:45,startingAt:true},
    custom_general:{label:"General custom request",amount:50,startingAt:true}, rating_detail:{label:"Detailed rating",amount:15},
    rating_dick:{label:"Dick rating",amount:35}, voice_note:{label:"Voice note",amount:12},
    flash_teasers:{label:"Flash + 5 live teasers",amount:25}, live_1min:{label:"One-minute live ass/tit/spit",amount:45},
    feet_5:{label:"Five feet photos",amount:20}, live_show:{label:"Live show",amount:55},
    extras:{say_name:25,dommy:30,submissive:20,panty:20}
  };
  const RULES = [
    {id:"screen_hey",name:"Lazy greeting",enabled:true,priority:60,tier:"auto",match:{type:"regex",value:"^(hey|hi|heyy+|hello|yo|sup)\\b"},reply:"hey you ♡ what did you have in mind — a bundle, something custom, or a VIP package?"},
    {id:"ask_price",name:"Price question",enabled:true,priority:90,tier:"auto",match:{type:"regex",value:"\\b(price|prices|how much|cost|menu|rates?)\\b"},reply:"here's the list ♡\n\nbundles — {{bundle_10}} · {{bundle_20}} · {{bundle_50}}\ndeluxe vault — {{dropbox}}\ncustoms — from {{custom_1min}}\nratings — {{rating_detail}} detailed · {{rating_dick}} dick\nvoice note — {{voice_note}}\nlive — {{live_show}}\n\nwhich one?"},
    {id:"ask_custom",name:"Custom request",enabled:true,priority:80,tier:"draft",match:{type:"regex",value:"\\b(custom|make me|personal|just for me)\\b"},reply:"customs start at {{custom_1min}} and go up with length and extras.\ntell me three things you like and i'll do the rest ♡"},
    {id:"ask_what",name:"What do you do",enabled:true,priority:75,tier:"draft",match:{type:"regex",value:"\\b(what do you (do|offer)|what can you|what do i get)\\b"},reply:"the good stuff obviously ♡ bundles, customs, JOI, ratings, live, and the vip stuff.\nwhat are you in the mood for?"},
    {id:"age",name:"Age gate",enabled:true,priority:85,tier:"auto",match:{type:"regex",value:"\\b(how old|over ?18|18\\+|age)\\b"},reply:"old enough to be here? ♡ you over 18 babe"},
    {id:"paid",name:"Says he paid",enabled:true,priority:88,tier:"draft",match:{type:"regex",value:"\\b(paid|just sent|sent it|i sent|payment|sent you)\\b"},reply:"don't tell me the amount, i'll check ♡ give me a sec.\npayment isn't confirmed until i see it land."},
    {id:"thanks",name:"Thanks",enabled:true,priority:50,tier:"auto",match:{type:"regex",value:"\\b(thanks|thank you|ty|thx)\\b"},reply:"you're welcome, good boy ♡"},
    {id:"joi",name:"JOI",enabled:true,priority:80,tier:"draft",match:{type:"regex",value:"\\bjoi\\b|jerk off|stroke"},reply:"JOI is the best one ♡ i talk, you listen, and i don't let you cum early.\nwant it as an audio or live?"},
    {id:"when",name:"Delivery time",enabled:true,priority:70,tier:"auto",match:{type:"regex",value:"\\b(when|how long|delivery|how soon|eta)\\b"},reply:"customs are finished within 48 hours ♡ priority is faster if you ask."},
    {id:"married",name:"Married / sneaky",enabled:true,priority:82,tier:"draft",match:{type:"regex",value:"\\b(wife|married|sneak|she's|she is)\\b"},reply:"she doesn't know. i do. ♡\nwant the sneaky custom? quiet little audio, made for exactly this."},
    {id:"vip",name:"VIP",enabled:true,priority:78,tier:"draft",match:{type:"regex",value:"\\b(vip|daddy package|subscribe|membership|gfe)\\b"},reply:"vip is where it gets serious ♡\nbasic gfe {{gfe_basic}} · vip daddy {{vip_daddy}} · ultimate {{vip_ultimate}}\nall include priority and daily content."},
    {id:"tip",name:"Tip",enabled:true,priority:55,tier:"auto",match:{type:"regex",value:"\\b(tip|tipped|tipping)\\b"},reply:"tips are how you show you mean it ♡ not extra — necessary."},
    {id:"angry",name:"Problem / refund",enabled:true,priority:92,tier:"escalate",match:{type:"regex",value:"\\b(refund|scam|didn'?t (get|receive)|wrong|broken|complaint)\\b"},reply:""},
    {id:"bye",name:"Goodnight",enabled:true,priority:45,tier:"auto",match:{type:"regex",value:"\\b(good ?night|gn|going to bed|sleep)\\b"},reply:"goodnight babe ♡ don't touch it before bed, i'll know."}
  ];
  const DEFAULT = { active_profile:"evie",
    settings:{autonomy:"shadow",autoMinPriority:80,sendDelayMs:3000,cooldownMs:4000,takeoverBackoffMs:600000,maxAutoTurns:2,logDecisions:true},
    menu:MENU, automations:RULES };

  let config = GM_getValue(CK, null);
  if (!config || !Array.isArray(config.automations)) config = JSON.parse(JSON.stringify(DEFAULT));
  config.settings = Object.assign({}, DEFAULT.settings, config.settings || {});
  if (!config.menu || !Object.keys(config.menu).length) config.menu = MENU;
  const saveConfig = () => GM_setValue(CK, config);

  const st = {
    get aut(){return GM_getValue(LK.aut,"shadow");}, set aut(v){GM_setValue(LK.aut,v);},
    get until(){return Number(GM_getValue(LK.until,0));}, set until(v){GM_setValue(LK.until,v);},
    get kill(){return GM_getValue(LK.kill,false);}, set kill(v){GM_setValue(LK.kill,v);},
    get takeover(){return Number(GM_getValue(LK.take,0));}, set takeover(v){GM_setValue(LK.take,v);},
    get streak(){return Number(GM_getValue(LK.streak,0));}, set streak(v){GM_setValue(LK.streak,v);},
    get sel(){return GM_getValue(LK.sel,"");}, set sel(v){GM_setValue(LK.sel,v);},
    get log(){return GM_getValue(LK.log,[]);}, set log(v){GM_setValue(LK.log,v.slice(-300));}
  };
  const RUNG_LABEL = { shadow:"audit-only", fill:"suggest", auto_safe:"self-send only", auto_all:"Full auto" };
  const RANK = { shadow:0, fill:1, auto_safe:2, auto_all:3 };
  let selfWriting = false, lastSendAt = 0, pending = null, pickMode = false;
  let panel, statusEl, logEl, timerEl, undoEl, editorEl;

  const addLog = e => { if (config.settings.logDecisions) st.log = st.log.concat([Object.assign({at:Date.now()},e)]); };
  const status = m => { if (statusEl) statusEl.textContent = m; };

  function money(k) {
    let n = config.menu;
    for (const p of k.split(".")) n = n && n[p];
    if (typeof n === "number") return "$" + n;
    if (n && typeof n === "object" && typeof n.amount === "number") return (n.startingAt ? "starting at $" : "$") + n.amount;
    return "{{" + k + "}}";
  }
  const render = t => String(t || "").replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, k) => money(k));

  const vis = n => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  function findComposer() {
    if (st.sel) { const n = document.querySelector(st.sel); if (n && vis(n)) return n; }
    return [...document.querySelectorAll('div[contenteditable="true"], textarea')].filter(vis)
      .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0] || null;
  }
  function setNative(el, v) {
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
  }
  function fill(text) {
    const c = findComposer(); if (!c) return false;
    selfWriting = true;
    try {
      if (c.tagName === "TEXTAREA" || c.tagName === "INPUT") setNative(c, text);
      else { c.focus(); document.execCommand("selectAll"); document.execCommand("insertText", false, text); }
      c.dispatchEvent(new Event("input", { bubbles: true }));
    } finally { setTimeout(() => { selfWriting = false; }, 60); }
    return true;
  }
  function fire() {
    const c = findComposer(); if (!c) return;
    selfWriting = true;
    c.dispatchEvent(new KeyboardEvent("keydown", { key:"Enter", code:"Enter", keyCode:13, which:13, bubbles:true }));
    setTimeout(() => { selfWriting = false; }, 60);
  }
  function lastInbound() {
    const root = document.querySelector('[role="log"]') || document.querySelector("main") || document.body;
    const nodes = [...root.querySelectorAll("div,span,p")].filter(n => {
      const t = (n.textContent || "").trim();
      return t && t.length < 700 && n.children.length <= 2 && vis(n);
    });
    if (!nodes.length) return "";
    const mid = window.innerWidth / 2;
    const left = nodes.filter(n => { const r = n.getBoundingClientRect(); return r.left + r.width / 2 < mid; });
    return ((left.at(-1) || nodes.at(-1)).textContent || "").trim().replace(/\s+/g, " ");
  }

  function matchRule(text) {
    const q = String(text || "").toLowerCase();
    if (!q) return { rule:null, tie:false };
    const hits = (config.automations || []).filter(r => {
      if (!r || r.enabled !== true || !r.match) return false;
      const v = String(r.match.value || "").toLowerCase();
      if (r.match.type === "exact") return q === v;
      if (r.match.type === "regex") { try { return new RegExp(r.match.value, "i").test(q); } catch { return false; } }
      return q.includes(v);
    }).sort((a, b) => (b.priority || 0) - (a.priority || 0));
    if (!hits.length) return { rule:null, tie:false };
    return { rule:hits[0], tie: hits.length > 1 && (hits[0].priority || 0) === (hits[1].priority || 0) };
  }
  function decide(text) {
    const s = config.settings;
    const { rule, tie } = matchRule(text);
    if (!rule) return { action:"escalate", reason:"no rule matched", rule:null };
    if (tie) return { action:"escalate", reason:"priority tie", rule };
    if (rule.tier === "escalate") return { action:"escalate", reason:"rule tier: escalate", rule };
    if (st.aut === "shadow") return { action:"none", reason:"audit-only", rule };
    if (rule.tier === "auto" && (rule.priority || 0) >= s.autoMinPriority && RANK[st.aut] >= 2) {
      if (st.streak >= s.maxAutoTurns) return { action:"fill", reason:"max auto turns", rule };
      return { action:"send", reason:"auto", rule };
    }
    return { action:"fill", reason:"suggest", rule };
  }

  function handleInbound(text) {
    const hash = String(text).slice(0, 220);
    if (hash === GM_getValue(LK.hash, "")) return;
    GM_setValue(LK.hash, hash);
    st.streak = 0;
    if (st.kill) return addLog({ inbound:hash, action:"none", reason:"kill switch" });
    if (Date.now() < st.takeover) return addLog({ inbound:hash, action:"none", reason:"you took over" });
    const d = decide(text);
    if (d.action === "none") return addLog({ inbound:hash, action:"none", reason:d.reason, rule:d.rule && d.rule.id });
    if (d.action === "escalate") { addLog({ inbound:hash, action:"escalate", reason:d.reason, rule:d.rule && d.rule.id }); status("⚠ needs you"); return; }
    const out = render(d.rule.reply);
    if (!out) return addLog({ inbound:hash, action:"none", reason:"empty reply", rule:d.rule.id });
    fill(out);
    addLog({ inbound:hash, action:d.action, reason:d.reason, rule:d.rule.id, reply:out });
    if (d.action === "send") scheduleSend(out); else status("suggested · press enter");
  }
  function scheduleSend(out) {
    const wait = config.settings.sendDelayMs;
    clearTimeout(pending);
    if (wait > 0 && undoEl) undoEl.hidden = false;
    pending = setTimeout(() => {
      if (st.kill) return;
      if (Date.now() - lastSendAt < config.settings.cooldownMs) return scheduleSend(out);
      fire(); lastSendAt = Date.now(); st.streak += 1;
      if (undoEl) undoEl.hidden = true;
      status("sent · turn " + st.streak);
    }, wait);
  }
  const cancelSend = () => { clearTimeout(pending); if (undoEl) undoEl.hidden = true; status("send cancelled"); };

  function setAutonomy(rung, hours) {
    st.aut = rung;
    st.until = hours ? Date.now() + hours * 3600000 : 0;
    addLog({ action:"mode", reason:rung + (hours ? " for " + hours + "h" : "") });
    render(); status(RUNG_LABEL[rung] + (hours ? " · reverts in " + hours + "h" : ""));
  }
  setInterval(() => {
    if (st.until && Date.now() > st.until) {
      st.until = 0; st.aut = "shadow"; render();
      addLog({ action:"mode", reason:"timer expired → audit-only" }); status("timer expired → audit-only");
    }
    if (timerEl) timerEl.textContent = st.until ? "⏳ " + Math.ceil((st.until - Date.now()) / 60000) + " min left" : "";
  }, 5000);

  document.addEventListener("keydown", e => {
    const c = findComposer(); if (!c || !c.contains(e.target)) return;
    if (!selfWriting) st.takeover = Date.now() + config.settings.takeoverBackoffMs;
  }, true);
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) { st.kill = !st.kill; render(); }
  });
  document.addEventListener("click", e => {
    if (!pickMode) return;
    const n = e.target.closest('div[contenteditable="true"], textarea'); if (!n) return;
    e.preventDefault(); e.stopPropagation();
    let sel = n.tagName.toLowerCase();
    if (n.id) sel += "#" + n.id;
    else if (typeof n.className === "string" && n.className.trim()) sel += "." + n.className.trim().split(/\s+/).slice(0, 2).join(".");
    st.sel = sel; pickMode = false; render(); status("composer locked");
  }, true);

  setInterval(() => { const t = lastInbound(); if (t) handleInbound(t); }, 1200);

  const token = (() => {
    let k = GM_getValue(KEY_NAME, "");
    if (/^[A-Za-z0-9_-]{43}$/.test(k)) return k;
    const b = new Uint8Array(32); crypto.getRandomValues(b);
    k = btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    GM_setValue(KEY_NAME, k); return k;
  })();
  function sync() {
    GM_xmlhttpRequest({ method:"GET", url: API + "?action=profile",
      headers:{ "X-Evie-Device-Token":token, Accept:"application/json" }, timeout:12000,
      onload(r) {
        if (r.status !== 200) return;
        try {
          const d = JSON.parse(r.responseText), c = d.configuration;
          if (!c || !Array.isArray(c.automations)) return;
          config.automations = c.automations;
          config.menu = (c.menu && Object.keys(c.menu).length) ? c.menu : config.menu;
          config.settings = Object.assign(config.settings, c.settings || {});
          saveConfig(); render(); status("synced · rev " + Number(d.revision || 1));
        } catch {}
      }
    });
  }

  function render() {
    if (!panel) return;
    panel.querySelectorAll("[data-rung]").forEach(b => b.dataset.on = String(b.dataset.rung === st.aut));
    const kb = panel.querySelector("#kill");
    if (kb) { kb.textContent = st.kill ? "▶ resume" : "⏸ stop"; kb.dataset.killed = String(st.kill); }
    const pr = panel.querySelector("#prio"); if (pr) pr.value = config.settings.autoMinPriority;
    if (logEl) {
      logEl.replaceChildren();
      st.log.slice(-40).reverse().forEach(e => {
        const d = document.createElement("div"); d.className = "row";
        d.textContent = new Date(e.at).toLocaleTimeString() + " · " + (e.action || "") +
          (e.rule ? " [" + e.rule + "]" : "") + (e.reason ? " · " + e.reason : "");
        logEl.append(d);
      });
    }
  }
  function btn(label, cls, fn) {
    const b = document.createElement("button"); b.type = "button"; b.className = cls || ""; b.textContent = label;
    b.onclick = fn; return b;
  }
  function build() {
    if (document.getElementById("evie-snapdesk-root")) return;
    const host = document.createElement("div");
    host.id = "evie-snapdesk-root";
    host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483646;";
    const sh = host.attachShadow({ mode:"closed" });
    const css = document.createElement("style");
    css.textContent = `
      *{box-sizing:border-box}button,input,textarea{font:inherit}
      .p{font:12px/1.5 system-ui;color:#faf3f7;background:#160f19;border:1px solid #bd558c;border-radius:16px;
         width:min(390px,calc(100vw - 24px));box-shadow:0 12px 46px #0009;overflow:hidden}
      header{display:flex;justify-content:space-between;align-items:center;padding:10px 13px;background:#241528}
      header strong{color:#ff83bd;font-size:13px} header button{border:0;background:none;color:#fff;font-size:17px;cursor:pointer}
      main{padding:11px;display:grid;gap:7px;max-height:78vh;overflow:auto}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      [data-rung]{background:#2b1a2f;color:#e9cfe0;border:1px solid #4b3550;border-radius:9px;padding:9px 6px;cursor:pointer;font-weight:600}
      [data-rung][data-on="true"]{background:#ef74b0;color:#1a0d1f;border-color:#ef74b0}
      .row4{display:flex;gap:5px} .row4 button,.sm{flex:1;background:#3e293f;color:#ffe2f1;border:0;border-radius:7px;padding:6px;cursor:pointer}
      #kill{background:#3e293f;color:#ffd9e8;border:1px solid #6a4a6c;border-radius:8px;padding:7px;cursor:pointer;font-weight:700}
      #kill[data-killed="true"]{background:#ffb3c9;color:#3a0f22;border-color:#ffb3c9}
      .muted{color:#bda8bd;font-size:11px}
      #log{max-height:150px;overflow:auto;background:#1d1320;border:1px solid #3a2a3e;border-radius:8px;padding:6px}
      .row{font-size:10.5px;color:#d6c3d4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      textarea{width:100%;background:#261a2b;border:1px solid #534052;border-radius:8px;color:#fff;padding:7px;min-height:48px}
      input[type=range]{width:100%} .status{font-size:11px;color:#ddbacd;min-height:2em}
      #undo{background:#ef74b0;color:#1a0d1f;border-radius:9px;padding:8px;display:flex;justify-content:space-between;align-items:center;font-weight:700}
      #undo button{background:#1a0d1f;color:#ffd9e8;border:0;border-radius:6px;padding:4px 9px;cursor:pointer}
      .tabs{display:flex;gap:5px} .tabs button{flex:1;background:#241528;color:#dcc7da;border:1px solid #3d2b41;border-radius:7px;padding:5px;cursor:pointer}
      .tabs button[data-on="true"]{background:#ef74b0;color:#1a0d1f;border-color:#ef74b0}
    `;
    sh.append(css);
    panel = document.createElement("div"); panel.className = "p";
    const h = document.createElement("header");
    const t = document.createElement("strong"); t.textContent = "✦ EVIE SNAPDESK";
    const fold = document.createElement("button"); fold.textContent = "−";
    h.append(t, fold); panel.append(h);
    const main = document.createElement("main");
    fold.onclick = () => { main.hidden = !main.hidden; fold.textContent = main.hidden ? "+" : "−"; };

    const grid = document.createElement("div"); grid.className = "grid";
    Object.entries(RUNG_LABEL).forEach(([rung, label]) => {
      const b = btn(label, "", () => setAutonomy(rung, st.until ? Math.max(1, Math.round((st.until - Date.now()) / 3600000)) : 0));
      b.dataset.rung = rung; grid.append(b);
    });
    main.append(grid);

    const times = document.createElement("div"); times.className = "row4";
    [1,2,3,4].forEach(n => times.append(btn(n + "h", "", () => setAutonomy(st.aut === "shadow" ? "auto_safe" : st.aut, n))));
    times.append(btn("∞", "", () => { st.until = 0; render(); status("no timer"); }));
    main.append(times);

    const bar = document.createElement("div"); bar.className = "row4";
    const kill = btn("⏸ stop", "", () => { st.kill = !st.kill; addLog({action:"mode",reason:st.kill?"stopped":"resumed"}); render(); });
    kill.id = "kill";
    bar.append(kill, btn("pick composer", "", () => { pickMode = true; status("click your chat box"); }));
    main.append(bar);

    const pr = document.createElement("div");
    pr.innerHTML = '<span class="muted">auto-send priority floor</span>';
    const range = document.createElement("input"); range.id = "prio"; range.type = "range"; range.min = "0"; range.max = "100"; range.step = "5";
    range.oninput = () => { config.settings.autoMinPriority = Number(range.value); saveConfig(); };
    pr.append(range); main.append(pr);

    timerEl = document.createElement("div"); timerEl.className = "muted"; main.append(timerEl);

    const tabs = document.createElement("div"); tabs.className = "tabs";
    const tLog = btn("log", "", () => showTab("log")), tEdit = btn("edit", "", () => showTab("edit"));
    tabs.append(tLog, tEdit); main.append(tabs);

    const logWrap = document.createElement("div");
    logEl = document.createElement("div"); logEl.id = "log"; logWrap.append(logEl); main.append(logWrap);

    editorEl = document.createElement("div"); editorEl.hidden = true;
    const hint = document.createElement("div"); hint.className = "muted";
    hint.textContent = "rules JSON — match.type: keyword|regex|exact · tier: auto|draft|escalate · priority 0-100";
    const ta = document.createElement("textarea"); ta.value = JSON.stringify(config.automations, null, 1); ta.style.minHeight = "110px";
    const row = document.createElement("div"); row.className = "row4";
    row.append(
      btn("apply", "sm", () => {
        try { const p = JSON.parse(ta.value); if (!Array.isArray(p)) throw 0;
          config.automations = p.sort((a,b)=>(b.priority||0)-(a.priority||0)); saveConfig(); render(); status("rules applied · " + p.length);
        } catch { status("bad JSON"); }
      }),
      btn("export", "sm", () => {
        const b = new Blob([JSON.stringify(config,null,2)],{type:"application/json"});
        const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "evie-config.json"; a.click();
      }),
      btn("reset", "sm", () => { if (confirm("Reset to defaults?")) { config = JSON.parse(JSON.stringify(DEFAULT)); saveConfig(); ta.value = JSON.stringify(config.automations,null,1); render(); status("reset"); } })
    );
    const imp = document.createElement("input"); imp.type = "file"; imp.accept = ".json";
    imp.onchange = async () => {
      const f = imp.files && imp.files[0]; if (!f) return;
      try { const j = JSON.parse(await f.text());
        if (Array.isArray(j)) config.automations = j; else config = Object.assign(config, j);
        config.settings = Object.assign(DEFAULT.settings, config.settings || {});
        saveConfig(); ta.value = JSON.stringify(config.automations,null,1); render(); status("imported");
      } catch { status("bad file"); }
    };
    row.append(imp);
    editorEl.append(hint, ta, row); main.append(editorEl);

    const test = document.createElement("textarea");
    test.placeholder = "test a message… e.g. how much for a custom";
    test.oninput = () => {
      const d = decide(test.value);
      status(d.rule ? "→ " + d.action + " · " + d.rule.id : "→ " + d.action + " · " + d.reason);
      if (d.rule && d.rule.reply) fill(render(d.rule.reply));
    };
    main.append(test);

    undoEl = document.createElement("div"); undoEl.id = "undo"; undoEl.hidden = true;
    undoEl.innerHTML = "<span>sending…</span>";
    undoEl.append(btn("cancel", "", cancelSend)); main.append(undoEl);

    statusEl = document.createElement("div"); statusEl.className = "status"; main.append(statusEl);

    function showTab(which) {
      const isLog = which === "log";
      logWrap.hidden = !isLog; editorEl.hidden = isLog;
      tLog.dataset.on = String(isLog); tEdit.dataset.on = String(!isLog);
      if (!isLog) ta.value = JSON.stringify(config.automations, null, 1);
    }
    tLog.dataset.on = "true";

    panel.append(main); sh.append(panel); document.body.append(host);
    render(); status("ready · audit-only · local");
  }

  GM_registerMenuCommand("Copy Evie pairing key", () => { GM_setClipboard(token, "text"); alert("Pairing key copied. Open Bot Studio → Pair device."); });
  GM_registerMenuCommand("Sync from server", sync);
  GM_registerMenuCommand("Kill switch", () => { st.kill = !st.kill; render(); });
  GM_registerMenuCommand("Reset config", () => { if (confirm("Reset to defaults?")) { config = JSON.parse(JSON.stringify(DEFAULT)); saveConfig(); } });

  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build, { once:true });
})();