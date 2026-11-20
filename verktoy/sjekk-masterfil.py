"""Sjekker at tekstene i Boligkompasset er ord for ord som i masterfila.

    python3 verktoy/sjekk-masterfil.py "MASTERFIL - Boligkompasset per 18-11-2026.xlsx"

Leser arket med openpyxl og hb-kompass-data.js med node, og sammenligner
stegnavn, ingresser, spørsmål, hjelpetekster, svaralternativer,
popovere, veiledning (kolonne C), tiltak (D og E), radene «Blokk og
borettslag» og tilskuddskategorien (G). Mellomrom først og sist i en
celle teller ikke. Skriver ut alt som ikke stemmer, og avslutter med
feilkode hvis noe avviker.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import openpyxl

ROT = Path(__file__).resolve().parent.parent

# Spørsmålskodene i arket, og hva de heter i hb-kompass-data.js
KODER = {
    '1a': 'eieform', '2a': 'inngang', '3a': 'rom', '4a': 'bevegelse',
    '5a': 'bad-innhold', '5b': 'toalett-plassering', '6a': 'bad-bruk',
    '7a': 'adkomst-frem', '8a': 'adkomst-inngang', '9a': 'adkomst-lagring',
    '10a': 'tjenester', '11a': 'aktiviteter', '12a': 'hjelp',
}

# Skrivefeil i arket som er rettet i tjenesten
RETTET = {
    'Lag trinnfri inngang ved å heve terrrenget eller montere en rampe':
        'Lag trinnfri inngang ved å heve terrenget eller montere en rampe',
    'Jevn ut terrengforskjeller eller legg et flatt dekke foran ingangsdøren':
        'Jevn ut terrengforskjeller eller legg et flatt dekke foran inngangsdøren',
    'Ta opp med styret muligheten for en trinnfri vei frem bygget':
        'Ta opp med styret muligheten for en trinnfri vei frem til bygget',
}

# Celler som er beskjeder til utviklerne, ikke tekst folk skal lese
BESKJED = re.compile(r'^(Veiledningstekst kommer i stedet|Tekst handlingsplan kommer i stedet)')


def rens(v):
    if v is None:
        return ''
    t = str(v).strip()
    if BESKJED.match(t):
        return ''
    return RETTET.get(t, t)


def les_arket(fil):
    wb = openpyxl.load_workbook(fil)
    steg, sporsmal = [], {}
    for ws in wb.worksheets:
        # I fane 4 er kolonne D ikke tiltak, men om svaret sammen med
        # utfordringer i andre steg gir rådet om å vurdere å flytte
        flyttekolonne = str(ws['D1'].value or '').startswith('Se alle stegene')
        steg.append({'navn': rens(ws['A1'].value), 'ingress': rens(ws['B1'].value)})
        sp = valg = None
        forrige = ''
        for rad in range(2, ws.max_row + 1):
            a = rens(ws.cell(rad, 1).value)
            celle = {k: rens(ws.cell(rad, n).value) for k, n in (('b', 2), ('c', 3), ('d', 4), ('e', 5), ('g', 7))}
            m = re.match(r'Spørsmål (\d+[ab])', a)
            if m:
                sp = {'tittel': celle['b'], 'hjelp': [], 'valg': []}
                sporsmal[m.group(1)] = sp
                valg = None
                forrige = 'sporsmal'
            elif a.startswith('Hjelpetekst') or (not a and forrige == 'hjelp' and celle['b']):
                sp['hjelp'].append(celle['b'])
                forrige = 'hjelp'
            elif a.startswith('Svaralternativ'):
                valg = {'tittel': celle['b'], 'veiledning': celle['c'],
                        'enkel': '' if flyttekolonne else celle['d'], 'stor': celle['e'],
                        'flytting': flyttekolonne and 'vurdere å flytte' in celle['d'], 'kategori': celle['g'], 'popover': '',
                        'enkelBlokk': '', 'storBlokk': ''}
                sp['valg'].append(valg)
                forrige = 'valg'
            elif a.startswith('Popover'):
                valg['popover'] = celle['b']
                forrige = 'popover'
            elif a.startswith('Blokk og borettslag'):
                valg['enkelBlokk'], valg['storBlokk'] = celle['d'], celle['e']
                forrige = 'blokk'
            elif a:
                forrige = 'annet'
    return steg, sporsmal


def les_tjenesten():
    js = (ROT / 'assets/js/hb-kompass-data.js').read_text(encoding='utf-8')
    js += """
const ut = { steg: KOMPASS_ETAPPER.map(e => ({ navn: e.navn, ingress: e.ingress })), sporsmal: {} };
const valg = v => {
  const t = v.tiltak || v.tiltakUten || {};
  return { tittel: v.tittel, veiledning: v.veiledning || v.veiledningUten || '',
    enkel: t.enkel || '', stor: t.stor || '', enkelBlokk: t.enkelBlokk || '', storBlokk: t.storBlokk || '',
    kategori: v.kategori || '', popover: v.popover || '', flytting: !!v.flytting };
};
KOMPASS_SPORSMAL.forEach(sp => {
  ut.sporsmal[sp.id] = { tittel: sp.tittel, hjelp: (sp.hjelp || '').split(/\\n\\s*\\n/), valg: sp.valg.map(valg) };
  const b = sp.betinget;
  if (b) ut.sporsmal[b.navn] = { tittel: b.ledetekst, hjelp: (b.hjelp || '').split(/\\n\\s*\\n/), valg: b.valg.map(valg) };
});
process.stdout.write(JSON.stringify(ut));
"""
    return json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)


def main():
    steg, ark = les_arket(sys.argv[1])
    tj = les_tjenesten()
    feil = []

    def lik(hvor, fasit, faktisk):
        if fasit.strip() != (faktisk or '').strip():
            feil.append(f'{hvor}\n    arket:     {fasit!r}\n    tjenesten: {faktisk!r}')

    # Stegnavnene står med store bokstaver og «n: » foran i arket
    for i, (a, t) in enumerate(zip(steg, tj['steg']), 1):
        navn = re.sub(r'^\d+:\s*', '', a['navn']).capitalize()
        lik(f'Steg {i}, navn', navn, t['navn'])
        lik(f'Steg {i}, ingress', a['ingress'], t['ingress'])

    for kode, id_ in KODER.items():
        a, t = ark.get(kode), tj['sporsmal'].get(id_)
        if not a or not t:
            feil.append(f'{kode}: mangler i {"arket" if not a else "tjenesten"}')
            continue
        lik(f'{kode} tittel', a['tittel'], t['tittel'])
        lik(f'{kode} hjelpetekst', '\n\n'.join(a['hjelp']), '\n\n'.join(t['hjelp']))
        if len(a['valg']) != len(t['valg']):
            feil.append(f'{kode}: {len(a["valg"])} svar i arket, {len(t["valg"])} i tjenesten')
        for n, (va, vt) in enumerate(zip(a['valg'], t['valg']), 1):
            for felt in ('tittel', 'veiledning', 'enkel', 'stor', 'enkelBlokk', 'storBlokk', 'kategori', 'popover'):
                lik(f'{kode}{n} {felt}', va[felt], vt[felt])
            if va.get('flytting', False) != vt['flytting']:
                feil.append(f'{kode}{n}: rådet om å vurdere å flytte er {"med" if va.get("flytting") else "ikke med"} i arket, men ikke i tjenesten')

    antall = sum(len(s['valg']) for s in ark.values())
    if feil:
        print(f'{len(feil)} avvik:\n')
        print('\n'.join(feil))
        sys.exit(1)
    print(f'Alt stemmer: 4 steg, {len(ark)} spørsmål og {antall} svaralternativer er ord for ord som i arket.')


if __name__ == '__main__':
    main()
