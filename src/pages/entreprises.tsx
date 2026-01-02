import { useState } from 'react';
import { useRouter } from 'next/router';
import { entreprisesApi, type Entreprise } from '../api/entreprises';
import EntrepriseForm from '../components/entreprises/EntrepriseForm';
import { useEntreprise } from '../contexts/EntrepriseContext';

export default function CreateEntreprisePage() {
  const router = useRouter();
  const { reloadEntreprises } = useEntreprise();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Partial<Entreprise>) => {
    setIsLoading(true);
    try {
      const newEntreprise = await entreprisesApi.create(data as Entreprise);
      alert('Entreprise créée avec succès !');
      await reloadEntreprises();
      router.push('/selection-entreprise');
    } catch (err: any) {
      console.error('Erreur création entreprise:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la création';
      alert(Array.isArray(errorMsg) ? errorMsg.join('\n') : errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/selection-entreprise');
  };

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

          <h1 className="text-4xl font-bold text-gray-900 mb-2">Créer une entreprise</h1>
          <p className="text-gray-600">
            Ajoutez une nouvelle entreprise à votre portefeuille comptable
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <EntrepriseForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
