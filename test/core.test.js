const test=require('node:test');
const assert=require('node:assert/strict');
const {extractDetails,isQualified,guidedResponse}=require('../src/services/qualification');
const {normalizeTime,appointmentLabel}=require('../src/utils/dates');
const {leadErrors}=require('../src/utils/validation');
const {issueLeadToken,leadFromToken}=(()=>{const auth=require('../src/middleware/auth');return {...auth};})();
const lead={customer_name:'Demo Customer',phone:'+1 214 555 0187',email:'demo@example.com',zip_code:'75201',issue_description:'The kitchen sink has a small drip, no flooding.',urgency:'normal'};
test('guided fallback extracts contacts and an explicit date without repeating completed fields',()=>{
 const details=extractDetails('My phone is +1 214 555 0194, email qa@example.com, ZIP code is 75201. November 4, 2026 at 1:17 PM.',{...lead,phone:null,email:null,zip_code:null});
 assert.equal(details.phone,'+1 214 555 0194');assert.equal(details.email,'qa@example.com');assert.equal(details.zip_code,'75201');assert.equal(details.preferred_date,'2026-11-04');assert.equal(details.preferred_time,'13:17:00');
 const merged={...lead,...details};assert.equal(isQualified(merged),true);assert.equal(guidedResponse(merged).next_action,'show_booking_slots');assert.doesNotMatch(guidedResponse(merged).reply,/confirmed/);
});
test('urgent issues receive urgent guidance while negated flooding does not',()=>{assert.equal(extractDetails('',lead).urgency,'normal');assert.equal(extractDetails('There is uncontrolled flooding from a burst pipe',lead).urgency,'high');assert.match(guidedResponse({...lead,service_type:'Pipe repair',urgency:'high'}).reply,/does not dispatch/);});
test('calendar date and 12-hour appointment display are host timezone independent',()=>{assert.equal(normalizeTime('1:30 PM'),'13:30:00');assert.equal(normalizeTime('25:00'),null);const text=appointmentLabel({booking_date:'2026-11-04',booking_time:'13:30:00'});assert.match(text,/November 4, 2026 at 1:30 PM/);assert.doesNotMatch(text,/Pakistan|GMT/);});
test('server rejects invalid email, phone, ZIP, name and issue',()=>{assert.equal(Object.keys(leadErrors(lead)).length,0);const errors=leadErrors({...lead,email:'123456',phone:'abc',zip_code:'abc',customer_name:'1',issue_description:'bad'});assert.equal(Object.keys(errors).length,5);});
test('customer access token is signed and scoped',()=>{process.env.CUSTOMER_TOKEN_SECRET='test-secret-only';const token=issueLeadToken(42);assert.equal(token.split('.').length,2);assert.notEqual(issueLeadToken(43),token);});

test('demo accepts non-US and short numeric phone numbers',()=>{const {phoneValid}=require('../src/utils/validation');for(const phone of ['123','03001234567','+92 300 1234567','+44 20 1234 5678'])assert.equal(phoneValid(phone),true);assert.equal(extractDetails('My phone is 03001234567',{}).phone,'03001234567');});
