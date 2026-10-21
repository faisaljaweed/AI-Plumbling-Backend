const emailValid = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const phoneValid = value => typeof value === 'string' && value.length <= 25 && /^[+()\d\s.-]+$/.test(value) && /\d/.test(value);
const zipValid = value => typeof value === 'string' && /^\d{5}(-\d{4})?$/.test(value);
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const idValid = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
function leadErrors(data) {
  const errors = {};
  if (typeof data.customer_name !== 'string' || !/\p{L}/u.test(data.customer_name) || data.customer_name.trim().length < 2 || data.customer_name.length > 100) errors.customer_name = 'Enter a name between 2 and 100 characters.';
  if (!emailValid(data.email)) errors.email = 'Enter a valid email address.';
  if (!phoneValid(data.phone)) errors.phone = 'Enter a phone number.';
  if (!zipValid(data.zip_code)) errors.zip_code = 'Enter a valid US ZIP code.';
  if (typeof data.issue_description !== 'string' || data.issue_description.trim().length < 10 || data.issue_description.length > 2000) errors.issue_description = 'Describe the issue in 10–2,000 characters.';
  if (data.preferred_date && !dateValid(data.preferred_date)) errors.preferred_date = 'Use YYYY-MM-DD for the date.';
  return errors;
}
module.exports = { emailValid, phoneValid, zipValid, dateValid, idValid, leadErrors };
