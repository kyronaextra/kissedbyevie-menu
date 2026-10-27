import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

// Admin-only API for metadata, audit, and read-only member overview.
// It never executes a bot, runs a Docker command, accepts plaintext credentials,
// or exposes a Supabase secret key to the browser.
const SITE="https://kissedbyevie-menu.onrender.com";
const API_URL=Deno.env.get("SUPABASE_URL")||"";
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const RENDER_KEY=Deno.env.get("RENDER_API_KEY")||"";
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const reader=createClient(API_URL,ANON_KEY,opts);
const privileged=createClient(API_URL,SERVICE_KEY,opts);
const kinds=new Set(["bot","agent","docker","webhook","service","other"]);
const triggers=new Set(["manual","schedule","webhook","event"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const renderID=/^srv-[a-z0-9]{12,36}$/;
const suspicious=/((?:access|auth|secret|private|api)[-_ ]?(?:key|token)|password\s*[:=]|bearer\s+[a-z0-9._-]{8,}|(?:sk-|ghp_|sb_secret_|xoxb-)[a-z0-9_-]{8,})/i;

function headers(origin:string){
 const h=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info"});
 if(origin===SITE)h.set("Access-Control-Allow-Origin",SITE);
 return h;
}
function json(origin:string,status:number,data:Record<string,unknown>){
 return new Response(JSON.stringify(data),{status,headers:headers(origin)});
}
function text(value:unknown,max:number,label:string,required=false){
 const str=typeof value==="string"?value.trim():"";
 if((required&&!str)||str.length>max)throw new Error("Invalid "+label);
 if(suspicious.test(str))throw new Error("Do not enter credentials or tokens in "+label+". Use server-side secrets.");
 return str;
}
function validateConnection(payload:any){
 if(!payload||typeof payload!=="object")throw new Error("Invalid connection");
 const name=text(payload.name,80,"name",true);
 if(name.length<2)throw new Error("Name must be at least two characters");
 const kind=text(payload.kind,20,"type",true);
 if(!kinds.has(kind))throw new Error("Invalid connection type");
 const platform=text(payload.platform||"custom",40,"platform",true);
 const renderId=text(payload.render_service_id,52,"Render service ID")||null;
 if(renderId&&!renderID.test(renderId))throw new Error("Enter a valid Render service ID");
 // A VARIABLE NAME is not a credential. Validate its syntax, never its value.
 const envName=typeof payload.secret_env_name==="string"?payload.secret_env_name.trim():null;
 if(envName&&(!/^[A-Z][A-Z0-9_]{2,79}$/.test(envName)||envName.length>80)){
  throw new Error("Enter an environment VARIABLE NAME, not a credential");
 }
 const rawUrl=text(payload.endpoint_url,500,"public URL")||null;
 let safeUrl:null|string=null;
 if(rawUrl){
  let parsed:URL;
  try{parsed=new URL(rawUrl)}catch{throw new Error("Enter an HTTPS URL")}
  if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error("Use a plain HTTPS URL without passwords, tokens, query parameters or fragments");
  safeUrl=parsed.toString();
 }
 const notes=text(payload.notes,600,"notes");
 return {name,kind,platform,render_service_id:renderId,endpoint_url:safeUrl,
  secret_env_name:envName,notes,setup_state:"registered"};
}
async function audit(actor:string,type:string,resourceType:"connection"|"automation"|"admin",resourceId:string|null,message:string){
 await privileged.from("evie_admin_events").insert({actor_id:actor,event_type:type,resource_type:resourceType,resource_id:resourceId,message:message.slice(0,180)});
}
function decodeClaims(token:string):any{
 try{
  const encoded=token.split(".")[1];
  if(!encoded)return null;
  const normalized=encoded.replace(/-/g,"+").replace(/_/g,"/");
  return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,"=")));
 }catch{return null}
}
async function getRole(token:string){
 const {data:verified,error}=await reader.auth.getUser(token);
 const user=verified?.user;
 if(error||!user)return {status:401,reason:"Sign in to continue"};
 // Fresh administrator role: member-editable metadata is never trusted.
 const {data:serverAccount,error:adminError}=await privileged.auth.admin.getUserById(user.id);
 if(adminError||!serverAccount?.user||serverAccount.user.app_metadata?.evie_admin!==true){
  return {status:403,reason:"This account is not assigned as Evie Admin."};
 }
 const claims=decodeClaims(token);
 if(!claims||claims.sub!==user.id)return {status:401,reason:"Invalid session"};
 return {status:200,user};
}
async function overview(){
 const results=await Promise.all([
  privileged.from("evie_admin_connections").select("id,name,kind,platform,render_service_id,endpoint_url,secret_env_name,notes,setup_state,created_at,updated_at").neq("setup_state","archived").order("updated_at",{ascending:false}).limit(100),
  privileged.from("evie_admin_automation_drafts").select("id,name,trigger_type,schedule_description,connection_id,notes,execution_state,created_at,updated_at").order("updated_at",{ascending:false}).limit(100),
  privileged.from("evie_admin_events").select("id,event_type,resource_type,message,created_at").order("created_at",{ascending:false}).limit(30),
  privileged.from("evie_memberships").select("user_id",{count:"exact",head:true}),
  privileged.from("evie_memberships").select("user_id",{count:"exact",head:true}).eq("status","pending"),
  privileged.from("evie_memberships").select("user_id",{count:"exact",head:true}).eq("status","active")
 ]);
 if(results.some(r=>r.error))throw new Error("Dashboard data unavailable");
 return {connections:results[0].data||[],automations:results[1].data||[],events:results[2].data||[],
 counts:{members:results[3].count||0,pending:results[4].count||0,active:results[5].count||0,
  connections:(results[0].data||[]).length,automation_drafts:(results[1].data||[]).length},
 capabilities:{render_status:!!RENDER_KEY,automation_runner:false,docker_runtime:"external"}};
}

/** Owner-only inbox, with no direct browser RLS grants. */

async function sha256hex(value:string):Promise<string>{
 const buffer=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,"0")).join("");
}
async function listPersonalTelegramWorkers(){
 const {data,error}=await privileged.from("evie_admin_inbox_worker_tokens")
  .select("id,name,platform,created_at,expires_at,revoked_at,last_seen_at,requests_total")
  .order("created_at",{ascending:false}).limit(30);
 if(error)throw new Error("Connection status unavailable");
 return {workers:(data||[]).map(r=>({
  ...r,online:!r.revoked_at&&new Date(r.expires_at)>new Date()&&r.last_seen_at
   ? Date.now()-new Date(r.last_seen_at).getTime()<120000:false
 }))};
}
async function issuePersonalTelegramKey(actor:string,payload:any){
 const name=text(payload?.name||"Personal Telegram listener",75,"worker name",true);
 if(name.length<3)throw new Error("Worker name must be at least 3 characters");
 const {data:active,error:readError}=await privileged.from("evie_admin_inbox_worker_tokens")
  .select("id").is("revoked_at",null).gt("expires_at",new Date().toISOString()).limit(5);
 if(readError)throw new Error("Unable to issue worker access");
 if((active||[]).length>=3)throw new Error("Revoke an unused worker key before creating another (3 max)");
 const bytes=crypto.getRandomValues(new Uint8Array(32));
 const token="evi_tg_"+btoa(String.fromCharCode(...bytes))
  .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const digest=await sha256hex(token);
 const expires=new Date(Date.now()+180*86400000).toISOString();
 const {data,error}=await privileged.from("evie_admin_inbox_worker_tokens")
  .insert({name,platform:"telegram",token_sha256:digest,
    created_by:actor,expires_at:expires}).select("id,name,created_at,expires_at").single();
 if(error||!data)throw new Error("Unable to create Telegram worker key");
 await audit(actor,"inbox.worker_key_issued","admin",data.id,
  "Created scoped Telegram listener key: "+data.name);
 // The browser must display/copy the credential once; this token is not stored by the API.
 return {ok:true,worker:data,token};
}
async function revokePersonalTelegramKey(actor:string,payload:any){
 const id=String(payload?.id||"");
 if(!uuid.test(id))throw new Error("Invalid worker key");
 const {data,error}=await privileged.from("evie_admin_inbox_worker_tokens")
  .update({revoked_at:new Date().toISOString()})
  .eq("id",id).is("revoked_at",null).select("id,name").maybeSingle();
 if(error||!data)throw new Error("Worker key not found or already revoked");
 await audit(actor,"inbox.worker_key_revoked","admin",data.id,
  "Revoked Telegram listener key: "+data.name);
 return {ok:true};
}

async function inboxQueue(){
 const {data,error}=await privileged.from("evie_admin_inbox_threads")
  .select("id,platform,contact_name,contact_handle,origin,last_preview,last_message_at,last_inbound_at,last_outbound_at,last_direction,reply_state,priority,unread_count,note,source_verified,updated_at")
  .order("last_message_at",{ascending:false}).limit(250);
 if(error)throw new Error("Inbox temporarily unavailable");
 const rows=data||[];
 const keys=await listPersonalTelegramWorkers();
 const enabled=keys.workers.filter(w=>!w.revoked_at&&new Date(w.expires_at)>new Date());
 const online=enabled.some(w=>w.online);
 return {threads:rows,stats:{
  waiting_for_me:rows.filter(r=>r.reply_state==="needs_reply").length,
  urgent:rows.filter(r=>r.reply_state==="needs_reply"&&r.priority==="high").length,
  unread:rows.reduce((total,r)=>total+(r.unread_count||0),0),
  total:rows.length
 },coverage:{
  telegram:{status:online?"connected":enabled.length?"waiting_for_listener":"needs_verified_worker",
   detail:online?"Personal account listener heartbeat received within 2 minutes.":
    enabled.length?"Key registered; start the personal Telegram listener on your trusted device.":
    "Generate a scoped token and authorize a personal Telegram listener."},
  x:{status:"not_connected",detail:"Requires account-authorized X API/DM integration and applicable API access."},
  snapchat:{status:"manual_only",detail:"Personal Snapchat chats are not available to this service through a general public inbox API."}
 },last_checked_at:new Date().toISOString()};
}
async function inboxAction(actor:string,payload:any){
 const id=String(payload?.id||"");
 if(!uuid.test(id))throw new Error("Invalid conversation");
 const change=String(payload?.change||"");
 if(!["needs_reply","waiting","handled","high","normal","low","mark_seen","save_note"].includes(change)){
  throw new Error("Invalid inbox action");
 }
 const fields:Record<string,unknown>={updated_at:new Date().toISOString()};
 if(["needs_reply","waiting","handled"].includes(change)){
  fields.reply_state=change;
  fields.unread_count=0;
 }else if(["high","normal","low"].includes(change)){
  fields.priority=change;
 }else if(change==="mark_seen"){fields.unread_count=0}
 else if(change==="save_note"){fields.note=text(payload.note,600,"conversation notes")}
 const {data,error}=await privileged.from("evie_admin_inbox_threads")
  .update(fields).eq("id",id)
  .select("id,platform,contact_name,reply_state,priority").maybeSingle();
 if(error||!data)throw new Error("Conversation not found");
 await audit(actor,"inbox."+change,"admin",id,"Updated "+data.platform+" follow-up record");
 return {ok:true,thread:data};
}
async function manualFollowup(actor:string,payload:any){
 const platform=text(payload?.platform,20,"platform",true);
 if(!["telegram","x","snapchat"].includes(platform))throw new Error("Invalid platform");
 const name=text(payload?.name,100,"contact name",true);
 const handle=text(payload?.handle,80,"contact handle");
 const notes=text(payload?.notes,600,"follow-up notes");
 const preview=text(payload?.summary,280,"follow-up summary");
 const priority=String(payload?.priority||"normal");
 if(!["high","normal","low"].includes(priority))throw new Error("Invalid priority");
 const now=new Date().toISOString();
 const {data,error}=await privileged.from("evie_admin_inbox_threads").insert({
  platform,contact_name:name,contact_handle:handle,origin:"manual",
  external_thread_id:"manual:"+crypto.randomUUID(),
  last_preview:preview||"Manually added follow-up",
  last_direction:"manual",last_message_at:now,priority,
  reply_state:"needs_reply",note:notes,unread_count:0,source_verified:false
 }).select("id").single();
 if(error||!data)throw new Error("Could not save manual follow-up");
 await audit(actor,"inbox.manual_followup","admin",data.id,"Added manual "+platform+" follow-up");
 return {ok:true,id:data.id};
}

async function memberPage(page:number){
 const {data:accounts,error}=await privileged.auth.admin.listUsers({page,perPage:50});
 if(error)throw new Error("Cannot load the member list");
 const users=accounts?.users||[];
 const ids=users.map(u=>u.id);
 if(!ids.length)return {page,members:[],has_more:false};
 const [profiles,names,tiers]=await Promise.all([
  privileged.from("evie_member_profiles").select("user_id,nickname,phone_number,telegram_handle,x_handle,snapchat_handle").in("user_id",ids),
  privileged.from("evie_member_usernames").select("user_id,username").in("user_id",ids),
  privileged.from("evie_memberships").select("user_id,tier,status,age_verified_at,expires_at").in("user_id",ids)
 ]);
 if(profiles.error||names.error||tiers.error)throw new Error("Cannot load member metadata");
 const byId=(rows:any[])=>new Map(rows.map(r=>[r.user_id,r]));
 const profileMap=byId(profiles.data||[]),nameMap=byId(names.data||[]),membershipMap=byId(tiers.data||[]);
 return {page,has_more:users.length===50,
  members:users.map(u=>({
   id:u.id,created_at:u.created_at,email:u.email||"",
   username:nameMap.get(u.id)?.username||null,
   nickname:profileMap.get(u.id)?.nickname||null,
   phone_number:profileMap.get(u.id)?.phone_number||null,
   snapchat:profileMap.get(u.id)?.snapchat_handle||null,
   x:profileMap.get(u.id)?.x_handle||null,
   telegram:profileMap.get(u.id)?.telegram_handle||null,
   tier:membershipMap.get(u.id)?.tier||"none",
   status:membershipMap.get(u.id)?.status||"not reviewed",
   age_verified:!!membershipMap.get(u.id)?.age_verified_at,
   expires_at:membershipMap.get(u.id)?.expires_at||null
  }))};
}
async function renderStatus(serviceId:string){
 if(!renderID.test(serviceId))throw new Error("Invalid Render service ID");
 if(!RENDER_KEY)return {configured:false,message:"Render API key is not configured server-side. Use the Render dashboard link."};
 const response=await fetch("https://api.render.com/v1/services/"+encodeURIComponent(serviceId),{
  headers:{Authorization:"Bearer "+RENDER_KEY,Accept:"application/json"},
  signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw new Error("Could not retrieve Render service status");
 const service=await response.json();
 return {configured:true,name:String(service.name||"Render service").slice(0,90),
  service_type:service.type||"unknown",
  suspended:service.suspended||"unknown",
  runtime:service.serviceDetails?.runtime||service.serviceDetails?.env||"unknown"};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 if(origin!==SITE)return json(origin,403,{error:"Origin not allowed"});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
 if(!API_URL||!ANON_KEY||!SERVICE_KEY)return json(origin,503,{error:"Admin service is not configured"});
 if(!["GET","POST"].includes(req.method))return json(origin,405,{error:"Method not allowed"});
 try{
  const authorization=req.headers.get("authorization")||"";
  const bearer=/^Bearer ([A-Za-z0-9._-]{30,4000})$/.exec(authorization);
  if(!bearer)return json(origin,401,{error:"Authentication required"});
  const role=await getRole(bearer[1]);
  if(role.status!==200)return json(origin,role.status,{error:role.reason});
  const url=new URL(req.url);
  const action=req.method==="GET"?(url.searchParams.get("action")||"session"):null;
  if(req.method==="GET"&&action==="session"){
   return json(origin,200,{admin:true,email:role.user.email||""});
  }
  if(req.method==="GET"){
   if(action==="overview")return json(origin,200,await overview());
   if(action==="inbox")return json(origin,200,await inboxQueue());
   if(action==="telegram_workers")return json(origin,200,await listPersonalTelegramWorkers());
   if(action==="members"){
    const page=Math.max(1,Math.min(20,Number(url.searchParams.get("page"))||1));
    return json(origin,200,await memberPage(page));
   }
   if(action==="render_status"){
    const rid=url.searchParams.get("id")||"";
    // Only query service IDs explicitly registered in this admin registry.
    const {data:match,error}=await privileged.from("evie_admin_connections")
     .select("id").eq("render_service_id",rid).neq("setup_state","archived").limit(1);
    if(error||!match?.length)return json(origin,404,{error:"Service not registered"});
    return json(origin,200,await renderStatus(rid));
   }
   return json(origin,404,{error:"Unknown action"});
  }
  const raw=await req.text();
  if(raw.length>6000)return json(origin,413,{error:"Request too large"});
  const payload=JSON.parse(raw);
  const actor=role.user.id;
  if(payload?.action==="telegram_worker_issue"){
   return json(origin,201,await issuePersonalTelegramKey(actor,payload));
  }
  if(payload?.action==="telegram_worker_revoke"){
   return json(origin,200,await revokePersonalTelegramKey(actor,payload));
  }
  if(payload?.action==="inbox_update"){
   return json(origin,200,await inboxAction(actor,payload));
  }
  if(payload?.action==="inbox_add_manual"){
   return json(origin,201,await manualFollowup(actor,payload));
  }
  if(payload?.action==="add_connection"){
   const info=validateConnection(payload.connection);
   const {data,error}=await privileged.from("evie_admin_connections")
    .insert({...info,created_by:actor}).select("id,name,kind").single();
   if(error)throw new Error("Could not save connection");
   await audit(actor,"connection.registered","connection",data.id,"Registered "+data.kind+" reference: "+data.name);
   return json(origin,201,{ok:true,id:data.id});
  }
  if(payload?.action==="archive_connection"){
   const id=String(payload.id||"");
   if(!uuid.test(id))return json(origin,400,{error:"Invalid connection"});
   const {data,error}=await privileged.from("evie_admin_connections")
    .update({setup_state:"archived",updated_at:new Date().toISOString()})
    .eq("id",id).neq("setup_state","archived").select("id,name").maybeSingle();
   if(error||!data)return json(origin,404,{error:"Connection not found"});
   await audit(actor,"connection.archived","connection",id,"Archived reference: "+data.name);
   return json(origin,200,{ok:true});
  }
  if(payload?.action==="add_automation"){
   const rawDraft=payload.automation;
   if(!rawDraft||typeof rawDraft!=="object")throw new Error("Invalid automation");
   const name=text(rawDraft.name,100,"automation name",true);
   if(name.length<2)throw new Error("Automation name must be at least two characters");
   const trigger=text(rawDraft.trigger_type,20,"trigger",true);
   if(!triggers.has(trigger))throw new Error("Invalid trigger");
   const schedule=text(rawDraft.schedule_description,160,"schedule");
   const notes=text(rawDraft.notes,600,"notes");
   const connectionId=rawDraft.connection_id?String(rawDraft.connection_id):null;
   if(connectionId){
    if(!uuid.test(connectionId))throw new Error("Invalid linked connection");
    const {data:linked,error:linkError}=await privileged.from("evie_admin_connections")
      .select("id").eq("id",connectionId).neq("setup_state","archived").maybeSingle();
    if(linkError||!linked)throw new Error("Linked connection not found");
   }
   const {data,error}=await privileged.from("evie_admin_automation_drafts")
    .insert({name,trigger_type:trigger,schedule_description:schedule,
     notes,connection_id:connectionId,created_by:actor,execution_state:"draft"})
    .select("id").single();
   if(error)throw new Error("Could not save automation draft");
   await audit(actor,"automation.drafted","automation",data.id,"Created automation draft: "+name);
   return json(origin,201,{ok:true,id:data.id});
  }
  if(payload?.action==="delete_automation"){
   const id=String(payload.id||"");
   if(!uuid.test(id))return json(origin,400,{error:"Invalid draft"});
   const {data,error}=await privileged.from("evie_admin_automation_drafts")
    .delete().eq("id",id).eq("execution_state","draft").select("id,name").maybeSingle();
   if(error||!data)return json(origin,404,{error:"Draft not found"});
   await audit(actor,"automation.deleted","automation",id,"Deleted automation draft: "+data.name);
   return json(origin,200,{ok:true});
  }
  return json(origin,404,{error:"Unknown action"});
 }catch(err){
  const message=err instanceof Error?err.message:"Unable to complete request";
  if(message.startsWith("Invalid")||message.startsWith("Do not")||message.startsWith("Enter")||
    message.startsWith("Name must")||message.startsWith("Worker name")||message.startsWith("Revoke an unused")||message.startsWith("Automation name")){
   return json(origin,400,{error:message});
  }
  return json(origin,503,{error:"Admin request could not be completed."});
 }
});
