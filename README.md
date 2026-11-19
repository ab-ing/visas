# Visas Kairnial

Suivi collaboratif des visas Kairnial, à partir de l'outil « Recap visas » d'Hubert Magne.

Page : https://ab-ing.github.io/visas/ (connexion avec un compte du bureau)

## Ce qui change par rapport au fichier HTML d'Hubert

| Avant (un fichier HTML) | Maintenant (page en ligne + base Supabase) |
|---|---|
| Données en dur dans le fichier (1,5 Mo) | Données dans la base, importées depuis le fichier d'Hubert (« Importer une version… ») |
| Coches et commentaires dans le navigateur, puis « Enregistrer la page » et remplacer le fichier | Coches et commentaires enregistrés dans la base dès la saisie, visibles en direct par tous |
| Dernier qui enregistre le fichier écrase les autres | Une ligne par plan et indice : chacun modifie ses plans sans écraser ceux des autres |
| Aucune trace de qui a coché quoi | Journal de chaque saisie (auteur, heure) dans `visas_suivi_journal` |
| Liens PDF vers le OneDrive local (`file:///C:/Users/…`) | PDF déposés dans la base (liens valables partout), sinon lien de la pièce jointe Kairnial |

L'affichage et la logique d'Hubert (onglets, filtres, exports Excel, dictée) sont repris tels quels.

## Fichiers

- `index.html`, `hubert.js` : produits par `outils/convertir.py` à partir du fichier d'Hubert. Ne pas les modifier à la main.
- `app.js` : connexion, lecture et écriture dans la base, temps réel, import, PDF.
- `config.js` : adresse de la base et clé publique (faite pour être dans la page).
- `supabase/schema.sql` : tables, droits, seau des PDF. Se rejoue sans risque dans le SQL Editor.
- `outils/convertir.py`, `outils/gabarit.html` : conversion du fichier d'Hubert.

## Mettre à jour

- **Nouvelles données** (nouvel export Kairnial, nouveaux PDF lus) : Hubert produit son fichier comme avant, puis
  « Importer une version… » dans la page. Les coches du fichier plus récentes que celles de la base sont reprises.
- **Nouvelle version de la logique d'Hubert** (nouvel onglet, nouveau filtre) :
  `python3 outils/convertir.py FGH_Recap_visas_Karnial_AAMMJJ.html`, vérifier, pousser.
- **PDF de réponse** : page « Tous les commentaires », « Déposer des PDF de visa… », sélectionner les PDF `_reponse`.

## Comptes

Les inscriptions libres sont fermées : un compte n'existe que si un administrateur l'a créé, et tout compte créé a accès.
Créer un compte : Supabase, projet `ab-ing-outils`, Authentication > Users > Add user > Create new user,
cocher « Auto Confirm User », mot de passe provisoire à transmettre à la personne ; elle le change ensuite
avec le bouton « Mot de passe » de la page.

## Base

Projet Supabase `ab-ing-outils` (organisation ab-ing, région Zurich), partagé avec les autres outils du bureau :
toutes les tables de cet outil commencent par `visas_`.
