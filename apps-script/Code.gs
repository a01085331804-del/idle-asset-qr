/**
 * 유휴 설비 관리 - Google Apps Script (스프레드시트 DB 백엔드)
 *
 * 설치: 스프레드시트 > 확장 프로그램 > Apps Script > 이 코드 전체 붙여넣기 > 배포(웹 앱)
 * 시트(설비 / 필드설정)와 사진 폴더는 최초 호출 시 자동 생성됩니다.
 */

// ★ 관리자 비밀번호 (등록/수정/삭제 시 필요). 꼭 바꿔주세요.
const ADMIN_PASSWORD = '1234';

const DATA_SHEET = '설비';
const FIELD_SHEET = '필드설정';
const PHOTO_FOLDER = '유휴설비_사진';

// 필드설정 시트 기본값: [필드명, 타입, 옵션(select일 때 쉼표 구분)]
// 타입: text | textarea | number | date | select | image
const DEFAULT_FIELDS = [
  ['설비명', 'text', ''],
  ['설비상태', 'select', '유휴,재가동 검토,매각 예정,폐기 예정,매각 완료'],
  ['자산번호', 'text', ''],
  ['사이즈', 'text', ''],
  ['취득일', 'date', ''],
  ['취득가액', 'number', ''],
  ['잔존가액', 'number', ''],
  ['설비사진', 'image', ''],
  ['유휴사유', 'textarea', ''],
  ['위치', 'text', ''],
  ['비고', 'textarea', '']
];

/* ---------- 엔드포인트 ---------- */

function doGet(e) {
  try {
    const p = e.parameter || {};
    const fields = getFields_();
    if (p.action === 'get') {
      const item = readItems_(fields).filter(i => i.ID === p.id)[0];
      if (!item) return json_({ ok: false, error: '설비를 찾을 수 없습니다.' });
      return json_({ ok: true, fields: fields, item: item });
    }
    return json_({ ok: true, fields: fields, items: readItems_(fields) });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const b = JSON.parse(e.postData.contents);
    if (b.password !== ADMIN_PASSWORD) return json_({ ok: false, error: '비밀번호가 올바르지 않습니다.' });
    const fields = getFields_();

    if (b.action === 'auth') return json_({ ok: true });
    if (b.action === 'upload') return json_({ ok: true, url: saveImage_(b) });
    if (b.action === 'save') return json_({ ok: true, item: saveItem_(fields, b.item) });
    if (b.action === 'delete') { deleteItem_(b.id); return json_({ ok: true }); }
    return json_({ ok: false, error: '알 수 없는 요청' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- 시트 처리 ---------- */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getFields_() {
  let sh = ss_().getSheetByName(FIELD_SHEET);
  if (!sh) {
    sh = ss_().insertSheet(FIELD_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([['필드명', '타입', '옵션']]).setFontWeight('bold').setBackground('#e8eaed');
    sh.getRange(2, 1, DEFAULT_FIELDS.length, 3).setValues(DEFAULT_FIELDS);
    sh.getRange(1, 5).setValue('※ 행을 추가/수정하면 등록 폼·상세·관제 화면에 자동 반영됩니다. 타입: text, textarea, number, date, select(옵션은 쉼표 구분), image');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 140); sh.setColumnWidth(3, 360);
  }
  const rows = sh.getDataRange().getValues().slice(1).filter(r => String(r[0]).trim());
  const fields = rows.map(r => ({
    name: String(r[0]).trim(),
    type: String(r[1] || 'text').trim(),
    options: String(r[2] || '').split(',').map(s => s.trim()).filter(Boolean)
  }));
  syncHeaders_(fields);
  return fields;
}

// 데이터 시트 헤더를 필드설정과 동기화 (없는 컬럼만 추가, 기존 데이터는 보존)
function syncHeaders_(fields) {
  let sh = ss_().getSheetByName(DATA_SHEET);
  const want = ['ID'].concat(fields.map(f => f.name), ['등록일시', '수정일시']);
  if (!sh) {
    sh = ss_().insertSheet(DATA_SHEET);
    sh.getRange(1, 1, 1, want.length).setValues([want]).setFontWeight('bold').setBackground('#e8eaed');
    sh.setFrozenRows(1);
    return sh;
  }
  const have = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  const missing = want.filter(h => have.indexOf(h) < 0);
  if (missing.length) {
    sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#e8eaed');
  }
  return sh;
}

function readItems_(fields) {
  const sh = ss_().getSheetByName(DATA_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  const tz = Session.getScriptTimeZone();
  const data = sh.getDataRange().getValues();
  const head = data[0].map(String);
  return data.slice(1).filter(r => r[0] !== '').map(r => {
    const o = {};
    head.forEach((h, i) => {
      let v = r[i];
      if (v instanceof Date) {
        v = Utilities.formatDate(v, tz, h.indexOf('일시') >= 0 ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
      }
      o[h] = v;
    });
    return o;
  });
}

function saveItem_(fields, item) {
  const sh = ss_().getSheetByName(DATA_SHEET);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const idCol = head.indexOf('ID');
  let rowIdx = -1;

  if (item.ID) {
    const ids = sh.getRange(2, idCol + 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().map(r => String(r[0]));
    const k = ids.indexOf(String(item.ID));
    if (k >= 0) rowIdx = k + 2;
  }
  const isNew = rowIdx < 0;
  if (isNew) item.ID = 'E' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();

  const old = isNew ? [] : sh.getRange(rowIdx, 1, 1, head.length).getValues()[0];
  const row = head.map((h, i) => {
    if (h === 'ID') return item.ID;
    if (h === '등록일시') return isNew ? now : old[i];
    if (h === '수정일시') return now;
    return item[h] !== undefined ? item[h] : (old[i] !== undefined ? old[i] : '');
  });
  if (isNew) { rowIdx = sh.getLastRow() + 1; }
  sh.getRange(rowIdx, 1, 1, head.length).setValues([row]);
  return readItems_(fields).filter(i => i.ID === item.ID)[0];
}

function deleteItem_(id) {
  const sh = ss_().getSheetByName(DATA_SHEET);
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => String(r[0]));
  const k = ids.indexOf(String(id));
  if (k > 0) sh.deleteRow(k + 1);
}

/* ---------- 사진 저장 (Drive) ---------- */

function saveImage_(b) {
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
  const blob = Utilities.newBlob(Utilities.base64Decode(b.data), b.mime || 'image/jpeg', (b.name || 'photo') + '_' + Date.now() + '.jpg');
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** 최초 1회 수동 실행하면 Drive 권한 승인 + 시트 자동 생성이 한 번에 끝납니다. */
function setup() {
  getFields_();
  DriveApp.getRootFolder();
}
