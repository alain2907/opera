// Plan comptable simplifié français
export const PLAN_COMPTABLE = {
  // Classe 1 - Capitaux
  '101000': 'Capital',
  '106000': 'Réserves',
  '108000': 'Compte de l\'exploitant',
  '120000': 'Résultat de l\'exercice',
  '164000': 'Emprunts bancaires',

  // Classe 2 - Immobilisations
  '205000': 'Concessions et droits similaires',
  '206000': 'Droit au bail',
  '211800': 'Matériel de bureau',
  '218300': 'Matériel informatique',
  '218400': 'Mobilier',
  '281000': 'Amortissements immobilisations incorporelles',
  '281800': 'Amortissements matériel de bureau',
  '281830': 'Amortissements matériel informatique',

  // Classe 4 - Tiers
  '401000': 'Fournisseurs',
  '408000': 'Fournisseurs - Factures non parvenues',
  '411000': 'Clients',
  '416000': 'Clients douteux',
  '419000': 'Clients - Avances reçues',
  '421000': 'Personnel - Rémunérations dues',
  '425000': 'Personnel - Avances',
  '431000': 'Sécurité sociale',
  '437000': 'Autres organismes sociaux',
  '441000': 'État - Subventions à recevoir',
  '443000': 'Opérations particulières avec l\'État',
  '445000': 'État - Crédit de TVA',
  '445100': 'État - TVA due',
  '445200': 'État - TVA déductible',
  '445620': 'TVA déductible sur immobilisations',
  '445660': 'TVA déductible sur ABS',
  '445710': 'TVA collectée',
  '447000': 'Autres impôts et taxes',
  '455000': 'Associés - Comptes courants',
  '467000': 'Autres comptes débiteurs ou créditeurs',

  // Classe 5 - Financier
  '512000': 'Banque',
  '530000': 'Caisse',

  // Classe 6 - Charges
  '601000': 'Achats - Matières premières',
  '606000': 'Achats non stockés',
  '607000': 'Achats de marchandises',
  '611000': 'Sous-traitance générale',
  '613000': 'Locations',
  '615000': 'Entretien et réparations',
  '616000': 'Primes d\'assurances',
  '618000': 'Documentation',
  '621000': 'Personnel extérieur',
  '622000': 'Rémunération d\'intermédiaires',
  '623000': 'Publicité',
  '624000': 'Transports de biens',
  '625000': 'Déplacements, missions',
  '626000': 'Frais postaux',
  '627000': 'Services bancaires',
  '641000': 'Rémunérations du personnel',
  '645000': 'Charges de sécurité sociale',
  '647000': 'Autres charges sociales',
  '661000': 'Charges d\'intérêts',
  '681000': 'Dotations aux amortissements',

  // Classe 7 - Produits
  '701000': 'Ventes de produits finis',
  '706000': 'Prestations de services',
  '707000': 'Ventes de marchandises',
  '708000': 'Produits des activités annexes',
  '771000': 'Produits exceptionnels',
};

export const searchCompte = (query: string): Array<{ code: string; libelle: string }> => {
  const q = query.toLowerCase();
  return Object.entries(PLAN_COMPTABLE)
    .filter(([code, libelle]) =>
      code.startsWith(query) || libelle.toLowerCase().includes(q)
    )
    .map(([code, libelle]) => ({ code, libelle }))
    .slice(0, 10);
};

export const getLibelleCompte = (code: string): string => {
  return PLAN_COMPTABLE[code as keyof typeof PLAN_COMPTABLE] || '';
};
