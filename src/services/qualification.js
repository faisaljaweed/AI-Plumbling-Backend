const { emailValid, phoneValid, zipValid, dateValid } = require('../utils/validation');
const { today, normalizeTime, appointmentLabel } = require('../utils/dates');
function extractDetails(text, lead) {
  const data = {};
  const source = String(text || '');
  const email = source.match(/[^\s,;<>]+@[^\s,;<>]+\.[a-z]{2,}/i)?.[0];
  const phone = source.match(/(?:phone(?: number)?|mobile(?: number)?|contact number)\s*(?:is|:)?\s*([+()\d][+()\d .-]{0,24})/i)?.[1]?.trim() || (!lead.phone && /^[+()\d\s.-]+$/.test(source.trim()) ? source.trim() : null);
  const zip = source.match(/(?:zip(?:\s*code)?\s*(?:is|:)?\s*)(\d{5}(?:-\d{4})?)/i)?.[1] || (!lead.zip_code && /^\d{5}(?:-\d{4})?$/.test(source.trim()) ? source.trim() : null);
  if (emailValid(email)) data.email = email;
  if (phoneValid(phone)) data.phone = phone;
  if (zipValid(zip)) data.zip_code = zip;
  const name = source.match(/(?:my name is|name:)\s*([\p{L}][\p{L} '\-]{1,80}?)(?=\s+(?:and|my|phone|email|zip)\b|[,.;\n]|$)/iu)?.[1];
  if (name) data.customer_name = name.trim();
  const issue = `${lead.issue_description || ''} ${source}`;
  const categories = [[/water heater/i, 'Water heater service'], [/sink/i, 'Sink repair'], [/toilet/i, 'Toilet repair'], [/drain|clog/i, 'Drain service'], [/pipe|burst/i, 'Pipe repair'], [/leak|drip/i, 'Leak repair'], [/sewer/i, 'Sewer service'], [/plumb|faucet|tap|shower/i, 'General plumbing']];
  data.service_type = categories.find(([pattern]) => pattern.test(issue))?.[1] || lead.service_type || null;
  const dangerText = issue.replace(/\b(?:no|not|without)\s+(?:an?\s+)?(?:emergency|flooding|flood|gas leak|burst pipe)\b/gi, '');
  data.urgency = /flooding|burst pipe|sewage overflow|gas (?:leak|smell)|smell (?:of )?gas|uncontrolled|cannot stop|can't stop/i.test(dangerText) ? 'high' : lead.urgency || 'normal';
  let date = source.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  const monthDate = source.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?/i);
  if (monthDate) {
    const month = new Date(`${monthDate[1]} 1, 2000 UTC`).getUTCMonth() + 1;
    date = `${monthDate[3] || today().slice(0,4)}-${String(month).padStart(2,'0')}-${monthDate[2].padStart(2,'0')}`;
  }
  if (/\btom+or+ow\b|\btomorrow\b/i.test(source)) { const d = new Date(`${today()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); date = d.toISOString().slice(0,10); }
  else if (/\btoday\b/i.test(source)) date = today();
  if (dateValid(date) && date >= today()) data.preferred_date = date;
  const time = source.match(/\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm)\b/i)?.[0];
  if (time) data.preferred_time = normalizeTime(time);
  return data;
}
function isQualified(lead) { return Boolean(lead.customer_name && emailValid(lead.email) && phoneValid(lead.phone) && zipValid(lead.zip_code) && lead.issue_description?.trim().length >= 10 && lead.service_type); }
function guidedResponse(lead, booking) {
  if (booking) return { reply: `Your appointment is confirmed for ${appointmentLabel(booking)}.`, qualified: true, next_action: 'booking_confirmed' };
  const qualified = isQualified(lead);
  let reply;
  if (!lead.customer_name) reply = 'What is your full name? You can say “My name is John Smith.”';
  else if (!phoneValid(lead.phone)) reply = 'What is the best phone number to reach you at?';
  else if (!emailValid(lead.email)) reply = 'What email address should we use for your appointment details?';
  else if (!zipValid(lead.zip_code)) reply = 'What is the service ZIP code? You can say “ZIP code is 75201.”';
  else if (!lead.issue_description || !lead.service_type) reply = 'Please describe the plumbing issue and where it is happening, for example a leaking kitchen sink or blocked drain.';
  else reply = 'Thanks, we have the details needed. Please select an available appointment below to confirm your visit.';
  if (lead.urgency === 'high') reply = 'This sounds urgent. If it is safe, turn off the water supply and contact the plumbing company directly for immediate help. This chat does not dispatch emergency service. ' + reply;
  return { reply, qualified, next_action: qualified ? 'show_booking_slots' : 'continue_chat' };
}
module.exports = { extractDetails, isQualified, guidedResponse };
