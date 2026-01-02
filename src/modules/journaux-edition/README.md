# Module Journaux Édition

Module d'affichage des écritures par journal et par période (état comptable).

## Description

Ce module permet de **consulter** les écritures comptables d'un journal spécifique sur une période donnée.

**État comptable en lecture seule** : Aucune modification possible.

## Fonctionnalités

### Page de sélection (`/journaux-edition`)
- Sélection du journal (liste déroulante des journaux actifs)
- Sélection de la période (date début / date fin)
- Raccourcis période : Mois en cours, Mois dernier, Exercice complet
- Bouton "Afficher les écritures"
- Validation : journal et période obligatoires

### Page d'affichage (`/journaux/[code]/ecritures`)
- Affichage des écritures groupées par mois
- Colonnes : N° | Date | Pièce | Compte | Libellé écriture | Débit | Crédit
- Totaux par mois (Débit / Crédit)
- Total général du journal
- Détection des écritures non équilibrées
- Alertes visuelles si déséquilibre (fond rouge)

## Structure

```
modules/journaux-edition/
├── README.md
├── CHANGELOG.md
└── frontend/
    └── pages/
        ├── journaux-edition.tsx          (sélection journal + période)
        └── journaux-edition/
            └── [id].tsx                   (ancien - déprécié)
```

**Note** : La page `[id].tsx` est obsolète et n'est plus utilisée. L'affichage utilise `/journaux/[code]/ecritures`.

## Accès

**Menu** : États → Édition des journaux

**URL principale** : `/journaux-edition`

**Flow** :
1. `/journaux-edition` → Sélection journal + période
2. Clic "Afficher" → Redirection vers `/journaux/[code]/ecritures?dateDebut=X&dateFin=Y`

## Fonctionnement

### Page de sélection

1. Chargement des journaux actifs via `journauxApi.findByEntreprise(entrepriseId)`
2. Initialisation des dates avec l'exercice en cours
3. Utilisateur sélectionne un journal et une période
4. Validation des champs
5. Redirection vers `/journaux/{code}/ecritures?dateDebut={debut}&dateFin={fin}`

### Page d'affichage (réutilise module existant)

La page `/journaux/[code]/ecritures` (module séparé) :
- Filtre les écritures par journal et période (via query params)
- Groupe les écritures par mois
- Affiche les totaux et détecte les déséquilibres

## API utilisée

- `journauxApi.findByEntreprise(id)` : Liste des journaux actifs
- `ecrituresApi.getAll(entrepriseId, exerciceId, journalId, dateDebut, dateFin)` : Écritures filtrées

## Dépendances Backend

Ce module nécessite :

1. **JournauxService** (NestJS)
   - Méthode `findByEntreprise(entrepriseId)` pour lister les journaux

2. **EcrituresService** (NestJS)
   - Méthode `findAll()` avec filtres journal + dates

3. **Koyeb Proxy Backend**
   - Route `GET /journaux?entrepriseId=X`
   - Route `GET /ecritures?entrepriseId=X&exerciceId=Y&journalId=Z&dateDebut=D1&dateFin=D2`

4. **Vercel Frontend**
   - API client `journauxApi.findByEntreprise(id)`
   - API client `ecrituresApi.getAll()` avec paramètres de filtrage

## Limitations

- ✅ Consultation uniquement (lecture seule)
- ✅ Filtrage par journal et période
- ❌ Pas de modification d'écritures
- ❌ Pas de création d'écritures
- ✅ Seuls les journaux actifs sont affichés

## Version

Voir [CHANGELOG.md](./CHANGELOG.md)
