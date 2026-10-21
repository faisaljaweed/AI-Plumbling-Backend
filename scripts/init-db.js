require('dotenv').config({quiet:true});
const fs=require('node:fs');const path=require('node:path');const pool=require('../src/config/db');
(async()=>{try{await pool.query(fs.readFileSync(path.join(__dirname,'../db/schema.sql'),'utf8'));console.log('Demo schema initialized; existing customer data preserved.');}finally{await pool.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
