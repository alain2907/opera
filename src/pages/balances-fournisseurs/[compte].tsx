import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../../components/TopMenu';
import { useEntreprise } from '../../contexts/EntrepriseContext';

interface BalanceMensuelle {
  periode: string;
  mois: number;
  debit: number;
  credit: number;
  solde: number;
}

export default function DetailFournisseurPage() {
  const router = useRouter();
  const { compte } = router.query;
  const { entreprise, exercice } = useEntreprise();
  const [balances, setBalances] = useState<BalanceMensuelle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
    }
  }, [entreprise, router]);

  useEffect(() => {
    if (entreprise && exercice && compte) {
      chargerBalancesMensuelles();
    }
  }, [entreprise, exercice, compte]);

  const chargerBalancesMensuelles = async () => {
    if (!entreprise || !exercice || !compte) return;

    setLoading(true);
    try {
      const url = `http://localhost:3001/api/balances-fournisseurs/mensuelles/${compte}?entrepriseId=${entreprise.id}&exerciceId=${exercice.id}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setBalances(data);
    } catch (err) {
      console.error('Erreur chargement balances mensuelles:', err);
      alert('Erreur lors du chargement des balances mensuelles');
    } finally {
      setLoading(false);
    }
  };

  if (!entreprise) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => router.push('/balances-fournisseurs')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour aux balances fournisseurs
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Balances Mensuelles - Compte {compte}
            </h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              {exercice && (
                <span className="ml-4">
                  Exercice : {new Date(exercice.date_debut).getFullYear()}
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Balances cumulées depuis le début de l'exercice
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Aucune écriture pour ce compte fournisseur</p>
              <button
                onClick={() => router.push('/saisie')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Créer une écriture
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Période
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Débit Cumulé
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Crédit Cumulé
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Solde
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balances.map((balance, idx) => (
                    <tr
                      key={idx}
                      onClick={() => router.push(`/balances-fournisseurs/${compte}/${balance.mois}`)}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                        balance.solde > 0 ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                        {balance.periode}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {balance.debit > 0 ? balance.debit.toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {balance.credit > 0 ? balance.credit.toFixed(2) : '-'}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                          balance.solde > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {balance.solde.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 text-sm text-gray-600">
                <p>
                  {balances.length} période{balances.length > 1 ? 's' : ''} affichée
                  {balances.length > 1 ? 's' : ''}
                </p>
                <p className="mt-2">
                  📊 Les balances sont cumulées depuis le début de l'exercice
                </p>
                {balances.some((b) => b.solde > 0) && (
                  <p className="mt-2 text-red-600 font-medium">
                    ⚠️ Ce fournisseur présente un solde débiteur (anormal)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
