// Точка входа: SDK, язык, сохранения, покупки, интерфейс
import { sdk } from './sdk.js';
import { setLang, t } from './i18n.js';
import { save } from './save.js';
import { iap } from './iap.js';
import { initApp, IAP_DEFS } from './app.js';

async function boot() {
  const stage = (key, progress) => {
    document.querySelector('.boot-status').textContent = t(key);
    document.getElementById('boot').style.setProperty('--boot-progress', progress + '%');
  };
  stage('bootConnect', 12);
  await sdk.init();
  setLang(sdk.lang);
  document.querySelector('.boot-title').textContent=t('docTitle');
  document.querySelector('.boot-caption').textContent=t('bootCaption');
  stage('bootSave', 35);
  await save.load();
  stage('bootPrepare', 62);
  // покупки: необработанные платежи выдаются при запуске
  try {
    await iap.init(IAP_DEFS, () => save.flush());
  } catch (e) {
    console.warn('[IAP] init', e);
  }
  if (iap.owned.has('disable_ads')) save.data.noAds = true;
  sdk.noAds = !!save.data.noAds;
  stage('bootFinish', 84);
  try {
    await document.fonts.load('700 20px "PT Sans"');
    await document.fonts.load('700 20px "PT Serif"');
  } catch (e) {}
  initApp();
  stage('bootReady', 100);
  const b = document.getElementById('boot');
  b.style.opacity = '0';
  setTimeout(() => b.remove(), 450);
  sdk.ready();
}

boot();
