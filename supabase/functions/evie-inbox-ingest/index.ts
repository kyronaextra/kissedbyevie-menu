import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

// Trusted-worker inbox intake only. NO browser access, bot send, or
// log of message text. The shared secret is configured in Supabase Edge
// Function secrets and the approved sender's secure environment.
const url=Deno.env.get("SUPABASE_URL")||"";
const roleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const db=createClient(url,roleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const approvedPlatforms=new Set(["telegram"]);
const approvedDirections=new Set(["inbound","outbound"]);
const utf8=new TextEncoder();
function respond(status:number,payload:Record<string,unknown>){
 return new Response(JSON.stringify(payload),{status,headers:{
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"
 }});
}
async function sha256hex(value:string){
 const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",utf8.encode(value)));
 return Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
}
function field(value:unknown,min:number,max:number,label:string){
 if(typeof value!=="string")throw new Error("Invalid "+label);
 const v=value.trim();
 if(v.length<min||v.length>max)throw new Error("Invalid "+label);
 return v;
}
Deno.serve(async req=>{
 if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
 // Client applications must never call the worker ingress directly.
 if(req.headers.has("origin"))return respond(403,{error:"Forbidden"});
 if(!url||!roleKey)return respond(503,{error:"Worker intake is not configured"});
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer evi_tg_[A-Za-z0-9_-]{43}$/.test(bearer)){
  return respond(401,{error:"Unauthorized"});
 }
 try{
  const tokenHash=await sha256hex(bearer.slice(7));
  const {data:valid,error:authError}=await db.rpc("evie_admin_inbox_verify_worker",{
   p_digest:tokenHash,p_platform:"telegram"
  });
  if(authError)return respond(503,{error:"Worker verification unavailable"});
  if(!valid)return respond(401,{error:"Worker access revoked or expired"});
  const length=Number(req.headers.get("content-length")||"0");
  if(!Number.isFinite(length)||length>3500)return respond(413,{error:"Request too large"});
  const raw=await req.text();
  if(raw.length>3500)return respond(413,{error:"Request too large"});
  const input=JSON.parse(raw);
  if(!input||typeof input!=="object")throw Error("Invalid payload");
  // Active listener heartbeat is authenticated, but never creates a fake chat.
  if(input.type==="heartbeat"&&Object.keys(input).length===1){
   return respond(200,{ok:true,connected:true});
  }
  const platform=field(input.platform,1,20,"platform");
  if(!approvedPlatforms.has(platform))throw Error("Invalid platform");
  const threadId=field(input.thread_id,1,200,"thread id");
  const eventId=field(input.event_id,1,200,"event id");
  const name=field(input.display_name,1,100,"display name");
  const handle=typeof input.username==="string"?input.username.trim():"";
  if(handle.length>80)throw Error("Invalid username");
  const direction=field(input.direction,1,20,"direction");
  if(!approvedDirections.has(direction))throw Error("Invalid direction");
  const preview=typeof input.preview==="string"?input.preview.trim():"";
  if(preview.length>280)throw Error("Preview too long");
  const date=new Date(input.occurred_at||Date.now());
  if(Number.isNaN(date.getTime()))throw Error("Invalid timestamp");
  if(date.getTime()>Date.now()+300_000||date.getTime()<Date.now()-45*86_400_000)throw Error("Timestamp outside accepted window");
  const {data,error}=await db.rpc("evie_admin_inbox_ingest",{
   p_platform:platform,p_thread_id:threadId,p_event_id:eventId,
   p_contact_name:name,p_contact_handle:handle,
   p_direction:direction,p_preview:preview,p_occurred_at:date.toISOString()
  });
  if(error)return respond(503,{error:"Intake temporarily unavailable"});
  return respond(200,{ok:true,duplicate:Boolean(data?.duplicate)});
 }catch{
  return respond(400,{error:"Invalid inbox event"});
 }
});
