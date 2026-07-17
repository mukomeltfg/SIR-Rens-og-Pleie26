SIR RENS & PLEIE — ONLINE ORDER STATUS SETUP

WHAT IS INCLUDED
- Customer order bell with automatic status refresh every 30 seconds.
- Secure Supabase database access through RPC functions.
- Separate admin.html login page.
- Only Sirrenspleie@gmail.com may list and update orders.
- Statuses: sent, under review, contacting, confirmed, scheduled, completed, cancelled.
- Optional personal message shown to the customer.
- EmailJS continues to send the order email and photos.

SETUP
1. Create a free project at Supabase.
2. Open SQL Editor and run the complete file supabase.sql.
3. In Supabase Authentication, create the administrator user:
   Email: Sirrenspleie@gmail.com
   Use a strong password that is not stored in the website files.
4. In Supabase Project Settings > API copy:
   - Project URL
   - anon public key
5. Open config.js and replace:
   PASTE_SUPABASE_PROJECT_URL
   PASTE_SUPABASE_ANON_KEY
6. Upload every file in this folder to the GitHub Pages repository.
7. Open admin.html and sign in.

IMPORTANT SECURITY
- Never put the service_role key in config.js or any public website file.
- The anon key is designed to be public. Security is enforced by Supabase RLS and RPC.
- Change the administrator email in BOTH config.js and supabase.sql if you use another email.
- Existing local orders created before Supabase connection cannot be controlled remotely.

CLIENT FLOW
1. Customer sends a request.
2. EmailJS sends the email and photos.
3. Supabase saves the order and returns a private tracking token.
4. The browser stores only the order number and private tracking token.
5. The customer opens the bell; the site asks only for that order's status.
6. When the admin changes the status, the customer sees it after opening the bell, returning to the page, or within 30 seconds while the page is open.

ADMIN URL
https://mukomeltfg.github.io/SIR-RensPleie/admin.html


AUTOMATISK SMS
Se README_SMS.txt for Twilio + Supabase Edge Function-oppsett.
