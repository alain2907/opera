import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEntreprises,
  getAllExercices,
  getAllEcritures
} from '../../lib/storageAdapter';
import { migrateNumeroEcriture } from '../../lib/migrateNumeroEcriture';

interface Entreprise {
  id: number;
  raison_sociale?: string;
  nom?: string;
}

interface Exercice {
  id: number;
  entreprise_id?: number;
  entrepriseId?: number;
  annee: number;
  date_debut?: string;
  dateDebut?: string;
  date_fin?: string;
  dateFin?: string;
  cloture?: boolean;
}

interface Ecriture {
  id: number;
  exercice_id?: number;
  exerciceId?: number;
  date: string;
  journal: string;
  pieceRef?: string;
  piece_ref?: string;
  compteNumero?: string;
  compte_numero?: string;
  libelle?: string;
  debit?: number;
  credit?: number;
}

const JOURNAUX_LABELS: Record<string, string> = {
  'AC': 'Achats',
  'VE': 'Ventes',
  'BQ': 'Banque',
  'CA': 'Caisse',
  'OD': 'Opérations Diverses',
  'AN': 'À-nouveaux',
  'HA': 'Honoraires',
};

export default function JournauxPWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedEntrepriseId, setSelectedEntrepriseId] = useState<number | null>(null);
  const [selectedExerciceId, setSelectedExerciceId] = useState<number | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [toutesEcritures, setToutesEcritures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Charger depuis les paramètres URL
  useEffect(() => {
    if (router.query.journal && router.query.month) {
      setSelectedJournal(router.query.journal as string);
      setSelectedMonth(router.query.month as string);
    }
  }, [router.query]);

  // Réinitialiser l'exercice quand on change d'entreprise
  useEffect(() => {
    if (selectedEntrepriseId) {
      const exercicesEntreprise = exercices.filter(ex => (ex.entrepriseId || ex.entreprise_id) === selectedEntrepriseId);
      const exerciceEnCours = exercicesEntreprise.find((ex: any) => !ex.cloture);
      if (exerciceEnCours) {
        setSelectedExerciceId(exerciceEnCours.id);
      } else if (exercicesEntreprise.length > 0) {
        setSelectedExerciceId(exercicesEntreprise[0].id);
      } else {
        setSelectedExerciceId(null);
      }
      setSelectedMonth(''); // Réinitialiser le mois aussi
    }
  }, [selectedEntrepriseId, exercices]);

  // Réinitialiser le mois quand on change de journal
  useEffect(() => {
    setSelectedMonth('');
  }, [selectedJournal]);

  useEffect(() => {
    if (selectedEntrepriseId && selectedJournal && selectedMonth) {
      loadEcritures();
    }
  }, [selectedEntrepriseId, selectedExerciceId, selectedJournal, selectedMonth]);

  const loadInitialData = async () => {
    try {
      const allEntreprises = await getAllEntreprises();
      setEntreprises(allEntreprises);

      const allExercices = await getAllExercices();
      const uniqueExercices = allExercices.filter((ex: any, index: number, self: any[]) =>
        index === self.findIndex((e: any) => e.id === ex.id)
      );
      setExercices(uniqueExercices);

      // Sélectionner la première entreprise par défaut
      if (allEntreprises.length > 0) {
        setSelectedEntrepriseId(allEntreprises[0].id);
      }

      // Sélectionner l'exercice en cours par défaut
      const exerciceEnCours = uniqueExercices.find((ex: any) => !ex.cloture);
      if (exerciceEnCours) {
        setSelectedExerciceId(exerciceEnCours.id);
      }

      // Charger toutes les écritures pour le menu des mois
      const allEcritures = await getAllEcritures();
      setToutesEcritures(allEcritures);

      // Sélectionner le premier journal disponible
      const journauxUniques = Array.from(new Set(allEcritures.map((e: any) => e.journal).filter(Boolean))).sort();
      if (journauxUniques.length > 0) {
        setSelectedJournal(journauxUniques[0]);
      }
    } catch (error) {
      console.error('Erreur chargement données initiales:', error);
    }
  };

  const loadEcritures = async () => {
    setLoading(true);
    try {
      const allEcritures = await getAllEcritures();

      // Obtenir les IDs des exercices de l'entreprise sélectionnée
      const exercicesEntreprise = selectedEntrepriseId
        ? exercices.filter(ex => (ex.entrepriseId || ex.entreprise_id) === selectedEntrepriseId)
        : exercices;
      const exerciceIds = exercicesEntreprise.map(ex => ex.id);

      // Filtrer par journal et mois
      const filtered = allEcritures.filter((e: any) => {
        const eJournal = e.journal;
        const eDate = e.date;
        const eMois = eDate ? eDate.substring(0, 7) : '';
        const eExerciceId = e.exerciceId || e.exercice_id;

        // Filtre journal
        if (eJournal !== selectedJournal) return false;

        // Filtre mois
        if (eMois !== selectedMonth) return false;

        // Filtre par exercices de l'entreprise
        if (selectedEntrepriseId && eExerciceId && !exerciceIds.includes(eExerciceId)) return false;

        // Filtre exercice spécifique (optionnel)
        if (selectedExerciceId && eExerciceId !== selectedExerciceId) return false;

        return true;
      });

      // Trier par date puis par piece_ref
      filtered.sort((a: any, b: any) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);

        const pieceA = a.pieceRef || a.piece_ref || '';
        const pieceB = b.pieceRef || b.piece_ref || '';
        return pieceA.localeCompare(pieceB);
      });

      setEcritures(filtered);
    } catch (error) {
      console.error('Erreur chargement écritures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    if (!confirm('Voulez-vous migrer toutes les écritures existantes pour générer les numéros d\'écritures ?\n\nCette opération peut prendre quelques secondes.')) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);

    try {
      const result = await migrateNumeroEcriture();
      setMigrationResult(`✅ Migration réussie : ${result.ecritures} écritures, ${result.migrated} lignes mises à jour`);

      // Recharger les données
      const allEcritures = await getAllEcritures();
      setToutesEcritures(allEcritures);
      if (selectedJournal && selectedMonth) {
        loadEcritures();
      }
    } catch (error) {
      console.error('Erreur migration:', error);
      setMigrationResult('❌ Erreur lors de la migration');
    } finally {
      setMigrating(false);
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
  };

  const getTotaux = () => {
    const totalDebit = ecritures.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
    const totalCredit = ecritures.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);

    // Compter le nombre d'écritures (groupées par date + N° pièce)
    const ecrituresUniques = new Set<string>();
    ecritures.forEach((e: any) => {
      const pieceRef = e.pieceRef || e.piece_ref || '';
      const date = e.date || '';
      const key = `${date}|${pieceRef}`;
      ecrituresUniques.add(key);
    });
    const nombreEcritures = ecrituresUniques.size;

    return { totalDebit, totalCredit, nombreEcritures };
  };

  const getMoisExercice = () => {
    // Obtenir les IDs des exercices de l'entreprise sélectionnée
    const exercicesEntreprise = selectedEntrepriseId
      ? exercices.filter(ex => (ex.entrepriseId || ex.entreprise_id) === selectedEntrepriseId)
      : exercices;
    const exerciceIds = exercicesEntreprise.map(ex => ex.id);

    // Filtrer les écritures par journal et exercices de l'entreprise
    const ecrituresJournal = toutesEcritures.filter((e: any) => {
      if (e.journal !== selectedJournal) return false;

      // Filtrer par exercices de l'entreprise
      const eExerciceId = e.exerciceId || e.exercice_id;
      if (selectedEntrepriseId && eExerciceId && !exerciceIds.includes(eExerciceId)) return false;

      // Si un exercice spécifique est sélectionné, filtrer aussi par celui-ci
      if (selectedExerciceId && eExerciceId !== selectedExerciceId) return false;

      return true;
    });

    // Extraire les mois uniques avec leurs écritures
    const moisSet = new Set<string>();
    ecrituresJournal.forEach((e: any) => {
      if (e.date) {
        moisSet.add(e.date.substring(0, 7));
      }
    });

    // Convertir en tableau et trier
    const moisArray = Array.from(moisSet).sort();

    // Formater pour le select
    return moisArray.map(moisValue => {
      const [year, month] = moisValue.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return {
        value: moisValue,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      };
    });
  };

  const totaux = getTotaux();
  const journalLibelle = JOURNAUX_LABELS[selectedJournal] || selectedJournal;
  const moisDisponibles = getMoisExercice();

  // Obtenir la liste des journaux qui ont des écritures
  const journauxDisponibles = Array.from(new Set(toutesEcritures.map((e: any) => e.journal).filter(Boolean)))
    .sort()
    .map(code => ({ code, libelle: JOURNAUX_LABELS[code] || code }));

  // Filtrer les exercices par entreprise
  const exercicesFiltres = selectedEntrepriseId
    ? exercices.filter(ex => (ex.entrepriseId || ex.entreprise_id) === selectedEntrepriseId)
    : exercices;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PWANavbar />

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* En-tête */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 mb-2">
                📒 Journaux Comptables
              </h1>
              <p className="text-gray-600">Consultation des écritures par journal et par mois</p>
            </div>
            <button
              onClick={handleMigration}
              disabled={migrating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {migrating ? '⏳ Migration...' : '🔄 Migrer numéros'}
            </button>
          </div>

          {/* Résultat de migration */}
          {migrationResult && (
            <div className={`mb-4 p-4 rounded-lg ${migrationResult.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {migrationResult}
            </div>
          )}

          {/* Filtres */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Entreprise
              </label>
              <select
                value={selectedEntrepriseId || ''}
                onChange={(e) => setSelectedEntrepriseId(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner...</option>
                {entreprises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.raison_sociale || e.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Exercice
              </label>
              <select
                value={selectedExerciceId || ''}
                onChange={(e) => setSelectedExerciceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les exercices</option>
                {exercicesFiltres.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.annee} {ex.cloture ? '(Clôturé)' : '(En cours)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Journal
              </label>
              <select
                value={selectedJournal}
                onChange={(e) => setSelectedJournal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {journauxDisponibles.map((j) => (
                  <option key={j.code} value={j.code}>
                    {j.code} - {j.libelle}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un mois...</option>
                {moisDisponibles.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Nombre d'écritures</p>
              <p className="text-2xl font-bold text-blue-600">{totaux.nombreEcritures}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Débit</p>
              <p className="text-2xl font-bold text-green-600">{formatMontant(totaux.totalDebit)} €</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Crédit</p>
              <p className="text-2xl font-bold text-red-600">{formatMontant(totaux.totalCredit)} €</p>
            </div>
          </div>

          {/* Titre du journal */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Journal {selectedJournal} - {journalLibelle}
            </h2>
            <p className="text-sm text-gray-600">
              {selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>

          {/* Tableau */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : ecritures.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune écriture trouvée pour ce journal et cette période</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th className="px-4 py-3 text-left text-sm font-semibold">N° Écriture</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">N° Pièce</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Compte</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Libellé</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Débit</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ecritures.map((ecriture: any, index) => (
                    <tr
                      key={ecriture.id || index}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/pwa/ecritures?id=${ecriture.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-blue-600">
                        {ecriture.numeroEcriture || `#${ecriture.id}`}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(ecriture.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {ecriture.pieceRef || ecriture.piece_ref || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {ecriture.compteNumero || ecriture.compte_numero}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {ecriture.libelle}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                        {ecriture.debit ? formatMontant(ecriture.debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-red-700">
                        {ecriture.credit ? formatMontant(ecriture.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={5} className="px-4 py-3 text-sm text-right">
                      TOTAUX
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-red-700">
                      {formatMontant(totaux.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
