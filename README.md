# Boligkompasset

Klikkbar prototype for Husbanken: svar på 12 spørsmål om boligen din, og få
vite hvor godt den passer deg i dag, hva som skal til for at den fortsatt
passer om ti år, og hvem som kan være med og betale.

Publisert på https://pettersommerseth1994.github.io/boligkompasset/

Skilt ut fra [husbanken](https://github.com/Pettersommerseth1994/husbanken).
Lenker til de andre prototypesidene (forside, tilskudd, logg inn,
designbeslutninger) peker dit.

## Filer

- `boligkompasset.html` – kompasset på skjerm
- `boligkompasset-papir.html` – papirutgaven
- `assets/js/hb-kompass-data.js` – spørsmål, svaralternativer og tekster
- `assets/js/hb-kompass.js` – logikken
- `assets/css/hb-kompass.css` – stilene som bare finnes i kompasset
- `fasaden/` – Fasaden, Husbankens designsystem
- `ds/` – Husbankens tokens, skrifter og logo

## Kjøre lokalt

    python3 -m http.server 4322

## Iterasjoner

Versjonsvelgeren nede til venstre lar deg bla mellom iterasjonene, som i
papirsøknaden for aldersvennlig oppgradering. Lista står i
`assets/js/kp-versjoner.js`. Hver eldre iterasjon er siden slik den sto i en
commit, lagt i `iterasjoner/N/` av `verktoy/lag-iterasjoner.py`. Den siste er
sidene i roten.

Iterasjon 1 til 24 (22. september til 5. oktober 2026) er fra tiden før
Boligkompasset fikk eget repo. De er merket `repo: 'husbanken'` og hentes fra
[husbanken-repoet](https://github.com/Pettersommerseth1994/husbanken), som må
ligge ved siden av dette (`../husbanken`) når skriptet kjøres. Lenkene til de
andre sidene i den prototypen peker til husbanken på GitHub Pages.

Ny iterasjon: commit endringene, gi forrige siste oppføring sin `commit` og
`mappe`, legg til den nye nederst, og kjør

    python3 verktoy/lag-iterasjoner.py
