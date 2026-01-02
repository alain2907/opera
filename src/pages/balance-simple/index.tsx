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

export default function BalanceSimplePage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [balance, setBalance] = useState<LigneBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [comptes, setComptes] = useState<Compte[]>([]);

  // FILTRES FIXES
  const dateDebut = '2025-01-01';
  const dateFin = '2025-03-31';
  const classeDebut = '1';
  const classeFin = '3';

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
    if (entreprise && exercice && comptes.length > 0) {
      calculerBalance();
    }
  }, [entreprise, exercice, comptes]);

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

      console.log('=== DEBUG BALANCE SIMPLE ===');
      console.log('Total écritures:', ecritures.length);
      console.log('Période:', dateDebut, 'à', dateFin);
      console.log('Classes:', classeDebut, 'à', classeFin);

      // Afficher les 3 premières dates pour debug
      if (ecritures.length > 0) {
        console.log('Exemples de dates:');
        ecritures.slice(0, 3).forEach((e: Ecriture) => {
          console.log('  - date_ecriture brute:', e.date_ecriture);
          console.log('  - substring(0,10):', e.date_ecriture.substring(0, 10));
        });
      }

      const totauxParCompte: { [key: string]: { debit: number; credit: number } } = {};

      // Filtrer par période
      const ecrituresFiltrees = ecritures.filter((ecriture: Ecriture) => {
        const dateStr = ecriture.date_ecriture.substring(0, 10);
        return dateStr >= dateDebut && dateStr <= dateFin;
      });

      console.log('Écritures dans la période:', ecrituresFiltrees.length);

      // Accumuler les totaux
      ecrituresFiltrees.forEach((ecriture: Ecriture) => {
        ecriture.lignes.forEach((ligne) => {
          const compte = ligne.numero_compte;
          const classeCompte = compte[0];

          // Filtrer par classe
          if (classeCompte >= classeDebut && classeCompte <= classeFin) {
            if (!totauxParCompte[compte]) {
              totauxParCompte[compte] = { debit: 0, credit: 0 };
            }
            totauxParCompte[compte].debit += Number(ligne.debit) || 0;
            totauxParCompte[compte].credit += Number(ligne.credit) || 0;
          }
        });
      });

      console.log('Comptes trouvés:', Object.keys(totauxParCompte).sort());

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

      console.log('Lignes balance:', balanceData.length);
      setBalance(balanceData);
    } catch (err) {
      console.error('Erreur calcul balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const totaux = balance.reduce(
    (acc, ligne) => ({
      debit: acc.debit + ligne.debitTotal,
      credit: acc.credit + ligne.creditTotal,
      soldeDebiteur: acc.soldeDebiteur + ligne.soldeDebiteur,
      soldeCrediteur: acc.soldeCrediteur + ligne.soldeCrediteur,
    }),
    { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 }
  );

  const handleExportCsv = () => {
    const csvData = balance.map(ligne => ({
      'Compte': ligne.numero_compte,
      'Libellé': ligne.libelle,
      'Débit': ligne.debitTotal,
      'Crédit': ligne.creditTotal,
      'Solde Débiteur': ligne.soldeDebiteur,
      'Solde Créditeur': ligne.soldeCrediteur,
    }));

    csvData.push({
      'Compte': 'TOTAUX',
      'Libellé': '',
      'Débit': totaux.debit,
      'Crédit': totaux.credit,
      'Solde Débiteur': totaux.soldeDebiteur,
      'Solde Créditeur': totaux.soldeCrediteur,
    });

    const filename = `balance_simple_${entreprise?.raison_sociale.replace(/\s/g, '_')}_${formatDateForFilename()}.csv`;
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Balance Simplifiée</h2>
              <p className="text-gray-600">
                {entreprise.raison_sociale} - Exercice {exercice && new Date(exercice.date_debut).getFullYear()}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Classes 1 à 3 - Du 01/01/2025 au 31/03/2025
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

          <div className="overflow-x-auto">
            {balance.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Aucune écriture trouvée pour les classes 1 à 3 entre le 01/01/2025 et le 31/03/2025</p>
                <button
                  onClick={() => router.push('/saisie')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Créer une écriture
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
                    {balance.map((ligne, idx) => (
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
                  <p>{balance.length} compte{balance.length > 1 ? 's' : ''} affiché{balance.length > 1 ? 's' : ''}</p>
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
