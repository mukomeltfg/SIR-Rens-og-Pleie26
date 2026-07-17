SIR Rens & Pleie — ПРОСТОЙ ВХОД ПО ПОЧТЕ И ПАРОЛЮ

В этой версии Google OAuth полностью удалён.

После публикации откройте:
https://mukomeltfg.github.io/SIR-Rens-og-Pleie26/admin.html

Вход:
Почта: Sirrenspleie@gmail.com
Пароль: тот, который вы один раз создадите в Supabase.

ОДИН РАЗ ПЕРЕД ПЕРВЫМ ВХОДОМ:
1. В config.js вставьте Publishable key проекта Supabase вместо PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE.
2. В Supabase откройте Authentication > Users > Add user.
3. Создайте пользователя Sirrenspleie@gmail.com и задайте пароль.
4. Запустите supabase.sql в SQL Editor, если ещё не запускали финальную версию.
5. Загрузите все файлы в корень репозитория GitHub.

После этого больше ничего настраивать не нужно: открываете admin.html, вводите почту и пароль, меняете заказы и оформление.

ВАЖНО: secret/service_role key нельзя вставлять в config.js. Используйте только Publishable key.
