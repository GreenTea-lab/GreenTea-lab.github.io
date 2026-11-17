// Окно громкости музыки и звуков
import { openVolume } from './volume.js';
import { save } from './save.js';
import { t as tr } from './i18n.js';

const ICONS = {
  music: '<svg viewBox="0 0 24 24"><path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/></svg>',
  sfx: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

export function openSound(onClose) {
  openVolume({
    st: save.data.settings,
    save: () => save.write(false),
    title: tr('volume'),
    labels: { music: tr('music'), sound: tr('sound') },
    theme: { panel: '#fbefd0', border: '#6e4426', ink: '#3a2414', muted: '#7a5a38', accent: '#5aa83c', track: '#d8c49a', thumb: '#ffffff', font: 'Rubik, Arial, sans-serif' },
    icons: ICONS,
    onClose,
  });
}

export const volPct = (k) => Math.round((save.data.settings[k + 'Vol'] ?? 0) * 100) + '%';
if (typeof window !== 'undefined') window.__openSound = openSound;
