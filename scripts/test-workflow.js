require('dotenv').config({quiet:true});
const assert=require('node:assert/strict');
const pool=require('../src/config/db');
const app=require('../src/app');
const {issueLeadToken}=require('../src/middleware/auth');
const {once}=require('node:events');
process.env.AI_MODE='guided';
delete process.env.RESEND_API_KEY;delete process.env.EMAIL_FROM;
const realFetch=fetch;
(async()=>{
 let server;const leadIds=[];const slotIds=[];const results=[];
 const pass=name=>{results.push(name);console.log('PASS '+name);};
 try {

  server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
  async function call(path,method='GET',body,token) {const response=await realFetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
  const admin=process.env.ADMIN_API_KEY;
  for(const path of ['/api/leads','/api/bookings','/api/analytics?business_id=1','/api/businesses/1'])assert.equal((await call(path)).status,401);pass('All admin API endpoints reject unauthenticated access');
  assert.equal((await call('/api/leads','POST',{business_id:1,customer_name:'12',email:'123',phone:'xyz',zip_code:'bad',issue_description:'x'})).status,400);pass('Backend enquiry validation');
  const before=(await call('/api/analytics?business_id=1','GET',null,admin)).data.data;
  async function create(name) {const r=await call('/api/leads','POST',{business_id:1,customer_name:name,email:'qa@example.com',phone:'03001234567',zip_code:'75201',issue_description:'The kitchen sink drain has a small contained leak.'});assert.equal(r.status,201);leadIds.push(r.data.data.id);return {id:r.data.data.id,token:r.data.access_token};}
  const a=await create('Disposable QA Workflow A');const b=await create('Disposable QA Workflow B');
  assert.equal((await call(`/api/chat/${a.id}`)).status,401);assert.equal((await call(`/api/chat/${b.id}`,'GET',null,a.token)).status,401);pass('Customer sessions reject missing and cross-lead tokens');
  const starts=await Promise.all([call('/api/chat/start','POST',{lead_id:a.id},a.token),call('/api/chat/start','POST',{lead_id:a.id},a.token)]);assert(starts.every(r=>r.status===200));
  let history=(await call(`/api/chat/${a.id}`,'GET',null,a.token)).data;assert.equal(history.data.length,1);assert.equal(history.qualified,true);pass('Concurrent chat start is idempotent and qualification persists for refresh');
  await call('/api/chat/start','POST',{lead_id:b.id},b.token);
  const reply=await call('/api/chat','POST',{lead_id:a.id,message:'November 4, 2026 at 1:17 PM works.'},a.token);assert.equal(reply.data.data.qualified,true);assert.doesNotMatch(reply.data.data.reply,/confirmed/);pass('Guided chat captures date/time without falsely confirming');
  await pool.query('UPDATE leads SET phone=NULL,email=NULL,zip_code=NULL WHERE id=$1',[b.id]);
  const contacts=await call('/api/chat','POST',{lead_id:b.id,message:'My phone is +1 214 555 0194, my email is qa-missing@example.com and ZIP code is 75201.'},b.token);assert.equal(contacts.data.data.qualified,true);const saved=(await call(`/api/leads/${b.id}`,'GET',null,admin)).data.data;assert.equal(saved.email,'qa-missing@example.com');pass('Fallback saves supplied contact details instead of asking repeatedly');
  assert.equal((await call('/api/availability','POST',{business_id:1,slot_date:'2020-01-01',slot_time:'12:00'},admin)).status,400);pass('Past availability is rejected');
  let slot;for(let minute=0;minute<60;minute++){const r=await call('/api/availability','POST',{business_id:1,slot_date:'2030-11-04',slot_time:`13:${String(minute).padStart(2,'0')}`},admin);if(r.status===201){slot=r.data.data;slotIds.push(slot.id);break;} assert.equal(r.status,409,JSON.stringify(r.data));}
  assert(slot);assert.equal(slot.slot_date,'2030-11-04');
  const bookingBody=lead=>({business_id:1,lead_id:lead.id,availability_slot_id:slot.id});
  const race=await Promise.all([call('/api/bookings','POST',bookingBody(a),a.token),call('/api/bookings','POST',bookingBody(b),b.token)]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);const winner=race[0].status===201?a:b;pass('Concurrent booking race allows exactly one customer');
  const availability=(await call('/api/availability?business_id=1')).data.data;assert(!availability.some(s=>s.id===slot.id));assert(availability.every(s=>s.is_available));pass('Customer availability excludes booked and past slots');
  history=(await call(`/api/chat/${winner.id}`,'GET',null,winner.token)).data;assert.equal(history.booking.booking_date,'2030-11-04');assert.equal(history.qualified,true);pass('Refresh restores confirmed booking and correct calendar date');
  const confirmation=await call('/api/chat','POST',{lead_id:winner.id,message:'Is my appointment confirmed?'},winner.token);assert.match(confirmation.data.data.reply,/November 4, 2030/);assert.doesNotMatch(confirmation.data.data.reply,/Pakistan|GMT/);pass('Confirmed appointment uses US date/time and business timezone');
  const after=(await call('/api/analytics?business_id=1','GET',null,admin)).data.data;assert.equal(after.totalLeads,before.totalLeads+2);assert.equal(after.bookings,before.bookings+1);pass('Analytics reflect enquiry and confirmed booking');
  require('node:fs').writeFileSync('test-results.json',JSON.stringify({testedAt:new Date().toISOString(),passed:results,realEmailDelivered:false},null,2));
  console.log(`${results.length} integration checks passed. Email follow-ups are disabled.`);
 } finally {
  global.fetch=realFetch;
  if(leadIds.length){await pool.query('DELETE FROM followups WHERE lead_id=ANY($1::int[])',[leadIds]);await pool.query('DELETE FROM chat_messages WHERE lead_id=ANY($1::int[])',[leadIds]);await pool.query('DELETE FROM bookings WHERE lead_id=ANY($1::int[])',[leadIds]);await pool.query('DELETE FROM leads WHERE id=ANY($1::int[]) AND customer_name LIKE $2',[leadIds,'Disposable QA%']);}
  if(slotIds.length)await pool.query('DELETE FROM availability_slots WHERE id=ANY($1::int[])',[slotIds]);
  if(server)await new Promise(resolve=>server.close(resolve));await pool.end();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});

