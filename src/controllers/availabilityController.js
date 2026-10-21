const pool = require('../config/db');
const { idValid, dateValid } = require('../utils/validation');
const { today, normalizeTime, futureSlot, TIME_ZONE } = require('../utils/dates');
async function getAvailableSlots(req,res,next) {
 try {
  if (Number(req.query.business_id) !== Number(process.env.BUSINESS_ID || 1) || (req.query.date && !dateValid(req.query.date))) return res.status(400).json({success:false,message:'Valid business and date required'});
  const data=(await pool.query('SELECT * FROM availability_slots WHERE business_id=$1 ORDER BY slot_date,slot_time',[process.env.BUSINESS_ID || 1])).rows.filter(slot => (!req.query.date || slot.slot_date===req.query.date) && (req.isAdmin || (slot.is_available && futureSlot(slot.slot_date,slot.slot_time))));
  res.json({success:true,data,time_zone:TIME_ZONE});
 } catch(e) { next(e); }
}
async function createAvailabilitySlot(req,res,next) {
 let client;
 try {
  const {business_id,slot_date,slot_time}=req.body;
  const time=normalizeTime(slot_time);
  if (Number(business_id)!==Number(process.env.BUSINESS_ID || 1) || !dateValid(slot_date) || slot_date<today() || !time || !futureSlot(slot_date,time)) return res.status(400).json({success:false,message:'Choose a future date and valid time.'});
  client=await pool.connect();await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${business_id}:${slot_date}:${time}`]);
  const data=(await client.query(`INSERT INTO availability_slots(business_id,slot_date,slot_time) SELECT $1::integer,$2::date,$3::varchar WHERE NOT EXISTS(SELECT 1 FROM availability_slots WHERE business_id=$1 AND slot_date=$2::date AND slot_time::time=$3::time) RETURNING *`,[business_id,slot_date,time])).rows[0];
  await client.query('COMMIT');
  return data ? res.status(201).json({success:true,data}) : res.status(409).json({success:false,message:'This slot already exists.'});
 } catch(e) { if(client) await client.query('ROLLBACK');next(e); } finally {client?.release();}
}
async function deleteAvailabilitySlot(req,res,next) {
 try {
  if (!idValid(req.params.id)) return res.status(400).json({success:false,message:'Invalid slot ID'});
  const data=(await pool.query('DELETE FROM availability_slots WHERE id=$1 AND business_id=$2 AND is_available=true RETURNING id',[req.params.id,process.env.BUSINESS_ID || 1])).rows[0];
  return data ? res.json({success:true}) : res.status(400).json({success:false,message:'Booked or missing slots cannot be deleted.'});
 } catch(e) { next(e); }
}
module.exports={getAvailableSlots,createAvailabilitySlot,deleteAvailabilitySlot};


