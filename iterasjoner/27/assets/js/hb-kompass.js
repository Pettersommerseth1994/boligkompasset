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
const KP_LAGER = 'hb-boligkompasset-iterasjon-27';

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
   Nåla begynner rett opp, på «Fungerer godt», og hvert svar vrir den
   et bestemt antall grader med klokken. Gradene fra alle svarene
   legges sammen. Møtet 27. oktober: kompasset kommer bare til slutt,
   regnet av alle svarene, og med en forklaring på hvordan.

   Tilbakemeldingen 28. oktober: retningene følger klokken, Fungerer
   godt, Enkle grep, Større grep og Omfattende grep. Nåla går derfor én
   vei rundt, fra toppen og til venstre side, og summen holdes mellom 0
   og 270 grader, så den aldri går forbi «Omfattende grep».
   ─────────────────────────────────────────────────────────────────── */

/* Hvor mange grader nedover ett svar drar. Et svar som fungerer godt,
   drar 22,5 grader oppover. */
function kpGraderNed(n) {
  if (n >= 0.75) return -22.5;
  if (n >= 0.25) return 0;
  if (n >= -0.25) return 22.5;
  if (n >= -0.75) return 45;
  return 90;
}

const KP_MAKS_GRADER = 270;

function kpKursAvVinkel(grader, ekstra = {}) {
  const rad = grader * Math.PI / 180;
  const x = Math.sin(rad), y = Math.cos(rad);
  return Object.assign({ x, y, r: 1, grader, retning: kpRetning(x, y, 0.2), tom: false }, ekstra);
}

const KP_TOMKURS = { x: 0, y: 1, r: 0, grader: 0, retning: 'MIDT', tom: true, antall: 0 };

/* Svaret på en enhet, som tekst til forklaringen */
function kpSvarTekst(sp, felt) {
  const navn = felt ? felt.navn : sp.id;
  const valg = felt ? felt.valg : sp.valg;
  const svar = [].concat(S[navn]);
  return svar.map(v => (valg.find(x => x.v === v) || {}).tittel).filter(Boolean).join(', ');
}

/* Hvert svar som teller, med hvor mange grader det vrir nåla, og til
   hvilken side. Dette er både utregningen og forklaringen av den. */
function kpUtregning() {
  const rader = [];
  kpEnheter().forEach(({ sp, felt }) => {
    const p = kpPoengFor(sp, felt);
    if (!p) return;
    rader.push({
      sporsmal: felt ? felt.ledetekst : (sp.stikkord || sp.tittel),
      svar: kpSvarTekst(sp, felt),
      grader: sp.graderNed ? sp.graderNed(S[sp.id]) : kpGraderNed(p.n),
      etappe: sp.etappe
    });
  });

  /* To porter fra innsiktsarbeidet. Er inngangen stengt, eller er
     nærmiljøet tomt og du har ingen som kan hjelpe, holder det ikke at
     resten er bra. Nåla går da minst til «Omfattende grep». */
  const porter = [];
  if (kpInngangStengt(S)) porter.push('Du må gå i trapp for å komme inn, og bygget har ikke heis.');
  if (S.tjenester === 'sterkt' && S.hjelp === 'nei') porter.push('Det blir svært vanskelig å komme deg frem til tilbudene, og du har ingen som kan hjelpe deg.');
  return { rader, porter };
}

/* Kursen for alle svarene samlet, eller for ett steg. Kompasset per
   steg står under «Kompasset ditt», som i iterasjon 10 til 25.
   Tilbakemeldingen 28. oktober ba om å få dem tilbake. Portene gjelder
   bare det samlede kompasset. */
function kpBeregnKurs(etappeId) {
  const alt = kpUtregning();
  const rader = etappeId ? alt.rader.filter(r => r.etappe === etappeId) : alt.rader;
  const porter = etappeId ? [] : alt.porter;
  const kompassSp = KOMPASS_SPORSMAL.filter(sp => !sp.ikkeKompass && (!etappeId || sp.etappe === etappeId));
  const felles = { antall: rader.length, svart: kompassSp.filter(kpBesvart).length, totalt: kompassSp.length };
  if (!rader.length) return Object.assign({}, KP_TOMKURS, felles);

  const sum = rader.reduce((n, r) => n + r.grader, 0);
  let grader = Math.max(0, Math.min(KP_MAKS_GRADER, sum));
  if (porter.length) grader = KP_MAKS_GRADER;
  return kpKursAvVinkel(grader, Object.assign({ sum }, felles));
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

/* ═══ Kompasset som figur ═════════════════════════════════════════ */

/* Grønn nål til og med «Enkle grep», rød fra «Større grep» og videre
   rundt. Fargen skal si det samme som etikettene. */
const kpNaalVei = kurs =>
  kurs.tom ? 'tom' : (kurs.grader < 112.5 ? 'opp' : 'ned');

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
  /* Bredden er satt av den lengste etiketten, «Omfattende grep» til
     venstre, ikke av rosa. Blir boksen smalere, skjæres den av i kanten. */
  const vb = liten ? '0 0 200 200' : '0 0 380 210';
  const cx = liten ? 100 : 190, cy = liten ? 100 : 103, r = liten ? 88 : 70;

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
    <text class="kp-kompass__etikett kp-kompass__etikett--n" x="${cx}" y="24" text-anchor="middle">${kpKursnavn('N')}</text>
    <text class="kp-kompass__etikett" x="${cx}" y="192" text-anchor="middle">${kpKursnavn('S')}</text>
    <text class="kp-kompass__etikett" x="${cx + r + 8}" y="108" text-anchor="start">${kpKursnavn('Ø')}</text>
    <text class="kp-kompass__etikett" x="${cx - r - 8}" y="108" text-anchor="end">${kpKursnavn('V')}</text>`;

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
    <!-- Nåla har bare spiss, ingen hale. Med hale kunne den leses som
         om den pekte begge veier. -->
  </g>
  <circle class="kp-kompass__nav" cx="${cx}" cy="${cy}" r="8.5"/>
  <circle cx="${cx}" cy="${cy}" r="3.4" fill="#fff"/>
  ${etiketter}
</svg>`;
}

/* ═══ Små byggeklosser ════════════════════════════════════════════ */

const kpEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Hjelpeteksten står framme, med avsnittene i masterfila holdt
   adskilt. Det masterfila kaller Popover på et spørsmål, er et eget
   avsnitt til slutt. Tilbakemeldingen 21. oktober: en blå boks ser ut
   som det viktigste på sida, og tar oppmerksomheten fra refleksjonen
   i teksten over. */
const kpAvsnitt = (tekst, klasse = 'hb-felt-beskrivelse', popover = '') =>
  [...String(tekst || '').split(/\n\s*\n/), popover].filter(a => a && a.trim())
    .map(a => `<p class="${klasse}">${a.trim()}</p>`).join('');

/* Popover på et svaralternativ er Fasadens hjelpetekst: et
   spørsmålstegn etter svaret som folder ut teksten på stedet.
   Tilbakemeldingen 21. oktober: tekst under svarene gjorde
   avkrysningen rotete, og spørsmålstegnet klarer folk å trykke på. */
let kpHjelpNr = 0;
function kpHjelpetekst(tekst) {
  const id = `hjelpetekst-${++kpHjelpNr}`;
  return `<span class="hb-hjelpetekst"><button type="button" class="hb-hjelpetekst-knapp" aria-expanded="false" aria-controls="${id}" data-hjelpetekst><span aria-hidden="true">?</span><span class="hb-screenreader-only">Mer om dette</span></button><span class="hb-hjelpetekst-innhold" id="${id}"><span class="hb-hjelpetekst-tekstgruppe">${tekst}</span></span></span>`;
}

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
          <label class="hb-label-tekst" for="${id}">${v.tittel}</label>${v.popover ? kpHjelpetekst(v.popover) : ''}
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
function kpDelfeltHtml(navn, ledetekst, hjelp, valg, type, gjeldende, popover = '') {
  return `
  <div class="hb-felt kp-felt" data-felt="${navn}">
    <div class="hb-fieldset">
      <div class="hb-legend"><span class="hb-legend-tekst" aria-hidden="true">${ledetekst}</span></div>
      ${kpAvsnitt(hjelp, 'hb-felt-beskrivelse', popover)}
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
   verdien». Tilbakemeldingen 21. oktober kortet det ned: introteksten
   med startknappen rett under, «Hvorfor gjøre det nå?», kompasset du
   kan klikke på for å se hvor kartleggingen kan føre, og papirutgaven
   helt nederst.
   ─────────────────────────────────────────────────────────────────── */

const KP_PAPIR_PDF = '../../assets/pdf/boligkompasset-papirutgave.pdf';

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
          Kartlegg din bolig ved å svare på ${kpAntallSporsmal()} spørsmål og finn ut hvor godt
          egnet boligen din vil være når du blir eldre eller at helsen endrer seg.
        </p>
        <div class="kp-hero__start">
          ${kpKnapp('Start kartleggingen', 'data-start="kompass"', 'prominent', 'pil')}
        </div>
        <p class="hb-text--sm">
          Du trenger ikke logge inn. Ingenting sendes til Husbanken før du selv velger det.
        </p>
        <p class="hb-text--sm hb-mb--none kp-forbehold--start">${KP_FORBEHOLD}</p>
      </div>
      <img class="kp-hero__ill" src="../../assets/img/boligkompasset.svg" alt=""
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

    <div class="hb-card kp-hvorfor">
      <h2 class="hb-h4">Hvorfor gjøre det nå?</h2>
      <p class="hb-mb--none">
        De fleste ønsker å bo hjemme så lenge som mulig. Mange pusser opp boligen
        sin flere ganger i løpet av livet. Da kan det være lurt å gjøre noen grep
        som gjør det enklere å bo i boligen også når du blir eldre eller at helsen
        endrer seg. Velger du å ta grep nå, så kan du selv bestemme løsningene.
      </p>
    </div>

    <div class="hb-panel hb-panel--noytral kp-veier">
      <div>
        <h2 class="hb-h2">Kartleggingen kan føre fire veier</h2>
        <p>
          Kompasset er ikke en karakter. Det er en peiling. Når du har svart på
          alle spørsmålene, peker nåla mot det som passer boligen din best.
          Trykk på en retning for å se hva den betyr.
        </p>
        <div class="kp-kurser">
          ${['N', 'Ø', 'S', 'V'].map(kursKnapp).join('')}
        </div>
        <p class="hb-text--sm hb-text--secondary kp-kursforklaring" id="kurs-forklaring">
          Nåla under står i ro til du begynner å svare.
        </p>
      </div>
      <div>
        <div class="kp-kompass-stort" id="start-kompass">${kpKompassSvg(kurs)}</div>
      </div>
    </div>

    <div class="hb-card kp-papir">
      <div class="hb-card-header"><h2 class="hb-card-tittel">På papir</h2></div>
      <div class="hb-card-body">
        <p>
          Alle spørsmålene og svaralternativene på et skjema, som du kan skrive ut.
          For å få en handlingsplan må du legge inn svarene dine i Boligkompasset på nett.
        </p>
      </div>
      <div class="hb-card-footer">
        <a class="hb-button hb-button--standard hb-button--l" href="${KP_PAPIR_PDF}" target="_blank" rel="noopener">
          <span class="hb-button-text">Åpne papirutgaven (PDF)</span>
          <span class="hb-screenreader-only">, åpnes i nytt vindu</span>
        </a>
      </div>
    </div>

  </div>
</section>`;
}

/* ═══ Framdriften ═════════════════════════════════════════════════
   Fasadens progress stepper viser de fire stegene. Det er den eneste
   framdriften. Designgjennomgangen 21. oktober: to framdriftsvisninger
   var forvirrende, og antallet spørsmål varierer med svarene.

   Stepperen tegnes på nytt for hver skjerm, og da spilte Fasadens animasjon
   av det aktive steget hver gang, også mellom to spørsmål i samme steg.
   Nå får den bare spille når du går videre til et nytt steg.

   Stegene du er ferdig med, er lenker, slik Fasaden gjør det med
   a.hb-progress-stepper-valg. Tilbakemeldingen 28. oktober: står du på
   steg 4 og vil se steg 2 igjen, trykker du på 2.
   ─────────────────────────────────────────────────────────────────── */

let kpForrigeSteg = null;

function kpFramdriftHtml() {
  const f = KP_FLYT[kpPos];
  const etappeNr = f.t === 'slutt' ? KOMPASS_ETAPPER.length
    : KOMPASS_ETAPPER.findIndex(e => e.id === f.e.id) + 1;
  const nyttSteg = kpForrigeSteg !== null && etappeNr > kpForrigeSteg;
  kpForrigeSteg = etappeNr;

  return `
<div class="kp-framdrift kp-utskrift-skjul${nyttSteg ? '' : ' kp-framdrift--rolig'}">
  <div class="hb-shell">
    <div class="hb-progress-stepper">
      <nav class="hb-progress-stepper-nav" aria-label="Stegene i Boligkompasset">
        <ol class="hb-progress-stepper-list">
          ${KOMPASS_ETAPPER.map((e, i) => {
            /* Et steg lenger fram er også ferdig når alle spørsmålene i det
               er besvart, så du kommer tilbake dit du var */
            const aktiv = i + 1 === etappeNr;
            const ferdig = !aktiv && (i + 1 < etappeNr
              || KOMPASS_SPORSMAL.filter(sp => sp.etappe === e.id).every(kpBesvart));
            const innhold = `
              <span class="hb-icon hb-icon--size400 hb-icon--encapsulated" aria-hidden="true"><span class="hb-text--lg">${i + 1}</span></span>
              <span class="hb-progress-stepper-list-item-text">${e.navn}</span>`;
            return `
          <li class="hb-progress-stepper-list-item${ferdig ? ' hb-is-valid' : ''}${aktiv ? ' hb-is-active' : ''}">
            ${ferdig ? `<a class="hb-progress-stepper-valg" href="#steg-${i + 1}" data-til-steg="${e.id}">${innhold}
              <span class="hb-screenreader-only">, gå tilbake til steget</span></a>`
            : `<span class="hb-progress-stepper-valg${!aktiv ? ' hb-progress-stepper--deactivated' : ''}"${aktiv ? ' aria-current="step"' : ''}>${innhold}
            </span>`}
          </li>`;
          }).join('')}
        </ol>
      </nav>
      <p class="kp-framdrift__steg">
        <span class="hb-text--semibold">Steg ${etappeNr} av ${KOMPASS_ETAPPER.length}</span>
        · ${f.t === 'slutt' ? 'Oppsummering' : f.e.navn}
      </p>
    </div>
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
  `<h1 class="${storrelse} kp-tittel">${over ? `<small class="hb-h1-overtittel">${over}</small> ` : ''}${tittel}</h1>`;

/* Spørsmålet med «SPØRSMÅL 3 AV 12» over. Tilbakemeldingen 28.
   oktober: uten den grønne boksen, i store bokstaver og med mer luft
   ned til spørsmålet. */
const kpSporsmalTittel = (over, tittel) =>
  `<h1 class="hb-h2 kp-tittel"><small class="kp-overtittel">${over}</small> ${tittel}</h1>`;

/* Begge knappene står til venstre, «Forrige» først og «Neste» rett
   ved siden av. Designgjennomgangen 21. oktober: helt til høyre blir
   «Neste» borte for skjermleser og for den som har tunnelsyn. */
function kpNavHtml(neste, forrige = true) {
  return `
  <div class="kp-nav">
    ${forrige ? kpKnapp('Forrige', 'data-forrige', 'standard') : ''}
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
    <div class="kp-etappe-kort__innhold">
      ${kpTittel('', f.e.navn)}
      <div class="kp-etappe-kort__ingress">${kpAvsnitt(f.e.ingress, 'hb-text--ingress')}</div>
    </div>
  </div>
  ${kpNavHtml(f.nr === 1 ? 'Til første spørsmål' : 'Fortsett', kpPos > 0)}
</div>`;
}

/* Fasadens trekkspill, hb-accordion med kantlinje, for det man kan
   lese mer om. Pila er Fasadens ikon arrow-down-1. */
const KP_PIL_NED = '<svg focusable="false" aria-hidden="true" viewBox="0 0 24 24" fill="none">'
  + '<path d="M23.25 7.311L12.53 18.03a.75.75 0 0 1-1.06 0L.75 7.311" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const kpTrekkspill = elementer => `
  <div class="hb-accordion hb-accordion--kantlinje kp-forklaringer">
    ${elementer.map(({ id, tittel, innhold }) => `
    <div class="hb-accordion-element">
      <button type="button" class="hb-accordion-header" aria-expanded="false" aria-controls="${id}" data-trekk>
        <span class="hb-accordion-tittel">${tittel}</span>
        <span class="hb-icon hb-accordion-toggle" aria-hidden="true">${KP_PIL_NED}</span>
      </button>
      <div class="hb-accordion-body" id="${id}">${innhold}</div>
    </div>`).join('')}
  </div>`;

/* ═══ Spørsmålsskjermen ═══════════════════════════════════════════
   Spørsmålet er overskriften, hjelpeteksten står rett under, og så
   kommer svarene. Kompasset vises ikke her lenger. Én nål som flytter
   seg for hvert svar, var vanskelig å lese noe ut av, og den tok
   oppmerksomheten bort fra spørsmålet.
   ─────────────────────────────────────────────────────────────────── */

function kpFelterHtml(sp) {
  if (sp.type === 'flerfelt') {
    return sp.felt.map(felt =>
      kpDelfeltHtml(felt.navn, felt.ledetekst, felt.hjelp, felt.valg, 'enkelt', S[felt.navn], felt.popover)).join('');
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
    ${kpDelfeltHtml(b.navn, b.ledetekst, b.hjelp, b.valg, 'enkelt', S[b.navn], b.popover)}
  </div>`;
}

function kpSporsmalHtml(f) {
  const sp = f.sp;
  const nr = kpSporsmalNr(kpPos);
  return `
<div class="kp-sporsmal">
  ${kpSporsmalTittel(`Spørsmål ${nr} av ${kpAntallSporsmal()}`, sp.tittel)}
  ${sp.hjelp || sp.popover ? `<div class="kp-hjelp">${kpAvsnitt(sp.hjelp, 'kp-hjelp__tekst', sp.popover)}</div>` : ''}
  ${sp.undertekst ? `<p class="hb-text--semibold kp-sporsmal__under">${sp.undertekst}</p>` : ''}

  <form id="sporsmalsform" novalidate>
    ${kpFelterHtml(sp)}
  </form>

  ${kpNavHtml(nr === kpAntallSporsmal() ? 'Se oppsummeringen' : 'Neste')}
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

/* ═══ Resultatet, med veiledningstekstene ═════════════════════════
   Kolonne C i masterfila: én tekst per svar, som sier hva svaret betyr
   for deg. Sortert i det som fungerer i dag, det som kan bli en
   utfordring, og det du var usikker på, steg for steg.

   For rommene i 3a og vaskemaskinen på badet står teksten under det du
   IKKE krysset av, slik arket sier. Et spørsmål du ikke har svart på,
   gir ingen tekst.
   ─────────────────────────────────────────────────────────────────── */

const KP_GRUPPER = [
  { id: 'bra',        tittel: 'Dette fungerer i dag' },
  { id: 'utfordring', tittel: 'Dette fungerer ikke i dag' },
  { id: 'usikker',    tittel: 'Dette var du usikker på' }
];

function kpVeiledningFor(etappeId) {
  const funn = { bra: [], utfordring: [], usikker: [] };
  const legg = (sporsmal, svar, v, tekst) => funn[v.gruppe || 'utfordring'].push({ sporsmal, svar, tekst });

  const ettFelt = (sporsmal, valg, svar) => {
    if (svar === undefined || svar === null || svar === 'hoppet') return;
    if (Array.isArray(svar)) {
      if (!svar.length) return;
      valg.filter(v => !v.vis || v.vis(S)).forEach(v => {
        const valgt = svar.includes(v.v);
        if (valgt && v.veiledning) legg(sporsmal, v.tittel, v, v.veiledning);
        if (!valgt && v.veiledningUten && !svar.includes('usikker')) legg(sporsmal, `Mangler ${v.tittel.charAt(0).toLowerCase() + v.tittel.slice(1)}`, v, v.veiledningUten);
      });
      return;
    }
    const v = valg.find(x => x.v === svar);
    if (v && v.veiledning) legg(sporsmal, v.tittel, v, v.veiledning);
  };

  KOMPASS_SPORSMAL.filter(sp => sp.etappe === etappeId).forEach(sp => {
    if (sp.type === 'flerfelt') {
      sp.felt.forEach(f => ettFelt(f.ledetekst, f.valg, S[f.navn]));
    } else {
      ettFelt(sp.stikkord || sp.tittel, sp.valg, S[sp.id]);
    }
    const b = sp.betinget;
    if (b && b.naar(S)) ettFelt(b.ledetekst, b.valg, S[b.navn]);
  });
  return funn;
}

/* «Les mer» som folder ut teksten på stedet. Brukes for veiledningen
   i oppsummeringen og fagteksten i handlingsplanen. Møtet 27. oktober
   ba om fem varianter av dette, se forslag-26.html. Dette er nr. 1. */
let kpMerNr = 0;
function kpLesMer(innhold, tittel = 'Les mer') {
  const id = `les-mer-${++kpMerNr}`;
  return `
    <button type="button" class="hb-button hb-button--link kp-lesmer" aria-expanded="false" aria-controls="${id}" data-mer="${id}">
      <span class="hb-button-text">${tittel}</span><span class="kp-lesmer__pil" aria-hidden="true">${KP_PIL_NED}</span>
    </button>
    <div class="kp-lesmer__innhold" id="${id}" hidden>${innhold}</div>`;
}

/* Hva som fungerer i dag og hva som ikke gjør det, i to bokser som i
   iterasjon 22. Hvert punkt er kort. Veiledningen fra kolonne C står
   bak «Les mer». Møtet 27. oktober: boksene var lettere å få oversikt
   over enn lange tekster under hverandre. */
function kpResultatHtml() {
  const funn = { bra: [], utfordring: [], usikker: [] };
  KOMPASS_ETAPPER.forEach(e => {
    const f = kpVeiledningFor(e.id);
    KP_GRUPPER.forEach(g => funn[g.id].push(...f[g.id]));
  });
  const punkt = f => `
          <li>
            <p class="kp-boks__punkt"><strong>${f.sporsmal}</strong><span>${f.svar}</span></p>
            ${kpLesMer(`<p>${f.tekst}</p>`)}
          </li>`;
  const boks = g => funn[g.id].length ? `
      <div class="kp-boks kp-boks--${g.id}">
        <h3 class="kp-boks__tittel">${g.tittel}</h3>
        <ul class="kp-boks__liste">${funn[g.id].map(punkt).join('')}</ul>
      </div>` : '';

  return `
    <h2 class="hb-h2 kp-seksjon">2. Slik fungerer boligen din</h2>
    <p class="kp-hjelp__tekst">
      Hva fungerer for deg i dag, og hva kan bli en utfordring om du får
      redusert bevegelighet i fremtiden. Trykk på «Les mer» for å få tips til
      hva du bør tenke på.
    </p>
    ${KP_GRUPPER.some(g => funn[g.id].length) ? `
    <div class="kp-bokser">${boks(KP_GRUPPER[0])}${boks(KP_GRUPPER[1])}</div>
    ${boks(KP_GRUPPER[2])}`
    : '<p class="hb-text--secondary">Du har ikke svart på noe ennå. Gå tilbake og svar på spørsmålene, så kommer oppsummeringen her.</p>'}`;
}

/* ═══ Handlingsplanen, med tiltakene fra masterfila ═══════════════
   Kolonne D (enkle tiltak) og E (større tiltak) i masterfila. Den som svarer
   krysser av for tiltakene de vil gå videre med, og får en handlingsplan
   å skrive ut eller lagre som PDF og sende til en entreprenør for å få
   pris, slik arket beskriver det.

   - For rommene i 3a og vaskemaskinen på badet gjelder tiltakene det som
     IKKE er krysset av, som veiledningen.
   - Blokk og borettslag: arket har egen tekst for flere tiltak i steg 3
     («KOBLES MOT SVAR 1a og 2a»). Den brukes når du deler det tiltaket
     gjelder: adkomstveien for 7a, inngangspartiet for 8a og 9a.
   - Samme tiltak fra flere svar står én gang, med alt det gjelder.
   ─────────────────────────────────────────────────────────────────── */

const KP_TILTAKSTYPER = [
  { id: 'enkel', tittel: 'Enkle tiltak' },
  { id: 'stor',  tittel: 'Større tiltak' }
];

/* Deler du det tiltaket gjelder med andre, gjelder blokk-teksten */
function kpBrukBlokk(sp) {
  if (sp.id === 'adkomst-frem') return ['deler-adkomst', 'deler-inngang'].includes(S.inngang);
  if (sp.id === 'adkomst-inngang' || sp.id === 'adkomst-lagring') return S.inngang === 'deler-inngang';
  return false;
}

/* «5.a. og 5.c. og muligens 5.d.» med navnene fra tiltakskatalogen */
const kpKoderTekst = koder => String(koder || '').replace(/(\d)\.\s?([a-z])\.?(\?)?/g, (m, a, b, sporsmaal) => {
  const navn = KOMPASS_TILTAK[a + b];
  return `${a}${b}${navn ? ' ' + navn.charAt(0).toLowerCase() + navn.slice(1) : ''}${sporsmaal ? ' (usikkert)' : ''}`;
});

/* Kodene i tiltakskatalogen som en liste med navn, til boksen om hva
   du kan søke tilskudd til */
const kpKoderListe = koder => [...new Set((String(koder || '').match(/\d\.\s?[a-z]/g) || [])
  .map(k => k.replace(/[.\s]/g, '')))].filter(k => KOMPASS_TILTAK[k]).map(k => KOMPASS_TILTAK[k]);

const KP_SOK_HUSBANKEN = /\s*Det kan søkes om tilskudd til dette fra Husbanken\.\s*/;

const kpTiltakId = (type, tekst) => {
  let h = 0;
  for (const c of type + tekst) h = (h * 31 + c.charCodeAt(0)) | 0;
  return type + '-' + (h >>> 0).toString(36);
};

function kpTiltakForslag() {
  const liste = { enkel: [], stor: [] };
  const finnes = {};
  const legg = (sp, v, sporsmal, svar, t) => KP_TILTAKSTYPER.forEach(({ id: type }) => {
    if (!t[type]) return;
    const blokk = kpBrukBlokk(sp) && t[type + 'Blokk'];
    const tekst = blokk || t[type];
    const tittel = KOMPASS_TILTAK_TITLER[`${sp.id}/${v}/${type}`] || tekst;
    const id = kpTiltakId(type, tittel);
    const gjelder = `${sporsmal}: ${svar}`;
    if (finnes[id]) { if (!finnes[id].gjelder.includes(gjelder)) finnes[id].gjelder.push(gjelder); return; }
    finnes[id] = { id, type, tittel, tekst, etappe: sp.etappe, koder: t[type + 'Koder'] || '', blokk: !!blokk, gjelder: [gjelder] };
    liste[type].push(finnes[id]);
  });

  const ettFelt = (sp, sporsmal, valg, svar) => {
    if (svar === undefined || svar === null || svar === 'hoppet') return;
    if (Array.isArray(svar)) {
      if (!svar.length) return;
      valg.filter(v => !v.vis || v.vis(S)).forEach(v => {
        const valgt = svar.includes(v.v);
        if (valgt && v.tiltak) legg(sp, v.v, sporsmal, v.tittel, v.tiltak);
        if (!valgt && v.tiltakUten && !svar.includes('usikker')) legg(sp, v.v, sporsmal, `ikke krysset av for ${v.tittel.toLowerCase()}`, v.tiltakUten);
      });
      return;
    }
    const v = valg.find(x => x.v === svar);
    if (v && v.tiltak) legg(sp, v.v, sporsmal, v.tittel, v.tiltak);
  };

  KOMPASS_SPORSMAL.forEach(sp => {
    if (sp.type === 'flerfelt') return;
    ettFelt(sp, sp.stikkord || sp.tittel, sp.valg, S[sp.id]);
    const b = sp.betinget;
    if (b && b.naar(S)) ettFelt(sp, b.ledetekst, b.valg, S[b.navn]);
  });
  return liste;
}

function kpHandlingsplanHtml() {
  const forslag = kpTiltakForslag();
  const valgt = new Set(S.handlingsplan || []);
  const antall = forslag.enkel.length + forslag.stor.length;

  /* Fagteksten bak «Les mer», og hva du kan søke tilskudd til hos
     Husbanken i en egen boks, når arket sier at det kan søkes. Den grå
     teksten om hvilke svar tiltaket gjelder, er tatt bort etter
     tilbakemeldingen 28. oktober. */
  const mer = t => {
    const sok = KP_SOK_HUSBANKEN.test(t.tekst);
    const koder = kpKoderListe(t.koder);
    return kpLesMer(`
              <p>${t.tekst.replace(KP_SOK_HUSBANKEN, ' ').trim()}</p>
              ${sok ? `
              <div class="kp-sok">
                <p class="kp-sok__tittel">Dette kan du søke om tilskudd til fra Husbanken</p>
                ${koder.length ? `<ul>${koder.map(k => `<li>${k}</li>`).join('')}</ul>` : ''}
                <p class="hb-mb--none"><a href="${KOMPASS_ORDNINGER.aldersvennlig.lenke}">Tilskudd til aldersvennlig oppgradering av egen bolig</a></p>
              </div>` : ''}`);
  };

  const tiltak = t => `
          <li>
            <input class="hb-checkbox" id="tiltak-${t.id}" type="checkbox" name="handlingsplan" value="${t.id}" ${valgt.has(t.id) ? 'checked' : ''}>
            <div class="hb-label">
              <label class="hb-label-tekst" for="tiltak-${t.id}">${t.tittel}</label>
              ${mer(t)}
            </div>
          </li>`;

  return `
    <h2 class="hb-h2 kp-seksjon">3. Handlingsplan</h2>
    <p class="kp-hjelp__tekst">
      Her kommer det frem forslag til enkle og større grep du kan gjøre i
      boligen. Kryss av for tiltakene du ønsker å gjennomføre.
    </p>
    <p class="kp-hjelp__tekst">
      Trykk på «Les mer» for å få informasjon om mulige tiltak.
    </p>

    ${S.eieform === 'leier' ? `
    <div class="hb-callout hb-callout--info kp-planvarsel">
      <div class="hb-callout-body"><div class="hb-callout-content">
        <p>Du leier boligen. Endringer i boligen må avklares med utleier.</p>
      </div></div>
    </div>` : ''}

    ${antall ? `
    <form class="kp-handlingsplan" data-handlingsplan novalidate>
      ${KP_TILTAKSTYPER.filter(ty => forslag[ty.id].length).map(ty => `
      <fieldset class="hb-felt hb-felt-checkboxgruppe kp-tiltaksgruppe kp-tiltaksgruppe--${ty.id}">
        <legend class="hb-legend"><span class="hb-legend-tekst">${ty.tittel}</span></legend>
        <ul class="hb-feltliste">${forslag[ty.id].map(tiltak).join('')}</ul>
      </fieldset>`).join('')}
    </form>
    <div class="kp-knapper kp-utskrift-skjul">
      ${kpKnapp('Skriv ut tiltakene jeg har valgt', 'data-lag-plan="valgte"')}
      ${kpKnapp('Skriv ut alle tiltakene', 'data-lag-plan="alle"', 'standard')}
    </div>
    <p class="hb-text--sm hb-text--secondary kp-utskrift-skjul" data-plan-antall aria-live="polite"></p>`
    : '<p class="hb-text--secondary">Svarene dine gir ingen tiltak å gå videre med.</p>'}`;
}

/* Handlingsplanen til utskrift: alle tiltakene vi foreslår, eller bare
   dem som er krysset av. Tilbakemeldingen 21. oktober ba om begge. */
function kpPlanUtskriftHtml(alle) {
  const forslag = kpTiltakForslag();
  const valgt = new Set(S.handlingsplan || []);
  const dato = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  const del = ty => {
    const t = forslag[ty.id].filter(x => alle || valgt.has(x.id));
    return t.length ? `
    <h2>${ty.tittel}</h2>
    <ol>${t.map(x => `<li><p><strong>${x.tittel}</strong></p><p>${x.tekst}</p><p class="kp-planutskrift__om">Gjelder ${x.gjelder.join(', ')}.${x.koder ? ` Tiltak ${kpKoderTekst(x.koder)}.` : ''}</p></li>`).join('')}</ol>` : '';
  };
  return `
  <header>
    <p class="kp-planutskrift__over">Husbanken · Boligkompasset</p>
    <h1>Ditt boligkompass – handlingsplan</h1>
    <p>${alle ? 'Tiltakene Boligkompasset anbefaler ut fra svarene mine' : 'Tiltakene jeg har bestemt meg for å gjennomføre'}. Laget ${dato}.</p>
  </header>
  <div class="kp-planutskrift__felter">
    <p><span>Navn</span><span></span></p>
    <p><span>Adresse</span><span></span></p>
    <p><span>Telefon</span><span></span></p>
  </div>
  ${KP_TILTAKSTYPER.map(del).join('')}
  <p class="kp-planutskrift__om">Tilskudd til aldersvennlig oppgradering av egen bolig: ${KOMPASS_ORDNINGER.aldersvennlig.lenke}</p>
  <div class="kp-planutskrift__notat">Notater</div>`;
}

function kpInitHandlingsplan() {
  const skjema = document.querySelector('[data-handlingsplan]');
  if (!skjema) return;
  const antall = document.querySelector('[data-plan-antall]');
  const tell = () => {
    const n = (S.handlingsplan || []).length;
    if (antall) antall.textContent = n ? `${n} tiltak krysset av.` : '';
  };
  skjema.addEventListener('change', () => {
    S.handlingsplan = [...skjema.querySelectorAll('input[name="handlingsplan"]:checked')].map(i => i.value);
    kpLagre();
    tell();
  });
  tell();
}

/* Skriver ut bare handlingsplanen. Vanlig utskrift av siden er som før. */
function kpLagPlan(alle) {
  if (!alle && !(S.handlingsplan || []).length) {
    const antall = document.querySelector('[data-plan-antall]');
    if (antall) antall.textContent = 'Kryss av for minst ett tiltak først.';
    return;
  }
  let ark = document.querySelector('.kp-planutskrift');
  if (!ark) { ark = document.createElement('div'); ark.className = 'kp-planutskrift'; document.body.appendChild(ark); }
  ark.innerHTML = kpPlanUtskriftHtml(alle);
  document.body.classList.add('skriver-plan');
  const ferdig = () => { document.body.classList.remove('skriver-plan'); window.removeEventListener('afterprint', ferdig); };
  window.addEventListener('afterprint', ferdig);
  window.print();
}

/* Forbeholdet, i starten og på slutten. Møtet 27. oktober: det må
   være tydelig at kartleggingen er til refleksjon, og at Husbanken
   ikke tar avgjørelser ut fra den. Utkast, til Rita og Hodan. */
const KP_FORBEHOLD = 'Boligkompasset er en hjelp til å tenke gjennom boligen din. '
  + 'Det er ikke en vurdering fra Husbanken, og svarene brukes ikke til å avgjøre noe. '
  + 'Det er du som bestemmer hva du vil gjøre.';

/* Boligbytte nevnes forsiktig, som et avsnitt i oppsummeringen, og
   aldri som en advarsel midt i kartleggingen. Tilbakemeldingen 28.
   oktober: bare når kompasset peker mot «Omfattende grep», og du har
   svart «Svært vanskelig» om nærmiljøet i steg 4. */
function kpFlytteavsnittHtml(kurs) {
  const steg4 = KOMPASS_SPORSMAL.filter(sp => sp.etappe === 'naermiljo');
  const vanskelig = steg4.some(sp => sp.valg.some(v => v.flytting && v.v === S[sp.id]));
  if (kurs.tom || kurs.retning !== 'V' || !vanskelig) return '';
  return `
        <div class="kp-flytte">
          <h3 class="kp-flytte__tittel">Hva passer best for deg på sikt?</h3>
          <p>
            Den totale kartleggingen viser at du har en del utfordringer og at du
            må gjøre større grep i boligen. Disse grepene må til for at boligen din
            skal fungere godt for deg i fremtiden om du skulle få redusert
            bevegelighet.
          </p>
          <p class="hb-mb--none">
            Har du vurdert muligheten for om en mer tilrettelagt og sentrumsnær
            bolig kan være noe for deg? For noen kan en annen bolig være den beste
            løsningen, men det er ingenting du må bestemme nå.
          </p>
        </div>`;
}

/* Ett lite kompass per steg, med en stolpe for hvor mange svar som
   fungerer godt, til en viss grad og dårlig. Fra iterasjon 10 til 25,
   tatt tilbake etter tilbakemeldingen 28. oktober. Stolpen står like
   langt nede på alle kortene. */
const KP_FARGEKODER = [
  { id: 'god',  navn: 'Fungerer godt' },
  { id: 'midt', navn: 'Fungerer til en viss grad' },
  { id: 'tung', navn: 'Fungerer dårlig' }
];

function kpStegForStegHtml() {
  const kort = KOMPASS_ETAPPER.filter(e => kpEnheter().some(u => u.sp.etappe === e.id)).map(e => {
    const telling = { god: 0, midt: 0, tung: 0 };
    kpEnheter().filter(u => u.sp.etappe === e.id).forEach(({ sp, felt }) => {
      const p = kpPoengFor(sp, felt);
      if (!p) return;
      telling[p.n > 0.33 ? 'god' : p.n < -0.33 ? 'tung' : 'midt']++;
    });
    const sum = telling.god + telling.midt + telling.tung;
    const kurs = kpBeregnKurs(e.id);
    return `
    <li class="kp-etappekort__kort">
      <div class="kp-etappekort__rose">${kpKompassSvg(kurs, { liten: true })}</div>
      <p class="kp-etappekort__navn">${e.navn}</p>
      <p class="kp-etappekort__kurs">${sum ? kpKursnavn(kurs.retning) : 'Ikke besvart'}</p>
      <span class="kp-oversikt__spor" role="img"
            aria-label="${e.navn}: ${KP_FARGEKODER.map(k => `${telling[k.id]} ${k.navn.toLowerCase()}`).join(', ')}.">
        ${sum ? KP_FARGEKODER.map(k => `
        <span class="kp-oversikt__seg kp-oversikt__seg--${k.id}" style="width:${(telling[k.id] / sum * 100).toFixed(1)}%"></span>`).join('') : ''}
      </span>
    </li>`;
  });
  return `
        <h3 class="hb-h4">Steg for steg</h3>
        <ul class="kp-etappekort">${kort.join('')}</ul>
        <p class="kp-tegnforklaring">
          ${KP_FARGEKODER.map(k => `<span><i class="kp-oversikt__seg--${k.id}"></i>${k.navn}</span>`).join('')}
        </p>`;
}

/* Hvordan nåla er regnet ut, svar for svar */
function kpUtregningHtml(kurs) {
  const { rader, porter } = kpUtregning();
  if (!rader.length) return '<p>Du har ikke svart på noe som flytter nåla ennå.</p>';
  const grader = g => g === 0 ? 'Ingen endring'
    : `${String(Math.abs(g)).replace('.', ',')} grader ${g < 0 ? 'tilbake' : 'med klokken'}`;
  return `
    <p>
      Nåla starter rett opp, på «${kpKursnavn('N')}». Hvert svar vrir den litt.
      Et svar som fungerer godt, drar den 22,5 grader tilbake. Et svar som kan
      bli en utfordring, drar den 22,5 til 90 grader med klokken, etter hvor
      stor utfordringen er. Vi legger sammen alle svarene.
    </p>
    <p>
      Med klokken kommer først «${kpKursnavn('Ø')}», så «${kpKursnavn('S')}» og
      til slutt «${kpKursnavn('V')}». Nåla går aldri forbi toppen, og aldri
      lenger enn til «${kpKursnavn('V')}».
    </p>
    <table class="kp-utregning">
      <thead><tr><th scope="col">Spørsmål</th><th scope="col">Svaret ditt</th><th scope="col">Nåla</th></tr></thead>
      <tbody>
        ${rader.map(r => `<tr><td>${r.sporsmal}</td><td>${r.svar}</td><td>${grader(r.grader)}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><th scope="row" colspan="2">Sum</th><td>${grader(kurs.sum)}${porter.length ? '' : (kurs.sum > KP_MAKS_GRADER ? `, stopper på «${kpKursnavn('V')}»` : kurs.sum < 0 ? ', stopper på toppen' : '')}</td></tr></tfoot>
    </table>
    ${porter.length ? `<p>Ett svar veier tyngre enn resten, så nåla går helt til «${kpKursnavn('V')}»: ${porter.join(' ')}</p>` : ''}`;
}

function kpOppsummeringHtml() {
  const kurs = kpBeregnKurs();
  const info = KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT;
  const ubesvart = kpAntallSporsmal() - KOMPASS_SPORSMAL.filter(kpBesvart).length;
  /* Ressursene står fast. Tilskuddet til aldersvennlig oppgradering er
     det masterfila lenker til fra tiltakene. Startlån, lån og bostøtte
     kom med etter tilbakemeldingen 28. oktober, og telefonnummeret
     ble tatt bort. */
  const ordninger = ['aldersvennlig', 'komtilskudd', 'startlaan', 'husbanklaan', 'bostotte', 'hjelpemiddel'];

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

    <h2 class="hb-h2 kp-resultat-start">1. Kompasset ditt</h2>
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
        ${kpStegForStegHtml()}
        ${kpFlytteavsnittHtml(kurs)}
        ${kpTrekkspill([{ id: 'utregning', tittel: 'Slik har vi regnet ut hvor nåla peker', innhold: kpUtregningHtml(kurs) }])}
      </div>
    </div>

    ${kpResultatHtml()}

    ${kpHandlingsplanHtml()}

    <h2 class="hb-h2 kp-seksjon">4. Ressurser</h2>
    ${kpKommuneHtml()}
    <ul class="kp-ressurser">
      ${ordninger.map(o => {
        const ord = KOMPASS_ORDNINGER[o];
        return `<li><a class="kp-ressurs" href="${ord.lenke}">
          <span>${ord.navn}</span><span data-ikon="pil"></span>
        </a></li>`;
      }).join('')}
    </ul>

    <div class="kp-utskrift-notat">
      <strong>Plass til dine egne notater</strong>
    </div>

    <div class="kp-knapper kp-seksjon kp-utskrift-skjul">
      ${kpKnapp('Skriv ut eller lagre som PDF', 'data-skriv-ut')}
      ${kpKnapp('Endre svarene mine', 'data-tilbake-svar', 'standard')}
      ${kpKnapp('Start på nytt', 'data-nullstill', 'standard')}
    </div>

    <div class="kp-svardetaljer kp-utskrift-skjul">
      ${kpTrekkspill([{ id: 'alle-svar', tittel: 'Se alle svarene dine',
        innhold: `<div class="hb-summary hb-summary--flat">${kpSvarlisteHtml()}</div>` }])}
    </div>

  </div>
</section>`;
}

/* ═══ Finn din kommune ═══════════════════════════════════════════
   Som på bostøttesidene: skriv kommunen din, og gå rett til nettsida
   deres. Tilbakemeldingen 21. oktober. Kommunene har adressen
   <navn>.kommune.no, med æ, ø og å skrevet ae, o og a.
   ─────────────────────────────────────────────────────────────────── */

function kpKommuneHtml() {
  return `
    <form class="hb-felt kp-kommune kp-utskrift-skjul" data-kommune novalidate>
      <label class="hb-label" for="kp-kommune">Finn din kommune</label>
      <div class="kp-kommune__rad">
        <input class="hb-inputfelt" id="kp-kommune" name="kommune" type="text"
               autocomplete="address-level2" placeholder="For eksempel Drammen">
        ${kpKnapp('Gå til kommunen', 'type="submit"', 'standard', 'pil').replace('type="button" ', '')}
      </div>
      <p class="hb-text--sm hb-feilmelding kp-kommune__feil" data-kommune-feil aria-live="polite"></p>
    </form>`;
}

const kpKommuneAdresse = navn => {
  const ord = navn.trim().toLowerCase()
    .replace(/\s+kommune$/, '')
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return ord ? `https://www.${ord}.kommune.no` : '';
};

function kpInitKommune() {
  const skjema = document.querySelector('[data-kommune]');
  if (!skjema) return;
  skjema.addEventListener('submit', ev => {
    ev.preventDefault();
    const adresse = kpKommuneAdresse(skjema.kommune.value);
    skjema.querySelector('[data-kommune-feil]').textContent = adresse ? '' : 'Skriv navnet på kommunen din.';
    if (adresse) window.open(adresse, '_blank', 'noopener');
  });
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
      /* Hopper over svar som utelukkes av et som alt er trukket */
      const trukket = [];
      [...vanlige].sort(() => Math.random() - 0.5).forEach(v => {
        if (trukket.length >= antall || trukket.some(t => (t.utelukker || []).includes(v.v))) return;
        trukket.push(v);
      });
      S[navn] = trukket.map(v => v.v);
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
          : kpSporsmalHtml(f)}
      </div>
    </section>`;
  }

  kpIkoner(rot);
  kpTegnBunn();
  hbInitTrekkspill(rot);
  if (kpModus === 'oppsummering') { kpInitHandlingsplan(); kpInitKommune(); }
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
        /* Svar som ikke kan stå samtidig, som et bad som er både stort
           nok og lite */
        const valg = (sp.valg || []).find(v => v.v === inp.value);
        if (valg && valg.utelukker) {
          verdier = verdier.filter(v => !valg.utelukker.includes(v));
          rot.querySelectorAll(`input[name="${inp.name}"]`).forEach(i => { if (valg.utelukker.includes(i.value)) i.checked = false; });
        }
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
  else if (d.tilSteg) {
    ev.preventDefault();
    kpModus = 'kompass';
    kpGaaTil(KP_FLYT.findIndex(f => f.t === 'etappe' && f.e.id === d.tilSteg));
  }
  else if (d.skrivUt !== undefined) window.print();
  else if (d.lagPlan !== undefined) kpLagPlan(d.lagPlan === 'alle');

  else if (d.tilfeldig !== undefined) kpFyllTilfeldig();
  /* Fasadens trekkspill: tilstanden står på elementet */
  else if (d.trekk !== undefined) {
    const el = t.closest('.hb-accordion-element');
    const aapen = !el.classList.contains('hb-accordion-element--utvidet');
    el.classList.toggle('hb-accordion-element--utvidet', aapen);
    t.setAttribute('aria-expanded', String(aapen));
  }
  else if (d.hjelpetekst !== undefined) {
    const el = t.closest('.hb-hjelpetekst');
    const aapen = !el.classList.contains('hb-hjelpetekst--utvidet');
    el.classList.toggle('hb-hjelpetekst--utvidet', aapen);
    t.setAttribute('aria-expanded', String(aapen));
  }
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
