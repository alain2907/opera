import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getAllEntreprises,
  getAllExercices,
  getExercicesByEntreprise,
  createExercice,
  updateExercice,
  deleteExercice,
} from '../../lib/storageAdapter';
import PWANavbar from '../../components/PWANavbar';

interface Entreprise {
  id: number;
  raison_sociale: string;
  siren: string;
  siret?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
}

interface Exercice {
  id: number;
  entreprise_id: number;
  entrepriseId: number;
  annee: number;
  date_debut: string;
  dateDebut: string;
  date_fin: string;
  dateFin: string;
  cloture: boolean;
}

export default function ExercicesPWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExercice, setEditingExercice] = useState<Exercice | null>(null);

  const [formData, setFormData] = useState({
    annee: new Date().getFullYear(),
    dateDebut: `${new Date().getFullYear()}-01-01`,
    dateFin: `${new Date().getFullYear()}-12-31`,
    cloture: false,
  });

  useEffect(() => {
    loadEntreprises();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadExercices();
    }
  }, [selectedEntreprise]);

  async function loadEntreprises() {
    try {
      const data = await getAllEntreprises();
      setEntreprises(data);
      // Par défaut, afficher tous les exercices
      setSelectedEntreprise(-1);
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadExercices() {
    try {
      let data;
      if (selectedEntreprise === -1) {
        // Toutes les entreprises
        data = await getAllExercices();
      } else if (selectedEntreprise) {
        data = await getExercicesByEntreprise(selectedEntreprise);
      } else {
        data = [];
      }
      setExercices(data);
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  }

  function openCreateModal() {
    setEditingExercice(null);
    setFormData({
      annee: new Date().getFullYear(),
      dateDebut: `${new Date().getFullYear()}-01-01`,
      dateFin: `${new Date().getFullYear()}-12-31`,
      cloture: false,
    });
    setShowModal(true);
  }

  function openEditModal(exercice: Exercice) {
    setEditingExercice(exercice);
    setFormData({
      annee: exercice.annee,
      dateDebut: exercice.dateDebut || exercice.date_debut,
      dateFin: exercice.dateFin || exercice.date_fin,
      cloture: exercice.cloture,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedEntreprise) {
      alert('Veuillez sélectionner une entreprise');
      return;
    }

    try {
      if (editingExercice) {
        await updateExercice(editingExercice.id, formData);
      } else {
        await createExercice({
          ...formData,
          entrepriseId: selectedEntreprise,
        });
      }

      setShowModal(false);
      loadExercices();
    } catch (error) {
      console.error('Erreur sauvegarde exercice:', error);
      alert('Erreur lors de la sauvegarde');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cet exercice ? Toutes les écritures associées seront supprimées.')) {
      return;
    }

    try {
      await deleteExercice(id);
      loadExercices();
    } catch (error) {
      console.error('Erreur suppression exercice:', error);
      alert('Erreur lors de la suppression');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (entreprises.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucune entreprise</h2>
          <p className="text-gray-600 mb-6">Créez d'abord une entreprise</p>
          <button
            onClick={() => router.push('/pwa/entreprises')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Gérer les entreprises
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PWANavbar />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/pwa')}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Retour
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Exercices comptables</h1>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Nouvel exercice
            </button>
          </div>
        </div>
      </div>

      {/* Sélection entreprise */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Entreprise
          </label>
          <select
            value={selectedEntreprise || ''}
            onChange={(e) => setSelectedEntreprise(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="-1">Toutes les entreprises</option>
            {entreprises.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.raison_sociale} ({ent.siren})
              </option>
            ))}
          </select>
        </div>

        {/* Liste des exercices */}
        {exercices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">Aucun exercice pour cette entreprise</p>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Créer le premier exercice
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exercices.map((exercice) => {
              const dateDebut = new Date(exercice.dateDebut || exercice.date_debut).toLocaleDateString('fr-FR');
              const dateFin = new Date(exercice.dateFin || exercice.date_fin).toLocaleDateString('fr-FR');
              const entreprise = entreprises.find((e) => e.id === (exercice.entrepriseId || exercice.entreprise_id));

              return (
                <div
                  key={exercice.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Exercice {exercice.annee}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium mt-1">
                        {entreprise?.raison_sociale || 'Entreprise inconnue'}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {dateDebut} → {dateFin}
                      </p>
                    </div>
                    {exercice.cloture && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                        Clôturé
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(exercice)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(exercice.id)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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

      {/* Modal Créer/Modifier */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingExercice ? 'Modifier l\'exercice' : 'Nouvel exercice'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Année */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    value={formData.dateDebut}
                    onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    value={formData.dateFin}
                    onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                {/* Clôturé */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="cloture"
                    checked={formData.cloture}
                    onChange={(e) => setFormData({ ...formData, cloture: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="cloture" className="ml-2 text-sm text-gray-700">
                    Exercice clôturé
                  </label>
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
