# Student Ambassador Appreciation Night — Invitation Website

> 🚧 **Work in progress** — the design and core features are done, but event details
> and some content are still placeholders.

An interactive digital invitation for the **Student Ambassador Appreciation Event (SAAE)**.
Guests open a wax-sealed envelope, read the invitation, and RSVP — all in the browser.

**Theme:** Scarlet Gala

## Features

- **Envelope opening animation** — tap the wax seal to open the envelope and pull out the invitation
- **Event details** — theme, date, time and venue on an invitation card
- **RSVP flow** — guests can accept (RSVP form → event ticket) or decline (with an optional reason)
- **Event ticket** — generated after RSVP, showing the guest's name and ticket code
- **Personalised greeting** — add `?name=` to the link, e.g. `index.html?name=Diana` shows "Dear Diana,"
- **Responsive** — works on phones, tablets and laptops

## Built with

- HTML, CSS and vanilla JavaScript (no frameworks)
- Fonts: Confirm Serif and Waza (headings), with Cormorant Garamond from Google Fonts as fallback
- Designed in Figma

## Project structure

```
├── index.html      # page content
├── css/style.css   # layout and animations
├── css/scarlet.css # Scarlet Gala theme: colours and fonts
├── js/script.js    # envelope animation, navigation, RSVP logic
└── assets/         # images and web fonts
```

## Running locally

Open `index.html` in a browser, or use the **Live Server** extension in VS Code.

## Needs to be updated

- [ ] **Event details** — date, time and venue (search for `GANTI` in `index.html`)
- [ ] **What is SAAE?** — event description
- [ ] **Dresscode** — dress code guidelines for the Scarlet Gala theme
- [ ] **Contact Us** — committee contact details
- [ ] **Event ticket** — date and venue shown on the ticket
- [ ] **Additional notes** — optional "Note" row on the invitation card (already prepared in `index.html`)
- [ ] **RSVP storage** — deploy `google-apps-script/Code.gs` and paste its URL into `sheetEndpoint`
      in `js/script.js` (see below)
- [ ] **Ticket email details** — update the `EVENT` date, time and venue in `google-apps-script/Code.gs`
- [ ] **Guest list** — create a personal link (`?name=...`) for each guest

## Connecting RSVP to Google Sheets

RSVPs and declines are saved to a Google Sheet through Google Apps Script, and each guest who RSVPs
receives their ticket by email.

1. Open the spreadsheet → **Extensions → Apps Script**.
2. Replace the editor contents with `google-apps-script/Code.gs` and click **Save**.
3. **Deploy → New deployment → Web app**, set *Execute as* **Me** and *Who has access* **Anyone**, then **Deploy**
   and authorise the permissions.
4. Copy the Web app URL (ends with `/exec`) into `sheetEndpoint` in `js/script.js`.

The script creates two tabs automatically: **RSVP** and **Declined**. If the same email RSVPs again,
its row is updated instead of duplicated. After editing `Code.gs`, use **Deploy → Manage deployments → Edit →
New version** so the same URL keeps working.

## Credits

Design by Diana Richella Krisan.
Built with the help of [Claude](https://claude.ai) by Anthropic.
