/* 공통 유틸 */
const CFG = window.APP_CONFIG;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function needSetup() {
  if (CFG.API_URL) return false;
  document.body.insertAdjacentHTML('afterbegin',
    '<div class="msg" style="margin:16px">⚙️ 아직 연결 전입니다. <b>config.js</b>의 <b>API_URL</b>에 Apps Script 웹 앱 URL을 넣어주세요. (README.md 참고)</div>');
  return true;
}

async function apiGet(params = {}) {
  const u = new URL(CFG.API_URL);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u)).json();
  if (!j.ok) throw new Error(j.error);
  return j;
}
async function apiPost(body) {
  const r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error);
  return j;
}

/* 상태 색상: 옵션 순서대로 */
const PALETTE = ['#d97706', '#2563eb', '#7c3aed', '#dc2626', '#6b7280', '#0d9488', '#be185d'];
function statusColor(fields, status) {
  const f = fields.find(x => x.name === CFG.F.status);
  const i = f ? f.options.indexOf(status) : -1;
  return PALETTE[(i < 0 ? PALETTE.length - 1 : i) % PALETTE.length];
}
function badge(fields, status) {
  return status ? `<span class="badge" style="background:${statusColor(fields, status)}">${esc(status)}</span>` : '';
}

const isMoney = n => /가액|금액|가격|비용/.test(n);
function fmtValue(f, v) {
  if (v === '' || v == null) return '<span class="muted">-</span>';
  if (f.type === 'image') return `<img class="hero" src="${esc(v)}" alt="">`;
  if (f.type === 'number') return Number(v).toLocaleString() + (isMoney(f.name) ? ' 원' : '');
  return esc(v);
}
function won(n) {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '억원';
  if (n >= 1e4) return Math.round(n / 1e4).toLocaleString() + '만원';
  return n.toLocaleString() + '원';
}

function itemUrl(id) {
  const base = CFG.BASE_URL || location.href.replace(/[^/]*([?#].*)?$/, '');
  return base.replace(/\/?$/, '/') + 'view.html?id=' + encodeURIComponent(id);
}
function makeQR(el, text, size) {
  el.innerHTML = '';
  return new QRCode(el, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
}
