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

/* Drive 미리보기 주소가 가끔 실패 → 다른 Google 이미지 주소로 1회 재시도 */
function imgRetry(img) {
  const m = img.src.match(/[?&]id=([\w-]+)/);
  if (m && !img.dataset.retry) { img.dataset.retry = 1; img.src = 'https://lh3.googleusercontent.com/d/' + m[1]; }
}
const isMoney = n => /가액|금액|가격|비용/.test(n);
function fmtValue(f, v) {
  if (v === '' || v == null) return '<span class="muted">-</span>';
  if (f.type === 'image') return `<img class="hero" src="${esc(v)}" onerror="imgRetry(this)" alt="">`;
  if (f.type === 'number') return Number(v).toLocaleString() + (isMoney(f.name) ? ' 원' : '');
  return esc(v);
}
const money = v => (v === '' || v == null) ? '' : Number(v).toLocaleString() + ' 원';
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
/* QR을 칸 크기가 정수 픽셀이 되도록 직접 그림 + 사방 4칸 흰 여백(표준 quiet zone) → 휴대폰 인식률 향상 */
function makeQR(el, text, size) {
  const tmp = document.createElement('div');
  const m = new QRCode(tmp, { text, correctLevel: QRCode.CorrectLevel.M })._oQRCode;
  const n = m.getModuleCount(), q = 4, total = n + q * 2;
  const k = Math.max(2, Math.round(size / total));   // 화면상 칸 크기(px, 정수)
  const hi = 4;                                       // PNG/PDF용 고해상도 배율
  const c = document.createElement('canvas');
  c.width = c.height = total * k * hi;
  c.style.width = c.style.height = total * k + 'px';
  c.style.display = 'block';
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#000';
  const s = k * hi;
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++)
    if (m.isDark(r, col)) g.fillRect((col + q) * s, (r + q) * s, s, s);
  el.innerHTML = ''; el.appendChild(c);
  return c;
}
