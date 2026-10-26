(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const sdk = window.supabase;
  const endpoint = String(window.EVIE_SUPABASE_URL || "") + "/functions/v1/evie-bot-sync";
  const key = window.EVIE_SUPABASE_PUBLISHABLE_KEY;
  const ready = Boolean(sdk && endpoint.startsWith("https://") && key);
  const sb = ready ? sdk.createClient(window.EVIE_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "evie-bot-studio-ephemeral" }
  }) : null;

  const MAX_PROFILES = 24, MAX_QUICK = 100, MAX_RULES = 300, MAX_IMPORT = 524288;
  const ID_RE = /^[a-z][a-z0-9_-]{1,39}$/;
  const MENU_KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;
  const RUNGS = ["shadow", "fill", "auto_safe", "auto_all"];
  const DEFAULT_SETTINGS = { autonomy: "shadow", autoMinPriority: 80, sendDelayMs: 3000,
    cooldownMs: 4000, takeoverBackoffMs: 600000, maxAutoTurns: 2, logDecisions: true };
  const DEFAULT_MENU = {
    bundle_10: { label: "10 random photos/videos", amount: 10 },
    bundle_20: { label: "20 surprise photos/videos", amount: 20 },
    bundle_50: { label: "50 surprise photos/videos", amount: 40 },
    dropbox: { label: "Deluxe Dropbox · 800+ items", amount: 75 },
    of_month: { label: "OnlyFans · monthly", amount: 3 },
    gfe_basic: { label: "Basic GFE · 1 month", amount: 70 },
    vip_daddy: { label: "VIP Daddy · 3 months", amount: 150 },
    vip_ultimate: { label: "Ultimate VIP Daddy · 6 months", amount: 350 },
    set_signature: { label: "Signature Set · 5 photos + 1-min", amount: 35 },
    set_full: { label: "Full Shoot · 10 photos + 2-min", amount: 50 },
    set_custom_2: { label: "Custom Full Shoot · 10 + 2-min", amount: 90 },
    set_custom_4: { label: "Custom Full Shoot · 10 + 4-min", amount: 150 },
    custom_1min: { label: "Custom 1-minute video", amount: 50, startingAt: true },
    custom_10photo: { label: "Custom 10-photo set", amount: 45, startingAt: true },
    custom_general: { label: "General custom request", amount: 50, startingAt: true },
    rating_detail: { label: "Detailed rating", amount: 15 },
    rating_dick: { label: "Dick rating", amount: 35 },
    voice_note: { label: "Voice note", amount: 12 },
    flash_teasers: { label: "Flash + 5 live teasers", amount: 25 },
    live_1min: { label: "One-minute live ass/tit/spit", amount: 45 },
    feet_5: { label: "Five feet photos", amount: 20 },
    live_show: { label: "Live show", amount: 55 },
    extras: { say_name: 25, dommy: 30, submissive: 20, panty: 20 }
  };

  let config = null, revision = 0, editedId = "", devices = [];

  function status(message, error = false) {
    $("status").textContent = message;
    $("status").dataset.error = String(error);
  }
  function el(tag, cls, content) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (content !== undefined) n.textContent = String(content);
    return n;
  }
  async function request(action, payload = null) {
    if (!sb) throw Error("Supabase login is unavailable");
    const session = await sb.auth.getSession();
    const token = session.data?.session?.access_token;
    if (!token) throw Error("Admin session expired. Sign in again.");
    const method = payload ? "POST" : "GET";
    const url = new URL(endpoint);
    if (method === "GET") url.searchParams.set("action", action);
    const response = await fetch(url.toString(), {
      method, cache: "no-store",
      headers: { apikey: key, Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: payload ? JSON.stringify({ action, ...payload }) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || "Request failed (" + response.status + ")");
    return data;
  }

  /* ---------- validation (mirrors the server) ---------- */
  function parseJson(value, what) {
    try { return JSON.parse(value); } catch { throw Error(what + " must be valid JSON."); }
  }
  function cleanQuick(input) {
    if (!Array.isArray(input) || input.length > MAX_QUICK) throw Error("Quick replies: array, max " + MAX_QUICK + ".");
    return input.map(x => {
      if (!x || typeof x.label !== "string" || typeof x.text !== "string" || !x.label.trim() || !x.text.trim())
        throw Error("Quick replies need label and text.");
      return { label: x.label.trim().slice(0, 60), text: x.text.trim().slice(0, 4000) };
    });
  }
  function cleanRules(input) {
    if (!Array.isArray(input) || input.length > MAX_RULES) throw Error("Rules: array, max " + MAX_RULES + ".");
    const seen = new Set();
    const out = input.map(r => {
      if (!r || !ID_RE.test(r.id || "") || seen.has(r.id)) throw Error("Bad or duplicate rule id: " + (r && r.id));
      seen.add(r.id);
      if (typeof r.name !== "string" || !r.name.trim()) throw Error("Rule " + r.id + " needs a name.");
      if (typeof r.enabled !== "boolean") throw Error("Rule " + r.id + " needs enabled true/false.");
      if (!["auto", "draft", "escalate"].includes(r.tier)) throw Error("Rule " + r.id + ": tier must be auto, draft or escalate.");
      const m = r.match || {};
      if (!["keyword", "regex", "exact"].includes(m.type)) throw Error("Rule " + r.id + ": match.type must be keyword, regex or exact.");
      if (typeof m.value !== "string" || !m.value.trim()) throw Error("Rule " + r.id + " needs a match value.");
      if (m.type === "regex") { try { new RegExp(m.value); } catch { throw Error("Rule " + r.id + " has an invalid regex."); } }
      const reply = typeof r.reply === "string" ? r.reply : "";
      const script = typeof r.script === "string" ? r.script : "";
      if (!reply && !script) throw Error("Rule " + r.id + " needs a reply or a script.");
      const priority = Number.isFinite(Number(r.priority))
        ? Math.max(0, Math.min(100, Math.round(Number(r.priority)))) : 50;
      return { id: r.id, name: r.name.trim().slice(0, 80), enabled: r.enabled, priority,
               tier: r.tier, match: { type: m.type, value: m.value.slice(0, 300) },
               reply: reply.slice(0, 8000), script: script.slice(0, 80) };
    });
    return out.sort((a, b) => b.priority - a.priority);
  }
  function cleanMenu(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Menu must be an object.");
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (!MENU_KEY_RE.test(k)) throw Error("Bad menu key: " + k);
      if (k === "extras") {
        if (!v || typeof v !== "object" || Array.isArray(v)) throw Error("extras must be an object of numbers.");
        out.extras = {};
        for (const [ek, ev] of Object.entries(v)) {
          if (typeof ev !== "number" || !Number.isFinite(ev) || ev < 0) throw Error("extras." + ek + " must be a number.");
          out.extras[ek.slice(0, 40)] = ev;
        }
        continue;
      }
      if (!v || typeof v !== "object" || Array.isArray(v)) throw Error("Menu entry " + k + " must be an object.");
      const amount = Number(v.amount);
      if (!Number.isFinite(amount) || amount < 0) throw Error("Menu entry " + k + " needs a numeric amount.");
      out[k] = { label: String(v.label || k).slice(0, 120), amount, startingAt: v.startingAt === true };
    }
    return out;
  }
  function cleanSettings(input) {
    const s = Object.assign({}, DEFAULT_SETTINGS, input || {});
    if (!RUNGS.includes(s.autonomy)) s.autonomy = "shadow";
    const clamp = (v, lo, hi, fb) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi) ? Math.round(v) : fb;
    return {
      autonomy: s.autonomy,
      autoMinPriority: clamp(s.autoMinPriority, 0, 100, 80),
      sendDelayMs: clamp(s.sendDelayMs, 0, 30000, 3000),
      cooldownMs: clamp(s.cooldownMs, 0, 60000, 4000),
      takeoverBackoffMs: clamp(s.takeoverBackoffMs, 0, 3600000, 600000),
      maxAutoTurns: clamp(s.maxAutoTurns, 1, 10, 2),
      logDecisions: s.logDecisions !== false
    };
  }

  /* ---------- lints ---------- */
  function lint() {
    const menuKeys = new Set(Object.keys(config.menu || {}));
    const hard = [], tokens = [];
    (config.automations || []).forEach(r => {
      const t = r.reply || "";
      if (/\$\s?\d/.test(t)) hard.push(r.id);
      for (const m of t.matchAll(/\{\{([a-zA-Z0-9_.]+)\}\}/g)) {
        if (!menuKeys.has(m[1].split(".")[0])) tokens.push(r.id + " → {{" + m[1] + "}}");
      }
    });
    const bad = Object.entries(config.menu || {})
      .filter(([k, v]) => k !== "extras" && (!v || typeof v.amount !== "number")).map(([k]) => k);
    $("ruleLint").textContent =
      (hard.length ? "⚠ hardcoded $ in: " + hard.join(", ") + " — use {{tokens}}. " : "") +
      (tokens.length ? "⚠ unknown token: " + tokens.join(", ") : "") ||
      "✓ all replies priced by token";
    $("ruleLint").dataset.error = String(hard.length > 0 || tokens.length > 0);
    $("menuLint").textContent = bad.length
      ? "⚠ entries missing a numeric amount: " + bad.join(", ")
      : "✓ " + Object.keys(config.menu || {}).filter(k => k !== "extras").length + " priced items";
    $("menuLint").dataset.error = String(bad.length > 0);
  }

  /* ---------- editor ---------- */
  function saveEditor() {
    if (!config || !editedId) return;
    const p = config.profiles.find(x => x.id === editedId);
    if (!p) return;
    p.name = $("profileName").value.trim();
    if (!p.name) throw Error("A profile display name is required.");
    p.tone = $("profileTone").value.trim().slice(0, 600);
    p.guidance = $("profileGuidance").value.trim().slice(0, 4000);
    p.core = $("profileCore").value.trim().slice(0, 40000);
    p.quick_replies = cleanQuick(parseJson($("quickReplies").value || "[]", "Quick replies"));
    config.automations = cleanRules(parseJson($("automationRules").value || "[]", "Rules"));
    config.menu = cleanMenu(parseJson($("menuJson").value || "{}", "Menu"));
    config.settings = cleanSettings(parseJson($("settingsJson").value || "{}", "Settings"));
  }
  function renderEditor() {
    const p = config?.profiles.find(x => x.id === editedId);
    if (!p) return;
    $("profileName").value = p.name || "";
    $("profileTone").value = p.tone || "";
    $("profileGuidance").value = p.guidance || "";
    $("profileCore").value = p.core || "";
    $("quickReplies").value = JSON.stringify(p.quick_replies || [], null, 2);
  }
  function renderRungs() {
    document.querySelectorAll("#rungRow [data-rung]").forEach(b =>
      b.dataset.on = String(b.dataset.rung === config.settings.autonomy));
    $("autoMinPriority").value = config.settings.autoMinPriority;
  }
  function renderProfiles() {
    const active = $("activeProfile"), editor = $("editProfile");
    active.replaceChildren(); editor.replaceChildren();
    config.profiles.forEach(p => {
      for (const s of [active, editor]) {
        const option = el("option", "", p.name + " (" + p.id + ")");
        option.value = p.id;
        s.append(option);
      }
    });
    active.value = config.active_profile;
    if (!config.profiles.some(p => p.id === editedId)) editedId = config.profiles[0].id;
    editor.value = editedId;
    renderEditor();
  }
  function renderDevices() {
    const host = $("deviceList");
    host.replaceChildren();
    if (!devices.length) { host.append(el("p", "muted", "No devices paired yet.")); return; }
    devices.forEach(d => {
      const card = el("div", "device");
      const label = el("div");
      label.append(el("strong", "", d.name), el("small", "",
        d.revoked_at ? "Revoked" : "Paired · " + new Date(d.created_at).toLocaleDateString()));
      card.append(label);
      if (!d.revoked_at) {
        const button = el("button", "danger", "Revoke");
        button.type = "button";
        button.addEventListener("click", async () => {
          if (!confirm("Revoke " + d.name + "? Its next sync will be blocked.")) return;
          button.disabled = true;
          try { await request("revoke_device", { id: d.id }); await load(); status("Device revoked."); }
          catch (error) { status(error.message, true); button.disabled = false; }
        });
        card.append(button);
      }
      host.append(card);
    });
  }
  function loadInto() {
    $("automationRules").value = JSON.stringify(config.automations || [], null, 2);
    $("menuJson").value = JSON.stringify(config.menu || {}, null, 2);
    $("settingsJson").value = JSON.stringify(config.settings || DEFAULT_SETTINGS, null, 2);
    renderProfiles(); renderRungs(); renderDevices(); lint();
  }
  async function load() {
    const data = await request("admin_state");
    config = data.configuration;
    if (!config || !Array.isArray(config.profiles)) throw Error("Invalid stored configuration");
    config.settings = cleanSettings(config.settings);
    config.menu = config.menu || {};
    config.automations = config.automations || [];
    revision = Number(data.revision);
    devices = data.devices || [];
    const stamp = data.updated_at ? new Date(data.updated_at).toLocaleString() : "unknown";
    $("revision").textContent = "Published revision " + revision + " · " + stamp;
    loadInto();
  }
  async function showWorkspace() {
    $("loginSection").hidden = true;
    $("workspace").hidden = false;
    await load();
    status("Signed in. Edit, then publish.");
  }

  /* ---------- events ---------- */
  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: $("email").value.trim(), password: $("password").value });
      $("password").value = "";
      if (error || !data?.user) throw Error(error?.message || "Login unsuccessful");
      $("identity").textContent = data.user.email || "Authorized admin";
      await showWorkspace();
    } catch (error) {
      $("workspace").hidden = true; $("loginSection").hidden = false;
      await sb?.auth.signOut(); status(error.message, true);
    } finally { button.disabled = false; }
  });
  document.querySelectorAll("#rungRow [data-rung]").forEach(b =>
    b.addEventListener("click", () => { config.settings.autonomy = b.dataset.rung; renderRungs(); }));
  $("autoMinPriority").addEventListener("input", e => { config.settings.autoMinPriority = Number(e.target.value); });
  ["automationRules", "menuJson"].forEach(id => $(id).addEventListener("input", () => {
    try {
      config.automations = cleanRules(parseJson($("automationRules").value || "[]", "Rules"));
      config.menu = cleanMenu(parseJson($("menuJson").value || "{}", "Menu"));
      lint();
    } catch {}
  }));
  $("convertLegacy").addEventListener("click", () => {
    let n = 0;
    config.automations = (config.automations || []).map(r => {
      if (r.match) return r;
      n++;
      return { id: r.id, name: r.name, enabled: r.enabled !== false, priority: 50, tier: "draft",
               match: { type: "keyword", value: String(r.keyword || "").toLowerCase() },
               reply: r.reply || "", script: "" };
    });
    if (!config.menu || !Object.keys(config.menu).length) config.menu = JSON.parse(JSON.stringify(DEFAULT_MENU));
    config.profiles.forEach(p => { if (!p.core && p.guidance) p.core = p.guidance; });
    loadInto();
    status("Converted " + n + " legacy rule" + (n === 1 ? "" : "s") + " · menu seeded.");
  });
  $("editProfile").addEventListener("change", event => {
    try { saveEditor(); editedId = event.target.value; renderEditor(); }
    catch (error) { event.target.value = editedId; status(error.message, true); }
  });
  $("activeProfile").addEventListener("change", event => { config.active_profile = event.target.value; });
  $("addProfile").addEventListener("click", () => {
    try { saveEditor(); } catch (error) { status(error.message, true); return; }
    const id = prompt("New personality ID (lowercase letters, digits, - or _):");
    if (id === null) return;
    const clean = id.trim();
    if (!ID_RE.test(clean) || config.profiles.some(x => x.id === clean) || config.profiles.length >= MAX_PROFILES) {
      status("Unique ID starting with a letter (2–40 chars, max " + MAX_PROFILES + ").", true); return;
    }
    config.profiles.push({ id: clean, name: clean, tone: "", guidance: "", core: "", quick_replies: [] });
    editedId = clean; renderProfiles();
  });
  $("removeProfile").addEventListener("click", () => {
    if (config.profiles.length === 1) { status("Keep at least one personality.", true); return; }
    if (!confirm("Remove the selected personality after publishing?")) return;
    config.profiles = config.profiles.filter(p => p.id !== editedId);
    editedId = config.profiles[0].id;
    if (!config.profiles.some(p => p.id === config.active_profile)) config.active_profile = editedId;
    renderProfiles();
  });
  $("importConfig").addEventListener("click", async () => {
    const file = $("importJson").files?.[0];
    if (!file) { status("Choose a .json file first.", true); return; }
    if (!/\.json$/i.test(file.name) || file.size > MAX_IMPORT) { status("JSON only, up to 512 KB.", true); return; }
    try {
      saveEditor();
      const incoming = JSON.parse(await file.text());
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) throw Error("JSON must be an object.");
      if (Array.isArray(incoming.profiles)) {
        if (!confirm("Replace your working configuration with this file? Publish separately afterward.")) return;
        if (!incoming.profiles.length || incoming.profiles.length > MAX_PROFILES ||
            !incoming.profiles.some(p => p.id === incoming.active_profile)) throw Error("Invalid personality library.");
        config = {
          active_profile: incoming.active_profile,
          profiles: incoming.profiles,
          automations: cleanRules(incoming.automations || []),
          menu: cleanMenu(incoming.menu || config.menu || {}),
          settings: cleanSettings(incoming.settings)
        };
      } else {
        if (!ID_RE.test(incoming.id || "") || !incoming.name || !Array.isArray(incoming.quick_replies))
          throw Error("A profile needs id, name and quick_replies.");
        const index = config.profiles.findIndex(p => p.id === incoming.id);
        if (index < 0 && config.profiles.length >= MAX_PROFILES) throw Error("Max " + MAX_PROFILES + " personalities.");
        if (index >= 0) {
          if (!confirm("Replace the existing " + incoming.id + " profile?")) return;
          config.profiles[index] = incoming;
        } else config.profiles.push(incoming);
        editedId = incoming.id;
      }
      editedId = config.profiles.some(p => p.id === editedId) ? editedId : config.profiles[0].id;
      loadInto();
      $("importJson").value = "";
      status("Imported. Click Publish to sync.");
    } catch (error) { status(error.message || "Invalid JSON file.", true); }
  });
  $("exportConfig").addEventListener("click", () => {
    try { saveEditor(); } catch (error) { status(error.message, true); return; }
    const file = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const uri = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = uri; a.download = "evie-config.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(uri), 5000);
    status("Exported.");
  });
  $("saveConfig").addEventListener("click", async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      saveEditor();
      const result = await request("save_config", { configuration: config, expected_revision: revision });
      revision = result.revision;
      await load();
      status("Published. Paired devices pick it up within a minute.");
    } catch (error) { status(error.message, true); }
    finally { button.disabled = false; }
  });
  $("pairForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button"); button.disabled = true;
    try {
      const name = $("deviceName").value.trim(), secret = $("deviceKey").value.trim();
      $("deviceKey").value = "";
      await request("pair_device", { name, key: secret });
      await load(); status("Device paired. Click Refresh settings in Tampermonkey.");
    } catch (error) { status(error.message, true); }
    finally { button.disabled = false; }
  });
  $("reload").addEventListener("click", async () => {
    try { await load(); status("Reloaded."); } catch (error) { status(error.message, true); }
  });
  $("logout").addEventListener("click", async () => {
    await sb?.auth.signOut();
    config = null; devices = []; $("workspace").hidden = true; $("loginSection").hidden = false;
    $("loginForm").reset(); status("Signed out.");
  });
  if (!ready) status("Supabase libraries did not load. Reload this page.", true);
})();