# Current demo setup

The demo includes enquiry forms, guided/AI chat, lead management, appointment availability, bookings and analytics. Login and automated email/SMS follow-ups have been removed at user request. Email remains a customer contact field only.

- Run backend with `npm run dev` and frontend with `npm run dev`.
- Home opens the dashboard directly; New Lead opens `/new-lead`.
- Frontend environment: API_BASE_URL and API_ADMIN_KEY.
- Backend environment: DATABASE_URL, ADMIN_API_KEY, CUSTOMER_TOKEN_SECRET. Frontend API_ADMIN_KEY matches backend ADMIN_API_KEY; keys remain server-side.
- Any numeric phone format is accepted for the demo, including local/non-US numbers. Name, email address, ZIP and description checks remain.
- Customer enquiry tokens preserve chat and booking state on refresh in the same browser.
- Appointment dates/times retain their business-timezone calculations internally; timezone labels are hidden in the UI.
- No email worker is started and no confirmation/follow-up emails are queued or sent. Historical database records are preserved.
- Gemini quota/billing was not changed. Guided mode remains usable without model quota.

For deployment, provision PostgreSQL and run backend `npm run db:init` on a fresh database. Deploy backend with `npm ci`/`npm start`; deploy frontend with `npm ci && npm run build`/`npm start`. Dockerfiles are supplied. Set FRONTEND_URL on backend to the final frontend origin, and match the server-side API keys. Hosting account access is still needed; no public demo URL has been created or verified.

Checks: backend `npm test`, `npm run test:workflow`; frontend `npm run lint`, `npm run build`, and `node scripts/test-access.mjs`. Use sample data in the open demo workspace.
