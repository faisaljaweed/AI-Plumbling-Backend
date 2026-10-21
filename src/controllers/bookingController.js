const pool = require('../config/db');
const { idValid } = require('../utils/validation');
const { futureSlot,appointmentLabel } = require('../utils/dates');
const { isQualified } = require('../services/qualification');
async function createBooking(req,res,next) {
 let client;
 try {
  const {business_id,lead_id,availability_slot_id,notes}=req.body;
  if (Number(business_id)!==Number(process.env.BUSINESS_ID || 1) || !idValid(lead_id) || !idValid(availability_slot_id) || (notes && (typeof notes!=='string' || notes.length>2000))) return res.status(400).json({success:false,message:'Valid business, lead and slot are required.'});
  client=await pool.connect(); await client.query('BEGIN');
  const lead=(await client.query('SELECT * FROM leads WHERE id=$1 AND business_id=$2 FOR UPDATE',[lead_id,business_id])).rows[0];
  const reject=async(status,message)=>{await client.query('ROLLBACK'); return res.status(status).json({success:false,message});};
  if (!lead) return await reject(404,'Lead not found');
  const existing=(await client.query("SELECT id FROM bookings WHERE lead_id=$1 AND status='confirmed'",[lead_id])).rows[0];
  if (existing) return await reject(409,'This enquiry already has a confirmed appointment.');
  if (!isQualified(lead)) return await reject(400,'Please complete the enquiry details before booking.');
  const slot=(await client.query('SELECT * FROM availability_slots WHERE id=$1 AND business_id=$2 FOR UPDATE',[availability_slot_id,business_id])).rows[0];
  if (!slot) return await reject(404,'Appointment slot not found');
  if (!slot.is_available || !futureSlot(slot.slot_date,slot.slot_time)) return await reject(409,'This appointment is no longer available. Choose another time.');
  const booking=(await client.query(`INSERT INTO bookings(business_id,lead_id,availability_slot_id,booking_date,booking_time,notes,status) VALUES($1,$2,$3,$4,$5,$6,'confirmed') RETURNING *`,[business_id,lead_id,slot.id,slot.slot_date,slot.slot_time,notes || null])).rows[0];
  await client.query('UPDATE availability_slots SET is_available=false WHERE id=$1',[slot.id]);
  await client.query("UPDATE leads SET status='booked',updated_at=CURRENT_TIMESTAMP WHERE id=$1",[lead_id]);
  const confirmationMessage=`Your appointment is confirmed for ${appointmentLabel(booking)}.`;
  await client.query("INSERT INTO chat_messages(lead_id,role,content) VALUES($1,'assistant',$2)",[lead_id,confirmationMessage]);
  await client.query('COMMIT');
  res.status(201).json({success:true,data:{...booking,confirmation_message:confirmationMessage}});
 } catch(e) { if (client) await client.query('ROLLBACK'); next(e); } finally {client?.release();}
}
async function getBookings(req,res,next) { try {const data=(await pool.query('SELECT b.*,l.customer_name,l.email,l.phone,l.service_type FROM bookings b JOIN leads l ON l.id=b.lead_id WHERE b.business_id=$1 ORDER BY b.booking_date,b.booking_time',[process.env.BUSINESS_ID || 1])).rows;res.json({success:true,data});}catch(e){next(e);}}
module.exports={createBooking,getBookings};
