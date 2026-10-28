# Student Ambassador Appreciation Event — Invitation Website

An interactive digital invitation for the **Student Ambassador Appreciation Event (SAAE) 2026**.
Guests open a wax-sealed envelope, read the invitation, and RSVP — all in the browser.

**Theme:** Scarlet Gala
**When:** Friday, 13 November 2026 · 18.30 – 22.00 (registration opens 18.00)
**Where:** Metropolitan YMCA – Vine Ballroom, 60 Stevens Rd, Singapore 257854

## Features

- **Envelope opening** — tap the wax seal to open the envelope and pull out the invitation
- **Event details** — theme, date, time and venue on an invitation card
- **What is SAAE?, Dresscode, Contact** — event description with photos from SAAE 2025,
  colour palette and dress guide, and committee Telegram contacts
- **RSVP form** — only SIM emails (`…@mymail.sim.edu.sg`) are accepted, so tickets don't land in spam.
  Guests who will arrive late or leave early must give a rough time.
- **Event ticket** — shown on the site after RSVP and emailed to the guest, numbered in RSVP order
  (001, 002, …)
- **Decline & cancel**
  - Guests who haven't answered see **Yes / No**.
  - After RSVP, the card shows **View your ticket** and a small **Cancel your RSVP** link.
  - After declining or cancelling, only **Yes** is shown, so guests can still change their mind.
- **Personalised link** — add `?name=` to the link, e.g. `?name=Diana` shows "Dear Diana,"
- **Responsive** — works on phones, tablets and laptops

## Built with

- HTML, CSS and vanilla JavaScript (no frameworks)
- Fonts: Confirm Serif and Waza (headings), with Cormorant Garamond from Google Fonts as fallback
- Google Sheets + Google Apps Script (RSVP storage, ticket and invitation emails)
- Microsoft Power Automate (sends the emails from the SIM Outlook account)
- Designed in Figma

## Project structure

```
├── index.html                  # page content
├── css/style.css               # layout and animations
├── css/scarlet.css             # Scarlet Gala theme: colours and fonts
├── js/script.js                # envelope animation, navigation, RSVP / cancel logic
├── google-apps-script/Code.gs  # Google Sheets backend + ticket & invitation emails
└── assets/                     # images, email headers and web fonts
```

## Running locally

Open `index.html` in a browser, or use the **Live Server** extension in VS Code.

## How RSVPs and emails work

```
Website ──► Apps Script (Gmail account) ──► Google Sheet (RSVP / Declined / Invites)
                    │
                    └─► relay email to krisan001@mymail.sim.edu.sg
                                  │
                                  └─► Power Automate "SAAE Relay" sends it to the guest
                                      from krisan001@mymail.sim.edu.sg, then deletes the relay
```

Emails go out through the SIM Outlook account because emails sent from Gmail to SIM addresses
tend to land in Junk.

### Google Sheet tabs (created automatically)

| Tab | What it holds |
|---|---|
| **RSVP** | One row per guest (matched by email). If a guest RSVPs again, their row is updated and they keep the same ticket number. Cancelled RSVPs are **greyed out and struck through, never deleted**. They return to normal if the guest RSVPs again. |
| **Declined** | Guests who clicked **No**, and cancelled RSVPs (e.g. `Cancelled RSVP (SAAE-001): reason`) |
| **Invites** | Guest list for sending invitations: Name, Email, Status, Sent At |

> Don't delete rows in the **RSVP** tab — ticket numbers could be reused. Delete only test rows, before launch.

### Setup

1. **Apps Script** (from the Gmail account that owns the sheet):
   1. Open the spreadsheet → **Extensions → Apps Script**.
   2. Paste `google-apps-script/Code.gs` and save.
   3. **Deploy → New deployment → Web app**, with *Execute as* **Me** and *Who has access* **Anyone**.
   4. Copy the `/exec` URL into `sheetEndpoint` in `js/script.js`.
2. **Power Automate** (signed in as `krisan001@mymail.sim.edu.sg`): flow **SAAE Relay**
   - **Trigger:** *When a new email arrives (V3)*
     - Folder: Inbox
     - Include Attachments: Yes
     - Subject Filter: the `RELAY_KEY` in `Code.gs`
   - **Send an email (V2):**
     - To: `split(triggerOutputs()?['body/subject'], '|')[1]`
     - Subject: `split(triggerOutputs()?['body/subject'], '|')[2]`
     - Body: `base64ToString(triggerOutputs()?['body/attachments'][0]['contentBytes'])`
   - **Delete email (V2):** the trigger's Message Id
3. **Outlook (krisan001):** add the Gmail address to **Settings → Mail → Junk email → Safe senders**,
   so relay emails reach the Inbox.

To send directly from Gmail instead, set `SEND_VIA_OUTLOOK = false` in `Code.gs`.

### After editing `Code.gs`

Paste the new code, then **Deploy → Manage deployments → Edit → Version: New version → Deploy**.
The `/exec` URL stays the same. Don't use *New deployment*, which creates a new URL.

### Sending invitations

1. Fill in **Name** and **Email** in the **Invites** tab.
2. In Apps Script, run **`sendTestInvitation`**. It sends one invitation to yourself.
3. Run **`sendInvitations`**. Sent rows are marked **Sent**, so it's safe to run again.
   It stops at the daily email limit, so run it again the next day to continue.

## Notes

- RSVP status (registered / declined) is saved in the guest's browser, so the cancel link only
  appears on the device they used to RSVP.
- Email colours are locked for dark mode in Outlook on the web and the new Outlook.
  Classic Outlook for Windows and the Outlook mobile app may still adjust them.

## Credits

Design by Diana Richella Krisan.
Built with the help of [Claude](https://claude.ai) by Anthropic.
