import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { ecrituresApi, type Ecriture } from '../api/ecritures';
import { comptesApi, type Compte } from '../api/comptes';
import { useEntreprise } from '../contexts/EntrepriseContext';

interface CompteDetail {
  numero: string;
  libelle: string;
  solde: number;
}

interface ResultatData {
  charges: {
    achats: number;
    autresChargesExternes: number;
    impotsTaxes: number;
    salaires: number;
    chargesSociales: number;
    dotationsAmortissements: number;
    autresCharges: number;
    total: number;
  };
  produits: {
    ventes: number;
    productionStockee: number;
    subventions: number;
    autresProduits: number;
    total: number;
  };
  resultat: number;
  details: {
    achats: CompteDetail[];
    autresChargesExternes: CompteDetail[];
    impotsTaxes: CompteDetail[];
    salaires: CompteDetail[];
    chargesSociales: CompteDetail[];
    dotationsAmortissements: CompteDetail[];
    autresCharges: CompteDetail[];
    ventes: CompteDetail[];
    productionStockee: CompteDetail[];
    subventions: CompteDetail[];
    autresProduits: CompteDetail[];
  };
}

export default function ResultatPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [resultat, setResultat] = useState<ResultatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
    }
  }, [entreprise, router]);

  useEffect(() => {
    if (entreprise) {
      loadComptes(entreprise.id);
    }
  }, [entreprise]);

  const loadComptes = async (id: number) => {
    try {
      const data = await comptesApi.findByEntreprise(id);
      setComptes(data);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    }
  };

  useEffect(() => {
    if (entreprise && exercice && comptes.length > 0) {
      calculerResultat();
    }
  }, [entreprise, exercice, comptes]);

  const calculerResultat = async () => {
    if (!entreprise || !exercice) return;

    setLoading(true);
    try {
      const ecritures = await ecrituresApi.getAll(entreprise.id, exercice.id);

      // Calculer les soldes par compte
      const soldesParCompte: { [key: string]: number } = {};

      ecritures.forEach((ecriture: Ecriture) => {
        ecriture.lignes.forEach((ligne) => {
          const compte = ligne.numero_compte;
          if (!soldesParCompte[compte]) {
            soldesParCompte[compte] = 0;
          }
          // Pour le compte de résultat, on calcule : crédit - débit
          // Les produits (classe 7) sont au crédit
          // Les charges (classe 6) sont au débit
          soldesParCompte[compte] += Number(ligne.credit) - Number(ligne.debit);
        });
      });

      // Regrouper par catégories
      let achats = 0;
      let autresChargesExternes = 0;
      let impotsTaxes = 0;
      let salaires = 0;
      let chargesSociales = 0;
      let dotationsAmortissements = 0;
      let autresCharges = 0;
      let ventes = 0;
      let productionStockee = 0;
      let subventions = 0;
      let autresProduits = 0;

      const detailsAchats: CompteDetail[] = [];
      const detailsAutresChargesExternes: CompteDetail[] = [];
      const detailsImpotsTaxes: CompteDetail[] = [];
      const detailsSalaires: CompteDetail[] = [];
      const detailsChargesSociales: CompteDetail[] = [];
      const detailsDotationsAmortissements: CompteDetail[] = [];
      const detailsAutresCharges: CompteDetail[] = [];
      const detailsVentes: CompteDetail[] = [];
      const detailsProductionStockee: CompteDetail[] = [];
      const detailsSubventions: CompteDetail[] = [];
      const detailsAutresProduits: CompteDetail[] = [];

      const getCompteLibelle = (numero: string) => {
        const compte = comptes.find(c => c.numero_compte === numero);
        return compte?.libelle || 'Compte inconnu';
      };

      Object.entries(soldesParCompte).forEach(([compte, solde]) => {
        const libelle = getCompteLibelle(compte);
        const montant = Math.abs(solde);

        // CHARGES (classe 6) - solde négatif à inverser
        if (compte.startsWith('60')) {
          achats += montant;
          detailsAchats.push({ numero: compte, libelle, solde: montant });
        } else if (compte.startsWith('61') || compte.startsWith('62')) {
          autresChargesExternes += montant;
          detailsAutresChargesExternes.push({ numero: compte, libelle, solde: montant });
        } else if (compte.startsWith('63')) {
          impotsTaxes += montant;
          detailsImpotsTaxes.push({ numero: compte, libelle, solde: montant });
        } else if (compte.startsWith('641')) {
          salaires += montant;
          detailsSalaires.push({ numero: compte, libelle, solde: montant });
        } else if (compte.startsWith('645')) {
          chargesSociales += montant;
          detailsChargesSociales.push({ numero: compte, libelle, solde: montant });
        } else if (compte.startsWith('68')) {
          dotationsAmortissements += montant;
          detailsDotationsAmortissements.push({ numero: compte, libelle, solde: montant });
        } else if (compte.startsWith('6')) {
          autresCharges += montant;
          detailsAutresCharges.push({ numero: compte, libelle, solde: montant });
        }

        // PRODUITS (classe 7) - solde positif
        else if (compte.startsWith('70') || compte.startsWith('706') || compte.startsWith('707')) {
          ventes += solde;
          detailsVentes.push({ numero: compte, libelle, solde });
        } else if (compte.startsWith('71') || compte.startsWith('72')) {
          productionStockee += solde;
          detailsProductionStockee.push({ numero: compte, libelle, solde });
        } else if (compte.startsWith('74')) {
          subventions += solde;
          detailsSubventions.push({ numero: compte, libelle, solde });
        } else if (compte.startsWith('7')) {
          autresProduits += solde;
          detailsAutresProduits.push({ numero: compte, libelle, solde });
        }
      });

      const totalCharges = achats + autresChargesExternes + impotsTaxes + salaires + chargesSociales + dotationsAmortissements + autresCharges;
      const totalProduits = ventes + productionStockee + subventions + autresProduits;
      const resultatNet = totalProduits - totalCharges;

      const resultatData: ResultatData = {
        charges: {
          achats,
          autresChargesExternes,
          impotsTaxes,
          salaires,
          chargesSociales,
          dotationsAmortissements,
          autresCharges,
          total: totalCharges,
        },
        produits: {
          ventes,
          productionStockee,
          subventions,
          autresProduits,
          total: totalProduits,
        },
        resultat: resultatNet,
        details: {
          achats: detailsAchats,
          autresChargesExternes: detailsAutresChargesExternes,
          impotsTaxes: detailsImpotsTaxes,
          salaires: detailsSalaires,
          chargesSociales: detailsChargesSociales,
          dotationsAmortissements: detailsDotationsAmortissements,
          autresCharges: detailsAutresCharges,
          ventes: detailsVentes,
          productionStockee: detailsProductionStockee,
          subventions: detailsSubventions,
          autresProduits: detailsAutresProduits,
        },
      };

      setResultat(resultatData);
    } catch (err) {
      console.error('Erreur calcul résultat:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!entreprise) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => router.push(`/dashboard/${entreprise.id}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Compte de Résultat</h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
            </p>
          </div>

          {/* Compte de résultat */}
          {resultat && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CHARGES */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
                  <h3 className="text-xl font-bold">CHARGES</h3>
                  <p className="text-sm opacity-90">Classe 6</p>
                </div>
                <div className="divide-y divide-gray-200">
                  <div
                    className="p-4 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'achats' ? null : 'achats')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'achats' ? '▼' : '▶'} Achats
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.charges.achats.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Compte 60</p>
                    {expandedSection === 'achats' && resultat.details.achats.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.achats.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-red-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-red-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'autresChargesExternes' ? null : 'autresChargesExternes')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'autresChargesExternes' ? '▼' : '▶'} Autres charges externes
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.charges.autresChargesExternes.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Comptes 61-62</p>
                    {expandedSection === 'autresChargesExternes' && resultat.details.autresChargesExternes.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.autresChargesExternes.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-red-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-red-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'impotsTaxes' ? null : 'impotsTaxes')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'impotsTaxes' ? '▼' : '▶'} Impôts et taxes
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.charges.impotsTaxes.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Compte 63</p>
                    {expandedSection === 'impotsTaxes' && resultat.details.impotsTaxes.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.impotsTaxes.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-red-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-red-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'salaires' ? null : 'salaires')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'salaires' ? '▼' : '▶'} Salaires
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.charges.salaires.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Compte 641</p>
                    {expandedSection === 'salaires' && resultat.details.salaires.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.salaires.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-red-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-red-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'chargesSociales' ? null : 'chargesSociales')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'chargesSociales' ? '▼' : '▶'} Charges sociales
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.charges.chargesSociales.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Compte 645</p>
                    {expandedSection === 'chargesSociales' && resultat.details.chargesSociales.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.chargesSociales.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-red-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-red-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'dotationsAmortissements' ? null : 'dotationsAmortissements')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'dotationsAmortissements' ? '▼' : '▶'} Dotations amortissements
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.charges.dotationsAmortissements.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Compte 68</p>
                    {expandedSection === 'dotationsAmortissements' && resultat.details.dotationsAmortissements.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.dotationsAmortissements.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-red-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-red-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-red-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'autresCharges' ? null : 'autresCharges')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'autresCharges' ? '▼' : '▶'} Autres charges
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.charges.autresCharges.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Autres comptes 6</p>
                    {expandedSection === 'autresCharges' && resultat.details.autresCharges.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.autresCharges.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-red-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-red-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-red-50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-900 text-lg">TOTAL CHARGES</span>
                      <span className="font-mono font-bold text-xl text-red-900">
                        {resultat.charges.total.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRODUITS */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
                  <h3 className="text-xl font-bold">PRODUITS</h3>
                  <p className="text-sm opacity-90">Classe 7</p>
                </div>
                <div className="divide-y divide-gray-200">
                  <div
                    className="p-4 hover:bg-green-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'ventes' ? null : 'ventes')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'ventes' ? '▼' : '▶'} Ventes
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.produits.ventes.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Compte 70</p>
                    {expandedSection === 'ventes' && resultat.details.ventes.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.ventes.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-green-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-green-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-green-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'productionStockee' ? null : 'productionStockee')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'productionStockee' ? '▼' : '▶'} Production stockée
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.produits.productionStockee.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Comptes 71-72</p>
                    {expandedSection === 'productionStockee' && resultat.details.productionStockee.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.productionStockee.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-green-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-green-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-green-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'subventions' ? null : 'subventions')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'subventions' ? '▼' : '▶'} Subventions
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.produits.subventions.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Compte 74</p>
                    {expandedSection === 'subventions' && resultat.details.subventions.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.subventions.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-green-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-green-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-green-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'autresProduits' ? null : 'autresProduits')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'autresProduits' ? '▼' : '▶'} Autres produits
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {resultat.produits.autresProduits.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Autres comptes 7</p>
                    {expandedSection === 'autresProduits' && resultat.details.autresProduits.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {resultat.details.autresProduits.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-green-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-green-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 hover:bg-gray-50 invisible">
                    <div className="h-10"></div>
                  </div>
                  <div className="p-4 hover:bg-gray-50 invisible">
                    <div className="h-10"></div>
                  </div>
                  <div className="p-4 hover:bg-gray-50 invisible">
                    <div className="h-10"></div>
                  </div>
                  <div className="p-4 bg-green-50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-900 text-lg">TOTAL PRODUITS</span>
                      <span className="font-mono font-bold text-xl text-green-900">
                        {resultat.produits.total.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Résultat */}
          {resultat && (
            <div className="mt-6">
              <div className={`p-6 rounded-lg border-2 ${
                resultat.resultat >= 0
                  ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300'
                  : 'bg-gradient-to-r from-red-50 to-red-100 border-red-300'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`text-2xl font-bold ${resultat.resultat >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {resultat.resultat >= 0 ? 'BÉNÉFICE' : 'PERTE'}
                    </h3>
                    <p className={`text-sm ${resultat.resultat >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      Résultat de l'exercice
                    </p>
                  </div>
                  <div className={`text-right font-mono font-bold text-4xl ${resultat.resultat >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {resultat.resultat.toFixed(2)} €
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-opacity-30 text-sm">
                  <p className={resultat.resultat >= 0 ? 'text-green-800' : 'text-red-800'}>
                    Produits : {resultat.produits.total.toFixed(2)} € - Charges : {resultat.charges.total.toFixed(2)} €
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📄 Imprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
