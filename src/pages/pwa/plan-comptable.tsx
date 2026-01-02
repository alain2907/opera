import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import { getDB } from '../../lib/indexedDB';

interface Compte {
  id?: number;
  numero_compte?: string;
  numeroCompte?: string;
  numero?: string;
  libelle?: string;
  nom?: string;
  type?: string;
  taux_tva?: number | null;
  tauxTva?: number | null;
  compte_charge?: string | null;
  compteCharge?: string | null;
  compte_tva?: string | null;
  compteTva?: string | null;
  entreprise_id?: number;
  entrepriseId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function PlanComptablePage() {
  const router = useRouter();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [filteredComptes, setFilteredComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClasse, setFilterClasse] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLibelle, setEditLibelle] = useState('');
  const [editTauxTva, setEditTauxTva] = useState<string>('');
  const [editCompteCharge, setEditCompteCharge] = useState<string>('');
  const [editCompteTva, setEditCompteTva] = useState<string>('');
  const [entrepriseActiveId, setEntrepriseActiveId] = useState<number | null>(null);
  const [entrepriseNom, setEntrepriseNom] = useState<string>('');

  useEffect(() => {
    const idStr = localStorage.getItem('pwa_entreprise_active_id');
    if (idStr) {
      const id = parseInt(idStr, 10);
      setEntrepriseActiveId(id);
      loadEntreprise(id);
      loadComptes(id);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [comptes, searchTerm, filterClasse]);

  const loadEntreprise = async (id: number) => {
    try {
      const db = await getDB();
      const entreprise = await db.get('entreprises', id);
      if (entreprise) {
        setEntrepriseNom(entreprise.raisonSociale || entreprise.raison_sociale || '');
      }
    } catch (err) {
      console.error('Erreur chargement entreprise:', err);
    }
  };

  const loadComptes = async (id: number) => {
    setLoading(true);
    try {
      const db = await getDB();
      const allComptes = await db.getAll('comptes');
      // Les comptes dans la base n'ont pas d'entrepriseId, on les affiche tous
      setComptes(allComptes);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...comptes];

    if (searchTerm) {
      filtered = filtered.filter(c => {
        const numero = c.numeroCompte || c.numero_compte || c.numero || '';
        const libelle = c.libelle || c.nom || '';
        return (
          numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
          libelle.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (filterClasse) {
      filtered = filtered.filter(c => {
        const numero = c.numeroCompte || c.numero_compte || c.numero || '';
        return numero.startsWith(filterClasse);
      });
    }

    filtered.sort((a, b) => {
      const numA = a.numeroCompte || a.numero_compte || a.numero || '';
      const numB = b.numeroCompte || b.numero_compte || b.numero || '';
      return numA.localeCompare(numB);
    });
    setFilteredComptes(filtered);
  };

  const handleEdit = (compte: Compte) => {
    const numeroCompte = compte.numeroCompte || compte.numero_compte || compte.numero || '';
    setEditingId(numeroCompte);
    setEditLibelle(compte.libelle || compte.nom || '');
    const taux = compte.tauxTva ?? compte.taux_tva;
    setEditTauxTva(taux?.toString() || '');
    setEditCompteCharge(compte.compteCharge || compte.compte_charge || '');
    setEditCompteTva(compte.compteTva || compte.compte_tva || '');
  };

  const handleSave = async (numeroCompte: string) => {
    if (!entrepriseActiveId) return;
    try {
      const db = await getDB();
      const compte = await db.get('comptes', numeroCompte);
      if (!compte) {
        console.error('Compte non trouvé:', numeroCompte);
        return;
      }

      const updated = {
        ...compte,
        nom: editLibelle,
        tauxTva: editTauxTva ? parseFloat(editTauxTva) : null,
        compteCharge: editCompteCharge || null,
        compteTva: editCompteTva || null,
        updatedAt: new Date().toISOString(),
      };

      await db.put('comptes', updated);
      setEditingId(null);
      loadComptes(entrepriseActiveId);
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

  const recalculerTypes = async () => {
    if (!confirm('Voulez-vous recalculer automatiquement le type de tous les comptes selon leur numéro ?')) {
      return;
    }

    setLoading(true);
    try {
      const db = await getDB();
      const allComptes = await db.getAll('comptes');
      let nbModifies = 0;

      for (const compte of allComptes) {
        const numero = compte.numero || '';
        let nouveauType = 'autre';

        if (numero.startsWith('1')) {
          nouveauType = 'capitaux';
        } else if (numero.startsWith('2')) {
          nouveauType = 'immobilisation';
        } else if (numero.startsWith('3')) {
          nouveauType = 'stock';
        } else if (numero.startsWith('4')) {
          nouveauType = 'tiers';
        } else if (numero.startsWith('5')) {
          nouveauType = 'financier';
        } else if (numero.startsWith('6')) {
          nouveauType = 'charge';
        } else if (numero.startsWith('7')) {
          nouveauType = 'produit';
        } else if (numero.startsWith('8')) {
          nouveauType = 'special';
        }

        if (compte.type !== nouveauType) {
          const updated = {
            ...compte,
            type: nouveauType,
            updatedAt: new Date().toISOString(),
          };
          await db.put('comptes', updated);
          nbModifies++;
        }
      }

      alert(`✓ ${nbModifies} compte(s) mis à jour`);
      if (entrepriseActiveId) {
        loadComptes(entrepriseActiveId);
      }
    } catch (err) {
      console.error('Erreur recalcul types:', err);
      alert('Erreur lors du recalcul des types');
    } finally {
      setLoading(false);
    }
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

  if (!entrepriseActiveId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <PWANavbar />
        <div className="max-w-6xl mx-auto p-8 pt-24">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan Comptable</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 mb-4">
                ⚠️ Veuillez d'abord sélectionner une entreprise
              </p>
              <button
                onClick={() => router.push('/pwa')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retour au Dashboard
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

  const tauxTvaOptions = [
    { taux: 20, libelle: 'TVA 20%' },
    { taux: 10, libelle: 'TVA 10%' },
    { taux: 5.5, libelle: 'TVA 5.5%' },
    { taux: 2.1, libelle: 'TVA 2.1%' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />
      <div className="max-w-7xl mx-auto p-8 pt-24">
        <button
          onClick={() => router.push('/pwa')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan Comptable</h2>
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entrepriseNom}</span>
              </p>
            </div>
            <button
              onClick={recalculerTypes}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
            >
              🔄 Recalculer types
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
                {filteredComptes.map((compte) => {
                  const numeroCompte = compte.numeroCompte || compte.numero_compte || compte.numero || '';
                  const libelle = compte.libelle || compte.nom || '';
                  const tauxTva = compte.tauxTva ?? compte.taux_tva;
                  const compteCharge = compte.compteCharge || compte.compte_charge;
                  const compteTva = compte.compteTva || compte.compte_tva;

                  return (
                    <tr
                      key={numeroCompte}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                        {numeroCompte}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === numeroCompte ? (
                          <input
                            type="text"
                            value={editLibelle}
                            onChange={(e) => setEditLibelle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          libelle
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                          {numeroCompte[0]} - {getClasseName(numeroCompte)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === numeroCompte ? (
                          <select
                            value={editTauxTva}
                            onChange={(e) => setEditTauxTva(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-32 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Aucun</option>
                            {tauxTvaOptions.map((t) => (
                              <option key={t.taux} value={t.taux}>
                                {t.libelle} ({t.taux}%)
                              </option>
                            ))}
                          </select>
                        ) : (
                          tauxTva ? `${tauxTva}%` : '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === numeroCompte ? (
                          <input
                            type="text"
                            value={editCompteCharge}
                            onChange={(e) => setEditCompteCharge(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Ex: 6"
                            className="w-24 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                          />
                        ) : (
                          <span className="font-mono text-blue-600">{compteCharge || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === numeroCompte ? (
                          <input
                            type="text"
                            value={editCompteTva}
                            onChange={(e) => setEditCompteTva(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Ex: 44566"
                            className="w-24 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                          />
                        ) : (
                          <span className="font-mono text-blue-600">{compteTva || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === numeroCompte ? (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleSave(numeroCompte)}
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(compte);
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
                          >
                            ✎ Modifier
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
