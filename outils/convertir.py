#!/usr/bin/env python3
"""Convertit une version « Recap visas » d'Hubert (un seul fichier HTML, données en dur)
en page en ligne : index.html (mise en page et styles d'Hubert) + hubert.js (sa logique,
sans les données, branchée sur la base Supabase par l'objet API de app.js).

Les données ne passent PAS par ce script : elles s'importent dans la page en ligne
(bouton « Importer une version »), qui les range dans la base.
Ce script ne sert que quand Hubert fait évoluer la logique ou l'affichage de son outil.

    python3 outils/convertir.py FGH_Recap_visas_Karnial_AAMMJJ.html
"""
import re
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent.parent
DONNEES = ['DOCS', 'HIST', 'HMETA', 'LAST', 'NAMES', 'NCAB', 'PDFC', 'HCAT', 'PDFF', 'BY']


def remplace(texte, avant, apres, nb=1):
    n = texte.count(avant)
    if n != nb:
        sys.exit(f'Motif trouvé {n} fois au lieu de {nb} : {avant[:90]!r}')
    return texte.replace(avant, apres)


def remplace_re(texte, motif, apres, flags=0):
    nouveau, n = re.subn(motif, apres, texte, count=1, flags=flags)
    if n != 1:
        sys.exit(f'Motif introuvable : {motif[:90]!r}')
    return nouveau


def main(source):
    html = Path(source).read_text(encoding='utf-8')

    # ------------------------------------------------------------- logique (hubert.js)
    debut = html.index('<script>', html.index('id="saved-state"'))
    fin = html.rindex('</script>')
    js = html[debut + len('<script>'):fin]
    lignes = []
    for ligne in js.split('\n'):
        m = re.match(r'^const ([A-Z]+) = ', ligne)
        if m and m.group(1) in DONNEES:
            lignes.append(f'const {m.group(1)} = D.{m.group(1)};')
        else:
            lignes.append(ligne)
    js = '\n'.join(lignes)
    manque = [n for n in DONNEES if f'const {n} = D.{n};' not in js]
    if manque:
        sys.exit('Données introuvables dans le fichier : ' + ', '.join(manque))

    # dossier des PDF : celui du relevé importé (plus de chemin en dur)
    js = remplace_re(js, r'const PDFDEF = "[^"\n]*";', 'const PDFDEF = D.PDFDEF || "";')

    # liens « Ouvrir le PDF » : copie dans la base, sinon lien Kairnial, sinon dossier local
    js = remplace_re(js, r"const pdfLink = \(f, pg\) => [^\n]*?</a>`;",
        "const pdfLink = (f, pg) => { if (f == null) return ''; const u = API.lienPdf(PDFF[f], pg) || (location.protocol === 'file:' ? PDFDIR + encodeURIComponent(PDFF[f]) + '#page=' + (pg || 1) : '');\n"
        "  return u ? `<a class=\"pdfl\" href=\"${esc(u)}\" target=\"_blank\" rel=\"noopener\" title=\"${esc(PDFF[f])}\">Ouvrir le PDF${pg > 1 ? ' (page ' + pg + ')' : ''}</a>`\n"
        "    : `<button type=\"button\" class=\"pdfl\" data-copy=\"${esc(PDFF[f])}\" title=\"PDF pas encore déposé dans l'outil : un clic copie son nom\">Copier le nom du PDF${pg > 1 ? ' (page ' + pg + ')' : ''}</button>`; };")

    # suivi : lu dans la base (objet partagé API.suivi) au lieu du navigateur et du fichier
    js = remplace_re(js, r'\(function loadDone\(\)\{.*?\n\}\)\(\);',
        "DONE = API.suivi;\n"
        "Object.values(DONE).forEach(e => { if (!e.v) { if (!e.x) e.m = 1; else if (!e.n && !e.r) e.m = 1; else delete e.x; e.v = 2; } });",
        flags=re.S)
    js = remplace(js, "  try { localStorage.setItem(LSK, JSON.stringify(DONE)); } catch (err) { toast('Le navigateur ne mémorise pas : utilisez « Enregistrer la page »'); }",
        "  API.enregistre(dkey(k, i), e);")
    js = remplace(js, "${DIRTY ? ' · non enregistré dans le fichier' : ''}", "${API.statut()}")
    js = remplace(js, '<button class="btn" type="button" data-act="save">Enregistrer la page</button>', '')

    # bouton « Dossier des PDF… » : dépôt des PDF de réponse dans la base
    js = remplace_re(js, r"\$\('#pdfdir'\)\.addEventListener\('click', \(\) => \{.*?\n\}\);",
        "$('#pdfdir').addEventListener('click', () => API.ajoutePdf(() => { renderCom(); renderProj(); render(); }));",
        flags=re.S)

    # la page se redessine quand un collègue modifie le suivi
    js = remplace(js, '\nselects(); render();\n', '\nselects(); render();\nAPI.redessine = () => { renderSuivi(); render(); };\n')

    sortie_js = ('/* Logique de l\'outil « Recap visas » d\'Hubert Magne, reprise telle quelle par\n'
                 '   outils/convertir.py : seules les données (D) et l\'enregistrement du suivi (API)\n'
                 '   passent par la base. Ne pas modifier à la main : relancer le script. */\n'
                 'function lanceOutil(D, API) {\n' + js.strip('\n') + '\n}\n')
    (ICI / 'hubert.js').write_text(sortie_js, encoding='utf-8')

    # ------------------------------------------------------------- page (index.html)
    tete = html[:html.index('<body>')]
    style = tete[tete.index('<style>'):tete.index('</style>') + len('</style>')]
    corps = html[html.index('<body>') + len('<body>'):html.index('<script id="saved-state"')]
    corps = remplace(corps, '>Dossier des PDF…</button>', '>Déposer des PDF de visa…</button>')
    corps = remplace(corps, 'title="Dossier où se trouvent les PDF de visa sur ce poste"',
                     'title="Choisis les PDF « _reponse » téléchargés de Kairnial : ils sont rangés dans la base et les liens « Ouvrir le PDF » marchent pour tout le monde"')
    # notes de bas de page : ce qui change avec la base partagée
    corps = remplace_re(corps, r"<li><b>Traité</b> : la coche « Fait » est mémorisée dans ce navigateur\. « Enregistrer la page » télécharge une copie de la page qui contient les coches, à remettre à la place de l'ancien fichier pour les conserver ou les partager\. Le champ « Commentaire » sous la coche est libre et s'enregistre de la même façon\.",
        "<li><b>Traité</b> : la coche « Fait » est enregistrée dans la base commune dès qu'on la pose : tous ceux qui ont la page ouverte la voient apparaître, sans recharger. Le champ « Commentaire » sous la coche est libre et s'enregistre de la même façon ; chaque saisie garde son auteur et son heure (journal du suivi).")
    corps = remplace_re(corps, r"<li><b>Ouvrir le PDF</b> : .*?</li>",
        "<li><b>Ouvrir le PDF</b> : chaque commentaire lu dans un PDF de visa porte un lien qui ouvre ce PDF à la page du commentaire. Le lien vise la copie déposée dans l'outil (bouton « Déposer des PDF de visa… », page Tous les commentaires), sinon le lien de la pièce jointe chez Kairnial. Tant qu'aucun des deux n'existe, le bouton copie le nom du fichier.</li>", flags=re.S)
    corps = remplace_re(corps, r"<li><b>Liens « Ouvrir le PDF »</b> : .*?</li>",
        "<li><b>Déposer les PDF</b> : il suffit de les déposer une fois (les PDF « _reponse » du dossier OneDrive 2-Données de base / VISAs / Kairnial, tous d'un coup) ; un PDF déjà déposé est remplacé. Les liens marchent ensuite sur tous les postes, sans OneDrive synchronisé.</li>", flags=re.S)
    gabarit = (ICI / 'outils' / 'gabarit.html').read_text(encoding='utf-8')
    page = gabarit.replace('<!--STYLE-->', style).replace('<!--CORPS-->', corps.strip('\n'))
    (ICI / 'index.html').write_text(page, encoding='utf-8')
    print('hubert.js et index.html écrits.')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
