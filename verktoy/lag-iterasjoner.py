#!/usr/bin/env python3
"""
Lager iterasjonene av Boligkompasset fra commit-loggen.

Hver oppføring i assets/js/kp-versjoner.js som har «commit» og «mappe»,
blir siden slik den sto i den commit-en, lagt i mappa. Da kan man bla
tilbake i versjonsvelgeren på GitHub Pages, som bare serverer det som
ligger i main.

Bare de små tekstfilene kopieres. Skrifter, logo, bilder og PDF hentes
fra roten, så hver iterasjon blir et par hundre kilobyte og ikke 18 MB.
Hver iterasjon får også sin egen lagring i nettleseren, så svar fra én
versjon ikke blandes med en annen der spørsmålene er ulike.

Bruk (fra roten av repoet):
  python3 verktoy/lag-iterasjoner.py
"""

import os
import re
import subprocess
import sys

ROT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Det siden trenger, utenom de store delte filene
FILER = [
    'boligkompasset.html',
    'fasaden/boligkompasset-stiler.css',
    'fasaden/fasaden.css',
    'ds/colors_and_type.css',
    'assets/css/hb-app.css',
    'assets/css/hb-kompass.css',
    'assets/js/hb.js',
    'assets/js/hb-kompass-data.js',
    'assets/js/hb-kompass.js',
]

# Fra iterasjoner/N/ og tilbake til roten
TIL_ROT = '../../'

# Versjonen av velgeren, så GitHub Pages ikke gir en gammel utgave fra
# hurtiglageret. Økes når kp-versjoner.js eller -.css endres.
VELGER_V = 3


def les_versjoner():
    """Nummer, commit og mappe for hver iterasjon som er en commit."""
    kilde = open(os.path.join(ROT, 'assets/js/kp-versjoner.js'), encoding='utf-8').read()
    funn = re.findall(r"nr:\s*(\d+),\s*commit:\s*'([0-9a-f]+)',\s*mappe:\s*'([^']+)'", kilde)
    return [(int(nr), commit, mappe) for nr, commit, mappe in funn]


def fra_git(commit, sti):
    return subprocess.run(['git', 'show', f'{commit}:{sti}'], cwd=ROT,
                          capture_output=True, check=True).stdout.decode('utf-8')


def skriv_om(sti, tekst, nr):
    """Peker de store delte filene til roten, og gir iterasjonen sin egen
    lagring og versjonsvelgeren."""
    if sti == 'ds/colors_and_type.css':
        # Fra iterasjoner/N/ds/ er det tre nivåer opp til roten
        tekst = re.sub(r"url\((['\"]?)fonts/", rf"url(\1../{TIL_ROT}ds/fonts/", tekst)

    if sti.endswith('.js') or sti.endswith('.html'):
        tekst = re.sub(r"""(['"])(ds/logo/|assets/img/|assets/pdf/)""", rf"\1{TIL_ROT}\2", tekst)

    if sti == 'assets/js/hb-kompass.js':
        tekst = re.sub(r"const KP_LAGER = '[^']*';",
                       f"const KP_LAGER = 'hb-boligkompasset-iterasjon-{nr}';", tekst)

    if sti == 'boligkompasset.html':
        tekst = re.sub(r'<body[^>]*>', f'<body data-versjon="{nr}" data-rot="{TIL_ROT}">', tekst, count=1)
        tekst = tekst.replace(
            '</head>',
            f'<meta name="robots" content="noindex">\n'
            f'<link rel="stylesheet" href="{TIL_ROT}assets/css/kp-versjoner.css?v={VELGER_V}">\n</head>', 1)
        # Iterasjoner som alt hadde velgeren, skal ikke få den to ganger
        tekst = re.sub(r'<script src="assets/js/kp-versjoner\.js[^"]*"></script>\n?', '', tekst)
        tekst = re.sub(r'<link rel="stylesheet" href="assets/css/kp-versjoner\.css[^"]*">\n?', '', tekst)
        tekst = tekst.replace('</body>', f'<script src="{TIL_ROT}assets/js/kp-versjoner.js?v={VELGER_V}"></script>\n</body>', 1)
    return tekst


def main():
    versjoner = les_versjoner()
    if not versjoner:
        sys.exit('Fant ingen iterasjoner med commit og mappe i kp-versjoner.js')
    for nr, commit, mappe in versjoner:
        for sti in FILER:
            ut = os.path.join(ROT, mappe, sti)
            os.makedirs(os.path.dirname(ut), exist_ok=True)
            with open(ut, 'w', encoding='utf-8') as f:
                f.write(skriv_om(sti, fra_git(commit, sti), nr))
        print(f'Iterasjon {nr}: {commit} -> {mappe}')


if __name__ == '__main__':
    main()
