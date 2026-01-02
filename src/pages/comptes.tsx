import { useState } from 'react';
import { useRouter } from 'next/router';
import CompteForm from '../components/comptes/CompteForm';
import { comptesApi } from '../api/comptes';
import { Compte } from '../types/compte';
import { useEntreprise } from '../contexts/EntrepriseContext';

export default function ComptesPage() {
  const router = useRouter();
  const { entreprise: entrepriseSelectionnee } = useEntreprise();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Partial<Compte>) => {
    if (!entrepriseSelectionnee) {
      alert('Aucune entreprise sélectionnée');
      return;
    }

    setIsLoading(true);
    try {
      const compteData = {
        ...data,
        entreprise_id: entrepriseSelectionnee.id,
      };

      const newCompte = await comptesApi.create(compteData as Omit<Compte, 'id'>);
      alert('Compte créé avec succès !');
      router.push('/plan-comptable');
    } catch (err: any) {
      console.error('Erreur lors de la création du compte:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la création du compte';
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Créer un nouveau compte</h1>
          <p className="mt-2 text-sm text-gray-600">
            Entreprise : {entrepriseSelectionnee.raison_sociale}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <CompteForm
            entrepriseId={entrepriseSelectionnee.id}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
