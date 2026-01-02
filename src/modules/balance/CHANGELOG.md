# Changelog - Module Balance

## [2.0.0] - 2025-11-18

### Changement majeur
- **Séparation en 2 pages** : Sélection + Affichage (comme module journaux-edition)
- Page `/balance` : Sélection avec filtres (période obligatoire, classe/plage optionnels)
- Page `/balance/affichage` : Affichage de la balance avec URL params

### Ajouté
- **Page de sélection** (`/balance`) :
  - Formulaire de sélection : période (obligatoire), classe, plage de comptes
  - Raccourcis période : Mois en cours, Mois dernier, Exercice complet
  - Bouton "Afficher la balance" avec redirection
- **Paramètres URL** :
  - `?dateDebut=X&dateFin=Y` : Période
  - `?classe=4` : Classe de comptes
  - `?compteDebut=401&compteFin=409` : Plage de comptes
  - Mise à jour URL automatique lors des changements de filtres
  - Liens partageables

### Modifié
- Structure des pages : `balance.tsx` → `balance/index.tsx` + `balance/affichage.tsx`
- Imports ajustés pour nouvelle profondeur (../../../../)

## [1.0.0] - 2025-11-18

### Ajouté
- **Page Balance** : Affichage balance comptable en page pleine
- **Filtres avancés** :
  - Période (date début / date fin)
  - Classe de comptes (1-7)
  - Plage de comptes (du compte X au compte Y)
- **Export CSV** : Export de la balance avec totaux
- **Navigation** : Clic sur un compte → Redirection vers `/comptes/[numero]`
- **Totaux** :
  - Total général débit/crédit
  - Total soldes débiteur/créditeur
  - Vérification équilibre (✅/⚠️)
- **Interface** :
  - TopMenu intégré
  - Design responsive
  - Affichage nombre de comptes
- **Protection module** : Fichier `.module-balance.lock`

### Migration depuis BalanceWindow
- Conversion de composant fenêtre → page pleine
- Remplacement `openWindow()` par `router.push()`
- Ajout TopMenu et layout application
- Navigation Grand livre : fenêtre popup → route `/comptes/[numero]`

### Accès
- Menu **Comptes → Balance…**
- Menu **États → Balance**
- URL directe : `/balance`

## Format

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).
