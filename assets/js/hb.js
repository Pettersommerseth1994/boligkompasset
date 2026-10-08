/* ──────────────────────────────────────────────────────────────────
   Husbanken, felles skript for prototypen
   Ingen rammeverk, ingen byggesteg. Fungerer på file:// og GitHub Pages.
   ────────────────────────────────────────────────────────────────── */

/* ═══ 1. Regelverket, samlet ett sted ════════════════════════════════
   Endre her, så følger kalkulator, eksempler, tekster og validering
   etter. Tallene stemmer med utkastet på husbanken.no per 4.8.2026.
   ─────────────────────────────────────────────────────────────────── */
const HB_REGLER = {
  minstekostnad: 40000,   // du må oppgradere for minst dette
  sats: 0.25,             // du får denne andelen
  kostnadstak: 300000,    // vi regner ikke på beløp over dette
  get maksTilskudd() { return Math.round(this.kostnadstak * this.sats); }, // 75 000
  sliderMaks: 500000,
  sliderSteg: 5000,
  frist: '1. november 2026',
  telefon: '22 96 16 00',
  telefonRaw: '+4722961600'
};

/* ═══ 2. Beregning ════════════════════════════════════════════════ */

function hbBeregn(kostnad) {
  const c = Math.max(0, Number(kostnad) || 0);
  const R = HB_REGLER;

  if (c < R.minstekostnad) {
    return {
      kostnad: c,
      grunnlag: 0,
      tilskudd: 0,
      egenandel: c,
      mangler: R.minstekostnad - c,
      overTaket: 0,
      status: 'under'
    };
  }
  const grunnlag = Math.min(c, R.kostnadstak);
  const tilskudd = Math.round(grunnlag * R.sats);
  return {
    kostnad: c,
    grunnlag,
    tilskudd,
    egenandel: c - tilskudd,
    mangler: 0,
    overTaket: Math.max(0, c - R.kostnadstak),
    status: c > R.kostnadstak ? 'tak' : 'ok'
  };
}

/* ═══ 3. Formatering ══════════════════════════════════════════════ */

const hbKr = n => new Intl.NumberFormat('nb-NO').format(Math.round(n)) + ' kr';
const hbTall = n => new Intl.NumberFormat('nb-NO').format(Math.round(n));
const hbParseTall = s => Number(String(s).replace(/[^\d]/g, '')) || 0;

/* Norsk telefonnummer: 8 siffer grupperes 3-2-3, slik Posten og
   Skatteetaten viser dem. Lettere å kontrollere for eldre øyne. */
const hbTlf = s => {
  const d = String(s || '').replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0,3)} ${d.slice(3,5)} ${d.slice(5)}` : (s || '');
};

/* ═══ 4. Ikoner ═══════════════════════════════════════════════════ */

const HB_IKON = {
  chevron: '<svg class="hb-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chevronHvit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pil: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pilOpp: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V5m0 0l-6 6m6-6l6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  person: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.2" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 19a6.2 6.2 0 0 1 11.6 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  kalender: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.15" fill="currentColor"/></svg>',
  varsel: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 1.8 21h20.4L12 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.8" r="1.15" fill="currentColor"/></svg>',
  hake: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.8 9.8 17.6 19 8" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  hus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 10.5 12 3.5l8.5 7M5.5 9.6V20h13V9.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  telefon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.4 3.5H4.6c-.9 0-1.6.8-1.5 1.7C3.9 13 11 20.1 18.8 20.9c.9.1 1.7-.6 1.7-1.5v-2.8c0-.7-.5-1.3-1.2-1.5l-2.7-.6c-.6-.1-1.2.1-1.6.6l-1 1.2a13.6 13.6 0 0 1-5.8-5.8l1.2-1c.5-.4.7-1 .6-1.6l-.6-2.7c-.2-.7-.8-1.2-1.5-1.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  kamera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-2h6.9l1.2 2h1.9A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" stroke="currentColor" stroke-width="1.7"/></svg>',
  mappe: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.4h8.8A1.5 1.5 0 0 1 21 8.9v9.6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-12Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  epost: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="m3.5 6.5 8.5 6.2 8.5-6.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  lås: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="10" width="15" height="10.5" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7.4a4 4 0 0 1 8 0V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};

/* Veilederen «Bodil», samme figur som i Husbankens egne søknadsflyter:
   grønn organisk flate, mørkt pageklipp, enkelt ansikt og skuldre. */
const HB_AVATAR = `
<svg class="hb-guide__avatar" viewBox="0 0 100 100" role="img" aria-label="Illustrasjon av veilederen" focusable="false">
  <defs>
    <clipPath id="hb-blob">
      <path d="M50 4c23 0 42 16 44 36 2 20-12 38-30 44-15 5-33 3-45-8C7 65 2 48 8 33 14 16 30 4 50 4Z"/>
    </clipPath>
  </defs>
  <path d="M50 4c23 0 42 16 44 36 2 20-12 38-30 44-15 5-33 3-45-8C7 65 2 48 8 33 14 16 30 4 50 4Z" fill="#B7D89B"/>
  <g clip-path="url(#hb-blob)">
    <!-- skuldre -->
    <path d="M22 92c2-13 13-21 28-21s26 8 28 21" fill="#fff" stroke="#2C4656" stroke-width="2.6" stroke-linejoin="round"/>
    <!-- hår bak -->
    <path d="M27 44c0-15 10-25 23-25s23 10 23 25c0 12-1 22-3 28-1 3-4 4-6 2-3-3-4-9-4-17H40c0 8-1 14-4 17-2 2-5 1-6-2-2-6-3-16-3-28Z" fill="#1D2B11"/>
    <!-- ansikt -->
    <path d="M50 26c9 0 14 6 14 16 0 11-6 20-14 20s-14-9-14-20c0-10 5-16 14-16Z" fill="#fff" stroke="#2C4656" stroke-width="2.4"/>
    <!-- pannelugg -->
    <path d="M36 36c0-11 6-17 14-17s14 6 14 17c-3-6-8-9-14-9s-11 3-14 9Z" fill="#1D2B11"/>
    <circle cx="44.5" cy="42" r="2" fill="#2C4656"/>
    <circle cx="56.5" cy="42" r="2" fill="#2C4656"/>
    <path d="M46 51c1.6 1.6 6.4 1.6 8 0" stroke="#2C4656" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  </g>
</svg>`;

/* ═══ 5. Felles topp og bunn ══════════════════════════════════════ */

const HB_NAV = [
  ['https://pettersommerseth1994.github.io/husbanken/index.html', 'Forside for privatpersoner'],
  ['https://pettersommerseth1994.github.io/husbanken/tilskudd.html', 'Tilskudd til aldersvennlig oppgradering'],
  ['boligkompasset.html', 'Boligkompasset'],
  ['#', 'Bostøtte'],
  ['#', 'Startlån fra kommunen'],
  ['#', 'Lån fra Husbanken'],
  ['#', 'For lånekunder'],
  ['#', 'Renter']
];

function hbHeader(opts = {}) {
  const {
    kontekst = 'Lån og tilskudd fra Husbanken',
    bruker = null,          // f.eks. 'Bodil Innbygger' når man er logget inn
    minimal = false         // BankID-siden viser bare logo
  } = opts;

  const brukerBlokk = bruker
    ? `<a class="hb-userchip" href="#">${HB_IKON.person}<span>${bruker}</span></a>`
    : `<a class="hb-userchip" href="https://pettersommerseth1994.github.io/husbanken/logg-inn.html">${HB_IKON.lås}<span>Logg inn</span></a>`;

  return `
<div class="hb-protobar">
  Klikkbar prototype for Husbanken · testdata og illustrasjoner ·
  <a href="https://pettersommerseth1994.github.io/husbanken/designbeslutninger.html">se designbeslutningene</a>
</div>
<a class="hb-skiplink" href="#hovedinnhold">Hopp til hovedinnhold</a>
<header class="hb-topbar">
  <div class="hb-shell hb-shell--wide">
    <div class="hb-topbar__row">
      <a class="hb-logo" href="https://pettersommerseth1994.github.io/husbanken/index.html" aria-label="Husbanken, til forsiden">
        <img src="ds/logo/husbanken-primary.png" alt="Husbanken">
      </a>
      ${minimal ? '' : brukerBlokk}
    </div>
  </div>
</header>
${minimal ? '' : `
<div class="hb-contextbar">
  <div class="hb-shell hb-shell--wide">
    <div class="hb-contextbar__row">
      <span class="hb-contextbar__title">${kontekst}</span>
      <button type="button" class="hb-lang-toggle">Bokmål ${HB_IKON.chevron}</button>
    </div>
  </div>
</div>
<div class="hb-menubar">
  <div class="hb-shell hb-shell--wide">
    <div class="hb-menubar__row">
      <button type="button" class="hb-menu-toggle" aria-expanded="false" aria-controls="hovedmeny">
        Meny ${HB_IKON.chevron}
      </button>
    </div>
    <nav class="hb-mainnav" id="hovedmeny" data-open="false" aria-label="Hovedmeny">
      <ul>${HB_NAV.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul>
    </nav>
  </div>
</div>`}`;
}

function hbFooter() {
  return `
<footer class="hb-footer">
  <div class="hb-shell hb-shell--wide">
    <div class="hb-footer__cols">
      <div>
        <h3>Kontakt oss</h3>
        <ul>
          <li><a href="tel:${HB_REGLER.telefonRaw}">Telefon ${HB_REGLER.telefon}</a><br>
              <span class="hb-small">Hverdager 09.00–15.00</span></li>
          <li><a href="mailto:post@husbanken.no">post@husbanken.no</a></li>
          <li>Postboks 1404, 8002 Bodø</li>
        </ul>
      </div>
      <div>
        <h3>Snarveier</h3>
        <ul>
          <li><a href="https://pettersommerseth1994.github.io/husbanken/tilskudd.html">Tilskudd til aldersvennlig oppgradering</a></li>
          <li><a href="#">Bostøtte</a></li>
          <li><a href="#">Startlån fra kommunen</a></li>
          <li><a href="#">Lån fra Husbanken</a></li>
        </ul>
      </div>
      <div>
        <h3>Om nettstedet</h3>
        <ul>
          <li><a href="#">Personvern og informasjonskapsler</a></li>
          <li><a href="#">Tilgjengelighetserklæring</a></li>
          <li><a href="https://pettersommerseth1994.github.io/husbanken/designbeslutninger.html">Designbeslutninger i denne prototypen</a></li>
        </ul>
      </div>
    </div>
    <p class="hb-footer__note">
      Dette er en klikkbar prototype laget for designarbeid. Innhold, beløp og
      saksbehandling er ikke bindende. Ingen data sendes til Husbanken.
    </p>
  </div>
</footer>`;
}

/* ═══ 6. Oppstart ═════════════════════════════════════════════════ */

function hbMonter(opts = {}) {
  const topp = document.getElementById('hb-topp');
  const bunn = document.getElementById('hb-bunn');
  if (topp) topp.innerHTML = hbHeader(opts);
  if (bunn) bunn.innerHTML = hbFooter();
  hbInitMeny();
  hbInitTrekkspill();
}

function hbInitMeny() {
  const knapp = document.querySelector('.hb-menu-toggle');
  const nav = document.getElementById('hovedmeny');
  if (!knapp || !nav) return;
  knapp.addEventListener('click', () => {
    const åpen = knapp.getAttribute('aria-expanded') === 'true';
    knapp.setAttribute('aria-expanded', String(!åpen));
    nav.dataset.open = String(!åpen);
  });
}

/* Trekkspill. Brukertest: fire av åtte oppdaget ikke at boksene kunne
   åpnes. Vi bruker derfor eksplisitt «Vis»/«Skjul»-tekst i tillegg til
   pilen, og markerer knappen som en knapp, ikke som en flate. */
function hbInitTrekkspill(rot = document) {
  rot.querySelectorAll('[data-trekkspill]').forEach(boks => {
    if (boks.dataset.klar === '1') return;
    boks.dataset.klar = '1';

    const knapp = boks.querySelector('.hb-accordion__btn');
    const panel = boks.querySelector('.hb-accordion__panel');
    if (!knapp || !panel) return;

    const stat = knapp.querySelector('.hb-accordion__state');
    const settTilstand = åpen => {
      knapp.setAttribute('aria-expanded', String(åpen));
      panel.hidden = !åpen;
      if (stat) stat.textContent = åpen ? 'Skjul' : 'Vis';
    };
    settTilstand(knapp.getAttribute('aria-expanded') === 'true');

    knapp.addEventListener('click', () => {
      settTilstand(knapp.getAttribute('aria-expanded') !== 'true');
    });
  });
}

/* ═══ 7. Lagring mellom sidene ════════════════════════════════════
   «Du kan ta en pause når som helst. Svarene dine lagres automatisk.»
   ─────────────────────────────────────────────────────────────────── */

const HB_LAGER = 'hb-soknad-aldersvennlig';

function hbLes() {
  try { return JSON.parse(localStorage.getItem(HB_LAGER)) || {}; }
  catch { return {}; }
}
function hbSkriv(data) {
  try { localStorage.setItem(HB_LAGER, JSON.stringify(data)); } catch { /* privat modus */ }
}
function hbOppdater(delta) {
  const d = { ...hbLes(), ...delta };
  hbSkriv(d);
  return d;
}
function hbTøm() {
  try { localStorage.removeItem(HB_LAGER); } catch { /* ignorer */ }
}
