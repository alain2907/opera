import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../../components/TopMenu';
import { useEntreprise } from '../../contexts/EntrepriseContext';
import { journauxApi, type Journal } from '../../api/journaux';

export default function JournauxEditionPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJournal, setSelectedJournal] = useState<string>('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  useEffect(() => {
    if (!entreprise || !exercice) {
      router.push('/selection-entreprise');
      return;
    }
    loadJournaux();

    // Initialiser les dates avec l'exercice en cours
    const debut = new Date(exercice.date_debut);
    const fin = new Date(exercice.date_fin);
    setDateDebut(debut.toISOString().split('T')[0]);
    setDateFin(fin.toISOString().split('T')[0]);
  }, [entreprise, exercice]);

  const loadJournaux = async () => {
    if (!entreprise) return;

    try {
      setLoading(true);
      const data = await journauxApi.findByEntreprise(entreprise.id);
      setJournaux(data.filter(j => j.actif)); // Seulement les journaux actifs
    } catch (err) {
      console.error('Erreur lors du chargement des journaux:', err);
      alert('Erreur lors du chargement des journaux');
    } finally {
      setLoading(false);
    }
  };

  const handleAfficher = () => {
    if (!selectedJournal) {
      alert('Veuillez sélectionner un journal');
      return;
    }
    if (!dateDebut || !dateFin) {
      alert('Veuillez sélectionner une période');
      return;
    }

    // Rediriger vers la page d'affichage des écritures
    const journal = journaux.find(j => j.id === parseInt(selectedJournal));
    if (journal) {
      router.push(`/journaux/${journal.code}/ecritures?dateDebut=${dateDebut}&dateFin=${dateFin}`);
    }
  };

  if (!entreprise || !exercice) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Édition des journaux
            </h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              <span className="ml-4">
                Exercice : {new Date(exercice.date_debut).getFullYear()}
              </span>
            </p>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sélection du journal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Journal <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedJournal}
                  onChange={(e) => setSelectedJournal(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Sélectionnez un journal --</option>
                  {journaux.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.code} - {journal.libelle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Période */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Raccourcis période */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Raccourcis période</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth(), 1);
                      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      setDateDebut(start.toISOString().split('T')[0]);
                      setDateFin(end.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Mois en cours
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const end = new Date(now.getFullYear(), now.getMonth(), 0);
                      setDateDebut(start.toISOString().split('T')[0]);
                      setDateFin(end.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Mois dernier
                  </button>
                  <button
                    onClick={() => {
                      const debut = new Date(exercice.date_debut);
                      const fin = new Date(exercice.date_fin);
                      setDateDebut(debut.toISOString().split('T')[0]);
                      setDateFin(fin.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Exercice complet
                  </button>
                </div>
              </div>

              {/* Bouton afficher */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleAfficher}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium text-lg"
                >
                  📋 Afficher les écritures
                </button>
              </div>

              {/* Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                <p className="font-semibold mb-2">ℹ️ Informations</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Sélectionnez un journal et une période</li>
                  <li>Les écritures seront affichées avec : N° | Date | Pièce | Compte | Libellé | Débit | Crédit</li>
                  <li>Les totaux sont calculés automatiquement par mois</li>
                  <li>Seuls les journaux actifs sont affichés</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
