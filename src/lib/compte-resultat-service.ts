/**
 * Service de calcul du Compte de Résultat pour PWA
 * Copié depuis backend/src/compte-resultat/compte-resultat.service.ts
 * Adapté pour utiliser IndexedDB au lieu de TypeORM
 */

import { getDB } from './indexedDB';
import { COMPTE_RESULTAT_MAPPINGS, CompteResultatMapping } from './compte-resultat-mappings';

export interface LigneCompteResultat {
  section: string;
  ligne_libelle: string;
  code_poste: string;
  code_cerfa?: string;
  niveau: number;
  montant_n: number;
  montant_n_1?: number;
  ordre_affichage: number;
  categorie: string;
}

export interface ResultatCompteResultat {
  produits_exploitation: LigneCompteResultat[];
  charges_exploitation: LigneCompteResultat[];
  resultat_exploitation: number;
  produits_financiers: LigneCompteResultat[];
  charges_financieres: LigneCompteResultat[];
  resultat_financier: number;
  resultat_courant_avant_impots: number;
  produits_exceptionnels: LigneCompteResultat[];
  charges_exceptionnelles: LigneCompteResultat[];
  resultat_exceptionnel: number;
  participation_salaries: number;
  impots_benefices: number;
  resultat_net: number;
  total_produits: number;
  total_charges: number;
}

// Cache pour éviter les calculs redondants et la récursion infinie
let calculCache = new Map<string, number>();

/**
 * Calculer le compte de résultat
 */
export async function calculerCompteResultat(params: {
  exercice_id: number;
  date_debut: string;
  date_fin: string;
}): Promise<ResultatCompteResultat> {
  const { exercice_id, date_debut, date_fin } = params;

  // Réinitialiser le cache de calcul pour chaque nouveau calcul
  calculCache.clear();

  // Utiliser les mappings
  const mappings = COMPTE_RESULTAT_MAPPINGS.filter(m => m.actif);

  // Calculer la balance pour l'exercice
  const balance = await calculerBalanceParCompte(exercice_id, date_debut, date_fin);

  // Construire les lignes du compte de résultat
  const lignes: LigneCompteResultat[] = [];

  for (const mapping of mappings) {
    const montant_n = calculerMontantLigne(mapping, balance, mappings);

    lignes.push({
      section: mapping.section,
      ligne_libelle: mapping.ligne_libelle,
      code_poste: mapping.code_poste || '',
      code_cerfa: mapping.code_cerfa,
      niveau: mapping.niveau,
      montant_n,
      ordre_affichage: mapping.ordre_affichage,
      categorie: mapping.categorie || '',
    });
  }

  // Séparer par catégorie
  const produits_exploitation = lignes.filter(
    (l) => l.section === 'PRODUITS' && l.categorie === 'EXPLOITATION',
  );
  const charges_exploitation = lignes.filter(
    (l) => l.section === 'CHARGES' && l.categorie === 'EXPLOITATION',
  );
  const produits_financiers = lignes.filter(
    (l) => l.section === 'PRODUITS' && l.categorie === 'FINANCIER',
  );
  const charges_financieres = lignes.filter(
    (l) => l.section === 'CHARGES' && l.categorie === 'FINANCIER',
  );
  const produits_exceptionnels = lignes.filter(
    (l) => l.section === 'PRODUITS' && l.categorie === 'EXCEPTIONNEL',
  );
  const charges_exceptionnelles = lignes.filter(
    (l) => l.section === 'CHARGES' && l.categorie === 'EXCEPTIONNEL',
  );

  // Calculer les résultats intermédiaires
  const ligneResultatExploitation = lignes.find((l) => l.code_poste === 'GG');
  const resultat_exploitation = ligneResultatExploitation ? ligneResultatExploitation.montant_n : 0;

  const ligneResultatFinancier = lignes.find((l) => l.code_poste === 'GV');
  const resultat_financier = ligneResultatFinancier ? ligneResultatFinancier.montant_n : 0;

  const ligneResultatCourant = lignes.find((l) => l.code_poste === 'GW');
  const resultat_courant_avant_impots = ligneResultatCourant ? ligneResultatCourant.montant_n : 0;

  const ligneResultatExceptionnel = lignes.find((l) => l.code_poste === 'HI');
  const resultat_exceptionnel = ligneResultatExceptionnel ? ligneResultatExceptionnel.montant_n : 0;

  const ligneParticipation = lignes.find((l) => l.code_poste === 'HJ');
  const participation_salaries = ligneParticipation ? ligneParticipation.montant_n : 0;

  const ligneImpots = lignes.find((l) => l.code_poste === 'HK');
  const impots_benefices = ligneImpots ? ligneImpots.montant_n : 0;

  const ligneResultatNet = lignes.find((l) => l.code_poste === 'HN');
  const resultat_net = ligneResultatNet ? ligneResultatNet.montant_n : 0;

  const ligneTotalProduits = lignes.find((l) => l.code_poste === 'HL');
  const total_produits = ligneTotalProduits ? ligneTotalProduits.montant_n : 0;

  const ligneTotalCharges = lignes.find((l) => l.code_poste === 'HM');
  const total_charges = ligneTotalCharges ? ligneTotalCharges.montant_n : 0;

  return {
    produits_exploitation,
    charges_exploitation,
    resultat_exploitation,
    produits_financiers,
    charges_financieres,
    resultat_financier,
    resultat_courant_avant_impots,
    produits_exceptionnels,
    charges_exceptionnelles,
    resultat_exceptionnel,
    participation_salaries,
    impots_benefices,
    resultat_net,
    total_produits,
    total_charges,
  };
}

/**
 * Calculer la balance par compte pour une période donnée
 */
async function calculerBalanceParCompte(
  exercice_id: number,
  date_debut: string,
  date_fin: string,
): Promise<Map<string, number>> {
  const db = await getDB();

  // Récupérer toutes les écritures dans la période
  const allEcritures = await db.getAll('ecritures');
  const ecritures = allEcritures.filter((e: any) => {
    const ecritureExerciceId = e.exerciceId || e.exercice_id;
    if (ecritureExerciceId !== exercice_id) return false;
    if (e.date < date_debut || e.date > date_fin) return false;
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
    // Pour le CR : crédit - débit (les produits sont au crédit, les charges au débit)
    balance.set(numeroCompte, solde + credit - debit);
  }

  return balance;
}

/**
 * Calculer le montant d'une ligne du compte de résultat
 */
function calculerMontantLigne(
  mapping: CompteResultatMapping,
  balance: Map<string, number>,
  allMappings: CompteResultatMapping[],
): number {
  // Vérifier le cache pour éviter la récursion infinie
  const cacheKey = mapping.code_poste;
  if (calculCache.has(cacheKey)) {
    return calculCache.get(cacheKey)!;
  }

  // Mettre 0 temporairement dans le cache pour détecter les boucles
  calculCache.set(cacheKey, 0);

  let montant = 0;

  // Cas spécial : calculs (sommes, différences, etc.)
  if (mapping.comptes_specifiques) {
    try {
      const comptesSpec = JSON.parse(mapping.comptes_specifiques);

      // Cas spécial : Somme de lignes (pour les totaux/sous-totaux)
      if (comptesSpec?.type === 'somme_lignes' && Array.isArray(comptesSpec?.codes)) {
        let somme = 0;
        for (const code of comptesSpec.codes) {
          const ligneMapping = allMappings.find(
            (m) => m.code_cerfa === code || m.code_poste === code,
          );
          if (ligneMapping) {
            somme += calculerMontantLigne(ligneMapping, balance, allMappings);
          }
        }
        calculCache.set(cacheKey, somme);
        return somme;
      }

      // Cas spécial : Différence de lignes
      if (comptesSpec?.type === 'difference_lignes' && comptesSpec?.base && comptesSpec?.soustrait) {
        const baseMapping = allMappings.find(
          (m) => m.code_cerfa === comptesSpec.base || m.code_poste === comptesSpec.base,
        );
        const soustraitMapping = allMappings.find(
          (m) => m.code_cerfa === comptesSpec.soustrait || m.code_poste === comptesSpec.soustrait,
        );

        const baseValue = baseMapping ? calculerMontantLigne(baseMapping, balance, allMappings) : 0;
        const soustraitValue = soustraitMapping
          ? calculerMontantLigne(soustraitMapping, balance, allMappings)
          : 0;

        montant = baseValue - soustraitValue;
        calculCache.set(cacheKey, montant);
        return montant;
      }

      // Si c'est un tableau de comptes spécifiques (pas un objet avec type)
      if (Array.isArray(comptesSpec)) {
        for (const [compte, solde] of balance.entries()) {
          const correspondance = comptesSpec.some(
            (prefix: string) => compte === prefix || compte.startsWith(prefix),
          );
          if (correspondance) {
            const contribution = Math.abs(solde);
            montant += contribution;
          }
        }
        calculCache.set(cacheKey, montant);
        return montant;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

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
        // Plage de comptes : vérifier si le compte est dans la plage
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

    if (correspondance) {
      // Pour le CR : on prend la valeur absolue du solde quel que soit le sens
      const contribution = Math.abs(solde);
      montant += contribution;
    }
  }

  // Mettre en cache et retourner
  calculCache.set(cacheKey, montant);
  return montant;
}
