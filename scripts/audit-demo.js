require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { generateChatResponse } = require('../src/services/aiService');
const base = `http://localhost:${process.env.PORT || 5000}`;
async function call(path, method = 'GET', body) {
 const start = Date.now();
 const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
 return { status: response.status, ms: Date.now() - start, body: await response.json() };
}
(async () => {
 const report = { testedAt: new Date().toISOString(), tests: [] };
 const record = (name, result) => { report.tests.push({ name, ...result }); console.log(JSON.stringify({ name, ...result })); };
 record('API health', await call('/'));
 const before = await call('/api/analytics?business_id=1');
 record('Analytics before', before);
 const lead = await call('/api/leads', 'POST', { business_id: 1, customer_name: 'Demo QA Customer', email: 'demo-qa@example.com', phone: '+1 214 555 0187', zip_code: '75201', issue_description: 'Kitchen sink drain is leaking underneath the cabinet. Small drip, water is contained, no flooding.' });
 record('Create sample enquiry', lead);
 const id = lead.body.data?.id;
 if (!id) throw Error('No lead created');
 record('Start chat with existing form details', await call('/api/chat/start', 'POST', { lead_id: id }));
 record('Supply visit preference', await call('/api/chat', 'POST', { lead_id: id, message: 'November 4, 2026 at 1:17 PM works. It is a small sink drain leak, not an emergency. Please show available slots; do not confirm until I select one.' }));
 record('Lead after qualification', await call(`/api/leads/${id}`));
 const slots = await call('/api/availability?business_id=1');
 record('Availability summary', { status: slots.status, total: slots.body.data?.length, bookedIncluded: slots.body.data?.filter(s => !s.is_available).length, pastIncluded: slots.body.data?.filter(s => String(s.slot_date).slice(0,10) < '2026-10-21').length });
 const slot = await call('/api/availability', 'POST', { business_id: 1, slot_date: '2026-11-04', slot_time: `13:${String(17 + id % 35).padStart(2,'0')}:00` });
 record('Create dedicated sample slot', slot);
 if (slot.body.data?.id) {
  const bookingBody = { business_id: 1, lead_id: id, availability_slot_id: slot.body.data.id, notes: 'Automated demo QA sample; no customer notification.' };
  record('Book available slot', await call('/api/bookings', 'POST', bookingBody));
  record('Reject booking same slot twice', await call('/api/bookings', 'POST', bookingBody));
  record('Chat after confirmed booking', await call('/api/chat', 'POST', { lead_id: id, message: 'Is my appointment confirmed? Please state the actual date and time.' }));
 }
 record('Persisted chat history', await call(`/api/chat/${id}`));
 record('Create scheduled follow-up record only', await call('/api/followups', 'POST', { business_id: 1, lead_id: id, message: 'Demo QA follow-up. No real email recipient.', channel: 'email', scheduled_at: '2026-11-03T15:00:00Z' }));
 record('Lead status after follow-up', await call(`/api/leads/${id}`));
 record('Analytics after', await call('/api/analytics?business_id=1'));
 const incomplete = await call('/api/leads', 'POST', { business_id: 1, customer_name: 'Demo QA Missing Contact', issue_description: 'My sink has a slow leak.' });
 record('Missing contact sample', incomplete);
 if (incomplete.body.data?.id) {
  const missingId = incomplete.body.data.id;
  record('Ask for missing contact', await call('/api/chat/start', 'POST', {lead_id: missingId}));
  record('Provide missing contact', await call('/api/chat', 'POST', {lead_id: missingId, message: 'My phone number is +1 214 555 0194, email is qa-missing@example.com, and ZIP code is 75201.'}));
  record('Verify contact saved', await call(`/api/leads/${missingId}`));
 }
 try {
  const start = Date.now();
  const raw = await generateChatResponse([{role:'user',content:'Please ask only for missing visit preference.'}], lead.body.data);
  record('Direct AI provider', { success: true, ms: Date.now()-start, response: raw });
 } catch (e) { record('Direct AI provider', { success: false, error: String(e.message).replace(/AIza[\w-]+/g,'[redacted]') }); }
 fs.writeFileSync('demo-audit-results.json', JSON.stringify(report,null,2));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
