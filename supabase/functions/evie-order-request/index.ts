import { createClient } from "npm:@supabase/supabase-js@2";

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
  ["Daddy Package Monthly","Daddy Package One-time"],
  ["10 pics/videos","20 pics/videos","50 pics/videos"],
  ["Make a Deal $50","Make a Deal $100","Make a Deal $150","Make a Deal $200"]
];
const allowedOrigins = (Deno.env.get("EVIE_ALLOWED_ORIGINS") || "https://kissedbyevie-menu.onrender.com")
 .split(",").map(x=>x.trim()).filter(Boolean);
const url = Deno.env.get("SUPABASE_URL") || "";
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = url && secret ? createClient(url, secret, {auth:{persistSession:false,autoRefreshToken:false}}) : null;
function response(data: unknown, status: number, origin: string) {
 return new Response(JSON.stringify(data),{status,headers:{
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store",
  "Access-Control-Allow-Origin":origin,
  "Vary":"Origin",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"content-type"
 }});
}
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"";
 if(!allowedOrigins.includes(origin))return new Response("Origin not allowed",{status:403});
 if(req.method==="OPTIONS")return response({ok:true},200,origin);
 if(req.method!=="POST")return response({ok:false,error:"Method not allowed"},405,origin);
 if(!supabase)return response({ok:false,error:"Backend not configured"},503,origin);
 if(!req.headers.get("content-type")?.startsWith("application/json"))return response({ok:false,error:"JSON required"},415,origin);
 try{
  const raw=await req.text();
  if(raw.length>10000)return response({ok:false,error:"Payload too large"},413,origin);
  const b=JSON.parse(raw);
  if(b.website)return response({ok:false,error:"Invalid request"},400,origin);
  if(b.adult_confirmed!==true)return response({ok:false,error:"18+ confirmation required"},400,origin);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.request_id||""))
   return response({ok:false,error:"Invalid request ID"},400,origin);
  if(!["telegram","snapchat"].includes(b.contact_platform)||
     !/^[A-Za-z0-9_.@-]{2,80}$/.test(b.contact_handle||"")||
     !["cash_app","venmo","amazon_gift_card","apple_pay"].includes(b.payment_method)||
     typeof b.notes!=="string"||b.notes.length>500)
   return response({ok:false,error:"Invalid contact details"},400,origin);
  if(!Array.isArray(b.items)||b.items.length<1||b.items.length>23)
   return response({ok:false,error:"Invalid item list"},400,origin);
  let total=0;
  const seen=new Set<string>();
  for(const item of b.items){
   if(!item||typeof item.name!=="string"||
      !Object.prototype.hasOwnProperty.call(prices,item.name)||
      !Number.isSafeInteger(item.qty)||item.qty<1||item.qty>10||
      seen.has(item.name))return response({ok:false,error:"Invalid product selection"},400,origin);
   seen.add(item.name);total+=prices[item.name]*item.qty;
  }
  if(total>250000)return response({ok:false,error:"Order exceeds limit"},400,origin);
  for(const group of groupings)if(group.filter(name=>seen.has(name)).length>1)
   return response({ok:false,error:"Choose one option per group"},400,origin);
  if((seen.has("Daddy Package Monthly")||seen.has("Daddy Package One-time"))&&seen.has("Deluxe Dropbox / Full Vault"))
   return response({ok:false,error:"The Vault is already included"},400,origin);
  // Idempotency check reduces duplicates from uncertain network retries.
  const prior=await supabase.from("evie_order_requests").select("id").eq("request_id",b.request_id).maybeSingle();
  if(prior.error)throw prior.error;
  if(prior.data)return response({ok:true,order_id:prior.data.id},200,origin);
  // Simple per-handle throttling; add Turnstile/bot protection before wide release.
  const since=new Date(Date.now()-15*60*1000).toISOString();
  const recent=await supabase.from("evie_order_requests").select("id",{count:"exact",head:true})
    .eq("contact_platform",b.contact_platform).eq("contact_handle",b.contact_handle).gte("created_at",since);
  if(recent.error)throw recent.error;
  if((recent.count||0)>=3)return response({ok:false,error:"Please wait before submitting again"},429,origin);
  const insert=await supabase.from("evie_order_requests").insert({
    request_id:b.request_id,contact_platform:b.contact_platform,contact_handle:b.contact_handle,
    notes:b.notes,payment_method:b.payment_method,items:b.items,initial_total_cents:total,adult_confirmed:true
  }).select("id").single();
  if(insert.error)throw insert.error;
  return response({ok:true,order_id:insert.data.id},201,origin);
 }catch(e){console.error("Order handler failed",e instanceof Error?e.name:"unknown");return response({ok:false,error:"Unable to save order"},500,origin)}
});
