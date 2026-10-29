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

   Iterasjon 1 til 16 er fra før Boligkompasset fikk eget repo. De har
   «repo: 'husbanken'» og hentes fra husbanken-repoet.

   Sidene sier selv hvor de er, med
     <body data-versjon="8" data-rot="">        i roten
     <body data-versjon="3" data-rot="../../">  i iterasjoner/3/
   ────────────────────────────────────────────────────────────────── */

const KP_VERSJONER = [
  {
    nr: 1, repo: 'husbanken', commit: 'b309012', mappe: 'iterasjoner/1/',
    navn: 'Et kompass som faktisk peker', dato: '22. september 2026',
    endringer: [
      'Boligkompasset bygget om rundt et kompass med to akser: om boligen bærer deg videre, og hvor stort arbeidet er.',
      'Spørsmålene fra workshopen. 26 spørsmål ble 20, og sju kategorier ble fem etapper.',
      'Kartleggingen ligger åpent, uten innlogging, og utskriften er et A4-dokument å ta med til kommunen.'
    ]
  },
  {
    nr: 2, repo: 'husbanken', commit: '70aa340', mappe: 'iterasjoner/2/',
    navn: 'Illustrasjon i toppfeltet', dato: '22. september 2026',
    endringer: [
      'Kompassrosa og boligen på samme bakkelinje, i samme stil som illustrasjonen på tilskuddssiden.',
      'Knappen over hvert spørsmål for å bytte mellom kompass og liste er fjernet.'
    ]
  },
  {
    nr: 3, repo: 'husbanken', commit: '1c33816', mappe: 'iterasjoner/3/',
    navn: 'Sidefaner, og nåla svinger', dato: '22. september 2026',
    endringer: [
      'Lista har en fane per etappe i margen.',
      'Nåla svinger på stedet i stedet for å hoppe.',
      '«Derfor spør vi» og «Dette brukes svaret til» står i hver sin boks.'
    ]
  },
  {
    nr: 4, repo: 'husbanken', commit: 'd153e0d', mappe: 'iterasjoner/4/',
    navn: 'Nye stegnavn', dato: '22. september 2026',
    endringer: [
      '«Deg og boligen» ble «Deg og boligen din», og de fire andre etappene fulgte etter.',
      'Etappe 3 heter «Veien inn til boligen din».'
    ]
  },
  {
    nr: 5, repo: 'husbanken', commit: '47552b4', mappe: 'iterasjoner/5/',
    navn: 'Større kompass med nøkkel', dato: '22. september 2026',
    endringer: [
      'Én kompassrose overalt, 45 prosent større, med navnet på kursen i rosa.',
      'En nøkkel under kompasset forklarer de fire retningene.'
    ]
  },
  {
    nr: 6, repo: 'husbanken', commit: '51aebb4', mappe: 'iterasjoner/6/',
    navn: 'Kursene får navn', dato: '22. september 2026',
    endringer: [
      'Rett kurs, Små grep, Ombygging og Ny kurs i stedet for himmelretninger.',
      'Spørsmålet om hverdagen er flervalg.',
      'Å leie flytter ikke nåla. Det som teller, er hvor fornøyd du er.'
    ]
  },
  {
    nr: 7, repo: 'husbanken', commit: 'f032da8', mappe: 'iterasjoner/7/',
    navn: 'Ett spørsmål om gangen', dato: '22. september 2026',
    endringer: [
      'Nåla viser svaret på spørsmålet du står på.',
      'Summen for etappen kommer på en egen skjerm etter hver etappe.',
      '«Vri kompasset selv» i oppsummeringen.',
      'Snarvei som fyller ut tilfeldige svar.'
    ]
  },
  {
    nr: 8, repo: 'husbanken', commit: 'bd305f4', mappe: 'iterasjoner/8/',
    navn: 'Summen per steg', dato: '22. september 2026',
    endringer: [
      'Nåla summerer svarene i ett steg, grønn oppover og rød nedover.',
      '«Ombygging» heter «Større grep», og «Etappe» heter «Steg».',
      'Du kommer videre uten å svare.'
    ]
  },
  {
    nr: 9, repo: 'husbanken', commit: '213d6f1', mappe: 'iterasjoner/9/',
    navn: 'Nåla teller grader', dato: '22. september 2026',
    endringer: [
      'Hvert svar vrir nåla et bestemt antall grader.',
      'Steget som står dårligst, setter den samlede kursen.'
    ]
  },
  {
    nr: 10, repo: 'husbanken', commit: '4a9a9bd', mappe: 'iterasjoner/10/',
    navn: 'Innenfra og ut', dato: '23. september 2026',
    endringer: [
      'Stegene går fra deg og boligen og utover til nærmiljøet.',
      'Økonomisteget er byttet med ett spørsmål om hvor mye du vil investere. 26 spørsmål ble 17.',
      'Oppsummeringen etter skissen: handlingsplan i to spalter, generelle anbefalinger og ressurser.'
    ]
  },
  {
    nr: 11, repo: 'husbanken', commit: '1ad2ad1', mappe: 'iterasjoner/11/',
    navn: 'Handlingsplanen øverst', dato: '23. september 2026',
    endringer: [
      'Oppsummeringen: handlingsplan, anbefalinger og ressurser, med kompassene til slutt.',
      '«Hva funker ikke» viser de tre første, resten bak «se de andre».'
    ]
  },
  {
    nr: 12, repo: 'husbanken', commit: 'fb5a1ac', mappe: 'iterasjoner/12/',
    navn: 'Svarlista som i søknaden', dato: '23. september 2026',
    endringer: [
      'Alle svarene står som oppsummeringen i søknaden, med «Endre» for hvert steg.'
    ]
  },
  {
    nr: 13, repo: 'husbanken', commit: 'ce7e255', mappe: 'iterasjoner/13/',
    navn: 'Uten versaler, og modusvelgeren øverst', dato: '23. september 2026',
    endringer: [
      'Ingen tekst står i versaler, og pilene står midt i teksten.',
      'Valget mellom kompasset og lista står rett under toppfeltet.'
    ]
  },
  {
    nr: 14, repo: 'husbanken', commit: 'b272d14', mappe: 'iterasjoner/14/',
    navn: 'Løst fra tilskuddet, og overtittel', dato: '23.–25. september 2026',
    endringer: [
      'Kartleggingen er ikke lenger bundet til tilskuddet for aldersvennlig oppgradering. Tilskuddet står sidestilt med de andre ordningene.',
      'Ingressen står i vanlig vekt, ikke Inter Light.',
      '«Slik ser det ut» står som overtittel over navnet på steget.'
    ]
  },
  {
    nr: 15, repo: 'husbanken', commit: 'bdfe9e3', mappe: 'iterasjoner/15/',
    navn: 'Designsystemet.no', dato: '28. september 2026',
    endringer: [
      'Komponentene fra Designsystemet.no, i Husbankens farger.',
      'Luft mellom svarrutene.'
    ]
  },
  {
    nr: 16, repo: 'husbanken', commit: 'a0e7fdc', mappe: 'iterasjoner/16/',
    navn: 'Stegene øverst', dato: '30. september 2026',
    endringer: [
      'Stegnavnene står øverst, og framdriftslinja nederst med en teller.'
    ]
  },
  {
    nr: 17, commit: '6e4d15c', mappe: 'iterasjoner/17/',
    navn: 'Fasaden, masterfila og eget repo', dato: '5.–8. oktober 2026',
    endringer: [
      'Fasaden, Husbankens designsystem, i stedet for Designsystemet.no.',
      'De tolv spørsmålene fra masterfila, i fire steg.',
      'Kompasset vises bare etter hvert steg og i oppsummeringen.',
      'Listevisningen er tatt bort, og det er laget en papirutgave.',
      'Animasjonen i stegindikatoren spiller bare når du kommer til et nytt steg.',
      'Boligkompasset skilt ut fra husbanken-repoet, med egen adresse.',
      'Underalternativ med innrykk i 6a.',
      'Spørsmålene fra «MASTERFIL - Boligkompasset justert»: tolv spørsmål i fire steg.'
    ]
  },
  {
    nr: 18, commit: '0b1e8f8', mappe: 'iterasjoner/18/',
    navn: 'Masterfil, justert 2', dato: '12. oktober 2026',
    endringer: [
      'Elleve spørsmål. «Er det noe i hverdagen som er blitt tyngre» er tatt ut.',
      'Nye hjelpetekster, stegingresser og svaralternativer, blant annet på badet og inngangen.',
      'Popover fra masterfila vises bak et spørsmålstegn.',
      '«Hvor lett er det å komme seg inn i boligen din?» er flervalg.',
      'Steg 1 flytter ikke nåla og har ingen kompass-side.',
      '«Mobilitet» er byttet til «bevegelighet».',
      'Fasadens blå progressbar under stegene er byttet med en tynn grønn linje.'
    ]
  },
  {
    nr: 19, commit: '064518d', mappe: 'iterasjoner/19/',
    navn: 'Roligere side etter hvert steg', dato: '19. oktober 2026',
    endringer: [
      'Kompasset og kursen står alene etter hvert steg, med forklaringene i to trekkspill under.',
      'Nåla har ingen hale, så den ikke kan leses som om den peker begge veier.',
      'Trekkspillene etter hvert steg og «Se alle svarene dine» er Fasadens hb-accordion.'
    ]
  },
  {
    nr: 20, commit: 'be89ba1', mappe: 'iterasjoner/20/',
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
    nr: 21, commit: '64754f6', mappe: 'iterasjoner/21/',
    navn: 'Én framdrift og Fasadens typografi', dato: '21. oktober 2026',
    endringer: [
      'Den grønne framdriftslinja er fjernet. Bare de fire stegene står igjen.',
      'Overtittelen er «Spørsmål n», uten «av 11».',
      '«Eier eller leier du i dag?» og «Hvordan bor du i dag?» har hver sin side.',
      'Overskriftene bruker Fasadens Inter, og hjelpeteksten er brødtekst.'
    ]
  },
  {
    nr: 22, commit: '29fe53b', mappe: 'iterasjoner/22/',
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
    nr: 23, commit: '998ebe3', mappe: 'iterasjoner/23/',
    navn: 'Resultatsiden med veiledningstekster', dato: '26. oktober 2026',
    endringer: [
      'Oppsummeringen starter med «Slik fungerer boligen din»: veiledningsteksten fra kolonne C i masterfila for hvert svar, steg for steg.',
      'Tekstene er delt i «Dette fungerer i dag», «Dette kan bli en utfordring» og «Dette var du usikker på».',
      'For rommene i 3a og vaskemaskinen på badet står teksten under det som ikke er krysset av, slik masterfila sier.',
      'Den gamle handlingsplanen med stikkord er tatt ut.'
    ]
  },
  {
    nr: 24, commit: 'd33d390', mappe: 'iterasjoner/24/',
    navn: 'Handlingsplanen', dato: '26. oktober 2026',
    endringer: [
      '«2. Handlingsplan» med tiltakene fra kolonne D (enkle tiltak) og E (større tiltak) i masterfila, med avkrysning.',
      'Tiltakskodene står med navnene fra tiltakskatalogen. 6a og 6b mangler navn.',
      'Blokk og borettslag: egen tekst når du deler adkomstveien (7a) eller inngangspartiet (8a og 9a).',
      '«Vurder flytting til en mer egnet bolig» når nærmiljøet er sterkt begrenset eller svært vanskelig, og det er utfordringer i boligen.',
      '«Lag handlingsplan» skriver ut, eller lagrer som PDF, bare tiltakene du har krysset av.',
      'De gamle «Generelle anbefalinger» er tatt ut.'
    ]
  },
  {
    nr: 25, commit: '560eb5e', mappe: 'iterasjoner/25/',
    navn: 'Tilbakemeldingen 21. oktober', dato: '26. oktober 2026',
    endringer: [
      'Forsiden: ny introtekst med «Start kartleggingen» rett under, ny tekst i «Hvorfor gjøre det nå?», og papirutgaven helt nederst med ny tekst. «Hvem er det for?», «Hva får du?» og kortet «På skjerm» er tatt ut.',
      'Stegene i stepperen er grønne når du er der eller er ferdig, grå når de kommer.',
      'Stegsidene er venstrestilt, uten «Steg 1 av 4», og ingressen blir ikke bredere enn overskriften.',
      '«Spørsmål 1 av 12» er tilbake.',
      'De blå boksene er borte. Teksten står som et eget avsnitt i hjelpeteksten.',
      'Forklaringen på svaralternativene ligger bak spørsmålstegnet igjen, ikke under svaret.',
      'Kompasset etter hvert steg: all tekst venstrestilt og i bokser.',
      'Oppsummeringen: «Kursen din» øverst, så «Resultat av kartleggingen», «Handlingsplan» med «Vi anbefaler at du gjør dette nå» og «Ressurser».',
      'Handlingsplanen kan skrives ut med alle tiltakene, eller bare dem du har krysset av.',
      '«Finn din kommune» under Ressurser.',
      '«Velg kursen selv» er tatt ut.'
    ]
  },
  {
    nr: 26, commit: '1fd3f85', mappe: 'iterasjoner/26/',
    navn: 'Møtet 27. oktober', dato: '27. oktober 2026',
    endringer: [
      'Kompasset kommer bare til slutt, øverst i oppsummeringen. Kompassene etter hvert steg er tatt ut.',
      'Nåla regnes av alle svarene samlet, og «Slik har vi regnet ut hvor nåla peker» viser svar for svar.',
      'Retningene heter «Fungerer godt», «Enkle grep», «Større grep» og «Omfattende grep», i stedet for «Rett kurs» og «Ny kurs». Fem forslag til navn ligger på forslag-26.html.',
      'Ingen advarsel om flytting. Peker svarene mot omfattende grep, står et forsiktig avsnitt i oppsummeringen. Utkast.',
      'Forbehold om at kartleggingen er til refleksjon, på forsiden og i oppsummeringen. Utkast.',
      'Oppsummeringen: kompasset, så «Dette fungerer i dag» og «Dette fungerer ikke i dag» i to bokser, så handlingsplanen. Veiledningen står bak «Les mer».',
      'Tiltakene har korte overskrifter. Fagteksten, og hva du kan søke tilskudd til fra Husbanken, står bak «Les mer».',
      'Steget du står i er lysere grønt enn stegene du er ferdig med.',
      '«Spørsmål 3 av 12» er en tag, med mer luft ned til spørsmålet.',
      'Spørsmålstegnet står midt på tekstlinja.',
      'Stegsidene er midtstilt igjen, med kortere ingress i steg 3 og 4.',
      'Spørsmål 10 og 11 er kortere, og forklaringen om redusert bevegelighet står først i hjelpeteksten. «Service og tjenester» heter «tilbudene».',
      'Ergoterapeut er tatt ut av ressursene.'
    ]
  },
  {
    nr: 27,
    navn: 'Tilbakemeldingen 28. oktober', dato: '29. oktober 2026',
    endringer: [
      'Du kan trykke på et steg du er ferdig med i stepperen, og gå tilbake dit.',
      '«SPØRSMÅL 3 AV 12» står i store bokstaver uten boks, med mer luft ned til spørsmålet.',
      'Spørsmål 10: «Kommer du deg lett frem til tilbudene du trenger om du får redusert bevegelighet?», med svarene Lett, Litt vanskelig, Svært vanskelig og Usikker. Hjelpeteksten fra iterasjon 25.',
      'Spørsmål 11: «Hvor lett vil du kunne delta på aktivitetene du ønsker om du får redusert bevegelighet?», med hjelpeteksten fra iterasjon 25. «Noe vanskelig» heter «Litt vanskelig».',
      'Retningene følger klokken: Fungerer godt, Enkle grep, Større grep og Omfattende grep. Nåla går én vei rundt.',
      '«Hva passer best for deg på sikt?» har ny tekst, og vises bare når kompasset peker mot «Omfattende grep» og du har svart «Svært vanskelig» om nærmiljøet.',
      'Forbeholdet er tatt ut av oppsummeringen. Det står fortsatt på forsiden.',
      'De små kompassene per steg er tilbake under «Kompasset ditt». Stolpen står like langt nede på alle kortene, og fargene heter Fungerer godt, Fungerer til en viss grad og Fungerer dårlig, i grønt, grått og rødt.',
      'Ny tekst under «Slik fungerer boligen din» og i handlingsplanen. «Vi anbefaler at du gjør dette nå» er tatt bort.',
      'Mindre avstand mellom tiltaket og «Les mer», og den grå teksten om hva tiltaket gjelder er tatt bort.',
      'Ressursene: uten den grå teksten om kommunen og uten telefonnummeret. Nye lenker til startlån, lån til å oppgradere bolig og bostøtte. «Kommunale boligtilskudd» og «Hjelpemidler og tilskudd fra Nav» har nye navn.'
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
    try {
      if (pakke.svar) {
        /* Svar på alternativer som ikke finnes i denne iterasjonen, blir
           bare ikke talt. Kompasset regner bare med det det kjenner. */
        S = Object.assign({}, pakke.svar);
        if (typeof kpLagre === 'function') kpLagre();
      }
      if (pakke.skjerm) gaaTilSkjerm(pakke.skjerm);
      else if (typeof kpTegn === 'function') { kpModus = 'start'; kpTegn(); }
    } catch (e) {
      /* De eldste iterasjonene fra husbanken-repoet har andre spørsmål
         og en annen flyt. Tåler de ikke svarene, begynner de på nytt. */
      try { S = {}; kpModus = 'start'; kpTegn(); } catch (e2) { /* som den er */ }
    }
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
