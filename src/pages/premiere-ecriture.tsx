import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { ecrituresApi, type Ecriture } from '../api/ecritures';

export default function PremiereEcriturePage() {
  const router = useRouter();
  const { entreprise } = useEntreprise();
  const [ecriture, setEcriture] = useState<Ecriture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
      return;
    }

    loadPremiereEcriture();
  }, [entreprise, router]);

  const loadPremiereEcriture = async () => {
    try {
      setLoading(true);
      // Charger l'écriture ID = 1
      const data = await ecrituresApi.getOne(1);
      setEcriture(data);
    } catch (err) {
      console.error('Erreur lors du chargement de la première écriture:', err);
      alert('Erreur lors du chargement de l\'écriture');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getTotalDebit = () => {
    if (!ecriture) return 0;
    return ecriture.lignes.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  };

  const getTotalCredit = () => {
    if (!ecriture) return 0;
    return ecriture.lignes.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  };

  if (!entreprise) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Première écriture (ID = 1)</h2>
            <p className="text-gray-600 mt-2">Affichage en lecture seule</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : !ecriture ? (
            <div className="text-center py-12 text-gray-500">
              Aucune écriture trouvée avec l'ID = 1
            </div>
          ) : (
            <div className="space-y-6">
              {/* En-tête de l'écriture */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(ecriture.date_ecriture)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Numéro de pièce</p>
                    <p className="text-lg font-mono font-semibold text-gray-900">
                      {ecriture.numero_piece}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Libellé</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {ecriture.libelle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lignes d'écriture */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Compte
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Libellé
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Débit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Crédit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ecriture.lignes.map((ligne, idx) => (
                      <tr key={idx} className="hover:bg-blue-50">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                          {ligne.numero_compte}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ligne.libelle_compte}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {Number(ligne.debit) > 0 ? Number(ligne.debit).toFixed(2) + ' €' : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {Number(ligne.credit) > 0 ? Number(ligne.credit).toFixed(2) + ' €' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right text-sm text-gray-700">
                        Total :
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-blue-600 font-mono">
                        {getTotalDebit().toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-blue-600 font-mono">
                        {getTotalCredit().toFixed(2)} €
                      </td>
                    </tr>
                    {Math.abs(getTotalDebit() - getTotalCredit()) >= 0.01 && (
                      <tr className="bg-red-100">
                        <td colSpan={4} className="px-4 py-2 text-center text-sm text-red-700 font-semibold">
                          ⚠️ ATTENTION : Écriture non équilibrée (différence : {Math.abs(getTotalDebit() - getTotalCredit()).toFixed(2)} €)
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Informations supplémentaires */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">📊 Informations</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre de lignes :</span>
                    <span className="ml-2 font-semibold">{ecriture.lignes.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">État :</span>
                    <span className="ml-2 font-semibold">
                      {Math.abs(getTotalDebit() - getTotalCredit()) < 0.01 ? (
                        <span className="text-green-600">✅ Équilibrée</span>
                      ) : (
                        <span className="text-red-600">❌ Non équilibrée</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
