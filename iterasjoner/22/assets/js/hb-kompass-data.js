/* ──────────────────────────────────────────────────────────────────
   Boligkompasset, innholdet

   Steg, spørsmål, hjelpetekster og svaralternativer er hentet fra
   «MASTERFIL - Boligkompasset_3.xlsx»: fire faner, ett steg
   per fane, og tolv spørsmål. Overskriften i A1 er stegets navn, og B1 er
   ingressen. Under står hvert spørsmål med hjelpeteksten og svarene.

   Poengene som flytter kompassnåla, og anbefalingene, er ikke en del
   av masterfila. De er satt her, og bygger på de samme reglene som
   før: kommer du ikke inn og ut, veier det tyngst.
   ────────────────────────────────────────────────────────────────── */

/* ═══ Kompasset ════════════════════════════════════════════════════
   To akser. Den loddrette sier om boligen passer for deg videre. Den
   vannrette sier hvor stort arbeidet er. Hvert svar flytter nåla litt.
   Himmelretningene er ikke navngitt utad, bare kursene, men kodene N,
   Ø, S og V brukes fortsatt internt som korte navn på de åtte feltene.
   ─────────────────────────────────────────────────────────────────── */

const KOMPASS_RETNINGER = {
  N:  { navn: 'Rett kurs',
        kort: 'Boligen er passende for deg',
        tekst: 'Boligen din fungerer godt slik den er. Det viktigste du kan gjøre nå, er å holde den ved like og gjøre de små grepene før du trenger dem.' },
  NØ: { navn: 'Rett kurs med små grep',
        kort: 'Nesten i mål',
        tekst: 'Boligen bærer deg langt. Noen få tiltak, som lys, håndlister eller en terskel som fjernes, gjør at den holder mange år til.' },
  Ø:  { navn: 'Små grep',
        kort: 'Mye løses enkelt',
        tekst: 'Det meste av det som er tungvint hos deg, kan løses uten å bygge om. Start med det enkleste, så ser du hvor langt det rekker.' },
  SØ: { navn: 'Små grep nå, større valg senere',
        kort: 'Begynn enkelt, planlegg videre',
        tekst: 'Du kan gjøre mye enkelt med én gang. Men noe av det som er vanskelig hos deg, løses ikke uten et større arbeid. Begynn med det enkle, og bruk tiden til å planlegge resten.' },
  S:  { navn: 'Ny kurs',
        kort: 'Det kan være verdt å se etter noe nytt',
        tekst: 'Flere av hindringene hos deg er tunge å bygge bort. Da kan en annen bolig gi deg mer for pengene enn en stor ombygging. Det betyr ikke at du må flytte nå, men at det er verdt å se på.' },
  SV: { navn: 'Stort valg foran deg',
        kort: 'Bygge om, eller bytte bolig',
        tekst: 'Boligen kan tilpasses, men det krever et omfattende arbeid. Da står valget mellom en stor ombygging og en annen bolig. Begge deler tåler å bli regnet på før du bestemmer deg.' },
  V:  { navn: 'Større grep',
        kort: 'Boligen kan bli passende for deg',
        tekst: 'Boligen din kan bli god å bli gammel i, men det krever bygging. Bad, planløsning eller inngang må gjøres om. Det er verdt å starte planleggingen tidlig.' },
  NV: { navn: 'Bli boende, men bygg om',
        kort: 'Ett stort grep holder lenge',
        tekst: 'Du bor godt, og du kan bli boende. Men ett større arbeid, oftest badet eller inngangen, bør gjøres før behovet melder seg.' },
  MIDT: { navn: 'Delt kurs',
        kort: 'Noe fungerer, noe ikke',
        tekst: 'Svarene dine peker i flere retninger. Noe ved boligen fungerer godt, annet gjør det ikke. Se på de prioriterte tiltakene under, så blir det tydeligere hvor du bør begynne.' }
};

/* ═══ Etappene ═════════════════════════════════════════════════════
   Fire steg, ett per fane i masterfila. Navnet er overskriften i A1,
   uten «STEG n:» og uten store bokstaver. Ingressen er teksten i B1.
   ─────────────────────────────────────────────────────────────────── */

const KOMPASS_ETAPPER = [
  { id: 'bolig',    navn: 'Deg og boligen din',
    ingress: 'Vi begynner med boligsituasjonen din.',
    ikon: 'hus' },
  { id: 'inne',     navn: 'Inne i boligen din',
    ingress: 'Nå skal vi se nærmere på hvilke rom du har og tilgangen til disse.',
    ikon: 'rom' },
  { id: 'adkomst',  navn: 'Veien inn til boligen din',
    ingress: 'Nå ser vi på hvordan du kommer deg fra veien eller parkeringen og inn inngangsdøren din.',
    ikon: 'dor' },
  { id: 'naermiljo', navn: 'Utenfor boligen din',
    ingress: 'Til slutt ser vi på nærmiljøet ditt. Det er ikke bare avstanden til butikk, aktiviteter og tjenester som betyr noe, men også hvordan du kommer deg dit. Tenk på hva som er viktig for deg, og hvordan dette vil fungere dersom du senere får redusert bevegelighet.',
    ikon: 'kart' }
];


/* ═══ Spørsmålene ══════════════════════════════════════════════════
   Hentet fra «MASTERFIL - Boligkompasset_3.xlsx». Tolv spørsmål, ett
   per side, nummerert som i arket: 1, 2, 3a … 12a. Kolonnene arket har
   fått for veiledningstekst og tiltak (C, D og E) er ikke tatt i bruk
   ennå. Ordlyden er som i arket,
   med skrivefeil rettet. Merknadene til designerne om bildeeksempler
   og illustrasjoner, og «IKKE AVKLART», er ikke tatt med i teksten
   folk leser.

   «popover» er teksten arket kaller Popover. Den står bak Fasadens
   hjelpetekstknapp, på spørsmålet eller på et svaralternativ.

   Feltene som styrer kompasset, er lagt til her:
     n  hvor godt svaret taler for at boligen passer, fra -1 til 1
     e  hva slags arbeid det peker på: negativt er større grep,
        positivt er små grep

   «vis» på et svaralternativ, og «betinget» på et spørsmål, er de
   betingelsene arket merker med *BETINGET VIDERE. «under» sier at
   alternativet hører til et annet alternativ i samme spørsmål, og
   står innrykket under det.
   ─────────────────────────────────────────────────────────────────── */

const kpHar = (S, id, v) => Array.isArray(S[id]) && S[id].includes(v);

/* Inngangen er stengt når du må opp en trapp, og bygget ikke har heis.
   Da veier den tyngre enn alt annet i steget, se kpKursForSteg. */
const kpInngangStengt = S => kpHar(S, 'adkomst-inngang', 'trapp') && !kpHar(S, 'adkomst-inngang', 'heis');
const KP_INNGANG_HINDRING = ['trapp', 'terskler', 'dor-tung', 'terreng'];
const kpInngangHindringer = S => KP_INNGANG_HINDRING.filter(h => kpHar(S, 'adkomst-inngang', h));

const KOMPASS_SPORSMAL = [

  /* ─── Steg 1, deg og boligen din ────────────────────────────────── */
  /* 1a og 1b sto på samme side i masterfila. Etter
     designgjennomgangen 21. oktober har de hver sin side og hver sin
     overskrift. Ingen av dem flytter nåla, slik arket sier. */
  {
    id: 'eieform',
    etappe: 'bolig',
    kilde: 'Fane 1, delspørsmål 1.',
    tittel: 'Eier eller leier du i dag?',
    hjelp: 'Om du eier boligen, har du som regel større mulighet til å gjøre endringer i boligen. I borettslag og sameier er det mulig at endringer må avklares med styret. Leier du, må endringer avklares med utleier.',
    ikkeKompass: true,
    valg: [
      { v: 'eier',  tittel: 'Eier' },
      { v: 'leier', tittel: 'Leier' }
    ]
  },
  {
    id: 'inngang',
    etappe: 'bolig',
    kilde: 'Fane 1, delspørsmål 2.',
    tittel: 'Hvordan bor du i dag?',
    hjelp: 'Noen boliger har egen inngang og adkomstvei, mens andre deler dette. For eksempel kan rekkehus og tomannsboliger ha egen inngang, selv om de deler adkomstvei eller parkering med andre. I borettslag og sameier er det mulig at endringer må avklares med styret.',
    ikkeKompass: true,
    valg: [
      { v: 'egen',          tittel: 'I en bolig med eget inngangsparti og egen adkomstvei' },
      { v: 'deler-adkomst', tittel: 'I en bolig med eget inngangsparti og deler adkomstvei med andre' },
      { v: 'deler-inngang', tittel: 'I en bolig som deler inngangsparti og adkomstvei med andre' }
    ]
  },

  /* ─── Steg 2, inne i boligen din ────────────────────────────────── */
  {
    id: 'rom',
    stikkord: 'Rommene på inngangsplanet',
    grep: 'Samle det du trenger i et døgn på samme plan',
    etappe: 'inne',
    kilde: 'Fane 2, spørsmål 3a.',
    tittel: 'Hvilke rom eller boligfunksjoner har du i samme etasje som inngangsdøren din?',
    hjelp: 'Med boligfunksjoner menes det her primærbehovene du har i løpet av et døgn, for eksempel en plass å sove, gå på toalett, lage deg mat og lignende. Vurder om alt du trenger ligger i samme etasje, om du i en periode skulle ha redusert bevegelighet.',
    popover: 'Om for eksempel badet eller soverommet ligger i en annen etasje, må du bruke trapp i løpet av døgnet. Skulle dette vare i over en uke, vil du også få behov for vaskemaskin, fryser og noe oppbevaringsplass.',
    type: 'flervalg',
    valg: [
      { v: 'stue',        tittel: 'Stue' },
      { v: 'kjokken',     tittel: 'Kjøkken' },
      { v: 'soverom',     tittel: 'Soverom' },
      { v: 'bad',         tittel: 'Bad' },
      { v: 'toalett',     tittel: 'Toalett' },
      { v: 'vaskemaskin', tittel: 'Vaskemaskin' },
      { v: 'fryser',      tittel: 'Fryser' },
      { v: 'oppbevaring', tittel: 'Oppbevaringsplass' }
    ],
    /* Det som må finnes for å klare et døgn uten trapp: kjøkken,
       soverom, og bad eller toalett. Mangler noe av det, må det
       bygges om eller bygges på. */
    poeng: v => {
      const mangler = kpRomSomMangler(v).length;
      if (!mangler) return { n: v.length >= 6 ? 1 : 0.6, e: 0 };
      return mangler === 1 ? { n: -0.5, e: -1 } : { n: -1, e: -1 };
    },
    maks: { n: 1, e: 1 }
  },
  {
    id: 'bevegelse',
    stikkord: 'Å komme seg rundt inne',
    grep: 'Fjern terskler, og gjør de trangeste dørene bredere',
    etappe: 'inne',
    kilde: 'Fane 2, spørsmål 4a.',
    tittel: 'Kommer du deg lett rundt inne i boligen?',
    hjelp: 'Det er ikke sikkert du merker noe til trapper, terskler og smale dører i dag, men dette kan bli en utfordring hvis du får redusert bevegelighet eller trenger å bruke rullator eller rullestol. Se på boligen din og tenk gjennom hva du har av hindringer og nivåforskjeller.',
    popover: 'Dette kan du enkelt teste ved å prøve å trille en fullpakket koffert med hjul gjennom alle rommene og se hvor det er vanskelig å komme frem.',
    valg: [
      { v: 'ja',     tittel: 'Ja',     n: 1,    e: 0 },
      { v: 'delvis', tittel: 'Delvis', n: 0,    e: 1 },
      { v: 'nei',    tittel: 'Nei',    n: -0.7, e: 0.6 }
    ]
  },
  {
    id: 'bad-innhold',
    stikkord: 'Det som finnes på badet',
    grep: 'Samle toalett, vask og dusj i ett rom',
    etappe: 'inne',
    kilde: 'Fane 2, spørsmål 5a, med 5b når toalett ikke er krysset av.',
    tittel: 'Hva inneholder badet ditt?',
    hjelp: 'Badet er et viktig rom for å kunne klare seg selv og bo hjemme så lenge som mulig. Tenk på hvilke funksjoner du har på badet ditt i dag.',
    type: 'flervalg',
    valg: [
      { v: 'toalett',     tittel: 'Toalett' },
      { v: 'vask',        tittel: 'Vask' },
      { v: 'badekar',     tittel: 'Badekar' },
      { v: 'dusj',        tittel: 'Dusj' },
      { v: 'vaskemaskin', tittel: 'Plass til vaskemaskin på badet' }
    ],
    /* 4b: bare når det er svart, men ikke krysset av for toalett */
    betinget: {
      navn: 'toalett-plassering',
      naar: S => Array.isArray(S['bad-innhold']) && S['bad-innhold'].length > 0 && !kpHar(S, 'bad-innhold', 'toalett'),
      ledetekst: 'Hvor ligger toalettet?',
      hjelp: 'Hvor toalettet ligger i forhold til bad og soverom kan få betydning dersom bevegeligheten din endrer seg. Tenk særlig på om du må gå langt, bruke trapper eller passere andre hindringer for å komme til toalettet.',
      valg: [
        { v: 'naborom',      tittel: 'På rommet ved siden av badet' },
        { v: 'samme-etasje', tittel: 'På samme etasje som badet' },
        { v: 'annen-etasje', tittel: 'I annen etasje enn badet' }
      ]
    },
    poeng: (v, S) => {
      const ledd = [];
      if (v.includes('toalett')) ledd.push({ n: 0.6, e: 0 });
      else ledd.push({ naborom: { n: -0.2, e: -0.6 }, 'samme-etasje': { n: -0.4, e: -0.6 },
                       'annen-etasje': { n: -0.9, e: -1 } }[S['toalett-plassering']] || { n: -0.3, e: -0.5 });
      if (!v.includes('dusj') && !v.includes('badekar')) ledd.push({ n: -0.5, e: -1 });
      return { n: Math.min(...ledd.map(l => l.n)), e: Math.min(...ledd.map(l => l.e)) };
    },
    maks: { n: 1, e: 1 }
  },
  {
    id: 'bad-bruk',
    stikkord: 'Å bruke badet',
    grep: 'Dusj uten kant, dør som slår utover, og plass til å snu',
    etappe: 'inne',
    kilde: 'Fane 2, spørsmål 6a. Fem av alternativene vises bare etter svaret på 5a eller 6a3.',
    tittel: 'Hvor enkelt er det for deg å bruke badet ditt om du får redusert bevegelighet?',
    hjelp: 'Et bad bør ha nok plass til at du kan bevege deg fritt og bruke badet på en trygg måte. Tenk på om det er god plass rundt toalettet, vasken og dusjen. Se også på om du lett kommer deg inn og ut av dusjen/badekaret. Tenk over om badet kan brukes dersom du får problemer med å bevege deg, trenger hjelpemidler eller hjelp fra andre.',
    undertekst: 'Kryss av for det som passer.',
    type: 'flervalg',
    /* «utelukker» tar bort kryss som ikke kan stå samtidig: badet kan
       ikke både være stort nok og lite. Dørene hører til det lille
       badet og forsvinner med det. */
    valg: [
      { v: 'terskel',      tittel: 'Kan bli vanskelig, baderomsdøren har terskel' },
      { v: 'stort',        tittel: 'Enkelt, badet er stort nok', utelukker: ['lite', 'dor-innover', 'dor-utover'],
        popover: 'Større enn 4,5 kvm og plass til alle baderomsfunksjoner, for eksempel toalett, vask, dusj.' },
      { v: 'lite',         tittel: 'Kan bli vanskelig, badet er lite', utelukker: ['stort'],
        popover: 'Mindre enn 4,5 kvm og har ikke plass til alle baderomsfunksjoner, for eksempel kan toalett være på eget rom.' },
      { v: 'dor-innover',  tittel: 'Baderomsdøren slår innover i rommet', utelukker: ['dor-utover'],
        under: 'lite', vis: S => kpHar(S, 'bad-bruk', 'lite') },
      { v: 'dor-utover',   tittel: 'Baderomsdøren slår utover i rommet', utelukker: ['dor-innover'],
        under: 'lite', vis: S => kpHar(S, 'bad-bruk', 'lite') },
      { v: 'dusj-kant',    tittel: 'Kan bli vanskelig, dusjkabinett eller dusjsone har en høydeforskjell',
        vis: S => kpHar(S, 'bad-innhold', 'dusj') },
      { v: 'dusj-stol',    tittel: 'Kan bli vanskelig, dusjen har ikke plass til dusjstol/-krakk',
        vis: S => kpHar(S, 'bad-innhold', 'dusj') },
      { v: 'badekar',      tittel: 'Kan bli vanskelig, badekaret har en høy kant',
        vis: S => kpHar(S, 'bad-innhold', 'badekar') },
      { v: 'usikker',      tittel: 'Usikker', alene: true }
    ],
    /* Hvert hinder drar nåla nedover. Terskel, dør og plass til krakk
       løses med små grep. Et lite bad, en kant inn i dusjen eller et
       badekar som er blitt vanskelig, krever at badet bygges om. Et bad
       som er stort nok, og ingen hindringer, taler for boligen. En dør
       som slår utover er slik den skal være, og teller ikke. */
    poeng: v => {
      if (v.includes('usikker')) return { n: 0, e: 0 };
      const vekt = { terskel: 1, 'dor-innover': 1, 'dusj-stol': 0.5, lite: -1, 'dusj-kant': -0.8, badekar: -0.8 };
      const hinder = v.filter(x => x in vekt);
      if (!hinder.length) return { n: v.includes('stort') ? 1 : 0, e: 0 };
      const e = hinder.reduce((s, x) => s + vekt[x], 0);
      return { n: -Math.min(1, 0.3 + 0.25 * hinder.length), e: Math.max(-1, Math.min(1, e)) };
    },
    maks: { n: 1, e: 1 }
  },

  /* ─── Steg 3, veien inn til boligen din ─────────────────────────── */
  {
    id: 'adkomst-frem',
    stikkord: 'Veien fram til døra',
    grep: 'Jevn ut terrenget, og få bedre lys',
    etappe: 'adkomst',
    kilde: 'Fane 3, spørsmål 7a.',
    tittel: 'Kommer du deg lett fram til boligen din fra offentlig vei?',
    hjelp: 'Hvor lett adkomsten til boligen din er, avhenger av om du går til fots eller kommer i bil. Veien kan være bratt, lang, glatt om vinteren eller så kan det være andre forhold som gjør adkomsten vanskelig. Tenk over strekningen fra der bilen, bussen eller drosjen slipper deg av, og fram til inngangsdøra.',
    valg: [
      { v: 'ja',     tittel: 'Ja',     n: 1,    e: 0 },
      { v: 'delvis', tittel: 'Delvis', n: -0.3, e: 0.8 },
      { v: 'nei',    tittel: 'Nei',    n: -0.9, e: -0.4 }
    ]
  },
  {
    id: 'adkomst-inngang',
    stikkord: 'Å komme seg inn i boligen',
    grep: 'Be kommunen eller Hjelpemiddelsentralen se på inngangen',
    etappe: 'adkomst',
    kilde: 'Fane 3, spørsmål 8a. Flervalg.',
    tittel: 'Hvor lett er det å komme seg inn i boligen din?',
    hjelp: 'Eneboliger har som regel bare en hovedinngang, mens en leilighet i blokk ofte har to innganger før du er inne i selve leiligheten. I sistnevnte bygg kan det være heis, mens andre kun har trapper. Tenk over om det er bratt terreng, terskler, trapper eller andre hindringer som kan være et problem om du får redusert bevegelighet.',
    undertekst: 'Kryss av for det som passer.',
    type: 'flervalg',
    valg: [
      { v: 'ingen-trinn', tittel: 'Lett, det er ingen trinn eller høye terskler' },
      { v: 'heis',        tittel: 'Lett, bygget har heis' },
      { v: 'dor-lett',    tittel: 'Lett, døren er bred og lett å åpne',
        popover: 'Vurder om døren er så bred at man kommer gjennom med for eksempel en rullator eller rullestol.' },
      { v: 'trapp',       tittel: 'Kan bli vanskelig, jeg må opp en trapp' },
      { v: 'terskler',    tittel: 'Kan bli vanskelig, det er høye terskler eller trinn' },
      { v: 'dor-tung',    tittel: 'Kan bli vanskelig, døren er tung å åpne' },
      { v: 'terreng',     tittel: 'Kan bli vanskelig, det er bratt eller ujevnt terreng foran inngangen' }
    ],
    /* Bare det som er lett, taler for boligen. Hver hindring drar nåla
       ned. Trapp og bratt terreng krever større arbeid, terskler og en
       tung dør løses med små grep. Trapp uten heis drar helt ned. */
    poeng: (v, S) => {
      const h = v.filter(x => KP_INNGANG_HINDRING.includes(x));
      if (!h.length) return { n: 1, e: 0 };
      const vekt = { trapp: v.includes('heis') ? -0.4 : -1, terreng: -0.6, terskler: 1, 'dor-tung': 1 };
      const n = kpInngangStengt(S) ? -1 : -Math.min(1, 0.35 + 0.2 * h.length);
      const e = h.reduce((s, x) => s + vekt[x], 0);
      return { n, e: Math.max(-1, Math.min(1, e)) };
    },
    maks: { n: 1, e: 1 }
  },
  {
    id: 'adkomst-lagring',
    stikkord: 'Lagringsplass ved inngangen',
    grep: 'Lag plass under tak til rullator og utstyr',
    etappe: 'adkomst',
    kilde: 'Fane 3, spørsmål 9a.',
    tittel: 'Har du lagringsplass i nærheten av inngangsdøren?',
    hjelp: 'Vurder om det finnes lagringsplass nær inngangsdøren. Dette kan være en bod, entre, et overbygd område eller plass inne i boligen der hjelpemidler og annet utstyr kan oppbevares tørt og lett tilgjengelig.',
    popover: 'Tenk på om du har plass til å lagre for eksempel sykkel, rullator, rullestol eller handlevogn.',
    valg: [
      { v: 'ja',     tittel: 'Ja',     n: 0.8,  e: 0 },
      { v: 'delvis', tittel: 'Delvis', n: 0,    e: 1 },
      { v: 'nei',    tittel: 'Nei',    n: -0.5, e: 0.8 }
    ]
  },

  /* ─── Steg 4, utenfor boligen din ───────────────────────────────── */
  {
    id: 'tjenester',
    stikkord: 'Service og tjenester i nærheten',
    grep: 'Dette kan ikke bygges om. Det teller hvis du en dag vurderer å flytte',
    etappe: 'naermiljo',
    kilde: 'Fane 4, spørsmål 10a.',
    tittel: 'Hvor tilgjengelig vil service- og tjenestetilbud være for deg ved redusert bevegelighet?',
    hjelp: 'Eksempler på tilbud som er viktige for de fleste er matbutikk, apotek, lege, offentlige tjenester og andre steder du er avhengig av i hverdagen. Vurder om du fortsatt vil kunne komme deg dit eller få tilgang til de tilbudene du ønsker, dersom bevegeligheten din blir redusert. I vurderingen kan du gjerne ta hensyn til gangavstand, transportmuligheter, tilgjengelighet, leveringsmuligheter eller digitale alternativer.',
    valg: [
      { v: 'god',       tittel: 'God tilgang',              n: 1,    e: 0 },
      { v: 'begrenset', tittel: 'Begrenset tilgang',        n: -0.5, e: 0 },
      { v: 'sterkt',    tittel: 'Sterkt begrenset tilgang', n: -1,   e: 0 },
      { v: 'usikker',   tittel: 'Usikker',                  n: 0,    e: 0 }
    ]
  },
  {
    id: 'aktiviteter',
    stikkord: 'Å delta på det du ønsker',
    grep: 'Sjekk transporttjenesten i kommunen din',
    etappe: 'naermiljo',
    kilde: 'Fane 4, spørsmål 11a.',
    tittel: 'Hvor lett vil det være for deg å delta på de aktivitetene du ønsker ved redusert bevegelighet?',
    hjelp: 'Tenk på aktiviteter og møteplasser som er viktige for deg, for eksempel kulturtilbud, idrett, frivillige aktiviteter, tros- og livssynstilbud, bibliotek, natur- og parkområder, kafé eller å bare kunne treffe familie og venner. I vurderingen kan du gjerne ta hensyn til gangavstand, tilgjengelighet og transportmuligheter. Ved å planlegge tidlig kan du legge til rette for å opprettholde sosial kontakt og fortsette med aktiviteter som gir deg glede og mening i hverdagen.',
    valg: [
      { v: 'lett',      tittel: 'Lett',            n: 1,    e: 0 },
      { v: 'noe',       tittel: 'Noe vanskelig',   n: 0.3,  e: 0.5 },
      { v: 'svaert',    tittel: 'Svært vanskelig', n: -1,   e: 0 },
      { v: 'usikker',   tittel: 'Usikker',         n: 0,    e: 0 }
    ]
  },
  {
    id: 'hjelp',
    stikkord: 'Noen som kan hjelpe deg',
    grep: 'Frivilligsentralen formidler hjelp til praktiske ting',
    etappe: 'naermiljo',
    kilde: 'Fane 4, spørsmål 12a.',
    tittel: 'Har du noen som kan hjelpe deg med praktiske oppgaver om du trenger det?',
    hjelp: 'Noen praktiske oppgaver kan være handling, transport, snømåking, hagearbeid, flytting av tunge gjenstander eller enkle oppgaver i hjemmet. Tenk over om du har familie, venner, naboer eller andre som kan hjelpe deg med praktiske oppgaver dersom bevegeligheten din blir redusert for en periode.',
    valg: [
      { v: 'ja',     tittel: 'Ja',     n: 1,    e: 0 },
      { v: 'delvis', tittel: 'Delvis', n: 0.2,  e: 0.5 },
      { v: 'nei',    tittel: 'Nei',    n: -0.6, e: 0.5 }
    ]
  }
];

/* Rommene du trenger for å klare et døgn uten trapp, og som ikke
   ligger på inngangsplanet. Bad eller toalett holder. */
function kpRomSomMangler(valgt) {
  const v = valgt || [];
  const mangler = [];
  if (!v.includes('kjokken')) mangler.push('kjøkken');
  if (!v.includes('soverom')) mangler.push('soverom');
  if (!v.includes('bad') && !v.includes('toalett')) mangler.push('bad eller toalett');
  return mangler;
}

/* ═══ Støtteordningene ═════════════════════════════════════════════ */

const KOMPASS_ORDNINGER = {
  aldersvennlig: {
    navn: 'Tilskudd til aldersvennlig oppgradering',
    kort: 'Dekker 25 prosent av det du oppgraderer for, opptil 75 000 kroner. Tilskudd er penger du får, ikke et lån.',
    lenke: 'https://pettersommerseth1994.github.io/husbanken/tilskudd.html', lenketekst: 'Se hva du kan få'
  },
  startlaan: {
    navn: 'Startlån fra kommunen',
    kort: 'For deg som har hatt problemer med å få lån i vanlig bank. Kan kombineres med tilskudd fra kommunen.',
    lenke: 'https://husbanken.no/person/startlaan/', lenketekst: 'Les om startlån'
  },
  komtilskudd: {
    navn: 'Tilskudd fra kommunen',
    kort: 'Kommunen kan gi tilskudd til alt fra enkle tiltak til større ombygginger, og til å få saken utredet av fagfolk.',
    lenke: 'https://husbanken.no/person/startlaan/tilskudd-fra-kommunen/', lenketekst: 'Les om tilskudd fra kommunen'
  },
  husbanklaan: {
    navn: 'Lån fra Husbanken',
    kort: 'For deg som skal bygge om, oppgradere eller kjøpe bolig. Boligen må oppfylle visse krav.',
    lenke: 'https://husbanken.no/person/laan-fra-husbanken/', lenketekst: 'Les om lån fra Husbanken'
  },
  bostotte: {
    navn: 'Bostøtte',
    kort: 'Har du lav inntekt og høye boutgifter, kan bostøtte hjelpe. Særlig aktuelt hvis boutgiftene øker etter en ombygging.',
    lenke: 'https://husbanken.no/person/bostotte/', lenketekst: 'Les om bostøtte'
  },
  navrampe: {
    navn: 'Tilskudd fra Nav, rampe og terskler',
    kort: 'Ramper, terskeleliminatorer og skråbrett for deg som bruker rullestol eller ganghjelpemiddel.',
    lenke: 'https://www.nav.no/', lenketekst: 'Les om tilskudd fra Nav'
  },
  navombygging: {
    navn: 'Tilskudd fra Nav, ombygging',
    kort: 'Tilskudd til ombygging i stedet for rampe og heis, for å få en varig tilrettelagt bolig.',
    lenke: 'https://www.nav.no/', lenketekst: 'Les om tilskudd fra Nav'
  },
  hjelpemiddel: {
    navn: 'Hjelpemiddelsentralen',
    kort: 'Gratis råd om rampe, løfteplattform, heis og hjelpemidler i boligen. De kommer også hjem til deg.',
    lenke: 'https://www.nav.no/hjelpemiddelsentral', lenketekst: 'Finn hjelpemiddelsentralen din'
  },
  ergoterapeut: {
    navn: 'Ergoterapeut i kommunen',
    kort: 'Vurderer boligen sammen med deg og skriver den faglige begrunnelsen mange ordninger krever.',
    lenke: '#kommune', lenketekst: 'Finn kommunen din'
  }
};

/* ═══ Anbefalingene ════════════════════════════════════════════════
   Rekkefølgen under er prioriteringen. Kommer du ikke inn og ut av
   boligen, hjelper det lite hva som er gjort inne. Derfor ligger
   adkomst øverst, badet like under, og de enkle grepene til slutt
   fordi de alltid er verdt å gjøre.

   «hvorfor» viser alltid svaret som utløste anbefalingen. Brukerne i
   testene ba spesielt om den koblingen.
   ─────────────────────────────────────────────────────────────────── */

const KOMPASS_ANBEFALINGER = [

  /* ── 1. Veien inn ──────────────────────────────────────────────── */
  {
    id: 'inngang-tung',
    prioritet: 1, storrelse: 'stor', etappe: 'adkomst',
    naar: kpInngangStengt,
    tittel: 'Få gjort noe med inngangen først',
    tekst: 'Alt annet kan vente. Kommer du ikke inn og ut på egen hånd, blir du sittende inne, og da hjelper ikke et nytt bad. Be kommunen eller Hjelpemiddelsentralen komme hjem til deg og se på inngangen. Det er gratis, og de kommer med en løsning du kan regne på.',
    hvorfor: S => 'Du svarte at du må opp en trapp for å komme inn, og bygget har ikke heis.',
    tiltak: ['1a', '1b', '1c'],
    ordninger: ['hjelpemiddel', 'aldersvennlig', 'navrampe', 'komtilskudd']
  },
  {
    id: 'inngang-vanskelig',
    prioritet: 2, storrelse: 'stor', etappe: 'adkomst',
    naar: S => !kpInngangStengt(S) && kpInngangHindringer(S).length > 0,
    tittel: 'Gjør inngangen trinnfri',
    tekst: 'Ett trinn løses ofte med en terskelplate eller et skråbrett. Med flere trinn kan en rampe med slak stigning være mulig, hvis det er flatt nok utenfor. Regn med at rampa blir omtrent en meter lang per ti centimeter høyde. Er det mange trinn, ser man heller på løfteplattform eller på å legge om terrenget.',
    hvorfor: S => {
      const t = { trapp: 'du må opp en trapp', terskler: 'det er høye terskler eller trinn',
                  'dor-tung': 'døren er tung å åpne', terreng: 'det er bratt eller ujevnt terreng foran inngangen' };
      return 'Du svarte at ' + kpInngangHindringer(S).map(h => t[h]).join(', og at ') + '.';
    },
    tiltak: ['1a', '1b', '1c'],
    ordninger: ['hjelpemiddel', 'aldersvennlig', 'navrampe']
  },
  {
    id: 'vei-frem',
    prioritet: 3, storrelse: 'stor', etappe: 'adkomst',
    naar: S => S['adkomst-frem'] === 'nei' || S['adkomst-frem'] === 'delvis',
    tittel: 'Gjør veien fram til døra jevn og trygg',
    tekst: 'Strekningen fra parkeringen eller veien og fram til døra blir ofte glemt. Den kan jevnes ut, få fast dekke, bedre lys og et rekkverk å holde i. Om vinteren er det denne strekningen som avgjør om du kommer deg ut i det hele tatt.',
    hvorfor: S => S['adkomst-frem'] === 'nei'
      ? 'Du svarte nei på om du kommer deg lett fram til boligen fra offentlig vei.'
      : 'Du svarte at du delvis kommer deg lett fram til boligen fra offentlig vei.',
    tiltak: ['1a'],
    ordninger: ['aldersvennlig', 'komtilskudd']
  },
  {
    id: 'lagring',
    prioritet: 7, storrelse: 'liten', etappe: 'adkomst',
    naar: S => S['adkomst-lagring'] === 'nei' || S['adkomst-lagring'] === 'delvis',
    tittel: 'Lag plass til utstyret ved inngangen',
    tekst: 'En bod, et takoverbygg eller en halv kvadratmeter ved døra er ofte nok. Da kan rullator, handlevogn eller sykkel stå tørt, og du slipper å dra dem inn og ut. Et hjelpemiddel som står ute i snøen, blir stående ubrukt.',
    hvorfor: S => S['adkomst-lagring'] === 'nei'
      ? 'Du svarte at du ikke har lagringsplass i nærheten av inngangsdøren.'
      : 'Du svarte at du delvis har lagringsplass i nærheten av inngangsdøren.',
    tiltak: ['1b'],
    ordninger: ['aldersvennlig']
  },

  /* ── 2. Badet ──────────────────────────────────────────────────── */
  {
    id: 'bad-ombygging',
    prioritet: 4, storrelse: 'stor', etappe: 'inne',
    naar: S => kpHar(S, 'bad-bruk', 'lite')
               || ['naborom', 'samme-etasje', 'annen-etasje'].includes(S['toalett-plassering']),
    tittel: 'Bygg om badet mens du kan velge selv',
    tekst: 'Trangt bad er den vanligste enkeltgrunnen til at folk må flytte fra en bolig de ellers trives i. Et bad som bygges om nå, kan planlegges i ro, og du får den løsningen du vil ha. Ligger toalettet i et eget rom vegg i vegg, er det ofte det rimeligste grepet å slå dem sammen.',
    hvorfor: S => {
      const g = [];
      if (kpHar(S, 'bad-bruk', 'lite')) g.push('du har et lite bad');
      const t = { naborom: 'toalettet ligger på rommet ved siden av badet', 'samme-etasje': 'toalettet ligger i et annet rom i samme etasje',
                  'annen-etasje': 'toalettet ligger i en annen etasje enn badet' }[S['toalett-plassering']];
      if (t) g.push(t);
      return 'Du svarte at ' + g.join(', og at ') + '.';
    },
    tiltak: ['4a', '4c'],
    ordninger: ['aldersvennlig', 'komtilskudd', 'startlaan', 'husbanklaan']
  },
  {
    id: 'dusjsone',
    prioritet: 5, storrelse: 'stor', etappe: 'inne',
    naar: S => kpHar(S, 'bad-bruk', 'dusj-kant') || kpHar(S, 'bad-bruk', 'badekar')
               || (Array.isArray(S['bad-innhold']) && S['bad-innhold'].length > 0
                   && !kpHar(S, 'bad-innhold', 'dusj') && !kpHar(S, 'bad-innhold', 'badekar')),
    tittel: 'Lag en dusjsone uten kant',
    tekst: 'En dusj i nisje uten kant, med sluk i gulvet, et håndtak å holde i og et klappsete på veggen, fjerner ett av de stedene folk faller oftest. Skal badet uansett pusses opp en gang, er dette grepet å ta da.',
    hvorfor: S => kpHar(S, 'bad-bruk', 'dusj-kant')
      ? 'Du svarte at dusjkabinettet eller dusjsonen har en høydeforskjell.'
      : kpHar(S, 'bad-bruk', 'badekar')
        ? 'Du svarte at badekaret har en høy kant.'
        : 'Du krysset ikke av for dusj eller badekar på badet.',
    tiltak: ['4b'],
    ordninger: ['aldersvennlig', 'komtilskudd']
  },
  {
    id: 'dusjstol',
    prioritet: 8, storrelse: 'liten', etappe: 'inne',
    naar: S => kpHar(S, 'bad-bruk', 'dusj-stol'),
    tittel: 'Få plass til å sitte i dusjen',
    tekst: 'Et klappsete på veggen tar ingen plass når det er slått opp, og det gjør dusjen trygg også den dagen du ikke klarer å stå lenge. Sett opp et støttehåndtak ved siden av samtidig.',
    hvorfor: S => 'Du svarte at dusjen ikke har plass til dusjstol eller krakk.',
    tiltak: ['5c', '5d'],
    ordninger: ['aldersvennlig']
  },
  {
    id: 'bad-dor',
    prioritet: 8, storrelse: 'liten', etappe: 'inne',
    naar: S => kpHar(S, 'bad-bruk', 'dor-innover') || kpHar(S, 'bad-bruk', 'terskel'),
    tittel: 'Gjør baderomsdøra enkel å komme gjennom',
    tekst: 'Faller noen på et lite bad, kan kroppen sperre en dør som slår innover. Da kommer ingen inn for å hjelpe. Å snu døra, eller bytte til en skyvedør, er et lite arbeid med stor virkning. En terskel kan ofte tas bort eller skråes ned samtidig.',
    hvorfor: S => {
      const g = [];
      if (kpHar(S, 'bad-bruk', 'dor-innover')) g.push('baderomsdøren slår innover i rommet');
      if (kpHar(S, 'bad-bruk', 'terskel')) g.push('baderomsdøren har terskel');
      return 'Du svarte at ' + g.join(', og at ') + '.';
    },
    tiltak: ['3a', '3b'],
    ordninger: ['aldersvennlig']
  },

  /* ── 3. Rommene og bevegelsen inne ─────────────────────────────── */
  {
    id: 'rom-plan',
    prioritet: 4, storrelse: 'stor', etappe: 'inne',
    naar: S => Array.isArray(S.rom) && S.rom.length > 0 && kpRomSomMangler(S.rom).length > 0,
    tittel: 'Samle det nødvendige på inngangsplanet',
    tekst: 'Klarer du deg gjennom et døgn uten å gå i trapp, kan du bli boende også i en periode der trappa er utelukket, for eksempel etter en operasjon. Noen ganger holder det å bytte om på rommene du har. Andre ganger må det bygges på. Er det plass på tomta, er påbygg ofte enklere enn folk tror.',
    hvorfor: S => 'Du krysset ikke av for ' + kpRomSomMangler(S.rom).join(' eller ') + ' i samme etasje som inngangsdøren.',
    tiltak: ['2a', '2b'],
    ordninger: ['aldersvennlig', 'startlaan', 'husbanklaan', 'komtilskudd']
  },
  {
    id: 'terskler',
    prioritet: 6, storrelse: 'liten', etappe: 'inne',
    naar: S => S.bevegelse === 'delvis' || S.bevegelse === 'nei',
    tittel: 'Fjern terskler og utvid de trangeste dørene',
    tekst: 'Terskler kan ofte tas bort eller skråes ned på en dag. Døråpninger bør være minst 86 centimeter fri bredde for at en rullator skal komme gjennom uten å skrape. Begynn med de dørene du bruker mest: bad, soverom og ut.',
    hvorfor: S => S.bevegelse === 'nei'
      ? 'Du svarte at du ikke kommer deg lett rundt inne i boligen.'
      : 'Du svarte at du delvis kommer deg lett rundt inne i boligen.',
    tiltak: ['3a', '3b', '3c'],
    ordninger: ['aldersvennlig', 'komtilskudd']
  },
  {
    id: 'trapp',
    prioritet: 7, storrelse: 'liten', etappe: 'inne',
    naar: S => (Array.isArray(S.rom) && S.rom.length > 0 && kpRomSomMangler(S.rom).length > 0)
               || kpHar(S, 'adkomst-inngang', 'trapp'),
    tittel: 'Håndlist på begge sider i trappa',
    tekst: 'Håndlist på begge sider, hele veien opp og ned, og et par centimeter forbi øverste og nederste trinn. Merk forkanten på trinnene med en stripe i en farge som skiller seg ut. Det koster lite, og det er blant de mest effektive fallforebyggende tiltakene som finnes.',
    hvorfor: S => (Array.isArray(S.rom) && kpRomSomMangler(S.rom).length)
      ? 'Du må bruke trapp i løpet av døgnet, fordi noe av det du trenger ligger i en annen etasje.'
      : 'Du svarte at du må opp en trapp for å komme inn i boligen.',
    tiltak: ['5c', '5d'],
    ordninger: ['aldersvennlig']
  },

  /* ── 4. Utenfor boligen og folk rundt deg ──────────────────────── */
  {
    id: 'naermiljo-tynt',
    prioritet: 3, storrelse: 'stor', etappe: 'naermiljo',
    naar: S => ['begrenset', 'sterkt'].includes(S.tjenester) || S.aktiviteter === 'svaert',
    tittel: 'Nærmiljøet er det eneste du ikke kan bygge om',
    tekst: 'Du kan gjøre boligen din så god du vil, men du kan ikke flytte butikken nærmere. Når det er langt til alt, og transporten er tungvint, blir hverdagen liten selv i en velfungerende bolig. Snakk med kommunen om transporttjeneste og levering, og la dette veie tungt hvis du en dag vurderer å flytte.',
    hvorfor: S => ['begrenset', 'sterkt'].includes(S.tjenester)
      ? 'Du svarte at du vil ha ' + (S.tjenester === 'sterkt' ? 'sterkt begrenset' : 'begrenset') + ' tilgang til service og tjenester ved redusert bevegelighet.'
      : 'Du svarte at det vil være ' + 'svært vanskelig' + ' å delta på aktivitetene du ønsker ved redusert bevegelighet.',
    tiltak: [],
    ordninger: ['ergoterapeut', 'bostotte']
  },
  {
    id: 'ingen-hjelp',
    prioritet: 8, storrelse: 'liten', etappe: 'naermiljo',
    naar: S => S.hjelp === 'nei' || S.hjelp === 'delvis',
    tittel: 'Skaff deg noen å ringe før du trenger det',
    tekst: 'Frivilligsentralen i kommunen din formidler hjelp til snømåking, plenklipping, småreparasjoner og skyss. Mange kommuner har også besøksvenn. Det koster ingenting, og det er lettere å ta kontakt før noe har skjedd enn etterpå.',
    hvorfor: S => S.hjelp === 'nei'
      ? 'Du svarte at du ikke har noen som kan hjelpe deg med praktiske oppgaver.'
      : 'Du svarte at du delvis har noen som kan hjelpe deg med praktiske oppgaver.',
    tiltak: [],
    ordninger: ['ergoterapeut']
  },

  /* ── 5. Trygghet, alltid verdt å gjøre ─────────────────────────── */
  {
    id: 'lys-trygghet',
    prioritet: 9, storrelse: 'liten', etappe: 'inne',
    naar: () => true,
    tittel: 'De grepene som alltid lønner seg',
    tekst: 'Uansett hva du har svart ellers: godt lys i trapp, gang, bad og ute. Lys som slår seg på av seg selv når du kommer. Sammenkoblede røykvarslere. Komfyrvakt. Et par støttehåndtak der du allerede tar deg fast i veggen. Til sammen koster dette lite, og det er det som hindrer de ulykkene som gjør at folk må flytte brått.',
    hvorfor: S => 'Dette anbefaler vi til alle. Det er billig, det krever ingen søknad, og det virker med én gang.',
    tiltak: ['5a', '5b', '5c', '5f'],
    ordninger: ['aldersvennlig']
  },

  /* ── 6. Eieform og bygg ────────────────────────────────────────── */
  {
    id: 'leier',
    prioritet: 2, storrelse: 'liten', etappe: 'bolig',
    naar: S => S.eieform === 'leier',
    tittel: 'Ta dette opp med utleier',
    tekst: 'Du kan ikke bygge om en bolig du leier uten å spørre. Men utleier kan søke tilskudd, og mange sier ja når de forstår at tiltaket gjør boligen bedre også for neste leietaker. Skriv ned hva du trenger, og be om et skriftlig svar. Får du nei, kan kommunen hjelpe deg videre.',
    hvorfor: S => 'Du svarte at du leier boligen.',
    tiltak: [],
    ordninger: ['komtilskudd', 'bostotte']
  },
  {
    id: 'fellesareal',
    prioritet: 5, storrelse: 'liten', etappe: 'bolig',
    naar: S => (S.inngang === 'deler-inngang' || S.inngang === 'deler-adkomst')
              && (kpInngangHindringer(S).length > 0
                  || S['adkomst-frem'] === 'nei' || S['adkomst-frem'] === 'delvis'),
    tittel: 'Ta inngangen opp med styret eller naboene',
    tekst: 'Inngangsparti, trapp, heis og adkomstvei som du deler med andre, kan du ikke endre alene. Men du skal heller ikke betale for det alene. Bor du i borettslag eller sameie, be styret ta det opp på neste generalforsamling eller sameiermøte. De kan søke egne ordninger for tilgjengelighet.',
    hvorfor: S => 'Du svarte at du ' + (S.inngang === 'deler-inngang' ? 'deler inngangsparti og adkomstvei' : 'deler adkomstvei') + ' med andre, og at veien inn er vanskelig.',
    tiltak: ['1b'],
    ordninger: ['husbanklaan', 'komtilskudd']
  }
];

/* ═══ Tiltakskatalogen ═══════════════════════════════════════════
   Ordlyden er hentet fra arket «Eksempler på tiltak» i
   arbeidsdokumentet.
   ─────────────────────────────────────────────────────────────────── */

const KOMPASS_TILTAK = {
  '1a': 'Justere terrenget ved parkeringsplass, gangveien og/eller inngangspartiet',
  '1b': 'Forbedre inngangspartiet og/eller inngangsdøren',
  '1c': 'Andre forbedringer som gir trinnfri adkomst',
  '2a': 'Endre planløsningen',
  '2b': 'Utvide boligen',
  '3a': 'Fjerne terskler og nivåforskjeller inne',
  '3b': 'Lage større døråpning og/eller flytte dør',
  '3c': 'Utvide rom for bedre tilgang og snuareal',
  '3d': 'Lage trinnfri tilgang til uteområder fra boligen',
  '3e': 'Andre forbedringer som gjør det lettere å bevege seg rundt i boligen',
  '4a': 'Endre plassering av baderomsfunksjoner slik at de er enkle å bruke',
  '4b': 'Lage en trygg og trinnfri dusjsone',
  '4c': 'Bygge om eller utvide badet for plass til nødvendige funksjoner',
  '5a': 'Installere god belysning inne og/eller ute',
  '5b': 'Forbedre brannsikkerheten',
  '5c': 'Sette opp støttehåndtak, håndlister og/eller rekkverk',
  '5d': 'Forsterke vegger for montering av støttehåndtak',
  '5e': 'Installere løsninger som styrker orienteringsevnen',
  '5f': 'Andre forbedringer som gjør boligen og uteområdet tryggere'
};
