// Точка входа: SDK, язык, сохранения, покупки, интерфейс
import { sdk } from './sdk.js';
import { setLang } from './i18n.js';
import { save } from './save.js';
import { iap } from './iap.js';
import { initApp, IAP_DEFS } from './app.js';

async function boot() {
  await sdk.init();
  setLang(sdk.lang);
  await save.load();
  try {
    await iap.init(IAP_DEFS, () => save.flush());
  } catch (e) {
    console.warn('[IAP] init', e);
  }
  if (iap.owned.has('disable_ads')) save.data.noAds = true;
  sdk.noAds = !!save.data.noAds;
  try {
    await Promise.all(['800 20px "Alegreya Sans"', '500 20px "Alegreya Sans"', '700 20px "Noto Serif"', '20px "Yeseva One"'].map((f) => document.fonts.load(f, 'Аa1')));
  } catch (e) {}
  initApp();
  const b = document.getElementById('boot');
  b.style.opacity = '0';
  setTimeout(() => b.remove(), 500);
  sdk.ready();
}

boot();
