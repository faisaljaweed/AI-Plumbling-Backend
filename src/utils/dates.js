const TIME_ZONE = process.env.BUSINESS_TIMEZONE || 'America/Chicago';
function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function normalizeTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})(?::([0-5]\d))?(?::[0-5]\d)?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (match[3]) { if (hour < 1 || hour > 12) return null; hour = hour % 12 + (match[3].toLowerCase() === 'pm' ? 12 : 0); }
  if (hour > 23) return null;
  return `${String(hour).padStart(2, '0')}:${match[2] || '00'}:00`;
}
function currentTime() { return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date()); }
function futureSlot(date, time) { const day = String(date).slice(0,10); const normalized = normalizeTime(time); return Boolean(normalized && (day > today() || (day === today() && normalized > currentTime()))); }
function appointmentLabel(booking) {
  const date = String(booking.booking_date).slice(0,10);
  const time = normalizeTime(booking.booking_time);
  const formattedDate = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
  const [hour, minute] = time.split(':');
  return `${formattedDate} at ${Number(hour) % 12 || 12}:${minute} ${Number(hour) >= 12 ? 'PM' : 'AM'}`;
}
module.exports = { TIME_ZONE, today, normalizeTime, futureSlot, appointmentLabel };
