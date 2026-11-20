import { createClient } from "npm:@supabase/supabase-js@2";

// Legacy menu names kept so older order posts still validate.
// Prices are server-side cents. The browser cannot set them.
const prices: Record<string, number> = {
  "Daddy Package Monthly": 15000,
  "Daddy Package One-time": 35000,
  "Deluxe Dropbox / Full Vault": 7500,
  "OnlyFans Monthly": 300,
  "10 pics/videos": 1500,
  "20 pics/videos": 3000,
  "50 pics/videos": 6000,
  "B/G Dropbox": 3500,
  "5 min Video Chat": 5000,
  "10 min Video Chat": 8500,
  "15 min Live Snaps": 4500,
  "30 min Live Snaps": 7500,
  "1 hour Live Snaps": 13000,
  "45 sec Short Custom": 4500,
  "2 min Custom + Photo Set": 9000,
  "3 min Custom + Photo Set": 10000,
  "4 min Custom + Photo Set": 11000,
  "Live / Detailed Rating": 2500,
  "3 Live Snaps + 2 Pics": 2000,
  "Make a Deal $50": 5000,
  "Make a Deal $100": 10000,
  "Make a Deal $150": 15000,
  "Make a Deal $200": 20000,
};
const groupings: string[][] = [
  ["Daddy Package Monthly", "Daddy Package One-time"],
  ["10 pics/videos", "20 pics/videos", "50 pics/videos"],
  ["Make a Deal $50", "Make a Deal $100", "Make a Deal $150", "Make a Deal $200"],
];

// Keep these amounts aligned with checkout-catalog.js. Client prices are ignored.
const CHECKOUT_ITEMS: {id: string; name: string; cents: number}[] = [
  {id: "bundle10", name: "10 pics/vids", cents: 1000},
  {id: "bundle20", name: "20 pics/vids", cents: 2000},
  {id: "bundle50", name: "50 pics/vids", cents: 5000},
  {id: "deluxe", name: "Deluxe Dropbox (900+ vault)", cents: 7500},
  {id: "deluxe55", name: "Deluxe Dropbox Today Promo", cents: 5500},
  {id: "bg", name: "B/G Folder (3 vids)", cents: 3500},
  {id: "dickrate", name: "Dick Rating", cents: 3500},
  {id: "custom1", name: "Custom 1-min Video", cents: 5000},
  {id: "vip1", name: "VIP 1 Month", cents: 15000},
  {id: "vip3", name: "VIP 3 Months", cents: 35000},
];
const CHECKOUT_EXTRAS: {name: string; cents: number; single?: boolean}[] = [
  {name: "GFE", cents: 7000, single: true},
  {name: "Custom Photo Set \u00b7 5 Photos", cents: 4500},
  {name: "Custom Video \u00b7 3 Minutes", cents: 6000},
  {name: "Same Day Turnaround", cents: 1500},
  {name: "Live Clips \u00b7 Sent to Your Chat", cents: 1000},
  {name: "Moan Your Name", cents: 1000},
  {name: "JOI Add-On", cents: 2000},
  {name: "Voice Note", cents: 1000},
  {name: "Sexting \u00b7 10 Minutes", cents: 3000},
  {name: "Sexting \u00b7 15 Minutes", cents: 4000},
  {name: "Sexting \u00b7 30 Minutes", cents: 7500},
  {name: "Live Snap Show \u00b7 2 Minutes", cents: 3500},
  {name: "Live Snap Show \u00b7 4 Minutes", cents: 6000},
];
const PROOF_BUCKET = "evie-payment-proofs";
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ADMIN_ORDER_URL = (Deno.env.get("EVIE_ADMIN_URL") || "https://kissedbyevie-menu.onrender.com/admin.html").trim();
const PROMO_CODES = new Set(["55", "today55", "evie55"]);
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const handleRe = /^[A-Za-z0-9_.@-]{2,80}$/;

const allowedOrigins = (Deno.env.get("EVIE_ALLOWED_ORIGINS") ||
  "https://kissedbyevie-menu.onrender.com,http://localhost:4173,http://127.0.0.1:4173,http://localhost:8080,http://127.0.0.1:8080")
  .split(",").map((x) => x.trim()).filter(Boolean);
const url = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = url && secret ? createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}}) : null;

function response(data: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(data), {status, headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  }});
}

function sniffImage(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = new TextDecoder().decode(bytes.slice(8, 12));
    if (brand === "heic" || brand === "heix" || brand === "hevc") return "image/heic";
    if (brand === "heif" || brand === "mif1" || brand === "msf1") return "image/heif";
  }
  return null;
}

function extensionFor(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  return "heif";
}

function cleanHandle(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (!handleRe.test(text)) return false as const;
  return text;
}

function promoAccepted(value: unknown) {
  if (typeof value !== "string") return false;
  return PROMO_CODES.has(value.trim().toLowerCase());
}

function checkoutNotes(value: unknown): string | false {
  if (value == null || value === "") return "";
  if (typeof value !== "string") return false;
  const notes = value.trim();
  if (notes.length > 500) return false;
  return notes;
}

function moneyLabel(cents: number) {
  return "$" + (cents / 100).toFixed(2);
}

function checkoutAlertText(input: {
  snap: string | null;
  telegram: string | null;
  xHandle: string | null;
  items: {name: string; qty: number}[];
  total: number;
  payment: string;
  notes: string;
}) {
  const handles = [
    input.snap ? "Snapchat: " + input.snap : "",
    input.telegram ? "Telegram: " + input.telegram : "",
    input.xHandle ? "X: " + input.xHandle : "",
  ].filter(Boolean);
  const items = input.items.map((item) => item.qty + " × " + item.name).join(", ");
  const lines = [
    "New checkout",
    handles.join("\n") || "No handle",
    "Items: " + (items || "Custom amount"),
    "Total: " + moneyLabel(input.total),
    "Payment: " + (input.payment === "cash_app" ? "Cash App" : "Venmo"),
  ];
  if (input.notes) lines.push("Notes: " + input.notes);
  lines.push("Admin: " + ADMIN_ORDER_URL);
  return lines.join("\n").slice(0, 3500);
}

async function notifyCheckout(text: string) {
  const token = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
  const chatId = (Deno.env.get("TELEGRAM_ALERT_CHAT_ID") || "").trim();
  if (!token || !chatId) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const result = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({chat_id: chatId, text, disable_web_page_preview: true}),
      signal: controller.signal,
    });
    if (!result.ok) console.error("Telegram alert failed", result.status);
  } catch (e) {
    console.error("Telegram alert failed", e instanceof Error ? e.name : "unknown");
  } finally {
    clearTimeout(timer);
  }
}

function scheduleCheckoutAlert(text: string) {
  const pending = notifyCheckout(text);
  const runtime = (globalThis as {EdgeRuntime?: {waitUntil?: (promise: Promise<unknown>) => void}}).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === "function") runtime.waitUntil(pending);
  else return pending;
  return Promise.resolve();
}

async function recentHandleCount(handle: string) {
  if (!supabase) return 0;
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const quoted = '"' + handle.replaceAll('"', "") + '"';
  const filter = ["snapchat_handle", "telegram_handle", "x_handle", "contact_handle"]
    .map((column) => column + ".eq." + quoted).join(",");
  const recent = await supabase.from("evie_order_requests").select("id").gte("created_at", since).or(filter).limit(5);
  if (recent.error) throw recent.error;
  return (recent.data || []).length;
}

async function handleCheckout(bodyText: string, file: Blob | null, origin: string) {
  if (!supabase) return response({ok: false, error: "Backend not configured"}, 503, origin);
  if (bodyText.length > 12000) return response({ok: false, error: "Payload too large"}, 413, origin);
  let b: any;
  try { b = JSON.parse(bodyText); } catch { return response({ok: false, error: "Invalid request"}, 400, origin); }
  if (b.website) return response({ok: false, error: "Invalid request"}, 400, origin);
  if (b.adult_confirmed !== true) return response({ok: false, error: "18+ confirmation required"}, 400, origin);
  if (!uuidRe.test(b.request_id || "")) return response({ok: false, error: "Invalid request ID"}, 400, origin);
  const payment = b.payment_method === "cashapp" ? "cash_app" : b.payment_method;
  if (payment !== "venmo" && payment !== "cash_app") return response({ok: false, error: "Choose Venmo or Cash App"}, 400, origin);
  const snap = cleanHandle(b.snapchat_handle);
  const telegram = cleanHandle(b.telegram_handle);
  const xHandle = cleanHandle(b.x_handle);
  if (snap === false || telegram === false || xHandle === false) return response({ok: false, error: "Invalid username"}, 400, origin);
  if (!snap && !telegram && !xHandle) return response({ok: false, error: "Enter at least one username"}, 400, origin);
  const notes = checkoutNotes(b.notes);
  if (notes === false) return response({ok: false, error: "Notes need to be 500 characters or fewer"}, 400, origin);
  if (!Number.isSafeInteger(b.tip_cents) || b.tip_cents < 0 || b.tip_cents > 50000) {
    return response({ok: false, error: "Invalid custom amount"}, 400, origin);
  }
  if (!Array.isArray(b.items) || b.items.length > 30) return response({ok: false, error: "Invalid item list"}, 400, origin);

  const seen = new Set<string>();
  const priced: {id?: string; name: string; qty: number; unit_cents: number}[] = [];
  let total = b.tip_cents;
  for (const item of b.items) {
    if (!item || typeof item !== "object") return response({ok: false, error: "Invalid product selection"}, 400, origin);
    if (!Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 20) {
      return response({ok: false, error: "Invalid product selection"}, 400, origin);
    }
    if (typeof item.id === "string" && item.id) {
      const known = CHECKOUT_ITEMS.find((row) => row.id === item.id);
      if (!known || seen.has(known.id)) return response({ok: false, error: "Invalid product selection"}, 400, origin);
      seen.add(known.id);
      priced.push({id: known.id, name: known.name, qty: item.qty, unit_cents: known.cents});
      total += known.cents * item.qty;
      continue;
    }
    if (typeof item.name !== "string") return response({ok: false, error: "Invalid product selection"}, 400, origin);
    const extra = CHECKOUT_EXTRAS.find((row) => row.name === item.name);
    if (!extra || seen.has(extra.name)) return response({ok: false, error: "Invalid product selection"}, 400, origin);
    if (extra.single && item.qty !== 1) return response({ok: false, error: "Invalid product selection"}, 400, origin);
    seen.add(extra.name);
    priced.push({name: extra.name, qty: item.qty, unit_cents: extra.cents});
    total += extra.cents * item.qty;
  }
  if (seen.has("deluxe") && seen.has("deluxe55")) {
    return response({ok: false, error: "Choose one Dropbox price"}, 400, origin);
  }
  if (seen.has("deluxe55") && !promoAccepted(b.promo_code)) {
    return response({ok: false, error: "That Dropbox promo needs a valid code"}, 400, origin);
  }
  if (total <= 0 || total > 250000) {
    return response({ok: false, error: total > 250000 ? "Order exceeds $2,500 on this page" : "Add an item or a custom amount"}, 400, origin);
  }

  const prior = await supabase.from("evie_order_requests").select("id").eq("request_id", b.request_id).maybeSingle();
  if (prior.error) throw prior.error;
  if (prior.data) return response({ok: true, order_id: prior.data.id, stored: true}, 200, origin);

  if (!file || file.size <= 0) return response({ok: false, error: "Upload a payment screenshot"}, 400, origin);
  if (file.size > MAX_PROOF_BYTES) return response({ok: false, error: "Screenshots need to be 5 MB or smaller"}, 413, origin);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return response({ok: false, error: "Upload a JPEG, PNG, GIF, WebP, or HEIC screenshot"}, 400, origin);

  const uniqueHandles = [...new Set([snap, telegram, xHandle].filter((value): value is string => Boolean(value)))];
  for (const handle of uniqueHandles) {
    if (await recentHandleCount(handle) >= 3) return response({ok: false, error: "Please wait before submitting again"}, 429, origin);
  }
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const proofPath = b.request_id.toLowerCase() + "/" + rand + "." + extensionFor(mime);
  const proofMime = mime;
  const proofBytes = bytes.byteLength;
  const upload = await supabase.storage.from(PROOF_BUCKET).upload(proofPath, new Blob([bytes], {type: mime}), {contentType: mime, upsert: false});
  if (upload.error) throw upload.error;

  const primary = snap ? ["snapchat", snap] : telegram ? ["telegram", telegram] : ["x", xHandle as string];
  const insert = await supabase.from("evie_order_requests").insert({
    request_id: b.request_id,
    contact_platform: primary[0],
    contact_handle: primary[1],
    snapchat_handle: snap,
    telegram_handle: telegram,
    x_handle: xHandle,
    notes,
    payment_method: payment,
    items: priced,
    initial_total_cents: total,
    tip_cents: b.tip_cents,
    adult_confirmed: true,
    source: "checkout",
    proof_bucket: PROOF_BUCKET,
    proof_path: proofPath,
    proof_mime: proofMime,
    proof_bytes: proofBytes,
  }).select("id").single();
  if (insert.error) {
    await supabase.storage.from(PROOF_BUCKET).remove([proofPath]);
    if (insert.error.code === "23505") {
      const again = await supabase.from("evie_order_requests").select("id").eq("request_id", b.request_id).maybeSingle();
      if (again.data) return response({ok: true, order_id: again.data.id, stored: true}, 200, origin);
    }
    throw insert.error;
  }
  await scheduleCheckoutAlert(checkoutAlertText({
    snap, telegram, xHandle, items: priced, total, payment, notes,
  }));
  return response({ok: true, order_id: insert.data.id, stored: true}, 201, origin);
}

async function handleLegacy(raw: string, origin: string) {
  if (!supabase) return response({ok: false, error: "Backend not configured"}, 503, origin);
  if (raw.length > 10000) return response({ok: false, error: "Payload too large"}, 413, origin);
  const b = JSON.parse(raw);
  if (b.website) return response({ok: false, error: "Invalid request"}, 400, origin);
  if (b.adult_confirmed !== true) return response({ok: false, error: "18+ confirmation required"}, 400, origin);
  if (!uuidRe.test(b.request_id || "")) return response({ok: false, error: "Invalid request ID"}, 400, origin);
  if (!["telegram", "snapchat"].includes(b.contact_platform) ||
    !handleRe.test(b.contact_handle || "") ||
    !["cash_app", "venmo", "amazon_gift_card", "apple_pay"].includes(b.payment_method) ||
    typeof b.notes !== "string" || b.notes.length > 500) {
    return response({ok: false, error: "Invalid contact details"}, 400, origin);
  }
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 23) {
    return response({ok: false, error: "Invalid item list"}, 400, origin);
  }
  let total = 0;
  const seen = new Set<string>();
  for (const item of b.items) {
    if (!item || typeof item.name !== "string" ||
      !Object.prototype.hasOwnProperty.call(prices, item.name) ||
      !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 10 ||
      seen.has(item.name)) return response({ok: false, error: "Invalid product selection"}, 400, origin);
    seen.add(item.name);
    total += prices[item.name] * item.qty;
  }
  if (total > 250000) return response({ok: false, error: "Order exceeds limit"}, 400, origin);
  for (const group of groupings) {
    if (group.filter((name) => seen.has(name)).length > 1) return response({ok: false, error: "Choose one option per group"}, 400, origin);
  }
  if ((seen.has("Daddy Package Monthly") || seen.has("Daddy Package One-time")) && seen.has("Deluxe Dropbox / Full Vault")) {
    return response({ok: false, error: "The Vault is already included"}, 400, origin);
  }
  const prior = await supabase.from("evie_order_requests").select("id").eq("request_id", b.request_id).maybeSingle();
  if (prior.error) throw prior.error;
  if (prior.data) return response({ok: true, order_id: prior.data.id}, 200, origin);
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const recent = await supabase.from("evie_order_requests").select("id", {count: "exact", head: true})
    .eq("contact_platform", b.contact_platform).eq("contact_handle", b.contact_handle).gte("created_at", since);
  if (recent.error) throw recent.error;
  if ((recent.count || 0) >= 3) return response({ok: false, error: "Please wait before submitting again"}, 429, origin);
  const insert = await supabase.from("evie_order_requests").insert({
    request_id: b.request_id,
    contact_platform: b.contact_platform,
    contact_handle: b.contact_handle,
    notes: b.notes,
    payment_method: b.payment_method,
    items: b.items,
    initial_total_cents: total,
    adult_confirmed: true,
  }).select("id").single();
  if (insert.error) throw insert.error;
  return response({ok: true, order_id: insert.data.id}, 201, origin);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (!allowedOrigins.includes(origin)) return new Response("Origin not allowed", {status: 403});
  if (req.method === "OPTIONS") return response({ok: true}, 200, origin);
  if (req.method !== "POST") return response({ok: false, error: "Method not allowed"}, 405, origin);
  if (!supabase) return response({ok: false, error: "Backend not configured"}, 503, origin);
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const order = form.get("order");
      const proof = form.get("proof");
      if (typeof order !== "string") return response({ok: false, error: "Invalid request"}, 400, origin);
      const file = proof instanceof Blob && proof.size > 0 ? proof : null;
      return await handleCheckout(order, file, origin);
    }
    if (!contentType.startsWith("application/json")) return response({ok: false, error: "JSON required"}, 415, origin);
    return await handleLegacy(await req.text(), origin);
  } catch (e) {
    console.error("Order handler failed", e instanceof Error ? e.name : "unknown");
    return response({ok: false, error: "Unable to save order"}, 500, origin);
  }
});
