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
- `assets/css/hb-kompass.css` – det Fasaden ikke har: kompasset, stolpene og
  utskriften. Bare Fasadens tokens.
- `fasaden/` – Fasaden, Husbankens designsystem: `fasaden.css` med tokens og
  skrifter, `fasaden-ikoner.js` og logoen i `grafikk/`
- `verktoy/bygg-fasaden.py` – bygger `fasaden/` fra Fasaden-repoet
- `ds/` – prototypens gamle grunnlag. Brukes nå bare av papirutgaven.

## Fasaden

Skjermutgaven er bygget med Fasaden alene: topp, bunn, komponenter, ikoner,
farger, avstander og brytpunkter. Det eneste som ikke er en Fasaden-komponent,
er kompasset, stolpene i oppsummeringen og skyvekontrollen. Også de bruker
bare Fasadens tokens.

## Kjøre lokalt

    python3 -m http.server 4322
