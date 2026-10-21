# Current demo verification

Latest requested changes:
- US phone restriction removed on frontend, backend and chat qualification. Local/non-US/short numeric demo numbers are accepted.
- Email follow-up UI, links, metrics, backend endpoints, worker and queue integration removed. Customer contact email field remains. Historical follow-up data was not deleted.
- Visible timezone labels, chat Lead number and sidebar Dallas, Texas text removed.
- Login remains removed; root opens dashboard.

Verification: 6 backend core tests and 12 workflow integration checks pass, including relaxed phone acceptance, qualification, booking concurrency, refresh restoration and analytics. Frontend lint and final production build are checked with the current sources.

See DEMO-SETUP.md for current setup. Earlier email-provider checks no longer apply to the current demo.
