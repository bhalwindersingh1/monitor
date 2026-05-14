// monitor.js  (host this file — see hosting options below)

(function () {
  'use strict';

  // ── CONFIG ─────────────────────────────────────────────────
  const NTFY_TOPIC   = 'mychromealerts0900'; // ← your topic
  const NTFY_SERVER  = 'https://ntfy.sh';
  const CHECK_INTERVAL_MS = 5000;   // poll every 5 s
  const DEBOUNCE_MS       = 3000;   // min gap between notifications
  // ────────────────────────────────────────────────────────────

  let lastNotified = 0;
  let lastBadge = 0;
  let lastTitle = document.title;

  function send(title, body, priority = 'default') {
  const now = Date.now();
  if (now - lastNotified < DEBOUNCE_MS) return;
  lastNotified = now;

  GM_xmlhttpRequest({
    method: 'POST',
    url: `${NTFY_SERVER}/${NTFY_TOPIC}`,
    headers: {
      'Title':        title,
      'Priority':     priority,
      'Tags':         'speech_balloon',
      'Content-Type': 'text/plain',
    },
    data: body,
    onerror: (err) => console.warn('[monitor] ntfy error:', err),
  });
}

  function getUnreadCount() {
    // WhatsApp Web stores unread count in the page title: "(3) WhatsApp"
    const match = document.title.match(/^\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function checkUnreadBadge() {
    const count = getUnreadCount();
    if (count > lastBadge) {
      const diff = count - lastBadge;
      send(
        'WhatsApp — new messages',
        `${diff} new message${diff > 1 ? 's' : ''} (${count} total unread)`,
        'high'
      );
    }
    lastBadge = count;
  }

 function checkTitleChange() {
  const title = document.title;
  if (title !== lastTitle) {
    lastTitle = title;
    // Notify when title changes to something other than plain "WhatsApp"
    if (title !== 'WhatsApp' && title.trim() !== '') {
      send('WhatsApp — active chat', `Now in: ${title}`);
    }
  }
}

  function checkIncomingMessages() {
    // Look for the notification dot on unread conversation rows
    const unreadRows = document.querySelectorAll(
      '[data-testid="cell-frame-container"] [data-testid="icon-unread-count"]'
    );
    if (unreadRows.length > 0) {
      send(
        'WhatsApp — unread chats',
        `${unreadRows.length} chat${unreadRows.length > 1 ? 's' : ''} with unread messages`,
        'default'
      );
    }
  }

  function poll() {
    checkUnreadBadge();
    checkTitleChange();
    checkIncomingMessages();
  }

  // Notify on page load / tab becoming visible
  send('WhatsApp Web', 'Monitor active — page loaded', 'low');

  // Poll on interval
  setInterval(poll, CHECK_INTERVAL_MS);

  // Also fire immediately when the tab regains focus
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) poll();
  });

  console.log('[monitor] loaded. Topic:', NTFY_TOPIC);
})();
