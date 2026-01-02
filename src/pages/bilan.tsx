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

interface BilanData {
  actif: {
    immobilisations: number;
    stocks: number;
    creances: number;
    disponibilites: number;
    total: number;
  };
  passif: {
    capitaux: number;
    provisions: number;
    dettes: number;
    total: number;
  };
  details: {
    immobilisations: CompteDetail[];
    stocks: CompteDetail[];
    creances: CompteDetail[];
    disponibilites: CompteDetail[];
    capitaux: CompteDetail[];
    provisions: CompteDetail[];
    dettes: CompteDetail[];
    resultat: CompteDetail[];
  };
}

export default function BilanPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [bilan, setBilan] = useState<BilanData | null>(null);
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
      calculerBilan();
    }
  }, [entreprise, exercice, comptes]);

  const calculerBilan = async () => {
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
          soldesParCompte[compte] += Number(ligne.debit) - Number(ligne.credit);
        });
      });

      // Regrouper par grandes catégories
      let immobilisations = 0;
      let stocks = 0;
      let creances = 0;
      let disponibilites = 0;
      let capitaux = 0;
      let provisions = 0;
      let dettes = 0;
      let resultatExercice = 0;

      const detailsImmobilisations: CompteDetail[] = [];
      const detailsStocks: CompteDetail[] = [];
      const detailsCreances: CompteDetail[] = [];
      const detailsDisponibilites: CompteDetail[] = [];
      const detailsCapitaux: CompteDetail[] = [];
      const detailsProvisions: CompteDetail[] = [];
      const detailsDettes: CompteDetail[] = [];
      const detailsResultat: CompteDetail[] = [];

      const getCompteLibelle = (numero: string) => {
        const compte = comptes.find(c => c.numero_compte === numero);
        if (!compte) {
          console.log(`Compte ${numero} non trouvé dans`, comptes.map(c => c.numero_compte));
        }
        return compte?.libelle || 'Compte inconnu';
      };

      Object.entries(soldesParCompte).forEach(([compte, solde]) => {
        const libelle = getCompteLibelle(compte);

        // ACTIF (solde débiteur = positif)
        if (compte.startsWith('2')) {
          immobilisations += solde;
          detailsImmobilisations.push({ numero: compte, libelle, solde });
        } else if (compte.startsWith('3')) {
          stocks += solde;
          detailsStocks.push({ numero: compte, libelle, solde });
        } else if (compte.startsWith('41') || compte.startsWith('42') || compte.startsWith('43')) {
          creances += solde;
          detailsCreances.push({ numero: compte, libelle, solde });
        } else if (compte.startsWith('5')) {
          disponibilites += solde;
          detailsDisponibilites.push({ numero: compte, libelle, solde });
        }

        // PASSIF (solde créditeur = négatif, donc on inverse le signe)
        else if (compte.startsWith('1') && !compte.startsWith('12')) {
          capitaux += -solde;
          detailsCapitaux.push({ numero: compte, libelle, solde: -solde });
        } else if (compte.startsWith('12')) {
          capitaux += -solde;
          detailsCapitaux.push({ numero: compte, libelle, solde: -solde });
        } else if (compte.startsWith('15')) {
          provisions += -solde;
          detailsProvisions.push({ numero: compte, libelle, solde: -solde });
        } else if (compte.startsWith('4')) {
          if (!compte.startsWith('41') && !compte.startsWith('42') && !compte.startsWith('43')) {
            dettes += -solde;
            detailsDettes.push({ numero: compte, libelle, solde: -solde });
          }
        }

        // Résultat de l'exercice (classe 6 et 7)
        else if (compte.startsWith('6')) {
          resultatExercice -= solde;
          detailsResultat.push({ numero: compte, libelle, solde: -solde });
        } else if (compte.startsWith('7')) {
          resultatExercice -= solde;
          detailsResultat.push({ numero: compte, libelle, solde: -solde });
        }
      });

      // Ajouter le résultat de l'exercice aux capitaux propres
      capitaux += resultatExercice;

      const bilanData: BilanData = {
        actif: {
          immobilisations,
          stocks,
          creances,
          disponibilites,
          total: immobilisations + stocks + creances + disponibilites,
        },
        passif: {
          capitaux,
          provisions,
          dettes,
          total: capitaux + provisions + dettes,
        },
        details: {
          immobilisations: detailsImmobilisations,
          stocks: detailsStocks,
          creances: detailsCreances,
          disponibilites: detailsDisponibilites,
          capitaux: detailsCapitaux,
          provisions: detailsProvisions,
          dettes: detailsDettes,
          resultat: detailsResultat,
        },
      };

      setBilan(bilanData);
    } catch (err) {
      console.error('Erreur calcul bilan:', err);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bilan Comptable</h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
            </p>
          </div>

          {/* Bilan */}
          {bilan && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ACTIF */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                  <h3 className="text-xl font-bold">ACTIF</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  <div
                    className="p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'immobilisations' ? null : 'immobilisations')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'immobilisations' ? '▼' : '▶'} Immobilisations
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {bilan.actif.immobilisations.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Classe 2</p>
                    {expandedSection === 'immobilisations' && bilan.details.immobilisations.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {bilan.details.immobilisations.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-blue-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-blue-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'stocks' ? null : 'stocks')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'stocks' ? '▼' : '▶'} Stocks
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {bilan.actif.stocks.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Classe 3</p>
                    {expandedSection === 'stocks' && bilan.details.stocks.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {bilan.details.stocks.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-blue-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-blue-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'creances' ? null : 'creances')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'creances' ? '▼' : '▶'} Créances
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {bilan.actif.creances.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Clients et autres</p>
                    {expandedSection === 'creances' && bilan.details.creances.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {bilan.details.creances.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-blue-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-blue-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'disponibilites' ? null : 'disponibilites')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'disponibilites' ? '▼' : '▶'} Disponibilités
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {bilan.actif.disponibilites.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Banque, caisse</p>
                    {expandedSection === 'disponibilites' && bilan.details.disponibilites.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {bilan.details.disponibilites.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-blue-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-blue-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-blue-50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-900 text-lg">TOTAL ACTIF</span>
                      <span className="font-mono font-bold text-xl text-blue-900">
                        {bilan.actif.total.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASSIF */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
                  <h3 className="text-xl font-bold">PASSIF</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  <div
                    className="p-4 hover:bg-green-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'capitaux' ? null : 'capitaux')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'capitaux' ? '▼' : '▶'} Capitaux propres
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {bilan.passif.capitaux.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Classe 1 + Résultat</p>
                    {expandedSection === 'capitaux' && (
                      <div className="mt-3 ml-6 space-y-1">
                        {bilan.details.capitaux.map((compte) => (
                          <div
                            key={compte.numero}
                            className="flex justify-between text-sm py-1 hover:bg-green-100 px-2 rounded cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                          >
                            <span className="text-green-600 font-mono">{compte.numero} - {compte.libelle}</span>
                            <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                          </div>
                        ))}
                        {bilan.details.resultat.length > 0 && (
                          <>
                            <div className="text-xs font-semibold text-gray-600 mt-2 mb-1">Résultat de l'exercice:</div>
                            {bilan.details.resultat.map((compte) => (
                              <div
                                key={compte.numero}
                                className="flex justify-between text-sm py-1 hover:bg-green-100 px-2 rounded cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); router.push(`/comptes/${compte.numero}`); }}
                              >
                                <span className="text-green-600 font-mono">{compte.numero} - {compte.libelle}</span>
                                <span className="font-mono">{compte.solde.toFixed(2)} €</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className="p-4 hover:bg-green-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedSection(expandedSection === 'provisions' ? null : 'provisions')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'provisions' ? '▼' : '▶'} Provisions
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {bilan.passif.provisions.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Compte 15</p>
                    {expandedSection === 'provisions' && bilan.details.provisions.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {bilan.details.provisions.map((compte) => (
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
                    onClick={() => setExpandedSection(expandedSection === 'dettes' ? null : 'dettes')}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        {expandedSection === 'dettes' ? '▼' : '▶'} Dettes
                      </span>
                      <span className="font-mono text-lg text-gray-900">
                        {bilan.passif.dettes.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">Fournisseurs et autres</p>
                    {expandedSection === 'dettes' && bilan.details.dettes.length > 0 && (
                      <div className="mt-3 ml-6 space-y-1">
                        {bilan.details.dettes.map((compte) => (
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
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">-</span>
                      <span className="font-mono text-lg text-gray-900">-</span>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-900 text-lg">TOTAL PASSIF</span>
                      <span className="font-mono font-bold text-xl text-green-900">
                        {bilan.passif.total.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message d'équilibre */}
          {bilan && (
            <div className="mt-6">
              {Math.abs(bilan.actif.total - bilan.passif.total) < 0.01 ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 flex items-center gap-2">
                    ✅ <span className="font-medium">Bilan équilibré</span>
                    <span className="text-sm">(Actif = Passif)</span>
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 flex items-center gap-2">
                    ⚠️ <span className="font-medium">Bilan déséquilibré</span>
                    <span className="text-sm">
                      Différence : {Math.abs(bilan.actif.total - bilan.passif.total).toFixed(2)} €
                    </span>
                  </p>
                </div>
              )}
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
