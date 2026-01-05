import React, { useState, useEffect, useRef } from 'react';
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
  const [fromUrlParams, setFromUrlParams] = useState(false);
  const initialLoadRef = useRef(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedEcriture, setEditedEcriture] = useState<any>(null);
  const [ajoutLigneNumeroEcriture, setAjoutLigneNumeroEcriture] = useState<string | null>(null);
  const [nouvelleLigne, setNouvelleLigne] = useState<any>({
    compteNumero: '',
    libelle: '',
    debit: '',
    credit: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  // Charger depuis les paramètres URL
  useEffect(() => {
    if (!router.isReady) return;

    const { journal, month, entreprise, exercice } = router.query;
    console.log('🔍 URL params:', { journal, month, entreprise, exercice });

    if (entreprise || exercice || journal || month) {
      setFromUrlParams(true);
      if (entreprise) {
        console.log('✅ Setting entreprise:', Number(entreprise));
        setSelectedEntrepriseId(Number(entreprise));
      }
      if (exercice) {
        console.log('✅ Setting exercice:', Number(exercice));
        setSelectedExerciceId(Number(exercice));
      }
      if (journal) {
        console.log('✅ Setting journal:', journal);
        setSelectedJournal(journal as string);
      }
      if (month) {
        console.log('✅ Setting month:', month);
        setSelectedMonth(month as string);
      }
      // Désactiver la protection après que les états soient définis
      setTimeout(() => {
        console.log('⏰ Désactivation de la protection initialLoad');
        initialLoadRef.current = false;
      }, 100);
    } else {
      // Pas de paramètres URL, désactiver la protection
      initialLoadRef.current = false;
    }
  }, [router.isReady, router.query]);

  // Réinitialiser l'exercice quand on change d'entreprise (sauf si venant de l'URL)
  useEffect(() => {
    if (selectedEntrepriseId && !fromUrlParams) {
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

  // Réinitialiser le mois quand on change de journal (sauf si chargement initial ou si journal vide)
  useEffect(() => {
    console.log('📝 Journal changed, initialLoad:', initialLoadRef.current, 'selectedJournal:', selectedJournal);
    // Ne pas réinitialiser si journal vide (initialisation) ou pendant le chargement initial
    if (!selectedJournal) {
      console.log('⏭️ Skipping reset because journal is empty');
      return;
    }
    if (initialLoadRef.current) {
      console.log('⏭️ Skipping reset because initial load');
      return;
    }
    console.log('❌ Resetting month because user changed journal');
    setSelectedMonth('');
  }, [selectedJournal]);

  useEffect(() => {
    console.log('🔄 Check loading:', { selectedEntrepriseId, selectedJournal, selectedMonth, exercicesCount: exercices.length });
    if (selectedEntrepriseId && selectedJournal && selectedMonth && exercices.length > 0) {
      console.log('✅ Loading écritures...');
      loadEcritures();
    } else {
      console.log('❌ Not loading - missing:', {
        entreprise: !selectedEntrepriseId,
        journal: !selectedJournal,
        month: !selectedMonth,
        exercices: exercices.length === 0
      });
    }
  }, [selectedEntrepriseId, selectedExerciceId, selectedJournal, selectedMonth, exercices]);

  const loadInitialData = async () => {
    try {
      const allEntreprises = await getAllEntreprises();
      setEntreprises(allEntreprises);

      const allExercices = await getAllExercices();
      const uniqueExercices = allExercices.filter((ex: any, index: number, self: any[]) =>
        index === self.findIndex((e: any) => e.id === ex.id)
      );
      setExercices(uniqueExercices);

      // Charger toutes les écritures pour le menu des mois
      const allEcritures = await getAllEcritures();
      setToutesEcritures(allEcritures);

      // Ne pré-sélectionner que si pas de paramètres URL
      const hasUrlParams = router.query.entreprise || router.query.exercice || router.query.journal || router.query.month;

      if (!hasUrlParams) {
        // Sélectionner la première entreprise par défaut
        if (allEntreprises.length > 0) {
          setSelectedEntrepriseId(allEntreprises[0].id);
        }

        // Sélectionner l'exercice en cours par défaut
        const exerciceEnCours = uniqueExercices.find((ex: any) => !ex.cloture);
        if (exerciceEnCours) {
          setSelectedExerciceId(exerciceEnCours.id);
        }

        // Sélectionner le premier journal disponible
        const journauxUniques = Array.from(new Set(allEcritures.map((e: any) => e.journal).filter(Boolean))).sort();
        if (journauxUniques.length > 0) {
          setSelectedJournal(journauxUniques[0]);
        }
      }
    } catch (error) {
      console.error('Erreur chargement données initiales:', error);
    }
  };

  const loadEcritures = async () => {
    console.log('📥 loadEcritures called with:', { selectedEntrepriseId, selectedExerciceId, selectedJournal, selectedMonth });
    setLoading(true);
    try {
      const allEcritures = await getAllEcritures();
      console.log('📊 Total écritures:', allEcritures.length);

      // Obtenir les IDs des exercices de l'entreprise sélectionnée
      const exercicesEntreprise = selectedEntrepriseId
        ? exercices.filter(ex => (ex.entrepriseId || ex.entreprise_id) === selectedEntrepriseId)
        : exercices;
      const exerciceIds = exercicesEntreprise.map(ex => ex.id);
      console.log('🏢 Exercice IDs de l\'entreprise:', exerciceIds);

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

      console.log('✅ Écritures filtrées:', filtered.length);

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
      console.log('💾 Écritures set in state');
    } catch (error) {
      console.error('❌ Erreur chargement écritures:', error);
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

  const handleEditClick = (ecriture: any) => {
    setEditingId(ecriture.id);
    setEditedEcriture({ ...ecriture });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedEcriture(null);
  };

  const handleSaveEdit = async () => {
    if (!editedEcriture) return;

    try {
      const { updateEcriture, getCompte, createCompte } = await import('../../lib/storageAdapter');

      const compteNumero = editedEcriture.compteNumero || editedEcriture.compte_numero;

      // Vérifier si le compte existe, sinon le créer
      if (compteNumero) {
        const compteExistant = await getCompte(compteNumero);
        if (compteExistant) {
          console.log(`✅ Compte ${compteNumero} existe déjà`);
        } else {
          // Le compte n'existe pas, le créer
          console.log(`📝 Création du compte ${compteNumero}`);
          // Déterminer le type de compte selon le premier chiffre
          let type = 'general';
          if (compteNumero.startsWith('1')) type = 'capitaux';
          else if (compteNumero.startsWith('2')) type = 'immobilisation';
          else if (compteNumero.startsWith('3')) type = 'stock';
          else if (compteNumero.startsWith('4')) type = 'tiers';
          else if (compteNumero.startsWith('5')) type = 'financier';
          else if (compteNumero.startsWith('6')) type = 'charge';
          else if (compteNumero.startsWith('7')) type = 'produit';
          else if (compteNumero.startsWith('8')) type = 'special';

          const newCompte = await createCompte({
            numero: compteNumero,
            nom: `Compte ${compteNumero}`,
            type: type,
          });
          console.log(`✅ Compte créé:`, newCompte);
        }
      }

      await updateEcriture(editedEcriture.id, {
        date: editedEcriture.date,
        compteNumero,
        libelle: editedEcriture.libelle,
        debit: editedEcriture.debit,
        credit: editedEcriture.credit,
      });

      // Recharger les écritures
      await loadEcritures();

      setEditingId(null);
      setEditedEcriture(null);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleAjouterLigneClick = (ecriture: any) => {
    setAjoutLigneNumeroEcriture(ecriture.numeroEcriture || null);
    setNouvelleLigne({
      compteNumero: '',
      libelle: ecriture.libelle || '',
      debit: '',
      credit: ''
    });
  };

  const handleSaveNouvelleLigne = async () => {
    if (!ajoutLigneNumeroEcriture) return;
    if (!nouvelleLigne.compteNumero) {
      alert('⚠️ Veuillez sélectionner un compte');
      return;
    }
    if (!nouvelleLigne.debit && !nouvelleLigne.credit) {
      alert('⚠️ Veuillez saisir un montant (débit ou crédit)');
      return;
    }

    try {
      const { createEcriture, getCompte, createCompte } = await import('../../lib/storageAdapter');

      // Vérifier si le compte existe, sinon le créer
      const compteNumero = nouvelleLigne.compteNumero;
      if (compteNumero) {
        const compteExistant = await getCompte(compteNumero);
        if (!compteExistant) {
          let type = 'general';
          if (compteNumero.startsWith('1')) type = 'capitaux';
          else if (compteNumero.startsWith('2')) type = 'immobilisation';
          else if (compteNumero.startsWith('3')) type = 'stock';
          else if (compteNumero.startsWith('4')) type = 'tiers';
          else if (compteNumero.startsWith('5')) type = 'financier';
          else if (compteNumero.startsWith('6')) type = 'charge';
          else if (compteNumero.startsWith('7')) type = 'produit';
          else if (compteNumero.startsWith('8')) type = 'special';

          await createCompte({
            numero: compteNumero,
            nom: `Compte ${compteNumero}`,
            type: type,
          });
        }
      }

      // Trouver l'écriture de référence pour récupérer les infos
      const ecritureRef = ecritures.find((e: any) => e.numeroEcriture === ajoutLigneNumeroEcriture);
      if (!ecritureRef) {
        alert('❌ Écriture de référence introuvable');
        return;
      }

      // Créer la nouvelle ligne
      await createEcriture({
        exerciceId: ecritureRef.exerciceId || ecritureRef.exercice_id,
        date: ecritureRef.date,
        journal: ecritureRef.journal,
        pieceRef: ecritureRef.pieceRef || ecritureRef.piece_ref,
        numeroEcriture: ajoutLigneNumeroEcriture,
        libelle: nouvelleLigne.libelle,
        compteNumero: nouvelleLigne.compteNumero,
        debit: nouvelleLigne.debit ? parseFloat(nouvelleLigne.debit) : undefined,
        credit: nouvelleLigne.credit ? parseFloat(nouvelleLigne.credit) : undefined,
      });

      // Recharger les écritures
      await loadEcritures();

      // Réinitialiser
      setAjoutLigneNumeroEcriture(null);
      setNouvelleLigne({
        compteNumero: '',
        libelle: '',
        debit: '',
        credit: ''
      });

      alert('✅ Ligne ajoutée avec succès');
    } catch (error) {
      console.error('Erreur ajout ligne:', error);
      alert('❌ Erreur lors de l\'ajout de la ligne');
    }
  };

  const handleCancelAjoutLigne = () => {
    setAjoutLigneNumeroEcriture(null);
    setNouvelleLigne({
      compteNumero: '',
      libelle: '',
      debit: '',
      credit: ''
    });
  };

  const handleDeleteEcriture = async (ecriture: any) => {
    const numeroEcriture = ecriture.numeroEcriture || `#${ecriture.id}`;

    if (!confirm(`⚠️ Voulez-vous supprimer l'écriture ${numeroEcriture} et toutes ses lignes ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      const { deleteEcriture, getAllEcritures } = await import('../../lib/storageAdapter');

      // Trouver toutes les lignes de cette écriture
      const allEcritures = await getAllEcritures();
      const lignesASupprimer = allEcritures.filter((e: any) => {
        if (ecriture.numeroEcriture) {
          // Si numeroEcriture existe, l'utiliser
          return e.numeroEcriture === ecriture.numeroEcriture;
        } else {
          // Sinon, utiliser la piece_ref et la date (ancien système)
          const pieceRef = ecriture.pieceRef || ecriture.piece_ref;
          const date = ecriture.date;
          return (e.pieceRef === pieceRef || e.piece_ref === pieceRef) && e.date === date;
        }
      });

      // Supprimer toutes les lignes
      for (const ligne of lignesASupprimer) {
        await deleteEcriture(ligne.id);
      }

      // Recharger les écritures
      await loadEcritures();

      alert(`✅ Écriture supprimée : ${lignesASupprimer.length} ligne(s)`);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
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

  console.log('📅 Render - selectedMonth:', selectedMonth, 'moisDisponibles:', moisDisponibles.map(m => m.value));

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
              <p className="text-gray-600 mb-1">Consultation des écritures par journal et par mois</p>
              {selectedEntrepriseId && selectedExerciceId && (
                <div className="text-lg font-bold text-blue-600">
                  Entreprise : {entreprises.find(e => e.id === selectedEntrepriseId)?.raison_sociale || entreprises.find(e => e.id === selectedEntrepriseId)?.nom || 'N/A'}
                  {' • '}
                  Exercice : {exercices.find(ex => ex.id === selectedExerciceId)?.annee || 'N/A'} {exercices.find(ex => ex.id === selectedExerciceId)?.cloture ? '(Clôturé)' : '(En cours)'}
                </div>
              )}
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
                    <th className="px-4 py-3 text-center text-sm font-semibold w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ecritures.map((ecriture: any, index) => {
                    const isEditing = editingId === ecriture.id;
                    const displayData = isEditing ? editedEcriture : ecriture;

                    return (
                    <React.Fragment key={ecriture.id || index}>
                    <tr
                      className={`hover:bg-blue-50 transition-colors ${!isEditing ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-blue-600">
                        {ecriture.numeroEcriture || `#${ecriture.id}`}
                      </td>
                      <td className="px-4 py-3 text-sm" onClick={() => !isEditing && handleEditClick(ecriture)}>
                        {isEditing ? (
                          <input
                            type="date"
                            value={displayData.date?.split('T')[0] || ''}
                            onChange={(e) => setEditedEcriture({ ...editedEcriture, date: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          new Date(ecriture.date).toLocaleDateString('fr-FR')
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono" onClick={() => !isEditing && handleEditClick(ecriture)}>
                        {ecriture.pieceRef || ecriture.piece_ref || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono" onClick={() => !isEditing && handleEditClick(ecriture)}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={displayData.compteNumero || displayData.compte_numero || ''}
                            onChange={(e) => setEditedEcriture({ ...editedEcriture, compteNumero: e.target.value })}
                            className="w-full px-2 py-1 border rounded font-mono"
                          />
                        ) : (
                          ecriture.compteNumero || ecriture.compte_numero
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" onClick={() => !isEditing && handleEditClick(ecriture)}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={displayData.libelle || ''}
                            onChange={(e) => setEditedEcriture({ ...editedEcriture, libelle: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          ecriture.libelle
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-700" onClick={() => !isEditing && handleEditClick(ecriture)}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editedEcriture?.debit || ''}
                            onChange={(e) => setEditedEcriture({ ...editedEcriture, debit: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border rounded text-right"
                          />
                        ) : (
                          ecriture.debit ? formatMontant(ecriture.debit) : '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-red-700" onClick={() => !isEditing && handleEditClick(ecriture)}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editedEcriture?.credit || ''}
                            onChange={(e) => setEditedEcriture({ ...editedEcriture, credit: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 border rounded text-right"
                          />
                        ) : (
                          ecriture.credit ? formatMontant(ecriture.credit) : '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={handleSaveEdit}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleEditClick(ecriture)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              title="Modifier"
                            >
                              ✎
                            </button>
                            {ecriture.numeroEcriture && (
                              <button
                                onClick={() => handleAjouterLigneClick(ecriture)}
                                className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                                title="Ajouter une ligne à cette écriture"
                              >
                                +
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEcriture(ecriture)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                              title="Supprimer l'écriture complète"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {ajoutLigneNumeroEcriture === ecriture.numeroEcriture && (
                      <tr className="bg-purple-50 border-2 border-purple-400">
                        <td className="px-4 py-3 text-sm text-gray-500">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500">-</td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="text"
                            value={nouvelleLigne.compteNumero}
                            onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, compteNumero: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                            placeholder="Compte"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="text"
                            value={nouvelleLigne.libelle}
                            onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, libelle: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                            placeholder="Libellé"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            step="0.01"
                            value={nouvelleLigne.debit}
                            onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, debit: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            step="0.01"
                            value={nouvelleLigne.credit}
                            onChange={(e) => setNouvelleLigne({ ...nouvelleLigne, credit: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={handleSaveNouvelleLigne}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelAjoutLigne}
                              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={6} className="px-4 py-3 text-sm text-right">
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
