/* ──────────────────────────────────────────────────────────────────
   Boligkompasset, logikken

   To veier gjennom de samme spørsmålene:
     · kompassmodus, ett spørsmål om gangen, med nåla som svinger
     · listemodus, alt på én side, uten animasjon

   Begge lagrer til samme sted, og ender i samme oppsummering.
   ────────────────────────────────────────────────────────────────── */

const KP_LAGER = 'hb-boligkompasset-iterasjon-9';

let S = {};              // svarene
let KP_FLYT = [];        // skjermene i kompassmodus
let kpPos = 0;           // hvor i flyten vi er
let kpModus = 'kompass'; // 'kompass' | 'liste'

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
  kpOppdaterTabber();
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
    const p = sp.poeng(svar);
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
  if (etappeId === 'adkomst'
      && (S['adkomst-hindringer'] === 'sveert' || S['adkomst-trinn'] === '6+')) {
    ned = Math.max(ned, 135);
  }
  if (etappeId === 'naermiljo'
      && S['naermiljo-komme-seg'] === 'nei'
      && (S['naermiljo-tilbud'] || []).includes('ingen')) {
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

function kpHvorforBoks(sp) {
  return `
  <div class="kp-forklaring">
    <div class="kp-forklaring__boks kp-forklaring__boks--sporsmal">
      <h2 class="kp-forklaring__tittel">Derfor spør vi</h2>
      <p>${sp.hvorfor}</p>
    </div>
    <div class="kp-forklaring__boks kp-forklaring__boks--bruk">
      <h2 class="kp-forklaring__tittel">Dette brukes svaret til</h2>
      <p>${sp.brukesTil}</p>
    </div>
  </div>`;
}

function kpValgHtml(navn, valg, type, gjeldende) {
  const flertall = type === 'flervalg';
  const valgt = flertall ? (Array.isArray(gjeldende) ? gjeldende : []) : gjeldende;
  return valg.map(v => {
    const av = flertall
      ? valgt.includes(v.v)
      : valgt === v.v;
    return `
    <label class="hb-choice">
      <input type="${flertall ? 'checkbox' : 'radio'}" name="${navn}" value="${v.v}"
             ${av ? 'checked' : ''} ${v.alene ? 'data-alene="1"' : ''}>
      <span class="hb-choice__text">
        <span class="hb-choice__title">${v.tittel}</span>
        ${v.desc ? `<span class="hb-choice__desc">${v.desc}</span>` : ''}
      </span>
    </label>`;
  }).join('');
}

/* ═══ Flyten i kompassmodus ═══════════════════════════════════════ */

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
   verdien». Derfor tre korte svar øverst, og et kompass du kan
   klikke på for å se hvor kartleggingen kan føre.
   ─────────────────────────────────────────────────────────────────── */

function kpStartHtml() {
  const paabegynt = Object.keys(S).some(k => !['modus', 'endret', 'svarerFor', 'startet'].includes(k));
  const kurs = kpBeregnKurs();

  const kursKnapp = (kode, i) => {
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
        <h1 class="kp-h1">Boligkompasset</h1>
        <p class="kp-ingress">
          Svar på 20 spørsmål om boligen du bor i nå. Du får vite hvor godt den
          passer deg i dag, hva som skal til for at den fortsatt passer om ti år,
          og hvem som kan betale for det. Det tar 5–10 minutter.
        </p>
        <p class="hb-small" style="margin:0">
          Du trenger ikke logge inn. Ingenting sendes til Husbanken før du selv velger det.
        </p>
      </div>
      <img class="kp-hero__ill" src="../../assets/img/boligkompasset.svg" alt=""
           width="260" height="200">
    </div>
  </div>
</section>

<section class="hb-section">
  <div class="hb-shell hb-shell--wide">

    ${paabegynt ? `
    <div class="hb-note" style="margin-bottom:var(--space-5)">
      <span class="hb-note__icon" data-ikon="info"></span>
      <div>
        <strong>Du har begynt før.</strong>
        <p style="margin:4px 0 var(--space-3)">
          Svarene dine ligger lagret fra ${S.endret ? kpKlokke(S.endret) : 'sist'}.
          Du kan fortsette der du slapp, eller begynne på nytt.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
          <button type="button" class="hb-btn hb-btn--primary" data-fortsett>Fortsett der jeg slapp</button>
          <button type="button" class="hb-btn hb-btn--tertiary" data-nullstill>Begynn på nytt</button>
        </div>
      </div>
    </div>` : ''}

    <div class="hb-cardgrid hb-cardgrid--3" style="margin-bottom:var(--space-6)">
      <div class="hb-card">
        <h2 class="hb-h4">Hvem er det for?</h2>
        <p class="hb-small">
          Deg som er rundt 60 år eller eldre og bor hjemme, og som vil vite hva
          boligen din tåler av årene som kommer. Er du pårørende, kan du gå
          gjennom spørsmålene sammen med den det gjelder.
        </p>
      </div>
      <div class="hb-card">
        <h2 class="hb-h4">Hvorfor gjøre det nå?</h2>
        <p class="hb-small">
          De fleste venter til noe har skjedd. Da haster det, valgene er færre,
          og det blir dyrere. Gjør du det mens alt går greit, velger du selv
          både løsning og tidspunkt.
        </p>
      </div>
      <div class="hb-card">
        <h2 class="hb-h4">Hva får du?</h2>
        <p class="hb-small">
          En kurs som sier hvor du står, tiltakene dine i prioritert rekkefølge,
          hvilke tilskudd og lån som kan dekke dem, og hvem du skal ringe.
          Alt kan skrives ut eller tas med inn i en søknad.
        </p>
      </div>
    </div>

    <div class="hb-panel" style="margin-bottom:var(--space-6)">
      <div style="display:grid;gap:var(--space-4)" class="kp-start-split">
        <div>
          <h2 class="hb-h3">Kartleggingen kan føre fire veier</h2>
          <p>
            Kompasset er ikke en karakter. Det er en peiling. Etter hvert som du
            svarer, svinger nåla, og til slutt peker den mot den kursen som
            passer boligen din. Trykk på en retning for å se hva den betyr.
          </p>
          <div class="kp-kurser">
            ${['N', 'Ø', 'V', 'S'].map(kursKnapp).join('')}
          </div>
          <p class="hb-small hb-muted" id="kurs-forklaring" style="margin-top:var(--space-3);min-height:3em">
            Nåla under står i ro til du begynner å svare.
          </p>
        </div>
        <div>
          <div class="kp-kompass-stort" id="start-kompass">${kpKompassSvg(kurs)}</div>
        </div>
      </div>
    </div>

    <h2 class="hb-h3">Velg hvordan du vil svare</h2>
    <p style="max-width:56ch">
      Spørsmålene er de samme, svarene lagres på samme sted, og du får samme
      oppsummering.
    </p>
    <div class="kp-modus" style="margin-top:var(--space-4)">
      <div class="kp-modus__kort kp-modus__kort--anbefalt">
        <span class="kp-modus__merke">Anbefalt</span>
        <h3 class="hb-h4">Med kompasset</h3>
        <p>
          Ett spørsmål om gangen, i fem steg. Under hvert spørsmål ser du
          kompassnåla flytte seg, og du får vite hva svaret ditt betydde.
          Litt som en valgomat.
        </p>
        <p><strong>5 steg · 20 spørsmål · 5–10 minutter</strong></p>
        <button type="button" class="hb-btn hb-btn--primary hb-btn--block" data-start="kompass">
          Start kartleggingen <span data-ikon="pil"></span>
        </button>
      </div>
      <div class="kp-modus__kort">
        <span class="kp-modus__merke" style="background:var(--hb-slate-100);color:var(--fg-subtle)">Rett på sak</span>
        <h3 class="hb-h4">Som en enkel liste</h3>
        <p>
          Alle 20 spørsmålene under hverandre på én side. Ingen animasjon,
          ingen kompassnål. Bla nedover, svar, og trykk «Se oppsummeringen»
          til slutt. Enklest hvis du bruker skjermleser eller forstørring.
        </p>
        <p><strong>Én side · 20 spørsmål</strong></p>
        <button type="button" class="hb-btn hb-btn--secondary hb-btn--block" data-start="liste">
          Ta spørsmålene i en liste
        </button>
      </div>
    </div>


  </div>
</section>`;
}

/* ═══ Framdriftslinja ═════════════════════════════════════════════
   Designkritikken: «Det kan ikke være stegvis, også går ikke
   stegene opp for hvert svar». Telleren teller spørsmål, ett hakk
   per spørsmål, og stemmer alltid med hvor du faktisk er.
   ─────────────────────────────────────────────────────────────────── */

function kpFramdriftHtml() {
  const f = KP_FLYT[kpPos];
  const totalt = kpAntallSporsmal();
  const nr = kpSporsmalNr(kpPos);
  const etappeNr = f.t === 'slutt' ? KOMPASS_ETAPPER.length
    : KOMPASS_ETAPPER.findIndex(e => e.id === f.e.id) + 1;
  const pst = f.t === 'slutt' ? 100 : Math.round((nr / totalt) * 100);

  return `
<div class="kp-framdrift kp-utskrift-skjul">
  <div class="hb-shell">
    <div class="kp-framdrift__topp">
      <span class="kp-framdrift__etappe">
        Steg ${etappeNr} av ${KOMPASS_ETAPPER.length}${f.t === 'slutt' ? ' · Oppsummering' : ' · ' + f.e.navn}
      </span>
      <span class="kp-framdrift__teller">
        ${f.t === 'sp' ? `Spørsmål ${nr} av ${totalt}`
          : f.t === 'slutt' ? `${totalt} av ${totalt} spørsmål`
          : `${nr} av ${totalt} spørsmål besvart`}
      </span>
    </div>
    <div class="kp-framdrift__spor">
      <div class="kp-framdrift__fyll" style="width:${pst}%"></div>
    </div>
    <ul class="kp-etapper">
      ${KOMPASS_ETAPPER.map((e, i) => `
        <li>
          <span class="kp-etapper__merke" data-tilstand="${i + 1 < etappeNr ? 'ferdig' : i + 1 === etappeNr ? 'aktiv' : 'igjen'}"></span>
          <span class="kp-etapper__navn">${e.navn}</span>
        </li>`).join('')}
    </ul>
  </div>
</div>`;
}

/* ═══ Etappeskjermen ══════════════════════════════════════════════ */

const KP_ETAPPEFIG = {
  hus: '<path d="M8 40 L48 12 L88 40 M18 34 V84 H78 V34" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
  kart: '<circle cx="48" cy="38" r="16" fill="none" stroke="currentColor" stroke-width="5"/><path d="M48 12a26 26 0 0 1 26 26c0 18-26 48-26 48S22 56 22 38A26 26 0 0 1 48 12Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>',
  dor: '<rect x="24" y="12" width="48" height="76" rx="3" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="60" cy="52" r="4" fill="currentColor"/>',
  rom: '<rect x="10" y="14" width="76" height="72" rx="4" fill="none" stroke="currentColor" stroke-width="5"/><path d="M48 14v72M10 52h38" fill="none" stroke="currentColor" stroke-width="5"/>',
  krone: '<circle cx="48" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="5"/><path d="M60 38c-3-4-8-6-12-6-7 0-11 4-11 9 0 10 23 6 23 16 0 5-5 9-12 9-5 0-10-2-13-6M48 24v52" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
};

function kpEtappeHtml(f) {
  return `
<div class="kp-sporsmal">
  <div class="kp-etappe-kort">
    <svg class="kp-etappe-kort__fig" viewBox="0 0 96 96" aria-hidden="true" style="color:var(--hb-green-700)">
      ${KP_ETAPPEFIG[f.e.ikon] || ''}
    </svg>
    <span class="kp-etappe-kort__nr">Steg ${f.nr} av ${KOMPASS_ETAPPER.length}</span>
    <h1 class="hb-h2">${f.e.navn}</h1>
    <p>${f.e.ingress}</p>
    ${f.e.frivillig ? `
    <div class="hb-note" style="margin-top:var(--space-4);text-align:left">
      <span class="hb-note__icon" data-ikon="info"></span>
      <p style="margin:0">
        Dette steget er frivillig. Hopper du over det, får du fortsatt kurs og
        tiltak. Du får bare ikke vite hvilke låne- og tilskuddsordninger som
        passer best for akkurat din situasjon.
      </p>
    </div>` : ''}
  </div>

  <div class="kp-nav">
    ${kpPos > 0 ? '<button type="button" class="hb-btn hb-btn--secondary" data-forrige>Forrige</button>' : ''}
    <span class="kp-nav__hoyre">
      ${f.e.frivillig ? '<button type="button" class="hb-btn hb-btn--tertiary" data-hopp-etappe>Hopp over økonomien</button>' : ''}
      <button type="button" class="hb-btn hb-btn--primary" data-neste>
        ${f.nr === 1 ? 'Til første spørsmål' : 'Fortsett'} <span data-ikon="pil"></span>
      </button>
    </span>
  </div>

</div>`;
}

/* ═══ Etappeoppsummeringen ════════════════════════════════════════
   Her, og bare her, legges svarene sammen underveis. Etter hver
   etappe stopper vi opp og viser hva den etappen samlet peker mot.
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
  if (!tall.sum) return 'Du svarte ikke på noe i dette steget, så det teller ikke med i kursen.';
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
  const navigasjon = `
  <div class="kp-nav">
    <button type="button" class="hb-btn hb-btn--secondary" data-forrige>Forrige</button>
    <span class="kp-nav__hoyre">
      <button type="button" class="hb-btn hb-btn--primary" data-neste>
        ${sisteEtappe ? 'Se hele oppsummeringen' : 'Videre til neste steg'} <span data-ikon="pil"></span>
      </button>
    </span>
  </div>`;

  /* Etappen om økonomi har ingen spørsmål som teller i kompasset. Et
     kompass her ville påstått en kurs som ikke finnes. */
  if (!kpEnheter().some(u => u.sp.etappe === f.e.id)) {
    const sp = KOMPASS_SPORSMAL.filter(x => x.etappe === f.e.id);
    const svart = sp.filter(kpBesvart).length;
    return `
<div class="kp-sporsmal">
  <h1 class="hb-h2">${f.e.navn}: hva vi gjør med svarene</h1>
  <p class="kp-sporsmal__under">
    Dette steget flytter ikke nåla. Kompasset ser bare på boligen.
  </p>
  <div class="hb-panel hb-panel--filled">
    <p style="margin:0">
      Du svarte på ${svart} av ${sp.length} spørsmål om økonomi. Det vi bruker
      dem til, er å velge hvilke lån og tilskudd vi viser deg i oppsummeringen.
      Ingenting er kontrollert mot bank, skatt eller andre registre, og
      ingenting av det påvirker kursen.
    </p>
  </div>
  ${navigasjon}
</div>`;
  }

  return `
<div class="kp-sporsmal">
  <h1 class="hb-h2">${f.e.navn}: slik ser det ut</h1>
  <p class="kp-sporsmal__under">
    Her står nåla slik svarene i dette steget samlet sett peker. Neste steg
    begynner på null igjen.
  </p>

  <div class="kp-peiling kp-peiling--stor">
    <div class="kp-peiling__hoved">
      <div class="kp-peiling__rose">${kpKompassSvg(kurs)}</div>
      <div>
        <p class="hb-small hb-muted" style="margin:0 0 2px">Dette steget peker mot</p>
        <p class="kp-peiling__kurs">${info.navn}</p>
        <p class="kp-peiling__tekst">${info.tekst}</p>
        <p class="hb-small" style="margin:var(--space-3) 0 0">${kpEtappeSetning(f.e, tall)}</p>
      </div>
    </div>
    ${kpNokkelHtml(kurs.retning)}
  </div>

  ${navigasjon}
</div>`;
}

/* ═══ Peilingen, kompasset mens du svarer ═════════════════════════ */

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

/* Nåla under spørsmålet viser bare dette ene svaret, ikke summen av
   alt du har svart. En sum som endrer seg litt for hvert svar er
   umulig å lese noe ut av. Her starter nåla på null og grått, og
   peker rett på det du nettopp valgte. Summen kommer etter hver
   etappe, og til slutt. */
function kpPeilingTekster(kurs) {
  if (kurs.tom) {
    return { over: 'Så langt i dette steget', navn: 'Ikke svart ennå',
             tekst: 'Velg et alternativ, så viser nåla hvilken vei det peker.' };
  }
  if (kurs.retning === 'MIDT') {
    return { over: 'Så langt i dette steget', navn: 'Trekker ingen vei',
             tekst: KP_RETNINGSFORKLARING.MIDT };
  }
  return { over: 'Så langt i dette steget peker det mot',
           navn: kpKursnavn(kurs.retning),
           tekst: KP_RETNINGSFORKLARING[kurs.retning] };
}

function kpPeilingHtml(kurs) {
  const t = kpPeilingTekster(kurs);
  return `
<div class="kp-peiling" style="margin-top:var(--space-5)" id="peiling">
  <div class="kp-peiling__hoved">
    <div class="kp-peiling__rose">${kpKompassSvg(kurs)}</div>
    <div>
      <p class="hb-small hb-muted" style="margin:0 0 2px" data-kurs-over>${t.over}</p>
      <p class="kp-peiling__kurs" data-kurs-navn>${t.navn}</p>
      <p class="kp-peiling__tekst" data-kurs-tekst>${t.tekst}</p>
      <p class="hb-small hb-muted" style="margin:var(--space-2) 0 0">
        Nåla summerer svarene i dette steget, og begynner på null når
        neste steg starter. Den samlede kursen får du til slutt.
      </p>
    </div>
  </div>
  <div data-nokkel>${kpNokkelHtml(kurs.retning)}</div>
</div>`;
}

/* ═══ Spørsmålsskjermen ═══════════════════════════════════════════ */

function kpSporsmalHtml(f) {
  const sp = f.sp;
  const kurs = kpKursForSteg(f.e.id);

  let felterHtml;
  if (sp.type === 'flerfelt') {
    felterHtml = sp.felt.map(felt => `
      <div class="kp-felt">
        <span class="kp-felt__ledetekst" id="lt-${felt.navn}">${felt.ledetekst}</span>
        ${felt.hjelp ? `<span class="kp-felt__hjelp">${felt.hjelp}</span>` : ''}
        <div role="radiogroup" aria-labelledby="lt-${felt.navn}">
          ${kpValgHtml(felt.navn, felt.valg, 'enkelt', S[felt.navn])}
        </div>
      </div>`).join('');
  } else {
    felterHtml = `
      <div class="kp-felt">
        ${kpValgHtml(sp.id, sp.valg, sp.type === 'flervalg' ? 'flervalg' : 'enkelt', S[sp.id])}
        ${kpOppfolgingHtml(sp)}
      </div>`;
  }

  return `
<div class="kp-sporsmal">
  <h1 class="hb-h2">${sp.tittel}</h1>
  <p class="kp-sporsmal__under">${sp.undertekst}</p>
  ${kpHvorforBoks(sp)}

  <form id="sporsmalsform" novalidate>
    ${felterHtml}
  </form>

  <div class="kp-nav">
    <button type="button" class="hb-btn hb-btn--secondary" data-forrige>Forrige</button>
    <span class="kp-nav__hoyre">
      <button type="button" class="hb-btn hb-btn--primary" data-neste>
        ${kpSporsmalNr(kpPos) === kpAntallSporsmal() ? 'Se oppsummeringen' : 'Neste'} <span data-ikon="pil"></span>
      </button>
    </span>
  </div>

  ${kpPeilingHtml(kurs)}
</div>`;
}

function kpOppfolgingHtml(sp) {
  const valgt = (sp.valg || []).find(v => v.v === S[sp.id] && v.oppfolging);
  if (!valgt) return '';
  const o = valgt.oppfolging;
  return `
  <div class="kp-oppfolging" id="oppfolging">
    <span class="kp-felt__ledetekst" id="lt-${sp.id}-opp">${o.ledetekst}</span>
    ${kpValgHtml(sp.id + '-opp', o.valg, o.type, S[sp.id + '-opp'])}
  </div>`;
}

/* ═══ Listemodus ══════════════════════════════════════════════════
   Samme spørsmål, samme lagring, ingen animasjon. Her er det ingen
   framdriftsteller som kan gå i utakt, fordi alt ligger framme.
   ─────────────────────────────────────────────────────────────────── */

/* Fargekodene på fanene. En rolig trapp fra mørk grønn til blågrå,
   med små steg mellom, slik at de fem etappene skiller seg fra
   hverandre uten å skrike. Alle fra Husbankens palett. Fargen er
   aldri eneste kjennetegn, navnet står alltid ved siden av. */
const KP_TABFARGE = ['#2B4715', '#4A7729', '#73A54B', '#4D7B95', '#335162'];

function kpEtappeStatus(e) {
  const sp = KOMPASS_SPORSMAL.filter(x => x.etappe === e.id);
  return { svart: sp.filter(kpBesvart).length, totalt: sp.length };
}

function kpTabberHtml() {
  return `
<nav class="kp-tabs kp-utskrift-skjul" aria-labelledby="tabs-tittel">
  <p class="kp-tabs__tittel" id="tabs-tittel">Hopp til steg</p>
  <ol>
    ${KOMPASS_ETAPPER.map((e, i) => {
      const st = kpEtappeStatus(e);
      return `
    <li>
      <a class="kp-tab" href="#etappe-${e.id}" data-tab="${e.id}"
         style="--tab-farge:${KP_TABFARGE[i]}">
        <span class="kp-tab__nr">${i + 1}</span>
        <span class="kp-tab__navn">${e.navn}</span>
        <span class="kp-tab__tall" data-tabtall="${e.id}">${st.svart}/${st.totalt}</span>
      </a>
    </li>`;
    }).join('')}
  </ol>
</nav>`;
}

/* Fanene følger med når du blar, og teller opp når du svarer. */
function kpInitTabber() {
  const tabber = [...document.querySelectorAll('.kp-tab')];
  if (!tabber.length) return;

  const merk = id => tabber.forEach(t =>
    t.setAttribute('aria-current', t.dataset.tab === id ? 'true' : 'false'));
  merk(KOMPASS_ETAPPER[0].id);

  const seksjoner = KOMPASS_ETAPPER
    .map(e => document.getElementById('etappe-' + e.id))
    .filter(Boolean);
  if (!seksjoner.length) return;

  /* Den aktive etappen er den siste som har passert en tenkt linje et
     stykke ned på skjermen. En observatør ga feil svar her: flere
     seksjoner er synlige samtidig, og da traff den alltid den øverste.
     Denne regner det ut direkte, og blir aldri hengende etter. */
  const linje = () => Math.min(180, window.innerHeight * 0.25);

  const oppdater = () => {
    const grense = linje();
    let valgt = seksjoner[0];
    seksjoner.forEach(sek => {
      if (sek.getBoundingClientRect().top <= grense) valgt = sek;
    });
    /* Helt nederst på siden vinner den siste, ellers blir den aldri aktiv */
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      valgt = seksjoner[seksjoner.length - 1];
    }
    merk(valgt.id.replace('etappe-', ''));
  };

  if (kpInitTabber._av) kpInitTabber._av();

  /* Strupes med klokke, ikke med requestAnimationFrame. Bildeoppdatering
     stopper når fanen ligger i bakgrunnen, og da ble merkingen hengende
     igjen på feil etappe når man kom tilbake. */
  let planlagt = 0;
  const paa = () => {
    if (planlagt) return;
    planlagt = setTimeout(() => { planlagt = 0; oppdater(); }, 80);
  };
  window.addEventListener('scroll', paa, { passive: true });
  window.addEventListener('resize', paa, { passive: true });
  kpInitTabber._av = () => {
    clearTimeout(planlagt);
    window.removeEventListener('scroll', paa);
    window.removeEventListener('resize', paa);
    kpInitTabber._av = null;
  };
  kpInitTabber._merk = merk;
  oppdater();
}

function kpOppdaterTabber() {
  KOMPASS_ETAPPER.forEach(e => {
    const el = document.querySelector(`[data-tabtall="${e.id}"]`);
    if (!el) return;
    const st = kpEtappeStatus(e);
    el.textContent = st.svart + '/' + st.totalt;
    el.closest('.kp-tab').dataset.ferdig = String(st.svart === st.totalt);
  });
}

function kpListeHtml() {
  let nr = 0;
  const etapper = KOMPASS_ETAPPER.map((e, i) => {
    const sp = KOMPASS_SPORSMAL.filter(s => s.etappe === e.id);
    return `
    <section class="kp-liste__etappe" id="etappe-${e.id}"
             style="--etappe-farge:${KP_TABFARGE[i]}" aria-labelledby="tittel-${e.id}">
      <h2 class="hb-h2" id="tittel-${e.id}">${i + 1}. ${e.navn}</h2>
      <p style="max-width:58ch">${e.ingress}</p>
      ${sp.map(s => {
        nr++;
        let felter;
        if (s.type === 'flerfelt') {
          felter = s.felt.map(f => `
            <div class="kp-felt">
              <span class="kp-felt__ledetekst" id="ll-${f.navn}">${f.ledetekst}</span>
              ${f.hjelp ? `<span class="kp-felt__hjelp">${f.hjelp}</span>` : ''}
              <div role="radiogroup" aria-labelledby="ll-${f.navn}">
                ${kpValgHtml(f.navn, f.valg, 'enkelt', S[f.navn])}
              </div>
            </div>`).join('');
        } else {
          felter = kpValgHtml(s.id, s.valg, s.type === 'flervalg' ? 'flervalg' : 'enkelt', S[s.id])
                 + kpOppfolgingHtml(s);
        }
        return `
        <div class="kp-liste__sporsmal" data-sp="${s.id}">
          <span class="kp-liste__nr">Spørsmål ${nr} av ${kpAntallSporsmal()}</span>
          <h3 class="hb-h4">${s.tittel}</h3>
          <p style="margin:0 0 var(--space-3);max-width:58ch">${s.undertekst}</p>
          ${kpHvorforBoks(s)}
          ${felter}
        </div>`;
      }).join('')}
    </section>`;
  }).join('');

  return `
<section class="hb-section" style="padding-top:var(--space-4)">
  <div class="hb-shell hb-shell--wide">
    <h1 class="kp-h1 kp-h1--smal">Boligkompasset, alle spørsmålene</h1>
    <p class="kp-ingress">
      Alle 20 spørsmålene på én side. Svar på det du kan, hopp over det du er
      usikker på, og trykk «Se oppsummeringen» nederst. Svarene lagres etter
      hvert som du gir dem.
    </p>
    <div class="kp-liste__oppsett">
      ${kpTabberHtml()}
      <form id="listeform" class="kp-liste__innhold">${etapper}</form>
    </div>
    <div class="kp-nav" style="margin-top:var(--space-6)">
      <button type="button" class="hb-btn hb-btn--tertiary" data-til-start>Tilbake til starten</button>
      <span class="kp-nav__hoyre">
        <button type="button" class="hb-btn hb-btn--primary" data-oppsummering>
          Se oppsummeringen <span data-ikon="pil"></span>
        </button>
      </span>
    </div>
  </div>
</section>`;
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
  <h3 class="hb-h3">Slik står det til, steg for steg</h3>
  <p style="max-width:58ch">
    Ett kompass per steg, med den kursen steget endte på. Stolpen
    under viser fordelingen av svar: grønt taler for at boligen passer for
    deg, oransje peker på en hindring, og grått trekker ingen vei.
  </p>
  <ul class="kp-etappekort" style="margin-top:var(--space-4)">
    ${rader.map(r => {
      const info = KOMPASS_RETNINGER[r.kurs.retning] || KOMPASS_RETNINGER.MIDT;
      return `
    <li class="kp-etappekort__kort">
      <div class="kp-etappekort__rose">${kpKompassSvg(r.kurs, { liten: true })}</div>
      <div class="kp-etappekort__tekst">
        <p class="kp-etappekort__navn">${r.navn}</p>
        <p class="kp-etappekort__kurs">${r.sum ? info.navn : 'Ikke besvart'}</p>
        <span class="kp-oversikt__spor" role="img"
              aria-label="${r.navn}: ${r.god} svar som fungerer godt, ${r.midt} midt på treet, ${r.tung} som peker på en hindring.">
          ${r.sum ? `
          <span class="kp-oversikt__seg kp-oversikt__seg--god"  style="width:${(r.god / r.sum * 100).toFixed(1)}%"></span>
          <span class="kp-oversikt__seg kp-oversikt__seg--midt" style="width:${(r.midt / r.sum * 100).toFixed(1)}%"></span>
          <span class="kp-oversikt__seg kp-oversikt__seg--tung" style="width:${(r.tung / r.sum * 100).toFixed(1)}%"></span>` : ''}
        </span>
        <p class="kp-etappekort__dom">${r.dom}</p>
      </div>
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

function kpOppsummeringHtml() {
  const kurs = kpBeregnKurs();
  const info = KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT;
  const anb = kpAnbefalinger();
  const store = anb.filter(a => a.storrelse === 'stor');
  const smaa = anb.filter(a => a.storrelse === 'liten');
  const forAnnen = S.svarerFor === 'annen';
  const ubesvart = kpAntallSporsmal() - KOMPASS_SPORSMAL.filter(kpBesvart).length;

  const kort = (a, i) => {
    const hvorfor = typeof a.hvorfor === 'function' ? a.hvorfor(S) : a.hvorfor;
    const tekst = typeof a.tekst === 'function' ? a.tekst(S) : a.tekst;
    return `
    <article class="kp-tiltak__kort" data-storrelse="${a.storrelse}">
      <span class="kp-tiltak__rang">${a.storrelse === 'stor' ? 'Tiltak' : 'Enkelt grep'} ${i + 1}</span>
      <h3 class="hb-h4">${a.tittel}</h3>
      <p style="margin:var(--space-2) 0 0">${tekst}</p>
      <div class="kp-tiltak__hvorfor">
        <strong>Derfor står dette på lista di</strong>
        ${hvorfor}
      </div>
      ${a.tiltak.length ? `
        <p class="hb-small" style="margin:0 0 4px"><strong>Dette er blant tiltakene det nye tilskuddet dekker:</strong></p>
        <ul class="kp-merkeliste">
          ${a.tiltak.map(t => `<li class="kp-merke">${t}. ${KOMPASS_TILTAK[t]}</li>`).join('')}
        </ul>` : ''}
      ${a.ordninger.length ? `
      <button type="button" class="kp-mer" aria-expanded="false" data-mer="ordn-${a.id}">
        <span data-ikon="chevron"></span>Se hvem som kan være med og betale (${a.ordninger.length})
      </button>
      <div class="kp-mer-panel" id="ordn-${a.id}" hidden>
        ${a.ordninger.map(o => {
          const ord = KOMPASS_ORDNINGER[o];
          return `<div class="kp-ordning">
            <h4>${ord.navn}</h4>
            <p>${ord.kort}</p>
            <a class="hb-link" href="${ord.lenke}">${ord.lenketekst}</a>
          </div>`;
        }).join('')}
      </div>` : ''}
    </article>`;
  };

  return `
<div class="kp-utskrift-topp">
  <h1>Boligkompasset</h1>
  <p>Oppsummering for ${forAnnen ? 'boligen som ble kartlagt' : 'boligen din'}.
     Skrevet ut ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}.
     Husbanken, telefon ${HB_REGLER.telefon}.</p>
</div>

<section class="hb-section" style="padding-top:var(--space-4)">
  <div class="hb-shell">

    <p class="kp-utskrift-skjul" style="margin-bottom:var(--space-3)">
      <button type="button" class="kp-bytt" data-tilbake-svar>
        <span data-ikon="pil" style="transform:rotate(180deg)"></span>Gå tilbake og endre svar
      </button>
    </p>

    <h1 class="kp-h1 kp-utskrift-skjul">${forAnnen ? 'Kursen til boligen dere kartla' : 'Kursen din'}</h1>

    <div class="kp-resultat">
      <div class="kp-resultat__topp">
        <div class="kp-kompass-stort">${kpKompassSvg(kurs)}</div>
        <div>
          <p class="kp-resultat__kurs">Kompasset peker mot</p>
          <p class="kp-resultat__navn">${info.navn}</p>
          <p class="kp-resultat__tekst">${info.tekst}</p>
        </div>
      </div>
      <div class="kp-resultat__bunn">
        ${kpOversiktHtml()}
        ${ubesvart ? `
        <p class="hb-small hb-muted" style="margin-top:var(--space-3)">
          ${ubesvart} av ${kpAntallSporsmal()} spørsmål står ubesvart. Kursen blir sikrere jo flere du svarer på.
        </p>` : ''}
      </div>
    </div>

    ${kpEgenKursHtml()}

    ${store.length ? `
    <h2 class="hb-h2" style="margin-top:var(--space-7)">Dette bør du ta først</h2>
    <p style="max-width:58ch">
      Rekkefølgen er ikke tilfeldig. Veien inn i boligen kommer alltid øverst,
      for kommer du ikke inn og ut, hjelper det lite hva som er gjort inne.
      Deretter kommer badet, og så rommene.
    </p>
    <div class="kp-tiltak" style="margin-top:var(--space-4)">
      ${store.map(kort).join('')}
    </div>` : `
    <div class="hb-panel hb-panel--filled" style="margin-top:var(--space-7)">
      <h2 class="hb-h3">Ingen store tiltak å ta tak i nå</h2>
      <p style="margin:0">
        Svarene dine peker ikke på noe som haster. Det er et godt utgangspunkt.
        Se likevel gjennom de enkle grepene under. De er billige, de krever
        ingen søknad, og de er lettest å gjøre nettopp når ingenting haster.
      </p>
    </div>`}

    ${smaa.length ? `
    <h2 class="hb-h2" style="margin-top:var(--space-7)">Enkle grep du kan gjøre uansett</h2>
    <p style="max-width:58ch">
      Dette koster lite og krever verken søknad eller håndverker i uker.
      Flere av dem kan gjøres på en ettermiddag.
    </p>
    <div class="kp-tiltak" style="margin-top:var(--space-4)">
      ${smaa.map(kort).join('')}
    </div>` : ''}

    ${kpOkonomiHtml()}

    <h2 class="hb-h2" style="margin-top:var(--space-7)">Veien videre</h2>
    <div class="kp-neste">
      <div class="hb-card">
        <h3 class="hb-h4">Snakk med kommunen din</h3>
        <p class="hb-small">
          Ergoterapeuten i kommunen kommer hjem til deg, ser på boligen sammen
          med deg, og skriver den faglige begrunnelsen flere av ordningene
          krever. Det koster ingenting. Spør etter «boligrådgivning» eller
          «ergoterapitjenesten» i servicetorget.
        </p>
      </div>
      <div class="hb-card">
        <h3 class="hb-h4">Tilskudd til aldersvennlig oppgradering</h3>
        <p class="hb-small">
          Er du over 62 år, kan du få dekket 25 prosent av det du oppgraderer
          for, opptil 75 000 kroner. Du må søke før du setter i gang arbeidet.
        </p>
        <p style="margin:var(--space-2) 0 0"><a class="hb-link" href="https://pettersommerseth1994.github.io/husbanken/tilskudd.html">Se hva du kan få</a></p>
      </div>
      <div class="hb-card">
        <h3 class="hb-h4">Ta det opp med noen du stoler på</h3>
        <p class="hb-small">
          Skriv ut denne oppsummeringen og gå gjennom den med familie, en venn
          eller en nabo. De fleste bruker tid på å modne et sånt valg, og det
          er helt normalt. Papiret gjør samtalen konkret.
        </p>
      </div>
      <div class="hb-card">
        <h3 class="hb-h4">Ring oss</h3>
        <p class="hb-small">
          Er noe uklart, ring Husbanken på ${HB_REGLER.telefon}, hverdager
          09.00–15.00. Du trenger ikke ha bestemt deg for noe for å ringe.
        </p>
      </div>
    </div>

    <div class="kp-utskrift-notat">
      <strong>Plass til dine egne notater</strong>
    </div>

    <h2 class="hb-h2" style="margin-top:var(--space-7)">Ta vare på oppsummeringen</h2>
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:var(--space-3)" class="kp-utskrift-skjul">
      <button type="button" class="hb-btn hb-btn--primary" data-skriv-ut>Skriv ut eller lagre som PDF</button>
      <button type="button" class="hb-btn hb-btn--secondary" data-til-soknad>Ta svarene med i søknaden</button>
      <button type="button" class="hb-btn hb-btn--tertiary" data-tilbake-svar>Endre svarene mine</button>
      <button type="button" class="hb-btn hb-btn--tertiary" data-nullstill>Start på nytt</button>
    </div>
    <p class="hb-small hb-muted kp-utskrift-skjul" style="margin-top:var(--space-3);max-width:60ch">
      Du trenger ikke logge inn for å skrive ut. Utskriften er satt opp som et
      dokument du kan ta med til kommunen, til banken eller til en håndverker,
      med plass til egne notater nederst.
    </p>

    <h2 class="hb-h3" style="margin-top:var(--space-7)">Svarene dine</h2>
    <p class="hb-small hb-muted">Trykk på et svar for å endre det.</p>
    <ul class="kp-svarliste">${kpSvarlisteHtml()}</ul>

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
  <h2 class="hb-h2" style="margin-top:var(--space-7)">Vri kompasset selv</h2>
  <p style="max-width:58ch">
    Kompasset over er regnet ut fra svarene dine. Men du vet noe vi ikke
    vet: hvordan det faktisk er å bo der. Vri nåla dit du selv føler at du
    står, så ser du de to ved siden av hverandre.
  </p>

  <div class="kp-egen" id="kp-egen">
    <div class="kp-egen__rose" data-egen-rose>
      ${kpKompassSvg(kurs)}
    </div>
    <div>
      <p class="hb-small hb-muted" style="margin:0 0 2px">Du peker mot</p>
      <p class="kp-peiling__kurs" data-egen-navn>${kpKursnavn(kurs.retning)}</p>
      <p class="kp-peiling__tekst" data-egen-tekst>${(KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT).tekst}</p>

      <label class="kp-egen__merke" for="egen-kurs">Vri kompasset</label>
      <input class="kp-egen__skyv" id="egen-kurs" type="range"
             min="0" max="345" step="15" value="${grader}"
             aria-describedby="egen-avlest">
      <p class="hb-small" id="egen-avlest" aria-live="polite" data-egen-avlest>
        ${kpEgenSammenlikning(kurs.retning, regnet.retning)}
      </p>
      <p style="margin:var(--space-3) 0 0">
        <button type="button" class="kp-hopp" data-egen-nullstill>Sett nåla tilbake til vår utregning</button>
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

function kpOkonomiHtml() {
  const svart = ['ok-eier', 'ok-laan', 'ok-sparing', 'ok-maaned'].some(k => S[k]);
  if (!svart) {
    return `
    <div class="hb-note" style="margin-top:var(--space-7)">
      <span class="hb-note__icon" data-ikon="info"></span>
      <div>
        <strong>Du hoppet over spørsmålene om økonomi</strong>
        <p style="margin:4px 0 0">
          Det er helt greit. Derfor viser vi alle støtteordningene ved hvert
          tiltak i stedet for å velge ut de som passer deg best.
          <button type="button" class="kp-hopp" data-til-okonomi>Svar på dem nå</button>
        </p>
      </div>
    </div>`;
  }
  const sparing = S['ok-sparing'], maaned = S['ok-maaned'];
  const raad = [];
  if (sparing === '20' || sparing === '20-50') {
    raad.push('Du har oppgitt at du har noe oppspart. Det rekker til de enkle grepene over, og ofte til egenandelen på ett større tiltak.');
  }
  if (sparing === '50-100' || sparing === '100+') {
    raad.push('Det du har oppgitt i oppsparte midler, kan brukes som egenkapital i et større arbeid, for eksempel et bad.');
  }
  if (sparing === 'usikker' || maaned === 'usikker') {
    raad.push('Du oppga at du er usikker på tallene. Banken din regner på dette gratis, og kommunen kan gjøre det samme før du søker startlån.');
  }
  if (S['ok-eier'] === 'ja') {
    raad.push('Du oppga at du eier eiendom. Det gir deg flere muligheter i vanlig bank, og det påvirker hva du kan få i startlån.');
  }
  if (S['ok-eier'] === 'nei') {
    raad.push('Du oppga at du ikke eier eiendom. Da er startlån og tilskudd fra kommunen ofte den viktigste veien.');
  }
  if (maaned === '1000') {
    raad.push('Med rundt 1 000 kroner i måneden bør du regne på et mindre lån over lang tid, gjerne kombinert med tilskudd.');
  }
  if (maaned === '3000' || maaned === '3000+') {
    raad.push('Beløpet du oppga per måned, rekker til å finansiere et større byggearbeid. Snakk med banken din om rekkefølgen på tilskudd og lån.');
  }
  return `
  <div class="hb-panel" style="margin-top:var(--space-7)">
    <h2 class="hb-h3">Dette gjorde vi med svarene om økonomi</h2>
    <p>
      Du spurte kanskje hvorfor vi ville vite dette. Her er svaret: tallene
      dine endret ikke kursen i kompasset. Kompasset ser bare på boligen.
      Det vi brukte dem til, er å velge hvilke ordninger vi viser deg.
    </p>
    <ul style="margin:var(--space-3) 0 0;padding-left:1.2em">
      ${raad.map(r => `<li style="margin-bottom:var(--space-2)">${r}</li>`).join('')}
      <li>Ingenting av dette er kontrollert mot bank, skatt eller andre registre. Det er kun dine egne anslag.</li>
    </ul>
    <p class="hb-small hb-muted" style="margin:var(--space-3) 0 0">
      Husk at det nye tilskuddet dekker 25 prosent av det du oppgraderer for,
      opptil 75 000 kroner. Resten må du dekke selv eller låne.
    </p>
  </div>`;
}

function kpSvarlisteHtml() {
  const rader = [];
  KOMPASS_SPORSMAL.forEach(sp => {
    const tekstFor = (valg, v) => (valg.find(o => o.v === v) || {}).tittel || v;
    if (sp.type === 'flerfelt') {
      sp.felt.forEach(f => rader.push({
        id: sp.id, sp: f.ledetekst,
        svar: S[f.navn] ? tekstFor(f.valg, S[f.navn]) : 'Ikke besvart'
      }));
    } else if (sp.type === 'flervalg') {
      const v = S[sp.id];
      rader.push({
        id: sp.id, sp: sp.tittel,
        svar: Array.isArray(v) && v.length ? v.map(x => tekstFor(sp.valg, x)).join(', ') : 'Ikke besvart'
      });
    } else {
      const v = S[sp.id];
      rader.push({
        id: sp.id, sp: sp.tittel,
        svar: v === 'hoppet' ? 'Hoppet over' : v ? tekstFor(sp.valg, v) : 'Ikke besvart'
      });
    }
  });
  return rader.map(r => `
    <li>
      <span class="kp-svarliste__sp">${r.sp}</span>
      <span class="kp-svarliste__sv">${kpEsc(r.svar)}</span>
      <button type="button" class="kp-hopp kp-utskrift-skjul" data-endre="${r.id}">Endre</button>
    </li>`).join('');
}

/* ═══ Snarveien nederst ═══════════════════════════════════════════
   Bare for prototypen. Fyller ut tilfeldige svar og hopper rett til
   oppsummeringen, så man slipper å klikke seg gjennom 20 spørsmål
   hver gang man skal se på den siste siden.

   Lagringslinja som sto her før, er tatt ut. Svarene lagres fortsatt
   ved hvert eneste valg, den ble bare ikke lenger annonsert.
   ─────────────────────────────────────────────────────────────────── */

function kpTegnBunn() {
  kpOppdaterTabber();
  const el = document.getElementById('kp-bunn-verktoy');
  if (!el) return;
  el.innerHTML = `
  <div class="hb-shell">
    <p class="kp-snarvei__tekst">
      <strong>Snarvei for prototypen.</strong>
      Fyller ut tilfeldige svar på alle 20 spørsmålene og går rett til oppsummeringen.
    </p>
    <button type="button" class="hb-btn hb-btn--secondary" data-tilfeldig>
      Fyll ut tilfeldig og vis oppsummeringen
    </button>
  </div>`;
}

/* Tilfeldige, men gyldige svar. Flervalg får ett til tre kryss, og
   «ingen av delene» får stå alene slik reglene ellers krever. */
function kpFyllTilfeldig() {
  const trekk = liste => liste[Math.floor(Math.random() * liste.length)];
  S = { startet: true, svarerFor: 'meg' };

  const settFelt = (sp, felt) => {
    const valg = felt ? felt.valg : sp.valg;
    const navn = felt ? felt.navn : sp.id;
    if (!felt && sp.type === 'flervalg') {
      const alene = valg.filter(v => v.alene);
      if (alene.length && Math.random() < 0.25) { S[navn] = [trekk(alene).v]; return; }
      const vanlige = valg.filter(v => !v.alene);
      const antall = 1 + Math.floor(Math.random() * Math.min(3, vanlige.length));
      S[navn] = [...vanlige].sort(() => Math.random() - 0.5).slice(0, antall).map(v => v.v);
      return;
    }
    const valgt = trekk(valg);
    S[navn] = valgt.v;
    if (valgt.oppfolging) {
      const o = valgt.oppfolging.valg;
      S[navn + '-opp'] = [trekk(o).v];
    }
  };

  KOMPASS_SPORSMAL.forEach(sp => {
    if (sp.type === 'flerfelt') sp.felt.forEach(f => settFelt(sp, f));
    else settFelt(sp, null);
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
    rot.innerHTML = kpStartHtml();
  } else if (kpModus === 'liste') {
    frem.innerHTML = '';
    rot.innerHTML = kpListeHtml();
  } else if (kpModus === 'oppsummering') {
    frem.innerHTML = '';
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
  if (kpModus === 'liste') kpInitTabber();
  else if (kpInitTabber._av) kpInitTabber._av();
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

/* Nåla og teksten oppdateres på stedet, ikke ved å tegne boksen på
   nytt. Byttet vi ut hele boksen, ville nettleseren lage et nytt
   SVG-element som er ferdig rotert fra første bilde, og da hopper nåla
   i stedet for å svinge. Her endrer vi bare transform på den samme
   noden, så CSS-overgangen på 700 ms får gå. */
function kpOppdaterPeiling(kurs) {
  const boks = document.getElementById('peiling');
  if (!boks) return;

  const t = kpPeilingTekster(kurs);
  const vinkel = (Math.atan2(kurs.x, kurs.y) * 180 / Math.PI) || 0;
  const skala = 0.52 + 0.48 * (kurs.r || 0);

  const naal = boks.querySelector('[data-naal]');
  if (naal) naal.style.transform = `rotate(${vinkel.toFixed(1)}deg) scale(${skala.toFixed(2)})`;

  const svg = boks.querySelector('[data-kompass]');
  if (svg) {
    svg.setAttribute('aria-label', kpKompassTekst(kurs));
    svg.dataset.tom = kurs.tom ? '1' : '0';
    svg.dataset.vei = kpNaalVei(kurs);
  }

  /* Kvadranten nåla peker inn i, tonet litt sterkere */
  const kv = kurs.r > 0.24
    ? (kurs.y >= 0 ? (kurs.x >= 0 ? 'nø' : 'nv') : (kurs.x >= 0 ? 'sø' : 'sv'))
    : null;
  boks.querySelectorAll('[data-kv]').forEach(f => {
    const aktiv = f.dataset.kv === kv;
    f.classList.toggle('kp-kompass__felt--aktiv', aktiv);
    f.setAttribute('fill', aktiv ? 'var(--hb-green-600)' : 'var(--hb-slate-400)');
  });

  const sett = (velger, tekst) => {
    const el = boks.querySelector(velger);
    if (el) el.textContent = tekst;
  };
  sett('[data-kurs-over]', t.over);
  sett('[data-kurs-navn]', t.navn);
  sett('[data-kurs-tekst]', t.tekst);

  boks.querySelectorAll('.kp-nokkel__rad').forEach((rad, i) => {
    if (KP_NOKKEL[i].kode === kurs.retning) rad.setAttribute('data-naa', 'true');
    else rad.removeAttribute('data-naa');
  });
}

/* ═══ Svar ════════════════════════════════════════════════════════ */

function kpSettSvar(navn, verdi, sp) {
  S[navn] = verdi;
  kpLagre();
  if (sp) kpOppdaterPeiling(kpKursForSteg(sp.etappe));
}

function kpLesSkjema(rot) {
  /* Fanger opp alle endringer i ett, så modusene deler kode */
  rot.addEventListener('change', ev => {
    const inp = ev.target;
    if (!inp.name) return;

    /* Hvilket spørsmål og felt hører dette til? */
    let sp = KOMPASS_SPORSMAL.find(s => s.id === inp.name);
    let felt = null;
    if (!sp) {
      KOMPASS_SPORSMAL.forEach(s => {
        if (s.type !== 'flerfelt') return;
        const f = s.felt.find(x => x.navn === inp.name);
        if (f) { sp = s; felt = f; }
      });
    }

    if (inp.name === 'svarerFor') { S.svarerFor = inp.value; kpLagre(); return; }

    /* Oppfølgingsspørsmål, for eksempel «hvem hjelper deg» */
    if (inp.name.endsWith('-opp')) {
      const verdier = [...rot.querySelectorAll(`input[name="${inp.name}"]:checked`)].map(i => i.value);
      S[inp.name] = verdier; kpLagre(); return;
    }

    if (!sp) return;

    if (sp.type === 'flervalg') {
      let verdier = [...rot.querySelectorAll(`input[name="${inp.name}"]:checked`)].map(i => i.value);
      /* «Ingen av delene» utelukker resten, og omvendt */
      if (inp.dataset.alene && inp.checked) {
        verdier = [inp.value];
        rot.querySelectorAll(`input[name="${inp.name}"]`).forEach(i => { if (!i.dataset.alene) i.checked = false; });
      } else if (inp.checked) {
        verdier = verdier.filter(v => v !== 'ingen');
        rot.querySelectorAll(`input[name="${inp.name}"][data-alene]`).forEach(i => { i.checked = false; });
      }
      kpSettSvar(inp.name, verdier, sp, null);
    } else {
      kpSettSvar(inp.name, inp.value, sp, felt);
      /* Tegn oppfølgingsspørsmålet hvis svaret utløser ett */
      const valgt = (sp.valg || []).find(v => v.v === inp.value);
      const gammel = rot.querySelector('#oppfolging');
      if (valgt && valgt.oppfolging) {
        const ny = kpOppfolgingHtml(sp);
        if (gammel) gammel.outerHTML = ny;
        else inp.closest('.kp-felt, .kp-liste__sporsmal').insertAdjacentHTML('beforeend', ny);
      } else if (gammel && sp.valg && sp.valg.some(v => v.oppfolging)) {
        gammel.remove();
      }
    }
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

/* «Fint om svarene tas med videre inn i søknaden.» Her skrives de
   inn i samme lager som søknaden om tilskudd leser fra. */
function kpTilSoknad() {
  const kart = {
    'inngang-tung': 'adkomst', 'trinn-mange': 'adkomst', 'trinn-faa': 'adkomst',
    'vei-frem': 'adkomst', 'inngangsparti': 'adkomst', 'fellesareal': 'adkomst',
    'bad-ombygging': 'bad', 'dusjsone': 'bad', 'bad-dor': 'bad',
    'trapp': 'trapp', 'terskler': 'dorer', 'rom-plan': 'dorer'
  };
  const tiltak = new Set();
  kpAnbefalinger().forEach(a => { if (kart[a.id]) tiltak.add(kart[a.id]); });
  if (kpAnbefalinger().some(a => a.id === 'lys-trygghet')) { tiltak.add('lys'); tiltak.add('trygghet'); }

  hbOppdater({
    tiltak: [...tiltak],
    eierform: S.eieform === 'leier' ? 'leier' : 'eier',
    borettslag: (S.boligtype === 'leilighet' || S.boligtype === 'rekkehus') ? 'ja' : 'nei',
    fraKompasset: true
  });
  location.href = 'https://pettersommerseth1994.github.io/husbanken/soknad-start.html';
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
  else if (d.fortsett !== undefined) { kpModus = S.modus || 'kompass'; kpPos = S.posisjon || 0; kpTegn(); }
  else if (d.nullstill !== undefined) kpNullstill();
  else if (d.neste !== undefined) kpNeste();
  else if (d.forrige !== undefined) kpGaaTil(kpPos - 1);
  else if (d.hoppEtappe !== undefined) {
    /* Forbi både spørsmålene og oppsummeringen av etappen. En
       oppsummering av noe man har hoppet over, sier ingenting. */
    const e = KP_FLYT[kpPos].e;
    const siste = KP_FLYT.map((f, i) => (f.t === 'sp' || f.t === 'etappeslutt') && f.e && f.e.id === e.id ? i : -1)
                         .filter(i => i >= 0).pop();
    kpGaaTil(siste + 1);
  }
  else if (d.bytt) {
    kpModus = d.bytt; S.modus = d.bytt; kpLagre(); kpTegn();
  }
  else if (d.oppsummering !== undefined) { kpModus = 'oppsummering'; kpLagre(); kpTegn(); }
  else if (d.tilStart !== undefined) { kpModus = 'start'; kpTegn(); }
  else if (d.tilbakeSvar !== undefined) { kpModus = S.modus === 'liste' ? 'liste' : 'kompass'; if (kpModus === 'kompass') kpPos = Math.max(0, KP_FLYT.length - 2); kpTegn(); }
  else if (d.tilOkonomi !== undefined) { kpModus = 'kompass'; kpGaaTil(KP_FLYT.findIndex(f => f.t === 'etappe' && f.e.id === 'okonomi')); }
  else if (d.endre) kpTilSporsmal(d.endre);
  else if (d.skrivUt !== undefined) window.print();
  else if (d.tilSoknad !== undefined) kpTilSoknad();

  else if (d.tilfeldig !== undefined) kpFyllTilfeldig();
  else if (d.mer) {
    const p = document.getElementById(d.mer);
    const aapen = t.getAttribute('aria-expanded') === 'true';
    t.setAttribute('aria-expanded', String(!aapen));
    p.hidden = aapen;
  }
  else if (d.tab) {
    /* Vi ruller selv i stedet for å la lenka gjøre det. Nettleserens
       eget ankerhopp oppførte seg ujevnt over de lange avstandene her,
       og vi trenger dessuten å legge på plass til fanerada som ligger
       fast øverst på smal skjerm. */
    ev.preventDefault();
    const maal = document.getElementById('etappe-' + d.tab);
    if (!maal) return;
    const fanerad = document.querySelector('.kp-tabs');
    const smal = window.matchMedia('(max-width: 899px)').matches;
    const fast = smal && fanerad ? fanerad.getBoundingClientRect().height + 12 : 24;
    const rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mot = Math.max(0, maal.getBoundingClientRect().top + window.scrollY - fast);
    const fra = window.scrollY;
    /* «auto» ville betydd «gjør som CSS sier», og CSS sier smooth.
       Skal vi hoppe, må det stå «instant». */
    window.scrollTo({ top: mot, behavior: rolig ? 'instant' : 'smooth' });

    /* Myk rulling drives av bildeoppdateringene, og de står stille når
       fanen ligger i bakgrunnen eller maskinen sparer strøm. Kommer
       rullingen ikke i gang, hopper vi i stedet. Da skjer det alltid
       noe når man trykker på en fane. */
    if (!rolig) {
      setTimeout(() => {
        if (Math.abs(window.scrollY - fra) < 4 && Math.abs(mot - fra) > 4) {
          window.scrollTo({ top: mot, behavior: 'instant' });
        }
      }, 600);
    }

    if (kpInitTabber._merk) kpInitTabber._merk(d.tab);
    history.replaceState(null, '', '#etappe-' + d.tab);
    maal.setAttribute('tabindex', '-1');
    maal.focus({ preventScroll: true });
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
  if (p.get('modus') === 'liste') { kpModus = 'liste'; S.modus = 'liste'; }
  if (p.get('modus') === 'kompass') { kpModus = 'kompass'; kpPos = Math.min(S.posisjon || 0, KP_FLYT.length - 1); }
  if (p.get('vis') === 'oppsummering') kpModus = 'oppsummering';

  const rot = document.getElementById('kompasset');
  document.addEventListener('click', kpKlikk);
  kpLesSkjema(rot);
  kpTegn();
}
