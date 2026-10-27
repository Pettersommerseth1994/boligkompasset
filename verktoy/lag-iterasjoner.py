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

Iterasjonene før 8. oktober 2026 ble laget i husbanken-repoet, før
Boligkompasset fikk sitt eget. De har «repo: 'husbanken'» i
kp-versjoner.js og hentes fra ../husbanken. Lenkene til de andre sidene
i den prototypen peker dit de ligger på GitHub Pages.

Bruk (fra roten av repoet):
  python3 verktoy/lag-iterasjoner.py
"""

import os
import re
import shutil
import subprocess
import sys

ROT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Repoene en iterasjon kan hentes fra
REPOER = {
    'boligkompasset': ROT,
    'husbanken': os.path.abspath(os.path.join(ROT, '..', 'husbanken')),
}
HUSBANKEN_PAGES = 'https://pettersommerseth1994.github.io/husbanken/'

# Fra iterasjoner/N/ og tilbake til roten
TIL_ROT = '../../'

# Versjonen av velgeren, så GitHub Pages ikke gir en gammel utgave fra
# hurtiglageret. Økes når kp-versjoner.js eller -.css endres.
VELGER_V = 8

# Store delte filer som hentes fra roten i stedet for å kopieres, så
# lenge de finnes der
DELT = r'(?:ds/logo/|assets/img/|assets/pdf/)[^"\'\s)]+'


def les_versjoner():
    """Nummer, repo, commit og mappe for hver iterasjon som er en commit."""
    kilde = open(os.path.join(ROT, 'assets/js/kp-versjoner.js'), encoding='utf-8').read()
    funn = re.findall(r"nr:\s*(\d+),\s*(?:repo:\s*'(\w+)',\s*)?commit:\s*'([0-9a-f]+)',\s*mappe:\s*'([^']+)'", kilde)
    return [(int(nr), repo or 'boligkompasset', commit, mappe) for nr, repo, commit, mappe in funn]


def fra_git(repo, commit, sti, binar=False):
    ut = subprocess.run(['git', 'show', f'{commit}:{sti}'], cwd=REPOER[repo],
                        capture_output=True, check=True).stdout
    return ut if binar else ut.decode('utf-8')


def finnes_i_git(repo, commit, sti):
    return subprocess.run(['git', 'cat-file', '-e', f'{commit}:{sti}'], cwd=REPOER[repo],
                          capture_output=True).returncode == 0


def filene(repo, commit):
    """Siden og alt den laster av stilark og skript, med @import fulgt
    hele veien ned."""
    funnet, kø = [], ['boligkompasset.html']
    while kø:
        sti = kø.pop(0)
        if sti in funnet or not finnes_i_git(repo, commit, sti):
            continue
        funnet.append(sti)
        tekst = fra_git(repo, commit, sti)
        mappe = os.path.dirname(sti)
        if sti.endswith('.html'):
            refs = re.findall(r'(?:href|src)="([^"#:?]+\.(?:css|js))(?:\?[^"]*)?"', tekst)
        else:
            refs = re.findall(r"@import\s+url\(['\"]?([^'\")?]+\.css)", tekst)
        for r in refs:
            kø.append(os.path.normpath(os.path.join(mappe, r)) if sti.endswith('.css') else r)
    return funnet


def delte_filer(tekst):
    return set(re.findall(rf"""(?<=['"(])({DELT})""", tekst))


def skriv_om(repo, sti, tekst, nr):
    """Peker de store delte filene til roten, og gir iterasjonen sin egen
    lagring og versjonsvelgeren."""
    if sti == 'ds/colors_and_type.css':
        # Fra iterasjoner/N/ds/ er det tre nivåer opp til roten
        tekst = re.sub(r"url\((['\"]?)fonts/", rf"url(\1../{TIL_ROT}ds/fonts/", tekst)

    if sti.endswith('.js') or sti.endswith('.html'):
        # Bare det som finnes i roten. Resten kopieres inn i iterasjonen.
        tekst = re.sub(rf"""(['"])({DELT})""",
                       lambda m: m.group(1) + (TIL_ROT if os.path.exists(os.path.join(ROT, m.group(2))) else '') + m.group(2),
                       tekst)
        if repo == 'husbanken':
            tekst = re.sub(r"""(['"])((?!boligkompasset)[a-z0-9-]+\.html)""", rf"\1{HUSBANKEN_PAGES}\2", tekst)

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
    # Mappene lages på nytt, så en iterasjon som har fått nytt nummer
    # ikke blir liggende igjen under det gamle
    shutil.rmtree(os.path.join(ROT, 'iterasjoner'), ignore_errors=True)
    for nr, repo, commit, mappe in versjoner:
        delte = set()
        for sti in filene(repo, commit):
            tekst = fra_git(repo, commit, sti)
            delte |= delte_filer(tekst)
            ut = os.path.join(ROT, mappe, sti)
            os.makedirs(os.path.dirname(ut), exist_ok=True)
            with open(ut, 'w', encoding='utf-8') as f:
                f.write(skriv_om(repo, sti, tekst, nr))
        # Bilder og PDF som ikke finnes i roten, hentes fra commit-en
        for sti in sorted(delte):
            if not os.path.exists(os.path.join(ROT, sti)) and finnes_i_git(repo, commit, sti):
                ut = os.path.join(ROT, mappe, sti)
                os.makedirs(os.path.dirname(ut), exist_ok=True)
                with open(ut, 'wb') as f:
                    f.write(fra_git(repo, commit, sti, binar=True))
        print(f'Iterasjon {nr}: {repo} {commit} -> {mappe}')


if __name__ == '__main__':
    main()
