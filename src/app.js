const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { identify,admin,customer,rateLimit }=require('./middleware/auth');
const app=express();
app.disable('x-powered-by');
if(process.env.TRUST_PROXY==='1') app.set('trust proxy',1);
app.use(cors({origin:(origin,done)=>done(null,!origin || origin===(process.env.FRONTEND_URL || 'http://localhost:3000'))}));
app.use(express.json({limit:'16kb'}));
app.use(identify);
app.get('/',(req,res)=>res.json({success:true,message:'AI Lead & Booking Assistant API is running'}));
app.use('/api', (req,res,next)=>{
 if(req.method==='POST' && req.path==='/leads') return next();
 if(req.method==='GET' && req.path==='/availability') return next();
 if(req.path==='/chat' || req.path==='/chat/start' || /^\/chat\/\d+$/.test(req.path) || (req.method==='POST' && req.path==='/bookings')) {
  if(req.method==='GET' && /^\/chat\/\d+$/.test(req.path)) req.params.lead_id=req.path.split('/')[2];
  return customer(req,res,next);
 }
 return admin(req,res,next);
});
app.use('/api/chat',rateLimit(60,60000));
app.post('/api/leads',rateLimit(15,3600000));
app.use('/api/leads',require('./routes/leadRoutes'));
app.use('/api/availability',require('./routes/availabilityRoutes'));
app.use('/api/bookings',require('./routes/bookingRoutes'));
app.use('/api/analytics',require('./routes/analyticsRoutes'));
app.use('/api/chat',require('./routes/chatRoutes'));
app.use('/api/businesses',require('./routes/businessRoutes'));
app.use((error,req,res,next)=>{
 console.error('Request failed:',error.message);
 const status=error.status || (error.type==='entity.parse.failed'?400:500);
 res.status(status).json({success:false,message:status<500 || status===503 ? error.message : 'Unable to complete the request. Please try again.'});
});
module.exports=app;
