/* ──────────────────────────────────────────────────────────────────
   Boligkompasset, papirutgaven

   Tegner alle spørsmålene fra hb-kompass-data.js som et skjema til å
   skrive ut og fylle ut med penn, for eksempel hos en ergoterapeut.

   Grepene for papir:
     · Hvert spørsmål holdes samlet på én side, med svarene under.
     · Svarrutene er tomme ruter og ringer, ikke skjemafelt.
     · Det som på skjermen bare vises etter et annet svar, står med
       «Svar bare hvis …», så man vet når det skal hoppes over.
     · Nummereringen er den samme som i masterfila: 1a, 1b, 2a, 5b …
   ────────────────────────────────────────────────────────────────── */

const paEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const paAvsnitt = tekst => String(tekst || '')
  .split(/\n\s*\n/).filter(Boolean)
  .map(a => `<p class="pa-hjelp">${paEsc(a.trim())}</p>`).join('');

/* Når et alternativ eller en oppfølging bare gjelder etter et bestemt
   svar, står betingelsen i klartekst. Tekstene er skrevet ut her, for
   betingelsene i innholdsfila er kode. */
const PA_BETINGELSER = {
  'bad-bruk:dor-innover': 'bare hvis du har krysset av for «Jeg har et lite bad»',
  'bad-bruk:dusj-kant': 'bare hvis du har dusj',
  'bad-bruk:dusj-stol': 'bare hvis du har dusj',
  'bad-bruk:badekar': 'bare hvis du har badekar',
  'toalett-plassering': 'Svar bare hvis du ikke krysset av for «Toalett» i 5a.'
};

function paValg(valg, flervalg, nokkel) {
  return `
  <ul class="pa-valg pa-valg--${flervalg ? 'flere' : 'ett'}">
    ${valg.map(v => {
      const betingelse = PA_BETINGELSER[`${nokkel}:${v.v}`];
      return `
    <li>
      <span class="pa-rute" aria-hidden="true"></span>
      <span>${paEsc(v.tittel)}${betingelse ? ` <span class="pa-betingelse">(${betingelse})</span>` : ''}</span>
    </li>`;
    }).join('')}
  </ul>`;
}

const paInstruks = flervalg => flervalg
  ? 'Sett kryss ved alt som passer.'
  : 'Sett ett kryss.';

function paDelsporsmal(nr, ledetekst, hjelp, valg, flervalg, nokkel, betingelse) {
  return `
  <section class="pa-sporsmal">
    <h3 class="pa-tittel"><span class="pa-nr">${nr}</span> ${paEsc(ledetekst)}</h3>
    ${betingelse ? `<p class="pa-betingelse pa-betingelse--blokk">${betingelse}</p>` : ''}
    ${paAvsnitt(hjelp)}
    <p class="pa-instruks">${paInstruks(flervalg)}</p>
    ${paValg(valg, flervalg, nokkel)}
  </section>`;
}

function paSporsmal(sp, nr) {
  if (sp.type === 'flerfelt') {
    return `
  <div class="pa-gruppe">
    ${sp.hjelp ? `<p class="pa-gruppe-ingress">${paEsc(sp.hjelp)}</p>` : ''}
    ${sp.felt.map((f, i) => paDelsporsmal(`${nr}${'abc'[i]}`, f.ledetekst, f.hjelp, f.valg, false, f.navn)).join('')}
  </div>`;
  }
  const flervalg = sp.type === 'flervalg';
  let html = paDelsporsmal(`${nr}a`, sp.tittel, sp.hjelp, sp.valg, flervalg, sp.id);
  if (sp.betinget) {
    const b = sp.betinget;
    html += paDelsporsmal(`${nr}b`, b.ledetekst, b.hjelp, b.valg, false, b.navn, PA_BETINGELSER[b.navn]);
  }
  return html;
}

function paTegn() {
  let nr = 0;
  const steg = KOMPASS_ETAPPER.map((e, i) => `
  <section class="pa-steg">
    <h2 class="pa-steg-tittel"><span class="pa-steg-nr">Steg ${i + 1} av ${KOMPASS_ETAPPER.length}</span> ${paEsc(e.navn)}</h2>
    <div class="pa-steg-ingress">${paAvsnitt(e.ingress)}</div>
    ${KOMPASS_SPORSMAL.filter(s => s.etappe === e.id).map(sp => paSporsmal(sp, ++nr)).join('')}
  </section>`).join('');

  document.getElementById('papir').innerHTML = `
  <header class="pa-topp">
    <img class="pa-logo" src="ds/logo/husbanken-primary.png" alt="Husbanken">
    <h1 class="pa-h1">Boligkompasset</h1>
    <p class="pa-ingress">
      ${KOMPASS_SPORSMAL.length} spørsmål om boligen du bor i nå, og om hvordan den vil
      fungere om du får redusert mobilitet. Svarene gir et godt grunnlag for en
      samtale om hva som bør gjøres, med en ergoterapeut, kommunen eller familien.
    </p>
  </header>

  <section class="pa-slik">
    <h2 class="pa-slik-tittel">Slik fyller du ut skjemaet</h2>
    <ul>
      <li>Sett kryss i ruta ved svaret som passer best. Der det står «Sett kryss ved alt som passer», kan du krysse av for flere.</li>
      <li>Noen spørsmål og svar gjelder bare hvis du har svart noe bestemt før. Det står i parentes.</li>
      <li>Hopp over det du er usikker på. Du kan svare senere.</li>
      <li>Vil du ha kompasset og tiltakene regnet ut, kan svarene legges inn i Boligkompasset på nett.</li>
    </ul>
    <div class="pa-felter">
      <p><span>Navn</span><span class="pa-linje"></span></p>
      <p><span>Dato</span><span class="pa-linje"></span></p>
      <p><span>Fylt ut sammen med</span><span class="pa-linje"></span></p>
    </div>
  </section>

  ${steg}

  <section class="pa-notat">
    <h2 class="pa-slik-tittel">Notater</h2>
    <p class="pa-hjelp">Her kan du skrive ned det du vil ta opp, eller det du lurer på.</p>
    <div class="pa-notatlinjer">${'<span></span>'.repeat(10)}</div>
  </section>

  <footer class="pa-bunn">
    Husbanken · Boligkompasset, papirutgave · Telefon 22 96 16 00 · husbanken.no
  </footer>`;
}

paTegn();
