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
  const valid = (blockId) =>
    typeof blockId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(blockId);
  // The console issues ids like "int-55665"; older SDK builds expect the bare number.
  const candidates = (blockId) =>
    blockId.startsWith('int-') ? [blockId, blockId.slice(4)] : [blockId];
  const loadSdk = () => {
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
      });
      loading.catch(() => { loading = null; });
    }
    return loading;
  };
  const init = async (blockId) => {
    if (!valid(blockId)) throw new Error('invalid blockId');
    if (!inTelegram()) throw new Error('outside Telegram');
    if (controller) return controller;
    const sdk = await loadSdk();
    let lastError = null;
    for (const id of candidates(blockId)) {
      try {
        controller = await sdk.init({ blockId: id });
        return controller;
      } catch (error) { lastError = error; }
    }
    throw lastError;
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
