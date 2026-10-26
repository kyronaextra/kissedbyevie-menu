import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

// Pairing + config API.
// The device only reads. The admin writes. No downloaded JS is executed:
// rules are declarative data, and regex is validated here and compiled on the device.
// Self-send and trust-ladder behaviour live on the device; the server just stores the policy.
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
const MAX_PROFILES = 24;
const MAX_QUICK = 100;
const MAX_RULES = 300;
const MAX_PAYLOAD = 512_000;

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

// Menu is the single source of truth for prices. Keyed, label + amount, optional floor flag.
function sanitizeMenu(input: unknown) {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue;
    if (key === "extras") {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const ex: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const n = Number(v);
        if (typeof v === "number" && Number.isFinite(n) && n >= 0 && n <= 100000) ex[safeText(k, 40)] =
