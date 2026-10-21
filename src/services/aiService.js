const { GoogleGenAI } = require("@google/genai");

let ai;

let unavailableUntil = 0;
async function withTimeout(promise, ms = 10000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('AI_REQUEST_TIMEOUT')), ms); })]); }
  finally { clearTimeout(timer); }
}
const generateChatResponse = async (conversation, lead, booking = null) => {
  if (!process.env.GEMINI_API_KEY || process.env.AI_MODE === 'guided' || Date.now() < unavailableUntil) throw new Error('GUIDED_MODE');
  ai ||= new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
  // Poora chat Gemini ko baar baar bhejne ki zarurat nahi.
  const recentConversation = conversation.slice(-8);

  const prompt = `
You are the AI lead qualification assistant for a plumbing company.

Existing customer information:
${JSON.stringify({
  customer_name: lead.customer_name,
  phone: lead.phone,
  email: lead.email,
  zip_code: lead.zip_code,
  service_type: lead.service_type,
  issue_description: lead.issue_description,
  urgency: lead.urgency,
  preferred_date: lead.preferred_date,
  preferred_time: lead.preferred_time,
})}

Existing confirmed booking:
${JSON.stringify(
  booking
    ? {
        status: booking.status,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
      }
    : null,
)}

Your objective is to help qualify the plumbing lead and guide the customer to booking.

Required lead information:
- customer_name
- phone
- email
- zip_code
- service_type
- issue_description
- urgency
- preferred_date
- preferred_time

Rules:
- NEVER ask for information that already exists.
- Ask only for missing useful information.
- Ask one or two questions at a time.
- Be concise, helpful and professional.
- Never invent customer information.
- If the issue sounds urgent, set urgency to "high".
- Preserve all existing lead information.
- Mark qualified as true only when all important lead information is available.

BOOKING RULES:
- Do NOT say an appointment is confirmed before the customer selects an available slot.
- Do NOT say a plumber has been dispatched unless that information is explicitly provided.
- Do NOT say a technician is already on the way.
- When the lead becomes qualified and there is no confirmed booking, tell the customer to select one of the available appointment slots shown below.
- If a confirmed booking exists, tell the customer the ACTUAL confirmed booking date and time.
- If a confirmed booking exists, never tell the customer that the appointment is still unconfirmed.

NEXT ACTION:
- If a confirmed booking exists, next_action must be "booking_confirmed".
- If lead is qualified but no booking exists, next_action must be "show_booking_slots".
- Otherwise next_action must be "continue_chat".

Return valid JSON only.

Return exactly this structure:

{
  "reply": "message to customer",
  "qualified": false,
  "next_action": "continue_chat",
  "lead_data": {
    "customer_name": null,
    "phone": null,
    "email": null,
    "zip_code": null,
    "service_type": null,
    "issue_description": null,
    "urgency": null,
    "preferred_date": null,
    "preferred_time": null
  }
}

Recent conversation:
${JSON.stringify(recentConversation)}
`;

  let response;
  try { response = await withTimeout(
    ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    }),
    10000,
  );

  } catch (error) {
    if (error.status === 429 || /quota|RESOURCE_EXHAUSTED/.test(error.message)) unavailableUntil = Date.now() + 30 * 60000;
    throw error;
  }
  return response.text;
};

module.exports = {
  generateChatResponse,
};


