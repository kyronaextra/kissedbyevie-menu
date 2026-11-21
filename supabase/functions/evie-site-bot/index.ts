import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = url && secret
  ? createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}})
  : null;

const BUCKET = "evie-public-gallery";
const MAX_BODY = 4000;
const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {"Content-Type": "application/json"},
  });
}

async function sha256Hex(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function authorize(req: Request, payload: Record<string, unknown>) {
  if (!supabase) return {ok: false as const, res: json({ok: false, error: "Backend not configured"}, 503)};
  const given = (req.headers.get("x-evie-site-bot-secret") || String(payload.secret || "")).trim();
  if (!given) return {ok: false as const, res: json({ok: false, error: "Missing bot secret"}, 401)};
  const hex = await sha256Hex(given);
  const row = await supabase.from("evie_site_bot_secrets").select("secret_sha256").eq("name", "site-bot").maybeSingle();
  if (row.error || !row.data?.secret_sha256 || !timingEqual(hex, row.data.secret_sha256)) {
    return {ok: false as const, res: json({ok: false, error: "Unauthorized"}, 401)};
  }
  return {ok: true as const};
}

function sniffImage(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

function extensionFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function parseRequest(req: Request): Promise<{payload: Record<string, unknown>; files: File[]}> {
  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    const raw = form.get("payload");
    let payload: Record<string, unknown> = {};
    if (typeof raw === "string" && raw.trim()) payload = JSON.parse(raw);
    const files = form.getAll("photos").filter((v): v is File => typeof File !== "undefined" && v instanceof File);
    return {payload, files};
  }
  const text = await req.text();
  const payload = text ? JSON.parse(text) : {};
  return {payload: payload && typeof payload === "object" ? payload : {}, files: []};
}

async function publish(payload: Record<string, unknown>, files: File[]) {
  if (!supabase) return json({ok: false, error: "Backend not configured"}, 503);
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (body.length > MAX_BODY) return json({ok: false, error: "That post is too long"}, 400);
  if (!body && files.length === 0) return json({ok: false, error: "Write something or add a photo"}, 400);
  if (files.length > MAX_PHOTOS) return json({ok: false, error: "Up to 8 photos in one post"}, 400);
  const inGallery = payload.in_gallery !== false;
  const inserted = await supabase.from("evie_feed_posts").insert({
    body,
    published: true,
    pinned: payload.pinned === true,
    created_by: "telegram-bot",
  }).select("id").single();
  if (inserted.error || !inserted.data) throw inserted.error || new Error("Could not save the post");
  const postId = inserted.data.id as string;
  const photos: {id: string; storage_path: string}[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size <= 0) continue;
      if (file.size > MAX_PHOTO_BYTES) throw new Error("Photos need to be 8 MB or smaller");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = sniffImage(bytes);
      if (!mime) throw new Error("Photos need to be JPEG, PNG, GIF, or WebP");
      const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
      const path = "feed/" + postId + "/" + rand + "." + extensionFor(mime);
      const upload = await supabase.storage.from(BUCKET).upload(path, new Blob([bytes], {type: mime}), {
        contentType: mime,
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const row = await supabase.from("evie_public_photos").insert({
        storage_path: path,
        alt_text: "Photo from Evie",
        is_featured: false,
        published: true,
        sort_order: i,
        post_id: postId,
        in_gallery: inGallery,
        placement: inGallery ? "gallery" : "feed",
      }).select("id, storage_path").single();
      if (row.error || !row.data) throw row.error || new Error("Could not save a photo");
      photos.push(row.data);
    }
  } catch (err) {
    await supabase.from("evie_public_photos").delete().eq("post_id", postId);
    await supabase.from("evie_feed_posts").delete().eq("id", postId);
    const message = err instanceof Error ? err.message : "Could not upload photos";
    return json({ok: false, error: message}, /8 MB|JPEG|PNG/.test(message) ? 400 : 500);
  }
  return json({ok: true, id: postId, photos}, 201);
}

async function unpublish(payload: Record<string, unknown>) {
  if (!supabase) return json({ok: false, error: "Backend not configured"}, 503);
  let id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (id === "last" || !id) {
    const last = await supabase.from("evie_feed_posts")
      .select("id")
      .eq("created_by", "telegram-bot")
      .eq("published", true)
      .order("created_at", {ascending: false})
      .limit(1)
      .maybeSingle();
    if (last.error) throw last.error;
    if (!last.data) return json({ok: false, error: "No bot post to unpublish"}, 404);
    id = last.data.id as string;
  }
  if (!uuidRe.test(id)) return json({ok: false, error: "Missing post"}, 400);
  const existing = await supabase.from("evie_feed_posts").select("id, published").eq("id", id).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) return json({ok: false, error: "That post is already gone"}, 404);
  const hide = await supabase.from("evie_feed_posts").update({
    published: false,
    pinned: false,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (hide.error) throw hide.error;
  const gone = await supabase.from("evie_public_photos")
    .update({published: false, in_gallery: false})
    .eq("post_id", id);
  if (gone.error) throw gone.error;
  return json({ok: true, id}, 200);
}

async function reviewsPending() {
  if (!supabase) return json({ok: false, error: "Backend not configured"}, 503);
  const rows = await supabase.from("evie_reviews")
    .select("id, body, display_handle, platform, status, created_at")
    .eq("status", "pending")
    .order("created_at", {ascending: true})
    .limit(25);
  if (rows.error) throw rows.error;
  return json({ok: true, reviews: rows.data || []});
}

async function reviewSet(payload: Record<string, unknown>) {
  if (!supabase) return json({ok: false, error: "Backend not configured"}, 503);
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const status = typeof payload.status === "string" ? payload.status.trim() : "";
  if (!uuidRe.test(id) || (status !== "approved" && status !== "hidden")) {
    return json({ok: false, error: "Missing review"}, 400);
  }
  const existing = await supabase.from("evie_reviews").select("id, status, body").eq("id", id).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) return json({ok: false, error: "That review is gone"}, 404);
  const upd = await supabase.from("evie_reviews").update({
    status,
    decided_at: new Date().toISOString(),
  }).eq("id", id);
  if (upd.error) throw upd.error;
  return json({ok: true, id, status, previous: existing.data.status}, 200);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {status: 204});
  if (req.method !== "POST") return json({ok: false, error: "Method not allowed"}, 405);
  try {
    const {payload, files} = await parseRequest(req);
    const auth = await authorize(req, payload);
    if (!auth.ok) return auth.res;
    const action = String(payload.action || "publish").trim();
    if (action === "publish") return await publish(payload, files);
    if (action === "unpublish") return await unpublish(payload);
    if (action === "reviews_pending") return await reviewsPending();
    if (action === "review_set") return await reviewSet(payload);
    return json({ok: false, error: "Unknown action"}, 400);
  } catch (err) {
    const message = err instanceof Error && /JSON/.test(err.message) ? "Invalid request" : "Could not complete that";
    console.error("evie-site-bot", err instanceof Error ? err.message : "unknown");
    return json({ok: false, error: message}, 400);
  }
});
