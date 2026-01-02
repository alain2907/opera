import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { entreprisesApi, type Entreprise } from '../api/entreprises';
import { libelleCompteMapsApi, type LibelleCompteMap } from '../api/libelle-compte-maps';
import { comptesApi, type Compte } from '../api/comptes';

export default function LibelleCompteMapsPage() {
  const router = useRouter();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<number | null>(null);
  const [maps, setMaps] = useState<LibelleCompteMap[]>([]);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLibelle, setEditingLibelle] = useState<string>('');
  const [editingCompte, setEditingCompte] = useState<string>('');
  const [selectedMaps, setSelectedMaps] = useState<number[]>([]);
  const [groupCompte, setGroupCompte] = useState<string>('');

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
      loadMaps(entrepriseId);
      loadComptes(entrepriseId);
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

  const loadMaps = async (id: number) => {
    try {
      const data = await libelleCompteMapsApi.findByEntreprise(id);
      setMaps(data);
    } catch (err) {
      console.error('Erreur chargement associations:', err);
    }
  };

  const loadComptes = async (id: number) => {
    try {
      const data = await comptesApi.getAll(id);
      setComptes(data);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    }
  };

  const handleEdit = (map: LibelleCompteMap) => {
    setEditingId(map.id);
    setEditingLibelle(map.libelle);
    setEditingCompte(map.numero_compte);
  };

  const handleSave = async (id: number, oldLibelle: string) => {
    if (!entrepriseId) return;
    try {
      // Si le libellé a changé, supprimer l'ancien et créer le nouveau
      if (editingLibelle !== oldLibelle) {
        await libelleCompteMapsApi.delete(id);
      }
      await libelleCompteMapsApi.upsert(entrepriseId, editingLibelle, editingCompte);
      await loadMaps(entrepriseId);
      setEditingId(null);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette association ?')) return;
    try {
      await libelleCompteMapsApi.delete(id);
      await loadMaps(entrepriseId!);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  const handleSelectMap = (id: number) => {
    if (selectedMaps.includes(id)) {
      setSelectedMaps(selectedMaps.filter((mapId) => mapId !== id));
    } else {
      setSelectedMaps([...selectedMaps, id]);
    }
  };

  const handleGroupMaps = async () => {
    if (!entrepriseId || selectedMaps.length === 0 || !groupCompte) return;

    try {
      // Mettre à jour tous les libellés sélectionnés avec le même compte
      const selectedLibelleMaps = maps.filter((map) => selectedMaps.includes(map.id));

      for (const map of selectedLibelleMaps) {
        await libelleCompteMapsApi.upsert(entrepriseId, map.libelle, groupCompte);
      }

      await loadMaps(entrepriseId);
      setSelectedMaps([]);
      setGroupCompte('');
    } catch (err) {
      console.error('Erreur regroupement:', err);
    }
  };

  const filteredMaps = maps.filter((map) =>
    map.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    map.numero_compte.includes(searchTerm)
  );

  if (!entrepriseId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Gestion des libellés</h2>
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
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => router.push(`/dashboard/${entrepriseId}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des associations Libellé → Compte</h2>
            {entreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              </p>
            )}
          </div>

          {/* Recherche */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Rechercher un libellé ou un compte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Regroupement */}
          {selectedMaps.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-300 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">
                Regrouper {selectedMaps.length} libellé(s) sélectionné(s)
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Numéro de compte"
                  value={groupCompte}
                  onChange={(e) => setGroupCompte(e.target.value)}
                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  list="comptes-group-list"
                />
                <datalist id="comptes-group-list">
                  {comptes.map((compte) => (
                    <option key={compte.id} value={compte.numero_compte}>
                      {compte.numero_compte} - {compte.libelle}
                    </option>
                  ))}
                </datalist>
                <button
                  onClick={handleGroupMaps}
                  disabled={!groupCompte}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    groupCompte
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Appliquer
                </button>
                <button
                  onClick={() => setSelectedMaps([])}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Statistiques */}
          <div className="mb-6 flex gap-4 text-sm">
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <span className="font-semibold text-blue-900">{maps.length}</span> association(s)
            </div>
            {selectedMaps.length > 0 && (
              <div className="bg-green-50 px-4 py-2 rounded-lg">
                <span className="font-semibold text-green-900">{selectedMaps.length}</span> sélectionné(s)
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={selectedMaps.length === filteredMaps.length && filteredMaps.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMaps(filteredMaps.map((m) => m.id));
                        } else {
                          setSelectedMaps([]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Libellé</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Compte</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Dernière modification</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMaps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Aucune association trouvée
                    </td>
                  </tr>
                ) : (
                  filteredMaps.map((map) => (
                    <tr key={map.id} className="hover:bg-blue-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedMaps.includes(map.id)}
                          onChange={() => handleSelectMap(map.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === map.id ? (
                          <input
                            type="text"
                            value={editingLibelle}
                            onChange={(e) => setEditingLibelle(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Libellé (ex: BOLT.EU)"
                          />
                        ) : (
                          <span>{map.libelle}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === map.id ? (
                          <input
                            type="text"
                            value={editingCompte}
                            onChange={(e) => setEditingCompte(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            list={`compte-edit-${map.id}`}
                          />
                        ) : (
                          <span className="font-mono">
                            {map.numero_compte} - {comptes.find((c) => c.numero_compte === map.numero_compte)?.libelle || ''}
                          </span>
                        )}
                        {editingId === map.id && (
                          <datalist id={`compte-edit-${map.id}`}>
                            {comptes.map((compte) => (
                              <option key={compte.id} value={compte.numero_compte}>
                                {compte.numero_compte} - {compte.libelle}
                              </option>
                            ))}
                          </datalist>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(map.date_modification).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === map.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSave(map.id, map.libelle)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              ✓ Sauver
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-600 hover:text-gray-800 font-medium"
                            >
                              ✗ Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(map)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              ✎ Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(map.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              🗑 Supprimer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">💡 Conseils</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Utilisez les cases à cocher pour sélectionner plusieurs libellés similaires (ex: différents "Bolt")</li>
              <li>• Regroupez-les en leur attribuant le même compte comptable</li>
              <li>• Ces associations seront automatiquement appliquées lors des prochains imports CSV</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
