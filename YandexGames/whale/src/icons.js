// SVG-иконки интерфейса
const sv = (body, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

export const IC = {
  close: sv(`<path d="M6 6l12 12M18 6L6 18" ${st} stroke-width="2.6"/>`),
  gear: sv(`<circle cx="12" cy="12" r="3.2" ${st}/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" ${st}/><circle cx="12" cy="12" r="6.6" ${st}/>`),
  shell: sv(`<path d="M3 15.5C3 9 7 4.5 12 4.5S21 9 21 15.5c-2.5 2.2-5.5 3.3-9 3.3S5.5 17.7 3 15.5z" fill="#ffb88a" stroke="#c8653a" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 18.8V5M12 18.8L7.5 6.6M12 18.8l4.5-12.2M12 18.8L4.6 10M12 18.8L19.4 10" fill="none" stroke="#c8653a" stroke-width="1.3"/><path d="M9.5 18.6h5l-1 2.2h-3z" fill="#f08a5a" stroke="#c8653a" stroke-width="1.2"/>`),
  pearl: sv(`<circle cx="12" cy="12" r="8.5" fill="url(#pg)"/><defs><radialGradient id="pg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#f0e6ff"/><stop offset="1" stop-color="#b8a8e8"/></radialGradient></defs><circle cx="12" cy="12" r="8.5" fill="none" stroke="#8a78c8" stroke-width="1.3"/><ellipse cx="9" cy="8.5" rx="2.4" ry="1.5" fill="#fff" opacity=".9"/>`),
  gift: sv(`<rect x="3.5" y="9" width="17" height="11.5" rx="1.5" ${st}/><path d="M2.5 9h19M12 9v11.5M12 9c-1.5-4-6-5-6-2s6 2 6 2zM12 9c1.5-4 6-5 6-2s-6 2-6 2z" ${st}/>`),
  goals: sv(`<circle cx="12" cy="12" r="8.5" ${st}/><circle cx="12" cy="12" r="4.8" ${st}/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>`),
  trophy: sv(`<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" ${st}/>`),
  video: sv(`<rect x="2.5" y="5.5" width="13.5" height="13" rx="2.5" ${st}/><path d="M16 10.5l5.5-3.2v9.4L16 13.5" ${st}/><path d="M7.5 9.3v5.4l4.3-2.7z" fill="currentColor"/>`),
  play: sv(`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>`),
  lock: sv(`<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${st}/>`),
  check: sv(`<path d="M5 12.5l4.5 4.5L19 7.5" ${st} stroke-width="3"/>`),
  up: sv(`<path d="M12 19V6M6 11.5L12 5.5l6 6" ${st} stroke-width="2.8"/>`),
  music: sv(`<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/>`),
  sound: sv(`<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
  bag: sv(`<path d="M5 8h14l-1.2 12H6.2z" ${st}/><path d="M9 10V7a3 3 0 0 1 6 0v3" ${st}/>`),
  wind: sv(`<path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7" ${st}/>`),
  drop: sv(`<path d="M12 3C9 7.5 6.5 10.5 6.5 14a5.5 5.5 0 0 0 11 0C17.5 10.5 15 7.5 12 3z" fill="#7ac8ff" stroke="#2a7ab8" stroke-width="1.6"/><ellipse cx="10" cy="13" rx="1.4" ry="2.2" fill="#fff" opacity=".8"/>`),
  island: sv(`<path d="M2 19c3-3 17-3 20 0z" fill="#f6dca0" stroke="#b8945a" stroke-width="1.3"/><path d="M12 18c0-4 .5-7 2-10" fill="none" stroke="#8a5a3a" stroke-width="1.8" stroke-linecap="round"/><path d="M14 8c-3-2-6-1-7 1M14 8c1-3 4-4 6-3M14 8c3-1 5 1 5 3M14 8c-1-2-4-3-5-2" fill="none" stroke="#3aa04a" stroke-width="2" stroke-linecap="round"/>`),
  whale: sv(`<path d="M2.5 8.5c1.2 1 1.7 2.4 1.5 4 1.4-.6 2.5-.4 3.5.5C9 16 12 17 15.5 17c3.5 0 6-2.2 6-5.5S18.5 6 14.5 6C11 6 9 8 7.5 10.5 6.6 9.3 5 8.3 2.5 8.5z" fill="#5b82e0" stroke="#2f4aa0" stroke-width="1.3" stroke-linejoin="round"/><circle cx="17.5" cy="11" r="1" fill="#1a1a3a"/><path d="M14 6c0-2 1-3 2-3.5M14 6c0-2-1-3-2-3.5" fill="none" stroke="#7ac8ff" stroke-width="1.4" stroke-linecap="round"/>`),
  hand: sv(`<path d="M9.5 13V5.2a1.6 1.6 0 0 1 3.2 0V11l4.6.9c1.2.2 2 1.4 1.8 2.6l-.9 5.3c-.2 1-1 1.7-2 1.7h-5.5c-.7 0-1.3-.3-1.7-.9l-3.3-4.7a1.6 1.6 0 0 1 2.4-2.1z" fill="#fff" stroke="#2a3a48" stroke-width="1.6" stroke-linejoin="round"/>`),
  // карточки островов
  c_all: sv(`<path d="M2 14c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1M2 19c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" fill="none" stroke="#2a8ad8" stroke-width="2.2" stroke-linecap="round"/><path d="M12 3v7M8.5 6.5L12 3l3.5 3.5" fill="none" stroke="#f08a2a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`),
  c_bld: sv(`<path d="M4 20V10l8-6 8 6v10z" fill="#ffd7a0" stroke="#a86a3a" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 20v-6h4v6" fill="#8a5a3a"/><path d="M15 3l1 2 2.2.3-1.6 1.5.4 2.2L15 8l-2 1 .4-2.2-1.6-1.5L14 5z" fill="#ffd23a"/>`),
  c_tap: sv(`<path d="M9.5 13V5.2a1.6 1.6 0 0 1 3.2 0V11l4.6.9c1.2.2 2 1.4 1.8 2.6l-.9 5.3c-.2 1-1 1.7-2 1.7h-5.5c-.7 0-1.3-.3-1.7-.9l-3.3-4.7a1.6 1.6 0 0 1 2.4-2.1z" fill="#ffe0c0" stroke="#a86a3a" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 4l2 2M20 4l-2 2M12 1v2" stroke="#f08a2a" stroke-width="2" stroke-linecap="round"/>`),
  c_gull: sv(`<path d="M2 12c3-4 6-4 8-1 2-3 5-3 8 1-3-1.5-5.5-1-8 2.5C8 10.8 5 10.5 2 12z" fill="#fff" stroke="#5a6a7a" stroke-width="1.4" stroke-linejoin="round"/><rect x="8.5" y="15" width="5" height="4.5" rx=".8" fill="#ff5a6a"/><path d="M11 15v4.5" stroke="#ffd23a" stroke-width="1.2"/>`),
  c_speed: sv(`<path d="M3 8h9M2 12h12M3 16h9" stroke="#2a8ad8" stroke-width="2" stroke-linecap="round"/><path d="M13 6l8 6-8 6z" fill="#f08a2a"/>`),
  c_cheap: sv(`<path d="M3 12l9-9h8v8l-9 9z" fill="#ffd23a" stroke="#b8901a" stroke-width="1.5" stroke-linejoin="round"/><circle cx="16" cy="8" r="1.6" fill="#fff"/><path d="M8 12l4 4M10 10l4 4" stroke="#b8901a" stroke-width="1.4"/>`),
  c_night: sv(`<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.5 7 7 0 0 1-5-13.5z" fill="#f2e6a8" stroke="#c8b860" stroke-width="1.3"/><path d="M6 6l.5 1 1 .3-.8.7.2 1-.9-.5-.9.5.2-1-.8-.7 1-.3z" fill="#c8b860"/>`),
  c_chest: sv(`<rect x="3" y="10" width="18" height="10" rx="1.5" fill="#c8843a" stroke="#7a4a1a" stroke-width="1.5"/><path d="M3 10c0-4 3.5-6 9-6s9 2 9 6z" fill="#e8a04a" stroke="#7a4a1a" stroke-width="1.5"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#ffd23a" stroke="#7a4a1a" stroke-width="1.2"/>`),
};
