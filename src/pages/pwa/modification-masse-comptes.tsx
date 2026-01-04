import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEcritures,
  updateEcriture,
  getAllExercices,
  getAllEntreprises,
  getAllComptes,
} from '../../lib/storageAdapter';

export default function ModificationMasseComptesPWA() {
  const router = useRouter();

  // États
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);

  // Filtres
  const [journal, setJournal] = useState<string>('');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [compteSource, setCompteSource] = useState<string>('');
  const [compteDestination, setCompteDestination] = useState<string>('');

  // Résultats
  const [ecrituresFiltrees, setEcrituresFiltrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const journaux = ['AC', 'VE', 'BQ', 'CA', 'OD'];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadExercices();
    }
  }, [selectedEntreprise]);

  useEffect(() => {
    if (journal || dateDebut || dateFin || compteSource) {
      chargerApercu();
    } else {
      setEcrituresFiltrees([]);
    }
  }, [journal, dateDebut, dateFin, compteSource, selectedExercice]);

  async function loadData() {
    try {
      const [entData, comptesData] = await Promise.all([
        getAllEntreprises(),
        getAllComptes()
      ]);
      setEntreprises(entData);
      setComptes(comptesData.sort((a: any, b: any) => a.numero.localeCompare(b.numero)));

      // Entreprise active par défaut
      const entrepriseActiveId = localStorage.getItem('pwa_entreprise_active_id');
      if (entrepriseActiveId) {
        setSelectedEntreprise(Number(entrepriseActiveId));
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  }

  async function loadExercices() {
    if (!selectedEntreprise) return;

    try {
      const exData = await getAllExercices();
      const exercicesFiltered = exData.filter((ex: any) => {
        const entId = ex.entrepriseId || ex.entreprise_id;
        return entId === selectedEntreprise;
      });
      setExercices(exercicesFiltered);

      // Exercice actif par défaut
      const exerciceActiveId = localStorage.getItem('pwa_exercice_actif_id');
      if (exerciceActiveId) {
        setSelectedExercice(Number(exerciceActiveId));
      }
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  }

  async function chargerApercu() {
    if (!compteSource) {
      setEcrituresFiltrees([]);
      return;
    }

    setLoading(true);
    try {
      const allEcritures = await getAllEcritures();

      let filtered = allEcritures.filter((e: any) => {
        const compteNumero = e.compteNumero || e.compte_numero;
        if (compteNumero !== compteSource) return false;

        // Filtre par exercice
        if (selectedExercice) {
          const exId = e.exerciceId || e.exercice_id;
          if (exId !== selectedExercice) return false;
        }

        // Filtre par journal
        if (journal && e.journal !== journal) return false;

        // Filtre par dates
        if (dateDebut && e.date < dateDebut) return false;
        if (dateFin && e.date > dateFin) return false;

        return true;
      });

      filtered.sort((a, b) => a.date.localeCompare(b.date));
      setEcrituresFiltrees(filtered);
    } catch (error) {
      console.error('Erreur chargement aperçu:', error);
    } finally {
      setLoading(false);
    }
  }

  async function appliquerModification() {
    if (!compteSource || !compteDestination) {
      setMessage({ type: 'error', text: '⚠️ Veuillez sélectionner un compte source et un compte destination' });
      return;
    }

    if (compteSource === compteDestination) {
      setMessage({ type: 'error', text: '⚠️ Le compte source et destination doivent être différents' });
      return;
    }

    if (ecrituresFiltrees.length === 0) {
      setMessage({ type: 'error', text: '⚠️ Aucune écriture à modifier' });
      return;
    }

    const confirmation = confirm(
      `⚠️ ATTENTION ⚠️\n\n` +
      `Vous allez modifier ${ecrituresFiltrees.length} écriture(s)\n` +
      `Compte source : ${compteSource}\n` +
      `Compte destination : ${compteDestination}\n\n` +
      `Cette opération est IRRÉVERSIBLE.\n\n` +
      `Voulez-vous continuer ?`
    );

    if (!confirmation) return;

    setProcessing(true);
    setMessage({ type: 'success', text: '⏳ Modification en cours...' });

    try {
      let compteur = 0;

      for (const ecriture of ecrituresFiltrees) {
        await updateEcriture(ecriture.id, {
          compteNumero: compteDestination
        });
        compteur++;
      }

      setMessage({
        type: 'success',
        text: `✅ SUCCÈS !\n\n${compteur} écriture(s) modifiée(s)\nCompte ${compteSource} → ${compteDestination}`
      });

      // Réinitialiser les filtres
      setCompteSource('');
      setCompteDestination('');
      setEcrituresFiltrees([]);

    } catch (error: any) {
      console.error('Erreur modification:', error);
      setMessage({ type: 'error', text: `❌ Erreur : ${error.message}` });
    } finally {
      setProcessing(false);
    }
  }

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <PWANavbar />

      <div className="max-w-7xl mx-auto p-8 pt-24">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-purple-900 mb-2">
              🔄 Modification en Masse des Comptes
            </h1>
            <p className="text-gray-600">
              Modifier les numéros de compte par journal et période
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-5 rounded-lg shadow-lg ${
              message.type === 'success' ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'
            }`}>
              <div className="flex items-start gap-3">
                {processing && message.text.startsWith('⏳') && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-800 flex-shrink-0 mt-1"></div>
                )}
                <p className={`${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                } font-semibold text-lg whitespace-pre-line`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Sélection Entreprise/Exercice */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Entreprise
              </label>
              <select
                value={selectedEntreprise || ''}
                onChange={(e) => setSelectedEntreprise(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Sélectionner --</option>
                {entreprises.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.raison_sociale || ent.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Exercice
              </label>
              <select
                value={selectedExercice || ''}
                onChange={(e) => setSelectedExercice(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Tous les exercices</option>
                {exercices.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.annee} {ex.cloture ? '(Clôturé)' : '(En cours)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtres */}
          <div className="mb-8 bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">🔍 Filtres de sélection</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Journal
                </label>
                <select
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tous les journaux</option>
                  {journaux.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Comptes Source/Destination */}
          <div className="mb-8 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">🎯 Comptes à modifier</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Compte SOURCE (à remplacer) *
                </label>
                <select
                  value={compteSource}
                  onChange={(e) => setCompteSource(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 font-mono bg-red-50"
                >
                  <option value="">-- Sélectionner le compte à modifier --</option>
                  {comptes.map((c) => (
                    <option key={c.numero} value={c.numero}>
                      {c.numero} - {c.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Compte DESTINATION (nouveau compte) *
                </label>
                <select
                  value={compteDestination}
                  onChange={(e) => setCompteDestination(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono bg-green-50"
                >
                  <option value="">-- Sélectionner le nouveau compte --</option>
                  {comptes.map((c) => (
                    <option key={c.numero} value={c.numero}>
                      {c.numero} - {c.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement de l'aperçu...</p>
            </div>
          )}

          {!loading && ecrituresFiltrees.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  📋 Aperçu : {ecrituresFiltrees.length} écriture(s) à modifier
                </h3>
                <button
                  onClick={appliquerModification}
                  disabled={processing || !compteDestination}
                  className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
                    processing || !compteDestination
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {processing ? '⏳ Traitement...' : '✓ Appliquer la modification'}
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-300 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Journal</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">N° Pièce</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Compte</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Libellé</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Débit</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Crédit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ecrituresFiltrees.map((e, index) => (
                      <tr key={e.id || index} className="hover:bg-purple-50">
                        <td className="px-4 py-2 text-sm">{formatDate(e.date)}</td>
                        <td className="px-4 py-2 text-sm font-mono">{e.journal}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">
                          {e.pieceRef || e.piece_ref || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono font-bold text-red-600">
                          {e.compteNumero || e.compte_numero}
                        </td>
                        <td className="px-4 py-2 text-sm">{e.libelle}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">
                          {e.debit ? formatMontant(e.debit) + ' €' : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-mono">
                          {e.credit ? formatMontant(e.credit) + ' €' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && compteSource && ecrituresFiltrees.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-lg">
                Aucune écriture trouvée avec ces critères
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
