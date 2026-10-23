/* Public, free Mini App. initData is never used as authenticated identity. */
(() => {
  const app = globalThis.Telegram?.WebApp;
  let result = null;
  let started = false;
  const available = () => Boolean(app && app.platform && app.platform !== 'unknown');
  const publicLink = (payload, configuredUrl) => {
    // Do not propagate Telegram's initData, hash, or arbitrary query parameters.
    const validPayload = /^[A-Za-z0-9_-]{1,512}$/.test(payload);
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === 'https:' && url.hostname === 't.me' &&
          /^\/[A-Za-z0-9_]+\/[A-Za-z0-9_]+\/?$/.test(url.pathname)) {
        url.search = ''; url.hash = '';
        if (validPayload) url.searchParams.set('startapp', payload);
        return url.toString();
      }
    } catch (_) { /* Unconfigured bot: share the public HTTPS web build. */ }
    const url = new URL(globalThis.location.origin + globalThis.location.pathname);
    if (validPayload) url.searchParams.set('event', payload);
    return url.toString();
  };
  const share = (text, payload, configuredUrl) => {
    const target = 'https://t.me/share/url?' + new URLSearchParams({
      url: publicLink(payload, configuredUrl), text,
    });
    if (available()) app.openTelegramLink(target);
    else if (globalThis.navigator?.share) globalThis.navigator.share({text, url: publicLink(payload, configuredUrl)}).catch(() => {});
  };
  globalThis.countdownTelegram = {
    available,
    dark: () => available() ? app.colorScheme === 'dark' : null,
    payload: () => {
      const value = app?.initDataUnsafe?.start_param || new URLSearchParams(globalThis.location.search).get('event');
      return typeof value === 'string' && /^[A-Za-z0-9_-]{1,512}$/.test(value) ? value : null;
    },
    start: () => {
      if (!available() || started) return;
      started = true; app.ready(); app.expand();
      const theme = () => { document.body.style.backgroundColor = app.themeParams.bg_color || '#F6F5F0'; };
      theme(); app.onEvent('themeChanged', theme);
      app.MainButton.onClick(() => { if (result) share(result.text, result.payload, result.url); });
    },
    setResult: (text, payload, label, url) => {
      result = {text, payload, url};
      if (available()) { app.MainButton.setText(label); app.MainButton.show(); }
    },
    clearResult: () => { result = null; if (available()) app.MainButton.hide(); },
    share,
    haptic: () => { if (available()) app.HapticFeedback?.impactOccurred('light'); },
  };
})();
