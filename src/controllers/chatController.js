const pool = require('../config/db');
const { generateChatResponse } = require('../services/aiService');
const { extractDetails, guidedResponse, isQualified } = require('../services/qualification');
const { idValid } = require('../utils/validation');
async function getState(id, client = pool) {
  const lead = (await client.query('SELECT * FROM leads WHERE id=$1', [id])).rows[0];
  if (!lead) return null;
  const booking = (await client.query("SELECT * FROM bookings WHERE lead_id=$1 AND status='confirmed' ORDER BY created_at DESC LIMIT 1", [id])).rows[0] || null;
  return { lead, booking, qualified: Boolean(booking || isQualified(lead)) };
}
async function conversationReply(id, message, start = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM leads WHERE id=$1 FOR UPDATE', [id]);
    const state = await getState(id, client);
    if (!state) { await client.query('ROLLBACK'); return null; }
    const history = (await client.query('SELECT id,role,content,created_at FROM chat_messages WHERE lead_id=$1 ORDER BY created_at,id', [id])).rows;
    if (start && history.length) { await client.query('COMMIT'); return { ...guidedResponse(state.lead, state.booking), messages: history, booking: state.booking, qualified: state.qualified, already_started: true }; }
    if (!start) await client.query("INSERT INTO chat_messages(lead_id,role,content) VALUES($1,'user',$2)", [id,message]);
    const details = extractDetails(start ? state.lead.issue_description : message, state.lead);
    const lead = { ...state.lead, ...Object.fromEntries(Object.entries(details).filter(([,v]) => v != null)) };
    if (!lead.service_type && !start && message.length >= 10 && !/[@\d]/.test(message)) { lead.issue_description = `${lead.issue_description || ''}\n${message}`.slice(-2000); Object.assign(lead, extractDetails(message, lead)); }
    let result = guidedResponse(lead, state.booking);
    let mode = 'guided';
    if (!result.qualified && lead.urgency !== 'high') {
      try {
        const raw = await generateChatResponse([...history, {role:'user',content:start ? `Customer enquiry: ${lead.issue_description}` : message}], lead, state.booking);
        const parsed = JSON.parse(raw.replace(/```(?:json)?/g,'').trim());
        if (typeof parsed.reply === 'string' && parsed.reply.length > 0 && parsed.reply.length <= 2000 && !/confirmed|dispatched|on the way/i.test(parsed.reply)) { result.reply = parsed.reply; mode = 'ai'; }
      } catch (error) { console.warn('AI unavailable; guided qualification active:', error.status || error.name); }
    }
    await client.query(`UPDATE leads SET customer_name=$1,phone=$2,email=$3,zip_code=$4,service_type=$5,issue_description=$6,urgency=$7,preferred_date=$8,preferred_time=$9,status=CASE WHEN $10 AND status NOT IN ('booked','completed','lost') THEN 'qualified' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=$11`, [lead.customer_name,lead.phone,lead.email,lead.zip_code,lead.service_type,lead.issue_description,lead.urgency,lead.preferred_date,lead.preferred_time,result.qualified,id]);
    await client.query("INSERT INTO chat_messages(lead_id,role,content) VALUES($1,'assistant',$2)", [id,result.reply]);
    await client.query('COMMIT');
    return { ...result, lead_data: details, booking: state.booking, mode };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
async function chatWithAI(req,res,next) {
  try {
    const {lead_id,message} = req.body;
    if (!idValid(lead_id) || typeof message !== 'string' || !message.trim() || message.length > 2000) return res.status(400).json({success:false,message:'Enter a message between 1 and 2,000 characters.'});
    const data = await conversationReply(lead_id,message.trim());
    return data ? res.json({success:true,data}) : res.status(404).json({success:false,message:'Lead not found'});
  } catch(e) { next(e); }
}
async function startChat(req,res,next) {
  try {
    if (!idValid(req.body.lead_id)) return res.status(400).json({success:false,message:'Valid lead_id required'});
    const data = await conversationReply(req.body.lead_id,'',true);
    return data ? res.json({success:true,data}) : res.status(404).json({success:false,message:'Lead not found'});
  } catch(e) { next(e); }
}
async function getChatHistory(req,res,next) {
  try {
    if (!idValid(req.params.lead_id)) return res.status(400).json({success:false,message:'Valid lead ID required'});
    const state = await getState(req.params.lead_id);
    if (!state) return res.status(404).json({success:false,message:'Lead not found'});
    const data = (await pool.query('SELECT id,lead_id,role,content,created_at FROM chat_messages WHERE lead_id=$1 ORDER BY created_at,id',[req.params.lead_id])).rows;
    res.json({success:true,data,qualified:state.qualified,booking:state.booking});
  } catch(e) { next(e); }
}
module.exports = { chatWithAI, startChat, getChatHistory };
