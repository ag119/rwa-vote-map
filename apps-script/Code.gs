/**
 * RWA Vote Map — Google Sheets backend.
 *
 * Tabs (created by setup()):
 *   Residents   flat | name
 *   Marks       flat | status | note | assignee | by | at
 *   Candidates  id | post | name | flat | side | chk | by | at
 *   Settings    key | value        (passcode lives here)
 *
 * Deploy: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * Every request must carry the passcode from the Settings tab.
 */

const TABS = {
  Residents: ['flat', 'name'],
  Marks: ['flat', 'status', 'note', 'assignee', 'by', 'at'],
  Candidates: ['id', 'post', 'name', 'flat', 'side', 'chk', 'by', 'at'],
  Settings: ['key', 'value'],
};
const STATUSES = ['g', 'y', 'r', 'n'];
const SIDES = ['ours', 'other', 'ind'];

// Run once from the editor: creates the tabs and a default passcode.
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(TABS).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, TABS[name].length).setValues([TABS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  if (!getSetting_('passcode')) setSetting_('passcode', 'change-me');
}

function doGet() {
  return json_({ ok: true, service: 'RWA Vote Map' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  const pass = String(getSetting_('passcode') || '');
  if (!pass || String(req.pass || '') !== pass) {
    Utilities.sleep(800); // slow down guessing
    return json_({ ok: false, error: 'bad_passcode' });
  }
  if (req.action === 'load') return json_(snapshot_());

  const by = clean_(req.by, 60);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (req.action) {
      case 'setMark': {
        const p = req.patch || {};
        const patch = {};
        if ('status' in p) patch.status = STATUSES.indexOf(p.status) >= 0 ? p.status : 'n';
        if ('note' in p) patch.note = clean_(p.note, 1000);
        if ('assignee' in p) patch.assignee = clean_(p.assignee, 60);
        patch.by = by;
        patch.at = Date.now();
        upsert_('Marks', 'flat', clean_(req.flat, 20), patch);
        break;
      }
      case 'setResident':
        upsert_('Residents', 'flat', clean_(req.flat, 20), { name: clean_(req.name, 80) });
        break;
      case 'setCand': {
        const d = req.data || {};
        upsert_('Candidates', 'id', clean_(req.id, 40), {
          post: clean_(d.post, 60), name: clean_(d.name, 80), flat: clean_(d.flat, 20),
          side: SIDES.indexOf(d.side) >= 0 ? d.side : 'ind', chk: clean_(d.chk, 300),
          by: by, at: Date.now(),
        });
        break;
      }
      case 'delCand':
        deleteRow_('Candidates', 'id', clean_(req.id, 40));
        break;
      default:
        return json_({ ok: false, error: 'unknown_action' });
    }
  } finally {
    lock.releaseLock();
  }
  return json_(snapshot_());
}

// ---------- helpers ----------
function snapshot_() {
  return { ok: true, residents: rows_('Residents'), marks: rows_('Marks'), cands: rows_('Candidates'), now: Date.now() };
}
function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Missing tab "' + name + '". Run setup() first.');
  return sh;
}
function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  const head = values.shift() || [];
  return values.filter(r => String(r[0]) !== '').map(r => {
    const o = {};
    head.forEach((h, i) => o[h] = r[i] instanceof Date ? r[i].getTime() : r[i]);
    return o;
  });
}
function upsert_(name, key, id, patch) {
  if (!id) throw new Error('Missing ' + key);
  const sh = sheet_(name);
  const head = TABS[name];
  const values = sh.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = 1; i < values.length; i++) if (String(values[i][0]) === id) { rowIdx = i; break; }
  const current = rowIdx > 0 ? values[rowIdx] : head.map(() => '');
  const next = head.map((h, i) => h === key ? id : (h in patch ? safe_(patch[h]) : current[i]));
  if (rowIdx > 0) sh.getRange(rowIdx + 1, 1, 1, head.length).setValues([next]);
  else sh.appendRow(next);
}
function deleteRow_(name, key, id) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) if (String(values[i][0]) === id) sh.deleteRow(i + 1);
}
function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max);
}
// Stop text like "=IMPORTXML(...)" from being treated as a formula.
function safe_(v) {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}
function getSetting_(key) {
  const sh = SpreadsheetApp.getActive().getSheetByName('Settings');
  if (!sh) return '';
  const row = sh.getDataRange().getValues().find(r => r[0] === key);
  return row ? row[1] : '';
}
function setSetting_(key, value) {
  upsert_('Settings', 'key', key, { value: value });
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
