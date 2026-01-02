import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { entreprisesApi, type Entreprise } from '../api/entreprises';
import TopMenu from '../components/TopMenu';

export default function ListePage() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntreprises();
  }, []);

  const loadEntreprises = async () => {
    try {
      const data = await entreprisesApi.getAll();
      setEntreprises(data);
    } catch (err) {
      console.error('Erreur chargement entreprises:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOuvrirEntreprise = (entreprise: Entreprise) => {
    console.log('🔵 Ouverture entreprise:', entreprise);
    const premierExercice = entreprise.exercices?.[0]?.id || null;
    router.push(`/dashboard/${entreprise.id}${premierExercice ? `?exercice=${premierExercice}` : ''}`);
  };

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
      <div className="max-w-6xl mx-auto p-8">
        {/* En-tête */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Retour
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Choisir un dossier
          </h1>
          <p className="text-gray-600">
            {entreprises.length} dossier{entreprises.length > 1 ? 's' : ''} disponible{entreprises.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Liste des dossiers */}
        {entreprises.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucun dossier disponible
            </h3>
            <p className="text-gray-500 mb-6">
              Créez votre premier dossier de comptabilité pour commencer
            </p>
            <button
              onClick={() => router.push('/entreprises')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Créer un dossier
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {entreprises.map((entreprise) => (
              <button
                key={entreprise.id}
                onClick={() => handleOuvrirEntreprise(entreprise)}
                className="w-full bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 text-left hover:bg-blue-50 cursor-pointer border-2 border-transparent hover:border-blue-400"
              >
                {/* En-tête entreprise */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {entreprise.raison_sociale}
                    </h3>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      {entreprise.siret && <p>SIRET: {entreprise.siret}</p>}
                      {entreprise.forme_juridique && (
                        <p>Forme juridique: {entreprise.forme_juridique}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      entreprise.actif !== false
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {entreprise.actif !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>

                {/* Exercices */}
                {entreprise.exercices && entreprise.exercices.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Exercices comptables :
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {entreprise.exercices.map((exercice: any) => (
                        <div
                          key={exercice.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-lg font-bold text-gray-900">
                              {exercice.annee}
                            </span>
                            {exercice.cloture && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Clôturé
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            {new Date(exercice.date_debut).toLocaleDateString('fr-FR')} →{' '}
                            {new Date(exercice.date_fin).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Aucun exercice créé pour cette entreprise
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Bouton créer nouveau dossier */}
        {entreprises.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/entreprises')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              + Créer un nouveau dossier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
