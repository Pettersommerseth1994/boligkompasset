/* ──────────────────────────────────────────────────────────────────
   Boligkompasset, logikken

   To veier gjennom de samme spørsmålene:
     · kompassmodus, ett spørsmål om gangen, med nåla som svinger
     · listemodus, alt på én side, uten animasjon

   Begge lagrer til samme sted, og ender i samme oppsummering.
   ────────────────────────────────────────────────────────────────── */

const KP_LAGER = 'hb-boligkompasset-iterasjon-1';

let S = {};              // svarene
let KP_FLYT = [];        // skjermene i kompassmodus
let kpPos = 0;           // hvor i flyten vi er
let kpModus = 'kompass'; // 'kompass' | 'liste'
let kpSisteUtslag = null;

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
  kpTegnLagring('lagrer');
  clearTimeout(kpLagre._t);
  kpLagre._t = setTimeout(() => kpTegnLagring(), 700);
}
function kpInnlogget() {
  try { return !!(JSON.parse(localStorage.getItem('hb-soknad-aldersvennlig')) || {}).innlogget; }
  catch { return false; }
}
function kpBrukernavn() {
  try { return (JSON.parse(localStorage.getItem('hb-soknad-aldersvennlig')) || {}).navn || 'deg'; }
  catch { return 'deg'; }
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
  if (sp.ikkeKompass) return null;
  const navn = felt ? felt.navn : sp.id;
  const svar = S[navn];
  if (svar === undefined || svar === null || svar === 'hoppet') return null;

  if (sp.poeng) {
    const p = sp.poeng(svar);
    return { n: p.n / (sp.maks.n || 1), e: p.e / (sp.maks.e || 1) };
  }
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
    if (sp.type === 'flerfelt') sp.felt.forEach(f => ut.push({ sp, felt: f }));
    else ut.push({ sp, felt: null });
  });
  return ut;
}

function kpBeregnKurs() {
  let sx = 0, sy = 0, antall = 0;
  kpEnheter().forEach(({ sp, felt }) => {
    const p = kpPoengFor(sp, felt);
    if (!p) return;
    sx += p.e; sy += p.n; antall++;
  });
  if (!antall) return { x: 0, y: 0, r: 0, retning: 'MIDT', antall: 0 };

  /* Nord–sør og øst–vest måler to ulike ting, og skalaene er ikke
     like tette. Gode svar gir ikke utslag øst–vest i det hele tatt,
     fordi det ikke er noe å bygge om. Derfor får øst–vest et større
     utslag per poeng, ellers ville nåla nesten alltid blitt stående
     langs nordøst–sørvest. */
  let x = (sx / antall) * 1.6;
  let y = (sy / antall) * 1.15;

  /* To porter, hentet fra innsiktsarbeidet.

     Den første: «Hvis inngangspartiet ditt er vanskelig å gjøre
     tilgjengelig, kan det hende at tilpasninger inne i boligen ikke
     hjelper så mye.» Kommer du ikke inn og ut, skal ikke et godt bad
     kunne dra kursen nordover.

     Den andre: nærmiljøet kan ikke bygges om. Er det tomt rundt deg,
     og du ikke kommer deg noe sted, hjelper ingen ombygging. */
  const stengtAdkomst = S['adkomst-hindringer'] === 'sveert' || S['adkomst-trinn'] === '6+';
  const tomtNaermiljo = (!S['naermiljo-tilbud'] || !S['naermiljo-tilbud'].length
                         || (S['naermiljo-tilbud'] || []).includes('ingen'))
                        && S['naermiljo-komme-seg'] === 'nei';
  if (stengtAdkomst) y = Math.min(y, -0.35);
  if (tomtNaermiljo) y = Math.min(y, -0.3);

  let r = Math.hypot(x, y);
  if (r > 1) { x /= r; y /= r; r = 1; }

  /* Nåla er kort i starten og vokser etter hvert som du svarer.
     Kompasset skal se ut som det famler litt før det har nok å gå på. */
  const konf = Math.min(1, 0.42 + 0.58 * (antall / kpEnheter().length));
  const kompassSp = KOMPASS_SPORSMAL.filter(sp => !sp.ikkeKompass);
  return {
    x: x * konf, y: y * konf, r: r * konf,
    retning: kpRetning(x, y, 0.24),
    antall,
    svart: kompassSp.filter(kpBesvart).length,
    totalt: kompassSp.length
  };
}

function kpRetning(x, y, grense = 0.18) {
  if (Math.hypot(x, y) < grense) return 'MIDT';
  let deg = Math.atan2(x, y) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'][Math.round(deg / 45) % 8];
}

const KP_RETNINGSORD = {
  N: 'mot nord', NØ: 'mot nordøst', Ø: 'mot øst', SØ: 'mot sørøst',
  S: 'mot sør', SV: 'mot sørvest', V: 'mot vest', NV: 'mot nordvest'
};
const KP_RETNINGSFORKLARING = {
  N: 'Dette svaret taler for at du kan bli boende.',
  NØ: 'Dette svaret taler for at du kan bli boende, med noen små grep.',
  Ø: 'Dette løses med et lite grep.',
  SØ: 'Her er det noe som må gjøres, men ikke noe stort.',
  S: 'Dette er et av de svarene som er tunge å bygge bort.',
  SV: 'Dette krever enten et stort arbeid, eller en annen bolig.',
  V: 'Her må det bygges om.',
  NV: 'Ett større arbeid, men ellers står boligen støtt.',
  MIDT: 'Dette svaret flyttet ikke kursen nevneverdig.'
};

/* ═══ Kompasset som figur ═════════════════════════════════════════ */

function kpKompassSvg(kurs, opt = {}) {
  const stort = !!opt.stort;
  const vinkel = (Math.atan2(kurs.x, kurs.y) * 180 / Math.PI) || 0;
  const skala = 0.52 + 0.48 * (kurs.r || 0);
  const vb = stort ? '0 0 300 200' : '0 0 200 200';
  const cx = stort ? 150 : 100, cy = 100, r = stort ? 60 : 78;

  const felt = (d, aktiv) =>
    `<path class="kp-kompass__felt${aktiv ? ' kp-kompass__felt--aktiv' : ''}" d="${d}" fill="${aktiv ? 'var(--hb-green-600)' : 'var(--hb-slate-400)'}"/>`;

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

  const etiketter = stort ? `
    <text class="kp-kompass__etikett kp-kompass__etikett--n" x="${cx}" y="18" text-anchor="middle">NORD</text>
    <text class="kp-kompass__under" x="${cx}" y="31" text-anchor="middle">Rett kurs</text>
    <text class="kp-kompass__etikett kp-kompass__etikett--s" x="${cx}" y="196" text-anchor="middle">SØR</text>
    <text class="kp-kompass__under" x="${cx}" y="180" text-anchor="middle">Ny kurs</text>
    <text class="kp-kompass__etikett" x="${cx + r + 14}" y="97" text-anchor="start">ØST</text>
    <text class="kp-kompass__under" x="${cx + r + 14}" y="111" text-anchor="start">Små grep</text>
    <text class="kp-kompass__etikett" x="${cx - r - 14}" y="97" text-anchor="end">VEST</text>
    <text class="kp-kompass__under" x="${cx - r - 14}" y="111" text-anchor="end">Ombygging</text>`
    : `
    <text class="kp-kompass__etikett kp-kompass__etikett--n" x="${cx}" y="16" text-anchor="middle">N</text>
    <text class="kp-kompass__etikett kp-kompass__etikett--s" x="${cx}" y="193" text-anchor="middle">S</text>
    <text class="kp-kompass__etikett" x="191" y="105" text-anchor="end">Ø</text>
    <text class="kp-kompass__etikett" x="9" y="105" text-anchor="start">V</text>`;

  const info = KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT;

  return `
<svg class="kp-kompass" viewBox="${vb}" role="img"
     aria-label="Kompass. Nåla peker ${kurs.r < 0.24 ? 'mot midten' : KP_RETNINGSORD[kurs.retning]}. Kursen er «${info.navn}».">
  ${felt(bue(0, 90), kv === 'nø')}${felt(bue(90, 180), kv === 'sø')}
  ${felt(bue(180, 270), kv === 'sv')}${felt(bue(270, 360), kv === 'nv')}
  <circle class="kp-kompass__rose" cx="${cx}" cy="${cy}" r="${r}"/>
  <circle class="kp-kompass__ring" cx="${cx}" cy="${cy}" r="${(r * 0.66).toFixed(1)}"/>
  <circle class="kp-kompass__ring" cx="${cx}" cy="${cy}" r="${(r * 0.33).toFixed(1)}"/>
  <line class="kp-kompass__akse" x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}"/>
  <line class="kp-kompass__akse" x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}"/>
  ${merker}
  <g class="kp-kompass__naal" style="transform:rotate(${vinkel.toFixed(1)}deg) scale(${skala.toFixed(2)});transform-origin:${cx}px ${cy}px">
    <path class="kp-kompass__naal-nord" d="M${cx} ${cy - r + 6} L${cx + 9} ${cy + 6} L${cx} ${cy} L${cx - 9} ${cy + 6} Z"/>
    <path class="kp-kompass__naal-sor"  d="M${cx} ${cy + r - 20} L${cx + 7} ${cy - 4} L${cx} ${cy} L${cx - 7} ${cy - 4} Z"/>
  </g>
  <circle class="kp-kompass__nav" cx="${cx}" cy="${cy}" r="6.5"/>
  <circle cx="${cx}" cy="${cy}" r="2.6" fill="#fff"/>
  ${etiketter}
</svg>`;
}

/* ═══ Små byggeklosser ════════════════════════════════════════════ */

const kpEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function kpHvorforBoks(sp) {
  return `
  <dl class="kp-hvorfor">
    <dt>Derfor spør vi</dt><dd>${sp.hvorfor}</dd>
    <dt>Dette brukes svaret til</dt><dd>${sp.brukesTil}</dd>
  </dl>`;
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
          <path d="M20 5 L25 24 L20 20 L15 24 Z" fill="var(--hb-red-700)"/>
        </g>
      </svg>
      <span>
        <span class="kp-kurs__navn">${kode === 'N' ? 'Nord' : kode === 'Ø' ? 'Øst' : kode === 'S' ? 'Sør' : 'Vest'}: ${k.navn}</span>
        <span class="kp-kurs__kort">${k.kort}</span>
      </span>
    </button>`;
  };

  return `
<section class="hb-section" style="background:var(--hb-green-100);padding-block:var(--space-6)">
  <div class="hb-shell hb-shell--wide">
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
          <div class="kp-kompass-stort" id="start-kompass">${kpKompassSvg(kurs, { stort: true })}</div>
        </div>
      </div>
    </div>

    <h2 class="hb-h3">Velg hvordan du vil svare</h2>
    <p style="max-width:56ch">
      Spørsmålene er de samme, svarene lagres på samme sted, og du får samme
      oppsummering. Du kan bytte underveis uten å miste noe.
    </p>
    <div class="kp-modus" style="margin-top:var(--space-4)">
      <div class="kp-modus__kort kp-modus__kort--anbefalt">
        <span class="kp-modus__merke">Anbefalt</span>
        <h3 class="hb-h4">Med kompasset</h3>
        <p>
          Ett spørsmål om gangen, i fem etapper. Under hvert spørsmål ser du
          kompassnåla flytte seg, og du får vite hva svaret ditt betydde.
          Litt som en valgomat.
        </p>
        <p><strong>5 etapper · 20 spørsmål · 5–10 minutter</strong></p>
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

    <div class="hb-guide" style="margin-top:var(--space-6)">
      <span data-avatar></span>
      <h3 class="hb-h4">Før du begynner</h3>
      <ul style="margin:0;padding-left:1.2em">
        <li>Gå gjerne rundt i boligen mens du svarer. Svarene blir bedre av at du ser etter.</li>
        <li>Ha et målebånd i nærheten. To–tre av spørsmålene blir lettere da.</li>
        <li>Du kan ta pause når som helst. Svarene lagres etter hvert som du gir dem.</li>
        <li>Er du usikker, velg «Usikker». Det er et like godt svar som de andre, og vi tar det med videre.</li>
      </ul>
      <fieldset style="border:0;padding:0;margin:var(--space-4) 0 0">
        <legend class="hb-field__label" style="padding:0">Hvem svarer du for?</legend>
        <span class="hb-field__help">Det endrer bare hvordan vi skriver oppsummeringen til slutt.</span>
        <label class="hb-choice">
          <input type="radio" name="svarerFor" value="meg" ${S.svarerFor !== 'annen' ? 'checked' : ''}>
          <span class="hb-choice__text"><span class="hb-choice__title">Meg selv</span>
          <span class="hb-choice__desc">Du bor i boligen du svarer om.</span></span>
        </label>
        <label class="hb-choice">
          <input type="radio" name="svarerFor" value="annen" ${S.svarerFor === 'annen' ? 'checked' : ''}>
          <span class="hb-choice__text"><span class="hb-choice__title">Noen jeg er pårørende til</span>
          <span class="hb-choice__desc">Du hjelper en forelder, ektefelle eller annen med å svare.</span></span>
        </label>
      </fieldset>
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
  const etappeNr = f.t === 'etappe' ? f.nr
    : f.t === 'slutt' ? KOMPASS_ETAPPER.length
    : KOMPASS_ETAPPER.findIndex(e => e.id === f.e.id) + 1;
  const pst = f.t === 'slutt' ? 100 : Math.round((nr / totalt) * 100);

  return `
<div class="kp-framdrift kp-utskrift-skjul">
  <div class="hb-shell">
    <div class="kp-framdrift__topp">
      <span class="kp-framdrift__etappe">
        Etappe ${etappeNr} av ${KOMPASS_ETAPPER.length}${f.t !== 'slutt' ? ' · ' + (f.e ? f.e.navn : KOMPASS_ETAPPER[f.nr - 1].navn) : ' · Oppsummering'}
      </span>
      <span class="kp-framdrift__teller">
        ${f.t === 'sp' ? `Spørsmål ${nr} av ${totalt}` : f.t === 'slutt' ? `${totalt} av ${totalt} spørsmål` : `${nr} av ${totalt} spørsmål besvart`}
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
  const kurs = kpBeregnKurs();
  return `
<div class="kp-sporsmal">
  <div class="kp-etappe-kort">
    <svg class="kp-etappe-kort__fig" viewBox="0 0 96 96" aria-hidden="true" style="color:var(--hb-green-700)">
      ${KP_ETAPPEFIG[f.e.ikon] || ''}
    </svg>
    <span class="kp-etappe-kort__nr">Etappe ${f.nr} av ${KOMPASS_ETAPPER.length}</span>
    <h1 class="hb-h2">${f.e.navn}</h1>
    <p>${f.e.ingress}</p>
    ${f.e.frivillig ? `
    <div class="hb-note" style="margin-top:var(--space-4);text-align:left">
      <span class="hb-note__icon" data-ikon="info"></span>
      <p style="margin:0">
        Denne etappen er frivillig. Hopper du over den, får du fortsatt kurs og
        tiltak. Du får bare ikke vite hvilke låne- og tilskuddsordninger som
        passer best for akkurat din situasjon.
      </p>
    </div>` : ''}
  </div>

  <div class="kp-nav">
    ${kpPos > 0 ? '<button type="button" class="hb-btn hb-btn--tertiary" data-forrige>Forrige</button>' : ''}
    <span class="kp-nav__hoyre">
      ${f.e.frivillig ? '<button type="button" class="hb-btn hb-btn--tertiary" data-hopp-etappe>Hopp over økonomi</button>' : ''}
      <button type="button" class="hb-btn hb-btn--primary" data-neste>
        ${f.nr === 1 ? 'Til første spørsmål' : 'Fortsett'} <span data-ikon="pil"></span>
      </button>
    </span>
  </div>

  ${kurs.antall ? kpPeilingHtml(kurs) : ''}
</div>`;
}

/* ═══ Peilingen, kompasset mens du svarer ═════════════════════════ */

function kpPeilingHtml(kurs) {
  const info = KOMPASS_RETNINGER[kurs.retning] || KOMPASS_RETNINGER.MIDT;
  const u = kpSisteUtslag;
  return `
<div class="kp-peiling" style="margin-top:var(--space-5)" id="peiling">
  <div>${kpKompassSvg(kurs)}</div>
  <div>
    <p class="hb-small hb-muted" style="margin:0 0 2px">Kursen din nå</p>
    <p class="kp-peiling__kurs">${info.navn}</p>
    <p class="kp-peiling__tekst">${info.tekst}</p>
    ${u ? `<span class="kp-peiling__utslag" data-vei="${u.vei}">
        <span data-ikon="${u.vei === 'ingen' ? 'info' : 'pil'}"></span>${u.tekst}
      </span>` : ''}
    <p class="hb-small hb-muted" style="margin:var(--space-2) 0 0">
      Basert på ${kurs.svart} av ${kurs.totalt} spørsmål som teller for kursen.
      Den kan snu helt til du er ferdig.
    </p>
  </div>
</div>`;
}

/* ═══ Spørsmålsskjermen ═══════════════════════════════════════════ */

function kpSporsmalHtml(f) {
  const sp = f.sp;
  const kurs = kpBeregnKurs();

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
  ${sp.ny ? `<p class="hb-small" style="margin:-8px 0 var(--space-3)"><span class="hb-tag hb-tag--new">Nytt spørsmål</span></p>` : ''}
  ${kpHvorforBoks(sp)}

  <form id="sporsmalsform" novalidate>
    ${felterHtml}
  </form>

  <div class="hb-error" id="kp-feil" hidden></div>

  ${sp.kanHoppes ? `<p style="margin-top:var(--space-3)">
      <button type="button" class="kp-hopp" data-hopp>Jeg vil ikke svare på dette. Hopp over spørsmålet.</button>
    </p>` : ''}

  <div class="kp-nav">
    <button type="button" class="hb-btn hb-btn--tertiary" data-forrige>Forrige</button>
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

function kpListeHtml() {
  let nr = 0;
  const etapper = KOMPASS_ETAPPER.map((e, i) => {
    const sp = KOMPASS_SPORSMAL.filter(s => s.etappe === e.id);
    return `
    <section class="kp-liste__etappe" id="etappe-${e.id}">
      <h2 class="hb-h2">${i + 1}. ${e.navn}</h2>
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
          ${s.kanHoppes ? `<p style="margin:var(--space-2) 0 0">
            <button type="button" class="kp-hopp" data-hopp-liste="${s.id}">Hopp over dette spørsmålet</button></p>` : ''}
        </div>`;
      }).join('')}
    </section>`;
  }).join('');

  return `
<section class="hb-section" style="padding-top:var(--space-4)">
  <div class="hb-shell">
    <h1 class="kp-h1 kp-h1--smal">Boligkompasset, alle spørsmålene</h1>
    <p class="kp-ingress">
      Alle 20 spørsmålene på én side. Svar på det du kan, hopp over det du er
      usikker på, og trykk «Se oppsummeringen» nederst. Svarene lagres etter
      hvert som du gir dem.
    </p>
    <p class="kp-utskrift-skjul">
      <button type="button" class="kp-bytt" data-bytt="kompass">
        <span data-ikon="pil"></span>Bytt til kompasset, ett spørsmål om gangen
      </button>
    </p>
    <form id="listeform">${etapper}</form>
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
    const dom = !sum ? 'Ikke besvart'
      : tung === 0 && god >= midt ? 'Fungerer godt'
      : tung >= god ? 'Her ligger hindringene'
      : 'Noe å se på';
    return { navn: e.navn, god, midt, tung, sum, dom };
  });
}

function kpOversiktHtml() {
  const rader = kpOversikt();
  return `
  <h3 class="hb-h3">Slik står det til, etappe for etappe</h3>
  <p style="max-width:58ch">
    Én stolpe per etappe. Grønt er svar som taler for at du kan bli boende.
    Oransje er svar som peker på en hindring. Grått er de svarene som verken
    trekker den ene eller den andre veien.
  </p>
  <ul class="kp-oversikt" style="margin-top:var(--space-4)">
    ${rader.map(r => `
    <li class="kp-oversikt__rad">
      <span class="kp-oversikt__navn">${r.navn}</span>
      <span class="kp-oversikt__spor" role="img"
            aria-label="${r.navn}: ${r.god} svar som fungerer godt, ${r.midt} midt på treet, ${r.tung} som peker på en hindring.">
        ${r.sum ? `
        <span class="kp-oversikt__seg kp-oversikt__seg--god"  style="width:${(r.god / r.sum * 100).toFixed(1)}%"></span>
        <span class="kp-oversikt__seg kp-oversikt__seg--midt" style="width:${(r.midt / r.sum * 100).toFixed(1)}%"></span>
        <span class="kp-oversikt__seg kp-oversikt__seg--tung" style="width:${(r.tung / r.sum * 100).toFixed(1)}%"></span>` : ''}
      </span>
      <span class="kp-oversikt__dom">${r.dom}</span>
    </li>`).join('')}
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
        <div class="kp-kompass-stort">${kpKompassSvg(kurs, { stort: true })}</div>
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

/* ═══ Lagringslinja nederst ═══════════════════════════════════════
   Designkritikken: «Lagres dette fortløpende/automatisk? Da burde
   det stå nederst.» Den står nederst på hver eneste skjerm, den
   oppdaterer seg ved hvert svar, og den sier rett ut hva forskjellen
   på innlogget og ikke innlogget er.
   ─────────────────────────────────────────────────────────────────── */

function kpTegnLagring(tilstand) {
  const el = document.getElementById('kp-lagring');
  if (!el) return;
  const inne = kpInnlogget();
  const antall = KOMPASS_SPORSMAL.filter(kpBesvart).length;
  el.dataset.tilstand = tilstand || (inne ? 'sky' : 'lokal');

  const status = tilstand === 'lagrer'
    ? '<strong>Lagrer …</strong>'
    : inne
      ? `<strong>Lagret automatisk kl. ${kpKlokke(S.endret)}.</strong>
         Du er logget inn som ${kpBrukernavn()}, og svarene ligger hos Husbanken.
         Du finner dem igjen på telefonen, nettbrettet eller en annen maskin.`
      : `<strong>Lagret i denne nettleseren${S.endret ? ' kl. ' + kpKlokke(S.endret) : ''}.</strong>
         Svarene ligger bare på denne maskinen, og forsvinner hvis du tømmer nettleseren.
         Logger du inn, lagrer vi dem hos Husbanken i stedet.`;

  el.innerHTML = `
  <div class="hb-shell">
    <div class="kp-lagring__rad">
      <p class="kp-lagring__status">
        <span class="kp-lagring__prikk" aria-hidden="true"></span>
        <span>${status}
          <span class="hb-muted">${antall} av ${kpAntallSporsmal()} spørsmål er besvart.</span>
        </span>
      </p>
      <span class="kp-lagring__knapper">
        ${inne ? '' : '<a class="hb-btn hb-btn--secondary" href="https://pettersommerseth1994.github.io/husbanken/logg-inn.html?retur=boligkompasset.html">Logg inn</a>'}
        <button type="button" class="hb-btn hb-btn--tertiary" data-pause>Lagre og fortsett senere</button>
      </span>
    </div>
  </div>`;
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
        <p class="kp-utskrift-skjul" style="margin:0 0 var(--space-4)">
          <button type="button" class="kp-bytt" data-bytt="liste">
            <span data-ikon="pil"></span>Bytt til enkel liste på én side
          </button>
        </p>
        ${f.t === 'etappe' ? kpEtappeHtml(f) : kpSporsmalHtml(f)}
      </div>
    </section>`;
  }

  kpIkoner(rot);
  kpTegnLagring();
  hbInitTrekkspill(rot);
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

/* Bare nåla og teksten ved siden av, uten å tegne hele skjermen på
   nytt. Da mister ikke radioknappen fokus når du svarer. */
function kpOppdaterPeiling() {
  const kurs = kpBeregnKurs();
  const boks = document.getElementById('peiling');
  if (!boks) return;
  boks.outerHTML = kpPeilingHtml(kurs);
  kpIkoner(document.getElementById('kompasset'));
}

/* ═══ Svar ════════════════════════════════════════════════════════ */

function kpSettSvar(navn, verdi, sp, felt) {
  const foer = kpBeregnKurs();
  S[navn] = verdi;
  const etter = kpBeregnKurs();

  /* Hva dette ene svaret gjorde med kursen */
  if (sp && !sp.ikkeKompass) {
    const p = kpPoengFor(sp, felt);
    if (p) {
      const r = kpRetning(p.e, p.n, 0.22);
      kpSisteUtslag = r === 'MIDT'
        ? { vei: 'ingen', tekst: KP_RETNINGSFORKLARING.MIDT }
        : { vei: (p.n < 0 ? 'sor' : 'nord'),
            tekst: 'Svaret trakk kompasset ' + KP_RETNINGSORD[r] + '. ' + KP_RETNINGSFORKLARING[r] };
    } else {
      kpSisteUtslag = null;
    }
  }
  kpLagre();
  kpOppdaterPeiling();
  void foer; void etter;
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
    const feil = document.getElementById('kp-feil');
    if (feil) feil.hidden = true;
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

function kpNeste() {
  const f = KP_FLYT[kpPos];
  if (f.t === 'sp' && !kpBesvart(f.sp) && S[f.sp.id] !== 'hoppet') {
    const feil = document.getElementById('kp-feil');
    if (feil) {
      feil.textContent = f.sp.type === 'flerfelt'
        ? 'Du må svare på begge spørsmålene før du går videre.'
        : f.sp.type === 'flervalg'
          ? 'Kryss av for minst ett alternativ. Har du ingenting av dette i nærheten, velger du «Ingen av delene».'
          : 'Velg ett av alternativene før du går videre.' + (f.sp.kanHoppes ? ' Du kan også hoppe over spørsmålet.' : '');
      feil.hidden = false;
      feil.setAttribute('tabindex', '-1');
      feil.focus({ preventScroll: false });
    }
    return;
  }
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
  kpSisteUtslag = null;
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
  else if (d.hopp !== undefined) { S[KP_FLYT[kpPos].sp.id] = 'hoppet'; kpLagre(); kpGaaTil(kpPos + 1); }
  else if (d.hoppListe) { S[d.hoppListe] = 'hoppet'; kpLagre(); kpTegnLagring(); t.textContent = 'Hoppet over. Trykk for å svare likevel.'; }
  else if (d.hoppEtappe !== undefined) {
    const e = KP_FLYT[kpPos].e;
    const siste = KP_FLYT.map((f, i) => f.t === 'sp' && f.e.id === e.id ? i : -1).filter(i => i >= 0).pop();
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
  else if (d.pause !== undefined) {
    kpLagre();
    alert(kpInnlogget()
      ? 'Svarene dine er lagret hos Husbanken. Du kan lukke siden nå, og fortsette der du slapp neste gang du logger inn.'
      : 'Svarene dine er lagret i denne nettleseren. Du kan lukke siden nå, og fortsette der du slapp neste gang du åpner Boligkompasset på denne maskinen.');
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
      kpKompassSvg({ x: Math.sin(piler[d.kurs] * Math.PI / 180), y: Math.cos(piler[d.kurs] * Math.PI / 180), r: 1, retning: d.kurs }, { stort: true });
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
