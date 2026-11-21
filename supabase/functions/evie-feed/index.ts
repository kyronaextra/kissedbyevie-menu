import { createClient } from "npm:@supabase/supabase-js@2";

// Homepage feed writer. Public reads go through RLS on evie_feed_posts.
// Writes require Evie admin JWT or the bot secret header. Do not deploy
// until Evie reviews the preview.

const url = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const feedSecret = Deno.env.get("EVIE_FEED_SECRET") || "";
const supabase = url && secret
  ? createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}})
  : null;

const allowedOrigins = (Deno.env.get("EVIE_ALLOWED_ORIGINS") ||
  "https://kissedbyevie-menu.onrender.com,http://localhost:4173,http://127.0.0.1:4173,http://localhost:8080,http://127.0.0.1:8080")
  .split(",").map((x) => x.trim()).filter(Boolean);

const BUCKET = "evie-public-gallery";
const MAX_BODY = 4000;
const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const LINK_KINDS = new Set(["show", "custom", "sale", "url"]);
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cors(origin: string) {
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-evie-feed-secret",
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
  };
}

function response(data: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(data), {status, headers: cors(origin)});
}

async function authorize(req: Request, origin: string): Promise<{ok: true; actor: string} | {ok: false; res: Response}> {
  if (!supabase) return {ok: false, res: response({ok: false, error: "Backend not configured"}, 503, origin)};
  const given = (req.headers.get("x-evie-feed-secret") || "").trim();
  if (feedSecret && given && given === feedSecret) return {ok: true, actor: "telegram-bot"};
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return {ok: false, res: response({ok: false, error: "Sign in as Evie first"}, 401, origin)};
  const {data, error} = await supabase.auth.getUser(jwt);
  if (error || !data?.user || data.user.app_metadata?.evie_admin !== true) {
    return {ok: false, res: response({ok: false, error: "This account is not an administrator"}, 403, origin)};
  }
  return {ok: true, actor: data.user.id};
}

function sniffImage(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return "image/heic";
  return null;
}

function extensionFor(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  return "jpg";
}

function cleanLink(value: unknown): string | null | false {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (!t) return null;
  if (t.length > 500) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.toString();
  } catch {
    return false;
  }
}

async function parsePayload(req: Request): Promise<{payload: Record<string, unknown>; files: File[]}> {
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

async function handlePost(payload: Record<string, unknown>, files: File[], actor: string, origin: string) {
  if (!supabase) return response({ok: false, error: "Backend not configured"}, 503, origin);
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (body.length > MAX_BODY) return response({ok: false, error: "That post is too long"}, 400, origin);
  const link = cleanLink(payload.link_url);
  if (link === false) return response({ok: false, error: "That link doesn’t look right"}, 400, origin);
  const kindRaw = typeof payload.link_kind === "string" ? payload.link_kind.trim() : "";
  const link_kind = kindRaw && LINK_KINDS.has(kindRaw) ? kindRaw : (link ? "url" : null);
  if (!body && !link && files.length === 0) {
    return response({ok: false, error: "Write something or add a photo"}, 400, origin);
  }
  if (files.length > MAX_PHOTOS) return response({ok: false, error: "Up to 8 photos in one post"}, 400, origin);
  const pinned = payload.pinned === true;
  const inGallery = payload.in_gallery !== false;

  const inserted = await supabase.from("evie_feed_posts").insert({
    body,
    link_url: link,
    link_kind,
    pinned,
    published: true,
    created_by: actor,
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
      if (!mime) throw new Error("Photos need to be JPEG, PNG, GIF, WebP, or HEIC");
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
    const status = /8 MB|JPEG|PNG/.test(message) ? 400 : 500;
    return response({ok: false, error: message}, status, origin);
  }

  return response({ok: true, id: postId, photos}, 201, origin);
}

async function handleDelete(payload: Record<string, unknown>, origin: string) {
  if (!supabase) return response({ok: false, error: "Backend not configured"}, 503, origin);
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!uuidRe.test(id)) return response({ok: false, error: "Missing post"}, 400, origin);
  const remove = payload.remove_from_gallery === true;
  const existing = await supabase.from("evie_feed_posts").select("id").eq("id", id).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) return response({ok: false, error: "That post is already gone"}, 404, origin);

  const hide = await supabase.from("evie_feed_posts").update({
    published: false,
    pinned: false,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (hide.error) throw hide.error;

  if (remove) {
    const gone = await supabase.from("evie_public_photos")
      .update({published: false, in_gallery: false})
      .eq("post_id", id);
    if (gone.error) throw gone.error;
  }

  return response({ok: true, id, removed_from_gallery: remove}, 200, origin);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: cors(origin)});
  if (req.method !== "POST" && req.method !== "DELETE") {
    return response({ok: false, error: "Method not allowed"}, 405, origin);
  }
  try {
    const auth = await authorize(req, origin);
    if (!auth.ok) return auth.res;
    const {payload, files} = await parsePayload(req);
    if (req.method === "DELETE") return await handleDelete(payload, origin);
    return await handlePost(payload, files, auth.actor, origin);
  } catch (err) {
    const message = err instanceof Error && /JSON/.test(err.message) ? "Invalid request" : "Could not save that post";
    console.error("evie-feed", err instanceof Error ? err.message : "unknown");
    return response({ok: false, error: message}, 400, origin);
  }
});
