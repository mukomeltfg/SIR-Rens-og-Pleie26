SIR Rens & Pleie — utvidet GitHub Pages-versjon

Fungerer uten server:
- NO/EN/RU og lagring av språk
- Mobilmeny, animasjoner, galleri/lightbox
- Priskalkulator og promokode SIR10
- Bildevalg, forhåndsvisning og opptil 6 filer i skjemaet
- Dynamisk Bilmerke / Type møbel
- Google Maps, QR-kode, WhatsApp og Google Review
- Lokale favoritter, lokale anmeldelser og enkel lokal adminvisning
- SEO: robots.txt, sitemap.xml, Open Graph, schema.org, manifest og service worker

VIKTIGE BEGRENSNINGER:
1. GitHub Pages har ingen database. Lokale anmeldelser, favoritter og admin-data er synlige bare i samme nettleser.
2. En ekte adminpanel, CRM, kundekonto, bestillingsstatus, online betaling, push og sentral moderering krever backend/database.
3. EmailJS må ha et template som støtter feltene og vedlegg. Flere/store bilder kan overskride EmailJS-grenser. For produksjon anbefales bildeopplasting til Cloudinary/Firebase/Supabase og sending av lenker.
4. Galleri-bildene er eksempelbilder fra Unsplash og må erstattes med egne bilder før annonsering.
5. Kalkulatorpriser er foreløpige eksempelverdier og må godkjennes av eier.


AUTOMATISK SMS
Se README_SMS.txt for Twilio + Supabase Edge Function-oppsett.
