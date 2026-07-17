"use strict";

const $ = (s, r = document) => r.querySelector(s);
const cfg = window.SIR_CONFIG || {};
const labels = {
  sent: "Отправлено",
  review: "На рассмотрении",
  contact: "Связаться с клиентом",
  confirmed: "Подтверждено",
  scheduled: "Время согласовано",
  completed: "Выполнено",
  cancelled: "Отменено"
};
let db = null;
let recoveryMode = false;

function esc(v = "") {
  return String(v).replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
}
function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3500);
}
function setStatus(message, isError = false) {
  const el = $("#loginStatus");
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "#ff8b8b" : "";
}
function showFatal(message) {
  const warning = $("#setupWarning");
  warning.hidden = false;
  warning.textContent = message;
  $("#loginPanel").hidden = true;
  $("#adminPanel").hidden = true;
  $("#logoutBtn").hidden = true;
}
function initSupabase() {
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    showFatal("В config.js отсутствует адрес или публичный ключ Supabase.");
    return false;
  }
  if (!window.supabase?.createClient) {
    showFatal("Библиотека Supabase не загрузилась. Проверьте интернет и обновите страницу.");
    return false;
  }
  try {
    db = window.supabase.createClient(cfg.supabaseUrl.trim(), cfg.supabaseAnonKey.trim(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return true;
  } catch (error) {
    console.error(error);
    showFatal("Не удалось запустить Supabase: " + (error?.message || "неизвестная ошибка"));
    return false;
  }
}
function allowedEmail(email) {
  return String(email || "").trim().toLowerCase() ===
         String(cfg.adminEmail || "").trim().toLowerCase();
}
async function currentSession() {
  const { data, error } = await db.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}
async function showState() {
  if (!db && !initSupabase()) return;
  try {
    const session = await currentSession();
    const allowed = allowedEmail(session?.user?.email);
    $("#setupWarning").hidden = true;
    $("#loginPanel").hidden = allowed;
    $("#adminPanel").hidden = !allowed;
    $("#logoutBtn").hidden = !allowed;
    if (allowed) {
      await loadOrders();
    } else if (session && !recoveryMode) {
      await db.auth.signOut();
    }
  } catch (error) {
    console.error(error);
    showFatal("Ошибка соединения с Supabase: " + (error?.message || "неизвестная ошибка"));
  }
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db && !initSupabase()) return;
  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value;
  if (!allowedEmail(email)) {
    setStatus("Эта почта не имеет доступа к админ-панели.", true);
    return;
  }
  setStatus("Проверка входа…");
  try {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = String(error.message || "");
      if (/invalid api key/i.test(msg)) {
        setStatus("Недействительный API-ключ. config.js не соответствует проекту Supabase.", true);
      } else if (/invalid login credentials/i.test(msg)) {
        setStatus("Неверная почта или пароль.", true);
      } else {
        setStatus(msg, true);
      }
      return;
    }
    setStatus("");
    await showState();
  } catch (error) {
    setStatus(error?.message || "Ошибка входа.", true);
  }
});

$("#resetPasswordBtn").addEventListener("click", async () => {
  if (!db && !initSupabase()) return;
  const email = $("#adminEmail").value.trim();
  if (!allowedEmail(email)) {
    setStatus("Сначала укажите почту администратора.", true);
    return;
  }
  setStatus("Отправляю письмо…");
  const redirectTo = cfg.siteBaseUrl + "admin.html";
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
  setStatus(error ? error.message : "Письмо отправлено. Откройте последнее письмо и задайте новый пароль.", !!error);
});

$("#newPasswordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const p1 = $("#newPassword").value;
  const p2 = $("#newPassword2").value;
  if (p1.length < 8) {
    $("#newPasswordStatus").textContent = "Минимум 8 символов.";
    return;
  }
  if (p1 !== p2) {
    $("#newPasswordStatus").textContent = "Пароли не совпадают.";
    return;
  }
  $("#newPasswordStatus").textContent = "Сохраняю…";
  const { error } = await db.auth.updateUser({ password: p1 });
  if (error) {
    $("#newPasswordStatus").textContent = error.message;
    return;
  }
  $("#newPasswordStatus").textContent = "Пароль изменён. Теперь войдите с новым паролем.";
  recoveryMode = false;
  $("#newPasswordPanel").hidden = true;
  $("#loginPanel").hidden = false;
  await db.auth.signOut();
});

$("#logoutBtn").addEventListener("click", async () => {
  if (db) await db.auth.signOut();
  await showState();
});
$("#refreshBtn").addEventListener("click", loadOrders);

async function loadOrders() {
  const box = $("#adminOrders");
  box.innerHTML = '<p class="admin-empty">Загрузка…</p>';
  const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false });
  if (error) {
    box.innerHTML = `<p class="admin-empty">${esc(error.message)}</p>`;
    return;
  }
  $("#orderCount").textContent = `${data.length} заказов`;
  box.innerHTML = data.length ? data.map(orderCard).join("") : '<p class="admin-empty">Заказов пока нет.</p>';
  box.querySelectorAll("[data-save]").forEach(button => {
    button.addEventListener("click", () => saveOrder(button.dataset.save));
  });
  box.querySelectorAll("[data-sms]").forEach(button => {
    button.addEventListener("click", () => sendReviewSms(button.dataset.sms));
  });
}
function orderCard(order) {
  const tel = String(order.phone || "").replace(/[^+\d]/g, "");
  return `<article class="admin-order-card">
    <div class="admin-order-meta">
      <span class="status-pill">${esc(labels[order.status] || order.status || "—")}</span>
      <h3>${esc(order.order_number || "Без номера")} · ${esc(order.service || "—")}</h3>
      <strong>${esc(order.customer_name || "—")}</strong>
      <a href="tel:${esc(tel)}">${esc(order.phone || "—")}</a>
      <small>${order.created_at ? new Date(order.created_at).toLocaleString("ru-RU") : ""}</small>
      <p><b>Объект:</b> ${esc(order.object_type || "—")}</p>
      <p><b>Описание:</b> ${esc(order.problem || "—")}</p>
      <p><b>Адрес:</b> ${esc(order.address || "Не указан")}</p>
      <p><b>Оценка:</b> ${esc(order.estimated_price || "—")}</p>
      <div class="admin-contact-links">
        <a class="btn ghost" href="tel:${esc(tel)}">Позвонить</a>
        <a class="btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/${esc(tel.replace("+", ""))}">WhatsApp</a>
      </div>
    </div>
    <div class="admin-order-actions">
      <label>Статус
        <select id="status-${order.id}">
          ${Object.entries(labels).map(([value, label]) =>
            `<option value="${value}" ${value === order.status ? "selected" : ""}>${label}</option>`
          ).join("")}
        </select>
      </label>
      <label>Сообщение клиенту
        <textarea id="message-${order.id}" rows="4">${esc(order.status_message || "")}</textarea>
      </label>
      <button class="btn primary" data-save="${order.id}">Сохранить статус</button>
      ${order.status === "completed" ? `<button class="btn review" data-sms="${order.id}">Отправить SMS с отзывом</button>` : ""}
    </div>
  </article>`;
}
async function saveOrder(id) {
  const status = $(`#status-${id}`).value;
  const status_message = $(`#message-${id}`).value.trim() || null;
  const { error } = await db.from("orders").update({ status, status_message }).eq("id", id);
  if (error) {
    toast(error.message);
    return;
  }
  toast("Статус сохранён.");
  await loadOrders();
}
async function sendReviewSms(id) {
  const { data: order, error: readError } = await db.from("orders")
    .select("phone,customer_name,tracking_token")
    .eq("id", id).single();
  if (readError) {
    toast(readError.message);
    return;
  }
  const reviewUrl = cfg.googleReviewUrl;
  const { data, error } = await db.functions.invoke(cfg.reviewSmsFunction || "complete-order", {
    body: {
      phone: order.phone,
      customerName: order.customer_name || "",
      reviewUrl
    }
  });
  if (error) {
    toast("Ошибка SMS: " + (error.message || "неизвестная ошибка"));
    return;
  }
  toast(data?.ok === false ? (data.error || "SMS не отправлено") : "SMS отправлено.");
}

if (initSupabase()) {
  db.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryMode = true;
      $("#loginPanel").hidden = true;
      $("#adminPanel").hidden = true;
      $("#newPasswordPanel").hidden = false;
    }
  });
  showState();
}
