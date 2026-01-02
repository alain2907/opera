import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../../components/TopMenu';
import { ecrituresApi, type Ecriture } from '../../api/ecritures';
import { comptesApi, type Compte } from '../../api/comptes';
import { useEntreprise } from '../../contexts/EntrepriseContext';
import { exportToCsv, formatDateForFilename } from '../../utils/csvExport';

interface LigneBalance {
  numero_compte: string;
  libelle: string;
  debitTotal: number;
  creditTotal: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export default function BalancePage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [balance, setBalance] = useState<LigneBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [filterClasse, setFilterClasse] = useState<string>('');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [filterCompteDebut, setFilterCompteDebut] = useState<string>('');
  const [filterCompteFin, setFilterCompteFin] = useState<string>('');

  // Lire les paramètres URL au chargement
  useEffect(() => {
    if (router.isReady) {
      const { dateDebut: urlDateDebut, dateFin: urlDateFin, classe, compteDebut, compteFin } = router.query;

      if (urlDateDebut && typeof urlDateDebut === 'string') setDateDebut(urlDateDebut);
      if (urlDateFin && typeof urlDateFin === 'string') setDateFin(urlDateFin);
      if (classe && typeof classe === 'string') setFilterClasse(classe);
      if (compteDebut && typeof compteDebut === 'string') setFilterCompteDebut(compteDebut);
      if (compteFin && typeof compteFin === 'string') setFilterCompteFin(compteFin);
    }
  }, [router.isReady, router.query]);

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

  useEffect(() => {
    if (exercice && !dateDebut && !dateFin) {
      setDateDebut(exercice.date_debut);
      setDateFin(exercice.date_fin);
    }
  }, [exercice]);

  useEffect(() => {
    if (entreprise && exercice && comptes.length > 0 && dateDebut && dateFin) {
      calculerBalance();
    }
  }, [entreprise, exercice, comptes, dateDebut, dateFin]);

  const updateUrlParams = (params: Partial<{
    dateDebut: string;
    dateFin: string;
    classe: string;
    compteDebut: string;
    compteFin: string;
  }>) => {
    const currentQuery = { ...router.query };

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        currentQuery[key] = value;
      } else {
        delete currentQuery[key];
      }
    });

    router.push({
      pathname: router.pathname,
      query: currentQuery
    }, undefined, { shallow: true });
  };

  const loadComptes = async (id: number) => {
    try {
      const data = await comptesApi.getAll(id);
      setComptes(data);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    }
  };

  const calculerBalance = async () => {
    if (!entreprise || !exercice) return;

    setLoading(true);
    try {
      const ecritures = await ecrituresApi.getAll(entreprise.id, exercice.id);

      const totauxParCompte: { [key: string]: { debit: number; credit: number } } = {};

      // Filtrer par période (comparaison en string pour éviter les problèmes de timezone)
      ecritures
        .filter((ecriture: Ecriture) => {
          const dateStr = ecriture.date_ecriture.substring(0, 10); // YYYY-MM-DD
          return dateStr >= dateDebut && dateStr <= dateFin;
        })
        .forEach((ecriture: Ecriture) => {
          ecriture.lignes.forEach((ligne) => {
            const compte = ligne.numero_compte;
            if (!totauxParCompte[compte]) {
              totauxParCompte[compte] = { debit: 0, credit: 0 };
            }
            totauxParCompte[compte].debit += Number(ligne.debit) || 0;
            totauxParCompte[compte].credit += Number(ligne.credit) || 0;
          });
        });

      const balanceData: LigneBalance[] = Object.keys(totauxParCompte)
        .sort()
        .map((numeroCompte) => {
          const totaux = totauxParCompte[numeroCompte];
          const solde = totaux.debit - totaux.credit;

          const compte = comptes.find(c => c.numero_compte === numeroCompte);
          const libelle = compte?.libelle || 'Compte inconnu';

          return {
            numero_compte: numeroCompte,
            libelle,
            debitTotal: totaux.debit,
            creditTotal: totaux.credit,
            soldeDebiteur: solde > 0 ? solde : 0,
            soldeCrediteur: solde < 0 ? Math.abs(solde) : 0,
          };
        })
        .filter(ligne => ligne.debitTotal !== 0 || ligne.creditTotal !== 0);

      setBalance(balanceData);
    } catch (err) {
      console.error('Erreur calcul balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBalance = balance.filter(ligne => {
    // Filtre par classe
    if (filterClasse && !ligne.numero_compte.startsWith(filterClasse)) {
      return false;
    }

    // Filtre par plage de comptes (basé sur le premier chiffre = classe comptable)
    if (filterCompteDebut || filterCompteFin) {
      const classeCompte = ligne.numero_compte[0];
      if (filterCompteDebut && classeCompte < filterCompteDebut) {
        return false;
      }
      if (filterCompteFin && classeCompte > filterCompteFin) {
        return false;
      }
    }

    return true;
  });

  const totaux = filteredBalance.reduce(
    (acc, ligne) => ({
      debit: acc.debit + ligne.debitTotal,
      credit: acc.credit + ligne.creditTotal,
      soldeDebiteur: acc.soldeDebiteur + ligne.soldeDebiteur,
      soldeCrediteur: acc.soldeCrediteur + ligne.soldeCrediteur,
    }),
    { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 }
  );

  const handleExportCsv = () => {
    const csvData = filteredBalance.map(ligne => ({
      'Compte': ligne.numero_compte,
      'Libellé': ligne.libelle,
      'Débit': ligne.debitTotal,
      'Crédit': ligne.creditTotal,
      'Solde Débiteur': ligne.soldeDebiteur,
      'Solde Créditeur': ligne.soldeCrediteur,
    }));

    // Ajouter la ligne de totaux
    csvData.push({
      'Compte': 'TOTAUX',
      'Libellé': '',
      'Débit': totaux.debit,
      'Crédit': totaux.credit,
      'Solde Débiteur': totaux.soldeDebiteur,
      'Solde Créditeur': totaux.soldeCrediteur,
    });

    const filename = `balance_${entreprise?.raison_sociale.replace(/\s/g, '_')}_${formatDateForFilename()}.csv`;
    exportToCsv(csvData, filename);
  };

  const handleCompteClick = (numeroCompte: string) => {
    router.push(`/comptes/${numeroCompte}`);
  };

  if (!entreprise) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="flex items-center justify-center h-full p-8">
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Balance Comptable</h2>
              <p className="text-gray-600">
                {entreprise.raison_sociale} - Exercice {exercice && new Date(exercice.date_debut).getFullYear()}
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              title="Exporter en CSV"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exporter CSV
            </button>
          </div>

          {/* Filtres */}
          <div className="mb-6 space-y-4">
            {/* Période */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => {
                    setDateDebut(e.target.value);
                    updateUrlParams({ dateDebut: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => {
                    setDateFin(e.target.value);
                    updateUrlParams({ dateFin: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Classe de comptes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classe de comptes</label>
              <select
                value={filterClasse}
                onChange={(e) => {
                  setFilterClasse(e.target.value);
                  updateUrlParams({ classe: e.target.value });
                  // Auto-remplir la plage de comptes selon la classe
                  if (e.target.value) {
                    setFilterCompteDebut(e.target.value);
                    setFilterCompteFin(e.target.value + '9999999');
                    updateUrlParams({
                      classe: e.target.value,
                      compteDebut: e.target.value,
                      compteFin: e.target.value + '9999999'
                    });
                  } else {
                    setFilterCompteDebut('');
                    setFilterCompteFin('');
                    updateUrlParams({ classe: '', compteDebut: '', compteFin: '' });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les classes</option>
                <option value="1">Classe 1 - Capitaux</option>
                <option value="2">Classe 2 - Immobilisations</option>
                <option value="3">Classe 3 - Stocks</option>
                <option value="4">Classe 4 - Tiers</option>
                <option value="5">Classe 5 - Financiers</option>
                <option value="6">Classe 6 - Charges</option>
                <option value="7">Classe 7 - Produits</option>
              </select>
            </div>

            {/* Plage de comptes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Du compte</label>
                <input
                  type="text"
                  value={filterCompteDebut}
                  onChange={(e) => {
                    setFilterCompteDebut(e.target.value);
                    updateUrlParams({ compteDebut: e.target.value });
                  }}
                  placeholder="Ex: 401"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Au compte</label>
                <input
                  type="text"
                  value={filterCompteFin}
                  onChange={(e) => {
                    setFilterCompteFin(e.target.value);
                    updateUrlParams({ compteFin: e.target.value });
                  }}
                  placeholder="Ex: 409"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            {filteredBalance.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Aucune écriture pour cet exercice</p>
                <button
                  onClick={() => router.push('/saisie')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Créer la première écriture
                </button>
              </div>
            ) : (
              <>
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Compte</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Libellé</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Débit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Crédit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Solde Débiteur</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Solde Créditeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBalance.map((ligne, idx) => (
                      <tr
                        key={idx}
                        onClick={() => handleCompteClick(ligne.numero_compte)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold hover:underline">{ligne.numero_compte}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{ligne.libelle}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {ligne.debitTotal > 0 ? ligne.debitTotal.toFixed(2) : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {ligne.creditTotal > 0 ? ligne.creditTotal.toFixed(2) : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {ligne.soldeDebiteur > 0 ? ligne.soldeDebiteur.toFixed(2) : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {ligne.soldeCrediteur > 0 ? ligne.soldeCrediteur.toFixed(2) : ''}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-bold">
                      <td colSpan={2} className="px-4 py-3 text-sm text-blue-900">TOTAUX</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-blue-900">{totaux.debit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-blue-900">{totaux.credit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-blue-900">{totaux.soldeDebiteur.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-blue-900">{totaux.soldeCrediteur.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 text-sm text-gray-600">
                  <p>{filteredBalance.length} compte{filteredBalance.length > 1 ? 's' : ''} affiché{filteredBalance.length > 1 ? 's' : ''}</p>
                  <p className="mt-2">
                    Équilibre : {totaux.debit.toFixed(2)} = {totaux.credit.toFixed(2)}
                    {Math.abs(totaux.debit - totaux.credit) < 0.01
                      ? ' ✅ Équilibrée'
                      : ' ⚠️ Déséquilibrée'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
