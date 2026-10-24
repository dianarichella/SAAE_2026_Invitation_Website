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
  time: '18.30 – 22.00 (registration opens 18.00)',
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
              ${row('Time', '18.30 – 22.00', 'Registration opens 18.00')}
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
  sendMail_(d.email, `Your ticket — ${EVENT.name} (${d.code})`, html);
}

/* =========================================================
   KIRIM UNDANGAN DARI GOOGLE SHEETS (lewat Gmail akun ini)
   ---------------------------------------------------------
   1. Buka tab "Invites" (dibuat otomatis), isi kolom Name & Email.
   2. Jalankan sendTestInvitation dulu (dikirim ke email kamu sendiri).
   3. Jalankan sendInvitations. Baris yang sudah terkirim ditandai "Sent",
      jadi aman dijalankan ulang (tidak ada email dobel).
   ========================================================= */
const SITE_URL = 'https://dianarichella.github.io/SAAE_2026_Invitation_Website/';
const INVITE_HEADER_URL = SITE_URL + 'assets/invite-header.jpg';
const INVITE_SHEET = 'Invites';
const INVITE_HEADERS = ['Name', 'Email', 'Status', 'Sent At'];
const INVITE_SUBJECT = 'You’re invited — Student Ambassador Appreciation Night 2026';
const SENDER_NAME = 'SIM Student Ambassador Appreciation Event Team';
// Alamat pengirim (dipakai Power Automate) & alamat balasan (kalau SEND_VIA_OUTLOOK = false).
const SENDER_EMAIL = 'krisan001@mymail.sim.edu.sg';

// ===== Kirim lewat Outlook (Power Automate) =====
// true  = email dititipkan ke Outlook krisan001, lalu Power Automate mengirimnya ke tamu
//         dari krisan001@mymail.sim.edu.sg (flow "SAAE Relay").
// false = email langsung dikirim dari Gmail yang menjalankan script ini.
const SEND_VIA_OUTLOOK = true;
const RELAY_INBOX = 'krisan001@mymail.sim.edu.sg';
const RELAY_KEY = 'SAAE-RELAY-e03ae80f89a5';   // harus sama persis dengan "Subject Filter" di Power Automate

function sendMail_(to, subject, html, plain) {
  if (SEND_VIA_OUTLOOK) {
    const subj = [RELAY_KEY, String(to).trim(), String(subject).replace(/\|/g, '-')].join('|');
    MailApp.sendEmail({
      to: RELAY_INBOX,
      subject: subj,
      body: 'Automatic relay message for Power Automate. Please do not reply or delete manually.',
      name: SENDER_NAME,
      attachments: [Utilities.newBlob(html, 'text/plain', 'email.txt').setDataFromString(html, 'UTF-8')],
    });
  } else {
    MailApp.sendEmail({ to, subject, htmlBody: html, body: plain || '', name: SENDER_NAME, replyTo: SENDER_EMAIL });
  }
}

function checkSender_() {
  const me = Session.getEffectiveUser().getEmail();
  Logger.log(SEND_VIA_OUTLOOK
    ? 'Relaying through ' + RELAY_INBOX + ' (Power Automate sends from ' + SENDER_EMAIL + ')'
    : 'Sending from ' + me + ' (replies go to ' + SENDER_EMAIL + ')');
}

// Menu "SAAE" di Google Sheets (muncul kalau script ini terhubung ke spreadsheet-nya)
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('SAAE')
      .addItem('Send test invitation to me', 'sendTestInvitation')
      .addItem('Send invitations', 'sendInvitations')
      .addToUi();
  } catch (e) { /* script tidak terhubung ke spreadsheet: jalankan dari editor */ }
}

function inviteLink_(name) {
  return SITE_URL + '?name=' + encodeURIComponent(String(name).trim());
}

function sendTestInvitation() {
  checkSender_();
  const sheet = getSheet_(SpreadsheetApp.openById(SPREADSHEET_ID), INVITE_SHEET, INVITE_HEADERS);
  const me = Session.getEffectiveUser().getEmail();
  const firstName = sheet.getLastRow() >= 2 ? String(sheet.getRange(2, 1).getValue() || 'Guest') : 'Guest';
  sendInvite_(me, firstName);
  Logger.log('Test invitation sent to ' + me + ' (as "' + firstName + '")');
}

function sendInvitations() {
  checkSender_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(SpreadsheetApp.openById(SPREADSHEET_ID), INVITE_SHEET, INVITE_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) { Logger.log('No guests in the "Invites" tab yet.'); return; }
    const rows = sheet.getRange(2, 1, last - 1, 4).getValues();
    let sent = 0, skipped = 0;
    for (let i = 0; i < rows.length; i++) {
      const [name, email, status] = rows[i];
      if (status === 'Sent' || !email) continue;
      if (!/^\S+@\S+\.\S+$/.test(String(email).trim())) {
        sheet.getRange(i + 2, 3).setValue('Invalid email'); skipped++; continue;
      }
      if (MailApp.getRemainingDailyQuota() < 1) {
        Logger.log('Daily email limit reached. Run sendInvitations again tomorrow to continue.');
        break;
      }
      try {
        sendInvite_(String(email).trim(), String(name || 'Guest').trim());
        sheet.getRange(i + 2, 3, 1, 2).setValues([['Sent', new Date()]]);
        sent++;
      } catch (err) {
        sheet.getRange(i + 2, 3).setValue('Error: ' + String(err).slice(0, 80));
      }
    }
    Logger.log(`Sent ${sent} invitation(s). Skipped ${skipped}. Remaining quota today: ${MailApp.getRemainingDailyQuota()}`);
  } finally {
    lock.releaseLock();
  }
}

function sendInvite_(email, name) {
  const link = inviteLink_(name);
  const plain =
    `Dear ${name},\n\n` +
    `You're invited to attend Student Ambassador Appreciation Night.\n\n` +
    `Date: ${EVENT.date}\nTime: 18.30 – 22.00 (registration opens 18.00)\nVenue: ${EVENT.venue}\n\n` +
    `Please RSVP here: ${link}\n\n` +
    `For more inquiries, please contact us on Telegram:\nMin Hal Jin – @minhaljin\nDiana Richella Krisan – @dianark8\n\n` +
    `${SENDER_NAME}`;
  sendMail_(email, INVITE_SUBJECT, inviteHtml_(name, link), plain);
}

// Desain undangan. Warna latar memakai bgcolor + gradient supaya
// mode gelap di aplikasi Gmail tidak mudah mengubah warnanya.
function inviteHtml_(name, link) {
  const red = '#5c140f', dark = '#4a100c', cream = '#fff7ee';
  const bg = c => `bgcolor="${c}" style="background-color:${c};background-image:linear-gradient(${c},${c})`;
  const font = 'Arial,Helvetica,sans-serif';
  return `
  <div style="background:#f2f2f2;padding:20px 8px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;border-radius:10px;overflow:hidden">
    <tr><td ${bg(dark)};padding:20px 0;text-align:center;font-family:${font};font-size:20px;letter-spacing:.5px;color:${cream}">SAAE INVITATION</td></tr>
    <tr><td ${bg(dark)}"><a href="${link}"><img src="${INVITE_HEADER_URL}" width="600" alt="Scarlet Gala — Student Ambassador Appreciation Night 2026" style="display:block;width:100%;height:auto;border:0"></a></td></tr>
    <tr><td ${bg(red)};padding:34px 44px 8px;font-family:${font};color:${cream};text-align:left">
      <p style="margin:0 0 14px;font-size:16px;color:${cream}">Dear ${esc_(name)},</p>
      <p style="margin:0 0 24px;font-size:20px;line-height:1.4;color:${cream}">You're invited to attend Student Ambassador Appreciation Night</p>
      <p style="margin:0 0 6px;font-size:15px;font-weight:bold;color:${cream}">Event details:</p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${cream}">Date: ${esc_(EVENT.date)}<br>Time: 18.30 – 22.00 (registration opens 18.00)<br>Venue: Metropolitan YMCA, 60 Stevens Rd, Singapore 257854</p>
    </td></tr>
    <tr><td ${bg(red)};padding:24px 44px 34px;text-align:left">
      <a href="${link}" style="display:inline-block;background:#efe6b8;color:#7a1a12;font-family:${font};font-size:13px;font-weight:bold;letter-spacing:.5px;text-decoration:none;padding:11px 26px;border-radius:3px">RSVP HERE</a>
    </td></tr>
    <tr><td ${bg(red)};padding:0 24px"><div style="border-top:1px solid #e8cfc0;font-size:0;line-height:0">&nbsp;</div></td></tr>
    <tr><td ${bg(red)};padding:30px 44px 30px;font-family:${font};font-size:14px;line-height:1.6;color:${cream}">
      For more inquiries, please contact us on Telegram:<br>Min Hal Jin – <a href="https://t.me/minhaljin" style="color:${cream}">@minhaljin</a><br>Diana Richella Krisan – <a href="https://t.me/dianark8" style="color:${cream}">@dianark8</a>
    </td></tr>
    <tr><td ${bg(dark)};padding:22px 0;text-align:center;font-family:${font};font-size:12px;font-weight:bold;line-height:1.8;color:${cream}">
      ${SENDER_NAME}<br>Singapore | October 2026
    </td></tr>
  </table>
  </div>`;
}
