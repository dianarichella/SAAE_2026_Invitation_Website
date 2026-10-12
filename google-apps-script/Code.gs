/**
 * SAAE RSVP → Google Sheets
 * ---------------------------------------------------------
 * Menerima data dari website undangan dan menyimpannya ke
 * spreadsheet. Juga mengirim email tiket ke tamu yang RSVP.
 *
 * Cara pasang: lihat README (bagian "Connecting RSVP to Google Sheets").
 */

// ID spreadsheet (bagian di antara /d/ dan /edit di link Google Sheets)
const SPREADSHEET_ID = '1v-yAqZyYd8eV7cX_k6uVsCLS3ePJhENgph6xgCDAfXs';

// Kirim email tiket setelah RSVP? Ganti ke false kalau tidak mau.
const SEND_TICKET_EMAIL = true;

// Detail acara di email tiket — samakan dengan isi website
const EVENT = {
  name: 'Student Ambassador Appreciation Night',
  theme: 'Scarlet Gala',
  date: 'Saturday, 00 Month 2026',
  time: '00.00 – 00.00',
  venue: 'Venue name, Venue address',
};

const RSVP_SHEET = 'RSVP';
const RSVP_HEADERS = [
  'Submitted At', 'Ticket Code', 'Full Name', 'Email', 'Telegram', 'Phone',
  'Faculty / Programme', 'Full Event?', 'Attending Part', 'Dietary Requirements', 'Additional Notes',
];

const DECLINE_SHEET = 'Declined';
const DECLINE_HEADERS = ['Submitted At', 'Name (from link)', 'Reason'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (data.type === 'decline') {
      const sheet = getSheet_(ss, DECLINE_SHEET, DECLINE_HEADERS);
      sheet.appendRow([new Date(), clean_(data.name), clean_(data.reason)]);
      return json_({ ok: true });
    }

    // RSVP
    const sheet = getSheet_(ss, RSVP_SHEET, RSVP_HEADERS);
    const row = [
      new Date(), clean_(data.code), clean_(data.name), clean_(data.email), clean_(data.telegram),
      clean_(data.phone), clean_(data.programme), clean_(data.attend), clean_(data.attendNote),
      clean_(data.dietary), clean_(data.message),
    ];

    // Kalau email yang sama sudah pernah RSVP, perbarui barisnya (tidak dobel)
    const existing = findRowByEmail_(sheet, data.email);
    if (existing) sheet.getRange(existing, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);

    if (SEND_TICKET_EMAIL && data.email) sendTicket_(data);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Untuk cek di browser bahwa web app sudah aktif
function doGet() {
  return json_({ ok: true, message: 'SAAE RSVP endpoint is running.' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowByEmail_(sheet, email) {
  if (!email || sheet.getLastRow() < 2) return null;
  const col = RSVP_HEADERS.indexOf('Email') + 1;
  const values = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues();
  const target = String(email).trim().toLowerCase();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === target) return i + 2;
  }
  return null;
}

// Cegah isian yang diawali =, +, -, @ dibaca sebagai rumus di Sheets
function clean_(v) {
  const s = v == null ? '' : String(v).slice(0, 1000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function esc_(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function sendTicket_(d) {
  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:auto;background:#4a0814;color:#f3e6d8;padding:32px;border:1px solid #c9a14a">
      <p style="letter-spacing:3px;color:#c9a14a;font-size:12px;margin:0">ADMIT ONE</p>
      <h1 style="font-weight:normal;color:#f3e6d8;margin:8px 0 4px">${esc_(EVENT.name)}</h1>
      <p style="margin:0 0 20px;color:#c9a14a">Theme: ${esc_(EVENT.theme)}</p>
      <p style="margin:0">Dear ${esc_(d.name)},</p>
      <p>Thank you for your RSVP. Please show this ticket before entering the venue.</p>
      <table style="color:#f3e6d8;font-size:15px">
        <tr><td style="color:#c9a14a;padding-right:16px">Ticket</td><td><b>${esc_(d.code)}</b></td></tr>
        <tr><td style="color:#c9a14a">Date</td><td>${esc_(EVENT.date)}</td></tr>
        <tr><td style="color:#c9a14a">Time</td><td>${esc_(EVENT.time)}</td></tr>
        <tr><td style="color:#c9a14a">Venue</td><td>${esc_(EVENT.venue)}</td></tr>
      </table>
      <p style="margin-top:24px">See you there!</p>
    </div>`;
  MailApp.sendEmail({
    to: d.email,
    subject: `Your ticket — ${EVENT.name} (${d.code})`,
    htmlBody: html,
    name: 'SAAE Committee',
  });
}
