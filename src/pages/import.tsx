import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { entreprisesApi, type Entreprise } from '../api/entreprises';

export default function ImportPage() {
  const router = useRouter();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('currentEntrepriseId');
      if (savedId) {
        setEntrepriseId(Number(savedId));
      }
    }
  }, []);

  useEffect(() => {
    if (entrepriseId) {
      loadEntreprise(entrepriseId);
    }
  }, [entrepriseId]);

  const loadEntreprise = async (id: number) => {
    try {
      const data = await entreprisesApi.getOne(id);
      setEntreprise(data);
    } catch (err) {
      console.error('Erreur chargement entreprise:', err);
    }
  };

  if (!entrepriseId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Import de données</h2>
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
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={() => router.push(`/dashboard/${entrepriseId}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import de données</h2>
            {entreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Import FEC */}
            <div
              onClick={() => router.push('/import-fec')}
              className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 text-white rounded-lg p-3 text-3xl">
                  📄
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">Import FEC</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Importez un fichier FEC (Fichier des Écritures Comptables) au format standard
                  </p>
                  <div className="space-y-1 text-xs text-blue-700">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      <span>Format texte tabulé (.txt, .fec)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      <span>Import automatique complet</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      <span>Compatible avec exports comptables</span>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-900">
                    Commencer l'import →
                  </div>
                </div>
              </div>
            </div>

            {/* Import CSV */}
            <div
              onClick={() => router.push('/import-csv')}
              className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-6 hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="bg-green-600 text-white rounded-lg p-3 text-3xl">
                  📊
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-900 mb-2">Import CSV</h3>
                  <p className="text-sm text-green-800 mb-4">
                    Importez des relevés bancaires au format CSV avec contrôle manuel
                  </p>
                  <div className="space-y-1 text-xs text-green-700">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">•</span>
                      <span>Format CSV avec séparateur point-virgule</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">•</span>
                      <span>Groupement automatique par mois</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">•</span>
                      <span>Contrôle et validation manuelle</span>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-900">
                    Commencer l'import →
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">💡 Quel format choisir ?</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <span className="font-medium text-blue-700">Import FEC :</span> Pour importer des écritures comptables complètes depuis un autre logiciel ou un export FEC
              </div>
              <div>
                <span className="font-medium text-green-700">Import CSV :</span> Pour importer des relevés bancaires (Qonto, etc.) avec saisie manuelle des comptes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
