import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getAllEntreprises,
  getAllExercices,
  createEntreprise,
  updateEntreprise,
  deleteEntreprise,
  createExercice,
  updateExercice,
  deleteExercice,
} from '../../lib/storageAdapter';
import { deleteDB } from '../../lib/indexedDB';
import PWANavbar from '../../components/PWANavbar';

export default function EntreprisesPage() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showExerciceModal, setShowExerciceModal] = useState(false);
  const [editingEntreprise, setEditingEntreprise] = useState<any | null>(null);
  const [selectedEntrepriseForExercice, setSelectedEntrepriseForExercice] = useState<any | null>(null);
  const [editingExercice, setEditingExercice] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    raison_sociale: '',
    siret: '',
    forme_juridique: '',
    code_naf: '',
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
    email: '',
    capital_social: undefined as number | undefined,
    numero_tva_intra: '',
    regime_fiscal: 'Réel Normal',
    notes: '',
    actif: true,
    backgroundColor: '#f0f9ff', // Bleu clair par défaut
  });

  const [exerciceFormData, setExerciceFormData] = useState({
    annee: new Date().getFullYear(),
    dateDebut: `${new Date().getFullYear()}-01-01`,
    dateFin: `${new Date().getFullYear()}-12-31`,
    cloture: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [entreprisesData, exercicesData] = await Promise.all([
        getAllEntreprises(),
        getAllExercices()
      ]);
      setEntreprises(entreprisesData);

      // Filtrer les exercices invalides (ID 0 ou undefined)
      const validExercices = exercicesData.filter((ex: any) => ex.id && ex.id > 0);

      // Si des exercices invalides ont été filtrés, afficher un avertissement
      if (exercicesData.length !== validExercices.length) {
        const invalidCount = exercicesData.length - validExercices.length;
        console.warn(`${invalidCount} exercice(s) invalide(s) ignoré(s) (ID 0). Supprimez-les pour nettoyer la base.`);
      }

      setExercices(validExercices);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingEntreprise(null);
    setFormData({
      raison_sociale: '',
      siret: '',
      forme_juridique: '',
      code_naf: '',
      adresse: '',
      code_postal: '',
      ville: '',
      telephone: '',
      email: '',
      capital_social: undefined,
      numero_tva_intra: '',
      regime_fiscal: 'Réel Normal',
      notes: '',
      actif: true,
      backgroundColor: '#f0f9ff',
    });
    setShowModal(true);
  }

  function openEditModal(entreprise: any) {
    setEditingEntreprise(entreprise);
    setFormData({
      raison_sociale: entreprise.raison_sociale || entreprise.nom || '',
      siret: entreprise.siret || '',
      forme_juridique: entreprise.forme_juridique || '',
      code_naf: entreprise.code_naf || '',
      adresse: entreprise.adresse || '',
      code_postal: entreprise.code_postal || entreprise.codePostal || '',
      ville: entreprise.ville || '',
      telephone: entreprise.telephone || '',
      email: entreprise.email || '',
      capital_social: entreprise.capital_social,
      numero_tva_intra: entreprise.numero_tva_intra || '',
      regime_fiscal: entreprise.regime_fiscal || 'Réel Normal',
      notes: entreprise.notes || '',
      actif: entreprise.actif !== undefined ? entreprise.actif : true,
      backgroundColor: entreprise.backgroundColor || '#f0f9ff',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingEntreprise) {
        await updateEntreprise(editingEntreprise.id, formData);
      } else {
        await createEntreprise(formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde entreprise:', error);
      alert('Erreur lors de la sauvegarde');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Voulez-vous vraiment supprimer cette entreprise ?')) {
      return;
    }

    try {
      await deleteEntreprise(id);
      loadData();
    } catch (error) {
      console.error('Erreur suppression entreprise:', error);
      alert('Erreur lors de la suppression');
    }
  }

  function openExerciceModal(entreprise: any, exercice?: any) {
    setSelectedEntrepriseForExercice(entreprise);
    setEditingExercice(exercice || null);
    if (exercice) {
      setExerciceFormData({
        annee: exercice.annee,
        dateDebut: exercice.dateDebut || exercice.date_debut,
        dateFin: exercice.dateFin || exercice.date_fin,
        cloture: exercice.cloture,
      });
    } else {
      setExerciceFormData({
        annee: new Date().getFullYear(),
        dateDebut: `${new Date().getFullYear()}-01-01`,
        dateFin: `${new Date().getFullYear()}-12-31`,
        cloture: false,
      });
    }
    setShowExerciceModal(true);
  }

  async function handleExerciceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntrepriseForExercice) return;

    try {
      if (editingExercice) {
        await updateExercice(editingExercice.id, exerciceFormData);
      } else {
        await createExercice({
          ...exerciceFormData,
          entrepriseId: selectedEntrepriseForExercice.id,
        });
      }
      setShowExerciceModal(false);
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde exercice:', error);
      alert('Erreur lors de la sauvegarde de l\'exercice');
    }
  }

  async function handleExerciceDelete(id: number) {
    if (!confirm('Supprimer cet exercice ? Toutes les écritures associées seront supprimées.')) {
      return;
    }

    try {
      await deleteExercice(id);
      loadData();
    } catch (error) {
      console.error('Erreur suppression exercice:', error);
      alert('Erreur lors de la suppression de l\'exercice');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PWANavbar />

      {/* Header */}
      <div className="bg-white shadow mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/pwa')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Mes Entreprises</h1>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Nouvelle entreprise
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {entreprises.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Aucune entreprise</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer votre première entreprise
            </p>
            <div className="mt-6">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                + Créer une entreprise
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {entreprises.map((entreprise) => {
              const entrepriseExercices = exercices.filter(
                (ex) => (ex.entrepriseId || ex.entreprise_id) === entreprise.id
              );

              return (
                <div
                  key={entreprise.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {entreprise.raison_sociale || entreprise.nom}
                        </h3>
                        {entreprise.forme_juridique && (
                          <p className="text-sm text-gray-500 mb-1">{entreprise.forme_juridique}</p>
                        )}
                        {entreprise.siret && (
                          <p className="text-sm text-gray-600 mb-1">SIRET: {entreprise.siret}</p>
                        )}
                        {entreprise.adresse && (
                          <p className="text-sm text-gray-600">{entreprise.adresse}</p>
                        )}
                        {(entreprise.code_postal || entreprise.codePostal || entreprise.ville) && (
                          <p className="text-sm text-gray-600">
                            {entreprise.code_postal || entreprise.codePostal} {entreprise.ville}
                          </p>
                        )}
                        {entreprise.telephone && (
                          <p className="text-sm text-gray-600 mt-2">📞 {entreprise.telephone}</p>
                        )}
                        {entreprise.email && (
                          <p className="text-sm text-gray-600">✉️ {entreprise.email}</p>
                        )}
                      </div>
                      {entreprise.actif === false && (
                        <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Exercices */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Exercices comptables</h4>
                        <button
                          onClick={() => openExerciceModal(entreprise)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                        >
                          + Nouvel exercice
                        </button>
                      </div>
                      {entrepriseExercices.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Aucun exercice</p>
                      ) : (
                        <div className="space-y-2">
                          {entrepriseExercices.map((exercice) => {
                            const dateDebut = new Date(exercice.dateDebut || exercice.date_debut).toLocaleDateString('fr-FR');
                            const dateFin = new Date(exercice.dateFin || exercice.date_fin).toLocaleDateString('fr-FR');

                            return (
                              <div
                                key={exercice.id}
                                className="flex items-center justify-between bg-gray-50 p-3 rounded hover:bg-gray-100 transition-colors"
                              >
                                <div
                                  className="flex-1 cursor-pointer"
                                  onClick={() => router.push(`/pwa/dashboard/${entreprise.id}?exercice=${exercice.id}`)}
                                >
                                  <p className="text-sm font-medium text-gray-900">
                                    Exercice {exercice.annee}
                                    {exercice.cloture && (
                                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                                        Clôturé
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">{dateDebut} → {dateFin}</p>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openExerciceModal(entreprise, exercice);
                                    }}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExerciceDelete(exercice.id);
                                    }}
                                    className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-3 flex gap-2">
                    <button
                      onClick={() => router.push(`/pwa/dashboard/${entreprise.id}`)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Ouvrir
                    </button>
                    <button
                      onClick={() => openEditModal(entreprise)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(entreprise.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingEntreprise ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Section 1: Informations principales */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                      <span>📋</span> Informations principales
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Raison sociale *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.raison_sociale}
                          onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Forme juridique
                        </label>
                        <select
                          value={formData.forme_juridique}
                          onChange={(e) => setFormData({ ...formData, forme_juridique: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="SARL">SARL</option>
                          <option value="SAS">SAS</option>
                          <option value="SASU">SASU</option>
                          <option value="EURL">EURL</option>
                          <option value="SA">SA</option>
                          <option value="SNC">SNC</option>
                          <option value="Auto-entrepreneur">Auto-entrepreneur</option>
                          <option value="EI">EI</option>
                          <option value="Association">Association</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SIRET
                          </label>
                          <input
                            type="text"
                            value={formData.siret}
                            onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Code NAF
                          </label>
                          <input
                            type="text"
                            value={formData.code_naf}
                            onChange={(e) => setFormData({ ...formData, code_naf: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Coordonnées */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                      <span>📍</span> Coordonnées
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Adresse
                        </label>
                        <input
                          type="text"
                          value={formData.adresse}
                          onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Code postal
                          </label>
                          <input
                            type="text"
                            value={formData.code_postal}
                            onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ville
                          </label>
                          <input
                            type="text"
                            value={formData.ville}
                            onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Téléphone
                          </label>
                          <input
                            type="tel"
                            value={formData.telephone}
                            onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Informations fiscales */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
                      <span>💰</span> Informations fiscales
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Capital social (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.capital_social ?? ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              capital_social: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            N° TVA Intracommunautaire
                          </label>
                          <input
                            type="text"
                            value={formData.numero_tva_intra}
                            onChange={(e) => setFormData({ ...formData, numero_tva_intra: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Régime fiscal
                        </label>
                        <select
                          value={formData.regime_fiscal}
                          onChange={(e) => setFormData({ ...formData, regime_fiscal: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Réel Normal">Réel Normal</option>
                          <option value="Réel Simplifié">Réel Simplifié</option>
                          <option value="Micro-entreprise">Micro-entreprise</option>
                          <option value="Micro-BIC">Micro-BIC</option>
                          <option value="Micro-BNC">Micro-BNC</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Notes */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span>📝</span> Notes
                    </h3>
                    <div>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Notes internes..."
                      />
                    </div>
                  </div>

                  {/* Section 5: Personnalisation */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                      <span>🎨</span> Personnalisation
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Couleur de fond (toutes les pages PWA)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="color"
                          value={formData.backgroundColor}
                          onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                          className="h-12 w-20 rounded border border-gray-300 cursor-pointer"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={formData.backgroundColor}
                            onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                            placeholder="#f0f9ff"
                          />
                        </div>
                        <div
                          className="h-12 w-20 rounded border border-gray-300"
                          style={{ backgroundColor: formData.backgroundColor }}
                          title="Aperçu de la couleur"
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Choisissez une couleur pour identifier visuellement cette entreprise
                      </p>
                    </div>
                  </div>

                  {/* Actif checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="actif"
                      checked={formData.actif}
                      onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="actif" className="ml-2 block text-sm font-medium text-gray-700">
                      Entreprise active
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingEntreprise ? 'Enregistrer' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exercice */}
      {showExerciceModal && selectedEntrepriseForExercice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {editingExercice ? 'Modifier l\'exercice' : 'Nouvel exercice'}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Entreprise : {selectedEntrepriseForExercice.raison_sociale || selectedEntrepriseForExercice.nom}
              </p>

              <form onSubmit={handleExerciceSubmit} className="space-y-4">
                {/* Année */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={exerciceFormData.annee}
                    onChange={(e) => setExerciceFormData({ ...exerciceFormData, annee: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Date début */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={exerciceFormData.dateDebut}
                    onChange={(e) => setExerciceFormData({ ...exerciceFormData, dateDebut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Date fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={exerciceFormData.dateFin}
                    onChange={(e) => setExerciceFormData({ ...exerciceFormData, dateFin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Clôturé */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="cloture"
                    checked={exerciceFormData.cloture}
                    onChange={(e) => setExerciceFormData({ ...exerciceFormData, cloture: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="cloture" className="ml-2 text-sm text-gray-700">
                    Exercice clôturé
                  </label>
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowExerciceModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingExercice ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
