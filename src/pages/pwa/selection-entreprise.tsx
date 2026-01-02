import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getAllEntreprises,
  getAllExercices,
  getExercicesByEntreprise,
} from '../../lib/storageAdapter';

export default function SelectionEntreprise() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<any | null>(null);
  const [selectedExercice, setSelectedExercice] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const ents = await getAllEntreprises();
      setEntreprises(ents);

      // Charger les sélections depuis localStorage
      const savedEntrepriseId = localStorage.getItem('selectedEntrepriseId');
      const savedExerciceId = localStorage.getItem('selectedExerciceId');

      if (savedEntrepriseId) {
        const ent = ents.find((e: any) => e.id === parseInt(savedEntrepriseId));
        if (ent) {
          setSelectedEntreprise(ent);
          const exs = await getExercicesByEntreprise(ent.id);
          setExercices(exs);

          if (savedExerciceId) {
            const ex = exs.find((e: any) => e.id === parseInt(savedExerciceId));
            if (ex) {
              setSelectedExercice(ex);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectEntreprise(entreprise: any) {
    setSelectedEntreprise(entreprise);
    setSelectedExercice(null);
    localStorage.setItem('selectedEntrepriseId', entreprise.id.toString());
    localStorage.removeItem('selectedExerciceId');

    const exs = await getExercicesByEntreprise(entreprise.id);
    setExercices(exs);
  }

  function handleSelectExercice(exercice: any) {
    setSelectedExercice(exercice);
    localStorage.setItem('selectedExerciceId', exercice.id.toString());
  }

  function handleContinue() {
    if (selectedEntreprise && selectedExercice) {
      router.push(`/pwa/dashboard/${selectedEntreprise.id}?exercice=${selectedExercice.id}`);
    }
  }

  function handleChangeEntreprise() {
    setSelectedEntreprise(null);
    setSelectedExercice(null);
    setExercices([]);
    localStorage.removeItem('selectedEntrepriseId');
    localStorage.removeItem('selectedExerciceId');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {selectedEntreprise && selectedExercice && (
          <button
            onClick={() => router.push('/pwa')}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Retour au dashboard
          </button>
        )}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Comptabilité France</h1>
        <p className="text-gray-600 mb-8">Sélectionnez une entreprise et un exercice comptable</p>

        {entreprises.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Aucune entreprise trouvée</p>
            <button
              onClick={() => router.push('/pwa/entreprises')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Créer une entreprise
            </button>
          </div>
        ) : !selectedEntreprise ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Choisir une entreprise</h2>
            <div className="grid gap-3">
              {entreprises.map((ent) => (
                <button
                  key={ent.id}
                  onClick={() => handleSelectEntreprise(ent)}
                  className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <div className="font-semibold text-gray-800">
                    {ent.raison_sociale || ent.nom}
                  </div>
                  {ent.siret && (
                    <div className="text-sm text-gray-500">SIRET: {ent.siret}</div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => router.push('/pwa/entreprises')}
              className="mt-6 w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              + Créer une nouvelle entreprise
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-gray-600">Entreprise sélectionnée</div>
              <div className="font-semibold text-gray-800">
                {selectedEntreprise.raison_sociale || selectedEntreprise.nom}
              </div>
            </div>

            {exercices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Aucun exercice comptable trouvé</p>
                <button
                  onClick={() => router.push('/pwa/exercices')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Créer un exercice
                </button>
              </div>
            ) : !selectedExercice ? (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Choisir un exercice comptable
                </h2>
                <div className="grid gap-3">
                  {exercices.map((ex) => {
                    const dateDebut = new Date(ex.dateDebut || ex.date_debut).toLocaleDateString('fr-FR');
                    const dateFin = new Date(ex.dateFin || ex.date_fin).toLocaleDateString('fr-FR');
                    const annee = new Date(ex.dateDebut || ex.date_debut).getFullYear();
                    return (
                      <button
                        key={ex.id}
                        onClick={() => handleSelectExercice(ex)}
                        className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                      >
                        <div className="font-semibold text-gray-800">Exercice {annee}</div>
                        <div className="text-sm text-gray-500">
                          {dateDebut} → {dateFin}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-gray-600">Exercice sélectionné</div>
                  <div className="font-semibold text-gray-800">
                    Exercice {new Date(selectedExercice.dateDebut || selectedExercice.date_debut).getFullYear()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(selectedExercice.dateDebut || selectedExercice.date_debut).toLocaleDateString('fr-FR')} → {new Date(selectedExercice.dateFin || selectedExercice.date_fin).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continuer vers le dashboard
                </button>
              </div>
            )}

            <button
              onClick={handleChangeEntreprise}
              className="mt-6 text-gray-600 hover:text-gray-800 underline"
            >
              Changer d'entreprise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
