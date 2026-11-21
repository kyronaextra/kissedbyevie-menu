import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = url && secret
  ? createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}})
  : null;

const allowedOrigins = (Deno.env.get("EVIE_ALLOWED_ORIGINS") ||
  "https://kissedbyevie-menu.onrender.com,http://localhost:4173,http://127.0.0.1:4173,http://localhost:8080,http://127.0.0.1:8080")
  .split(",").map((x) => x.trim()).filter(Boolean);

const HANDLE_RE = /^@?[A-Za-z0-9_]{2,32}$/;
const MAX_BODY = 280;
const MIN_BODY = 8;
const RATE_LIMIT = 2;
const RATE_HOURS = 12;

function cors(origin: string) {
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function response(data: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(data), {status, headers: cors(origin)});
}

async function sha256Hex(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  return ip;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: cors(origin)});
  if (req.method !== "POST") return response({ok: false, error: "Method not allowed"}, 405, origin);
  if (!supabase) return response({ok: false, error: "Backend not configured"}, 503, origin);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return response({ok: false, error: "Invalid request"}, 400, origin);
  }

  // Honeypot — silently accept and drop.
  const trap = String(payload.website || payload.company || "").trim();
  if (trap) return response({ok: true}, 201, origin);

  const body = String(payload.body || "").trim();
  if (body.length < MIN_BODY || body.length > MAX_BODY) {
    return response({ok: false, error: "Keep it between 8 and 280 characters"}, 400, origin);
  }

  let handle = String(payload.handle || payload.username || "").trim();
  if (handle && !HANDLE_RE.test(handle)) {
    return response({ok: false, error: "Usernames can use letters, numbers, and underscores"}, 400, origin);
  }
  if (handle.startsWith("@")) handle = handle.slice(1);
  if (!handle) handle = "";

  const platformRaw = String(payload.platform || "").trim().toLowerCase();
  const platform = platformRaw === "x" || platformRaw === "telegram" ? platformRaw : null;
  if (handle && !platform) {
    return response({ok: false, error: "Pick X or Telegram for that username"}, 400, origin);
  }
  const display_handle = handle && platform ? handle : null;

  const ipHash = await sha256Hex(clientIp(req));
  const since = new Date(Date.now() - RATE_HOURS * 60 * 60 * 1000).toISOString();
  const recent = await supabase
    .from("evie_reviews")
    .select("id", {count: "exact", head: true})
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((recent.count || 0) >= RATE_LIMIT) {
    return response({ok: false, error: "That’s enough for now. Try again later."}, 429, origin);
  }

  const inserted = await supabase.from("evie_reviews").insert({
    body,
    display_handle,
    platform: display_handle ? platform : null,
    status: "pending",
    ip_hash: ipHash,
  }).select("id").single();
  if (inserted.error || !inserted.data) {
    console.error("evie-reviews insert", inserted.error?.message || "unknown");
    return response({ok: false, error: "Could not save that review"}, 500, origin);
  }
  return response({ok: true, id: inserted.data.id}, 201, origin);
});
