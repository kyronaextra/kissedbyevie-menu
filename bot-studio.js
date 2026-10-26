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
      method, cache: "no-store", headers: {
        apikey: key, Authorization: "Bearer " + token, "Content-Type": "application/json"
      }, body: payload ? JSON.stringify({ action, ...payload }) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || "Request failed (" + response.status + ")");
    return data;
  }
  function saveEditor() {
    if (!config || !editedId) return;
    const p = config.profiles.find(x => x.id === editedId);
    if (!p) return;
    let quick;
    try { quick = JSON.parse($("quickReplies").value); }
    catch (_) { throw Error("Quick replies must be valid JSON."); }
    if (!Array.isArray(quick) || quick.length > 24 ||
      quick.some(x => !x || typeof x.label !== "string" || typeof x.text !== "string" ||
        !x.label.trim() || !x.text.trim())) throw Error("Use an array of {label, text} objects, up to 24.");
    p.name = $("profileName").value.trim();
    p.tone = $("profileTone").value.trim();
    p.guidance = $("profileGuidance").value.trim();
    p.quick_replies = quick;
    if (!p.name) throw Error("A profile display name is required.");
  }
  function renderEditor() {
    const p = config?.profiles.find(x => x.id === editedId);
    if (!p) return;
    $("profileName").value = p.name;
    $("profileTone").value = p.tone || "";
    $("profileGuidance").value = p.guidance || "";
    $("quickReplies").value = JSON.stringify(p.quick_replies || [], null, 2);
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
  async function load() {
    const data = await request("admin_state");
    config = data.configuration;
    if (!config || !Array.isArray(config.profiles)) throw Error("Invalid stored configuration");
    revision = Number(data.revision);
    devices = data.devices || [];
    $("revision").textContent = "Published revision " + revision + " · " + new Date(data.updated_at).toLocaleString();
    renderProfiles(); renderDevices();
  }
  async function showWorkspace() {
    $("loginSection").hidden = true;
    $("workspace").hidden = false;
    await load();
    status("Signed in. Edit profiles and publish when ready.");
  }
  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      const email = $("email").value.trim();
      const password = $("password").value;
      const { data, error } = await sb.auth.signInWithPassword({email, password});
      $("password").value = "";
      if (error || !data?.user) throw Error(error?.message || "Login unsuccessful");
      $("identity").textContent = data.user.email || "Authorized admin";
      await showWorkspace();
    } catch (error) {
      $("workspace").hidden = true; $("loginSection").hidden = false;
      await sb?.auth.signOut();
      status(error.message, true);
    } finally { button.disabled = false; }
  });
  $("editProfile").addEventListener("change", event => {
    try { saveEditor(); editedId = event.target.value; renderEditor(); }
    catch (error) { event.target.value = editedId; status(error.message, true); }
  });
  $("activeProfile").addEventListener("change", event => { config.active_profile = event.target.value; });
  $("addProfile").addEventListener("click", () => {
    try { saveEditor(); }
    catch (error) { status(error.message, true); return; }
    const id = prompt("New personality ID (lowercase letters, digits, - or _):");
    if (id === null) return;
    const clean = id.trim();
    if (!/^[a-z][a-z0-9_-]{1,39}$/.test(clean) || config.profiles.some(x => x.id === clean) || config.profiles.length >= 12) {
      status("Use a unique ID starting with a letter (2–40 characters, maximum 12 profiles).", true); return;
    }
    config.profiles.push({id:clean, name:clean, tone:"", guidance:"Manual approval required.", quick_replies:[]});
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
  $("saveConfig").addEventListener("click", async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      saveEditor();
      const result = await request("save_config", { configuration: config, expected_revision: revision });
      revision = result.revision;
      await load();
      status("Settings published. The PC will load them on its next sync.");
    } catch (error) { status(error.message, true); }
    finally { button.disabled = false; }
  });
  $("pairForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button"); button.disabled = true;
    try {
      const name = $("deviceName").value.trim();
      const secret = $("deviceKey").value.trim();
      $("deviceKey").value = "";
      await request("pair_device", { name, key: secret });
      await load(); status("Device paired. Click Refresh settings in Tampermonkey.");
    } catch (error) { status(error.message, true); }
    finally { button.disabled = false; }
  });
  $("reload").addEventListener("click", async () => {
    try { await load(); status("Reloaded latest settings."); }
    catch (error) { status(error.message, true); }
  });
  $("logout").addEventListener("click", async () => {
    await sb?.auth.signOut();
    config = null; devices = []; $("workspace").hidden = true; $("loginSection").hidden = false;
    $("loginForm").reset(); status("Signed out.");
  });
  if (!ready) status("Supabase libraries did not load. Reload this page.", true);
})();