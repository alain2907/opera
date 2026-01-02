/**
 * Service de calcul du Bilan pour PWA
 * Copié depuis backend/src/bilan/bilan.service.ts
 * Adapté pour utiliser IndexedDB au lieu de TypeORM
 */

import { getDB } from './indexedDB';
import { BILAN_MAPPINGS, BilanMapping } from './bilan-mappings';

/**
 * Charge les mappings avec priorité à ceux personnalisés dans IndexedDB
 */
async function loadMappings(): Promise<BilanMapping[]> {
  const db = await getDB();
  const customMappings = await db.getAll('bilan_mappings');

  if (customMappings.length === 0) {
    return BILAN_MAPPINGS;
  }

  // Fusionner les mappings : utiliser les custom quand ils existent, sinon les defaults
  const mappings = [...BILAN_MAPPINGS];
  for (const customMapping of customMappings) {
    const index = mappings.findIndex(m => m.code_poste === customMapping.code_poste);
    if (index !== -1) {
      // Remplacer par le mapping personnalisé
      mappings[index] = {
        ...mappings[index],
        compte_debut: customMapping.compte_debut || mappings[index].compte_debut,
        compte_fin: customMapping.compte_fin || mappings[index].compte_fin,
        comptes_specifiques: customMapping.comptes_specifiques !== undefined
          ? customMapping.comptes_specifiques
          : mappings[index].comptes_specifiques,
      };
    }
  }

  return mappings;
}

export interface LigneBilan {
  section: string;
  ligne_libelle: string;
  code_poste: string;
  niveau: number;
  montant_n: number;
  montant_n_1?: number;
  ordre_affichage: number;
}

export interface ResultatBilan {
  actif: LigneBilan[];
  passif: LigneBilan[];
  total_actif: number;
  total_passif: number;
  equilibre: boolean;
}

export interface DetailCompte {
  numero_compte: string;
  libelle: string;
  solde: number;
}

export interface DetailLigneBilan {
  ligne_libelle: string;
  code_poste: string;
  comptes: DetailCompte[];
  total: number;
  compte_debut: string | null;
  compte_fin: string | null;
  comptes_specifiques: string | null;
}


/**
 * Calculer le bilan
 */
export async function calculerBilan(params: {
  exercice_id: number;
  date_cloture: string;
  comparatif?: boolean;
  exercice_id_n_1?: number;
  date_cloture_n_1?: string;
}): Promise<ResultatBilan> {
  const {
    exercice_id,
    date_cloture,
    comparatif,
    exercice_id_n_1,
    date_cloture_n_1,
  } = params;

  // Récupérer le mapping du bilan (avec les personnalisations depuis IndexedDB)
  const allMappings = await loadMappings();
  const mappings = allMappings.filter(m => m.actif);

  // Calculer la balance pour l'année N
  const balanceN = await calculerBalanceParCompte(
    exercice_id,
    date_cloture,
  );

  // Calculer la balance pour l'année N-1 si comparatif
  let balanceN1: Map<string, number> | undefined;
  if (comparatif && exercice_id_n_1 && date_cloture_n_1) {
    balanceN1 = await calculerBalanceParCompte(
      exercice_id_n_1,
      date_cloture_n_1,
    );
  }

  // Construire les lignes du bilan
  const lignes: LigneBilan[] = [];

  for (const mapping of mappings) {
    const montant_n = calculerMontantLigne(mapping, balanceN, mappings);
    const montant_n_1 = balanceN1
      ? calculerMontantLigne(mapping, balanceN1, mappings)
      : undefined;

    lignes.push({
      section: mapping.section,
      ligne_libelle: mapping.ligne_libelle,
      code_poste: mapping.code_poste || '',
      niveau: mapping.niveau,
      montant_n,
      montant_n_1,
      ordre_affichage: mapping.ordre_affichage,
    });
  }

  // Séparer actif et passif
  const actif = lignes.filter((l) => l.section === 'ACTIF');
  const passif = lignes.filter((l) => l.section === 'PASSIF');

  // Calculer les totaux
  // Pour l'actif, utiliser la ligne 1A (TOTAL après déduction des amortissements)
  const ligne1A = actif.find((l) => l.code_poste === '1A');
  const total_actif = ligne1A ? ligne1A.montant_n : actif
    .filter((l) => l.niveau === 3) // Fallback : sommer les lignes détaillées
    .reduce((sum, l) => sum + l.montant_n, 0);

  // Pour le passif, utiliser la ligne EE (TOTAL GÉNÉRAL PASSIF)
  const ligneEE = passif.find((l) => l.code_poste === 'EE');
  const total_passif = ligneEE ? ligneEE.montant_n : passif
    .filter((l) => l.niveau === 3)
    .reduce((sum, l) => sum + l.montant_n, 0);

  const equilibre = Math.abs(total_actif - total_passif) < 0.01;

  return {
    actif,
    passif,
    total_actif,
    total_passif,
    equilibre,
  };
}

/**
 * Calculer la balance par compte jusqu'à une date de clôture
 */
async function calculerBalanceParCompte(
  exercice_id: number,
  date_cloture: string,
): Promise<Map<string, number>> {
  const db = await getDB();

  // Récupérer toutes les écritures jusqu'à la date de clôture
  const allEcritures = await db.getAll('ecritures');
  const ecritures = allEcritures.filter((e: any) => {
    const ecritureExerciceId = e.exerciceId || e.exercice_id;
    if (ecritureExerciceId !== exercice_id) return false;
    if (e.date > date_cloture) return false;
    return true;
  });

  // Calculer le solde par compte
  const balance = new Map<string, number>();

  for (const ecriture of ecritures) {
    const numeroCompte = ecriture.compteNumero || ecriture.compte_numero;
    if (!numeroCompte) continue;

    const debit = Number(ecriture.debit || 0);
    const credit = Number(ecriture.credit || 0);

    const solde = balance.get(numeroCompte) || 0;
    balance.set(
      numeroCompte,
      solde + debit - credit,
    );
  }

  // Debug: afficher les soldes des classes 1-7
  console.log('\n[BALANCE DEBUG] Récapitulatif par classe:');
  const recapClasses = new Map<string, number>();
  for (const [compte, solde] of balance.entries()) {
    const classe = compte.charAt(0);
    const currentTotal = recapClasses.get(classe) || 0;
    recapClasses.set(classe, currentTotal + solde);
  }

  for (let i = 1; i <= 7; i++) {
    const classe = i.toString();
    const total = recapClasses.get(classe) || 0;
    console.log(`Classe ${classe}: ${total.toFixed(2)} €`);
  }
  console.log('');

  return balance;
}

/**
 * Calculer le montant d'une ligne du bilan
 */
function calculerMontantLigne(
  mapping: BilanMapping,
  balance: Map<string, number>,
  allMappings: BilanMapping[],
): number {
  // Cas spécial : Résultat de l'exercice = Produits (classe 7) - Charges (classe 6)
  if (mapping.comptes_specifiques) {
    try {
      const comptesSpec = JSON.parse(mapping.comptes_specifiques);

      if (comptesSpec?.type === 'resultat_exercice') {
        let produits = 0;
        let charges = 0;

        for (const [compte, solde] of balance.entries()) {
          if (compte.startsWith('7')) {
            // Classe 7 : Produits (normalement créditeurs = négatifs en compta)
            produits += Math.abs(solde < 0 ? solde : 0);
          } else if (compte.startsWith('6')) {
            // Classe 6 : Charges (normalement débiteurs = positifs en compta)
            charges += solde > 0 ? solde : 0;
          }
        }

        const resultat = produits - charges;
        console.log(`[RESULTAT DI] Produits(classe 7): ${produits}, Charges(classe 6): ${charges}, Résultat: ${resultat}, Section: ${mapping.section}`);

        // La ligne DI affiche toujours le résultat (bénéfice ou perte)
        // En comptabilité française, le résultat apparaît au PASSIF (bénéfice positif, perte négative)
        console.log(`[RESULTAT DI] Montant final: ${resultat}`);
        return resultat;
      }

      // Cas spécial : Somme de lignes (pour les totaux/sous-totaux)
      if (comptesSpec?.type === 'somme_lignes' && Array.isArray(comptesSpec?.codes) && allMappings) {
        console.log(`[SOMME_LIGNES] Début calcul pour ${mapping.code_poste} (${mapping.ligne_libelle})`);
        console.log(`[SOMME_LIGNES] Codes à sommer:`, comptesSpec.codes);
        let somme = 0;
        for (const code of comptesSpec.codes) {
          const ligneMapping = allMappings.find(m => m.code_cerfa === code || m.code_poste === code);
          if (ligneMapping) {
            const montant = calculerMontantLigne(ligneMapping, balance, allMappings);
            console.log(`[SOMME_LIGNES] Code ${code} (${ligneMapping.ligne_libelle}): montant = ${montant}`);
            somme += montant;
          } else {
            console.log(`[SOMME_LIGNES] Code ${code}: mapping non trouvé`);
          }
        }
        console.log(`[SOMME_LIGNES] Total pour ${mapping.code_poste}: ${somme}`);
        return somme;
      }

      // Cas spécial : Différence de lignes (pour le net = brut - amortissements)
      if (comptesSpec?.type === 'difference_lignes' && comptesSpec?.base && comptesSpec?.soustrait && allMappings) {
        const baseMapping = allMappings.find(m => m.code_cerfa === comptesSpec.base || m.code_poste === comptesSpec.base);
        const soustraitMapping = allMappings.find(m => m.code_cerfa === comptesSpec.soustrait || m.code_poste === comptesSpec.soustrait);

        const baseValue = baseMapping ? calculerMontantLigne(baseMapping, balance, allMappings) : 0;
        const soustraitValue = soustraitMapping ? calculerMontantLigne(soustraitMapping, balance, allMappings) : 0;

        // Utiliser la valeur absolue de soustraitValue car les comptes d'amortissement sont négatifs
        // Ex: CO = 10000, BK = -300, alors 1A = 10000 - Math.abs(-300) = 9700
        const result = baseValue - Math.abs(soustraitValue);

        console.log(`[DIFFERENCE] ${mapping.code_cerfa}: ${comptesSpec.base}(${baseValue}) - |${comptesSpec.soustrait}|(${Math.abs(soustraitValue)}) = ${result}`);

        return result;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  let montant = 0;

  // Parcourir la balance et additionner les comptes correspondants
  for (const [compte, solde] of balance.entries()) {
    let correspondance = false;

    // Vérifier la plage de comptes
    if (mapping.compte_debut && mapping.compte_fin) {
      // Si compte_debut == compte_fin, chercher par préfixe
      if (mapping.compte_debut === mapping.compte_fin) {
        if (compte.startsWith(mapping.compte_debut)) {
          correspondance = true;
        }
      } else {
        // Plage de comptes : vérifier si le compte commence par un préfixe dans la plage
        // Ex: si plage = '43' à '44', accepter tous les comptes commençant par 43 ou 44
        // Utiliser la longueur du préfixe de début pour déterminer la granularité
        const prefixLength = mapping.compte_debut.length;
        const debutNum = parseInt(mapping.compte_debut);
        const finNum = parseInt(mapping.compte_fin);

        for (let prefix = debutNum; prefix <= finNum; prefix++) {
          const prefixStr = prefix.toString().padStart(prefixLength, '0');
          if (compte.startsWith(prefixStr)) {
            correspondance = true;
            break;
          }
        }
      }
    }

    // Vérifier les comptes spécifiques
    if (mapping.comptes_specifiques) {
      try {
        const comptesSpec = JSON.parse(mapping.comptes_specifiques);
        if (Array.isArray(comptesSpec)) {
          // Vérifier si le compte correspond exactement ou commence par un préfixe de la liste
          correspondance = comptesSpec.some(prefix =>
            compte === prefix || compte.startsWith(prefix)
          );
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    if (correspondance) {
      // Pour l'actif, on prend les soldes débiteurs (positifs)
      // Pour le passif, on prend les soldes créditeurs (négatifs) en valeur absolue
      if (mapping.section === 'ACTIF') {
        // Les comptes 28 (amortissements), 29, 39, 49 (dépréciations) sont soustractifs
        const estCompteDeductif = compte.startsWith('28') || compte.startsWith('29') ||
                                   compte.startsWith('39') || compte.startsWith('49');

        if (estCompteDeductif) {
          // Pour les comptes déductifs, on prend les soldes créditeurs (négatifs) en valeur négative
          montant += solde < 0 ? solde : 0;
        } else {
          // Pour les comptes normaux d'actif, on prend les soldes débiteurs (positifs)
          montant += solde > 0 ? solde : 0;
        }
      } else if (mapping.section === 'PASSIF') {
        montant += solde < 0 ? Math.abs(solde) : 0;
      }
    }
  }

  // Vérifier s'il faut inverser le signe pour l'affichage (lignes d'amortissement)
  if (mapping.comptes_specifiques) {
    try {
      const comptesSpec = JSON.parse(mapping.comptes_specifiques);
      if (comptesSpec?.inverser_signe) {
        console.log(`[INVERSER SIGNE] ${mapping.code_poste}: ${montant} → ${-montant}`);
        montant = -montant;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return montant;
}

/**
 * Obtenir le détail des comptes pour une ligne du bilan
 */
export async function getDetailLigne(params: {
  code_poste: string;
  exercice_id: number;
  date_cloture: string;
}): Promise<DetailLigneBilan> {
  // Charger les mappings (avec personnalisations)
  const allMappings = await loadMappings();

  // Trouver le mapping
  const mapping = allMappings.find(m => m.code_poste === params.code_poste);
  if (!mapping) {
    throw new Error(`Ligne bilan non trouvée: ${params.code_poste}`);
  }

  // Calculer la balance
  const balance = await calculerBalanceParCompte(
    params.exercice_id,
    params.date_cloture,
  );

  // Construire la liste des comptes avec leurs soldes
  const comptes: DetailCompte[] = [];
  let total = 0;

  // Vérifier si c'est le résultat de l'exercice
  let isResultatExercice = false;
  if (mapping.comptes_specifiques) {
    try {
      const comptesSpec = JSON.parse(mapping.comptes_specifiques);
      isResultatExercice = comptesSpec?.type === 'resultat_exercice';
    } catch (e) {
      // Ignore
    }
  }

  // Parcourir la balance et filtrer les comptes qui correspondent au mapping
  for (const [numeroCompte, solde] of balance.entries()) {
    let correspondance = false;

    // Vérifier si le compte correspond au mapping
    if (mapping.comptes_specifiques) {
      try {
        const comptesSpec = JSON.parse(mapping.comptes_specifiques);
        if (Array.isArray(comptesSpec)) {
          correspondance = comptesSpec.some(prefix =>
            numeroCompte === prefix || numeroCompte.startsWith(prefix)
          );
        } else if (isResultatExercice) {
          correspondance = numeroCompte.startsWith('6') || numeroCompte.startsWith('7');
        }
      } catch (e) {
        // Ignore
      }
    } else if (mapping.compte_debut && mapping.compte_fin) {
      if (mapping.compte_debut === mapping.compte_fin) {
        correspondance = numeroCompte.startsWith(mapping.compte_debut);
      } else {
        // Plage de comptes
        const prefixLength = mapping.compte_debut.length;
        const debutNum = parseInt(mapping.compte_debut);
        const finNum = parseInt(mapping.compte_fin);

        for (let prefix = debutNum; prefix <= finNum; prefix++) {
          const prefixStr = prefix.toString().padStart(prefixLength, '0');
          if (numeroCompte.startsWith(prefixStr)) {
            correspondance = true;
            break;
          }
        }
      }
    }

    if (!correspondance) continue;

    // Calculer le montant selon la section
    let montant = 0;

    if (isResultatExercice) {
      if (numeroCompte.startsWith('6')) {
        // Charges : débiteurs (positifs)
        montant = solde > 0 ? solde : 0;
      } else if (numeroCompte.startsWith('7')) {
        // Produits : créditeurs (négatifs) en valeur absolue
        montant = solde < 0 ? Math.abs(solde) : 0;
      }
    } else if (mapping.section === 'ACTIF') {
      const estCompteDeductif = numeroCompte.startsWith('28') || numeroCompte.startsWith('29') ||
                                 numeroCompte.startsWith('39') || numeroCompte.startsWith('49');

      if (estCompteDeductif) {
        montant = solde < 0 ? solde : 0;
      } else {
        montant = solde > 0 ? solde : 0;
      }
    } else if (mapping.section === 'PASSIF') {
      montant = solde < 0 ? Math.abs(solde) : 0;
    }

    if (montant !== 0) {
      // Récupérer le libellé du compte depuis IndexedDB
      const db = await getDB();
      const allComptes = await db.getAll('comptes');
      const compte = allComptes.find((c: any) => c.numeroCompte === numeroCompte || c.numero_compte === numeroCompte);

      comptes.push({
        numero_compte: numeroCompte,
        libelle: compte?.libelle || numeroCompte,
        solde: montant,
      });

      // Pour le résultat : Produits - Charges
      if (isResultatExercice && numeroCompte.startsWith('7')) {
        total += montant;
      } else if (isResultatExercice && numeroCompte.startsWith('6')) {
        total -= montant;
      } else {
        total += montant;
      }
    }
  }

  return {
    ligne_libelle: mapping.ligne_libelle,
    code_poste: mapping.code_poste || '',
    comptes,
    total,
    compte_debut: mapping.compte_debut,
    compte_fin: mapping.compte_fin,
    comptes_specifiques: mapping.comptes_specifiques,
  };
}

/**
 * Met à jour le mapping d'une ligne bilan (plage de comptes)
 */
export async function updateMapping(
  codePoste: string,
  compteDebut: string,
  compteFin: string,
): Promise<void> {
  const db = await getDB();

  // Trouver le mapping dans la liste par défaut
  const defaultMapping = BILAN_MAPPINGS.find(m => m.code_poste === codePoste);
  if (!defaultMapping) {
    throw new Error(`Mapping non trouvé pour le code poste: ${codePoste}`);
  }

  // Vérifier si une personnalisation existe déjà
  const existing = await db.get('bilan_mappings', codePoste);

  // Sauvegarder la personnalisation dans IndexedDB
  if (existing) {
    await db.put('bilan_mappings', {
      ...existing,
      compte_debut: compteDebut,
      compte_fin: compteFin,
    });
  } else {
    await db.put('bilan_mappings', {
      code_poste: codePoste,
      compte_debut: compteDebut,
      compte_fin: compteFin,
      // Copier les autres champs du mapping par défaut
      section: defaultMapping.section,
      ligne_libelle: defaultMapping.ligne_libelle,
      code_cerfa: defaultMapping.code_cerfa,
      niveau: defaultMapping.niveau,
      ordre_affichage: defaultMapping.ordre_affichage,
      comptes_specifiques: defaultMapping.comptes_specifiques,
      actif: defaultMapping.actif,
    });
  }

  console.log(`[MAPPING UPDATE] Sauvegardé: ${codePoste} → ${compteDebut} à ${compteFin}`);
}

/**
 * Réinitialise un mapping à sa valeur par défaut (supprime la personnalisation)
 */
export async function resetMapping(codePoste: string): Promise<void> {
  const db = await getDB();
  await db.delete('bilan_mappings', codePoste);
  console.log(`[MAPPING RESET] Réinitialisé: ${codePoste}`);
}
