require('dotenv').config({quiet:true});
const pool=require('../src/config/db');
pool.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_name IN ('followups','availability_slots','bookings','leads') ORDER BY table_name,ordinal_position").then(r=>console.log(JSON.stringify(r.rows))).finally(()=>pool.end());
