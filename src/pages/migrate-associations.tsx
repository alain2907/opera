import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { libelleCompteMapsApi } from '../api/libelle-compte-maps';

export default function MigrateAssociationsPage() {
  const router = useRouter();
  const [entrepriseId, setEntrepriseId] = useState<number | null>(null);
  const [localStorageData, setLocalStorageData] = useState<any>(null);
  const [migrated, setMigrated] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('currentEntrepriseId');
      if (savedId) {
        setEntrepriseId(Number(savedId));
      }

      // Lire le localStorage
      const savedMap = localStorage.getItem('libelleCompteMap');
      if (savedMap) {
        try {
          const data = JSON.parse(savedMap);
          setLocalStorageData(data);
          setCount(Object.keys(data).length);
        } catch (err) {
          console.error('Erreur parsing localStorage:', err);
        }
      }
    }
  }, []);

  const handleMigrate = async () => {
    if (!entrepriseId || !localStorageData) return;

    try {
      let saved = 0;
      for (const [libelle, compte] of Object.entries(localStorageData)) {
        await libelleCompteMapsApi.upsert(entrepriseId, libelle, compte as string);
        saved++;
      }

      setMigrated(true);
      alert(`${saved} association(s) migrée(s) avec succès !`);

      // Supprimer le localStorage
      localStorage.removeItem('libelleCompteMap');
    } catch (err) {
      console.error('Erreur migration:', err);
      alert('Erreur lors de la migration');
    }
  };

  if (!entrepriseId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Migration des associations</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 mb-4">
                ⚠️ Veuillez d'abord sélectionner une entreprise
              </p>
              <button
                onClick={() => router.push('/liste')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Choisir une entreprise
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => router.push(`/dashboard/${entrepriseId}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Migration des associations libellé-compte</h2>

          {!localStorageData ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <p className="text-gray-700">
                Aucune association trouvée dans le localStorage du navigateur.
              </p>
              <p className="text-gray-600 text-sm mt-2">
                Soit elles ont déjà été migrées, soit aucune association n'a été créée.
              </p>
            </div>
          ) : migrated ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800 font-semibold mb-2">
                ✓ Migration réussie !
              </p>
              <p className="text-green-700 text-sm">
                {count} association(s) ont été migrées vers la base de données.
              </p>
              <button
                onClick={() => router.push('/libelle-compte-maps')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Voir les associations
              </button>
            </div>
          ) : (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <p className="text-blue-900 font-semibold mb-2">
                  {count} association(s) trouvée(s) dans le localStorage
                </p>
                <p className="text-blue-800 text-sm">
                  Cliquez sur le bouton ci-dessous pour migrer ces associations vers la base de données.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 mb-3">Aperçu des associations :</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-2">Libellé</th>
                      <th className="text-left py-2 px-2">Compte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(localStorageData).map(([libelle, compte]) => (
                      <tr key={libelle} className="border-b border-gray-200">
                        <td className="py-2 px-2">{libelle}</td>
                        <td className="py-2 px-2 font-mono">{compte as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleMigrate}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Migrer les {count} association(s) vers la base de données
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
