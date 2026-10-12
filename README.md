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
- [ ] **RSVP storage** — connect `rsvpEndpoint` in `js/script.js` to a backend (e.g. Google Sheets via
      Google Apps Script). For now, responses are only saved in the guest's own browser.
- [ ] **Ticket email** — send the ticket to the guest's email after they submit the RSVP
- [ ] **Guest list** — create a personal link (`?name=...`) for each guest

## Credits

Design by Diana Richella Krisan.
Built with the help of [Claude](https://claude.ai) by Anthropic.
