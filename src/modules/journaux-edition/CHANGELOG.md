# Changelog - Module Journaux Édition

## [2.0.0] - 2025-11-17

### Changement majeur
- **Nouveau concept** : Module devient un état comptable (lecture seule) au lieu d'un module d'édition de paramètres
- Page `/journaux-edition` : Sélection journal + période
- Affichage écritures via `/journaux/[code]/ecritures` (réutilisation module existant)

### Ajouté
- Page de sélection `/journaux-edition` avec :
  - Liste déroulante des journaux actifs
  - Sélection période (date début / date fin)
  - Raccourcis période (Mois en cours, Mois dernier, Exercice complet)
  - Validation des champs
  - Redirection vers page d'affichage
- Menu **États → Édition des journaux** pointe vers `/journaux-edition`
- Documentation complète du flow de sélection

### Déprécié
- Page `/journaux-edition/[id]` (ancien module d'édition de paramètres - non utilisée)

## [1.0.0] - 2025-11-17 (obsolète)

### Ajouté
- Page édition journal `/journaux-edition/[id]` (déprécié en v2.0.0)
- Formulaire pré-rempli avec données du journal existant
- Édition code, libellé, statut actif/inactif

### Notes
- Version initiale basée sur édition de paramètres (concept abandonné)

## Format

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).
