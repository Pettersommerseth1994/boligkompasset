#!/usr/bin/env python3
"""
Bygger Fasaden, Husbankens designsystem, for Boligkompasset.

Fasaden er skrevet i SCSS, og pakkene ligger i Husbankens interne
npm-register. Her finnes verken node eller tilgang til registeret, så
skriptet gjør det samme som pakkene gjør, fra kildekoden i Fasaden-repoet:

  1. Tokenene i libs/designsystem-tokens/properties/**/*.json skrives ut
     som SCSS-variabler, med samme navn som style-dictionary gir dem
     ($color-green-45, $space-2-xs og så videre).
  2. libs/designsystem-design/src/styles/esoknad.scss kompileres med
     Dart Sass, pakket inn i .fasaden { }.
  3. Tokenene skrives også ut som CSS-variabler (--color-green-45 osv.),
     slik pakka designsystem-tokens gjør i dist/css/variabler.css. Det er
     dem hb-kompass.css bruker, så alle farger og mål kommer fra Fasaden.
  4. Skriftene fra designsystem-fonts kompileres, og filene kopieres.
  5. Ikonene i IKONER under skrives til fasaden/fasaden-ikoner.js, og
     logoen og illustrasjonene i GRAFIKK kopieres fra designsystem-gfx.
  6. Resultatet ryddes:
       - html, body og :root inne i .fasaden blir .fasaden selv
       - font-size: 62.5 % på html tas bort
       - rem regnes om fra Fasadens rot på 10 px til nettleserens 16 px

Hvorfor innpakket: .fasaden står på <body> i boligkompasset.html og
boligkompasset-papir.html. Prototypens andre sider laster ikke Fasaden,
og innpakningen gjør at det heller ikke kan lekke dit.

Hvorfor rem regnes om: Fasaden setter html til 62,5 % så 1rem blir 10 px.
Omregningen gir de samme pikselstørrelsene som i Fasaden, uten å røre
roten, og nettleserens egen skriftstørrelse virker fortsatt.

Bruk:
  python3 verktoy/bygg-fasaden.py <fasaden-repo> <sass>

  <fasaden-repo>  mappa med Fasaden-repoet (felles-rammeverk-designsystem)
  <sass>          Dart Sass, for eksempel dart-sass/sass fra
                  https://github.com/sass/dart-sass/releases
"""

import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

MAPPE = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'fasaden'))

# Ikonene Boligkompasset bruker. Navnene er filnavnene i
# libs/designsystem-icons/src/images/icons, uten .svg.
IKONER = [
    'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
    'arrow-down-1', 'arrow-up-1', 'remove', 'hb-login', 'expand-6',
    'content-pen-3', 'print-text', 'phone', 'hb-check-mark', 'hb-alert-circle',
    'hb-information-circle', 'house-chimney-2', 'family-home',
    'style-two-pin-home', 'multiple-neutral-1', 'rotate-back',
]

# Fra libs/designsystem-gfx/src/images
GRAFIKK = [
    'logos/husbanken-logo.svg',
    'logos/husbanken-logo-compact.svg',
    'illustrations/vignett_bolig.svg',
]


def les_tokens(repo):
    """Tokenene som (navn, verdi), med samme navn som style-dictionary gir dem."""
    tre = {}

    def flett(a, b):
        for k, v in b.items():
            if k in a and isinstance(a[k], dict) and isinstance(v, dict):
                flett(a[k], v)
            else:
                a[k] = v

    for f in sorted(glob.glob(os.path.join(repo, 'libs/designsystem-tokens/properties/**/*.json'), recursive=True)):
        with open(f, encoding='utf-8') as fil:
            flett(tre, json.load(fil))

    flate = []

    def gaa(node, sti):
        if isinstance(node, dict) and 'value' in node and not isinstance(node['value'], dict):
            flate.append((sti, node['value']))
            return
        for k, v in node.items():
            if isinstance(v, dict):
                gaa(v, sti + [k])

    gaa(tre, [])

    def hent(sti):
        n = tre
        for d in sti:
            n = n[d]
        return n

    def los(verdi):
        if not isinstance(verdi, str):
            return str(verdi)

        def bytt(m):
            sti = m.group(1).split('.')
            if sti[-1] == 'value':
                sti = sti[:-1]
            return los(hent(sti)['value'])

        return re.sub(r'\{([^}]+)\}', bytt, verdi)

    def kebab(sti):
        # Samme som lodash kebabCase i style-dictionary: tall og bokstaver skilles
        s = '-'.join(sti)
        s = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', s).lower()
        s = re.sub(r'(\d)([a-z])', r'\1-\2', s)
        s = re.sub(r'([a-z])(\d)', r'\1-\2', s)
        return s

    return [(kebab(sti), los(v)) for sti, v in flate]


def skriv_scss_tokens(tokens, maal):
    linjer = '\n'.join(f'${n}: {v} !default;' for n, v in tokens) + '\n'
    scss = os.path.join(maal, 'dist', 'scss')
    os.makedirs(scss)
    for navn in ('_variabler.scss', '_design-tokens.scss'):
        with open(os.path.join(scss, navn), 'w', encoding='utf-8') as fil:
            fil.write(linjer)


def rem_til_16(css):
    def rem(m):
        tall = float(m.group(1)) * 10 / 16
        return f'{round(tall, 4):g}rem'

    return re.sub(r'(?<![\w.-])(-?\d*\.?\d+)rem\b', rem, css)


def del_utenfor_parenteser(tekst, skille=','):
    deler, dybde, start = [], 0, 0
    for i, t in enumerate(tekst):
        if t in '([':
            dybde += 1
        elif t in ')]':
            dybde -= 1
        elif t == skille and dybde == 0:
            deler.append(tekst[start:i])
            start = i + 1
    deler.append(tekst[start:])
    return deler


def flytt_fasaden_forst(css):
    """Fasaden bruker «.forelder > &» noen steder. Inne i .fasaden { } blir
    det «.forelder > .fasaden .barn», som aldri treffer, for .fasaden står
    på <body>. Her flyttes .fasaden fram, så det blir «.fasaden .forelder > .barn».

    Der & står flere ganger i samme selektor, som «& + &», «&.&--kantlinje»
    eller «:not(&--gap-sm)», får hver av dem sin egen .fasaden foran seg:
    «.fasaden .hb-tag+.fasaden .hb-tag». Det treffer heller aldri. Bare den
    første .fasaden skal stå, de andre tas bort."""
    def selektor(s):
        s = s.strip()
        if '.fasaden ' not in s:
            return s
        resten = s[len('.fasaden '):] if s.startswith('.fasaden ') else s
        return '.fasaden ' + resten.replace('.fasaden ', '')

    def regel(m):
        return ','.join(selektor(s) for s in del_utenfor_parenteser(m.group(1))) + '{'

    # Selektorer står etter } eller { (inne i @media), aldri etter ; i en blokk
    return re.sub(r'(?:(?<=[{}])|^)([^{}@;][^{};]*)\{', regel, css)


def rydd(css):
    css = re.sub(r'\.fasaden (html|body|:root)\b', '.fasaden', css)
    css = re.sub(r'font-size:\s*62\.5%;?', '', css)
    css = flytt_fasaden_forst(css)
    return rem_til_16(css)


def sass_kompiler(sass, inngang, ut, lastestier):
    subprocess.run([
        sass, '--no-source-map', '--quiet-deps', '--style=compressed',
        '--silence-deprecation=import,global-builtin,color-functions,slash-div',
        *('--load-path=' + s for s in lastestier), inngang, ut,
    ], check=True)
    with open(ut, encoding='utf-8') as fil:
        # Sass legger et BOM-tegn først når fila har tegn utenfor ASCII
        return fil.read().lstrip('\ufeff')


def lag_ikoner(repo):
    kilde = os.path.join(repo, 'libs/designsystem-icons/src/images/icons')
    ikoner = {}
    for navn in IKONER:
        with open(os.path.join(kilde, navn + '.svg'), encoding='utf-8') as fil:
            svg = fil.read().strip()
        svg = re.sub(r'\s*\n\s*', ' ', svg)
        svg = re.sub(r'\s(width|height)="[^"]*"', '', svg, count=2)
        svg = svg.replace('<svg ', '<svg focusable="false" aria-hidden="true" ', 1)
        ikoner[navn] = svg
    linjer = ',\n'.join(f'  {json.dumps(n)}: {json.dumps(s, ensure_ascii=False)}' for n, s in ikoner.items())
    return (
        '/* Ikoner fra Fasaden, libs/designsystem-icons/src/images/icons.\n'
        '   Generert av verktoy/bygg-fasaden.py. Ikke rediger for hånd.\n'
        '   Brukes inne i <span class="hb-icon">, slik Fasadens hb-icon gjør. */\n\n'
        f'const FASADEN_IKON = {{\n{linjer}\n}};\n'
    )


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    repo, sass = (os.path.abspath(a) for a in sys.argv[1:])
    stiler = os.path.join(repo, 'libs/designsystem-design/src/styles')
    versjon = json.load(open(os.path.join(repo, 'package.json'), encoding='utf-8'))['version']
    tokens = les_tokens(repo)

    with tempfile.TemporaryDirectory() as tmp:
        pakker = os.path.join(tmp, 'pakker', '@husbanken')
        os.makedirs(pakker)
        skriv_scss_tokens(tokens, os.path.join(pakker, 'designsystem-tokens'))
        os.symlink(os.path.join(repo, 'libs/designsystem-icons'), os.path.join(pakker, 'designsystem-icons'))
        os.symlink(os.path.join(repo, 'libs/designsystem-fonts'), os.path.join(pakker, 'designsystem-fonts'))
        lastestier = [os.path.join(tmp, 'pakker'), stiler]

        inngang = os.path.join(tmp, 'fasaden.scss')
        with open(inngang, 'w', encoding='utf-8') as fil:
            fil.write(".fasaden {\n  @import 'esoknad';\n}\n")
        css = rydd(sass_kompiler(sass, inngang, os.path.join(tmp, 'fasaden.css'), lastestier))

        skrift = sass_kompiler(sass, os.path.join(repo, 'libs/designsystem-fonts/src/styles/fonts.scss'),
                               os.path.join(tmp, 'skrift.css'), lastestier)
        skrift = skrift.replace('/assets/fonts/Inter/', 'fonter/')

    variabler = '.fasaden{' + ''.join(f'--{n}:{rem_til_16(v)};' for n, v in tokens) + '}'

    topp = (
        '/* Fasaden, Husbankens designsystem, versjon ' + versjon + '.\n'
        '   Bygget av verktoy/bygg-fasaden.py: skriftene fra designsystem-fonts,\n'
        '   tokenene som CSS-variabler, og esoknad.scss. Ikke rediger for hånd.\n'
        '   Alt ligger under .fasaden, og rem er regnet om fra 10 px til 16 px rot. */\n'
    )
    os.makedirs(MAPPE, exist_ok=True)
    with open(os.path.join(MAPPE, 'fasaden.css'), 'w', encoding='utf-8') as fil:
        fil.write(topp + skrift + '\n' + variabler + '\n' + css)

    fonter = os.path.join(MAPPE, 'fonter')
    os.makedirs(fonter, exist_ok=True)
    for f in glob.glob(os.path.join(repo, 'libs/designsystem-fonts/src/fonts/Inter/*.woff2')):
        shutil.copy(f, fonter)

    with open(os.path.join(MAPPE, 'fasaden-ikoner.js'), 'w', encoding='utf-8') as fil:
        fil.write(lag_ikoner(repo))

    grafikk = os.path.join(MAPPE, 'grafikk')
    os.makedirs(grafikk, exist_ok=True)
    for f in GRAFIKK:
        shutil.copy(os.path.join(repo, 'libs/designsystem-gfx/src/images', f), grafikk)

    print(f'{len(tokens)} tokens, {len(IKONER)} ikoner, {len(GRAFIKK)} grafikkfiler. '
          f'fasaden.css er {os.path.getsize(os.path.join(MAPPE, "fasaden.css")) // 1024} kB.')


if __name__ == '__main__':
    main()
