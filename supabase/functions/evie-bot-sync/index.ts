import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

// Isolated pairing/config API. No Snapchat credentials, message extraction,
// remote code execution, or automatic chat sending.
const SITE = "https://kissedbyevie-menu.onrender.com";
const SNAP = "https://web.snapchat.com";
const API_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const authClient = createClient(API_URL, ANON, opts);
const db = createClient(API_URL, SERVICE, opts);
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(origin: string, code: number, body: unknown) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,authorization,apikey,x-evie-device-token"
  };
  if (origin === SITE || origin === SNAP) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), { status: code, headers });
}
function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
  return Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
}
function checkConfig(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Invalid configuration");
  const p = input as Record<string, unknown>;
  if (!Array.isArray(p.profiles) || p.profiles.length < 1 || p.profiles.length > 12) throw Error("Invalid personalities");
  const seen = new Set<string>();
  const profiles = p.profiles.map(item => {
    if (!item || typeof item !== "object") throw Error("Invalid profile");
    const rec = item as Record<string, unknown>;
    const id = safeText(rec.id, 40);
    const name = safeText(rec.name, 80);
    if (!/^[a-z][a-z0-9_-]{1,39}$/.test(id) || !name || seen.has(id)) throw Error("Invalid or duplicate profile ID");
    seen.add(id);
    if (!Array.isArray(rec.quick_replies) || rec.quick_replies.length > 24) throw Error("Invalid quick replies");
    const quick_replies = rec.quick_replies.map(reply => {
      if (!reply || typeof reply !== "object") throw Error("Invalid quick reply");
      const r = reply as Record<string, unknown>;
      const label = safeText(r.label, 40);
      const text = safeText(r.text, 1500);
      if (!label || !text) throw Error("Quick replies need a label and text");
      return { label, text };
    });
    return { id, name, tone: safeText(rec.tone, 300), guidance: safeText(rec.guidance, 2000), quick_replies };
  });
  const active_profile = safeText(p.active_profile, 40);
  if (!seen.has(active_profile)) throw Error("Active profile not found");
  return { active_profile, profiles };
}
async function requireAdmin(req: Request) {
  const match = /^Bearer ([A-Za-z0-9._-]{30,4000})$/.exec(req.headers.get("authorization") || "");
  if (!match) return null;
  const { data, error } = await authClient.auth.getUser(match[1]);
  if (error || !data?.user) return null;
  const result = await db.auth.admin.getUserById(data.user.id);
  if (result.error || result.data?.user?.app_metadata?.evie_admin !== true) return null;
  return data.user;
}
async function getConfig() {
  const { data, error } = await db.from("evie_bot_config")
    .select("configuration,revision,updated_at").eq("id", 1).single();
  if (error || !data) throw Error("Configuration storage unavailable");
  return data;
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (origin && origin !== "null" && origin !== SITE && origin !== SNAP)
    return json(origin, 403, { error: "Origin not allowed" });
  if (req.method === "OPTIONS") return json(origin, 200, { ok: true });
  if (!API_URL || !ANON || !SERVICE) return json(origin, 503, { error: "API is not configured" });
  if (!["GET", "POST"].includes(req.method)) return json(origin, 405, { error: "Method not allowed" });
  try {
    const url = new URL(req.url);
    const action = req.method === "GET" ? url.searchParams.get("action") : null;

    // Desktop device: one read-only action. No admin access, no write commands.
    if (req.method === "GET" && action === "profile") {
      const key = req.headers.get("x-evie-device-token") || "";
      if (!KEY_PATTERN.test(key)) return json(origin, 401, { error: "Device key required" });
      const hash = await sha256(key);
      const { data, error } = await db.from("evie_bot_devices")
        .select("id").eq("token_sha256", hash).is("revoked_at", null).maybeSingle();
      if (error) throw Error("Device lookup failed");
      if (!data) return json(origin, 403, { error: "Device not paired or revoked" });
      const config = await getConfig();
      return json(origin, 200, config);
    }

    // Phone/browser admin: all writes and device management require existing Evie Admin role.
    const actor = await requireAdmin(req);
    if (!actor) return json(origin, 403, { error: "Evie Admin sign-in required" });
    if (req.method === "GET" && action === "admin_state") {
      const [{ data, error }, cfg] = await Promise.all([
        db.from("evie_bot_devices").select("id,name,created_at,last_seen_at,revoked_at")
          .order("created_at", { ascending: false }).limit(100),
        getConfig()
      ]);
      if (error) throw Error("Device list unavailable");
      return json(origin, 200, { ...cfg, devices: data || [] });
    }
    if (req.method !== "POST") return json(origin, 404, { error: "Unknown action" });
    const raw = await req.text();
    if (raw.length > 25000) return json(origin, 413, { error: "Payload too large" });
    const payload = JSON.parse(raw) as Record<string, unknown>;
    if (payload.action === "pair_device") {
      const key = safeText(payload.key, 100);
      const name = safeText(payload.name, 80);
      if (!KEY_PATTERN.test(key) || !name) return json(origin, 400, { error: "Valid device name and pairing key required" });
      const hash = await sha256(key);
      const { data: prior, error: priorError } = await db.from("evie_bot_devices")
        .select("id,revoked_at").eq("token_sha256", hash).maybeSingle();
      if (priorError) throw Error("Device lookup failed");
      if (prior) return json(origin, 409, { error: "Device key already paired. Revoke/reset before pairing again." });
      const { data, error } = await db.from("evie_bot_devices")
        .insert({ name, token_sha256: hash, created_by: actor.id }).select("id").single();
      if (error || !data) throw Error("Pairing failed");
      return json(origin, 201, { ok: true, id: data.id });
    }
    if (payload.action === "revoke_device") {
      const id = safeText(payload.id, 60);
      if (!ID_PATTERN.test(id)) return json(origin, 400, { error: "Invalid device ID" });
      const { data, error } = await db.from("evie_bot_devices")
        .update({ revoked_at: new Date().toISOString() }).eq("id", id)
        .is("revoked_at", null).select("id").maybeSingle();
      if (error || !data) return json(origin, 404, { error: "Active device not found" });
      return json(origin, 200, { ok: true });
    }
    if (payload.action === "save_config") {
      const revision = Number(payload.expected_revision);
      if (!Number.isInteger(revision) || revision < 1) return json(origin, 400, { error: "Invalid revision" });
      let validated: ReturnType<typeof checkConfig>;
      try { validated = checkConfig(payload.configuration); }
      catch (error) { return json(origin, 400, { error: error instanceof Error ? error.message : "Invalid configuration" }); }
      const { data, error } = await db.from("evie_bot_config")
        .update({ configuration: validated, revision: revision + 1, updated_at: new Date().toISOString() })
        .eq("id", 1).eq("revision", revision).select("revision").maybeSingle();
      if (error) throw Error("Save failed");
      if (!data) return json(origin, 409, { error: "Changed elsewhere. Reload and try again." });
      return json(origin, 200, { ok: true, revision: data.revision });
    }
    return json(origin, 404, { error: "Unknown action" });
  } catch (error) {
    console.error("evie-bot-sync", error instanceof Error ? error.message : "request failed");
    return json(origin, 503, { error: "Bot Studio temporarily unavailable" });
  }
});
