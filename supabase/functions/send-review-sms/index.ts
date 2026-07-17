import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizeNorwegianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("47") && digits.length === 10) return `+${digits}`;
  if (digits.length === 8) return `+47${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 8) return `+${digits}`;
  throw new Error("Ugyldig telefonnummer");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") || "Sirrenspleie@gmail.com").toLowerCase();
    const authHeader = req.headers.get("Authorization") || "";

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await caller.auth.getUser();
    const email = userData.user?.email?.toLowerCase();
    if (userError || !email || email !== adminEmail) return json({ ok: false, error: "Ikke autorisert" }, 401);

    const { order_id } = await req.json();
    if (!order_id) return json({ ok: false, error: "order_id mangler" }, 400);

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { data: order, error: orderError } = await admin.from("orders").select("id,customer_name,phone,status,review_sms_status,review_sms_sent_at").eq("id", order_id).single();
    if (orderError || !order) return json({ ok: false, error: "Ordren ble ikke funnet" }, 404);
    if (order.status !== "completed") return json({ ok: false, error: "Ordren må ha status Fullført" }, 409);
    if (order.review_sms_status === "sent" || order.review_sms_sent_at) return json({ ok: true, already_sent: true });

    await admin.from("orders").update({ review_sms_status: "sending", review_sms_error: null }).eq("id", order.id);

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    const reviewUrl = Deno.env.get("GOOGLE_REVIEW_URL") || "https://g.page/r/CZd1G_ODAYcOEBM/review";
    if (!accountSid || !authToken || (!messagingServiceSid && !fromNumber)) throw new Error("Twilio secrets er ikke konfigurert");

    const to = normalizeNorwegianPhone(order.phone);
    const firstName = String(order.customer_name || "").trim().split(/\s+/)[0] || "";
    const message = `Hei${firstName ? ` ${firstName}` : ""}! Takk for at du valgte SIR Rens & Pleie. Vi setter stor pris på en ærlig Google-anmeldelse: ${reviewUrl}`;
    const params = new URLSearchParams({ To: to, Body: message });
    if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid); else params.set("From", fromNumber!);

    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const result = await twilioResponse.json();
    if (!twilioResponse.ok) throw new Error(result.message || `Twilio HTTP ${twilioResponse.status}`);

    await admin.from("orders").update({
      review_sms_status: "sent",
      review_sms_sent_at: new Date().toISOString(),
      review_sms_sid: result.sid || null,
      review_sms_error: null,
    }).eq("id", order.id);

    return json({ ok: true, sid: result.sid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    try {
      const body = await req.clone().json();
      const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (body?.order_id && serviceRole && supabaseUrl) {
        const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
        await admin.from("orders").update({ review_sms_status: "failed", review_sms_error: message.slice(0, 500) }).eq("id", body.order_id);
      }
    } catch (_) { /* no-op */ }
    return json({ ok: false, error: message }, 500);
  }
});
