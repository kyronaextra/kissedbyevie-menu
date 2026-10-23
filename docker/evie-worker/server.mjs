import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

// This worker starter intentionally implements no bot commands and no
// automation execution until a separately reviewed control adapter is added.
const port=Number(process.env.PORT||10000);
const secret=process.env.EVIE_WORKER_CONTROL_TOKEN||'';
const host='0.0.0.0';
function reply(res,status,result){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(result));
}
function matches(header){
 const prefix='Bearer ';
 if(!secret||typeof header!=='string'||!header.startsWith(prefix))return false;
 const actual=Buffer.from(header.slice(prefix.length),'utf8');
 const expected=Buffer.from(secret,'utf8');
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
http.createServer((req,res)=>{
 if(req.method==='GET'&&req.url==='/healthz'){
  reply(res,200,{ok:true,service:'evie-worker-starter',automation_execution:false});
  return;
 }
 if(req.method==='GET'&&req.url==='/admin/ping'){
  if(!secret){reply(res,503,{ok:false,error:'Worker control token not configured'});return}
  if(!matches(req.headers.authorization)){reply(res,401,{ok:false,error:'Unauthorized'});return}
  reply(res,200,{ok:true,service:'evie-worker-starter',control_connected:false,automation_execution:false});
  return;
 }
 reply(res,404,{error:'Not found'});
}).listen(port,host,()=>console.log('Evie worker starter listening on port '+port));
