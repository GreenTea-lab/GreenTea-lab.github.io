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
  // покупки: необработанные платежи выдаются при запуске
  try {
    await iap.init(IAP_DEFS, () => save.flush());
  } catch (e) {
    console.warn('[IAP] init', e);
  }
  if (iap.owned.has('disable_ads')) save.data.noAds = true;
  sdk.noAds = !!save.data.noAds;
  try {
    await document.fonts.load('700 20px "PT Sans"');
    await document.fonts.load('700 20px "PT Serif"');
  } catch (e) {}
  initApp();
  const b = document.getElementById('boot');
  b.style.opacity = '0';
  setTimeout(() => b.remove(), 450);
  sdk.ready();
}

boot();
