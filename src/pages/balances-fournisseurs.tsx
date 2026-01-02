import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';

interface BalanceFournisseur {
  compteFournisseur: string;
  mois: number;
  annee: number;
  debit: number;
  credit: number;
  solde: number;
}

export default function BalancesFournisseursPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [balances, setBalances] = useState<BalanceFournisseur[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'tous' | 'debiteurs'>('tous');

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
    }
  }, [entreprise, router]);

  const chargerBalances = async (debiteurs: boolean = false) => {
    if (!entreprise || !exercice) return;

    setLoading(true);
    try {
      const endpoint = debiteurs ? 'debiteurs' : '';
      const url = `http://localhost:3001/api/balances-fournisseurs${endpoint ? '/' + endpoint : ''}?entrepriseId=${entreprise.id}&exerciceId=${exercice.id}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      setBalances(data);
    } catch (err) {
      console.error('Erreur chargement balances:', err);
      alert('Erreur lors du chargement des balances fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (type: 'tous' | 'debiteurs') => {
    setFilterType(type);
    chargerBalances(type === 'debiteurs');
  };

  // Calcul des totaux
  const totaux = balances.reduce(
    (acc, ligne) => ({
      debit: acc.debit + ligne.debit,
      credit: acc.credit + ligne.credit,
    }),
    { debit: 0, credit: 0 }
  );

  if (!entreprise) return null;

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Balances Fournisseurs</h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              {exercice && (
                <span className="ml-4">
                  Exercice : {new Date(exercice.date_debut).getFullYear()}
                </span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => handleFilterChange('tous')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'tous'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={loading}
            >
              📊 Tous les fournisseurs
            </button>
            <button
              onClick={() => handleFilterChange('debiteurs')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'debiteurs'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={loading}
            >
              ⚠️ Fournisseurs débiteurs
            </button>
          </div>

          {/* Balances */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {filterType === 'debiteurs'
                  ? 'Aucun fournisseur débiteur trouvé'
                  : 'Aucune écriture fournisseur pour cet exercice'}
              </p>
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
                      Compte Fournisseur
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Débit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Crédit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Solde
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balances.map((ligne, idx) => (
                    <tr
                      key={idx}
                      onClick={() => router.push(`/balances-fournisseurs/${ligne.compteFournisseur}`)}
                      className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                        ligne.solde > 0 ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                        {ligne.compteFournisseur}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {ligne.debit > 0 ? ligne.debit.toFixed(2) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {ligne.credit > 0 ? ligne.credit.toFixed(2) : ''}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                          ligne.solde > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {ligne.solde.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {/* Ligne de totaux */}
                  <tr className="bg-blue-50 font-bold">
                    <td className="px-4 py-3 text-sm text-blue-900">TOTAUX</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-blue-900">
                      {totaux.debit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-blue-900">
                      {totaux.credit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-blue-900 font-semibold">
                      {(totaux.debit - totaux.credit).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 text-sm text-gray-600">
                <p>
                  {balances.length} compte{balances.length > 1 ? 's' : ''} fournisseur
                  {balances.length > 1 ? 's' : ''} affiché{balances.length > 1 ? 's' : ''}
                </p>
                {filterType === 'debiteurs' && balances.length > 0 && (
                  <p className="mt-2 text-red-600 font-medium">
                    ⚠️ Ces fournisseurs ont un solde débiteur (anormal)
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
