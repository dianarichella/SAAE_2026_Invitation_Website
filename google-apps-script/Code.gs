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
  date: 'Friday, 13 November 2026',
  time: '18.30 – 22.15 (registration opens 18.00)',
  venue: 'Metropolitan YMCA, 60 Stevens Rd, Singapore 257854',
};

const RSVP_SHEET = 'RSVP';
const RSVP_HEADERS = [
  'Submitted At', 'Ticket Code', 'Full Name', 'Email', 'Telegram', 'Phone',
  'University Partner', 'Full Event?', 'Attending Part', 'Dietary Requirements', 'Additional Notes',
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
    // Kalau email yang sama sudah pernah RSVP, perbarui barisnya (tidak dobel) dan pakai nomor tiket lamanya
    const existing = findRowByEmail_(sheet, data.email);
    const codeCol = RSVP_HEADERS.indexOf('Ticket Code') + 1;
    const oldCode = existing ? String(sheet.getRange(existing, codeCol).getValue()) : '';
    data.code = /^SAAE-\d{3}$/.test(oldCode) ? oldCode : nextCode_(sheet, codeCol);
    const row = [
      new Date(), clean_(data.code), clean_(data.name), clean_(data.email), clean_(data.telegram),
      clean_(data.phone), clean_(data.programme), clean_(data.attend), clean_(data.attendNote),
      clean_(data.dietary), clean_(data.message),
    ];

    if (existing) sheet.getRange(existing, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);

    if (SEND_TICKET_EMAIL && data.email) sendTicket_(data);
    return json_({ ok: true, code: data.code });
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

// Nomor tiket berikutnya sesuai urutan RSVP: SAAE-001, SAAE-002, ...
// (memakai nomor terbesar yang sudah ada + 1, jadi tetap aman kalau ada baris yang dihapus)
function nextCode_(sheet, codeCol) {
  let max = 0;
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, codeCol, sheet.getLastRow() - 1, 1).getValues().forEach(([v]) => {
      const m = /^SAAE-(\d{3})$/.exec(String(v));
      if (m) max = Math.max(max, Number(m[1]));
    });
  }
  return 'SAAE-' + String(max + 1).padStart(3, '0');
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

// Gambar kepala tiket (logo + Scarlet Gala + Appreciation Night) diambil dari website.
// Pastikan file assets/email-header.jpg sudah di-push ke GitHub.
const EMAIL_HEADER_URL = 'https://dianarichella.github.io/SAAE_2026_Invitation_Website/assets/email-header.jpg';

function sendTicket_(d) {
  const gold = '#d6b469', cream = '#f6e4d6', bg = '#720613';
  const font = "Georgia,'Times New Roman',serif";
  const row = (label, value, note) => `
        <tr><td style="padding:0 0 18px">
          <div style="font-family:${font};font-style:italic;font-size:14px;color:${gold};margin-bottom:2px">${label}</div>
          <div style="font-family:${font};font-style:italic;font-size:19px;color:${cream};line-height:1.3">${value}</div>
          ${note ? `<div style="font-family:${font};font-style:italic;font-size:13px;color:#e6cdb8;margin-top:2px">${note}</div>` : ''}
        </td></tr>`;
  const [venueName, ...venueRest] = EVENT.venue.split(', ');
  const html = `
  <div style="background:#1a0306;padding:24px 10px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:${bg};border:1px solid ${gold};border-radius:16px;border-collapse:separate">
      <tr><td style="padding:6px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(214,180,105,.55);border-radius:11px;border-collapse:separate">
          <tr><td><img src="${EMAIL_HEADER_URL}" width="506" alt="Student Ambassador — Scarlet Gala — Appreciation Night" style="display:block;width:100%;height:auto;border:0;border-radius:10px 10px 0 0;color:${cream};font-family:${font};font-size:22px;text-align:center"></td></tr>
          <tr><td style="padding:20px 44px 8px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row('Guest', `<span style="font-size:24px">${esc_(d.name)}</span>`)}
              ${row('Date', esc_(EVENT.date))}
              ${row('Time', '18.30 – 22.15', 'Registration opens 18.00')}
              ${row('Venue', esc_(venueName), esc_(venueRest.join(', ')))}
              ${row('Ticket No.', esc_(String(d.code).replace(/^SAAE-/, '')))}
            </table>
          </td></tr>
          <tr><td style="padding:4px 44px 30px">
            <div style="height:1px;background:${gold};opacity:.6;margin-bottom:18px"></div>
            <p style="margin:0;font-family:${font};font-style:italic;font-size:15px;line-height:1.5;color:${cream};text-align:center">
              Dear ${esc_(d.name)},<br><br>Thank you for your RSVP.<br>Please show this ticket at registration.<br>See you there!
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
  MailApp.sendEmail({
    to: d.email,
    subject: `Your ticket — ${EVENT.name} (${d.code})`,
    htmlBody: html,
    name: 'SAAE Committee',
  });
}
