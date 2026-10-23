/* AdsGram rewarded video inside the Telegram WebView only; the SDK is never
   requested on plain web hosting and no ad identifier leaves the page. */
(() => {
  const SDK_URL = 'https://sdk.adsgram.ai/adsgram.sdk.js';
  const SHOW_TIMEOUT_MS = 60000;
  let controller = null;
  let loading = null;
  const inTelegram = () => {
    const app = globalThis.Telegram?.WebApp;
    return Boolean(app && app.platform && app.platform !== 'unknown');
  };
  const init = (blockId) => {
    if (!Number.isInteger(blockId) || blockId <= 0) {
      return Promise.reject(new Error('invalid blockId'));
    }
    if (!inTelegram()) return Promise.reject(new Error('outside Telegram'));
    if (controller) return Promise.resolve(controller);
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const sdk = globalThis.ADSGRAM?.SDK;
        if (sdk) return resolve(sdk);
        const script = document.createElement('script');
        script.async = true;
        script.src = SDK_URL;
        script.onload = () => globalThis.ADSGRAM?.SDK
          ? resolve(globalThis.ADSGRAM.SDK)
          : reject(new Error('SDK missing'));
        script.onerror = () => reject(new Error('SDK failed to load'));
        document.head.appendChild(script);
      })
        .then((sdk) => sdk.init({ blockId }))
        .then((made) => { controller = made; return made; });
      loading.catch(() => { loading = null; });
    }
    return loading;
  };
  globalThis.countdownAdsgram = {
    /* Resolves {shown, done}: shown — an ad was displayed, done — watched to the end. */
    show: (blockId) => init(blockId)
      .then((ad) => {
        let timer;
        return Promise.race([
          Promise.resolve(ad.show()).finally(() => clearTimeout(timer)),
          new Promise((resolve) => {
            timer = setTimeout(
              () => resolve({ done: false, timedOut: true }),
              SHOW_TIMEOUT_MS,
            );
          }),
        ]);
      })
      .then((state) => ({ shown: true, done: state?.done === true }))
      .catch(() => ({ shown: false, done: false })),
  };
})();
