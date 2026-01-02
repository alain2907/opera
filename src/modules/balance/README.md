# Module Balance

Module d'affichage de la balance comptable avec filtres avancés.

## Description

Ce module permet de **consulter** la balance comptable avec totaux débit/crédit et soldes débiteur/créditeur par compte.

**État comptable en lecture seule** : Consultation uniquement, aucune modification.

## Fonctionnalités

### Page de sélection (`/balance`)
- **Filtres de sélection** :
  - Période (date début / date fin) - **obligatoire**
  - Raccourcis période : Mois en cours, Mois dernier, Exercice complet
  - Classe de comptes (1-7) - optionnel
  - Plage de comptes (du compte X au compte Y) - optionnel
- **Bouton "Afficher la balance"** : Redirection vers `/balance/affichage?dateDebut=X&dateFin=Y`

### Page d'affichage (`/balance/affichage`)
- Affichage de tous les comptes ayant des mouvements
- Colonnes : Compte | Libellé | Débit | Crédit | Solde Débiteur | Solde Créditeur
- **Filtres dynamiques** (depuis URL) :
  - Période (date début / date fin)
  - Classe de comptes (1-7)
  - Plage de comptes (du compte X au compte Y)
  - Mise à jour URL à chaque changement de filtre
- **Totaux** :
  - Total général débit/crédit
  - Total soldes débiteur/créditeur
  - Vérification équilibre
- **Actions** :
  - Export CSV avec totaux
  - Clic sur un compte → Grand livre du compte (`/comptes/[numero]`)
- **Interface** :
  - Page pleine avec TopMenu
  - Design cohérent avec l'application
  - Responsive

## Structure

```
modules/balance/
├── .module-balance.lock
├── README.md
├── CHANGELOG.md
└── pages/
    └── balance/
        ├── index.tsx           (page de sélection)
        └── affichage.tsx       (page d'affichage)
```

## Accès

**Menu** :
- Comptes → Balance…
- États → Balance

**URLs** :
- `/balance` : Page de sélection avec filtres
- `/balance/affichage?dateDebut=2025-01-01&dateFin=2025-01-31&classe=4` : Affichage de la balance filtrée

## Fonctionnement

### Flow utilisateur

1. `/balance` : Page de sélection
   - Utilisateur sélectionne période (obligatoire)
   - Utilisateur sélectionne classe/plage (optionnel)
   - Clic "Afficher la balance"

2. Redirection vers `/balance/affichage?dateDebut=X&dateFin=Y&classe=4`

3. Page d'affichage :
   - Lecture des paramètres URL
   - Chargement du plan comptable
   - Chargement des écritures
   - Calcul de la balance
   - Affichage du tableau

### Chargement des données (page affichage)

1. Vérification de l'entreprise active (redirection si absente)
2. Lecture des paramètres URL (`dateDebut`, `dateFin`, `classe`, `compteDebut`, `compteFin`)
3. Chargement du plan comptable via `comptesApi.getAll(entrepriseId)`
4. Initialisation des dates depuis URL ou exercice en cours
5. Chargement des écritures via `ecrituresApi.getAll(entrepriseId, exerciceId)`
6. Calcul des totaux par compte (filtrage par période)

### Calcul de la balance

```typescript
// Pour chaque écriture dans la période
ecritures.filter(e => dateDebut <= e.date <= dateFin)
  .forEach(ecriture => {
    ecriture.lignes.forEach(ligne => {
      totauxParCompte[ligne.numero_compte].debit += ligne.debit
      totauxParCompte[ligne.numero_compte].credit += ligne.credit
    })
  })

// Calcul du solde
solde = debit - credit
soldeDebiteur = solde > 0 ? solde : 0
soldeCrediteur = solde < 0 ? abs(solde) : 0
```

### Filtres

**Période** : Filtre côté frontend sur `ecriture.date_ecriture`

**Classe de comptes** :
- Filtre sur le premier chiffre du numéro de compte
- Auto-remplissage de la plage (ex: classe 4 → 4 à 49999999)

**Plage de comptes** : Filtre sur `numero_compte >= debut && numero_compte <= fin`

### Export CSV

Format :
```csv
Compte,Libellé,Débit,Crédit,Solde Débiteur,Solde Créditeur
401000,Fournisseurs,1500.00,2000.00,0.00,500.00
...
TOTAUX,,15000.00,15000.00,5000.00,5000.00
```

Nom du fichier : `balance_[Raison_Sociale]_AAAAMMJJ_HHMMSS.csv`

## API utilisée

- `comptesApi.getAll(entrepriseId)` : Liste complète du plan comptable
- `ecrituresApi.getAll(entrepriseId, exerciceId)` : Toutes les écritures de l'exercice

## Dépendances Backend

Ce module nécessite :

1. **ComptesService** (NestJS)
   - Méthode `findAll(entrepriseId)` pour récupérer le plan comptable

2. **EcrituresService** (NestJS)
   - Méthode `findAll(entrepriseId, exerciceId)` pour récupérer les écritures avec leurs lignes

3. **Koyeb Proxy Backend**
   - Route `GET /comptes?entrepriseId=X`
   - Route `GET /ecritures?entrepriseId=X&exerciceId=Y`

4. **Vercel Frontend**
   - API client `comptesApi.getAll(id)`
   - API client `ecrituresApi.getAll(entrepriseId, exerciceId)`
   - Utilitaire `exportToCsv()` pour export CSV

## Différences avec BalanceWindow

| Critère | BalanceWindow (fenêtre) | Balance (module) |
|---------|-------------------------|------------------|
| Affichage | Fenêtre popup | Page pleine |
| Navigation | WindowContext | Router Next.js |
| TopMenu | ❌ Non | ✅ Oui |
| Grand livre | Fenêtre popup | Navigation `/comptes/[numero]` |
| Responsive | Limité | Complet |
| URL directe | ❌ Non | ✅ Oui (`/balance`) |

## Fonctionnalités

- ✅ Consultation de la balance par période
- ✅ Filtrage par classe de comptes (1-7)
- ✅ Filtrage par plage de comptes
- ✅ Export CSV avec totaux
- ✅ Totaux généraux débit/crédit
- ✅ Vérification équilibre
- ✅ Navigation vers grand livre (clic sur compte)
- ✅ Interface responsive
- ❌ Pas de modification (lecture seule)
- ❌ Pas de graphiques

## Version

Voir [CHANGELOG.md](./CHANGELOG.md)
