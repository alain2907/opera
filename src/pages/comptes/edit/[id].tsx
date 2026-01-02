import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import CompteForm from '../../../components/comptes/CompteForm';
import { comptesApi } from '../../../api/comptes';
import { Compte } from '../../../types/compte';
import { useEntreprise } from '../../../contexts/EntrepriseContext';

export default function EditComptePage() {
  const router = useRouter();
  const { id } = router.query;
  const { entreprise: entrepriseSelectionnee } = useEntreprise();
  const [compte, setCompte] = useState<Compte | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    if (id && entrepriseSelectionnee) {
      loadCompte();
    }
  }, [id, entrepriseSelectionnee]);

  const loadCompte = async () => {
    if (!entrepriseSelectionnee || !id) return;

    try {
      setIsLoadingPage(true);
      const comptes = await comptesApi.getAll(entrepriseSelectionnee.id);
      const found = comptes.find(c => c.id === parseInt(id as string));

      if (!found) {
        alert('Compte non trouvé');
        router.push('/plan-comptable');
        return;
      }

      setCompte(found);
    } catch (err) {
      console.error('Erreur lors du chargement du compte:', err);
      alert('Erreur lors du chargement du compte');
      router.push('/plan-comptable');
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleSubmit = async (data: Partial<Compte>) => {
    if (!compte) return;

    setIsLoading(true);
    try {
      await comptesApi.update(compte.id, data);
      alert('Compte mis à jour avec succès !');
      router.push('/plan-comptable');
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du compte:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la mise à jour du compte';
      alert(Array.isArray(errorMsg) ? errorMsg.join('\n') : errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!compte) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le compte "${compte.numero_compte} - ${compte.libelle}" ?\n\nCette action est irréversible.`)) {
      return;
    }

    setIsLoading(true);
    try {
      await comptesApi.delete(compte.id);
      alert('Compte supprimé avec succès');
      router.push('/plan-comptable');
    } catch (err: any) {
      console.error('Erreur lors de la suppression du compte:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la suppression du compte';
      alert(Array.isArray(errorMsg) ? errorMsg.join('\n') : errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/plan-comptable');
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
          <p className="mt-4 text-gray-600">Chargement du compte...</p>
        </div>
      </div>
    );
  }

  if (!compte) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Modifier le compte</h1>
            <p className="mt-2 text-sm text-gray-600">
              Entreprise : {entrepriseSelectionnee.raison_sociale}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
            disabled={isLoading}
          >
            Supprimer
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <CompteForm
            entrepriseId={entrepriseSelectionnee.id}
            compte={compte}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
