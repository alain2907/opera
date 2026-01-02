import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { tauxTvaApi, type TauxTVA } from '../api/taux-tva';

export default function TvaDeductiblePage() {
  const router = useRouter();
  const { entreprise } = useEntreprise();
  const [taux, setTaux] = useState<TauxTVA[]>([]);
  const [loading, setLoading] = useState(true);
  const [libelle, setLibelle] = useState('');
  const [tauxValue, setTauxValue] = useState('');

  useEffect(() => {
    if (entreprise) {
      loadTaux();
    }
  }, [entreprise]);

  const loadTaux = async () => {
    if (!entreprise) return;
    setLoading(true);
    try {
      const data = await tauxTvaApi.getAll(entreprise.id);
      setTaux(data.filter(t => t.type === 'deductible'));
    } catch (err) {
      console.error('Erreur chargement taux TVA:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!entreprise || !libelle || !tauxValue) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      await tauxTvaApi.create({
        entreprise_id: entreprise.id,
        libelle,
        taux: parseFloat(tauxValue),
        type: 'deductible',
      });
      setLibelle('');
      setTauxValue('');
      loadTaux();
    } catch (err) {
      console.error('Erreur création taux:', err);
      alert('Erreur lors de la création du taux');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce taux de TVA ?')) return;

    try {
      await tauxTvaApi.delete(id);
      loadTaux();
    } catch (err) {
      console.error('Erreur suppression taux:', err);
      alert('Erreur lors de la suppression');
    }
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopMenu />
        <div className="p-8 text-center">
          <p className="text-gray-600">Veuillez sélectionner une entreprise</p>
          <button
            onClick={() => router.push('/selection-entreprise')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sélectionner une entreprise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu />
      <main className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">TVA Déductible</h1>

        {/* Formulaire d'ajout */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ajouter un taux de TVA déductible</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Libellé
              </label>
              <input
                type="text"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
                placeholder="Ex: TVA 20%"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taux (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={tauxValue}
                onChange={(e) => setTauxValue(e.target.value)}
                placeholder="Ex: 20.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                ➕ Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Liste des taux */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Libellé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taux
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : taux.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    Aucun taux de TVA déductible
                  </td>
                </tr>
              ) : (
                taux.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {t.libelle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {t.taux}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(t.id!)}
                        className="text-red-600 hover:text-red-900"
                      >
                        🗑️ Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
