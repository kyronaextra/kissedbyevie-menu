'use strict';
// Temporary passcode-only admin API. Never put the passcode in source control.
// Render runtime environment: DATABASE_URL and EVIE_ADMIN_PASSCODE.
// Separate from the public Evie storefront and Supabase member authentication.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 10000);
const passcode = process.env.EVIE_ADMIN_PASSCODE || '';
const databaseUrl = process.env.DATABASE_URL || '';
const cookieName = 'evie_render_session';
const sessionHours = 4;
const allowedKinds = new Set(['bot','agent','docker','webhook','service','other']);
const allowedTriggers = new Set(['manual','schedule','webhook','event']);
const allowedPlatforms = new Set(['telegram','x','snapchat']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pool = new Pool({ connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 5000 });
class Failure extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
if (!/^\d{6}$/.test(passcode) || !databaseUrl) {
  console.error('Required Render secrets missing: set DATABASE_URL and a six-digit EVIE_ADMIN_PASSCODE.');
  process.exit(1);
}
const schema = String.raw`
CREATE TABLE IF NOT EXISTS evie_render_sessions (
 token_hash text PRIMARY KEY,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evie_render_sessions_expiry ON evie_render_sessions(expires_at);
CREATE TABLE IF NOT EXISTS evie_render_login_attempts (
 id bigserial PRIMARY KEY, client_hash text NOT NULL, attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evie_render_attempt_time ON evie_render_login_attempts(attempted_at);
CREATE TABLE IF NOT EXISTS evie_render_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL, kind text NOT NULL, platform text NOT NULL,
 render_service_id text, endpoint_url text, secret_env_name text, notes text,
 setup_state text NOT NULL DEFAULT 'registered',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evie_render_automations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL, trigger_type text NOT NULL, schedule_description text, connection_id uuid,
 notes text, execution_state text NOT NULL DEFAULT 'draft',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evie_render_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_type text NOT NULL, resource_type text NOT NULL, message text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evie_render_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 platform text NOT NULL, contact_name text NOT NULL, contact_handle text,
 last_preview text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '',
 origin text NOT NULL DEFAULT 'manual', last_direction text NOT NULL DEFAULT 'manual',
 reply_state text NOT NULL DEFAULT 'needs_reply',
 priority text NOT NULL DEFAULT 'normal', unread_count integer NOT NULL DEFAULT 0,
 last_message_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
`;
function json(res, status, value, headers = {}) {
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY'
  }, headers));
  res.end(JSON.stringify(value));
}
function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function equalCode(value) {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value)) return false;
  return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(passcode));
}
function cookies(req) {
  const result = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const pos = part.indexOf('=');
    if (pos > 0) result[part.slice(0,pos).trim()] = part.slice(pos+1).trim();
  }
  return result;
}
function sessionToken(req) {
  const token = cookies(req)[cookieName];
  return token && /^[A-Za-z0-9_-]{40,60}$/.test(token) ? token : null;
}
async function authenticated(req) {
  const token = sessionToken(req);
  if (!token) return false;
  const q = await pool.query('SELECT 1 FROM evie_render_sessions WHERE token_hash=$1 AND expires_at > now()', [hash(token)]);
  return q.rowCount === 1;
}
function protectPost(req) {
  const expected = (process.env.NODE_ENV === 'production' ? 'https://' : 'http://') + req.headers.host;
  if (req.headers.origin !== expected || req.headers['x-evie-request'] !== '1') {
    throw new Failure(403, 'Request origin not permitted');
  }
}
async function readJson(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    throw new Failure(415, 'JSON required');
  }
  let raw = '';
  for await (const chunk of req) {
    raw += chunk.toString('utf8');
    if (raw.length > 16000) throw new Failure(413, 'Request too large');
  }
  try {
    const value = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid');
    return value;
  } catch { throw new Failure(400, 'Invalid JSON'); }
}
function str(value, max = 200, required = false) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v.length > max || (required && !v)) throw new Failure(400, 'Invalid input');
  return v;
}
function validUuid(value) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new Failure(400, 'Invalid record identifier');
  return value;
}
function verifyUrl(value) {
  const text = str(value, 450);
  if (!text) return null;
  let u;
  try { u = new URL(text); } catch { throw new Failure(400, 'Invalid HTTPS URL'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) {
    throw new Failure(400, 'Use a plain HTTPS URL without credentials or query parameters');
  }
  return u.toString();
}
async function audit(eventType, resourceType, message) {
  await pool.query(
    'INSERT INTO evie_render_events(event_type,resource_type,message) VALUES ($1,$2,$3)',
    [eventType, resourceType, String(message).slice(0,180)]
  );
}
async function login(req, res) {
  protectPost(req);
  const body = await readJson(req);
  const clientHash = hash(String(req.socket.remoteAddress || 'unknown'));
  const c = await pool.connect();
  let allowed = false;
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(85201115)');
    const q = await c.query(
      "SELECT count(*)::int AS total_count, count(*) FILTER (WHERE client_hash=$1)::int AS client_count FROM evie_render_login_attempts WHERE attempted_at > now() - interval '15 minutes'",
      [clientHash]);
    const total = q.rows[0];
    if (total.total_count < 20 && total.client_count < 5) {
      await c.query('INSERT INTO evie_render_login_attempts(client_hash) VALUES($1)', [clientHash]);
      allowed = true;
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { c.release(); }
  if (!allowed) return json(res, 429, { error: 'Too many attempts. Try again later.' }, {'Retry-After':'900'});
  if (!equalCode(body.passcode)) return json(res, 401, { error: 'Incorrect passcode.' });
  const token = crypto.randomBytes(32).toString('base64url');
  await pool.query(
    "INSERT INTO evie_render_sessions(token_hash,expires_at) VALUES($1,now() + interval '4 hours')",
    [hash(token)]
  );
  return json(res, 200, { ok: true }, {
    'Set-Cookie': cookieName + '=' + token + '; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=' + (sessionHours*3600)
  });
}
async function logout(req, res) {
  protectPost(req);
  const token = sessionToken(req);
  if (token) await pool.query('DELETE FROM evie_render_sessions WHERE token_hash=$1', [hash(token)]);
  return json(res,200,{ok:true},{
    'Set-Cookie':cookieName+'=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
  });
}
async function overview() {
  const [conn,automations,events] = await Promise.all([
    pool.query("SELECT * FROM evie_render_connections WHERE setup_state <> 'archived' ORDER BY updated_at DESC LIMIT 100"),
    pool.query("SELECT * FROM evie_render_automations ORDER BY updated_at DESC LIMIT 100"),
    pool.query("SELECT * FROM evie_render_events ORDER BY created_at DESC LIMIT 30")
  ]);
  return {
    connections:conn.rows, automations:automations.rows, events:events.rows,
    counts:{members:null,pending:null,active:null,connections:conn.rows.length,automation_drafts:automations.rows.length},
    capabilities:{render_status:false,automation_runner:false,docker_runtime:'external'}
  };
}
async function inbox() {
  const q = await pool.query('SELECT *, false AS source_verified FROM evie_render_inbox ORDER BY last_message_at DESC LIMIT 300');
  const threads=q.rows;
  return {
    threads,
    stats:{
      waiting_for_me:threads.filter(x=>x.reply_state==='needs_reply').length,
      urgent:threads.filter(x=>x.reply_state==='needs_reply'&&x.priority==='high').length,
      unread:threads.reduce((sum,x)=>sum+Number(x.unread_count||0),0)
    },
    coverage:{telegram:{status:'not_connected'},x:{status:'not_connected'},snapchat:{status:'manual'}}
  };
}
async function command(action, payload, query, method) {
  if (action === 'session') return {admin:true,email:'Passcode access'};
  if (action === 'overview' && method === 'GET') return overview();
  if (action === 'members' && method === 'GET') {
    return {members:[],has_more:false,notice:'Member accounts remain in the original Supabase project.'};
  }
  if (action === 'inbox' && method === 'GET') return inbox();
  if (action === 'telegram_workers' && method === 'GET') return {workers:[]};
  if (action === 'render_status' && method === 'GET') return {configured:false};
  if (method !== 'POST') throw new Failure(405, 'Action requires POST');
  if (action === 'add_connection') {
    const c = payload.connection || {}, name=str(c.name,80,true), kind=str(c.kind,20,true), platform=str(c.platform,40,true);
    if (!allowedKinds.has(kind)) throw new Failure(400,'Invalid service type');
    const renderId=str(c.render_service_id,52);
    if (renderId && !/^srv-[a-z0-9]{12,36}$/.test(renderId)) throw new Failure(400,'Invalid Render ID');
    const env=str(c.secret_env_name,80);
    if (env && !/^[A-Z][A-Z0-9_]{2,79}$/.test(env)) throw new Failure(400,'Invalid environment variable name');
    const row = await pool.query(
      'INSERT INTO evie_render_connections(name,kind,platform,render_service_id,endpoint_url,secret_env_name,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [name,kind,platform,renderId||null,verifyUrl(c.endpoint_url),env||null,str(c.notes,600)]
    );
    await audit('connection.registered','connection','Registered service reference: '+name);
    return {ok:true,id:row.rows[0].id};
  }
  if (action === 'archive_connection') {
    const id=validUuid(payload.id);
    const q=await pool.query(
      "UPDATE evie_render_connections SET setup_state='archived',updated_at=now() WHERE id=$1 RETURNING name",[id]);
    if (!q.rowCount) throw new Failure(404,'Connection not found');
    await audit('connection.archived','connection','Archived service reference: '+q.rows[0].name);
    return {ok:true};
  }
  if (action === 'add_automation') {
    const a=payload.automation||{}, name=str(a.name,80,true),trigger=str(a.trigger_type,20,true);
    if (!allowedTriggers.has(trigger)) throw new Failure(400,'Invalid trigger');
    const connectionId=a.connection_id?validUuid(a.connection_id):null;
    const row=await pool.query(
      "INSERT INTO evie_render_automations(name,trigger_type,schedule_description,connection_id,notes) VALUES($1,$2,$3,$4,$5) RETURNING id",
      [name,trigger,str(a.schedule_description,180),connectionId,str(a.notes,600)]
    );
    await audit('automation.drafted','automation','Created automation draft: '+name);
    return {ok:true,id:row.rows[0].id};
  }
  if (action === 'delete_automation') {
    const q=await pool.query(
      "DELETE FROM evie_render_automations WHERE id=$1 AND execution_state='draft' RETURNING name",
      [validUuid(payload.id)]
    );
    if (!q.rowCount) throw new Failure(404,'Draft not found');
    await audit('automation.deleted','automation','Deleted automation draft: '+q.rows[0].name);
    return {ok:true};
  }
  if (action === 'inbox_add_manual') {
    const platform=str(payload.platform,30,true),name=str(payload.name,80,true),priority=str(payload.priority,10)||'normal';
    if (!allowedPlatforms.has(platform) || !['normal','high','low'].includes(priority)) throw new Failure(400,'Invalid reminder');
    const q=await pool.query(
      'INSERT INTO evie_render_inbox(platform,contact_name,contact_handle,last_preview,priority) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [platform,name,str(payload.handle,80),str(payload.summary,280),priority]
    );
    await audit('inbox.manual_created','admin','Added manual follow-up');
    return {ok:true,id:q.rows[0].id};
  }
  if (action === 'inbox_update') {
    const id=validUuid(payload.id),change=str(payload.change,40,true);
    let q;
    if (['needs_reply','waiting','handled'].includes(change)) {
      q=await pool.query('UPDATE evie_render_inbox SET reply_state=$2 WHERE id=$1 RETURNING id',[id,change]);
    } else if (['normal','high','low'].includes(change)) {
      q=await pool.query('UPDATE evie_render_inbox SET priority=$2 WHERE id=$1 RETURNING id',[id,change]);
    } else if (change === 'mark_seen') {
      q=await pool.query('UPDATE evie_render_inbox SET unread_count=0 WHERE id=$1 RETURNING id',[id]);
    } else if (change === 'save_note') {
      q=await pool.query('UPDATE evie_render_inbox SET note=$2 WHERE id=$1 RETURNING id',[id,str(payload.note,600)]);
    } else throw new Failure(400,'Invalid follow-up change');
    if (!q.rowCount) throw new Failure(404,'Reminder not found');
    return {ok:true};
  }
  if (['telegram_worker_issue','telegram_worker_revoke'].includes(action)) {
    throw new Failure(501,'Telegram worker pairing remains disabled until a Render-native adapter is configured.');
  }
  throw new Failure(404,'Unknown action');
}
const assets = new Map([
  ['/admin.html',['admin.html','text/html; charset=utf-8']],
  ['/admin.css',['admin.css','text/css; charset=utf-8']],
  ['/admin.js',['admin.js','application/javascript; charset=utf-8']],
  ['/admin-inbox.js',['admin-inbox.js','application/javascript; charset=utf-8']]
]);
async function handler(req,res) {
  try {
    const u=new URL(req.url,'http://localhost');
    const pathname=u.pathname;
    if (pathname === '/healthz') {
      try { await pool.query('SELECT 1'); return json(res,200,{ok:true}); }
      catch { return json(res,503,{ok:false}); }
    }
    if (pathname === '/api/login' && req.method==='POST') return await login(req,res);
    if (pathname === '/api/logout' && req.method==='POST') return await logout(req,res);
    if (pathname === '/api/admin') {
      if (!['GET','POST'].includes(req.method)) throw new Failure(405,'Method not allowed');
      if (!(await authenticated(req))) throw new Failure(401,'Admin session expired. Enter your passcode.');
      if (req.method==='POST') protectPost(req);
      const body=req.method==='POST'?await readJson(req):{};
      const action=req.method==='POST'?str(body.action,60,true):str(u.searchParams.get('action'),60,true);
      const result=await command(action,body,u.searchParams,req.method);
      return json(res,200,result);
    }
    if (pathname==='/' || pathname==='/index.html') {
      res.writeHead(302,{Location:'https://kissedbyevie-menu.onrender.com/', 'Cache-Control':'no-store'});
      return res.end();
    }
    if (req.method!=='GET' || !assets.has(pathname)) throw new Failure(404,'Page not found');
    const [file,mime] = assets.get(pathname);
    const bytes=await fs.promises.readFile(path.join(root,file));
    res.writeHead(200,{
      'Content-Type':mime,'Content-Length':bytes.length,'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
      'X-Frame-Options':'DENY'
    });
    return res.end(bytes);
  } catch(err) {
    const code=err instanceof Failure?err.code:503;
    if (!(err instanceof Failure)) console.error('Admin request failed:',err.message);
    return json(res,code,{error:err instanceof Failure?err.message:'Admin service is temporarily unavailable.'});
  }
}
async function start() {
  const c=await pool.connect();
  try { await c.query(schema); } finally { c.release(); }
  http.createServer((req,res)=>{ handler(req,res); }).listen(port,'0.0.0.0',()=>{
    console.log('Evie Render Admin listening on port '+port);
  });
}
start().catch(error=>{console.error('Could not initialize Evie Render Admin:',error.message);process.exit(1);});
