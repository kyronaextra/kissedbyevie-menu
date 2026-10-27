import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

/**
 * Signed-in customers may request a manual OnlyFans subscription check.
 * There is NO OnlyFans login or automated subscriber lookup here.
 * Service-role privileges stay in the Edge Function.
 */
const SITE = "https://kissedbyevie-menu.onrender.com";
const URL = Deno.env.get("SUPABASE_URL") || "";
const PUBLISHABLE = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const reader = createClient(URL, PUBLISHABLE, options);
const privileged = createClient(URL, SECRET, options);

function headers(origin: string) {
  const h = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info"
  });
  if (origin === SITE) h.set("Access-Control-Allow-Origin", SITE);
  return h;
}
function reply(origin: string, status: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), { status, headers: headers(origin) });
}
function cleaned(row: any) {
  if (!row) return null;
  const expiredCode = row.status === "pending" && new Date(row.challenge_expires_at).getTime() <= Date.now();
  const active = row.status === "verified" && row.verified_until && new Date(row.verified_until).getTime() > Date.now();
  return {
    of_username: row.of_username,
    status: active ? "verified" : row.status === "verified" ? "expired" : expiredCode ? "code_expired" : row.status,
    challenge_code: row.status === "pending" && !expiredCode ? row.challenge_code : null,
    challenge_expires_at: row.challenge_expires_at,
    verified_until: row.verified_until,
    requested_at: row.requested_at
  };
}
function createChallenge() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  if (origin !== SITE) return reply(origin, 403, { error: "Origin not allowed" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (!URL || !PUBLISHABLE || !SECRET) return reply(origin, 503, { error: "Verification unavailable" });
  if (!["GET", "POST"].includes(req.method)) return reply(origin, 405, { error: "Method not allowed" });
  const token = /^Bearer ([A-Za-z0-9._-]{30,4000})$/.exec(req.headers.get("Authorization") || "")?.[1];
  if (!token) return reply(origin, 401, { error: "Sign in first" });
  const { data: account, error: authError } = await reader.auth.getUser(token);
  const user = account?.user;
  if (authError || !user || user.is_anonymous) return reply(origin, 401, { error: "Sign in first" });
  try {
    const { data: existing, error: findError } = await privileged.from("evie_of_claims")
      .select("*").eq("user_id", user.id).maybeSingle();
    if (findError) throw findError;
    if (req.method === "GET") return reply(origin, 200, { claim: cleaned(existing) });
    const raw = await req.text();
    if (raw.length > 700) return reply(origin, 413, { error: "Request too large" });
    const payload = JSON.parse(raw || "{}");
    const ofUsername = String(payload.of_username || "").trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_.-]{3,50}$/.test(ofUsername))
      return reply(origin, 400, { error: "Enter a valid OnlyFans username (3–50 characters)" });
    // Require an established free customer profile before requesting a claim.
    const { data: profile, error: profileError } = await privileged.from("evie_member_profiles")
      .select("nickname").eq("user_id", user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.nickname?.trim()) return reply(origin, 409, { error: "Complete your nickname and customer profile first" });

    const existingView = cleaned(existing);
    if (existingView?.status === "verified")
      return reply(origin, 200, { claim: existingView, note: "Already verified. Renewal is available after expiration." });
    if (existingView?.status === "pending")
      return reply(origin, 200, { claim: existingView, note: "Use your existing verification code. It stays valid for 48 hours." });
    if (existing?.status === "rejected" &&
        Date.now() - new Date(existing.requested_at).getTime() < 86400000)
      return reply(origin, 429, { error: "Please wait 24 hours before making another request" });
    const now = new Date();
    const row = {
      user_id: user.id, of_username: ofUsername,
      challenge_code: createChallenge(), status: "pending",
      requested_at: now.toISOString(),
      challenge_expires_at: new Date(now.getTime() + 48 * 3600000).toISOString(),
      verified_at: null, verified_until: null, reviewed_at: null, reviewed_by: null,
      updated_at: now.toISOString()
    };
    const { data, error } = await privileged.from("evie_of_claims")
      .upsert(row, { onConflict: "user_id" }).select("*").single();
    if (error) throw error;
    return reply(origin, 201, { claim: cleaned(data), note: "Send your code from this OnlyFans account to Evie. She will confirm the subscription manually." });
  } catch (error) {
    // Do not leak table names, internal SQL errors, or secrets.
    console.error("OF claim error", error instanceof Error ? error.message : String(error));
    return reply(origin, 503, { error: "Verification service unavailable. Please try again." });
  }
});
