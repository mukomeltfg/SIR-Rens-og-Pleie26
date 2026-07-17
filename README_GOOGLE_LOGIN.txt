SIR Rens & Pleie — Google login setup

The code is ready for Google login through Supabase. One-time owner setup is still required by Google:

1. Supabase Dashboard → Authentication → Providers → Google.
2. Enable Google. Supabase shows a Callback URL. Copy it.
3. Google Cloud Console → APIs & Services → OAuth consent screen. Configure app name SIR Rens & Pleie.
4. Credentials → Create Credentials → OAuth client ID → Web application.
5. Add the Supabase Callback URL as Authorized redirect URI.
6. Copy Client ID and Client Secret into Supabase Google provider and Save.
7. Supabase → Authentication → URL Configuration:
   Site URL: https://mukomeltfg.github.io/SIR-Rens-og-Pleie26/
   Redirect URL: https://mukomeltfg.github.io/SIR-Rens-og-Pleie26/admin.html
8. Run supabase.sql.
9. Put your Project URL and Publishable key in config.js.
10. Upload all files to the GitHub repository root.

Only Sirrenspleie@gmail.com is accepted as administrator. Customers do not need accounts.
Never place a Supabase secret/service_role key or Google Client Secret in GitHub files.
