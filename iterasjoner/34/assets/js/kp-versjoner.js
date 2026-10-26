/* ──────────────────────────────────────────────────────────────────
   Boligkompasset, versjonsvelger

   Samme velger som papirsøknaden for aldersvennlig oppgradering: cellene
   lar en hoppe mellom iterasjonene, linja under sier hva iterasjonen er,
   og bryteren viser hva som ble endret.

   Hver iterasjon er siden slik den sto i en commit, lagt i
   iterasjoner/N/ av verktoy/lag-iterasjoner.py. Den siste er sidene i
   roten. Slik legger du til en ny iterasjon:
     1. Commit endringene som vanlig.
     2. Legg den nye oppføringen nederst i KP_VERSJONER, uten «commit».
        Gi forrige siste oppføring commit-en den ble laget i, og
        «mappe: 'iterasjoner/N/'».
     3. Kjør  python3 verktoy/lag-iterasjoner.py  og commit mappa.

   Sidene sier selv hvor de er, med
     <body data-versjon="8" data-rot="">        i roten
     <body data-versjon="3" data-rot="../../">  i iterasjoner/3/
   ────────────────────────────────────────────────────────────────── */

const KP_VERSJONER = [
  {
    nr: 1, commit: '6e4d15c', mappe: 'iterasjoner/1/',
    navn: 'Eget repo', dato: '8. oktober 2026',
    endringer: [
      'Boligkompasset skilt ut fra husbanken-repoet, med egen adresse.',
      'Spørsmålene fra «MASTERFIL - Boligkompasset justert»: tolv spørsmål i fire steg.'
    ]
  },
  {
    nr: 2, commit: '2fd4a6b', mappe: 'iterasjoner/2/',
    navn: 'Masterfil, justert 2', dato: '12. oktober 2026',
    endringer: [
      'Elleve spørsmål. «Er det noe i hverdagen som er blitt tyngre» er tatt ut.',
      'Nye hjelpetekster, stegingresser og svaralternativer, blant annet på badet og inngangen.',
      'Popover fra masterfila vises bak et spørsmålstegn.',
      '«Hvor lett er det å komme seg inn i boligen din?» er flervalg.',
      'Steg 1 flytter ikke nåla og har ingen kompass-side.',
      '«Mobilitet» er byttet til «bevegelighet».'
    ]
  },
  {
    nr: 3, commit: '0b1e8f8', mappe: 'iterasjoner/3/',
    navn: 'Tynn grønn framdriftslinje', dato: '12. oktober 2026',
    endringer: [
      'Fasadens blå progressbar under stegene er byttet med en tynn grønn linje.'
    ]
  },
  {
    nr: 4, commit: '4608824', mappe: 'iterasjoner/4/',
    navn: 'Roligere side etter hvert steg', dato: '19. oktober 2026',
    endringer: [
      'Kompasset og kursen står alene etter hvert steg, med forklaringene i to trekkspill under.',
      'Nåla har ingen hale, så den ikke kan leses som om den peker begge veier.'
    ]
  },
  {
    nr: 5, commit: '064518d', mappe: 'iterasjoner/5/',
    navn: 'Fasadens trekkspill', dato: '19. oktober 2026',
    endringer: [
      'Trekkspillene etter hvert steg og «Se alle svarene dine» er Fasadens hb-accordion.'
    ]
  },
  {
    nr: 6, commit: 'be89ba1', mappe: 'iterasjoner/6/',
    navn: 'Etter designgjennomgangen', dato: '21. oktober 2026',
    endringer: [
      '«Neste» står til venstre, ved siden av «Forrige».',
      'Spørsmålstelleren ved linja er fjernet.',
      'Popover står i en infoboks som alltid er åpen.',
      'Forklaringen på «badet er stort nok» og «badet er lite» står under svaret.',
      'Skyvekontrollen er byttet med fire radioknapper: «Velg kursen selv».',
      'Kompasset etter hvert steg har tekst på hver retning, og kursen står som et spørsmål.'
    ]
  },
  {
    nr: 7, commit: '64754f6', mappe: 'iterasjoner/7/',
    navn: 'Én framdrift og Fasadens typografi', dato: '21. oktober 2026',
    endringer: [
      'Den grønne framdriftslinja er fjernet. Bare de fire stegene står igjen.',
      'Overtittelen er «Spørsmål n», uten «av 11».',
      '«Eier eller leier du i dag?» og «Hvordan bor du i dag?» har hver sin side.',
      'Overskriftene bruker Fasadens Inter, og hjelpeteksten er brødtekst.'
    ]
  },
  {
    nr: 8, commit: '29fe53b', mappe: 'iterasjoner/8/',
    navn: 'Masterfil 3', dato: '26. oktober 2026',
    endringer: [
      'Spørsmålene følger «MASTERFIL - Boligkompasset_3»: tolv spørsmål, nummerert 1, 2, 3a … 12a.',
      'Ny hjelpetekst til «Hvordan bor du i dag?» og til 3a om boligfunksjoner.',
      '«Adkomstveg» heter «adkomstvei».',
      '5b: «På naborommet» heter «På rommet ved siden av badet».',
      '6a: «dusjsone» i stedet for «dusjnisje», og «badekaret har en høy kant».',
      '8a: «høye terskler eller trinn», «døren er tung å åpne», og ny forklaring på den brede døra.',
      '10a og 11a har fire svar: «Noe redusert tilgang» og «Vanskelig» er tatt ut.',
      'Lengre hjelpetekst til 11a om aktiviteter.',
      'Papirutgaven (PDF) er laget på nytt med de nye spørsmålene.',
      'Versjonsvelgeren nede til venstre er ny. Den holder deg på samme skjerm når du bytter iterasjon.'
    ]
  },
  {
    nr: 9, commit: '998ebe3', mappe: 'iterasjoner/9/',
    navn: 'Resultatsiden med veiledningstekster', dato: '26. oktober 2026',
    endringer: [
      'Oppsummeringen starter med «Slik fungerer boligen din»: veiledningsteksten fra kolonne C i masterfila for hvert svar, steg for steg.',
      'Tekstene er delt i «Dette fungerer i dag», «Dette kan bli en utfordring» og «Dette var du usikker på».',
      'For rommene i 3a og vaskemaskinen på badet står teksten under det som ikke er krysset av, slik masterfila sier.',
      'Den gamle handlingsplanen med stikkord er tatt ut.'
    ]
  },
  {
    nr: 10,
    navn: 'Handlingsplanen', dato: '26. oktober 2026',
    endringer: [
      '«2. Handlingsplan» med tiltakene fra kolonne D (enkle tiltak) og E (større tiltak) i masterfila, med avkrysning.',
      'Tiltakskodene står med navnene fra tiltakskatalogen. 6a og 6b mangler navn.',
      'Blokk og borettslag: egen tekst når du deler adkomstveien (7a) eller inngangspartiet (8a og 9a).',
      '«Vurder flytting til en mer egnet bolig» når nærmiljøet er sterkt begrenset eller svært vanskelig, og det er utfordringer i boligen.',
      '«Lag handlingsplan» skriver ut, eller lagrer som PDF, bare tiltakene du har krysset av.',
      'De gamle «Generelle anbefalinger» er tatt ut.'
    ]
  }
];

(function () {
  const kropp = document.body;
  const naa = Number(kropp.dataset.versjon);
  const rot = kropp.dataset.rot || '';
  if (!naa) return;

  const gjeldende = KP_VERSJONER.find(v => v.nr === naa);
  const siste = KP_VERSJONER[KP_VERSJONER.length - 1];
  if (!gjeldende) return;

  const lenke = v => rot + (v.mappe || '') + 'boligkompasset.html';

  /* Et vindu rundt den man står på, med første og siste alltid synlig,
     som i papirsøknaden */
  const VINDU = 2;
  const forste = KP_VERSJONER[0].nr;
  const skalVises = n => n === forste || n === siste.nr || Math.abs(n - naa) <= VINDU;

  const celle = v => {
    const tittel = `Iterasjon ${v.nr}, ${v.navn}, ${v.dato}`;
    return v.nr === naa
      ? `<span class="versjoner__celle" aria-current="page" title="${tittel}">${v.nr}</span>`
      : `<a class="versjoner__celle" href="${lenke(v)}" title="${tittel}">${v.nr}</a>`;
  };

  let hoppet = false;
  const celler = KP_VERSJONER.map(v => {
    if (skalVises(v.nr)) { hoppet = false; return celle(v); }
    if (hoppet) return '';
    hoppet = true;
    return '<span class="versjoner__hopp" aria-hidden="true">…</span>';
  }).join('');

  const eldre = naa !== siste.nr;
  const endringer = gjeldende.endringer || [];

  const boks = document.createElement('nav');
  boks.className = 'versjoner';
  boks.setAttribute('aria-label', 'Iterasjoner av Boligkompasset');
  boks.innerHTML = `
    <div class="versjoner__rad">
      <span class="versjoner__hint">Iterasjon</span>
      <div class="versjoner__celler">${celler}</div>
    </div>
    <p class="versjoner__endring">
      <b>${gjeldende.nr}. ${gjeldende.navn}, ${gjeldende.dato}</b>
      ${eldre ? `<em class="versjoner__eldre">Dette er en eldre iterasjon.</em>
                 <a href="${lenke(siste)}">Gå til den siste</a>.` : ''}
    </p>
    ${endringer.length ? `
    <label class="versjoner__bryter">
      <input type="checkbox" id="vis-endringer">
      <span class="versjoner__spor"></span>
      <span class="versjoner__bryter-tekst">Vis endringene <span class="versjoner__antall">(${endringer.length})</span></span>
    </label>
    <ol class="versjoner__liste" hidden>
      ${endringer.map((t, i) => `<li><span class="nr">${i + 1}</span><span class="tekst">${t}</span></li>`).join('')}
    </ol>` : ''}`;

  kropp.appendChild(boks);

  /* ── Bli på samme skjerm når man bytter iterasjon ──────────────────
     Uten dette åpnet hver iterasjon på forsiden. Når man trykker på en
     celle, huskes skjermen man står på og svarene, og iterasjonen man
     kommer til, går rett dit med de samme svarene.

     Skjermen beskrives med noe som er likt på tvers av iterasjonene:
     spørsmålets id og steget, ikke plassen i flyten, som endrer seg når
     spørsmål kommer til eller blir borte. Tilstanden ligger i
     sessionStorage, så den ikke blir hengende igjen i adressen. */
  const OVERFOR = 'kp-iterasjon-overfor';

  const skjermNaa = () => {
    if (typeof kpModus === 'undefined') return null;
    if (kpModus === 'oppsummering') return { t: 'oppsummering' };
    if (kpModus !== 'kompass' || !KP_FLYT[kpPos]) return null;
    const f = KP_FLYT[kpPos];
    if (f.t === 'slutt') return { t: 'oppsummering' };
    return { t: f.t, id: f.sp ? f.sp.id : null, etappe: f.e ? f.e.id : null };
  };

  boks.addEventListener('click', ev => {
    const a = ev.target.closest('a[href]');
    if (!a) return;
    try {
      sessionStorage.setItem(OVERFOR, JSON.stringify({
        skjerm: skjermNaa(),
        svar: typeof S === 'object' ? S : null
      }));
    } catch (e) { /* privat modus: da åpner iterasjonen på forsiden */ }
  });

  /* Spørsmål som har byttet id mellom iterasjonene. Steg 1 var ett
     spørsmål, «bolig», med to felt, før det ble to sider. */
  const SAMME_SPORSMAL = {
    bolig: ['eieform', 'inngang'],
    eieform: ['bolig'],
    inngang: ['bolig']
  };

  function gaaTilSkjerm(sk) {
    if (sk.t === 'oppsummering') { kpModus = 'oppsummering'; kpTegn(); return; }
    const finn = test => KP_FLYT.findIndex(test);
    let i = -1;
    if (sk.t === 'sp') {
      const ider = [sk.id, ...(SAMME_SPORSMAL[sk.id] || [])];
      i = finn(f => f.t === 'sp' && ider.includes(f.sp.id));
    } else {
      i = finn(f => f.t === sk.t && f.e && f.e.id === sk.etappe);
      /* Steget har ingen kompass-side i denne iterasjonen. Da står man
         på det siste spørsmålet i steget. */
      if (i < 0 && sk.t === 'etappeslutt') {
        for (let j = KP_FLYT.length - 1; j >= 0; j--) {
          if (KP_FLYT[j].t === 'sp' && KP_FLYT[j].e.id === sk.etappe) { i = j; break; }
        }
      }
    }
    /* Finnes ikke spørsmålet her, går vi til starten av samme steg */
    if (i < 0 && sk.etappe) i = finn(f => f.t === 'etappe' && f.e.id === sk.etappe);
    if (i < 0) return;
    kpModus = 'kompass';
    kpGaaTil(i);
  }

  (function () {
    let pakke = null;
    try {
      pakke = JSON.parse(sessionStorage.getItem(OVERFOR) || 'null');
      sessionStorage.removeItem(OVERFOR);
    } catch (e) { /* ingenting å hente */ }
    if (!pakke || typeof kpGaaTil !== 'function') return;
    if (pakke.svar) {
      /* Svar på alternativer som ikke finnes i denne iterasjonen, blir
         bare ikke talt. Kompasset regner bare med det det kjenner. */
      S = Object.assign({}, pakke.svar);
      if (typeof kpLagre === 'function') kpLagre();
    }
    if (pakke.skjerm) gaaTilSkjerm(pakke.skjerm);
    else if (typeof kpTegn === 'function') { kpModus = 'start'; kpTegn(); }
  })();

  if (!endringer.length) return;

  /* Bryteren huskes, så lista står åpen når man hopper mellom
     iterasjonene */
  const LAGER = 'kp-viser-endringer';
  const bryter = boks.querySelector('#vis-endringer');
  const liste = boks.querySelector('.versjoner__liste');
  const tegn = paa => { liste.hidden = !paa; };
  bryter.addEventListener('change', () => {
    tegn(bryter.checked);
    try { localStorage.setItem(LAGER, bryter.checked ? '1' : '0'); } catch (e) { /* privat modus */ }
  });
  let paa = false;
  try { paa = localStorage.getItem(LAGER) === '1'; } catch (e) { /* privat modus */ }
  bryter.checked = paa;
  tegn(paa);
})();
