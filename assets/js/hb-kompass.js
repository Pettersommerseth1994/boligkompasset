/* ──────────────────────────────────────────────────────────────────
   Boligkompasset, logikken

   Ett spørsmål om gangen, i fire steg. Kompasset vises etter hvert
   steg, ikke under hvert spørsmål, og til slutt i oppsummeringen.
   Papirutgaven ligger for seg, i boligkompasset-papir.html.

   Komponentene er Fasaden, Husbankens eget designsystem. Alt innhold
   som tegnes her, ligger inne i .fasaden, se fasaden/fasaden.css.
   Ikonene er Fasadens, fra fasaden/fasaden-ikoner.js. Det eneste som
   ikke er en Fasaden-komponent, er kompasset selv og stolpene.
   ────────────────────────────────────────────────────────────────── */

/* Nytt navn da spørsmålene ble byttet ut. De gamle svarene passer
   ikke til de nye spørsmålene, og skal ikke dukke opp som «påbegynt». */
const KP_LAGER = 'hb-boligkompasset-2';

const KP_TELEFON = { tekst: '22 96 16 00', tel: '+4722961600' };

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
           fill="${aktiv ? 'var(--color-green-65)' : 'var(--color-gray-65)'}"/>`;

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
  <circle cx="${cx}" cy="${cy}" r="3.4" fill="var(--color-neutral-100)"/>
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

/* Fasadens ikon, slik hb-icon tegner det. Ikonet er pynt, teksten ved
   siden av sier det samme. */
const kpIkon = (navn, klasse = '', stil = '') =>
  `<span class="hb-icon ${klasse}" aria-hidden="true"${stil ? ` style="${stil}"` : ''}>${FASADEN_IKON[navn] || ''}</span>`;

/* Fasadens knapp. «prominent» er hovedknappen, «standard» er den
   sekundære og «subtle» den diskré. Alle i stor utgave, for målgruppa
   er over 60 og trykkflata skal være romslig. Ikonet står etter
   teksten, eller foran den med «venstre». */
function kpKnapp(tekst, data, variant = 'prominent', ikon = '', venstre = false) {
  const i = ikon ? kpIkon(ikon, 'hb-button-icon') : '';
  return `<button type="button" class="hb-button hb-button--${variant} hb-button--l" ${data}>
    ${venstre ? i : ''}<span class="hb-button-text">${tekst}</span>${venstre ? '' : i}
  </button>`;
}

/* Fasadens knapperad. Navigasjonen nederst på hver skjerm er
   hb-knappesamling-gruppe--navigasjon, som i e-søknaden: hovedknappen
   først i koden, og til høyre for «Forrige» på bred skjerm. */
const kpKnapperad = (knapper, variant = 'horisontal') => `
  <div class="hb-knappesamling">
    <div class="hb-knappesamling-gruppe hb-knappesamling-gruppe--${variant}">
      ${knapper.filter(Boolean).map(k => `<div class="hb-knappesamling-element">${k}</div>`).join('')}
    </div>
  </div>`;

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

  /* Med synlig ledetekst er den Fasadens hb-legend med hb-legend-tekst,
     og hjelpeteksten står mellom ledeteksten og svarene. Uten, som når
     spørsmålet selv er overskriften, er legend bare for skjermleser. */
  return `
  <fieldset class="hb-fieldset hb-felt ${flertall ? 'hb-felt-checkboxgruppe' : 'hb-felt-radio'}">
    ${legend.synlig
      ? `<legend class="hb-legend"><span class="hb-legend-tekst">${legend.tekst}</span></legend>${kpAvsnitt(legend.hjelp)}`
      : `<legend class="hb-screenreader-only">${legend.tekst}</legend>`}
    <ul class="hb-feltliste">
      ${synlige.filter(v => !v.under).map(rad).join('')}
    </ul>
  </fieldset>`;
}

/* Et felt med egen ledetekst, slik delspørsmålene 1a og 1b og
   oppfølgingen 5b står. */
function kpDelfeltHtml(navn, ledetekst, hjelp, valg, type, gjeldende) {
  return `
  <div class="kp-felt" data-felt="${navn}">
    ${kpValgHtml(navn, valg, type, gjeldende, { synlig: true, tekst: ledetekst, hjelp })}
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

  /* De fire kursene er Fasadens knappegruppe med radioknapper, som et
     segmentert valg: én kurs om gangen, og den valgte er markert. */
  const kursValg = kode => `
        <input class="hb-radiobutton" type="radio" name="kurs-forklaring" id="kurs-${kode}" value="${kode}" data-kurs="${kode}">
        <label class="hb-button hb-button--standard" for="kurs-${kode}">${KOMPASS_RETNINGER[kode].navn}</label>`;

  return `
<div class="kp-hero">
  <div class="hb-container hb-container--width-lg">
    <div class="hb-grid hb-grid--align-items-center">
      <div class="hb-cell hb-cell--12of12 hb-cell--7of12@md">
        <h1 class="hb-h1 hb-mb--md kp-maal">Boligkompasset</h1>
        <p class="hb-text--ingress hb-mb--md kp-maal">
          Svar på ${kpAntallSporsmal()} spørsmål om boligen du bor i nå. Du får vite hvor godt den
          passer deg i dag, hva som skal til for at den fortsatt passer om ti år,
          og hvem som kan betale for det. Det tar 5–10 minutter.
        </p>
        <p class="hb-text--sm hb-mb--none">
          Du trenger ikke logge inn. Ingenting sendes til Husbanken før du selv velger det.
        </p>
      </div>
      <div class="hb-cell hb-cell--12of12 hb-cell--5of12@md">
        <img class="kp-hero__ill" src="assets/img/boligkompasset.svg" alt="" width="260" height="200">
      </div>
    </div>
  </div>
</div>

<div class="hb-container hb-container--width-lg">

  ${paabegynt ? `
  <div class="hb-callout hb-callout--info hb-mb--xl">
    <div class="hb-callout-body">
      <h2 class="hb-callout-title">Du har begynt før</h2>
      <div class="hb-callout-content">
        <p>
          Svarene dine ligger lagret fra ${S.endret ? kpKlokke(S.endret) : 'sist'}.
          Du kan fortsette der du slapp, eller begynne på nytt.
        </p>
        ${kpKnapperad([
          kpKnapp('Fortsett der jeg slapp', 'data-fortsett'),
          kpKnapp('Begynn på nytt', 'data-nullstill', 'subtle')
        ])}
      </div>
    </div>
  </div>` : ''}

  <div class="hb-grid hb-grid--align-items-stretch">
    <div class="hb-cell hb-cell--12of12 hb-cell--6of12@md">
      <div class="hb-card">
        <div class="hb-tags hb-tags--top-right"><span class="hb-tag hb-tag--positive">Anbefalt</span></div>
        <div class="hb-card-header"><h2 class="hb-card-tittel">På skjerm, med kompasset</h2></div>
        <div class="hb-card-body">
          <p>
            Ett spørsmål om gangen, i ${KOMPASS_ETAPPER.length} steg. Etter hvert steg ser du
            hvor kompassnåla peker, og til slutt får du en oppsummering med
            tiltakene i prioritert rekkefølge.
          </p>
          <p class="hb-text--semibold hb-mb--none">${KOMPASS_ETAPPER.length} steg · ${kpAntallSporsmal()} spørsmål · 5–10 minutter</p>
        </div>
        <div class="hb-card-footer">
          ${kpKnapp('Start kartleggingen', 'data-start="kompass"', 'prominent', 'arrow-right')}
        </div>
      </div>
    </div>
    <div class="hb-cell hb-cell--12of12 hb-cell--6of12@md">
      <div class="hb-card">
        <div class="hb-card-header"><h2 class="hb-card-tittel">På papir</h2></div>
        <div class="hb-card-body">
          <p>
            Alle spørsmålene og svaralternativene på et skjema du skriver ut og
            krysser av med penn. Fint hvis du vil gå gjennom boligen sammen med
            noen, for eksempel en ergoterapeut eller en pårørende.
          </p>
          <p class="hb-text--semibold hb-mb--none">PDF · A4 · ${kpAntallSporsmal()} spørsmål</p>
        </div>
        <div class="hb-card-footer">
          <a class="hb-button hb-button--standard hb-button--l" href="${KP_PAPIR_PDF}" target="_blank" rel="noopener">
            <span class="hb-button-text">Åpne papirutgaven (PDF)</span>${kpIkon('print-text', 'hb-button-icon')}
            <span class="hb-screenreader-only">, åpnes i nytt vindu</span>
          </a>
        </div>
      </div>
    </div>
  </div>

  <ul class="hb-grid hb-grid--align-items-stretch kp-liste-null hb-mt--2xl">
    ${[
      ['Hvem er det for?', `Deg som er rundt 60 år eller eldre og bor hjemme, og som vil vite hva
          boligen din tåler av årene som kommer. Er du pårørende, kan du gå
          gjennom spørsmålene sammen med den det gjelder.`],
      ['Hvorfor gjøre det nå?', `De fleste venter til noe har skjedd. Da haster det, valgene er færre,
          og det blir dyrere. Gjør du det mens alt går greit, velger du selv
          både løsning og tidspunkt.`],
      ['Hva får du?', `En kurs som sier hvor du står, tiltakene dine i prioritert rekkefølge,
          hvilke tilskudd og lån som kan dekke dem, og hvem du skal ringe.
          Alt kan skrives ut.`]
    ].map(([tittel, tekst]) => `
    <li class="hb-cell hb-cell--12of12 hb-cell--4of12@md">
      <div class="hb-card">
        <div class="hb-card-header"><h2 class="hb-card-tittel">${tittel}</h2></div>
        <div class="hb-card-body"><p class="hb-text--sm hb-mb--none">${tekst}</p></div>
      </div>
    </li>`).join('')}
  </ul>

  <div class="hb-panel hb-panel--noytral hb-mt--2xl">
    <div class="hb-grid hb-grid--align-items-center">
      <div class="hb-cell hb-cell--12of12 hb-cell--7of12@lg">
        <h2 class="hb-h2">Kartleggingen kan føre fire veier</h2>
        <p>
          Kompasset er ikke en karakter. Det er en peiling. Etter hvert steg ser du
          hvor nåla står, og til slutt peker den mot den kursen som passer
          boligen din. Velg en retning for å se hva den betyr.
        </p>
        <fieldset class="hb-fieldset">
          <legend class="hb-screenreader-only">Velg en retning</legend>
          <div class="hb-buttongroup">
            ${['N', 'Ø', 'V', 'S'].map(kursValg).join('')}
          </div>
        </fieldset>
        <p class="hb-text--sm hb-mt--md hb-mb--none kp-kursforklaring" id="kurs-forklaring" aria-live="polite">
          Nåla står i ro til du begynner å svare.
        </p>
      </div>
      <div class="hb-cell hb-cell--12of12 hb-cell--5of12@lg">
        <div class="kp-kompass-stort" id="start-kompass">${kpKompassSvg(kurs)}</div>
      </div>
    </div>
  </div>

</div>`;
}

/* ═══ Framdriften ═════════════════════════════════════════════════
   Fasadens progress stepper viser de fire stegene, og Fasadens
   progressbar under viser hvor langt du er kommet i spørsmålene.
   Telleren teller spørsmål, ett hakk per spørsmål.

   På smal skjerm viser Fasaden stegnavnet og en knapp som folder ut
   stegene, i stedet for hele lista.

   Fasaden animerer det aktive steget når stepperen tegnes. Den tegnes
   derfor bare på nytt når du kommer til et annet steg. Mellom to
   spørsmål i samme steg oppdateres bare progressbaren.
   ─────────────────────────────────────────────────────────────────── */

let kpForrigeSteg = null;

function kpFramdriftTall() {
  const f = KP_FLYT[kpPos];
  const totalt = kpAntallSporsmal();
  const nr = kpSporsmalNr(kpPos);
  const etappeNr = f.t === 'slutt' ? KOMPASS_ETAPPER.length
    : KOMPASS_ETAPPER.findIndex(e => e.id === f.e.id) + 1;
  return {
    etappeNr,
    pst: f.t === 'slutt' ? 100 : Math.round((nr / totalt) * 100),
    teller: f.t === 'sp' ? `Spørsmål ${nr} av ${totalt}` : `${nr} av ${totalt} spørsmål besvart`
  };
}

function kpFramdriftBarHtml({ pst, teller }) {
  return `
    <div class="hb-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
         aria-valuenow="${pst}" aria-label="${teller}" data-framdrift-bar>
      <div class="hb-progress-bar-value" style="width:${pst}%"></div>
    </div>
    <p class="hb-text--sm hb-text--secondary hb-mt--xs hb-mb--none" data-framdrift-teller>${teller}</p>`;
}

function kpFramdriftHtml() {
  const tall = kpFramdriftTall();
  const { etappeNr } = tall;
  const etappe = KOMPASS_ETAPPER[etappeNr - 1];

  return `
<div class="kp-framdrift kp-utskrift-skjul">
  <div class="hb-container hb-container--width-md">
    <div class="hb-progress-stepper">
      <nav class="hb-progress-stepper-nav" id="kp-steg" aria-label="Stegene i Boligkompasset">
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
      <div class="hb-progress-stepper-page-title">
        <p class="hb-progress-stepper-page-title-description">
          <span class="hb-text--semibold">Steg ${etappeNr} av ${KOMPASS_ETAPPER.length}:</span> ${etappe.navn}
          <button type="button" class="hb-button hb-button--link hb-progress-stepper-trigger"
                  aria-expanded="false" aria-controls="kp-steg" data-steg-vis>
            <span class="hb-button-text">Vis stegene</span>${kpIkon('arrow-down-1', 'hb-progress-stepper-trigger-icon')}
          </button>
        </p>
      </div>
    </div>
    <div data-framdrift-bunn>${kpFramdriftBarHtml(tall)}</div>
  </div>
</div>`;
}

/* Tegner stepperen bare når steget er nytt. Ellers byttes bare
   progressbaren og telleren. */
function kpTegnFramdrift(frem) {
  const tall = kpFramdriftTall();
  const bunn = frem.querySelector('[data-framdrift-bunn]');
  if (bunn && tall.etappeNr === kpForrigeSteg) {
    const bar = bunn.querySelector('[data-framdrift-bar]');
    bar.setAttribute('aria-valuenow', tall.pst);
    bar.setAttribute('aria-label', tall.teller);
    bar.firstElementChild.style.width = tall.pst + '%';
    bunn.querySelector('[data-framdrift-teller]').textContent = tall.teller;
    return;
  }
  kpForrigeSteg = tall.etappeNr;
  frem.innerHTML = kpFramdriftHtml();
}

/* ═══ Etappeskjermen ══════════════════════════════════════════════ */

/* Hvert steg har sitt Fasaden-ikon: huset, rommene inne, døra inn og
   kartnåla for nærmiljøet. */
const KP_ETAPPEIKON = {
  hus: 'house-chimney-2',
  rom: 'family-home',
  dor: 'hb-login',
  kart: 'style-two-pin-home'
};

/* Overtittel over H1, Fasadens hb-h1-overtittel. Den ligger inni
   overskrifta, slik at skjermleseren får med seg begge delene, og i
   samme rekkefølge som øyet ser dem. Spørsmålene er lange setninger,
   så de settes i h2-størrelse, selv om de er sidas h1. */
const kpTittel = (over, tittel, storrelse = 'hb-h1') =>
  `<h1 class="${storrelse} hb-mb--md kp-maal"><small class="hb-h1-overtittel">${over}</small> ${tittel}</h1>`;

function kpNavHtml(neste, forrige = true) {
  return `<div class="hb-mt--xl">${kpKnapperad([
    kpKnapp(neste, 'data-neste', 'prominent', 'arrow-right'),
    forrige ? kpKnapp('Forrige', 'data-forrige', 'standard', 'arrow-left', true) : ''
  ], 'navigasjon')}</div>`;
}

function kpEtappeHtml(f) {
  return `
<div class="kp-sporsmal">
  <div class="hb-card">
    <div class="hb-card-body hb-text--center">
      ${kpIkon(KP_ETAPPEIKON[f.e.ikon] || 'house-chimney-2', 'hb-icon--size300 hb-text--positive hb-mb--md')}
      ${kpTittel(`Steg ${f.nr} av ${KOMPASS_ETAPPER.length}`, f.e.navn)}
      <div class="hb-text--left kp-maal kp-midtstilt">${kpAvsnitt(f.e.ingress, 'hb-text--ingress hb-mb--md')}</div>
    </div>
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
  <p class="kp-maal">
    Her står nåla slik svarene i dette steget samlet sett peker.
    ${sisteEtappe ? 'Den samlede kursen får du på neste side.' : 'Neste steg begynner på null igjen.'}
  </p>

  <div class="hb-card">
    <div class="hb-card-body">
      <div class="hb-grid hb-grid--align-items-center">
        <div class="hb-cell hb-cell--12of12 hb-cell--5of12@sm">
          <div class="kp-kompass-stort">${kpKompassSvg(kurs)}</div>
        </div>
        <div class="hb-cell hb-cell--12of12 hb-cell--7of12@sm">
          <p class="hb-text--sm hb-text--secondary hb-mb--none">Dette steget peker mot</p>
          <p class="hb-h3 hb-mb--sm">${kurs.tom ? 'Ikke besvart' : info.navn}</p>
          ${kurs.tom ? '' : `<p class="hb-text--sm hb-text--secondary">${info.tekst}</p>`}
          <p class="hb-text--sm hb-mb--none">${kpEtappeSetning(f.e, tall)}</p>
        </div>
      </div>
      ${kpNokkelHtml(kurs.retning)}
    </div>
  </div>

  ${kpNavHtml(sisteEtappe ? 'Se hele oppsummeringen' : 'Videre til neste steg')}
</div>`;
}

/* Nøkkelen til de fire retningene. Den står under kompasset hver
   eneste gang det vises, for man skal aldri måtte huske hva en kurs
   betydde fra forsiden. Retningen nåla peker mot nå, står i et grønt
   Fasaden-panel. Pila er Fasadens arrow-up, vridd mot retningen. */
const KP_NOKKEL = [
  { kode: 'N', grader: 0   },
  { kode: 'Ø', grader: 90  },
  { kode: 'V', grader: 270 },
  { kode: 'S', grader: 180 }
];

function kpNokkelHtml(retning) {
  return `
  <div class="kp-nokkel hb-mt--lg">
    <h2 class="hb-h5 hb-mb--sm">Slik leser du kompasset</h2>
    <ul class="hb-grid hb-grid--gap-xs kp-liste-null">
      ${KP_NOKKEL.map(p => {
        const k = KOMPASS_RETNINGER[p.kode];
        const naa = retning === p.kode;
        return `
      <li class="hb-cell hb-cell--12of12 hb-cell--6of12@sm">
        <div class="kp-nokkel__rad hb-text--xs${naa ? ' hb-panel hb-panel--positiv hb-panel--luft-lite hb-mb--none' : ' hb-text--secondary'}">
          ${kpIkon('arrow-up', 'hb-icon--size125', `transform:rotate(${p.grader}deg)`)}
          <span><strong class="hb-text--dark">${k.navn}.</strong> ${k.kort}.${naa ? ' <span class="hb-screenreader-only">Nåla peker hit.</span>' : ''}</span>
        </div>
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
  <div class="kp-felt">
    ${kpValgHtml(sp.id, sp.valg, sp.type === 'flervalg' ? 'flervalg' : 'enkelt', S[sp.id], { tekst: sp.tittel })}
  </div>
  ${kpBetingetHtml(sp)}`;
}

/* Oppfølgingen arket merker *BETINGET VIDERE, som 5b «Hvor ligger
   toalettet?». Den står i et hvitt Fasaden-panel under svarene, så det
   er tydelig at den hører til svaret over. */
function kpBetingetHtml(sp) {
  const b = sp.betinget;
  if (!b || !b.naar(S)) return '';
  return `
  <div class="hb-panel hb-panel--hvit hb-mt--lg hb-mb--none" id="betinget-${sp.id}">
    ${kpDelfeltHtml(b.navn, b.ledetekst, b.hjelp, b.valg, 'enkelt', S[b.navn])}
  </div>`;
}

function kpSporsmalHtml(f) {
  const sp = f.sp;
  const nr = kpSporsmalNr(kpPos);
  return `
<div class="kp-sporsmal">
  ${kpTittel(`Spørsmål ${nr} av ${kpAntallSporsmal()}`, sp.tittel, 'hb-h2')}
  <div class="kp-maal">${kpAvsnitt(sp.hjelp)}</div>
  ${sp.undertekst ? `<p class="hb-text--semibold kp-maal">${sp.undertekst}</p>` : ''}

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
  <h3 class="hb-h4 hb-mt--lg hb-mb--sm">Steg for steg</h3>
  <ul class="hb-grid hb-grid--gap-sm hb-grid--align-items-stretch kp-liste-null">
    ${rader.map(r => {
      const info = KOMPASS_RETNINGER[r.kurs.retning] || KOMPASS_RETNINGER.MIDT;
      return `
    <li class="hb-cell hb-cell--6of12 hb-cell--3of12@md">
      <div class="hb-panel hb-panel--hvit hb-panel--luft-lite hb-mb--none hb-text--center">
        <div class="kp-etappekompass">${kpKompassSvg(r.kurs, { liten: true })}</div>
        <p class="hb-text--xs hb-text--secondary hb-mb--none">${r.navn}</p>
        <p class="hb-text--sm hb-text--semibold hb-mb--xs">${r.sum ? info.navn : 'Ikke besvart'}</p>
        <span class="kp-stolpe" role="img"
              aria-label="${r.navn}: ${r.god} svar som fungerer godt, ${r.midt} midt på treet, ${r.tung} som peker på en hindring.">
          ${r.sum ? `
          <span class="kp-stolpe__del kp-farge--god"  style="width:${(r.god / r.sum * 100).toFixed(1)}%"></span>
          <span class="kp-stolpe__del kp-farge--midt" style="width:${(r.midt / r.sum * 100).toFixed(1)}%"></span>
          <span class="kp-stolpe__del kp-farge--tung" style="width:${(r.tung / r.sum * 100).toFixed(1)}%"></span>` : ''}
        </span>
      </div>
    </li>`;
    }).join('')}
  </ul>
  <p class="hb-text--sm hb-text--secondary hb-mt--md hb-mb--none kp-tegnforklaring">
    <span><i class="kp-farge--god"></i>Fungerer godt</span>
    <span><i class="kp-farge--midt"></i>Midt på treet</span>
    <span><i class="kp-farge--tung"></i>Hindring</span>
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

/* Fasadens trekkspill med kantlinje. Hvert element åpnes på stedet, og
   tilstanden står i hb-accordion-element--utvidet, slik Fasaden gjør. */
const kpTrekkspill = elementer => `
  <div class="hb-accordion hb-accordion--kantlinje">
    ${elementer.map(({ id, tittel, innhold }) => `
    <div class="hb-accordion-element">
      <button type="button" class="hb-accordion-header" aria-expanded="false" aria-controls="${id}" data-trekk>
        <span class="hb-accordion-tittel">${tittel}</span>${kpIkon('arrow-down-1', 'hb-accordion-toggle')}
      </button>
      <div class="hb-accordion-body" id="${id}">${innhold}</div>
    </div>`).join('')}
  </div>`;

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

  const tiltak = a => {
    const hvorfor = typeof a.hvorfor === 'function' ? a.hvorfor(S) : a.hvorfor;
    const tekst = typeof a.tekst === 'function' ? a.tekst(S) : a.tekst;
    return {
      id: `t-${a.id}`,
      tittel: a.tittel,
      innhold: `
        <p>${tekst}</p>
        <p class="hb-text--sm"><strong>Derfor står det her:</strong> ${hvorfor}</p>
        ${a.tiltak.length ? `<ul class="kp-liste-null">
          ${a.tiltak.map(t => `<li class="hb-panel hb-panel--info hb-panel--luft-lite hb-mb--xs hb-text--sm">${t}. ${KOMPASS_TILTAK[t]}</li>`).join('')}
        </ul>` : ''}`
    };
  };

  const anbefalinger = (tittel, liste, tom) => `
      <div class="hb-cell hb-cell--12of12 hb-cell--6of12@md">
        <h3 class="hb-h4 hb-mb--sm">${tittel}</h3>
        ${liste.length ? kpTrekkspill(liste.map(tiltak))
          : `<p class="hb-text--sm hb-text--secondary">${tom}</p>`}
      </div>`;

  const hindring = sp => `
          <li class="kp-punkt">
            ${kpIkon('remove', 'hb-text--negative')}
            <span>${sp.stikkord}<span class="hb-text--sm hb-text--secondary kp-blokk">${sp.grep}</span></span>
          </li>`;

  return `
<div class="kp-utskrift-topp">
  <h1 class="hb-h2 hb-mb--xs">Boligkompasset</h1>
  <p class="hb-text--sm hb-text--secondary hb-mb--none">Oppsummering for boligen din.
     Skrevet ut ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}.
     Husbanken, telefon ${KP_TELEFON.tekst}.</p>
</div>

<div class="hb-container hb-container--width-md">

  <p class="kp-utskrift-skjul hb-mb--sm">
    <button type="button" class="hb-button hb-button--link" data-tilbake-svar>
      ${kpIkon('arrow-left', 'hb-button-icon')}<span class="hb-button-text">Gå tilbake og endre svar</span>
    </button>
  </p>

  <h1 class="hb-h1 hb-mb--xl kp-utskrift-skjul">Oppsummering</h1>

  <h2 class="hb-h2">1. Handlingsplan</h2>
  <div class="hb-grid hb-grid--align-items-stretch">
    <div class="hb-cell hb-cell--12of12 hb-cell--6of12@md">
      <div class="hb-card">
        <div class="hb-card-header">${kpIkon('hb-check-mark', 'hb-icon--size150')}<h3 class="hb-card-tittel">Hva funker i dag</h3></div>
        <div class="hb-card-body">
          ${plan.funker.length ? `<ul class="hb-list kp-liste-null">
            ${plan.funker.map(sp => `<li class="kp-punkt">${kpIkon('hb-check-mark')}<span>${sp.stikkord}</span></li>`).join('')}
          </ul>` : '<p class="hb-text--sm hb-text--secondary">Ingen av svarene dine peker denne veien ennå.</p>'}
        </div>
      </div>
    </div>
    <div class="hb-cell hb-cell--12of12 hb-cell--6of12@md">
      <div class="hb-card">
        <div class="hb-card-header">${kpIkon('hb-alert-circle', 'hb-icon--size150 hb-text--negative')}<h3 class="hb-card-tittel">Hva funker ikke</h3></div>
        <div class="hb-card-body">
          ${plan.funkerIkke.length ? `
          <ul class="hb-list kp-liste-null">${plan.funkerIkke.slice(0, 3).map(hindring).join('')}</ul>
          ${plan.funkerIkke.length > 3 ? `
          <div id="flere-hindringer" class="hb-mt--md" hidden>
            <ul class="hb-list kp-liste-null">${plan.funkerIkke.slice(3).map(hindring).join('')}</ul>
          </div>
          <button type="button" class="hb-button hb-button--link hb-mt--sm kp-utskrift-skjul" aria-expanded="false" aria-controls="flere-hindringer" data-mer="flere-hindringer">
            <span class="hb-button-text">Se de ${plan.funkerIkke.length - 3} andre</span>${kpIkon('arrow-down-1', 'hb-button-icon')}
          </button>` : ''}`
          : '<p class="hb-text--sm hb-text--secondary">Ingenting av det du svarte peker på en hindring.</p>'}
        </div>
      </div>
    </div>
  </div>

  <h2 class="hb-h2 hb-mt--2xl">2. Generelle anbefalinger</h2>
  <div class="hb-grid">
    ${anbefalinger('Nå', naa, 'Ingen enkle grep peker seg ut.')}
    ${anbefalinger('Fremtiden, 5–10 år', frem, 'Ingen større arbeider peker seg ut nå.')}
  </div>

  <h2 class="hb-h2 hb-mt--2xl">3. Ressurser</h2>
  ${kpKnapperad([
    ...ordninger.map(o => {
      const ord = KOMPASS_ORDNINGER[o];
      return `<a class="hb-button hb-button--standard" href="${ord.lenke}">
        <span class="hb-button-text">${ord.navn}</span>${kpIkon('arrow-right', 'hb-button-icon')}</a>`;
    }),
    `<a class="hb-button hb-button--standard" href="tel:${KP_TELEFON.tel}">
      ${kpIkon('phone', 'hb-button-icon')}<span class="hb-button-text">Ring Husbanken, ${KP_TELEFON.tekst}</span></a>`
  ])}

  <h2 class="hb-h2 hb-mt--2xl">4. Kursen din</h2>
  <div class="hb-card kp-resultat">
    <div class="hb-panel hb-panel--positiv hb-mb--none">
      <div class="hb-grid hb-grid--align-items-center">
        <div class="hb-cell hb-cell--12of12 hb-cell--5of12@sm">
          <div class="kp-kompass-stort">${kpKompassSvg(kurs)}</div>
        </div>
        <div class="hb-cell hb-cell--12of12 hb-cell--7of12@sm">
          <p class="hb-text--sm hb-text--semibold hb-mb--xs">Kompasset peker mot</p>
          <p class="hb-h2">${info.navn}</p>
          <p class="kp-maal${ubesvart ? '' : ' hb-mb--none'}">${info.tekst}</p>
          ${ubesvart ? `<p class="hb-text--sm hb-text--secondary hb-mb--none">
            ${ubesvart} av ${kpAntallSporsmal()} spørsmål står ubesvart.</p>` : ''}
        </div>
      </div>
    </div>
    <div class="hb-card-body">
      ${kpOversiktHtml()}
    </div>
  </div>

  ${kpEgenKursHtml()}

  <div class="kp-utskrift-notat">
    <strong>Plass til dine egne notater</strong>
  </div>

  <div class="hb-mt--2xl kp-utskrift-skjul">
    ${kpKnapperad([
      kpKnapp('Skriv ut eller lagre som PDF', 'data-skriv-ut', 'prominent', 'print-text'),
      kpKnapp('Endre svarene mine', 'data-tilbake-svar', 'standard', 'content-pen-3'),
      kpKnapp('Start på nytt', 'data-nullstill', 'standard', 'rotate-back')
    ])}
  </div>

  <div class="hb-mt--2xl kp-utskrift-skjul">
    ${kpTrekkspill([{ id: 'alle-svar', tittel: 'Se alle svarene dine', innhold: kpSvarlisteHtml() }])}
  </div>

</div>`;
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
  <div class="kp-egen-blokk">
  <h2 class="hb-h2 hb-mt--2xl">Vri kompasset selv</h2>
  <p class="kp-maal">
    Kompasset over er regnet ut. Du vet noe det ikke vet. Vri nåla dit du selv
    føler at du står.
  </p>

  <div class="hb-card" id="kp-egen">
    <div class="hb-card-body">
      <div class="hb-grid hb-grid--align-items-center">
        <div class="hb-cell hb-cell--12of12 hb-cell--5of12@sm">
          <div class="kp-kompass-stort kp-egen__rose" data-egen-rose>${kpKompassSvg(kurs)}</div>
        </div>
        <div class="hb-cell hb-cell--12of12 hb-cell--7of12@sm">
          <p class="hb-text--sm hb-text--secondary hb-mb--none">Du peker mot</p>
          <p class="hb-h3 hb-mb--sm" data-egen-navn>${kpKursnavn(kurs.retning)}</p>
          <p class="hb-text--sm hb-text--secondary" data-egen-tekst>${(KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT).tekst}</p>

          <label class="hb-legend hb-mb--xs" for="egen-kurs"><span class="hb-legend-tekst">Vri kompasset</span></label>
          <input class="kp-skyv" id="egen-kurs" type="range"
                 min="0" max="345" step="15" value="${grader}"
                 aria-describedby="egen-avlest">
          <p class="hb-text--sm hb-mt--sm" id="egen-avlest" aria-live="polite" data-egen-avlest>
            ${kpEgenSammenlikning(kurs.retning, regnet.retning)}
          </p>
          <button type="button" class="hb-button hb-button--link" data-egen-nullstill>
            ${kpIkon('rotate-back', 'hb-button-icon')}<span class="hb-button-text">Sett nåla tilbake til vår utregning</span>
          </button>
        </div>
      </div>
    </div>
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
      f.setAttribute('fill', aktiv ? 'var(--color-green-65)' : 'var(--color-gray-65)');
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
    <div class="hb-mb--xl">
      <h3 class="hb-h4">${e.navn}</h3>
      <button type="button" class="hb-button hb-button--link hb-mb--md kp-utskrift-skjul" data-endre="${sporsmal[0].id}">
        ${kpIkon('content-pen-3', 'hb-button-icon')}<span class="hb-button-text">Endre<span class="hb-screenreader-only"> svarene i ${e.navn.toLowerCase()}</span></span>
      </button>
      <dl class="hb-list--summary-compact">
        ${rader.map(r => `
        <div class="hb-list-element">
          <dt>${r.sp}</dt>
          <dd${r.svar ? '' : ' class="hb-text--secondary"'}>${r.svar ? kpEsc(r.svar) : 'Ikke besvart'}</dd>
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
  <div class="hb-container hb-container--width-lg">
    <div class="hb-panel hb-panel--advarsel hb-mb--none">
      <p class="hb-text--sm kp-maal">
        <strong>Snarvei for prototypen.</strong>
        Fyller ut tilfeldige svar på alle ${kpAntallSporsmal()} spørsmålene og går rett til oppsummeringen.
      </p>
      ${kpKnapp('Fyll ut tilfeldig og vis oppsummeringen', 'data-tilfeldig', 'standard')}
    </div>
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
    kpTegnFramdrift(frem);
    rot.innerHTML = `<div class="hb-container hb-container--width-sm">
        ${f.t === 'etappe' ? kpEtappeHtml(f)
          : f.t === 'etappeslutt' ? kpEtappeSluttHtml(f)
          : kpSporsmalHtml(f)}
    </div>`;
  }

  kpTegnBunn();
  if (kpModus === 'oppsummering') kpInitEgenKurs();
  /* Overskriften i utskriftstoppen er skjult på skjerm og kan ikke få
     fokus. Det er den synlige h1-en som skal ha det. */
  const h = rot.querySelector('.hb-container h1');
  if (h && kpModus !== 'start') { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  window.scrollTo({ top: 0, behavior: 'auto' });
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
  /* Kursvalget på forsiden er radioknapper. Både klikk og piltaster gir
     et click på selve input-feltet. */
  const t = ev.target.closest('button, a, input[data-kurs]');
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
    t.querySelector('.hb-icon').innerHTML = FASADEN_IKON[aapen ? 'arrow-down-1' : 'arrow-up-1'];
  }
  /* Fasadens trekkspill: tilstanden står på elementet */
  else if (d.trekk !== undefined) {
    const el = t.closest('.hb-accordion-element');
    const aapen = !el.classList.contains('hb-accordion-element--utvidet');
    el.classList.toggle('hb-accordion-element--utvidet', aapen);
    t.setAttribute('aria-expanded', String(aapen));
  }
  /* Stegene på smal skjerm, Fasadens stepper med hb-is-expanded */
  else if (d.stegVis !== undefined) {
    const nav = document.getElementById('kp-steg');
    const aapen = !nav.classList.contains('hb-is-expanded');
    nav.classList.toggle('hb-is-expanded', aapen);
    t.setAttribute('aria-expanded', String(aapen));
    t.querySelector('.hb-button-text').textContent = aapen ? 'Skjul stegene' : 'Vis stegene';
  }
  else if (d.kurs) {
    const k = KOMPASS_RETNINGER[d.kurs];
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
  kpToppen();
  kpTegn();
}

/* Toppen og bunnen står i boligkompasset.html. Her fylles Fasadens
   ikoner inn, og menyknappen på smal skjerm kobles til menyen. */
function kpToppen() {
  document.querySelectorAll('[data-fa-ikon]').forEach(e => {
    e.innerHTML = FASADEN_IKON[e.dataset.faIkon] || '';
    e.setAttribute('aria-hidden', 'true');
  });
  const knapp = document.querySelector('.hb-header-menu-button');
  const meny = document.getElementById('kp-meny');
  if (!knapp || !meny) return;
  knapp.addEventListener('click', () => {
    const aapen = knapp.getAttribute('aria-expanded') !== 'true';
    knapp.setAttribute('aria-expanded', String(aapen));
    meny.classList.toggle('kp-meny--aapen', aapen);
    knapp.querySelector('.hb-icon').innerHTML = FASADEN_IKON[aapen ? 'arrow-up-1' : 'arrow-down-1'];
  });
}
