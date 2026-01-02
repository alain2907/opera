import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { comptesApi, type Compte } from '../api/comptes';
import { tauxTvaApi, type TauxTVA } from '../api/taux-tva';
import { useEntreprise } from '../contexts/EntrepriseContext';

export default function PlanComptablePage() {
  const router = useRouter();
  const { entreprise } = useEntreprise();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [filteredComptes, setFilteredComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClasse, setFilterClasse] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLibelle, setEditLibelle] = useState('');
  const [editTauxTva, setEditTauxTva] = useState<string>('');
  const [editCompteCharge, setEditCompteCharge] = useState<string>('');
  const [editCompteTva, setEditCompteTva] = useState<string>('');
  const [tauxTvaList, setTauxTvaList] = useState<TauxTVA[]>([]);

  useEffect(() => {
    if (entreprise) {
      loadComptes(entreprise.id);
      loadTauxTva(entreprise.id);
    }
  }, [entreprise]);

  useEffect(() => {
    applyFilters();
  }, [comptes, searchTerm, filterClasse]);

  const loadComptes = async (id: number) => {
    setLoading(true);
    try {
      const data = await comptesApi.getAll(id);
      setComptes(data);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTauxTva = async (id: number) => {
    try {
      const data = await tauxTvaApi.getAll(id);
      setTauxTvaList(data);
    } catch (err) {
      console.error('Erreur chargement taux TVA:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...comptes];

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.numero_compte.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.libelle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterClasse) {
      filtered = filtered.filter(c => c.numero_compte.startsWith(filterClasse));
    }

    filtered.sort((a, b) => a.numero_compte.localeCompare(b.numero_compte));
    setFilteredComptes(filtered);
  };

  const handleEdit = (compte: Compte) => {
    setEditingId(compte.id!);
    setEditLibelle(compte.libelle);
    setEditTauxTva(compte.taux_tva?.toString() || '');
    setEditCompteCharge(compte.compte_charge || '');
    setEditCompteTva(compte.compte_tva || '');
  };

  const handleSave = async (id: number) => {
    if (!entreprise) return;
    try {
      const updateData: { libelle?: string; taux_tva?: number | null; compte_charge?: string | null; compte_tva?: string | null } = {
        libelle: editLibelle,
        taux_tva: editTauxTva ? parseFloat(editTauxTva) : null,
        compte_charge: editCompteCharge || null,
        compte_tva: editCompteTva || null
      };
      await comptesApi.update(id, updateData);
      setEditingId(null);
      loadComptes(entreprise.id);
    } catch (err) {
      console.error('Erreur mise à jour compte:', err);
      alert('Erreur lors de la mise à jour du compte');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditLibelle('');
    setEditTauxTva('');
    setEditCompteCharge('');
    setEditCompteTva('');
  };

  const getClasseName = (numero: string) => {
    const classe = numero[0];
    const classNames: { [key: string]: string } = {
      '1': 'Capitaux',
      '2': 'Immobilisations',
      '3': 'Stocks',
      '4': 'Tiers',
      '5': 'Financiers',
      '6': 'Charges',
      '7': 'Produits',
      '8': 'Spéciaux',
    };
    return classNames[classe] || '';
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan Comptable</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 mb-4">
                ⚠️ Veuillez d'abord sélectionner une entreprise
              </p>
              <button
                onClick={() => router.push('/selection-entreprise')}
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
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => router.push(`/dashboard/${entreprise.id}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan Comptable</h2>
              {entreprise && (
                <p className="text-gray-600">
                  Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => router.push('/comptes')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              + Nouveau compte
            </button>
          </div>

          {/* Filtres */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rechercher
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Numéro ou libellé..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classe
              </label>
              <select
                value={filterClasse}
                onChange={(e) => setFilterClasse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les classes</option>
                <option value="1">Classe 1 - Capitaux</option>
                <option value="2">Classe 2 - Immobilisations</option>
                <option value="3">Classe 3 - Stocks</option>
                <option value="4">Classe 4 - Tiers</option>
                <option value="5">Classe 5 - Financiers</option>
                <option value="6">Classe 6 - Charges</option>
                <option value="7">Classe 7 - Produits</option>
                <option value="8">Classe 8 - Spéciaux</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 flex gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <p className="text-sm text-blue-700">
                <span className="font-bold text-lg">{filteredComptes.length}</span> compte{filteredComptes.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Table des comptes */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Numéro</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Libellé</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Classe</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Taux TVA</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Compte Charge</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Compte TVA</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredComptes.map((compte) => (
                  <tr
                    key={compte.id}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/comptes/${compte.numero_compte}`)}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                      {compte.numero_compte}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingId === compte.id ? (
                        <input
                          type="text"
                          value={editLibelle}
                          onChange={(e) => setEditLibelle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        compte.libelle
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                        {compte.numero_compte[0]} - {getClasseName(compte.numero_compte)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingId === compte.id ? (
                        <select
                          value={editTauxTva}
                          onChange={(e) => setEditTauxTva(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-32 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Aucun</option>
                          {tauxTvaList.map((t) => (
                            <option key={t.id} value={t.taux}>
                              {t.libelle} ({t.taux}%)
                            </option>
                          ))}
                        </select>
                      ) : (
                        compte.taux_tva ? `${compte.taux_tva}%` : '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingId === compte.id ? (
                        <input
                          type="text"
                          value={editCompteCharge}
                          onChange={(e) => setEditCompteCharge(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Ex: 6"
                          className="w-24 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      ) : (
                        <span className="font-mono text-blue-600">{compte.compte_charge || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingId === compte.id ? (
                        <input
                          type="text"
                          value={editCompteTva}
                          onChange={(e) => setEditCompteTva(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Ex: 44566"
                          className="w-24 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      ) : (
                        <span className="font-mono text-blue-600">{compte.compte_tva || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingId === compte.id ? (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSave(compte.id!)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                          >
                            ✓ Enregistrer
                          </button>
                          <button
                            onClick={handleCancel}
                            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-xs"
                          >
                            ✗ Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/comptes/edit/${compte.id}`)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                          >
                            Éditer
                          </button>
                          <button
                            onClick={() => handleEdit(compte)}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                          >
                            ✎ Modifier
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredComptes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun compte trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
