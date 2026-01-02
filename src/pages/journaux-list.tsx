import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { journauxApi, Journal } from '../api/journaux';

export default function JournauxListPage() {
  const router = useRouter();
  const { entreprise } = useEntreprise();
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
      return;
    }
    loadJournaux();
  }, [entreprise]);

  const loadJournaux = async () => {
    if (!entreprise) return;

    try {
      setLoading(true);
      const data = await journauxApi.findByEntreprise(entreprise.id);
      setJournaux(data);
    } catch (err) {
      console.error('Erreur lors du chargement des journaux:', err);
      alert('Erreur lors du chargement des journaux');
    } finally {
      setLoading(false);
    }
  };

  if (!entreprise) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gestion des journaux</h2>
              <p className="text-gray-600 mt-1">
                Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              </p>
            </div>
            <button
              onClick={() => router.push('/journaux')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              ➕ Nouveau journal
            </button>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        Libellé
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {journaux.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          Aucun journal trouvé. Cliquez sur "Nouveau journal" pour en créer un.
                        </td>
                      </tr>
                    ) : (
                      journaux.map((journal) => (
                        <tr key={journal.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                            {journal.code}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {journal.libelle}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {journal.actif ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✅ Actif
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                ❌ Inactif
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => router.push(`/journaux/${journal.code}/ecritures`)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                                title="Voir les écritures"
                              >
                                📋 Écritures
                              </button>
                              <button
                                onClick={() => router.push(`/journaux/edit/${journal.id}`)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                                title="Éditer le journal"
                              >
                                ✏️ Éditer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  {journaux.length} journal{journaux.length > 1 ? 'x' : ''} au total
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
