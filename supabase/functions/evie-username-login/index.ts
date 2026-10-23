import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// A public sign-in endpoint by necessity: it never returns account data on
// unknown aliases, never stores PINs, and uses Supabase Auth to check passwords.
// Social username -> email mappings are only readable with server credentials.
const originAllowlist = new Set(["https://kissedbyevie-menu.onrender.com"]);
const projectUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const failText = "Sign-in failed. Check your username and private PIN.";

function cors(origin: string): Headers {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  });
  if (originAllowlist.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
function reply(origin: string, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}
const serverHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2, "0")).join("");
}
async function getServiceJson(url: string, init?: RequestInit): Promise<{ ok: boolean; data: any }> {
  const result = await fetch(url, {
    method: "GET",
    ...init,
    headers: { ...serverHeaders, ...(init?.headers || {}) },
    signal: AbortSignal.timeout(8500),
  });
  let data: any;
  try { data = await result.json(); } catch { data = null; }
  return { ok: result.ok, data };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (!originAllowlist.has(origin)) return reply(origin, 403, { error: "Forbidden" });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return reply(origin, 405, { error: "Method not allowed" });

  if (!projectUrl || !anonKey || !serviceKey) {
    return reply(origin, 503, { error: "Sign-in is temporarily unavailable." });
  }
  try {
    if (Number(request.headers.get("content-length") || "0") > 1200) {
      return reply(origin, 413, { error: "Request too large" });
    }
    const text = await request.text();
    if (text.length > 1200) return reply(origin, 413, { error: "Request too large" });
    const value = JSON.parse(text);
    const username = typeof value.username === "string" ? value.username.trim().replace(/^@/, "").toLowerCase() : "";
    const pin = typeof value.pin === "string" ? value.pin : "";
    if (
      !/^[a-z0-9._-]{3,30}$/.test(username) ||
      !/^[0-9]{8}$/.test(pin)
    ) return reply(origin, 400, { error: "Enter a valid username and 8-digit PIN." });

    // Throttle BOTH by username and by caller IP. The per-username limit still
    // applies if a client attempts to spoof its forwarded IP address.
    const callerIp = (request.headers.get("cf-connecting-ip")
      || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip") || "unknown").slice(0, 120);
    const identityHash = await sha256("username:" + username);
    const ipHash = await sha256(callerIp);
    const limit = await getServiceJson(
      projectUrl + "/rest/v1/rpc/evie_username_login_rate_check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_handle_hash: identityHash, p_ip_hash: ipHash }),
      },
    );
    if (!limit.ok || typeof limit.data !== "boolean") {
      return reply(origin, 503, { error: "Sign-in temporarily unavailable." });
    }
    if (!limit.data) return reply(origin, 429, { error: "Too many attempts. Please try again later." });

    const params = new URLSearchParams({
      select: "user_id",
      normalized_username: "eq." + username,
      limit: "1",
    });
    const mapping = await getServiceJson(projectUrl + "/rest/v1/evie_member_usernames?" + params);
    if (!mapping.ok || !Array.isArray(mapping.data)) {
      return reply(origin, 503, { error: "Sign-in temporarily unavailable." });
    }
    const userId = mapping.data[0]?.user_id;
    if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return reply(origin, 401, { error: failText });
    }

    const account = await getServiceJson(
      projectUrl + "/auth/v1/admin/users/" + encodeURIComponent(userId),
    );
    if (!account.ok || !account.data?.email || !account.data?.email_confirmed_at) {
      return reply(origin, 401, { error: failText });
    }

    // Supabase GoTrue validates the PIN/password hash; no local password store.
    const signInResponse = await fetch(projectUrl + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: "Bearer " + anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: account.data.email, password: pin }),
      signal: AbortSignal.timeout(10000),
    });
    if (!signInResponse.ok) return reply(origin, 401, { error: failText });
    const result = await signInResponse.json();
    // Never return another identity's tokens even if an alias was misconfigured.
    if (result.user?.id !== userId || !result.access_token || !result.refresh_token) {
      return reply(origin, 401, { error: failText });
    }
    return reply(origin, 200, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });
  } catch {
    // Do not log supplied usernames, PINs, session tokens or user details.
    return reply(origin, 503, { error: "Sign-in temporarily unavailable." });
  }
});
