/* =========================================================
   STUDENT AMBASSADOR APPRECIATION NIGHT — script.js
   ========================================================= */

/* ---------------------------------------------------------
   PENGATURAN
   --------------------------------------------------------- */
const CONFIG = {
  // Nama tamu default. Untuk nama per orang, buka web dengan
  // alamat ...index.html?name=Diana  →  "Dear Diana,"
  defaultName: 'Guest',

  // Alamat untuk mengirim data RSVP (misalnya Google Apps Script
  // atau Formspree). Biarkan kosong '' kalau belum ada:
  // data hanya disimpan di browser tamu.
  rsvpEndpoint: '',
  declineEndpoint: '',
};

const STORE_KEY = 'saae-rsvp';
const DECLINE_KEY = 'saae-decline';
const SECTIONS = ['home', 'about', 'dresscode', 'contact'];
const PAGES = ['home', 'ticket', 'rsvp'];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = ms => (reduceMotion ? 1 : ms);

const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* mode privat */ } },
};

/* ---------------------------------------------------------
   1. PERSIAPAN
   --------------------------------------------------------- */
const scene = $('#scene');
const stage = $('#stage');
const envHolder = $('#envHolder');
const envSeal = $('#envSeal');
const cover = $('#cover');
const app = $('#app');

// Masukkan amplop dari template
function makeEnvelope(target, before = null) {
  const node = $('#envelope-tpl').content.firstElementChild.cloneNode(true);
  target.insertBefore(node, before);
  return node;
}
const env = makeEnvelope(envHolder, envSeal);
makeEnvelope($('#heroEnv'));

// Nama tamu dari alamat web (?name=...)
const params = new URLSearchParams(location.search);
const guestName = (params.get('name') || params.get('to') || CONFIG.defaultName).trim().slice(0, 40);
$('#guestName').textContent = guestName;

// Kilau emas & silver di latar
(function makeSparkles() {
  const box = $('#sparkles');
  const count = window.innerWidth < 700 ? 16 : 28;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('i');
    const silver = Math.random() < .35;
    s.style.cssText = [
      `left:${Math.random() * 100}%`,
      `top:${Math.random() * 100}%`,
      `--s:${(1.5 + Math.random() * 2.5).toFixed(1)}px`,
      `--c:${silver ? '#e8e8ec' : '#e6c987'}`,
      `--d:${(4 + Math.random() * 6).toFixed(1)}s`,
      `--delay:${(Math.random() * 8).toFixed(1)}s`,
    ].join(';');
    box.appendChild(s);
  }
})();

/* ---------------------------------------------------------
   2. ANIMASI PEMBUKA
   --------------------------------------------------------- */
let opening = false;

async function openEnvelope() {
  if (opening) return;
  opening = true;

  scene.classList.remove('is-intro');
  scene.classList.add('is-opening');

  // a. Segel terlepas, amplop berganti ke versi berlapis
  env.classList.add('is-layered');
  envSeal.classList.add('is-popping');
  await wait(T(350));

  // b. Tutup amplop terbuka
  env.classList.add('is-open');
  await wait(T(620));
  env.classList.add('is-flap-back');
  await wait(T(500));

  // c. Kertas naik keluar
  env.classList.add('is-risen');
  await wait(T(1150));

  // d. Kertas berubah jadi sampul, amplop pindah ke kiri bawah
  revealCover();
}

function revealCover() {
  const paper = $('.env__paper', env);
  const from = paper.getBoundingClientRect();

  cover.style.transition = 'none';
  cover.style.transformOrigin = '0 0';
  cover.style.transform = 'none';
  cover.classList.add('is-visible');
  const to = cover.getBoundingClientRect();

  cover.style.transform =
    `translate(${from.left - to.left}px, ${from.top - to.top}px) ` +
    `scale(${from.width / to.width}, ${from.height / to.height})`;
  cover.getBoundingClientRect(); // paksa browser menghitung ulang

  paper.style.opacity = '0';
  scene.classList.add('is-cover');
  cover.style.transition = `transform ${T(1100)}ms cubic-bezier(.65,0,.25,1)`;
  cover.style.transform = 'rotate(-.8deg)';

  setTimeout(() => {
    cover.style.transformOrigin = '';
    cover.classList.add('is-ready');
    cover.setAttribute('aria-hidden', 'false');
    $('#coverSeal').focus({ preventScroll: true });
  }, T(900));
}

// Dari sampul → halaman detail
async function leaveCover() {
  const seal = $('#coverSeal');
  seal.classList.add('is-pressed');
  await wait(T(180));
  cover.style.transition = '';
  cover.style.transform = '';
  scene.classList.add('is-leaving');
  await wait(T(650));
  enterApp('home');
}

function enterApp(target) {
  scene.classList.add('is-gone');
  document.body.classList.remove('is-intro');
  app.hidden = false;
  route(target, { instant: true });
  setTimeout(() => scene.remove(), 1000);
}

$('#openBtn').addEventListener('click', openEnvelope);
envHolder.addEventListener('click', () => { if (!opening) openEnvelope(); });
$('#coverSeal').addEventListener('click', leaveCover);
$('#skipBtn').addEventListener('click', () => enterApp('home'));

/* ---------------------------------------------------------
   3. PINDAH HALAMAN (Home / About / Dresscode / Contact / Ticket / RSVP)
   --------------------------------------------------------- */
function showPage(name) {
  $$('.page').forEach(p => { p.hidden = p.dataset.page !== name; });
  if (name === 'ticket') renderTicket();
  if (name === 'rsvp') fillForm();
}

function setActive(name) {
  $$('.nav [data-nav]').forEach(a => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

let currentPage = null;
function route(target, { instant = false } = {}) {
  const name = target || 'home';
  const page = SECTIONS.includes(name) ? 'home' : (PAGES.includes(name) ? name : 'home');

  if (page !== currentPage) {
    showPage(page);
    currentPage = page;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  setActive(page === 'rsvp' ? 'ticket' : name);

  if (page === 'home' && name !== 'home') {
    const el = document.getElementById(name);
    requestAnimationFrame(() => el.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' }));
  } else if (page === 'home') {
    window.scrollTo({ top: 0, behavior: instant ? 'instant' : 'smooth' });
  }
}

$$('.nav a').forEach(a => a.addEventListener('click', e => {
  if (location.hash === a.getAttribute('href')) { e.preventDefault(); route(a.dataset.nav); }
}));

window.addEventListener('hashchange', () => {
  if (app.hidden) enterApp(location.hash.slice(1));
  else route(location.hash.slice(1));
});

// Menu ikut berganti warna saat halaman detail di-scroll
const spy = new IntersectionObserver(entries => {
  if (currentPage !== 'home') return;
  entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
}, { rootMargin: '-45% 0px -50% 0px' });
SECTIONS.forEach(id => spy.observe(document.getElementById(id)));

// Elemen muncul pelan saat di-scroll
const revealer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); revealer.unobserve(e.target); } });
}, { threshold: .15 });
$$('.block__body > *').forEach(el => el.classList.add('reveal'));
$$('.reveal').forEach(el => revealer.observe(el));

/* ---------------------------------------------------------
   4. RSVP, TIKET & POP-UP "NO"
   --------------------------------------------------------- */
function renderTicket() {
  const data = store.get(STORE_KEY);
  $('#ticketEmpty').hidden = !!data;
  $('#ticketFull').hidden = !data;
  $('#ticketKicker').textContent = data ? 'You’re Registered!' : 'You’re Not Registered Yet!';
  if (data) {
    $('#ticketName').textContent = data.name;
    $('#ticketCode').textContent = data.code;
  }
}

function renderRsvpStatus() {
  const status = $('#rsvpStatus');
  const data = store.get(STORE_KEY);
  const declined = store.get(DECLINE_KEY);
  status.hidden = !(data || declined);
  status.innerHTML = '';
  if (data) {
    status.append('You’re registered — ');
    const a = document.createElement('a');
    a.href = '#ticket';
    a.textContent = 'view your ticket';
    status.append(a);
  } else if (declined) {
    status.textContent = 'Changed your mind? Tap Yes to RSVP.';
  }
}

function fillForm() {
  const data = store.get(STORE_KEY);
  const form = $('#rsvpForm');
  if (data) Object.entries(data).forEach(([k, v]) => { if (form.elements[k]) form.elements[k].value = v; });
  else if (guestName !== CONFIG.defaultName && !form.elements.name.value) form.elements.name.value = guestName;
}

async function postJSON(url, body) {
  if (!url) return;
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
}

$('#yesBtn').addEventListener('click', () => { location.hash = store.get(STORE_KEY) ? '#ticket' : '#rsvp'; });

$('#rsvpForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;
  const err = $('#formError');
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();

  $$('.field', form).forEach(f => f.classList.remove('is-invalid'));
  const problems = [];
  if (!name) { problems.push('your full name'); form.elements.name.closest('.field').classList.add('is-invalid'); }
  if (!/^\S+@\S+\.\S+$/.test(email)) { problems.push('a valid email'); form.elements.email.closest('.field').classList.add('is-invalid'); }
  if (problems.length) {
    err.textContent = `Please fill in ${problems.join(' and ')}.`;
    err.hidden = false;
    return;
  }
  err.hidden = true;

  const old = store.get(STORE_KEY);
  const data = Object.fromEntries(new FormData(form));
  data.name = name;
  data.email = email;
  data.code = old?.code || `SAAE-${String(Math.floor(1000 + Math.random() * 9000))}`;
  data.submittedAt = new Date().toISOString();

  const btn = $('#submitBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    await postJSON(CONFIG.rsvpEndpoint, data);
    store.set(STORE_KEY, data);
    localStorage.removeItem(DECLINE_KEY);
    renderRsvpStatus();
    location.hash = '#ticket';
  } catch {
    err.textContent = 'Sorry, something went wrong. Please try again.';
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit';
  }
});

// Pop-up "No"
const modal = $('#reasonModal');
function openModal() {
  $('#reasonStep').hidden = false;
  $('#thanksStep').hidden = true;
  modal.hidden = false;
  setTimeout(() => $('#reasonText').focus(), 50);
}
function closeModal() { modal.hidden = true; $('#noBtn').focus(); }

$('#noBtn').addEventListener('click', openModal);
$$('[data-close]', modal).forEach(el => el.addEventListener('click', closeModal));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

$('#reasonSubmit').addEventListener('click', async () => {
  const reason = $('#reasonText').value.trim();
  const data = { name: guestName, reason, submittedAt: new Date().toISOString() };
  try { await postJSON(CONFIG.declineEndpoint, data); } catch { /* tetap lanjut */ }
  store.set(DECLINE_KEY, data);
  renderRsvpStatus();
  $('#reasonStep').hidden = true;
  $('#thanksStep').hidden = false;
  setTimeout(closeModal, T(2600));
});

/* ---------------------------------------------------------
   5. MULAI
   --------------------------------------------------------- */
renderRsvpStatus();

const startHash = location.hash.slice(1);
if (startHash) {
  // Kalau dibuka langsung ke #about, #ticket, dll → lewati animasi pembuka
  scene.remove();
  app.hidden = false;
  route(startHash, { instant: true });
} else {
  document.body.classList.add('is-intro');
  scene.classList.add('is-intro');
}

window.addEventListener('load', () => document.body.classList.remove('is-loading'));
