SIR Rens & Pleie — automatisk SMS etter fullført ordre

DET SOM ER FERDIG I NETTSTEDET
1. Når administrator endrer ordrestatus til «Fullført», kaller admin.html automatisk Supabase Edge Function «send-review-sms».
2. Funksjonen kontrollerer at innlogget bruker er administrator.
3. SMS sendes via Twilio med direkte lenke til Google-anmeldelse.
4. Samme ordre får normalt bare én automatisk SMS.
5. Adminpanelet viser: Ikke sendt / Sender / Sendt / Feil.
6. Ved feil kan SMS sendes manuelt på nytt fra ordrekortet.

NØDVENDIG OPPSETT (én gang)
A. Kjør hele supabase.sql på nytt i Supabase SQL Editor. Den legger til SMS-kolonner uten å slette eksisterende ordre.
B. Opprett en Twilio-konto, et SMS-avsendernummer eller Messaging Service.
C. I Supabase Dashboard: Edge Functions → Secrets, legg inn:
   ADMIN_EMAIL=Sirrenspleie@gmail.com
   TWILIO_ACCOUNT_SID=...
   TWILIO_AUTH_TOKEN=...
   TWILIO_MESSAGING_SERVICE_SID=MG...   (anbefalt)
   GOOGLE_REVIEW_URL=https://g.page/r/CZd1G_ODAYcOEBM/review
   Alternativt kan TWILIO_FROM_NUMBER=+... brukes i stedet for Messaging Service.
D. Deploy funksjonen:
   Dashboard-metode: Edge Functions → Deploy a new function → send-review-sms → lim inn innholdet fra supabase/functions/send-review-sms/index.ts.
   CLI-metode: supabase functions deploy send-review-sms
E. Last opp alle nettstedfilene til GitHub Pages, inkludert admin.js/admin.html/admin.css/config.js.

TEST
1. Lag en testordre med ditt eget mobilnummer.
2. Logg inn i admin.html.
3. Sett status til «Fullført» og trykk «Lagre status».
4. SMS skal sendes automatisk og ordrekortet skal vise «Sendt».

VIKTIG
- Twilio er en betalt ekstern SMS-tjeneste. Selve koden kan ikke sende SMS før Twilio-konto og secrets er aktivert.
- Aldri legg TWILIO_AUTH_TOKEN eller SUPABASE_SERVICE_ROLE_KEY i config.js eller GitHub.
- SMS-teksten ber om en ærlig anmeldelse, ikke spesifikt fem stjerner.
