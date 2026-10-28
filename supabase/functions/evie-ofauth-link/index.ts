import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const SITE = "https://kissedbyevie-menu.onrender.com";
const API = "https://api.ofauth.com/v2";
const CLIENT_APP_ID = "app_sxxfcrdnsk4fflq5j4x01xxa"; // Public identifier, never a secret
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OF_KEY = Deno.env.get("OFAUTH_API_KEY") ?? "";
const sbOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const authClient = createClient(SB_URL, SB_ANON, sbOptions);
const admin = createClient(SB_URL, SB_SERVICE, sbOptions);
const urlPattern = /^https:\/\/(link\.)?ofauth\.com\//i;
const idPattern = /^conn_[A-Za-z0-9_-]{3,180}$/;
// Explicit flag prevents enabling a third-party account-access flow before consent and sandbox review.
const disabled = !OF_KEY || Deno.env.get("OFAUTH_LINK_ENABLED") !== "true";

function cors(origin: string): Headers {
  const h = new Headers({
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "Vary": "Origin", "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info"
  });
  if (origin === SITE) h.set("Access-Control-Allow-Origin", SITE);
  return h;
}
function json(origin: string, status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {status, headers:cors(origin)});
}
function display(row: any) {
  return { connected: row?.state === "connected", pending: row?.state === "pending",
    connected_at: row?.state === "connected" ? row.connected_at : null };
}
async function provider(path: string, init?: Record<string, unknown>, method: "GET"|"POST"|"DELETE" = init ? "POST" : "GET") {
  if (!OF_KEY) throw new Error("NOT_CONFIGURED");
  const response = await fetch(API + path, {
    method,
    headers: { apikey: OF_KEY, ...(init ? {"Content-Type": "application/json"} : {}) },
    body: init ? JSON.stringify(init) : undefined,
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("PROVIDER_" + response.status);
  return await response.json();
}
async function readRow(userId: string) {
  const res = await admin.from("evie_ofauth_links").select("*").eq("user_id", userId).maybeSingle();
  if (res.error) throw res.error;
  return res.data;
}
async function putRow(row: Record<string, unknown>) {
  const res = await admin.from("evie_ofauth_links").upsert(row, {onConflict:"user_id"});
  if (res.error) throw res.error;
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (origin !== SITE) return json(origin,403,{error:"Origin not allowed"});
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:cors(origin)});
  if (!["GET","POST"].includes(req.method)) return json(origin,405,{error:"Method not allowed"});
  if (!SB_URL || !SB_ANON || !SB_SERVICE) return json(origin,503,{error:"Account linking unavailable"});
  const token = /^Bearer ([A-Za-z0-9._-]{30,4000})$/.exec(req.headers.get("authorization")||"")?.[1];
  if (!token) return json(origin,401,{error:"Sign in to your free account first"});
  const {data, error} = await authClient.auth.getUser(token);
  const user = data?.user;
  if (error || !user || user.is_anonymous || !user.email)
    return json(origin,401,{error:"A permanent free account is required"});
  try {
    const row = await readRow(user.id);
    if (req.method === "GET") return json(origin,200,{available:!disabled,link:display(row)});
    if (disabled) return json(origin,503,{error:"OnlyFans linking is not configured yet"});
    const raw = await req.text();
    if (raw.length > 900) return json(origin,413,{error:"Request too large"});
    let body: Record<string,unknown>;
    try { body=JSON.parse(raw || "{}"); } catch { return json(origin,400,{error:"Invalid request"}); }
    if (body.action === "start") {
      if (row?.state === "connected") return json(origin,409,{error:"OnlyFans already linked"});
      if (row?.state === "pending" && Date.now()-Date.parse(row.started_at)<90000)
        return json(origin,429,{error:"Please wait a moment before starting again"});
      const nonce = crypto.randomUUID();
      const ref = user.id + ":" + nonce;
      const session = await provider("/link/init",{
        clientAppId: CLIENT_APP_ID, clientReferenceId: ref, redirectUrl: SITE+"/account.html"
      });
      if (session?.mode !== "hosted" || typeof session.url !== "string" || !urlPattern.test(session.url))
        throw new Error("PROVIDER_INVALID_RESPONSE");
      const secret = typeof session.clientSecret === "string" && session.clientSecret.length < 300
        ? session.clientSecret : null;
      await putRow({user_id:user.id,state:"pending",connection_id:null,link_client_secret:secret,
        reference_id:ref,started_at:new Date().toISOString(),connected_at:null,updated_at:new Date().toISOString()});
      return json(origin,200,{url:session.url});
    }
    if (body.action === "complete") {
      if (body.status !== "success" || typeof body.connection_id !== "string" ||
          !idPattern.test(body.connection_id))
        return json(origin,400,{error:"No successful connection to confirm"});
      if (!row || row.state !== "pending" || !row.reference_id)
        return json(origin,409,{error:"Start a new connection from your account first"});
      if (Date.now()-Date.parse(row.started_at) > 20*60*1000)
        return json(origin,410,{error:"Connection expired. Please start again"});
      // A redirect query string is NOT proof. Verify with OFAuth using a server secret.
      // Some OFAuth API versions omit clientSecret in init responses. Fail closed
      // rather than treating an unverified callback as a linked identity.
      if (!row.link_client_secret)
        return json(origin,409,{error:"OFAuth did not provide a verifiable session. Connection not saved. Contact site support."});
      const check = await provider("/link/"+encodeURIComponent(row.link_client_secret));
      const id = check?.data?.id;
      if (check?.status !== "active" || id !== body.connection_id)
        return json(origin,409,{error:"Connection could not be verified by OFAuth"});
      await putRow({user_id:user.id,state:"connected",connection_id:id,
        link_client_secret:null,reference_id:null,
        started_at:row.started_at,connected_at:new Date().toISOString(),updated_at:new Date().toISOString()});
      return json(origin,200,{available:true,link:{connected:true,pending:false}});
    }
    if (body.action === "disconnect") {
      if (!row || row.state !== "connected" || !row.connection_id)
        return json(origin,200,{link:{connected:false,pending:false}});
      // Only remove the local link after OFAuth confirms provider-side revocation.
      // Do not silently claim revocation when a vendor endpoint is unavailable.
      const response = await fetch(API+"/account/connections/"+encodeURIComponent(row.connection_id), {
        method:"DELETE",headers:{apikey:OF_KEY},signal:AbortSignal.timeout(12000)
      });
      if (!response.ok)
        return json(origin,502,{error:"Could not revoke access at OFAuth. The link is still active. Please contact support."});
      const del=await admin.from("evie_ofauth_links").delete().eq("user_id",user.id).eq("connection_id",row.connection_id);
      if (del.error) throw del.error;
      return json(origin,200,{link:{connected:false,pending:false}});
    }
    if (body.action === "cancel") {
      if (row?.state === "pending") {
        const del = await admin.from("evie_ofauth_links").delete().eq("user_id",user.id).eq("state","pending");
        if (del.error) throw del.error;
      }
      return json(origin,200,{link:{connected:false,pending:false}});
    }
    return json(origin,400,{error:"Unknown action"});
  } catch (err) {
    const reason=err instanceof Error ? err.message : "UNKNOWN";
    console.error("OFAuth link request failed",reason.startsWith("PROVIDER_") ? reason : "INTERNAL");
    return json(origin,503,{error:"OnlyFans connection service unavailable. Please try again later."});
  }
});
