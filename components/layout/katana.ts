/*
 * The katana for the intro loader, as SVG markup. The sword points right (tip
 * at +x) in a 1200x80 box, centred on y=40, with the grip centre at x=175.
 * Ported from the Claude Design export (katana.js), without the trail variant.
 * `id` prefixes the gradient ids so several copies can share a page.
 */
function grip(id: string) {
  let s = '<rect x="48" y="30" width="252" height="20" rx="4" fill="#c4141f"/>';
  for (let i = 0; i < 9; i++) {
    const x = 52 + i * 27.5;
    s += `<path d="M${x},30 L${x + 27.5},50 M${x},50 L${x + 27.5},30" stroke="#0b0b0b" stroke-width="8.5" stroke-linecap="square"/>`;
  }
  s += '<rect x="48" y="29" width="252" height="3.2" fill="#0e0e0e"/>';
  s += '<rect x="48" y="47.8" width="252" height="3.2" fill="#0e0e0e"/>';
  s += `<rect x="34" y="28" width="18" height="24" rx="5" fill="url(#${id}cu)"/>`;
  s += `<rect x="296" y="28.5" width="8" height="23" rx="1.5" fill="url(#${id}cu)"/>`;
  return s;
}

function guard(id: string) {
  return (
    `<rect x="303" y="27" width="3" height="26" fill="url(#${id}cu)"/>` +
    `<ellipse cx="312" cy="40" rx="7.5" ry="31" fill="#120d0b" stroke="url(#${id}cu)" stroke-width="2.4"/>` +
    '<ellipse cx="312" cy="40" rx="4.4" ry="25.5" fill="none" stroke="#3a2418" stroke-width="1"/>' +
    `<rect x="318" y="27" width="3" height="26" fill="url(#${id}cu)"/>` +
    `<rect x="321" y="31" width="16" height="18.5" rx="2" fill="url(#${id}cu)"/>`
  );
}

function blade(id: string) {
  return (
    `<path d="M336,33 C620,33 900,30 1196,23.5 Q1180,34 1140,36.5 C900,44.5 620,48 336,48 Z" fill="url(#${id}st)" stroke="#1b1c1e" stroke-width="0.6"/>` +
    '<path d="M340,44.6 C620,44.6 900,41.2 1132,34.4" fill="none" stroke="#f4f6f8" stroke-width="0.8" stroke-dasharray="14 6" opacity="0.55"/>' +
    '<path d="M340,38.6 C620,38.6 900,35.6 1150,28.6" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>' +
    `<path d="M520,38.2 C680,38 820,37 960,35.2" fill="none" stroke="url(#${id}hl)" stroke-width="2.6" stroke-linecap="round"/>` +
    '<path d="M340,33.7 C620,33.7 900,30.7 1120,25.6" fill="none" stroke="#b3121b" stroke-width="0.9"/>'
  );
}

function defs(id: string) {
  return (
    "<defs>" +
    `<linearGradient id="${id}st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f6368"/><stop offset="0.3" stop-color="#d9dde1"/><stop offset="0.42" stop-color="#ffffff"/><stop offset="0.6" stop-color="#a7adb3"/><stop offset="0.85" stop-color="#e4e7ea"/><stop offset="1" stop-color="#3a3d41"/></linearGradient>` +
    `<linearGradient id="${id}cu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3cfae"/><stop offset="0.35" stop-color="#c58660"/><stop offset="0.7" stop-color="#7a4029"/><stop offset="1" stop-color="#3a1b10"/></linearGradient>` +
    `<linearGradient id="${id}hl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    "</defs>"
  );
}

export function katanaMarkup(id: string) {
  return defs(id) + grip(id) + guard(id) + blade(id);
}
