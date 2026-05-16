(function () {
  'use strict';
  const NTFY_TOPIC  = 'mychromealerts0900';
  const NTFY_SERVER = 'https://ntfy.sh';
  const CHECK_INTERVAL_MS = 5000;
  const DEBOUNCE_MS = 3000;
  let lastNotified = 0, lastBadge = 0, lastTitle = document.title;
  let started = false;

  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function send(title, body, priority, tags) {
    const now = Date.now();
    if (now - lastNotified < DEBOUNCE_MS) return;
    lastNotified = now;
    GM_xmlhttpRequest({
      method: 'POST',
      url: `${NTFY_SERVER}/${NTFY_TOPIC}`,
      headers: {
        'Title':        title,
        'Priority':     priority || 'default',
        'Tags':         tags || 'speech_balloon',
        'Content-Type': 'text/plain',
      },
      data: body,
      onload:  (r) => console.log('[monitor] sent:', r.status, title),
      onerror: (e) => console.warn('[monitor] error:', e),
    });
  }

  function poll() {
    const count = (document.title.match(/^\((\d+)\)/) || [])[1] | 0;
    if (count > lastBadge) {
      const diff = count - lastBadge;
      send(
        `💬 WhatsApp — ${diff} new message${diff > 1 ? 's' : ''}`,
        `📩 ${diff} new message${diff > 1 ? 's' : ''} arrived\n🔢 Total unread: ${count}\n🕐 Time: ${getTime()}`,
        'high', 'speech_balloon,rotating_light'
      );
    }
    lastBadge = count;

    const title = document.title;
    if (title !== lastTitle) {
      lastTitle = title;
      if (title !== 'WhatsApp' && title.trim()) {
        send(
          `💭 WhatsApp — chat opened`,
          `👤 Now chatting in: ${title.replace(/^\(\d+\)\s*/, '')}\n🕐 Time: ${getTime()}`,
          'default', 'speech_balloon'
        );
      }
    }

    const unread = document.querySelectorAll('[data-testid="icon-unread-count"]').length;
    if (unread > 0 && unread > lastBadge) {
      send(
        `📬 WhatsApp — ${unread} unread chat${unread > 1 ? 's' : ''}`,
        `💬 ${unread} conversation${unread > 1 ? 's have' : ' has'} unread messages\n🕐 Time: ${getTime()}`,
        'default', 'mailbox_with_mail'
      );
    }
  }

  function waitForApp() {
    const ready =
      document.querySelector('[data-testid="conversation-panel-wrapper"]') ||
      document.querySelector('[data-testid="intro-md-beta-logo-dark"]')   ||
      document.querySelector('[data-testid="default-user"]')              ||
      document.querySelector('div#app div[tabindex="-1"]');

    if (ready) {
      if (started) return;
      started = true;
      console.log('[monitor] WhatsApp UI ready');
      send('✅ WhatsApp Web — Active',
        `🟢 Monitoring started\n🕐 Time: ${getTime()}`,
        'low', 'white_check_mark');
      setInterval(poll, CHECK_INTERVAL_MS);
    } else {
      setTimeout(waitForApp, 1000);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      send('🔕 WhatsApp Web — Minimised', `👁️ Tab in background\n🕐 Time: ${getTime()}`, 'min', 'eye,zzz');
    } else {
      send('👁️ WhatsApp Web — Back in focus', `🟢 Tab active again\n🕐 Time: ${getTime()}`, 'low', 'eyes');
      poll();
    }
  });

  window.addEventListener('beforeunload', () => {
    const b = new Blob([`❌ WhatsApp Web closed\n🕐 Time: ${getTime()}`], { type: 'text/plain' });
    navigator.sendBeacon(`${NTFY_SERVER}/${NTFY_TOPIC}`, b);
  });

  waitForApp();
  console.log('[monitor] loaded. Topic:', NTFY_TOPIC);
})();
