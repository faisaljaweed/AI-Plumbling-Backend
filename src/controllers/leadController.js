const pool = require('../config/db');
const { leadErrors, idValid } = require('../utils/validation');
const { issueLeadToken } = require('../middleware/auth');
async function createLead(req,res,next) {
 let client;
 try {
  const data = req.body || {};
  const errors = leadErrors(data);
  if (Number(data.business_id) !== Number(process.env.BUSINESS_ID || 1)) errors.business_id = 'Invalid business.';
  if (Object.keys(errors).length) return res.status(400).json({success:false,message:'Please correct the highlighted fields.',errors});
  client=await pool.connect();await client.query('BEGIN');
  const result = await client.query(`INSERT INTO leads(business_id,customer_name,email,phone,zip_code,issue_description,urgency) VALUES($1,$2,$3,$4,$5,$6,'normal') RETURNING *`, [data.business_id,data.customer_name.trim(),data.email.trim().toLowerCase(),data.phone.trim(),data.zip_code.trim(),data.issue_description.trim()]);
  await client.query('COMMIT');
  res.status(201).json({success:true,data:result.rows[0],access_token:issueLeadToken(result.rows[0].id)});
 } catch(e) { if(client) await client.query('ROLLBACK');next(e); } finally {client?.release();}
}
async function getLeads(req,res,next) { try { const data=(await pool.query('SELECT * FROM leads WHERE business_id=$1 ORDER BY created_at DESC',[process.env.BUSINESS_ID || 1])).rows; res.json({success:true,data}); } catch(e) { next(e); } }
async function getLeadById(req,res,next) { try { if (!idValid(req.params.id)) return res.status(400).json({success:false,message:'Invalid lead ID'}); const data=(await pool.query('SELECT * FROM leads WHERE id=$1 AND business_id=$2',[req.params.id,process.env.BUSINESS_ID || 1])).rows[0]; return data ? res.json({success:true,data}) : res.status(404).json({success:false,message:'Lead not found'}); } catch(e) { next(e); } }
async function updateLeadStatus(req,res,next) {
 try {
  if (!idValid(req.params.id) || !['new','qualified','booked','completed','lost','follow-up'].includes(req.body.status)) return res.status(400).json({success:false,message:'Invalid lead ID or status'});
  const data=(await pool.query('UPDATE leads SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND business_id=$3 RETURNING *',[req.body.status,req.params.id,process.env.BUSINESS_ID || 1])).rows[0];
  return data ? res.json({success:true,data}) : res.status(404).json({success:false,message:'Lead not found'});
 } catch(e) { next(e); }
}
module.exports={createLead,getLeads,getLeadById,updateLeadStatus};


