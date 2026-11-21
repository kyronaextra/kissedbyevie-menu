// Public live/offline check for Evie's Stripchat room.
// Returns only {ok, live, status}. Never forwards stream URLs, tokens, or snapshots.
// Browsers cannot call Stripchat directly (no CORS), so the homepage uses this proxy.
// Any failure answers live:false so the page can fall back to the offline loop.

const MODEL_ID = "287185885";
const MODEL_NAME = "eviesquirts";
const CACHE_SECONDS = 50;
const PUBLIC_STATUS = "public";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {...corsHeaders, "Content-Type": "application/json"},
  });
}

function liveFromStatus(username: string, status: string) {
  const same = username.trim().toLowerCase() === MODEL_NAME;
  return same && status === PUBLIC_STATUS;
}

async function statusFromCam(): Promise<{live: boolean; status: string}> {
  const res = await fetch(`https://stripchat.com/api/front/v2/models/${MODEL_ID}/cam`, {
    headers: {accept: "application/json", "user-agent": "KissedByEvieStatus/1.0"},
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("cam status " + res.status);
  const data = await res.json();
  const user = data?.user?.user ?? {};
  const username = String(user.username || "");
  const status = String(user.status || "off");
  return {live: liveFromStatus(username, status), status: status || "off"};
}

async function statusFromModels(): Promise<{live: boolean; status: string}> {
  const url = "https://go.rmhfrtnd.com/api/models?modelsList="
    + encodeURIComponent(MODEL_NAME) + "&strict=1&limit=1";
  const res = await fetch(url, {
    headers: {accept: "application/json", "user-agent": "KissedByEvieStatus/1.0"},
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("models status " + res.status);
  const data = await res.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  const model = models.find((row: {username?: string}) =>
    String(row?.username || "").toLowerCase() === MODEL_NAME);
  const status = model ? String(model.status || "off") : "off";
  return {live: Boolean(model) && status === PUBLIC_STATUS, status};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: corsHeaders});
  if (req.method !== "GET") return json({ok: false, live: false, status: "off"}, 405);
  try {
    const result = await statusFromCam();
    return json({ok: true, live: result.live, status: result.status});
  } catch (_camError) {
    try {
      const result = await statusFromModels();
      return json({ok: true, live: result.live, status: result.status});
    } catch (_modelsError) {
      return json({ok: false, live: false, status: "unknown"});
    }
  }
});
