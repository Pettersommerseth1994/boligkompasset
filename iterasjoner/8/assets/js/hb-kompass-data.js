/* ──────────────────────────────────────────────────────────────────
   Boligkompasset, innholdet

   Spørsmålene på dag 1 er hentet fra kolonnene «Forslag spørsmål»,
   «Forslag svaralternativer» og «Forslag veiledningstekst» i
   arbeidsdokumentet fra workshopen 21.–22. september 2026.
   Spørsmålene med status «Fjern» er tatt ut, og spørsmål 1 og 2 er
   slått sammen slik merknaden i kolonne K ber om.

   Dag 2, altså bad og økonomi, står som i studentenes prototype.
   Der finnes det ennå ingen omskriving å følge.

   Hver etappe, hvert spørsmål og hvert svaralternativ har en
   undertekst. Brukertestene og designkritikken pekte begge på at
   folk ikke forstår hva vi spør om, og ikke vet hva svaret brukes
   til. Derfor står «Derfor spør vi» og «Dette brukes til» synlig
   ved hvert spørsmål, ikke gjemt i et trekkspill.
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
   Fem etapper i stedet for sju kategorier. Designkritikken sa
   «mange kategorier» og «enklere spørsmålsreise».
   ─────────────────────────────────────────────────────────────────── */

const KOMPASS_ETAPPER = [
  { id: 'bolig',    navn: 'Deg og boligen din',
    ingress: 'Først noen få opplysninger om boligen og om hverdagen din. De avgjør hvilke råd som passer for deg, og hvilke støtteordninger du kan bruke.',
    ikon: 'hus' },
  { id: 'naermiljo', navn: 'Nærmiljøet ditt',
    ingress: 'Et godt nærmiljø gjør hverdagen enklere. Å komme seg til butikken, til folk og til det du liker å gjøre, betyr like mye som selve boligen. Det er også det som er vanskeligst å bygge seg ut av.',
    ikon: 'kart' },
  { id: 'adkomst',  navn: 'Veien inn til boligen din',
    ingress: 'Nå ser vi på veien fra veien eller parkeringen og inn døra. Kommer du deg ikke inn og ut, hjelper det lite hva som er gjort inne. Derfor veier dette steget tyngst.',
    ikon: 'dor' },
  { id: 'inne',     navn: 'Inne i boligen din',
    ingress: 'Her handler det om rommene, avstandene og badet. Det er her de fleste tiltakene i det nye tilskuddet ligger.',
    ikon: 'rom' },
  { id: 'okonomi',  navn: 'Økonomien din',
    ingress: 'Til slutt fire frivillige spørsmål om økonomi. De endrer ikke kursen i kompasset. De brukes bare til å vise hvilke lån og tilskudd som kan passe for deg. Ingenting sjekkes mot bank, skatt eller register, og du kan hoppe over hele steget.',
    ikon: 'krone', frivillig: true }
];

/* ═══ Spørsmålene ══════════════════════════════════════════════════ */

const KOMPASS_SPORSMAL = [

  /* ─── Etappe 1, deg og boligen ──────────────────────────────────── */
  {
    id: 'bolig',
    etappe: 'bolig',
    kilde: 'Slått sammen av spørsmål 1 og 2, slik merknaden i arbeidsdokumentet ber om.',
    tittel: 'Hvordan bor du i dag?',
    undertekst: 'To korte spørsmål om boligen. Svarene bestemmer hvilke tiltak som er mulige for deg, og hvem du må snakke med for å få dem gjort.',
    hvorfor: 'Eieform og boligtype avgjør hva du kan gjøre alene, og hva du må avklare med andre.',
    brukesTil: 'Bor du i et bygg med felles inngang, sender vi deg til styret for det som gjelder inngangen. Leier du, sier vi hva du kan be utleier om.',
    type: 'flerfelt',
    felt: [
      {
        /* Boligtypen flytter ikke nåla, like lite som eieformen gjør
           det. Den sier hva som er mulig å gjøre, ikke hvordan du har
           det. Det er fornøydspørsmålet under som teller. */
        navn: 'boligtype',
        ikkeKompass: true,
        ledetekst: 'Hvilken boligtype bor du i?',
        hjelp: 'Leilighetsbygg kan ha felles inngang eller flere innganger. Rekkehus kan ha felles inngang, flere felles innganger eller en egen inngang til hver bolig. Tomannsbolig kan ha felles inngang eller egen inngang til hver bolig.',
        valg: [
          { v: 'enebolig',   tittel: 'Enebolig',       desc: 'Du eier eller leier hele huset og tomta rundt.', n: 0.2, e: 0 },
          { v: 'leilighet',  tittel: 'Leilighetsbygg', desc: 'Blokk eller bygård. Inngang, trapp og heis er som regel fellesareal.', n: 0, e: 0.2 },
          { v: 'rekkehus',   tittel: 'Rekkehus',       desc: 'Flere boliger i rekke. Noen har egen inngang, andre deler inngang.', n: 0.1, e: 0.1 },
          { v: 'tomannsbolig', tittel: 'Tomannsbolig', desc: 'To boliger i samme hus. Inngangen kan være felles eller egen.', n: 0.1, e: 0.1 }
        ]
      },
      {
        /* Eieformen flytter ikke nåla. Å leie er ikke et dårligere svar
           enn å eie. Det er spørsmålet under, om du er fornøyd med
           ordningen, som sier noe om kursen. */
        navn: 'eieform',
        ikkeKompass: true,
        ledetekst: 'Eier eller leier du boligen?',
        hjelp: 'Eier du gjennom borettslag eller sameie, svarer du «Eier».',
        valg: [
          { v: 'eier',  tittel: 'Eier',  desc: 'Selveier, borettslag eller sameie. Du bestemmer selv over det som er inne i boligen.', n: 0, e: 0 },
          { v: 'leier', tittel: 'Leier', desc: 'Du leier av kommunen, en stiftelse eller en privat utleier. Da må utleier si ja til større endringer.', n: 0, e: 0 }
        ]
      },
      {
        navn: 'bolignoyd',
        ledetekst: 'Hvor fornøyd er du med denne boligsituasjonen?',
        hjelp: 'Mange er godt fornøyde med å leie. Det passer økonomien, det er lite å vedlikeholde, og noen andre tar seg av det som går i stykker. Andre eier og angrer aldri. Det finnes ikke noe riktig svar her.',
        valg: [
          { v: 'fornoyd',    tittel: 'Fornøyd',        desc: 'Boforholdet passer deg, og du ser ingen grunn til å endre det.', n: 1, e: 0 },
          { v: 'delvis',     tittel: 'Delvis fornøyd', desc: 'Det går greit, men det er sider ved boforholdet du gjerne skulle hatt annerledes.', n: 0, e: 1 },
          { v: 'misfornoyd', tittel: 'Ikke fornøyd',   desc: 'Du trives ikke med boforholdet, og har tenkt at noe burde vært annerledes.', n: -1, e: 0 }
        ]
      }
    ]
  },
  {
    id: 'hverdag',
    etappe: 'bolig',
    kilde: 'Nytt spørsmål. Designkritikken 21. september: «Mangler spørsmål om helse».',
    ny: true,
    tittel: 'Er det noe i hverdagen som er blitt tyngre det siste året?',
    undertekst: 'Kryss av for alt som passer. Vi spør ikke om diagnoser eller sykdom, men om hva som faktisk er blitt tungt, for det er det tiltakene skal løse.',
    hvorfor: 'To personer på samme alder kan ha helt ulike behov. Alder alene sier lite om hvilke tiltak som haster.',
    brukesTil: 'Svaret bestemmer rekkefølgen på tiltakene i oppsummeringen. Det lagres sammen med de andre svarene dine, og deles ikke med noen.',
    kanHoppes: true,
    type: 'flervalg',
    valg: [
      { v: 'ingen',   tittel: 'Nei, alt går som før', desc: 'Du gjør det du pleier, i det tempoet du pleier.', alene: true },
      { v: 'litt',    tittel: 'Litt. Noen ting tar lengre tid', desc: 'Trapper, bæring eller husarbeid merkes mer enn før, men går greit.' },
      { v: 'noe',     tittel: 'Ja. Noe er blitt vanskelig', desc: 'Det er ting du har sluttet med, eller ber om hjelp til.' }
    ],
    /* Flere kryss er lov. Da er det tyngste av dem som avgjør, for det
       er det som bestemmer hva boligen må tåle. */
    poeng: (verdier) => {
      const vekt = { ingen: { n: 1, e: 0 }, litt: { n: 0.4, e: 0.3 },
                     noe: { n: -0.8, e: 0 } };
      const valgte = (verdier || []).map(v => vekt[v]).filter(Boolean);
      if (!valgte.length) return { n: 0, e: 0 };
      return valgte.reduce((tyngst, p) => (p.n < tyngst.n ? p : tyngst));
    },
    maks: { n: 1, e: 0.3 }
  },

  /* ─── Etappe 2, nærmiljøet ──────────────────────────────────────── */
  {
    id: 'naermiljo-tilbud',
    etappe: 'naermiljo',
    kilde: 'Spørsmål 3, omskrevet. Spørsmål 4 og 5 er tatt inn her.',
    tittel: 'Hva finnes i nærmiljøet ditt?',
    undertekst: 'Kryss av for det du har innen rimelig avstand hjemmefra. Med rimelig avstand mener vi noe du kommer deg til på egen hånd, uten å måtte planlegge turen.',
    hvorfor: 'Nærmiljøet er det eneste i denne kartleggingen du ikke kan bygge om. Derfor teller det tungt når vi vurderer om boligen passer for deg videre.',
    brukesTil: 'Mangler mye rundt deg, sier vi det rett ut i oppsummeringen, og peker på hva som da er verdt å vurdere.',
    type: 'flervalg',
    valg: [
      { v: 'butikk',  tittel: 'Matbutikk',        desc: 'Der du handler til vanlig.' },
      { v: 'lege',    tittel: 'Lege eller apotek', desc: 'Fastlege, legevakt, tannlege eller apotek.' },
      { v: 'kafe',    tittel: 'Kafé eller spisested', desc: 'Et sted å sitte og møte folk.' },
      { v: 'kirke',   tittel: 'Kirke, forsamlingshus eller bibliotek', desc: 'Faste møteplasser med åpningstid.' },
      { v: 'kultur',  tittel: 'Kino, kultur eller idrett', desc: 'Kino, kulturhus, treningssted eller idrettslag.' },
      { v: 'tur',     tittel: 'Turområde eller park', desc: 'Sted du går tur, uavhengig av årstid.' },
      { v: 'ingen',   tittel: 'Ingen av delene', desc: 'Du må bruke bil eller få skyss til alt av dette.', alene: true }
    ],
    poeng: (verdier) => {
      if (!verdier || !verdier.length || verdier.includes('ingen')) return { n: -1, e: 0 };
      const a = verdier.length;
      if (a >= 5) return { n: 1, e: 0 };
      if (a >= 3) return { n: 0.6, e: 0 };
      return { n: -0.2, e: 0 };
    },
    maks: { n: 1, e: 1 }
  },
  {
    id: 'naermiljo-komme-seg',
    etappe: 'naermiljo',
    kilde: 'Spørsmål 6, omskrevet.',
    tittel: 'Kommer du deg lett på de aktivitetene og tjenestene du ønsker?',
    undertekst: 'Tenk på hele turen, ikke bare avstanden. Har du ikke bil, teller buss, tog, taxi eller skyss fra noen du kjenner.',
    hvorfor: 'Å handle selv, gå i selskap og delta på det du liker, betyr like mye for helsa som selve boligen. Det er lett å undervurdere hvor fort det blir tungt når én ting endrer seg.',
    brukesTil: 'Svarer du «Nei», peker vi på transporttjenester i kommunen din, og vi vekter nærmiljøet tyngre i kursen.',
    valg: [
      { v: 'ja',     tittel: 'Ja',     desc: 'Du kommer deg dit du vil, når du vil, uten å måtte be om hjelp.', n: 1, e: 0 },
      { v: 'delvis', tittel: 'Delvis', desc: 'Du kommer deg dit, men det krever planlegging, godt vær eller at noen kjører deg.', n: 0, e: 0 },
      { v: 'nei',    tittel: 'Nei',    desc: 'Du lar være å dra fordi det er for tungvint eller for langt.', n: -1, e: 0 }
    ]
  },
  {
    id: 'naermiljo-hjelp',
    etappe: 'naermiljo',
    kilde: 'Spørsmål 7, omskrevet.',
    tittel: 'Har du noen som kan hjelpe deg med praktiske ting?',
    undertekst: 'Det handler om det dagligdagse: skifte en lyspære, klippe plenen, måke snø, flytte noe tungt eller kjøre deg til butikken.',
    hvorfor: 'Mange tiltak blir enklere og billigere når noen kan hjelpe til. Har du ingen, må vi peke på tjenester i stedet.',
    brukesTil: 'Svarer du «Nei», legger vi inn frivilligsentralen og kommunens tjenester i oppsummeringen.',
    valg: [
      { v: 'ja',  tittel: 'Ja',  desc: 'Du har noen å ringe, og du synes det er greit å spørre.', n: 0.8, e: 0, oppfolging: {
          ledetekst: 'Hvem hjelper deg? Kryss av for alle som passer.',
          type: 'flervalg',
          valg: [
            { v: 'parorende', tittel: 'Familie',   desc: 'Ektefelle, samboer, barn, søsken eller annen familie.' },
            { v: 'nabo',      tittel: 'Nabo',      desc: 'Noen som bor i nærheten.' },
            { v: 'venner',    tittel: 'Venner',    desc: 'Folk du kjenner godt, men ikke er i familie med.' },
            { v: 'vaktmester',tittel: 'Vaktmester eller styret', desc: 'I borettslag, sameie eller hos utleier.' },
            { v: 'andre',     tittel: 'Andre',     desc: 'Frivillige, menighet, forening eller noen du betaler.' }
          ]
        } },
      { v: 'nei', tittel: 'Nei', desc: 'Du har ingen å spørre, eller du vil helst ikke spørre noen.', n: -0.7, e: 0 }
    ]
  },

  /* ─── Etappe 3, veien inn ───────────────────────────────────────── */
  {
    id: 'adkomst-frem',
    etappe: 'adkomst',
    kilde: 'Spørsmål 8, omskrevet.',
    tittel: 'Kommer du deg lett fram til boligen fra offentlig vei?',
    undertekst: 'Tenk på strekningen fra der bilen, bussen eller drosjen slipper deg av, og fram til inngangsdøra. Gjelder også på vinteren.',
    hvorfor: 'Denne strekningen glemmes ofte. Er den vanskelig, hjelper det lite at resten av boligen er god.',
    brukesTil: 'Svarer du «Delvis» eller «Nei», foreslår vi tiltak 1a i det nye tilskuddet: justere terrenget ved parkering, gangvei eller inngangsparti.',
    valg: [
      { v: 'ja',     tittel: 'Ja',     desc: 'Kort vei, jevnt underlag, og du går det uten å tenke over det.', n: 1, e: 0 },
      { v: 'delvis', tittel: 'Delvis', desc: 'Det går, men det er bratt, ujevnt, langt, eller vanskelig når det er snø og is.', n: -0.3, e: -0.4 },
      { v: 'nei',    tittel: 'Nei',    desc: 'Trapp, bratt bakke eller lang vei gjør at du vegrer deg eller trenger hjelp.', n: -0.9, e: -0.8 }
    ]
  },
  {
    id: 'adkomst-oppbevaring',
    etappe: 'adkomst',
    kilde: 'Spørsmål 9, omskrevet.',
    tittel: 'Har du plass under tak i inngangspartiet?',
    undertekst: 'Vi tenker på et takoverbygg eller en bod ved døra, der ting kan stå tørt. For eksempel rullator, sparkstøtting, barnevogn eller handlevogn.',
    hvorfor: 'Et hjelpemiddel som må stå ute i snø og regn, blir stående ubrukt. Da mister du nytten av det.',
    brukesTil: 'Svarer du «Delvis» eller «Nei», foreslår vi tiltak 1b og 1c: forbedre inngangspartiet og inngangsdøra.',
    valg: [
      { v: 'ja',     tittel: 'Ja',     desc: 'Det er tak og plass nok til at noe kan stå der hele året.', n: 0.5, e: 0 },
      { v: 'delvis', tittel: 'Delvis', desc: 'Det er litt tak, eller litt plass, men ikke begge deler.', n: 0, e: 0.5 },
      { v: 'nei',    tittel: 'Nei',    desc: 'Døra går rett ut, uten tak og uten plass ved siden av.', n: -0.2, e: 0.9 }
    ]
  },
  {
    id: 'adkomst-trinn',
    etappe: 'adkomst',
    kilde: 'Spørsmål 10. Står som i prototypen. Arbeidsdokumentet har status «Avklar» og ingen omskriving.',
    tittel: 'Hvor mange trinn er det fra bakken og inn til inngangsdøra?',
    undertekst: 'Tell trinnene du må opp fra bakkenivå og inn døra. Bor du i blokk med heis fra bakkeplan, teller du trinnene fram til heisen.',
    hvorfor: 'Antall trinn er det enkeltsvaret som sier mest om hva som skal til for å få trinnfri adkomst.',
    brukesTil: 'Vi bruker tallet til å si om en terskelplate holder, om en rampe er mulig, eller om det må løfteplattform til. Fra fire trinn og opp lønner det seg å be Hjelpemiddelsentralen om råd.',
    valg: [
      { v: '0',      tittel: '0 trinn',        desc: 'Du går rett inn, uten å løfte foten opp på noe. Dette er det beste utgangspunktet.', n: 1, e: 0 },
      { v: '1',      tittel: '1 trinn',        desc: 'Ett trinn eller en høy terskel. Løses ofte med en terskelplate eller et skråbrett.', n: 0.4, e: 0.9 },
      { v: '2-3',    tittel: '2–3 trinn',      desc: 'En rampe med slak stigning kan være mulig hvis det er flatt nok utenfor.', n: 0, e: 0.3 },
      { v: '4-6',    tittel: '4–6 trinn',      desc: 'En rampe blir lang. Løfteplattform eller omlegging av terrenget kan være aktuelt.', n: -0.7, e: -0.7 },
      { v: '6+',     tittel: 'Mer enn 6 trinn', desc: 'Rampe er sjelden mulig. Da ser vi på løfteplattform, heis eller en annen vei inn.', n: -1, e: -0.5 },
      { v: 'usikker', tittel: 'Usikker',       desc: 'Du vet ikke, eller det varierer med hvilken dør du bruker. Vi merker dette for videre kartlegging.', n: 0, e: 0 }
    ]
  },
  {
    id: 'adkomst-hindringer',
    etappe: 'adkomst',
    kilde: 'Spørsmål 11, omskrevet. Tre alvorlighetsgrader i stedet for «Ja / Delvis / Nei».',
    tittel: 'Hvor vanskelig er det å komme seg inn i boligen?',
    undertekst: 'Nå gjelder det selve inngangen: trappa, terrenget rett utenfor, døra, og heisen hvis du bor i blokk.',
    hvorfor: 'Det er forskjell på tungvint og umulig. De tre nivåene avgjør om vi anbefaler et lite grep, et byggearbeid, eller at du ser på en annen bolig.',
    brukesTil: 'Svarer du «Veldig vanskelig», er dette det første tiltaket i oppsummeringen din, uansett hva du har svart ellers.',
    valg: [
      { v: 'lett',    tittel: 'Lett',            desc: 'Du går inn og ut uten å tenke over det, også med bæreposer i hendene.', n: 1, e: 0 },
      { v: 'vanskelig', tittel: 'Vanskelig',     desc: 'Du må ta i, holde deg fast, hvile, eller ta det forsiktig. Det går, men det merkes.', n: -0.5, e: -0.5 },
      { v: 'sveert',  tittel: 'Veldig vanskelig', desc: 'Du trenger hjelp, eller du lar være å gå ut fordi det er for tungt. Blokk uten heis hører hjemme her.', n: -1, e: -0.4 }
    ]
  },

  /* ─── Etappe 4, inne i boligen ──────────────────────────────────── */
  {
    id: 'inne-rom',
    etappe: 'inne',
    kilde: 'Spørsmål 12, omskrevet. Spørsmål 13 og 14 er tatt inn her.',
    tittel: 'Har du alle de nødvendige rommene på inngangsplanet?',
    undertekst: 'Med nødvendige rom mener vi stue, kjøkken, soverom og bad. Altså alt du trenger for å klare deg gjennom et døgn uten å gå i trapp.',
    hvorfor: 'Dette er det som avgjør om du kan bo i boligen også en periode der trappa er utelukket, for eksempel etter en operasjon.',
    brukesTil: 'Mangler du rom, foreslår vi tiltak 2a, endre planløsningen, eller 2b, utvide boligen. Er alt på plass, foreslår vi 5c, håndlister i trappa, som et lite grep.',
    valg: [
      { v: 'ja',     tittel: 'Ja, alt er på inngangsplanet', desc: 'Stue, kjøkken, soverom og bad ligger på samme plan som inngangen.', n: 1, e: 0 },
      { v: 'delvis', tittel: 'Delvis. Noe mangler',          desc: 'For eksempel bad eller soverom i et annet plan. Du må i trapp i løpet av døgnet.', n: -0.5, e: -0.8 },
      { v: 'nei',    tittel: 'Nei',                          desc: 'Flere av rommene ligger i et annet plan enn inngangen.', n: -0.9, e: -1 }
    ]
  },
  {
    id: 'inne-bevegelse',
    etappe: 'inne',
    kilde: 'Spørsmål 15, omskrevet. Spørsmål 16 og 17 er tatt inn her.',
    tittel: 'Kommer du deg lett rundt inne i boligen?',
    undertekst: 'Tenk på terskler, nivåforskjeller, smale dører og trange ganger. Et enkelt prøve: trill en koffert gjennom alle rommene og se hvor den setter seg fast.',
    hvorfor: 'Terskler og smale dører merkes lite i dag, men avgjør alt den dagen du må bruke rullator eller krykker.',
    brukesTil: 'Svarer du «Delvis» eller «Nei», foreslår vi tiltak 3a, fjerne terskler, og 3b, større døråpning eller flytte dør.',
    valg: [
      { v: 'ja',     tittel: 'Ja',     desc: 'Ingen terskler eller trange steder stopper deg, heller ikke med noe i hendene.', n: 0.9, e: 0 },
      { v: 'delvis', tittel: 'Delvis', desc: 'Noen terskler eller trange steder, som du kommer forbi når du passer på.', n: -0.2, e: 0.7 },
      { v: 'nei',    tittel: 'Nei',    desc: 'Terskler, smale dører eller trange ganger gjør at du må ta omveier eller be om hjelp.', n: -0.6, e: -0.3 }
    ]
  },
  {
    id: 'bad-samme-rom',
    etappe: 'inne',
    kilde: 'Spørsmål 18. Står som i prototypen. Arbeidsdokumentet gjør denne ferdig på dag 2.',
    tittel: 'Er bad og toalett i samme rom?',
    undertekst: 'Noen boliger har toalettet for seg selv, og dusj eller badekar i et annet rom.',
    hvorfor: 'Ligger toalett og bad vegg i vegg i hvert sitt rom, kan de slås sammen til ett bad med god plass. Det er ofte det rimeligste store grepet.',
    brukesTil: 'Svarer du «Nei», ser vi på tiltak 4c: bygge om eller utvide badet.',
    valg: [
      { v: 'ja',  tittel: 'Ja, alt er på samme bad', desc: 'Toalett, vask og dusj eller badekar i ett rom.', n: 0.5, e: 0 },
      { v: 'nei', tittel: 'Nei, det er delt',        desc: 'Toalettet ligger for seg selv, i et eget rom.', n: -0.2, e: -0.6 }
    ]
  },
  {
    id: 'bad-plass',
    etappe: 'inne',
    kilde: 'Spørsmål 19. Står som i prototypen.',
    tittel: 'Er det god plass foran toalett og vask?',
    undertekst: 'Regn omtrent 1,5 meter fritt gulv foran, som er det som trengs for å snu med rullator eller rullestol, eller for at noen skal kunne hjelpe deg.',
    hvorfor: 'Trangt bad er den vanligste grunnen til at folk må flytte fra en bolig de ellers trives i.',
    brukesTil: 'Svarer du «Nei», foreslår vi tiltak 4c: bygge om eller utvide badet for plass til det nødvendige.',
    valg: [
      { v: 'ja',  tittel: 'Ja',  desc: 'Du kan snu rundt foran toalettet uten å måtte gå ut av rommet.', n: 0.9, e: 0 },
      { v: 'nei', tittel: 'Nei', desc: 'Det er trangt. To personer får ikke plass samtidig.', n: -0.7, e: -1 }
    ]
  },
  {
    id: 'bad-dusj',
    etappe: 'inne',
    kilde: 'Spørsmål 20. Står som i prototypen.',
    tittel: 'Kommer du lett inn i dusjen, uten kant eller terskel?',
    undertekst: 'En dusj i nisje uten kant er det beste. Dusjkabinett med kant, og særlig badekar, er det vanskeligste.',
    hvorfor: 'Å gå over en kant på vått gulv er en av de vanligste måtene å falle på hjemme.',
    brukesTil: 'Svarer du «Nei» eller «Usikker», foreslår vi tiltak 4b: en trygg og trinnfri dusjsone.',
    valg: [
      { v: 'ja',      tittel: 'Ja',      desc: 'Du går rett inn på flatt gulv.', n: 0.8, e: 0 },
      { v: 'usikker', tittel: 'Usikker', desc: 'Du er ikke sikker på hvor høy kanten er. Vi tar det med som noe å måle.', n: 0, e: 0 },
      { v: 'nei',     tittel: 'Nei',     desc: 'Du må over en kant, opp i et dusjkabinett eller over kanten på et badekar.', n: -0.3, e: -0.7 }
    ]
  },
  {
    id: 'bad-stol',
    etappe: 'inne',
    kilde: 'Spørsmål 21. Står som i prototypen.',
    tittel: 'Er det plass til en stol eller krakk inne i dusjen?',
    undertekst: 'Tenk på om en vanlig dusjkrakk får stå der, og om du får plass til å sitte på den.',
    hvorfor: 'Å kunne sitte mens du dusjer er ofte det som avgjør om du greier å stelle deg selv.',
    brukesTil: 'Svarer du «Nei», ser vi på tiltak 4a, ny plassering av baderomsfunksjonene, og 4c, utvide badet.',
    valg: [
      { v: 'ja',      tittel: 'Ja',      desc: 'En krakk får stå der uten å være i veien.', n: 0.7, e: 0 },
      { v: 'usikker', tittel: 'Usikker', desc: 'Du har ikke prøvd. Vi tar det med som noe å måle.', n: 0, e: 0 },
      { v: 'nei',     tittel: 'Nei',     desc: 'Det er for trangt. En krakk sperrer dusjen.', n: -0.4, e: -0.8 }
    ]
  },
  {
    id: 'bad-dor',
    etappe: 'inne',
    kilde: 'Spørsmål 22. Står som i prototypen.',
    tittel: 'Er badet lite, med en dør som slår innover?',
    undertekst: 'Se på døra. Slår den inn i baderommet, eller ut i gangen?',
    hvorfor: 'Faller noen på et lite bad, kan kroppen sperre en dør som slår innover. Da kommer ingen inn for å hjelpe.',
    brukesTil: 'Svarer du «Ja», foreslår vi tiltak 3b, snu eller flytte døra. Det er et lite og rimelig grep med stor virkning.',
    valg: [
      { v: 'ja',      tittel: 'Ja',      desc: 'Lite bad, og døra slår innover.', n: -0.2, e: 0.9 },
      { v: 'usikker', tittel: 'Usikker', desc: 'Du må se etter. Vi tar det med som noe å sjekke.', n: 0, e: 0 },
      { v: 'nei',     tittel: 'Nei',     desc: 'Døra slår utover, eller badet er stort nok til at det ikke er noe problem.', n: 0.6, e: 0 }
    ]
  },

  /* ─── Etappe 5, økonomi ─────────────────────────────────────────── */
  {
    id: 'ok-eier',
    etappe: 'okonomi',
    kilde: 'Spørsmål 23. Står som i prototypen.',
    tittel: 'Eier du bolig eller fritidsbolig?',
    undertekst: 'Vi spør fordi eiendom kan brukes som sikkerhet for lån, og fordi det avgjør hvilke ordninger du kan søke på.',
    hvorfor: 'Eier du noe, har du flere muligheter i banken. Eier du ingenting, er startlån og kommunale tilskudd desto viktigere.',
    brukesTil: 'Bare til å velge hvilke støtteordninger vi viser deg til slutt. Ingenting kontrolleres mot noe register.',
    valg: [
      { v: 'ja',  tittel: 'Ja',  desc: 'Du eier bolig, hytte eller annen eiendom.' },
      { v: 'nei', tittel: 'Nei', desc: 'Du eier ingen eiendom i dag.' }
    ],
    ikkeKompass: true
  },
  {
    id: 'ok-laan',
    etappe: 'okonomi',
    kilde: 'Spørsmål 24. Står som i prototypen.',
    tittel: 'Har du lån på bolig eller andre eiendeler?',
    undertekst: 'Vi trenger ikke beløp. Bare om du har lån eller ikke.',
    hvorfor: 'Har du lån fra før, kan det være enklere å utvide det du har enn å ta opp noe nytt. Banken din vet mer om det enn vi gjør.',
    brukesTil: 'Bare til å velge hvilke støtteordninger vi viser deg til slutt.',
    valg: [
      { v: 'ja',  tittel: 'Ja',  desc: 'Du betaler på ett eller flere lån i dag.' },
      { v: 'nei', tittel: 'Nei', desc: 'Du har ingen lån.' }
    ],
    ikkeKompass: true
  },
  {
    id: 'ok-sparing',
    etappe: 'okonomi',
    kilde: 'Spørsmål 25. Står som i prototypen.',
    tittel: 'Har du sparepenger du kan bruke på boligen?',
    undertekst: 'Bankinnskudd, aksjer, fond eller annet du har lett tilgang til. Velg det som ligger nærmest.',
    hvorfor: 'Tilskudd dekker sjelden hele regningen. Det nye tilskuddet dekker 25 prosent av det du oppgraderer for. Resten må du dekke selv, eller låne.',
    brukesTil: 'Til å si hvilke tiltak du kan ta med én gang, og hvilke som trenger finansiering først.',
    valg: [
      { v: '20',      tittel: 'Rundt 20 000 kroner',      desc: 'Rekker til håndlister, lys, terskelplater og små grep.' },
      { v: '20-50',   tittel: '20 000 – 50 000 kroner',   desc: 'Rekker til flere små tiltak, eller egenandelen på et større.' },
      { v: '50-100',  tittel: '50 000 – 100 000 kroner',  desc: 'Rekker til et mindre byggearbeid, for eksempel døråpninger og inngangsparti.' },
      { v: '100+',    tittel: 'Over 100 000 kroner',      desc: 'Rekker som egenkapital i en baderomsombygging.' },
      { v: 'usikker', tittel: 'Usikker',                  desc: 'Du vet ikke, eller du vil ikke oppgi det. Helt greit. Vi viser alle ordningene i stedet.' }
    ],
    ikkeKompass: true
  },
  {
    id: 'ok-maaned',
    etappe: 'okonomi',
    kilde: 'Spørsmål 26. Står som i prototypen.',
    tittel: 'Hvor mye kan du betale i måneden på et nytt lån?',
    undertekst: 'Et grovt anslag holder. Tenk på hva du har til overs når alt fast er betalt.',
    hvorfor: 'Et lån til boligtilpasning betales tilbake over mange år. Da er den månedlige summen viktigere enn totalbeløpet.',
    brukesTil: 'Til å si om startlån fra kommunen eller lån fra Husbanken er verdt å se på for deg.',
    valg: [
      { v: '1000',    tittel: 'Rundt 1 000 kroner',   desc: 'Nok til et mindre lån over lang tid.' },
      { v: '2000',    tittel: 'Rundt 2 000 kroner',   desc: '' },
      { v: '3000',    tittel: 'Rundt 3 000 kroner',   desc: '' },
      { v: '3000+',   tittel: 'Mer enn 3 000 kroner', desc: 'Nok til å finansiere et større byggearbeid.' },
      { v: 'usikker', tittel: 'Usikker',              desc: 'Du vet ikke, eller du vil ikke oppgi det. Banken din kan regne på det sammen med deg.' }
    ],
    ikkeKompass: true
  }
];

/* ═══ Støtteordningene ═════════════════════════════════════════════ */

const KOMPASS_ORDNINGER = {
  aldersvennlig: {
    navn: 'Tilskudd til aldersvennlig oppgradering',
    kort: 'Nytt i 2026. Dekker 25 prosent av det du oppgraderer for, opptil 75 000 kroner. Tilskudd er penger du får, ikke et lån.',
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
    naar: S => S['adkomst-hindringer'] === 'sveert',
    tittel: 'Få gjort noe med inngangen først',
    tekst: 'Alt annet kan vente. Kommer du ikke inn og ut på egen hånd, blir du sittende inne, og da hjelper ikke et nytt bad. Be kommunen eller Hjelpemiddelsentralen komme hjem til deg og se på inngangen. Det er gratis, og de kommer med en løsning du kan regne på.',
    hvorfor: S => 'Du svarte at det er veldig vanskelig å komme seg inn i boligen.',
    tiltak: ['1a', '1b', '1c'],
    ordninger: ['hjelpemiddel', 'aldersvennlig', 'navrampe', 'komtilskudd']
  },
  {
    id: 'trinn-mange',
    prioritet: 2, storrelse: 'stor', etappe: 'adkomst',
    naar: S => S['adkomst-trinn'] === '4-6' || S['adkomst-trinn'] === '6+',
    tittel: 'Trinnfri vei inn, uten trapp',
    tekst: 'Med så mange trinn blir en rampe lang, og ofte for bratt til å være trygg. Da ser man heller på løfteplattform, på å legge om terrenget, eller på en annen inngang til boligen. Dette må regnes på av fagfolk før du bestemmer deg.',
    hvorfor: S => 'Du svarte at det er ' + (S['adkomst-trinn'] === '6+' ? 'mer enn 6 trinn' : '4–6 trinn') + ' fra bakken og inn til inngangsdøra.',
    tiltak: ['1a', '1b', '1c'],
    ordninger: ['hjelpemiddel', 'aldersvennlig', 'navrampe', 'startlaan']
  },
  {
    id: 'trinn-faa',
    prioritet: 6, storrelse: 'liten', etappe: 'adkomst',
    naar: S => S['adkomst-trinn'] === '1' || S['adkomst-trinn'] === '2-3',
    tittel: 'Fjern trinnet ved døra',
    tekst: S => S['adkomst-trinn'] === '1'
      ? 'Ett trinn løses ofte med en terskelplate eller et skråbrett. Det er rimelig, det krever ingen søknad, og du merker det med én gang du kommer hjem med handleposer.'
      : 'Med to eller tre trinn kan en rampe med slak stigning være mulig, hvis det er flatt nok utenfor. Regn med at rampa blir omtrent en meter lang per ti centimeter høyde.',
    hvorfor: S => 'Du svarte at det er ' + (S['adkomst-trinn'] === '1' ? 'ett trinn' : '2–3 trinn') + ' inn til inngangsdøra.',
    tiltak: ['1a', '1c'],
    ordninger: ['aldersvennlig', 'navrampe']
  },
  {
    id: 'vei-frem',
    prioritet: 3, storrelse: 'stor', etappe: 'adkomst',
    naar: S => S['adkomst-frem'] === 'nei' || S['adkomst-frem'] === 'delvis',
    tittel: 'Gjør veien fram til døra jevn og trygg',
    tekst: 'Strekningen fra parkeringen eller veien og fram til døra blir ofte glemt. Den kan jevnes ut, få fast dekke, bedre lys og et rekkverk å holde i. Om vinteren er det denne strekningen som avgjør om du kommer deg ut i det hele tatt.',
    hvorfor: S => S['adkomst-frem'] === 'nei'
      ? 'Du svarte nei på om du kommer deg lett fram til boligen fra offentlig vei.'
      : 'Du svarte at du delvis kommer deg fram til boligen fra offentlig vei.',
    tiltak: ['1a'],
    ordninger: ['aldersvennlig', 'komtilskudd']
  },
  {
    id: 'inngangsparti',
    prioritet: 7, storrelse: 'liten', etappe: 'adkomst',
    naar: S => S['adkomst-oppbevaring'] === 'nei' || S['adkomst-oppbevaring'] === 'delvis',
    tittel: 'Lag plass under tak ved inngangen',
    tekst: 'Et takoverbygg og en halv kvadratmeter ved siden av døra er nok. Da kan rullator, handlevogn eller sparkstøtting stå tørt, og du slipper å dra dem inn og ut. Et hjelpemiddel som står ute i snøen, blir liggende ubrukt.',
    hvorfor: S => S['adkomst-oppbevaring'] === 'nei'
      ? 'Du svarte at du ikke har plass under tak i inngangspartiet.'
      : 'Du svarte at du delvis har plass under tak i inngangspartiet.',
    tiltak: ['1b', '1c'],
    ordninger: ['aldersvennlig']
  },

  /* ── 2. Badet ──────────────────────────────────────────────────── */
  {
    id: 'bad-ombygging',
    prioritet: 4, storrelse: 'stor', etappe: 'inne',
    naar: S => S['bad-plass'] === 'nei' || S['bad-stol'] === 'nei',
    tittel: 'Bygg om badet mens du kan velge selv',
    tekst: 'Trangt bad er den vanligste enkeltgrunnen til at folk må flytte fra en bolig de ellers trives i. Et bad som bygges om nå, kan planlegges i ro, og du får den løsningen du vil ha. Ligger toalettet i et eget rom vegg i vegg, er det ofte det rimeligste grepet å slå dem sammen.',
    hvorfor: S => {
      const g = [];
      if (S['bad-plass'] === 'nei') g.push('det ikke er god plass foran toalett og vask');
      if (S['bad-stol'] === 'nei') g.push('det ikke er plass til en krakk i dusjen');
      if (S['bad-samme-rom'] === 'nei') g.push('toalettet ligger i et eget rom');
      return 'Du svarte at ' + g.join(', og at ') + '.';
    },
    tiltak: ['4a', '4c'],
    ordninger: ['aldersvennlig', 'komtilskudd', 'startlaan', 'husbanklaan']
  },
  {
    id: 'dusjsone',
    prioritet: 5, storrelse: 'stor', etappe: 'inne',
    naar: S => S['bad-dusj'] === 'nei' || S['bad-dusj'] === 'usikker',
    tittel: 'Lag en dusjsone uten kant',
    tekst: 'En dusj i nisje uten kant, med sluk i gulvet og et håndtak å holde i, fjerner ett av de stedene folk faller oftest. Skal badet uansett pusses opp en gang, er dette grepet å ta da.',
    hvorfor: S => S['bad-dusj'] === 'nei'
      ? 'Du svarte at du må over en kant for å komme inn i dusjen.'
      : 'Du svarte at du er usikker på om det er kant inn til dusjen. Mål høyden, så vet du det.',
    tiltak: ['4b'],
    ordninger: ['aldersvennlig', 'komtilskudd']
  },
  {
    id: 'bad-dor',
    prioritet: 8, storrelse: 'liten', etappe: 'inne',
    naar: S => S['bad-dor'] === 'ja',
    tittel: 'Snu baderomsdøra så den slår utover',
    tekst: 'Faller noen på et lite bad, kan kroppen sperre en dør som slår innover. Da kommer ingen inn for å hjelpe. Å snu døra, eller bytte til en skyvedør, er et lite arbeid med stor virkning, og det kan gjøres uten å røre resten av badet.',
    hvorfor: S => 'Du svarte at badet er lite og at døra slår innover.',
    tiltak: ['3b'],
    ordninger: ['aldersvennlig']
  },

  /* ── 3. Rommene og bevegelsen inne ─────────────────────────────── */
  {
    id: 'rom-plan',
    prioritet: 4, storrelse: 'stor', etappe: 'inne',
    naar: S => S['inne-rom'] === 'nei' || S['inne-rom'] === 'delvis',
    tittel: 'Samle det nødvendige på inngangsplanet',
    tekst: 'Klarer du deg gjennom et døgn uten å gå i trapp, kan du bli boende også i en periode der trappa er utelukket, for eksempel etter en operasjon. Noen ganger holder det å bytte om på rommene du har. Andre ganger må det bygges på. Er det plass på tomta, er påbygg ofte enklere enn folk tror.',
    hvorfor: S => S['inne-rom'] === 'nei'
      ? 'Du svarte at flere av de nødvendige rommene ligger i et annet plan enn inngangen.'
      : 'Du svarte at noen av de nødvendige rommene mangler på inngangsplanet.',
    tiltak: ['2a', '2b'],
    ordninger: ['aldersvennlig', 'startlaan', 'husbanklaan', 'komtilskudd']
  },
  {
    id: 'terskler',
    prioritet: 6, storrelse: 'liten', etappe: 'inne',
    naar: S => S['inne-bevegelse'] === 'delvis' || S['inne-bevegelse'] === 'nei',
    tittel: 'Fjern terskler og utvid de trangeste dørene',
    tekst: 'Terskler kan ofte tas bort eller skråes ned på en dag. Døråpninger bør være minst 86 centimeter fri bredde for at en rullator skal komme gjennom uten å skrape. Begynn med de dørene du bruker mest: bad, soverom og ut.',
    hvorfor: S => S['inne-bevegelse'] === 'nei'
      ? 'Du svarte at terskler eller trange steder gjør at du må ta omveier inne.'
      : 'Du svarte at det er noen terskler eller trange steder inne.',
    tiltak: ['3a', '3b'],
    ordninger: ['aldersvennlig', 'komtilskudd']
  },
  {
    id: 'trapp',
    prioritet: 7, storrelse: 'liten', etappe: 'inne',
    naar: S => S['inne-rom'] === 'delvis' || S['inne-rom'] === 'nei'
               || (S['hverdag'] || []).includes('noe') || (S['hverdag'] || []).includes('litt'),
    tittel: 'Håndlist på begge sider i trappa',
    tekst: 'Håndlist på begge sider, hele veien opp og ned, og et par centimeter forbi øverste og nederste trinn. Merk forkanten på trinnene med en stripe i en farge som skiller seg ut. Det koster lite, og det er blant de mest effektive fallforebyggende tiltakene som finnes.',
    hvorfor: S => (S['inne-rom'] === 'delvis' || S['inne-rom'] === 'nei')
      ? 'Du svarte at du må bruke trappa i løpet av døgnet.'
      : 'Du svarte at noe i hverdagen er blitt tyngre.',
    tiltak: ['5c', '5d'],
    ordninger: ['aldersvennlig']
  },

  /* ── 4. Nærmiljø og folk rundt deg ─────────────────────────────── */
  {
    id: 'naermiljo-tynt',
    prioritet: 3, storrelse: 'stor', etappe: 'naermiljo',
    naar: S => {
      const t = S['naermiljo-tilbud'];
      const tynt = !t || !t.length || t.includes('ingen') || t.length <= 1;
      return tynt || S['naermiljo-komme-seg'] === 'nei';
    },
    tittel: 'Nærmiljøet er det eneste du ikke kan bygge om',
    tekst: 'Du kan gjøre boligen din så god du vil, men du kan ikke flytte butikken nærmere. Når det er langt til alt, og transporten er tungvint, blir hverdagen liten selv i en velfungerende bolig. Snakk med kommunen om transporttjeneste, og la dette veie tungt hvis du en dag vurderer å flytte.',
    hvorfor: S => S['naermiljo-komme-seg'] === 'nei'
      ? 'Du svarte at du ikke kommer deg lett på de aktivitetene og tjenestene du ønsker.'
      : 'Du krysset av for lite eller ingenting i nærmiljøet ditt.',
    tiltak: [],
    ordninger: ['ergoterapeut', 'bostotte']
  },
  {
    id: 'ingen-hjelp',
    prioritet: 8, storrelse: 'liten', etappe: 'naermiljo',
    naar: S => S['naermiljo-hjelp'] === 'nei',
    tittel: 'Skaff deg noen å ringe før du trenger det',
    tekst: 'Frivilligsentralen i kommunen din formidler hjelp til snømåking, plenklipping, småreparasjoner og skyss. Mange kommuner har også besøksvenn. Det koster ingenting, og det er lettere å ta kontakt før noe har skjedd enn etterpå.',
    hvorfor: S => 'Du svarte at du ikke har noen å spørre om praktiske ting.',
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
    naar: S => (S.boligtype === 'leilighet' || S.boligtype === 'rekkehus' || S.boligtype === 'tomannsbolig')
              && (S['adkomst-hindringer'] === 'vanskelig' || S['adkomst-hindringer'] === 'sveert'
                  || S['adkomst-frem'] === 'nei' || S['adkomst-frem'] === 'delvis'),
    tittel: 'Ta inngangen opp med styret',
    tekst: 'Inngang, trapp, heis og uteområde er som regel fellesareal. Det betyr at du ikke kan endre det alene, men også at du ikke skal betale for det alene. Be styret ta det opp på neste generalforsamling eller sameiermøte. Borettslag og sameier kan søke egne ordninger for tilgjengelighet.',
    hvorfor: S => 'Du svarte at du bor i ' + ({ leilighet: 'et leilighetsbygg', rekkehus: 'rekkehus', tomannsbolig: 'tomannsbolig' }[S.boligtype]) + ', og at veien inn er vanskelig.',
    tiltak: ['1b'],
    ordninger: ['husbanklaan', 'komtilskudd']
  }
];

/* ═══ Tiltakskatalogen i det nye tilskuddet ════════════════════════
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
