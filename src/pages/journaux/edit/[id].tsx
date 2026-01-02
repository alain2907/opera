import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import JournalForm from '../../../components/journaux/JournalForm';
import { journauxApi, Journal } from '../../../api/journaux';
import { useEntreprise } from '../../../contexts/EntrepriseContext';

export default function EditJournalPage() {
  const router = useRouter();
  const { id } = router.query;
  const { entreprise: entrepriseSelectionnee } = useEntreprise();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    if (entrepriseSelectionnee && id) {
      loadJournal();
    }
  }, [entrepriseSelectionnee, id]);

  const loadJournal = async () => {
    try {
      setIsLoadingPage(true);
      const journaux = await journauxApi.findByEntreprise(entrepriseSelectionnee!.id);
      const found = journaux.find(j => j.id === parseInt(id as string));

      if (!found) {
        alert('Journal non trouvé');
        router.push('/journaux-list');
        return;
      }

      setJournal(found);
    } catch (err) {
      console.error('Erreur lors du chargement du journal:', err);
      alert('Erreur lors du chargement du journal');
      router.push('/journaux-list');
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleSubmit = async (data: Partial<Journal>) => {
    if (!journal) return;

    setIsLoading(true);
    try {
      await journauxApi.update(journal.id!, data);
      alert('Journal mis à jour avec succès !');
      router.push('/journaux-list');
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du journal:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la mise à jour du journal';
      alert(Array.isArray(errorMsg) ? errorMsg.join('\n') : errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!journal) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le journal "${journal.code} - ${journal.libelle}" ?\n\nCette action est irréversible.`)) {
      return;
    }

    setIsLoading(true);
    try {
      await journauxApi.delete(journal.id!);
      alert('Journal supprimé avec succès');
      router.push('/journaux-list');
    } catch (err: any) {
      console.error('Erreur lors de la suppression du journal:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression du journal';
      alert(Array.isArray(errorMsg) ? errorMsg.join('\n') : errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/journaux-list');
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

  if (isLoadingPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du journal...</p>
        </div>
      </div>
    );
  }

  if (!journal) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Éditer un journal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Entreprise : {entrepriseSelectionnee.raison_sociale}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <JournalForm
            entrepriseId={entrepriseSelectionnee.id}
            journal={journal}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />

          {/* Bouton de suppression */}
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              🗑️ Supprimer ce journal
            </button>
            <p className="mt-2 text-xs text-gray-500">
              ⚠️ La suppression d'un journal est définitive et peut affecter les écritures associées
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
