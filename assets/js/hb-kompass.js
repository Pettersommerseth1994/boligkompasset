/* ──────────────────────────────────────────────────────────────────
   Boligkompasset, logikken

   Ett spørsmål om gangen, i fire steg. Kompasset vises etter hvert
   steg, ikke under hvert spørsmål, og til slutt i oppsummeringen.
   Papirutgaven ligger for seg, i boligkompasset-papir.html.

   Komponentene er Fasaden, Husbankens eget designsystem. Alt innhold
   som tegnes her, ligger inne i .fasaden, se fasaden/fasaden.css.
   ────────────────────────────────────────────────────────────────── */

/* Nytt navn da spørsmålene ble byttet ut. De gamle svarene passer
   ikke til de nye spørsmålene, og skal ikke dukke opp som «påbegynt». */
const KP_LAGER = 'hb-boligkompasset-2';

let S = {};              // svarene
let KP_FLYT = [];        // skjermene i kompassmodus
let kpPos = 0;           // hvor i flyten vi er
let kpModus = 'start';   // 'start' | 'kompass' | 'oppsummering'

/* ═══ Lagring ═════════════════════════════════════════════════════
   Svarene skrives ved hvert eneste valg. Linja nederst på skjermen
   sier når det skjedde, og om det ble lagret bare i nettleseren
   eller hos Husbanken.
   ─────────────────────────────────────────────────────────────────── */

function kpLes() {
  try { return JSON.parse(localStorage.getItem(KP_LAGER)) || {}; }
  catch { return {}; }
}
function kpLagre() {
  S.endret = new Date().toISOString();
  try { localStorage.setItem(KP_LAGER, JSON.stringify(S)); } catch { /* privat modus */ }
}
const kpKlokke = iso => {
  const d = iso ? new Date(iso) : new Date();
  return String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0');
};

/* ═══ Poeng og kurs ═══════════════════════════════════════════════ */

/* Hvert spørsmål normaliseres for seg, slik at ett spørsmål med
   store tall ikke overdøver de andre. */
function kpNormaliser(sp, felt) {
  const valg = felt ? felt.valg : sp.valg;
  const mn = Math.max(...valg.map(v => Math.abs(v.n || 0)), 0);
  const me = Math.max(...valg.map(v => Math.abs(v.e || 0)), 0);
  return { mn, me };
}

function kpPoengFor(sp, felt) {
  if (sp.ikkeKompass || (felt && felt.ikkeKompass)) return null;
  const navn = felt ? felt.navn : sp.id;
  const svar = S[navn];
  if (svar === undefined || svar === null || svar === 'hoppet') return null;
  /* Haker man av og av igjen, blir svaret en tom liste. Det er ikke
     det samme som «ingen av delene», det er ikke besvart. */
  if (Array.isArray(svar) && !svar.length) return null;

  if (sp.poeng) {
    const p = sp.poeng(svar, S);
    return { n: p.n / (sp.maks.n || 1), e: p.e / (sp.maks.e || 1) };
  }
  if (sp.type === 'flervalg') return { n: 0, e: 0 };
  const valg = (felt ? felt.valg : sp.valg).find(v => v.v === svar);
  if (!valg) return null;
  const { mn, me } = kpNormaliser(sp, felt);
  return { n: mn ? (valg.n || 0) / mn : 0, e: me ? (valg.e || 0) / me : 0 };
}

/* Alle enhetene som kan gi utslag. Et flerfeltspørsmål teller som
   like mange enheter som det har felt. */
function kpEnheter() {
  const ut = [];
  KOMPASS_SPORSMAL.forEach(sp => {
    if (sp.ikkeKompass) return;
    if (sp.type === 'flerfelt') sp.felt.forEach(f => { if (!f.ikkeKompass) ut.push({ sp, felt: f }); });
    else ut.push({ sp, felt: null });
  });
  return ut;
}

/* ═══ Fra svar til grader ═════════════════════════════════════════
   Nåla begynner rett opp, på «Rett kurs», og hvert svar vrir den et
   bestemt antall grader. Nedover er bort fra «Rett kurs», oppover er
   tilbake mot den. Summen innenfor ett steg klippes til 0–180 grader,
   så nåla aldri går forbi hverken toppen eller bunnen.

   Hvilken vei rundt den går, avgjøres av hva slags arbeid svarene
   peker på: små grep tar den til høyre, større grep til venstre.
   Begge veiene ender i «Ny kurs» nederst.
   ─────────────────────────────────────────────────────────────────── */

/* Hvor mange grader nedover ett svar drar. Et godt svar drar 22,5
   grader oppover, så det kan rette opp et dårlig svar tidligere i
   steget. */
function kpGraderNed(n) {
  if (n >= 0.75) return -22.5;
  if (n >= 0.25) return 0;
  if (n >= -0.25) return 22.5;
  if (n >= -0.75) return 45;
  return 90;
}

/* Veien rundt: høyre for små grep, venstre for større. */
const kpSideAv = e => (e <= -0.3 ? -1 : (e >= 0.3 ? 1 : 0));

function kpKursAvVinkel(grader, ekstra = {}) {
  const rad = grader * Math.PI / 180;
  const x = Math.sin(rad), y = Math.cos(rad);
  return Object.assign({ x, y, r: 1, grader, retning: kpRetning(x, y, 0.2), tom: false }, ekstra);
}

const KP_TOMKURS = { x: 0, y: 1, r: 0, grader: 0, retning: 'MIDT', tom: true, antall: 0 };

/* Kursen til ett steg. Dette er nåla under spørsmålene, og den samme
   nåla som står på oppsummeringen av steget. */
function kpKursForSteg(etappeId) {
  const enheter = kpEnheter().filter(u => u.sp.etappe === etappeId);
  let ned = 0, side = 0, antall = 0;

  /* Klippes underveis, ikke på summen til slutt. Nåla står et sted, og
     neste svar vrir den derfra. Ellers ville et godt svar tidlig i
     steget spist av utslaget til et dårlig svar senere, selv om nåla
     alt sto på toppen og ikke kunne komme høyere. */
  enheter.forEach(({ sp, felt }) => {
    const p = kpPoengFor(sp, felt);
    if (!p) return;
    antall++;
    ned = Math.max(0, Math.min(180, ned + (sp.graderNed ? sp.graderNed(S[sp.id]) : kpGraderNed(p.n))));
    side += kpSideAv(p.e);
  });
  if (!antall) return Object.assign({}, KP_TOMKURS);

  /* To porter fra innsiktsarbeidet. Er adkomsten stengt, eller er
     nærmiljøet tomt og du kommer deg ingen steder, holder det ikke at
     resten er bra. */
  if (etappeId === 'adkomst' && S['adkomst-inngang'] === 'sveert') {
    ned = Math.max(ned, 135);
  }
  if (etappeId === 'naermiljo' && S.tjenester === 'sterkt' && S.hjelp === 'nei') {
    ned = Math.max(ned, 135);
  }

  return kpKursAvVinkel((side < 0 ? -1 : 1) * ned, { antall });
}

/* Hele kursen settes av det steget som står dårligst.

   Et snitt av gradene virker ikke her. To steg på 180 og to på minus
   180 peker alle rett ned, men gjennomsnittet av tallene blir null,
   altså rett opp. Og selv med riktig regnet snitt ville tre gode steg
   dekket over ett som var umulig.

   Det speiler dessuten det innsiktsarbeidet sier: kommer du ikke inn
   og ut, hjelper det ikke at badet er fint. Nyansene står like under,
   der hvert steg har sitt eget kompass. */
function kpBeregnKurs(etappeId) {
  if (etappeId) return kpKursForSteg(etappeId);

  const steg = KOMPASS_ETAPPER
    .map(e => kpKursForSteg(e.id))
    .filter(k => !k.tom);
  const kompassSp = KOMPASS_SPORSMAL.filter(sp => !sp.ikkeKompass);
  const felles = {
    antall: steg.reduce((n, k) => n + k.antall, 0),
    svart: kompassSp.filter(kpBesvart).length,
    totalt: kompassSp.length
  };
  if (!steg.length) return Object.assign({}, KP_TOMKURS, felles);

  const verst = steg.reduce((a, b) => Math.abs(b.grader) > Math.abs(a.grader) ? b : a);
  return kpKursAvVinkel(verst.grader, felles);
}

function kpRetning(x, y, grense = 0.18) {
  if (Math.hypot(x, y) < grense) return 'MIDT';
  let deg = Math.atan2(x, y) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'][Math.round(deg / 45) % 8];
}

/* Himmelretningene står ikke noe sted utad. Det er kursen som har et
   navn, og det er den folk skal kjenne igjen. N, Ø, S og V lever
   videre som korte koder i regnestykket. */
const kpKursnavn = retning =>
  (KOMPASS_RETNINGER[retning] || KOMPASS_RETNINGER.MIDT).navn;
const KP_RETNINGSFORKLARING = {
  N: 'Det taler for at du kan bli boende.',
  NØ: 'Det taler for at du kan bli boende, med noen små grep.',
  Ø: 'Dette løses med et lite grep.',
  SØ: 'Her er det noe som må gjøres, men ikke noe stort.',
  S: 'Det er et av de svarene som er tunge å bygge bort.',
  SV: 'Det krever enten et stort arbeid, eller en annen bolig.',
  V: 'Her må det bygges om.',
  NV: 'Ett større arbeid, men ellers står boligen støtt.',
  MIDT: 'Dette svaret trekker verken den ene eller den andre veien.'
};

/* ═══ Kompasset som figur ═════════════════════════════════════════ */

/* Grønn nål i øvre halvdel, rød i nedre. Fargen skal si det samme
   som etikettene: opp er en kurs man vil ha, ned er en man bør se
   nærmere på. */
const kpNaalVei = kurs =>
  /* Litt slingringsmonn, ellers gjør cos(270°) = -1.8e-16 at nåla blir
     rød på strek vest. Den vannrette aksen er nøytral, ikke negativ. */
  kurs.tom ? 'tom' : (kurs.y >= -1e-6 ? 'opp' : 'ned');

function kpKompassTekst(kurs) {
  if (kurs.tom) return 'Kompass. Nåla står i ro, i påvente av svar.';
  return kurs.retning === 'MIDT'
    ? 'Kompass. Nåla står nær midten. Kursen er «' + kpKursnavn('MIDT') + '».'
    : 'Kompass. Nåla peker mot «' + kpKursnavn(kurs.retning) + '».';
}

/* Én størrelse overalt. Den lille utgaven med bare N, Ø, S og V var
   for smått til å lese nederst på skjermen, og den tvang oss til å
   forklare retningene et annet sted. Nå står navnet på kursen rett i
   rosa, i samme rose på forsiden, under spørsmålene og i
   oppsummeringen. */
function kpKompassSvg(kurs, opt = {}) {
  const liten = !!opt.liten;
  const vinkel = (Math.atan2(kurs.x, kurs.y) * 180 / Math.PI) || 0;
  const skala = 0.52 + 0.48 * (kurs.r || 0);
  /* Bredden er satt av den lengste etiketten, «Ombygging», ikke av
     rosa. Blir boksen smalere, skjæres den av i kanten. */
  const vb = liten ? '0 0 200 200' : '0 0 316 210';
  const cx = liten ? 100 : 158, cy = liten ? 100 : 103, r = liten ? 88 : 70;

  const felt = (d, navn, aktiv) =>
    `<path class="kp-kompass__felt${aktiv ? ' kp-kompass__felt--aktiv' : ''}" data-kv="${navn}" d="${d}"
           fill="${aktiv ? 'var(--hb-green-600)' : 'var(--hb-slate-400)'}"/>`;

  /* Kvadranten nåla peker inn i, tonet litt sterkere */
  const kv = kurs.r > 0.24
    ? (kurs.y >= 0 ? (kurs.x >= 0 ? 'nø' : 'nv') : (kurs.x >= 0 ? 'sø' : 'sv'))
    : null;
  const bue = (fra, til) => {
    const p = a => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const [x1, y1] = p(fra), [x2, y2] = p(til);
    return `M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  };

  let merker = '';
  for (let a = 0; a < 360; a += 15) {
    const lang = a % 45 === 0;
    const i = r - (lang ? 11 : 5), y = r;
    const s = Math.sin(a * Math.PI / 180), c = Math.cos(a * Math.PI / 180);
    merker += `<line class="kp-kompass__tick" x1="${(cx + i * s).toFixed(1)}" y1="${(cy - i * c).toFixed(1)}" x2="${(cx + y * s).toFixed(1)}" y2="${(cy - y * c).toFixed(1)}"/>`;
  }

  /* Bare kursnavnene. Himmelretningene sa ingenting om boligen, og de
     tok plassen til det som faktisk betyr noe. */
  const etiketter = liten ? '' : `
    <text class="kp-kompass__etikett kp-kompass__etikett--n" x="${cx}" y="24" text-anchor="middle">Rett kurs</text>
    <text class="kp-kompass__etikett kp-kompass__etikett--s" x="${cx}" y="192" text-anchor="middle">Ny kurs</text>
    <text class="kp-kompass__etikett" x="${cx + r + 8}" y="108" text-anchor="start">Små grep</text>
    <text class="kp-kompass__etikett" x="${cx - r - 8}" y="108" text-anchor="end">Større grep</text>`;

  const info = KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT;

  return `
<svg class="kp-kompass" viewBox="${vb}" role="img" data-kompass
     data-tom="${kurs.tom ? '1' : '0'}" data-vei="${kpNaalVei(kurs)}"
     aria-label="${kpKompassTekst(kurs)}">
  ${felt(bue(0, 90), 'nø', kv === 'nø')}${felt(bue(90, 180), 'sø', kv === 'sø')}
  ${felt(bue(180, 270), 'sv', kv === 'sv')}${felt(bue(270, 360), 'nv', kv === 'nv')}
  <circle class="kp-kompass__rose" cx="${cx}" cy="${cy}" r="${r}"/>
  <circle class="kp-kompass__ring" cx="${cx}" cy="${cy}" r="${(r * 0.66).toFixed(1)}"/>
  <circle class="kp-kompass__ring" cx="${cx}" cy="${cy}" r="${(r * 0.33).toFixed(1)}"/>
  <line class="kp-kompass__akse" x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}"/>
  <line class="kp-kompass__akse" x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}"/>
  ${merker}
  <g class="kp-kompass__naal" data-naal
     style="transform-origin:${cx}px ${cy}px; transform:rotate(${vinkel.toFixed(1)}deg) scale(${skala.toFixed(2)})">
    <path class="kp-kompass__naal-nord" d="M${cx} ${cy - r + 5} L${cx + 12} ${cy + 8} L${cx} ${cy} L${cx - 12} ${cy + 8} Z"/>
    <path class="kp-kompass__naal-sor"  d="M${cx} ${cy + r - 18} L${cx + 9} ${cy - 5} L${cx} ${cy} L${cx - 9} ${cy - 5} Z"/>
  </g>
  <circle class="kp-kompass__nav" cx="${cx}" cy="${cy}" r="8.5"/>
  <circle cx="${cx}" cy="${cy}" r="3.4" fill="#fff"/>
  ${etiketter}
</svg>`;
}

/* ═══ Små byggeklosser ════════════════════════════════════════════ */

const kpEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Hjelpeteksten står framme, ikke bak Fasadens spørsmålstegn. Teksten
   er lang, og designkritikken var tydelig på at det som er gjemt bak
   et trykk, ikke blir lest. Avsnittene i masterfila holdes adskilt. */
const kpAvsnitt = (tekst, klasse = 'hb-felt-beskrivelse') => String(tekst || '')
  .split(/\n\s*\n/).filter(Boolean)
  .map(a => `<p class="${klasse}">${a.trim()}</p>`).join('');

/* Fasadens knapp. «prominent» er hovedknappen, «standard» er den
   sekundære og «subtle» den diskré. Alle i stor utgave, for målgruppa
   er over 60 og trykkflata skal være romslig. */
function kpKnapp(tekst, data, variant = 'prominent', ikon = '') {
  return `<button type="button" class="hb-button hb-button--${variant} hb-button--l" ${data}>
    <span class="hb-button-text">${tekst}</span>${ikon ? `<span class="hb-button-icon kp-ikon" data-ikon="${ikon}"></span>` : ''}
  </button>`;
}

/* Svaralternativene er Fasadens radioknapp og avkryssingsboks, satt opp
   slik felt-radio og felt-checkboxgruppe gjør det: en liste i et
   fieldset, med input, og etiketten i en hb-label ved siden av.
   Alternativer med «vis» tas bare med når betingelsen er oppfylt.

   Et alternativ med «under» hører til et annet alternativ, og står i
   en egen liste inni det, slik Fasadens avkrysning på to nivåer gjør
   det. Da står det innrykket rett under svaret som fikk det fram. */
function kpValgHtml(navn, valg, type, gjeldende, legend) {
  const flertall = type === 'flervalg';
  const valgt = flertall ? (Array.isArray(gjeldende) ? gjeldende : []) : gjeldende;
  const synlige = valg.filter(v => !v.vis || v.vis(S));

  const rad = v => {
    const id = `valg-${navn}-${v.v}`;
    const av = flertall ? valgt.includes(v.v) : valgt === v.v;
    const barn = synlige.filter(b => b.under === v.v);
    return `
      <li>
        <input class="${flertall ? 'hb-checkbox' : 'hb-radiobutton'}" id="${id}"
               type="${flertall ? 'checkbox' : 'radio'}" name="${navn}" value="${v.v}"
               ${av ? 'checked' : ''} ${v.alene ? 'data-alene="1"' : ''}>
        <div class="hb-label">
          <label class="hb-label-tekst" for="${id}">${v.tittel}</label>
          ${v.desc ? `<p class="hb-felt-beskrivelse--alternativ">${v.desc}</p>` : ''}
        </div>
        ${barn.length ? `<ul class="hb-feltliste kp-underliste">${barn.map(rad).join('')}</ul>` : ''}
      </li>`;
  };

  return `
  <fieldset class="hb-felt ${flertall ? 'hb-felt-checkboxgruppe' : 'hb-felt-radio'}">
    <legend class="hb-screenreader-only">${legend}</legend>
    <ul class="hb-feltliste">
      ${synlige.filter(v => !v.under).map(rad).join('')}
    </ul>
  </fieldset>`;
}

/* Et felt med egen ledetekst, slik delspørsmålene 1a og 1b og
   oppfølgingen 5b står. Ledeteksten er Fasadens hb-legend. */
function kpDelfeltHtml(navn, ledetekst, hjelp, valg, type, gjeldende) {
  return `
  <div class="hb-felt kp-felt" data-felt="${navn}">
    <div class="hb-fieldset">
      <div class="hb-legend"><span class="hb-legend-tekst" aria-hidden="true">${ledetekst}</span></div>
      ${kpAvsnitt(hjelp)}
      ${kpValgHtml(navn, valg, type, gjeldende, ledetekst)}
    </div>
  </div>`;
}

/* ═══ Flyten ══════════════════════════════════════════════════════ */

function kpByggFlyt() {
  KP_FLYT = [];
  KOMPASS_ETAPPER.forEach((e, i) => {
    KP_FLYT.push({ t: 'etappe', e, nr: i + 1 });
    KOMPASS_SPORSMAL.filter(s => s.etappe === e.id).forEach(sp => KP_FLYT.push({ t: 'sp', sp, e }));
    KP_FLYT.push({ t: 'etappeslutt', e, nr: i + 1 });
  });
  KP_FLYT.push({ t: 'slutt' });
}

const kpAntallSporsmal = () => KOMPASS_SPORSMAL.length;
const kpSporsmalNr = pos => KP_FLYT.slice(0, pos + 1).filter(f => f.t === 'sp').length;

function kpBesvart(sp) {
  if (sp.type === 'flerfelt') return sp.felt.every(f => S[f.navn] !== undefined);
  if (sp.type === 'flervalg') return Array.isArray(S[sp.id]) && S[sp.id].length > 0;
  return S[sp.id] !== undefined;
}

/* ═══ Startsiden ══════════════════════════════════════════════════
   Designkritikken: «Hvem er boligkompasset for? Og hvorfor skal de
   ta veilederen? Hva får de ut av det?» og «Forsiden viser ikke
   verdien». Derfor tre korte svar, og et kompass du kan klikke på for
   å se hvor kartleggingen kan føre.

   Listevisningen er tatt bort. I stedet ligger papirutgaven her, for
   dem som heller vil fylle ut med penn, for eksempel sammen med en
   ergoterapeut.
   ─────────────────────────────────────────────────────────────────── */

const KP_PAPIR_PDF = 'assets/pdf/boligkompasset-papirutgave.pdf';

function kpStartHtml() {
  const paabegynt = Object.keys(S).some(k => !['modus', 'endret', 'svarerFor', 'startet', 'posisjon'].includes(k));
  const kurs = kpBeregnKurs();

  const kursKnapp = kode => {
    const k = KOMPASS_RETNINGER[kode];
    const piler = { N: 0, Ø: 90, S: 180, V: 270 };
    return `
    <button type="button" class="kp-kurs" data-kurs="${kode}" aria-pressed="false">
      <svg class="kp-kurs__pil" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="18" fill="none" stroke="var(--hb-slate-200)" stroke-width="1.5"/>
        <g style="transform:rotate(${piler[kode]}deg);transform-origin:20px 20px">
          <path d="M20 5 L25 24 L20 20 L15 24 Z" fill="var(--hb-green-700)"/>
        </g>
      </svg>
      <span>
        <span class="kp-kurs__navn">${k.navn}</span>
        <span class="kp-kurs__kort">${k.kort}</span>
      </span>
    </button>`;
  };

  return `
<section class="hb-section kp-hero">
  <div class="hb-shell hb-shell--wide">
    <div class="kp-hero__rad">
      <div>
        <h1 class="hb-h1 kp-h1">Boligkompasset</h1>
        <p class="hb-text--ingress kp-ingress">
          Svar på ${kpAntallSporsmal()} spørsmål om boligen du bor i nå. Du får vite hvor godt den
          passer deg i dag, hva som skal til for at den fortsatt passer om ti år,
          og hvem som kan betale for det. Det tar 5–10 minutter.
        </p>
        <p class="hb-text--sm hb-mb--none">
          Du trenger ikke logge inn. Ingenting sendes til Husbanken før du selv velger det.
        </p>
      </div>
      <img class="kp-hero__ill" src="assets/img/boligkompasset.svg" alt=""
           width="260" height="200">
    </div>
  </div>
</section>

<section class="hb-section">
  <div class="hb-shell hb-shell--wide">

    ${paabegynt ? `
    <div class="hb-callout hb-callout--info kp-callout">
      <div class="hb-callout-body">
        <h2 class="hb-callout-title">Du har begynt før</h2>
        <div class="hb-callout-content">
          <p>
            Svarene dine ligger lagret fra ${S.endret ? kpKlokke(S.endret) : 'sist'}.
            Du kan fortsette der du slapp, eller begynne på nytt.
          </p>
          <div class="kp-knapper">
            ${kpKnapp('Fortsett der jeg slapp', 'data-fortsett')}
            ${kpKnapp('Begynn på nytt', 'data-nullstill', 'subtle')}
          </div>
        </div>
      </div>
    </div>` : ''}

    <div class="kp-modus">
      <div class="hb-card kp-modus__kort kp-modus__kort--anbefalt">
        <div class="hb-card-header"><h2 class="hb-card-tittel">På skjerm, med kompasset</h2></div>
        <div class="hb-card-body">
          <p>
            Ett spørsmål om gangen, i ${KOMPASS_ETAPPER.length} steg. Etter hvert steg ser du
            hvor kompassnåla peker, og til slutt får du en oppsummering med
            tiltakene i prioritert rekkefølge.
          </p>
          <p class="hb-text--semibold">${KOMPASS_ETAPPER.length} steg · ${kpAntallSporsmal()} spørsmål · 5–10 minutter</p>
        </div>
        <div class="hb-card-footer">
          ${kpKnapp('Start kartleggingen', 'data-start="kompass"', 'prominent', 'pil')}
        </div>
      </div>
      <div class="hb-card kp-modus__kort">
        <div class="hb-card-header"><h2 class="hb-card-tittel">På papir</h2></div>
        <div class="hb-card-body">
          <p>
            Alle spørsmålene og svaralternativene på et skjema du skriver ut og
            krysser av med penn. Fint hvis du vil gå gjennom boligen sammen med
            noen, for eksempel en ergoterapeut eller en pårørende.
          </p>
          <p class="hb-text--semibold">PDF · A4 · ${kpAntallSporsmal()} spørsmål</p>
        </div>
        <div class="hb-card-footer">
          <a class="hb-button hb-button--standard hb-button--l" href="${KP_PAPIR_PDF}" target="_blank" rel="noopener">
            <span class="hb-button-text">Åpne papirutgaven (PDF)</span>
            <span class="hb-screenreader-only">, åpnes i nytt vindu</span>
          </a>
        </div>
      </div>
    </div>

    <ul class="kp-tre">
      <li class="hb-card">
        <h2 class="hb-h4">Hvem er det for?</h2>
        <p class="hb-text--sm hb-mb--none">
          Deg som er rundt 60 år eller eldre og bor hjemme, og som vil vite hva
          boligen din tåler av årene som kommer. Er du pårørende, kan du gå
          gjennom spørsmålene sammen med den det gjelder.
        </p>
      </li>
      <li class="hb-card">
        <h2 class="hb-h4">Hvorfor gjøre det nå?</h2>
        <p class="hb-text--sm hb-mb--none">
          De fleste venter til noe har skjedd. Da haster det, valgene er færre,
          og det blir dyrere. Gjør du det mens alt går greit, velger du selv
          både løsning og tidspunkt.
        </p>
      </li>
      <li class="hb-card">
        <h2 class="hb-h4">Hva får du?</h2>
        <p class="hb-text--sm hb-mb--none">
          En kurs som sier hvor du står, tiltakene dine i prioritert rekkefølge,
          hvilke tilskudd og lån som kan dekke dem, og hvem du skal ringe.
          Alt kan skrives ut.
        </p>
      </li>
    </ul>

    <div class="hb-panel hb-panel--noytral kp-veier">
      <div>
        <h2 class="hb-h2">Kartleggingen kan føre fire veier</h2>
        <p>
          Kompasset er ikke en karakter. Det er en peiling. Etter hvert steg ser du
          hvor nåla står, og til slutt peker den mot den kursen som passer
          boligen din. Trykk på en retning for å se hva den betyr.
        </p>
        <div class="kp-kurser">
          ${['N', 'Ø', 'V', 'S'].map(kursKnapp).join('')}
        </div>
        <p class="hb-text--sm hb-text--secondary kp-kursforklaring" id="kurs-forklaring">
          Nåla under står i ro til du begynner å svare.
        </p>
      </div>
      <div>
        <div class="kp-kompass-stort" id="start-kompass">${kpKompassSvg(kurs)}</div>
      </div>
    </div>

  </div>
</section>`;
}

/* ═══ Framdriften ═════════════════════════════════════════════════
   Fasadens progress stepper viser de fire stegene, og Fasadens
   progressbar under viser hvor langt du er kommet i spørsmålene.
   Telleren teller spørsmål, ett hakk per spørsmål.

   Linja tegnes på nytt for hver skjerm, og da spilte Fasadens animasjon
   av det aktive steget hver gang, også mellom to spørsmål i samme steg.
   Nå får den bare spille når du går videre til et nytt steg.
   ─────────────────────────────────────────────────────────────────── */

let kpForrigeSteg = null;

function kpFramdriftHtml() {
  const f = KP_FLYT[kpPos];
  const totalt = kpAntallSporsmal();
  const nr = kpSporsmalNr(kpPos);
  const etappeNr = f.t === 'slutt' ? KOMPASS_ETAPPER.length
    : KOMPASS_ETAPPER.findIndex(e => e.id === f.e.id) + 1;
  const pst = f.t === 'slutt' ? 100 : Math.round((nr / totalt) * 100);
  const teller = f.t === 'sp' ? `Spørsmål ${nr} av ${totalt}`
    : `${nr} av ${totalt} spørsmål besvart`;
  const nyttSteg = kpForrigeSteg !== null && etappeNr > kpForrigeSteg;
  kpForrigeSteg = etappeNr;

  return `
<div class="kp-framdrift kp-utskrift-skjul${nyttSteg ? '' : ' kp-framdrift--rolig'}">
  <div class="hb-shell">
    <div class="hb-progress-stepper">
      <nav class="hb-progress-stepper-nav" aria-label="Stegene i Boligkompasset">
        <ol class="hb-progress-stepper-list">
          ${KOMPASS_ETAPPER.map((e, i) => {
            const ferdig = i + 1 < etappeNr, aktiv = i + 1 === etappeNr;
            return `
          <li class="hb-progress-stepper-list-item${ferdig ? ' hb-is-valid' : ''}${aktiv ? ' hb-is-active' : ''}">
            <span class="hb-progress-stepper-valg${!ferdig && !aktiv ? ' hb-progress-stepper--deactivated' : ''}"${aktiv ? ' aria-current="step"' : ''}>
              <span class="hb-icon hb-icon--size400 hb-icon--encapsulated" aria-hidden="true"><span class="hb-text--lg">${i + 1}</span></span>
              <span class="hb-progress-stepper-list-item-text">${e.navn}</span>
            </span>
          </li>`;
          }).join('')}
        </ol>
      </nav>
      <p class="kp-framdrift__steg">
        <span class="hb-text--semibold">Steg ${etappeNr} av ${KOMPASS_ETAPPER.length}</span>
        · ${f.t === 'slutt' ? 'Oppsummering' : f.e.navn}
      </p>
    </div>
    <div class="kp-framdrift__bunn">
      <div class="hb-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${pst}" aria-label="${teller}">
        <div class="hb-progress-bar-value" style="width:${pst}%"></div>
      </div>
      <span class="kp-framdrift__teller">${teller}</span>
    </div>
  </div>
</div>`;
}

/* ═══ Etappeskjermen ══════════════════════════════════════════════ */

const KP_ETAPPEFIG = {
  hus: '<path d="M8 40 L48 12 L88 40 M18 34 V84 H78 V34" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
  kart: '<circle cx="48" cy="38" r="16" fill="none" stroke="currentColor" stroke-width="5"/><path d="M48 12a26 26 0 0 1 26 26c0 18-26 48-26 48S22 56 22 38A26 26 0 0 1 48 12Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>',
  dor: '<rect x="24" y="12" width="48" height="76" rx="3" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="60" cy="52" r="4" fill="currentColor"/>',
  rom: '<rect x="10" y="14" width="76" height="72" rx="4" fill="none" stroke="currentColor" stroke-width="5"/><path d="M48 14v72M10 52h38" fill="none" stroke="currentColor" stroke-width="5"/>'
};

/* Overtittel over H1, Fasadens hb-h1-overtittel. Den ligger inni
   overskrifta, slik at skjermleseren får med seg begge delene, og i
   samme rekkefølge som øyet ser dem. Spørsmålene er lange setninger,
   så de settes i h2-størrelse, selv om de er sidas h1. */
const kpTittel = (over, tittel, storrelse = 'hb-h1') =>
  `<h1 class="${storrelse} kp-tittel"><small class="hb-h1-overtittel">${over}</small> ${tittel}</h1>`;

function kpNavHtml(neste, forrige = true) {
  return `
  <div class="kp-nav">
    ${forrige ? kpKnapp('Forrige', 'data-forrige', 'standard') : '<span></span>'}
    ${kpKnapp(neste, 'data-neste', 'prominent', 'pil')}
  </div>`;
}

function kpEtappeHtml(f) {
  return `
<div class="kp-sporsmal">
  <div class="hb-card kp-etappe-kort">
    <svg class="kp-etappe-kort__fig" viewBox="0 0 96 96" aria-hidden="true">
      ${KP_ETAPPEFIG[f.e.ikon] || ''}
    </svg>
    ${kpTittel(`Steg ${f.nr} av ${KOMPASS_ETAPPER.length}`, f.e.navn)}
    <div class="kp-etappe-kort__ingress">${kpAvsnitt(f.e.ingress, 'hb-text--ingress')}</div>
  </div>
  ${kpNavHtml(f.nr === 1 ? 'Til første spørsmål' : 'Fortsett', kpPos > 0)}
</div>`;
}

/* ═══ Etappeoppsummeringen ════════════════════════════════════════
   Her, og bare her, vises kompasset underveis. Etter hvert steg
   stopper vi opp og viser hva svarene i steget samlet peker mot.
   ─────────────────────────────────────────────────────────────────── */

function kpEtappeTelling(etappeId) {
  let god = 0, midt = 0, tung = 0;
  kpEnheter().filter(u => u.sp.etappe === etappeId).forEach(({ sp, felt }) => {
    const p = kpPoengFor(sp, felt);
    if (!p) return;
    if (p.n > 0.33) god++; else if (p.n < -0.33) tung++; else midt++;
  });
  return { god, midt, tung, sum: god + midt + tung };
}

function kpEtappeSetning(e, tall) {
  if (!tall.sum) return 'Du svarte ikke på noe i dette steget som teller i kursen.';
  const ord = n => ['ingen', 'ett', 'to', 'tre', 'fire', 'fem', 'seks', 'sju'][n] || String(n);
  const deler = [];
  if (tall.god) deler.push(`${ord(tall.god)} taler for at boligen passer for deg`);
  if (tall.tung) deler.push(`${ord(tall.tung)} peker på en hindring`);
  if (tall.midt) deler.push(`${ord(tall.midt)} trekker ingen vei`);
  const liste = deler.length > 1
    ? deler.slice(0, -1).join(', ') + ' og ' + deler[deler.length - 1]
    : deler[0];
  return `Av ${ord(tall.sum)} svar som teller i dette steget, ${liste}.`;
}

function kpEtappeSluttHtml(f) {
  const kurs = kpBeregnKurs(f.e.id);
  const tall = kpEtappeTelling(f.e.id);
  const info = KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT;
  const sisteEtappe = f.nr === KOMPASS_ETAPPER.length;

  return `
<div class="kp-sporsmal">
  ${kpTittel('Slik ser det ut', f.e.navn)}
  <p class="kp-sporsmal__under">
    Her står nåla slik svarene i dette steget samlet sett peker.
    ${sisteEtappe ? 'Den samlede kursen får du på neste side.' : 'Neste steg begynner på null igjen.'}
  </p>

  <div class="hb-card kp-peiling">
    <div class="kp-peiling__hoved">
      <div class="kp-peiling__rose">${kpKompassSvg(kurs)}</div>
      <div>
        <p class="hb-text--sm hb-text--secondary hb-mb--none">Dette steget peker mot</p>
        <p class="kp-peiling__kurs">${kurs.tom ? 'Ikke besvart' : info.navn}</p>
        <p class="kp-peiling__tekst">${kurs.tom ? '' : info.tekst}</p>
        <p class="hb-text--sm hb-mb--none">${kpEtappeSetning(f.e, tall)}</p>
      </div>
    </div>
    ${kpNokkelHtml(kurs.retning)}
  </div>

  ${kpNavHtml(sisteEtappe ? 'Se hele oppsummeringen' : 'Videre til neste steg')}
</div>`;
}

/* Nøkkelen til de fire retningene. Den står under kompasset hver
   eneste gang det vises, for man skal aldri måtte huske hva en kurs
   betydde fra forsiden. */
const KP_NOKKEL = [
  { kode: 'N', grader: 0   },
  { kode: 'Ø', grader: 90  },
  { kode: 'V', grader: 270 },
  { kode: 'S', grader: 180 }
];

function kpNokkelHtml(retning) {
  return `
  <div class="kp-nokkel">
    <p class="kp-nokkel__tittel">Slik leser du kompasset</p>
    <ul>
      ${KP_NOKKEL.map(p => {
        const k = KOMPASS_RETNINGER[p.kode];
        const naa = retning === p.kode;
        return `
      <li class="kp-nokkel__rad"${naa ? ' data-naa="true"' : ''}>
        <svg class="kp-nokkel__pil" viewBox="0 0 24 24" aria-hidden="true">
          <g style="transform:rotate(${p.grader}deg);transform-origin:12px 12px">
            <path d="M12 20V5m0 0-5 5m5-5 5 5" fill="none" stroke="currentColor"
                  stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
        </svg>
        <span><strong>${k.navn}.</strong> ${k.kort}.</span>
      </li>`;
      }).join('')}
    </ul>
  </div>`;
}

/* ═══ Spørsmålsskjermen ═══════════════════════════════════════════
   Spørsmålet er overskriften, hjelpeteksten står rett under, og så
   kommer svarene. Kompasset vises ikke her lenger. Én nål som flytter
   seg for hvert svar, var vanskelig å lese noe ut av, og den tok
   oppmerksomheten bort fra spørsmålet.
   ─────────────────────────────────────────────────────────────────── */

function kpFelterHtml(sp) {
  if (sp.type === 'flerfelt') {
    return sp.felt.map(felt =>
      kpDelfeltHtml(felt.navn, felt.ledetekst, felt.hjelp, felt.valg, 'enkelt', S[felt.navn])).join('');
  }
  return `
  <div class="hb-felt kp-felt">
    ${kpValgHtml(sp.id, sp.valg, sp.type === 'flervalg' ? 'flervalg' : 'enkelt', S[sp.id], sp.tittel)}
  </div>
  ${kpBetingetHtml(sp)}`;
}

/* Oppfølgingen arket merker *BETINGET VIDERE, som 5b «Hvor ligger
   toalettet?». Den står i en innrykket blokk under svarene. */
function kpBetingetHtml(sp) {
  const b = sp.betinget;
  if (!b || !b.naar(S)) return '';
  return `
  <div class="kp-oppfolging" id="betinget-${sp.id}">
    ${kpDelfeltHtml(b.navn, b.ledetekst, b.hjelp, b.valg, 'enkelt', S[b.navn])}
  </div>`;
}

function kpSporsmalHtml(f) {
  const sp = f.sp;
  const nr = kpSporsmalNr(kpPos);
  return `
<div class="kp-sporsmal">
  ${kpTittel(`Spørsmål ${nr} av ${kpAntallSporsmal()}`, sp.tittel, 'hb-h2')}
  <div class="kp-hjelp">${kpAvsnitt(sp.hjelp)}</div>
  ${sp.undertekst ? `<p class="hb-text--semibold kp-sporsmal__under">${sp.undertekst}</p>` : ''}

  <form id="sporsmalsform" novalidate>
    ${kpFelterHtml(sp)}
  </form>

  ${kpNavHtml(nr === kpAntallSporsmal() ? 'Se oppsummeringen av steget' : 'Neste')}
</div>`;
}

/* Når et svar endrer hvilke alternativer eller oppfølginger som skal
   vises, tegnes svarene på nytt. Fokus settes tilbake på det du nettopp
   trykket på, så tastatur og skjermleser ikke mister plassen. */
function kpTegnSvarPaaNytt(sp, fokusId) {
  const skjema = document.getElementById('sporsmalsform');
  if (!skjema) return;
  skjema.innerHTML = kpFelterHtml(sp);
  const el = fokusId && document.getElementById(fokusId);
  if (el) el.focus({ preventScroll: true });
}

/* ═══ Anbefalingene ═══════════════════════════════════════════════ */

function kpAnbefalinger() {
  return KOMPASS_ANBEFALINGER
    .filter(a => { try { return a.naar(S); } catch { return false; } })
    .sort((a, b) => a.prioritet - b.prioritet);
}

/* Oversikten per etappe, «den totaloversikten med bar» */
function kpOversikt() {
  return KOMPASS_ETAPPER.filter(e => !e.frivillig).map(e => {
    let god = 0, midt = 0, tung = 0;
    kpEnheter().filter(u => u.sp.etappe === e.id).forEach(({ sp, felt }) => {
      const p = kpPoengFor(sp, felt);
      if (!p) return;
      if (p.n > 0.33) god++; else if (p.n < -0.33) tung++; else midt++;
    });
    const sum = god + midt + tung;
    const kurs = kpBeregnKurs(e.id);
    const dom = !sum ? 'Ikke besvart'
      : tung === 0 && god >= midt ? 'Fungerer godt'
      : tung >= god ? 'Her ligger hindringene'
      : 'Noe å se på';
    return { navn: e.navn, god, midt, tung, sum, dom, kurs };
  });
}

/* Ett kompass per etappe, ved siden av stolpen. Nåla underveis viste
   bare ett spørsmål om gangen, så her er stedet der man ser hvor hver
   kategori endte. */
function kpOversiktHtml() {
  const rader = kpOversikt();
  return `
  <h3 class="hb-h4">Steg for steg</h3>
  <ul class="kp-etappekort">
    ${rader.map(r => {
      const info = KOMPASS_RETNINGER[r.kurs.retning] || KOMPASS_RETNINGER.MIDT;
      return `
    <li class="kp-etappekort__kort">
      <div class="kp-etappekort__rose">${kpKompassSvg(r.kurs, { liten: true })}</div>
      <p class="kp-etappekort__navn">${r.navn}</p>
      <p class="kp-etappekort__kurs">${r.sum ? info.navn : 'Ikke besvart'}</p>
      <span class="kp-oversikt__spor" role="img"
            aria-label="${r.navn}: ${r.god} svar som fungerer godt, ${r.midt} midt på treet, ${r.tung} som peker på en hindring.">
        ${r.sum ? `
        <span class="kp-oversikt__seg kp-oversikt__seg--god"  style="width:${(r.god / r.sum * 100).toFixed(1)}%"></span>
        <span class="kp-oversikt__seg kp-oversikt__seg--midt" style="width:${(r.midt / r.sum * 100).toFixed(1)}%"></span>
        <span class="kp-oversikt__seg kp-oversikt__seg--tung" style="width:${(r.tung / r.sum * 100).toFixed(1)}%"></span>` : ''}
      </span>
    </li>`;
    }).join('')}
  </ul>
  <p class="kp-tegnforklaring">
    <span><i style="background:var(--hb-green-600)"></i>Fungerer godt</span>
    <span><i style="background:var(--hb-slate-300)"></i>Midt på treet</span>
    <span><i style="background:#c0560a"></i>Hindring</span>
  </p>`;
}

/* ═══ Oppsummeringen ══════════════════════════════════════════════
   Designkritikken var hardest her: «siste siden er den dårligste»,
   «trenger mer kjærlighet», «bør være mer visuell», «mangler
   totaloversikten med bar», «bedre oppsummering med henvisning
   videre». Siden er bygget om rundt fire deler: kursen, oversikten,
   tiltakene i rekkefølge, og veien videre.
   ─────────────────────────────────────────────────────────────────── */

/* ═══ Oppsummeringen ══════════════════════════════════════════════
   Bygget etter skissen: handlingsplan i to spalter, generelle
   anbefalinger delt i nå og fremtiden, og ressursene til slutt.
   Alt holdt så kort som mulig i høyden, for dette er siden folk skal
   kunne skumme og skrive ut.
   ─────────────────────────────────────────────────────────────────── */

/* Hva som fungerer og hva som ikke gjør det, ett stikkord per
   spørsmål. Grensa er den samme som avgjør om et svar drar nåla
   oppover eller nedover. */
function kpHandlingsplan() {
  const funker = [], funkerIkke = [];
  kpEnheter().forEach(({ sp, felt }) => {
    if (!sp.stikkord) return;
    const p = kpPoengFor(sp, felt);
    if (!p) return;
    (kpGraderNed(p.n) <= 0 ? funker : funkerIkke).push(sp);
  });
  return { funker, funkerIkke };
}

function kpOppsummeringHtml() {
  const kurs = kpBeregnKurs();
  const info = KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT;
  const anb = kpAnbefalinger();
  const naa = anb.filter(a => a.storrelse === 'liten');
  const frem = anb.filter(a => a.storrelse === 'stor');
  const plan = kpHandlingsplan();
  const ubesvart = kpAntallSporsmal() - KOMPASS_SPORSMAL.filter(kpBesvart).length;

  /* Ordningene som er nevnt i tiltakene, uten gjentakelser */
  const ordninger = [...new Set([].concat(...anb.map(a => a.ordninger)))];

  const tiltaksrad = a => {
    const hvorfor = typeof a.hvorfor === 'function' ? a.hvorfor(S) : a.hvorfor;
    const tekst = typeof a.tekst === 'function' ? a.tekst(S) : a.tekst;
    return `
    <li class="kp-plan__tiltak">
      <button type="button" class="kp-mer" aria-expanded="false" data-mer="t-${a.id}">
        <span data-ikon="chevron"></span>${a.tittel}
      </button>
      <div class="kp-mer-panel" id="t-${a.id}" hidden>
        <p style="margin:0 0 var(--space-2)">${tekst}</p>
        <p class="hb-text--sm hb-mb--none"><strong>Derfor står det her:</strong> ${hvorfor}</p>
        ${a.tiltak.length ? `<ul class="kp-merkeliste">
          ${a.tiltak.map(t => `<li class="kp-merke">${t}. ${KOMPASS_TILTAK[t]}</li>`).join('')}
        </ul>` : ''}
      </div>
    </li>`;
  };

  return `
<div class="kp-utskrift-topp">
  <h1>Boligkompasset</h1>
  <p>Oppsummering for boligen din.
     Skrevet ut ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}.
     Husbanken, telefon ${HB_REGLER.telefon}.</p>
</div>

<section class="hb-section" style="padding-top:var(--space-4)">
  <div class="hb-shell">

    <p class="kp-utskrift-skjul" style="margin-bottom:var(--space-2)">
      <button type="button" class="hb-button hb-button--link kp-tilbake" data-tilbake-svar>
        <span class="hb-button-icon kp-ikon kp-ikon--venstre" data-ikon="pil"></span><span class="hb-button-text">Gå tilbake og endre svar</span>
      </button>
    </p>

    <h1 class="hb-h1 kp-h1 kp-utskrift-skjul">Oppsummering</h1>

    <h2 class="hb-h2">1. Handlingsplan</h2>
    <div class="kp-plan">
      <div class="kp-plan__kol kp-plan__kol--ja">
        <h3 class="hb-h4">Hva funker i dag</h3>
        ${plan.funker.length ? `<ul>
          ${plan.funker.map(sp => `<li><span class="kp-plan__merke" aria-hidden="true">✓</span>${sp.stikkord}</li>`).join('')}
        </ul>` : '<p class="hb-text--sm hb-text--secondary">Ingen av svarene dine peker denne veien ennå.</p>'}
      </div>
      <div class="kp-plan__kol kp-plan__kol--nei">
        <h3 class="hb-h4">Hva funker ikke</h3>
        ${plan.funkerIkke.length ? `
        <ul>
          ${plan.funkerIkke.slice(0, 3).map(sp => `<li>
            <span class="kp-plan__merke" aria-hidden="true">✕</span>
            <span>${sp.stikkord}<span class="kp-plan__grep">${sp.grep}</span></span>
          </li>`).join('')}
        </ul>
        ${plan.funkerIkke.length > 3 ? `
        <button type="button" class="kp-mer" aria-expanded="false" data-mer="flere-hindringer">
          <span data-ikon="chevron"></span>Se de ${plan.funkerIkke.length - 3} andre
        </button>
        <div class="kp-mer-panel" id="flere-hindringer" hidden>
          <ul>
            ${plan.funkerIkke.slice(3).map(sp => `<li>
              <span class="kp-plan__merke" aria-hidden="true">✕</span>
              <span>${sp.stikkord}<span class="kp-plan__grep">${sp.grep}</span></span>
            </li>`).join('')}
          </ul>
        </div>` : ''}`
        : '<p class="hb-text--sm hb-text--secondary">Ingenting av det du svarte peker på en hindring.</p>'}
      </div>
    </div>

    <h2 class="hb-h2 kp-seksjon">2. Generelle anbefalinger</h2>
    <div class="kp-plan">
      <div class="kp-plan__kol">
        <h3 class="hb-h4">Nå</h3>
        ${naa.length
          ? `<ul class="kp-plan__liste">${naa.map(tiltaksrad).join('')}</ul>`
          : '<p class="hb-text--sm hb-text--secondary">Ingen enkle grep peker seg ut.</p>'}
      </div>
      <div class="kp-plan__kol">
        <h3 class="hb-h4">Fremtiden, 5–10 år</h3>
        ${frem.length
          ? `<ul class="kp-plan__liste">${frem.map(tiltaksrad).join('')}</ul>`
          : '<p class="hb-text--sm hb-text--secondary">Ingen større arbeider peker seg ut nå.</p>'}
      </div>
    </div>

    <h2 class="hb-h2 kp-seksjon">3. Ressurser</h2>
    <ul class="kp-ressurser">
      ${ordninger.map(o => {
        const ord = KOMPASS_ORDNINGER[o];
        return `<li><a class="kp-ressurs" href="${ord.lenke}">
          <span>${ord.navn}</span><span data-ikon="pil"></span>
        </a></li>`;
      }).join('')}
      <li><a class="kp-ressurs" href="tel:${HB_REGLER.telefonRaw}">
        <span>Ring Husbanken, ${HB_REGLER.telefon}</span><span data-ikon="pil"></span>
      </a></li>
    </ul>

    <h2 class="hb-h2 kp-seksjon">4. Kursen din</h2>
    <div class="kp-resultat">
      <div class="kp-resultat__topp">
        <div class="kp-kompass-stort">${kpKompassSvg(kurs)}</div>
        <div>
          <p class="kp-resultat__kurs">Kompasset peker mot</p>
          <p class="kp-resultat__navn">${info.navn}</p>
          <p class="kp-resultat__tekst">${info.tekst}</p>
          ${ubesvart ? `<p class="hb-text--sm hb-text--secondary hb-mb--none">
            ${ubesvart} av ${kpAntallSporsmal()} spørsmål står ubesvart.</p>` : ''}
        </div>
      </div>
      <div class="kp-resultat__bunn">
        ${kpOversiktHtml()}
      </div>
    </div>

    ${kpEgenKursHtml()}

    <div class="kp-utskrift-notat">
      <strong>Plass til dine egne notater</strong>
    </div>

    <div class="kp-knapper kp-seksjon kp-utskrift-skjul">
      ${kpKnapp('Skriv ut eller lagre som PDF', 'data-skriv-ut')}
      ${kpKnapp('Endre svarene mine', 'data-tilbake-svar', 'standard')}
      ${kpKnapp('Start på nytt', 'data-nullstill', 'standard')}
    </div>

    <details class="kp-svardetaljer kp-utskrift-skjul">
      <summary>Se alle svarene dine</summary>
      <div class="hb-summary hb-summary--flat">${kpSvarlisteHtml()}</div>
    </details>

  </div>
</section>`;
}

/* ═══ Kompasset du vrir selv ══════════════════════════════════════
   Kompasset over er regnet ut av svarene. Men den som bor der, vet
   noe et regnestykke ikke får tak i. Her kan man vri nåla dit man
   selv føler at man står, og se de to ved siden av hverandre.

   Nåla kan dras med mus eller finger, og skyvekontrollen under gjør
   det samme med tastatur. Målgruppen er 62+, og en sirkel man må
   treffe er ikke nok alene.
   ─────────────────────────────────────────────────────────────────── */

function kpEgenKursHtml() {
  const grader = Number.isFinite(S.egenKurs) ? S.egenKurs : 0;
  const kurs = kpKursAvGrader(grader);
  const regnet = kpBeregnKurs();

  return `
  <h2 class="hb-h2 kp-seksjon">Vri kompasset selv</h2>
  <p style="max-width:58ch;margin-bottom:0">
    Kompasset over er regnet ut. Du vet noe det ikke vet. Vri nåla dit du selv
    føler at du står.
  </p>

  <div class="kp-egen" id="kp-egen">
    <div class="kp-egen__rose" data-egen-rose>
      ${kpKompassSvg(kurs)}
    </div>
    <div>
      <p class="hb-text--sm hb-text--secondary hb-mb--none">Du peker mot</p>
      <p class="kp-peiling__kurs" data-egen-navn>${kpKursnavn(kurs.retning)}</p>
      <p class="kp-peiling__tekst" data-egen-tekst>${(KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT).tekst}</p>

      <label class="kp-egen__merke" for="egen-kurs">Vri kompasset</label>
      <input class="kp-egen__skyv" id="egen-kurs" type="range"
             min="0" max="345" step="15" value="${grader}"
             aria-describedby="egen-avlest">
      <p class="hb-text--sm" id="egen-avlest" aria-live="polite" data-egen-avlest>
        ${kpEgenSammenlikning(kurs.retning, regnet.retning)}
      </p>
      <p style="margin:var(--space-3) 0 0">
        <button type="button" class="hb-button hb-button--link" data-egen-nullstill><span class="hb-button-text">Sett nåla tilbake til vår utregning</span></button>
      </p>
    </div>
  </div>`;
}

function kpKursAvGrader(grader) {
  const rad = grader * Math.PI / 180;
  return { x: Math.sin(rad), y: Math.cos(rad), r: 1, retning: kpRetning(Math.sin(rad), Math.cos(rad), 0.2) };
}

function kpEgenSammenlikning(egen, regnet) {
  if (egen === regnet) {
    return 'Du og kompasset er enige. Det er et godt utgangspunkt for å snakke med kommunen eller familien.';
  }
  return `Kompasset vårt peker mot «${kpKursnavn(regnet)}», du peker mot «${kpKursnavn(egen)}». `
       + 'Begge deler er verdt å ta med videre. Det du selv kjenner på, veier tungt i et slikt valg.';
}

function kpInitEgenKurs() {
  const boks = document.getElementById('kp-egen');
  if (!boks) return;
  const rose = boks.querySelector('[data-egen-rose]');
  const skyv = boks.querySelector('#egen-kurs');
  const svg = rose.querySelector('svg');
  const naal = rose.querySelector('[data-naal]');

  const tegn = grader => {
    S.egenKurs = ((grader % 360) + 360) % 360;
    const kurs = kpKursAvGrader(S.egenKurs);
    naal.style.transform = `rotate(${S.egenKurs}deg) scale(1)`;
    svg.setAttribute('aria-label', kpKompassTekst(kurs));
    svg.dataset.tom = '0';
    svg.dataset.vei = kpNaalVei(kurs);
    boks.querySelector('[data-egen-navn]').textContent = kpKursnavn(kurs.retning);
    boks.querySelector('[data-egen-tekst]').textContent =
      (KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT).tekst;
    boks.querySelector('[data-egen-avlest]').textContent =
      kpEgenSammenlikning(kurs.retning, kpBeregnKurs().retning);
    const kv = kurs.y >= 0 ? (kurs.x >= 0 ? 'nø' : 'nv') : (kurs.x >= 0 ? 'sø' : 'sv');
    rose.querySelectorAll('[data-kv]').forEach(f => {
      const aktiv = f.dataset.kv === kv;
      f.classList.toggle('kp-kompass__felt--aktiv', aktiv);
      f.setAttribute('fill', aktiv ? 'var(--hb-green-600)' : 'var(--hb-slate-400)');
    });
    kpLagre();
  };

  skyv.addEventListener('input', () => tegn(Number(skyv.value)));

  /* Dra i nåla. Vinkelen regnes fra midten av rosa, ikke av elementet,
     for rosa sitter til venstre i en boks som er bredere enn den. */
  let drar = false;
  const vinkelFra = ev => {
    const b = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const mx = b.left + b.width * (158 / vb.width);
    const my = b.top + b.height * (103 / vb.height);
    const g = Math.atan2(ev.clientX - mx, my - ev.clientY) * 180 / Math.PI;
    return Math.round(((g % 360) + 360) % 360 / 15) * 15;
  };
  const flytt = ev => {
    if (!drar) return;
    ev.preventDefault();
    const g = vinkelFra(ev);
    skyv.value = g % 360;
    tegn(g);
  };
  svg.addEventListener('pointerdown', ev => {
    drar = true;
    svg.setPointerCapture(ev.pointerId);
    flytt(ev);
  });
  svg.addEventListener('pointermove', flytt);
  svg.addEventListener('pointerup', () => { drar = false; });
  svg.addEventListener('pointercancel', () => { drar = false; });

  boks.querySelector('[data-egen-nullstill]').addEventListener('click', () => {
    const k = kpBeregnKurs();
    const g = Math.round((((Math.atan2(k.x, k.y) * 180 / Math.PI) % 360) + 360) % 360 / 15) * 15;
    skyv.value = g % 360;
    tegn(g);
  });

  if (!Number.isFinite(S.egenKurs)) {
    const k = kpBeregnKurs();
    const g = Math.round((((Math.atan2(k.x, k.y) * 180 / Math.PI) % 360) + 360) % 360 / 15) * 15;
    skyv.value = g % 360;
    tegn(g);
  } else {
    tegn(S.egenKurs);
  }
}

/* Svarene settes opp som oppsummeringen i søknaden: én bolk per steg,
   med «Endre» under overskriften, og etikett over verdi med hårstrek
   mellom. Den gamle varianten la «Endre» på egen linje til høyre i
   hver rad, og på mobil ble det en trapp av lenker uten sammenheng
   med teksten over. */

const KP_BLYANT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
  + '<path d="M4 20h4L19 9l-4-4L4 16v4Z" fill="none" stroke="currentColor" '
  + 'stroke-width="1.8" stroke-linejoin="round"/>'
  + '<path d="M14.5 5.5 18.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function kpSvarRader(sp) {
  const tekstFor = (valg, v) => (valg.find(o => o.v === v) || {}).tittel || v;
  if (sp.type === 'flerfelt') {
    return sp.felt.map(f => ({
      sp: f.ledetekst,
      svar: S[f.navn] ? tekstFor(f.valg, S[f.navn]) : null
    }));
  }
  const v = S[sp.id];
  const rader = sp.type === 'flervalg'
    ? [{ sp: sp.tittel,
         svar: Array.isArray(v) && v.length ? v.map(x => tekstFor(sp.valg, x)).join(', ') : null }]
    : [{ sp: sp.tittel, svar: v && v !== 'hoppet' ? tekstFor(sp.valg, v) : null }];
  if (sp.betinget && sp.betinget.naar(S)) {
    const b = sp.betinget;
    rader.push({ sp: b.ledetekst, svar: S[b.navn] ? tekstFor(b.valg, S[b.navn]) : null });
  }
  return rader;
}

function kpSvarlisteHtml() {
  return KOMPASS_ETAPPER.map(e => {
    const sporsmal = KOMPASS_SPORSMAL.filter(x => x.etappe === e.id);
    if (!sporsmal.length) return '';
    const rader = [].concat(...sporsmal.map(kpSvarRader));
    return `
    <div class="hb-summary__group">
      <div class="hb-summary__head">
        <h3>${e.navn}</h3>
        <button type="button" class="hb-summary__edit kp-utskrift-skjul" data-endre="${sporsmal[0].id}">
          ${KP_BLYANT}Endre
        </button>
      </div>
      <dl>
        ${rader.map(r => `
        <div>
          <dt>${r.sp}</dt>
          <dd${r.svar ? '' : ' class="hb-muted"'}>${r.svar ? kpEsc(r.svar) : 'Ikke besvart'}</dd>
        </div>`).join('')}
      </dl>
    </div>`;
  }).join('');
}

/* ═══ Snarveien nederst ═══════════════════════════════════════════
   Bare for prototypen. Fyller ut tilfeldige svar og hopper rett til
   oppsummeringen, så man slipper å klikke seg gjennom alle spørsmålene
   hver gang man skal se på den siste siden.

   Lagringslinja som sto her før, er tatt ut. Svarene lagres fortsatt
   ved hvert eneste valg, den ble bare ikke lenger annonsert.
   ─────────────────────────────────────────────────────────────────── */

function kpTegnBunn() {
  const el = document.getElementById('kp-bunn-verktoy');
  if (!el) return;
  el.innerHTML = `
  <div class="hb-shell">
    <p class="kp-snarvei__tekst">
      <strong>Snarvei for prototypen.</strong>
      Fyller ut tilfeldige svar på alle ${kpAntallSporsmal()} spørsmålene og går rett til oppsummeringen.
    </p>
    ${kpKnapp('Fyll ut tilfeldig og vis oppsummeringen', 'data-tilfeldig', 'standard')}
  </div>`;
}

/* Tilfeldige, men gyldige svar. Flervalg får ett til tre kryss, og
   «ingen av delene» får stå alene slik reglene ellers krever. */
function kpFyllTilfeldig() {
  const trekk = liste => liste[Math.floor(Math.random() * liste.length)];
  S = { startet: true, svarerFor: 'meg' };

  const settFelt = (navn, valg, flervalg) => {
    const synlige = valg.filter(v => !v.vis || v.vis(S));
    if (flervalg) {
      const alene = synlige.filter(v => v.alene);
      if (alene.length && Math.random() < 0.2) { S[navn] = [trekk(alene).v]; return; }
      const vanlige = synlige.filter(v => !v.alene);
      const antall = 1 + Math.floor(Math.random() * Math.min(4, vanlige.length));
      S[navn] = [...vanlige].sort(() => Math.random() - 0.5).slice(0, antall).map(v => v.v);
      return;
    }
    S[navn] = trekk(synlige).v;
  };

  /* I rekkefølge, så betingelsene ser svarene de avhenger av */
  KOMPASS_SPORSMAL.forEach(sp => {
    if (sp.type === 'flerfelt') sp.felt.forEach(f => settFelt(f.navn, f.valg, false));
    else settFelt(sp.id, sp.valg, sp.type === 'flervalg');
    if (sp.betinget && sp.betinget.naar(S)) settFelt(sp.betinget.navn, sp.betinget.valg, false);
  });

  kpLagre();
  kpModus = 'oppsummering';
  kpPos = KP_FLYT.length - 1;
  kpTegn();
}

/* ═══ Tegning ═════════════════════════════════════════════════════ */

function kpTegn() {
  const rot = document.getElementById('kompasset');
  const frem = document.getElementById('kp-framdrift-plass');

  if (kpModus === 'start') {
    frem.innerHTML = '';
    kpForrigeSteg = null;
    rot.innerHTML = kpStartHtml();
  } else if (kpModus === 'oppsummering') {
    frem.innerHTML = '';
    kpForrigeSteg = null;
    rot.innerHTML = kpOppsummeringHtml();
  } else {
    /* Står posisjonen på siste plass i flyten, er kartleggingen ferdig.
       Da hører oppsummeringen hjemme her, ikke en tom skjerm. */
    if (KP_FLYT[kpPos] && KP_FLYT[kpPos].t === 'slutt') { kpModus = 'oppsummering'; return kpTegn(); }
    const f = KP_FLYT[kpPos];
    frem.innerHTML = kpFramdriftHtml();
    rot.innerHTML = `<section class="hb-section" style="padding-top:var(--space-5)">
      <div class="hb-shell">
        ${f.t === 'etappe' ? kpEtappeHtml(f)
          : f.t === 'etappeslutt' ? kpEtappeSluttHtml(f)
          : kpSporsmalHtml(f)}
      </div>
    </section>`;
  }

  kpIkoner(rot);
  kpTegnBunn();
  hbInitTrekkspill(rot);
  if (kpModus === 'oppsummering') kpInitEgenKurs();
  const h = rot.querySelector('h1') || rot.querySelector('h2');
  if (h && kpModus !== 'start') { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function kpIkoner(rot) {
  rot.querySelectorAll('[data-ikon]').forEach(e => {
    if (e.dataset.tegnet) return;
    e.innerHTML = HB_IKON[e.dataset.ikon] || '';
    e.dataset.tegnet = '1';
  });
  rot.querySelectorAll('[data-avatar]').forEach(e => { e.outerHTML = HB_AVATAR; });
}

/* ═══ Svar ════════════════════════════════════════════════════════ */

function kpSettSvar(navn, verdi) {
  S[navn] = verdi;
  kpLagre();
}

function kpLesSkjema(rot) {
  rot.addEventListener('change', ev => {
    const inp = ev.target;
    if (!inp.name) return;

    /* Hvilket spørsmål hører feltet til? Et delfelt (1a, 1b) eller en
       oppfølging (5b) ligger inne i et annet spørsmål. */
    const sp = KOMPASS_SPORSMAL.find(s => s.id === inp.name
      || (s.felt && s.felt.some(f => f.navn === inp.name))
      || (s.betinget && s.betinget.navn === inp.name));
    if (!sp) return;

    if (inp.type === 'checkbox') {
      let verdier = [...rot.querySelectorAll(`input[name="${inp.name}"]:checked`)].map(i => i.value);
      /* «Usikker» utelukker resten, og omvendt */
      if (inp.dataset.alene && inp.checked) {
        verdier = [inp.value];
        rot.querySelectorAll(`input[name="${inp.name}"]`).forEach(i => { if (!i.dataset.alene) i.checked = false; });
      } else if (inp.checked) {
        const alene = [...rot.querySelectorAll(`input[name="${inp.name}"][data-alene]`)];
        alene.forEach(i => { i.checked = false; });
        verdier = verdier.filter(v => !alene.some(i => i.value === v));
      }
      kpSettSvar(inp.name, verdier);
    } else {
      kpSettSvar(inp.name, inp.value);
    }

    /* Alternativer som er tatt bort fordi betingelsen ikke lenger
       gjelder, skal heller ikke stå som svar. */
    if (Array.isArray(S[sp.id]) && sp.valg) {
      const synlige = sp.valg.filter(v => !v.vis || v.vis(S)).map(v => v.v);
      S[sp.id] = S[sp.id].filter(v => synlige.includes(v));
      kpLagre();
    }

    const dynamisk = sp.betinget || (sp.valg || []).some(v => v.vis);
    if (dynamisk && inp.name === sp.id) kpTegnSvarPaaNytt(sp, inp.id);
  });
}

/* ═══ Navigasjon ══════════════════════════════════════════════════ */

function kpGaaTil(pos) {
  kpPos = Math.max(0, Math.min(pos, KP_FLYT.length - 1));
  if (KP_FLYT[kpPos].t === 'slutt') { kpModus = 'oppsummering'; }
  S.posisjon = kpPos;
  kpLagre();
  kpTegn();
}

/* Man kommer videre uansett. Et ubesvart spørsmål teller ikke i
   kursen, og oppsummeringen sier hvor mange som står åpne. Å stoppe
   folk på et spørsmål de ikke vil svare på, er verre enn å mangle
   svaret. */
function kpNeste() {
  kpGaaTil(kpPos + 1);
}

function kpTilSporsmal(id) {
  kpModus = 'kompass';
  const i = KP_FLYT.findIndex(f => f.t === 'sp' && f.sp.id === id);
  kpGaaTil(i >= 0 ? i : 0);
}

function kpNullstill() {
  if (!confirm('Vil du slette svarene og begynne på nytt? Dette kan ikke angres.')) return;
  S = {};
  try { localStorage.removeItem(KP_LAGER); } catch { /* ignorer */ }
  kpPos = 0;
  kpModus = 'start';
  kpTegn();
}

/* ═══ Hendelser ═══════════════════════════════════════════════════ */

function kpKlikk(ev) {
  const t = ev.target.closest('button, a');
  if (!t) return;
  const d = t.dataset;

  if (d.start) {
    S.startet = true; S.svarerFor = S.svarerFor || 'meg';
    kpModus = d.start; kpPos = 0; kpLagre(); kpTegn();
  }
  else if (d.fortsett !== undefined) { kpModus = 'kompass'; kpPos = S.posisjon || 0; kpTegn(); }
  else if (d.nullstill !== undefined) kpNullstill();
  else if (d.neste !== undefined) kpNeste();
  else if (d.forrige !== undefined) kpGaaTil(kpPos - 1);
  else if (d.oppsummering !== undefined) { kpModus = 'oppsummering'; kpLagre(); kpTegn(); }
  else if (d.tilStart !== undefined) { kpModus = 'start'; kpTegn(); }
  else if (d.tilbakeSvar !== undefined) { kpModus = 'kompass'; kpPos = Math.max(0, KP_FLYT.length - 2); kpTegn(); }
  else if (d.endre) kpTilSporsmal(d.endre);
  else if (d.skrivUt !== undefined) window.print();

  else if (d.tilfeldig !== undefined) kpFyllTilfeldig();
  else if (d.mer) {
    const p = document.getElementById(d.mer);
    const aapen = t.getAttribute('aria-expanded') === 'true';
    t.setAttribute('aria-expanded', String(!aapen));
    p.hidden = aapen;
  }
  else if (d.kurs) {
    const k = KOMPASS_RETNINGER[d.kurs];
    document.querySelectorAll('[data-kurs]').forEach(b => b.setAttribute('aria-pressed', String(b === t)));
    document.getElementById('kurs-forklaring').textContent = k.tekst;
    const piler = { N: 0, Ø: 90, S: 180, V: 270 };
    document.getElementById('start-kompass').innerHTML =
      kpKompassSvg({ x: Math.sin(piler[d.kurs] * Math.PI / 180), y: Math.cos(piler[d.kurs] * Math.PI / 180), r: 1, retning: d.kurs });
  }
}

/* ═══ Oppstart ════════════════════════════════════════════════════ */

function kompassStart() {
  S = kpLes();
  kpByggFlyt();
  kpModus = 'start';

  const p = new URLSearchParams(location.search);
  if (p.get('modus') === 'kompass') { kpModus = 'kompass'; kpPos = Math.min(S.posisjon || 0, KP_FLYT.length - 1); }
  if (p.get('vis') === 'oppsummering') kpModus = 'oppsummering';

  const rot = document.getElementById('kompasset');
  document.addEventListener('click', kpKlikk);
  kpLesSkjema(rot);
  kpTegn();
}
