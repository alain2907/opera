import { useState } from 'react';
import { useRouter } from 'next/router';
import { exercicesApi, type Exercice } from '../api/exercices';
import { useEntreprise } from '../contexts/EntrepriseContext';

export default function CreateExercicePage() {
  const router = useRouter();
  const { entreprise: entrepriseSelectionnee } = useEntreprise();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    annee: new Date().getFullYear(),
    date_debut: `${new Date().getFullYear()}-01-01`,
    date_fin: `${new Date().getFullYear()}-12-31`,
    cloture: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!entrepriseSelectionnee) {
      alert('Aucune entreprise sélectionnée');
      return;
    }

    setIsLoading(true);
    try {
      const exerciceData = {
        ...formData,
        entreprise_id: entrepriseSelectionnee.id,
      };

      const newExercice = await exercicesApi.create(exerciceData);
      alert('Exercice créé avec succès !');
      router.push('/selection-entreprise');
    } catch (err: any) {
      console.error('Erreur création exercice:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la création';
      alert(Array.isArray(errorMsg) ? errorMsg.join('\n') : errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/selection-entreprise');
  };

  if (!entrepriseSelectionnee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Aucune entreprise sélectionnée</h2>
          <button
            onClick={() => router.push('/selection-entreprise')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sélectionner une entreprise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Retour à la sélection
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">Créer un exercice</h1>
          <p className="text-gray-600">
            Entreprise : <strong>{entrepriseSelectionnee.raison_sociale}</strong>
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Année */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.annee}
                onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                disabled={isLoading}
              />
            </div>

            {/* Date début */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                disabled={isLoading}
              />
            </div>

            {/* Date fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                disabled={isLoading}
              />
            </div>

            {/* Clôturé */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="cloture"
                checked={formData.cloture}
                onChange={(e) => setFormData({ ...formData, cloture: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="cloture" className="ml-2 block text-sm text-gray-700">
                Exercice clôturé
              </label>
            </div>

            {/* Boutons */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                disabled={isLoading}
              >
                {isLoading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
