import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { entreprisesApi, type Entreprise } from '../../../api/entreprises';
import EntrepriseForm from '../../../components/entreprises/EntrepriseForm';
import { useEntreprise } from '../../../contexts/EntrepriseContext';

export default function EditEntreprisePage() {
  const router = useRouter();
  const { id } = router.query;
  const { reloadEntreprises } = useEntreprise();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadEntreprise();
    }
  }, [id]);

  const loadEntreprise = async () => {
    try {
      const data = await entreprisesApi.getOne(Number(id));
      setEntreprise(data);
    } catch (err) {
      console.error('Erreur chargement entreprise:', err);
      alert('Erreur lors du chargement de l\'entreprise');
      router.push('/selection-entreprise');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<Entreprise>) => {
    if (!entreprise?.id) return;

    setIsSubmitting(true);
    try {
      // Exclure les champs en lecture seule
      const { id: _, exercices, date_creation, date_modification, ...dataToUpdate } = data;

      const updated = await entreprisesApi.update(entreprise.id, dataToUpdate);
      alert('Entreprise modifiée avec succès !');
      await reloadEntreprises();
      router.push('/selection-entreprise');
    } catch (err: any) {
      console.error('Erreur modification entreprise:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la modification';
      alert(Array.isArray(errorMsg) ? errorMsg.join('\n') : errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/selection-entreprise');
  };

  const handleDelete = async () => {
    if (!entreprise?.id) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'entreprise "${entreprise.raison_sociale}" ?\n\nCette action est irréversible et supprimera également tous les exercices et écritures associés.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await entreprisesApi.delete(entreprise.id);
      alert('Entreprise supprimée avec succès');
      await reloadEntreprises();
      router.push('/selection-entreprise');
    } catch (err) {
      console.error('Erreur suppression entreprise:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!entreprise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Entreprise introuvable</p>
          <button
            onClick={() => router.push('/selection-entreprise')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour à la sélection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Retour à la sélection
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Modifier l'entreprise</h1>
              <p className="text-gray-600">
                {entreprise.raison_sociale}
              </p>
            </div>

            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <EntrepriseForm
            entreprise={entreprise}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
