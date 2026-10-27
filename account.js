/* Kissed by Evie — standalone free customer accounts.
   X OAuth is a genuine login. Snapchat and Telegram usernames are unverified
   order references; email magic links provide authentication for those users.
   Paid VIP access is NEVER granted by this page. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const sdk = window.supabase;
  const hasConfig = Boolean(sdk && sdk.createClient && window.EVIE_SUPABASE_URL && window.EVIE_SUPABASE_PUBLISHABLE_KEY);
  const client = hasConfig ? sdk.createClient(window.EVIE_SUPABASE_URL, window.EVIE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;
  const redirectTo = window.location.origin + window.location.pathname;
  let currentUser = null;
  let profile = null;
  let identityX = null;
  let loading = false;

  function message(value, type) {
    const el = $("accountFeedback");
    el.textContent = value || "";
    el.className = "feedback" + (type ? " " + type : "");
  }
  function fail(error, fallback) {
    const raw = error && typeof error.message === "string" ? error.message : "";
    const safe = /database|row level|permission denied|schema cache/i.test(raw)
      ? "Account setup is not available yet. Please contact Evie."
      : raw || fallback || "Sorry, that didn't work. Please try again.";
    message(safe, "error");
  }
  function busy(element, on, label) {
    element.disabled = on;
    if (on) {
      element.dataset.oldLabel = element.textContent;
      element.textContent = label || "Saving…";
    } else if (element.dataset.oldLabel) {
      element.textContent = element.dataset.oldLabel;
      delete element.dataset.oldLabel;
    }
  }
  function handle(value) {
    const name = String(value || "").trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9._-]{1,50}$/.test(name)) throw new Error("Enter a username with letters, numbers, dots, dashes, or underscores.");
    return "@" + name;
  }
  function phoneValue(value) {
    const valueTrimmed = String(value || "").trim();
    if (!valueTrimmed) return null;
    const digits = valueTrimmed.replace(/\D/g, "");
    if (!/^[+0-9(). -]{7,24}$/.test(valueTrimmed) || digits.length < 7 || digits.length > 15)
      throw new Error("Enter a valid phone number or leave this optional field blank.");
    return valueTrimmed;
  }
  function xIdentity(user) {
    const identities = Array.isArray(user?.identities) ? user.identities : [];
    const verified = identities.find(i => i.provider === "x");
    const connected = Boolean(verified || user?.app_metadata?.provider === "x" || user?.app_metadata?.providers?.includes("x"));
    const d = verified?.identity_data || {};
    const candidate = [d.user_name, d.preferred_username, d.screen_name].find(s => typeof s === "string" && /^[A-Za-z0-9_]{1,50}$/.test(s.replace(/^@/, "")));
    return connected ? { handle: candidate ? handle(candidate) : null } : null;
  }
  function selectPlatform(platform) {
    const selector = $("profilePlatform");
    selector.value = ["snapchat", "telegram", "x"].includes(platform) ? platform : "snapchat";
    updateHandleField();
  }
  function updateHandleField() {
    const platform = $("profilePlatform").value;
    const el = $("profileHandle");
    const value = profile && profile[platform + "_handle"];
    el.placeholder = platform === "x" ? "@yourXusername" : platform === "telegram" ? "@yourTelegramUsername" : "yourSnapchatUsername";
    // An X OAuth identity is already a secure account reference, whether or not X supplies its handle.
    if (platform === "x" && identityX?.handle) {
      el.value = identityX.handle;
      el.readOnly = true;
      $("handleHelp").textContent = "Your X identity is connected securely. You can choose Snapchat or Telegram above to add another order reference.";
    } else {
      el.readOnly = false;
      el.value = value || "";
      $("handleHelp").textContent = identityX
        ? "Optional: add another username so Evie can recognize your messages. Usernames entered here are not verified."
        : "Required: enter the social username you use to message Evie. This is a reference, not a social-platform login.";
    }
  }
  function showSignedOut() {
    currentUser = null;
    profile = null;
    identityX = null;
    $("signInSection").hidden = false;
    $("profileSection").hidden = true;
    $("savedDetails").hidden = true;
  }
  function renderProfile() {
    $("signInSection").hidden = true;
    $("profileSection").hidden = false;
    $("profileNickname").value = profile?.nickname || "";
    $("profilePhone").value = profile?.phone_number || "";
    $("identitySummary").textContent = identityX
      ? "𝕏 Connected X account · " + (identityX.handle || "Verified through X") + " · " + (currentUser?.email || "No email shared by X")
      : "Email-verified customer · " + (currentUser?.email || "");
    const pending = sessionStorage.getItem("evie-preferred-social-platform");
    const choice = identityX ? "x" : pending || (profile?.snapchat_handle ? "snapchat" : profile?.telegram_handle ? "telegram" : profile?.x_handle ? "x" : "snapchat");
    selectPlatform(choice);
    $("savedDetails").hidden = !profile?.nickname;
    $("customerIdLabel").textContent = currentUser ? "Customer ID: " + currentUser.id : "";
    const socials = [
      profile?.x_handle && "X: " + profile.x_handle,
      profile?.snapchat_handle && "Snapchat: " + profile.snapchat_handle,
      profile?.telegram_handle && "Telegram: " + profile.telegram_handle
    ].filter(Boolean);
    $("savedSocials").textContent = socials.length ? "Saved references: " + socials.join(" · ") : "No social reference saved yet.";
  }
  async function ensurePendingMembership(user) {
    const { data, error } = await client.from("evie_memberships").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      const response = await client.from("evie_memberships").insert({ user_id: user.id, tier: "none", status: "pending" });
      if (response.error && response.error.code !== "23505") throw response.error;
    }
  }
  async function loadUser() {
    if (!client || loading) return;
    loading = true;
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data?.user) {
        showSignedOut();
        return;
      }
      currentUser = data.user;
      identityX = xIdentity(currentUser);
      const result = await client.from("evie_member_profiles")
        .select("nickname,phone_number,telegram_handle,x_handle,snapchat_handle")
        .eq("user_id", currentUser.id).maybeSingle();
      if (result.error) throw result.error;
      profile = result.data || null;
      renderProfile();
      if (!profile?.nickname) message("Welcome! Complete your free customer profile below.");
      else message("");
    } catch (error) {
      fail(error);
    } finally {
      loading = false;
    }
  }
  $("signInX").addEventListener("click", async function () {
    if (!client) return fail(null, "Account sign-in is not configured.");
    if (!$("isAdult").checked) return message("Please confirm you are at least 18 first.", "error");
    busy(this, true, "Connecting to X…");
    try {
      const { error } = await client.auth.signInWithOAuth({ provider: "x", options: { redirectTo } });
      if (error) throw error;
    } catch (error) {
      busy(this, false);
      fail(error, "X login isn't enabled yet. Please try email sign-in.");
    }
  });
  $("emailSignInForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client) return fail(null, "Account sign-in is not configured.");
    if (!$("isAdult").checked) return message("Please confirm you are at least 18 first.", "error");
    if (!this.reportValidity()) return;
    const email = $("signInEmail").value.trim().toLowerCase();
    if (!email || email.length > 254) return message("Enter a valid email address.", "error");
    const radio = this.querySelector("input[name=signupPlatform]:checked");
    sessionStorage.setItem("evie-preferred-social-platform", radio?.value || "snapchat");
    const submit = $("emailSubmit");
    busy(submit, true, "Sending link…");
    message("Sending a secure one-time sign-in link…");
    try {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
      });
      if (error) throw error;
      message("Check your inbox for your sign-in link. After you open it, finish your profile here. ♡", "success");
    } catch (error) {
      fail(error);
    } finally {
      busy(submit, false);
    }
  });
  $("profilePlatform").addEventListener("change", updateHandleField);
  $("profileForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!client || !currentUser || !this.reportValidity()) return;
    const name = $("profileNickname").value.trim().replace(/\s+/g, " ");
    if (name.length < 1 || name.length > 80) return message("Enter a nickname or name up to 80 characters.", "error");
    let telephone, social = null;
    const platform = $("profilePlatform").value;
    try {
      telephone = phoneValue($("profilePhone").value);
      const raw = $("profileHandle").value.trim();
      if (raw) social = handle(raw);
      if (!identityX && !social && !profile?.x_handle && !profile?.telegram_handle && !profile?.snapchat_handle)
        throw new Error("Please enter your Snapchat, Telegram, or X username.");
    } catch (error) {
      return fail(error);
    }
    const submit = $("profileSubmit");
    busy(submit, true, "Saving your profile…");
    try {
      const fields = {
        user_id: currentUser.id, nickname: name, phone_number: telephone,
        x_handle: profile?.x_handle || null, telegram_handle: profile?.telegram_handle || null,
        snapchat_handle: profile?.snapchat_handle || null, updated_at: new Date().toISOString()
      };
      if (social) fields[platform + "_handle"] = social;
      if (identityX?.handle) fields.x_handle = identityX.handle;
      const { error } = await client.from("evie_member_profiles").upsert(fields, { onConflict: "user_id" });
      if (error) throw error;
      await ensurePendingMembership(currentUser);
      profile = fields;
      renderProfile();
      message("Saved! Your free profile is ready, and you can update it any time. ♡", "success");
      sessionStorage.removeItem("evie-preferred-social-platform");
    } catch (error) {
      fail(error);
    } finally {
      busy(submit, false);
    }
  });
  $("signOut").addEventListener("click", async function () {
    if (!client) return;
    busy(this, true, "Signing out…");
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      showSignedOut();
      message("You have signed out.", "success");
    } catch (error) {
      fail(error);
    } finally {
      busy(this, false);
    }
  });
  if (!hasConfig) {
    message("Account signup is being configured. Please check back soon.", "error");
    $("signInX").disabled = true;
    $("emailSubmit").disabled = true;
    return;
  }
  // A real Supabase session, not an unverified social handle, controls access.
  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      showSignedOut();
    } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
      setTimeout(loadUser, 0);
    }
  });
  loadUser();
})();