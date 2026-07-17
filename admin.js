"use strict";
const $=(s,r=document)=>r.querySelector(s);
const cfg=window.SIR_CONFIG||{};
const labels={sent:'Sendt',review:'Tatt til behandling',contact:'Kontakter kunden',confirmed:'Bekreftet',scheduled:'Tid avtalt',completed:'Fullført',cancelled:'Avbestilt'};
const smsLabels={not_sent:'Ikke sendt',sending:'Sender…',sent:'Sendt',failed:'Feil'};
let db=null;

function toast(msg){const e=$('#toast');if(!e)return;e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),3000)}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function configured(){return Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&!String(cfg.supabaseUrl).startsWith('PASTE_')&&!String(cfg.supabaseAnonKey).startsWith('PASTE_'))}
function showSetup(message='Supabase er ikke konfigurert ennå. Fyll inn Project URL og anon key i config.js.'){
  const warning=$('#setupWarning');if(warning){warning.hidden=false;warning.textContent=message}
  if($('#loginPanel'))$('#loginPanel').hidden=true;if($('#ordersPanel'))$('#ordersPanel').hidden=true;if($('#logoutBtn'))$('#logoutBtn').hidden=true;
}
function initSupabase(){
  if(!configured()){showSetup();return false}
  if(!window.supabase||typeof window.supabase.createClient!=='function'){showSetup('Supabase-biblioteket ble ikke lastet. Kontroller internettforbindelsen og last siden på nytt.');return false}
  try{db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey)}catch(err){console.error(err);showSetup('Kunne ikke starte Supabase. Kontroller verdiene i config.js.');return false}
  if(!db||!db.auth){showSetup('Supabase-klienten ble ikke opprettet riktig. Tøm nettleserbufferen og kontroller config.js.');return false}
  return true;
}
async function session(){if(!db?.auth)return null;const {data,error}=await db.auth.getSession();if(error)throw error;return data?.session||null}
async function showState(){
  if(!db?.auth&&!initSupabase())return;
  try{const s=await session();const allowed=s?.user?.email?.toLowerCase()===String(cfg.adminEmail||'').toLowerCase();$('#loginPanel').hidden=!!allowed;$('#ordersPanel').hidden=!allowed;$('#logoutBtn').hidden=!allowed;$('#setupWarning').hidden=true;if(allowed)await loadOrders();else if(s)await db.auth.signOut()}
  catch(err){console.error(err);showSetup('Tilkoblingsfeil mot Supabase: '+(err?.message||'ukjent feil'))}
}

$('#loginForm').onsubmit=async e=>{e.preventDefault();const status=$('#loginStatus');if(!db?.auth&&!initSupabase()){status.textContent='Supabase er ikke konfigurert.';return}status.textContent='Logger inn…';const email=$('#adminEmail').value.trim();if(email.toLowerCase()!==String(cfg.adminEmail||'').toLowerCase()){status.textContent='Denne e-postadressen har ikke administratortilgang.';return}const {error}=await db.auth.signInWithPassword({email,password:$('#adminPassword').value});status.textContent=error?error.message:'';if(!error)showState()};
$('#logoutBtn').onclick=async()=>{if(db?.auth)await db.auth.signOut();showState()};
$('#refreshBtn').onclick=()=>loadOrders();

async function loadOrders(){
  if(!db){toast('Supabase er ikke tilgjengelig');return}
  const box=$('#adminOrders');box.innerHTML='<p class="admin-empty">Laster…</p>';
  const {data,error}=await db.from('orders').select('*').order('created_at',{ascending:false});
  if(error){box.innerHTML=`<p class="admin-empty">${esc(error.message)}</p>`;return}
  $('#orderCount').textContent=`${data.length} bestillinger`;
  box.innerHTML=data.length?data.map(card).join(''):'<p class="admin-empty">Ingen bestillinger ennå.</p>';
  box.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveOrder(b.dataset.save));
  box.querySelectorAll('[data-sms]').forEach(b=>b.onclick=()=>sendReviewSms(b.dataset.sms));
}
function smsBlock(o){
  const state=o.review_sms_status||'not_sent';
  const sentAt=o.review_sms_sent_at?new Date(o.review_sms_sent_at).toLocaleString('nb-NO'):'';
  const canSend=o.status==='completed'&&state!=='sent';
  return `<div class="sms-box ${esc(state)}"><div><b>Google-anmeldelse via SMS:</b> ${esc(smsLabels[state]||state)}${sentAt?`<small>${esc(sentAt)}</small>`:''}${o.review_sms_error?`<small class="sms-error">${esc(o.review_sms_error)}</small>`:''}</div>${canSend?`<button class="btn review" type="button" data-sms="${o.id}">Send anmeldelses-SMS</button>`:''}</div>`;
}
function card(o){
  const tel=String(o.phone||'').replace(/[^+\d]/g,'');
  return `<article class="admin-order-card"><div class="admin-order-meta"><span class="status-pill">${esc(labels[o.status]||o.status)}</span><h3>${esc(o.order_number)} · ${esc(o.service)}</h3><strong>${esc(o.customer_name)}</strong><a href="tel:${esc(tel)}">${esc(o.phone)}</a><small>${new Date(o.created_at).toLocaleString('nb-NO')}</small><p><b>Objekt:</b> ${esc(o.object_type||'—')}</p><p><b>Beskrivelse:</b> ${esc(o.problem||'—')}</p><p><b>Adresse:</b> ${esc(o.address||'Ikke oppgitt')}</p><p><b>Estimat:</b> ${esc(o.estimated_price||'—')}</p><div class="admin-contact-links"><a class="btn ghost" href="tel:${esc(tel)}">Ring</a><a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/${esc(tel.replace('+',''))}">WhatsApp</a></div>${smsBlock(o)}</div><div class="admin-order-actions"><label>Status<select id="status-${o.id}">${Object.entries(labels).map(([v,l])=>`<option value="${v}" ${v===o.status?'selected':''}>${l}</option>`).join('')}</select></label><label>Melding til kunden<textarea id="message-${o.id}" rows="4" placeholder="Valgfri melding">${esc(o.status_message||'')}</textarea></label><button class="btn primary" data-save="${o.id}">Lagre status</button><p class="admin-help">Når status settes til <b>Fullført</b>, sendes anmeldelses-SMS automatisk én gang.</p></div></article>`;
}
async function sendReviewSms(id){
  if(!db){toast('Supabase er ikke tilgjengelig');return false}
  toast('Sender SMS…');
  const {data,error}=await db.functions.invoke('send-review-sms',{body:{order_id:id}});
  if(error){toast('SMS-feil: '+(error.message||'ukjent feil'));await loadOrders();return false}
  if(!data?.ok){toast('SMS-feil: '+(data?.error||'ukjent feil'));await loadOrders();return false}
  toast(data.already_sent?'SMS var allerede sendt':'Anmeldelses-SMS er sendt');await loadOrders();return true;
}
async function saveOrder(id){
  if(!db){toast('Supabase er ikke tilgjengelig');return}
  const status=$(`#status-${id}`).value,message=$(`#message-${id}`).value.trim();
  const {data:before,error:readError}=await db.from('orders').select('status,review_sms_status').eq('id',id).single();
  if(readError){toast(readError.message);return}
  const {error}=await db.from('orders').update({status,status_message:message||null}).eq('id',id);
  if(error){toast(error.message);return}
  toast('Status er oppdatert');
  if(status==='completed'&&before.review_sms_status!=='sent')await sendReviewSms(id);else await loadOrders();
}
showState();
