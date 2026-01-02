import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { entreprisesApi, type Entreprise } from '../api/entreprises';
import { journauxApi, type Journal } from '../api/journaux';
import { comptesApi, type Compte } from '../api/comptes';
import { libelleCompteMapsApi, type LibelleCompteMap } from '../api/libelle-compte-maps';
import { ecrituresApi } from '../api/ecritures';

interface CSVLine {
  id: string; // Identifiant unique pour chaque ligne
  date: string;
  libelle: string; // Renommé de "contrepartie" en "libelle"
  montant: number;
  dateOriginal: string;
  montantOriginal: string;
  isBalanceLine?: boolean; // Ligne de contrepartie calculée
  month?: string; // YYYY-MM
  compte?: string; // Compte comptable saisi par l'utilisateur
  numeroPiece?: string; // Numéro de pièce
}

export default function ImportCSVPage() {
  const router = useRouter();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<number | null>(null);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<number | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLines, setCsvLines] = useState<CSVLine[]>([]);
  const [step, setStep] = useState<'select' | 'upload' | 'preview'>('select');
  const [sortColumn, setSortColumn] = useState<'date' | 'libelle' | 'montant'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [compteContrepartie, setCompteContrepartie] = useState<string>('');
  const [libelleCompteMap, setLibelleCompteMap] = useState<{ [libelle: string]: string }>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [modeContrepartie, setModeContrepartie] = useState<'mensuel' | 'ligne'>('mensuel');

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
      loadJournaux(entrepriseId);
      loadComptes(entrepriseId);
      loadLibelleCompteMaps(entrepriseId);
      migrateFromLocalStorage(entrepriseId);
    }
  }, [entrepriseId]);

  const loadEntreprise = async (id: number) => {
    try {
      const data = await entreprisesApi.getOne(id);
      setEntreprise(data);
      if (data.exercices && data.exercices.length > 0) {
        const dernierExercice = data.exercices.sort((a: any, b: any) => b.annee - a.annee)[0];
        setSelectedExercice(dernierExercice.id);
      }
    } catch (err) {
      console.error('Erreur chargement entreprise:', err);
    }
  };

  const loadJournaux = async (id: number) => {
    try {
      const data = await journauxApi.findByEntreprise(id);
      setJournaux(data);
    } catch (err) {
      console.error('Erreur chargement journaux:', err);
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

  const loadLibelleCompteMaps = async (id: number) => {
    try {
      const data = await libelleCompteMapsApi.findByEntreprise(id);
      // Convertir en objet map pour faciliter la recherche
      const map: { [libelle: string]: string } = {};
      data.forEach((item) => {
        map[item.libelle] = item.numero_compte;
      });
      setLibelleCompteMap(map);
    } catch (err) {
      console.error('Erreur chargement associations libellé-compte:', err);
    }
  };

  // Fonction pour trouver le compte associé à un libellé (exact ou par préfixe)
  const findCompteForLibelle = (libelle: string): string | undefined => {
    // 1. Chercher correspondance exacte
    if (libelleCompteMap[libelle]) {
      return libelleCompteMap[libelle];
    }

    // 2. Chercher par préfixe (pour gérer BOLT.EU, STARBUCKS, etc.)
    // On cherche les clés qui sont des préfixes du libellé, en commençant par les plus longues
    const matchingKeys = Object.keys(libelleCompteMap)
      .filter(key => libelle.startsWith(key))
      .sort((a, b) => b.length - a.length); // Les plus longues en premier

    if (matchingKeys.length > 0) {
      return libelleCompteMap[matchingKeys[0]];
    }

    return undefined;
  };

  const migrateFromLocalStorage = async (id: number) => {
    try {
      if (typeof window === 'undefined') return;

      const savedMap = localStorage.getItem('libelleCompteMap');
      if (!savedMap) return;

      const oldMap = JSON.parse(savedMap);
      const keys = Object.keys(oldMap);

      if (keys.length === 0) return;

      console.log(`Migration de ${keys.length} associations depuis localStorage...`);

      // Migrer chaque association
      for (const libelle of keys) {
        const numeroCompte = oldMap[libelle];
        await libelleCompteMapsApi.upsert(id, libelle, numeroCompte);
      }

      console.log('Migration terminée !');

      // Recharger les associations
      await loadLibelleCompteMaps(id);

      // Supprimer l'ancien localStorage après migration réussie
      localStorage.removeItem('libelleCompteMap');
    } catch (err) {
      console.error('Erreur migration localStorage:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  const parseCSV = async () => {
    if (!csvFile) return;

    const text = await csvFile.text();
    const lines = text.split('\n').filter(line => line.trim());

    // Skip header
    const dataLines = lines.slice(1);

    const parsed: CSVLine[] = dataLines.map((line, index) => {
      // Split by semicolon
      const parts = line.split(';');
      if (parts.length < 3) return null;

      const dateOriginal = parts[0].trim();
      const libelle = parts[1].trim();
      const montantOriginal = parts[2].trim();

      // Parse date DD-MM-YYYY HH:MM:SS to YYYY-MM-DD
      const dateParts = dateOriginal.split(' ')[0].split('-');
      const date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

      // Parse montant: replace comma with dot, parse as float
      const montant = parseFloat(montantOriginal.replace(',', '.'));

      const month = `${dateParts[2]}-${dateParts[1]}`; // YYYY-MM

      // Pré-remplir le compte si déjà enregistré pour ce libellé (exact ou par préfixe)
      const comptePredefini = findCompteForLibelle(libelle);

      return {
        id: `line-${index}-${Date.now()}`, // ID unique
        date,
        libelle,
        montant,
        dateOriginal,
        montantOriginal,
        month,
        compte: comptePredefini, // Pré-remplir si disponible
        numeroPiece: '', // Sera rempli automatiquement
      };
    }).filter(Boolean) as CSVLine[];

    // Trier par ordre chronologique (du plus ancien au plus récent)
    parsed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Grouper par mois et ajouter les lignes de contrepartie
    const withBalanceLines: CSVLine[] = [];
    const monthGroups: { [key: string]: CSVLine[] } = {};

    // Grouper les lignes par mois
    parsed.forEach(line => {
      if (!monthGroups[line.month!]) {
        monthGroups[line.month!] = [];
      }
      monthGroups[line.month!].push(line);
    });

    // Pour chaque mois, ajouter les lignes + ligne de solde
    let pieceCounter = 1;
    Object.keys(monthGroups).sort().forEach(month => {
      const monthLines = monthGroups[month];
      const [year, monthNum] = month.split('-');

      if (modeContrepartie === 'mensuel') {
        // Mode mensuel : même numéro de pièce pour tout le mois
        const numeroPieceMensuel = `Relevé ${monthNum}/${year}`;
        monthLines.forEach(line => {
          line.numeroPiece = numeroPieceMensuel;
        });
      } else {
        // Mode par ligne : numéro incrémenté pour chaque ligne
        monthLines.forEach(line => {
          line.numeroPiece = pieceCounter.toString();
          pieceCounter++;
        });
      }

      withBalanceLines.push(...monthLines);

      // Calculer le solde du mois
      const solde = monthLines.reduce((sum, line) => sum + line.montant, 0);

      // Ajouter la ligne de contrepartie (solde inverse)
      const lastDate = monthLines[monthLines.length - 1].date;
      withBalanceLines.push({
        id: `balance-${month}-${Date.now()}`, // ID unique pour ligne de solde
        date: lastDate,
        libelle: `Solde ${month}`,
        montant: -solde, // Inverse du solde
        dateOriginal: lastDate,
        montantOriginal: (-solde).toFixed(2).replace('.', ','),
        month,
        isBalanceLine: true,
        compte: compteContrepartie, // Pré-remplir avec le compte de contrepartie
        numeroPiece: modeContrepartie === 'mensuel' ? `Relevé ${monthNum}/${year}` : pieceCounter.toString(),
      });

      if (modeContrepartie === 'ligne') {
        pieceCounter++;
      }
    });

    setCsvLines(withBalanceLines);
    setStep('preview');
  };

  const handleSort = (column: 'date' | 'libelle' | 'montant') => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedLines = () => {
    const sorted = [...csvLines];
    sorted.sort((a, b) => {
      let comparison = 0;

      if (sortColumn === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortColumn === 'libelle') {
        comparison = a.libelle.localeCompare(b.libelle);
      } else if (sortColumn === 'montant') {
        comparison = a.montant - b.montant;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  };

  const handleCompteChange = (lineId: string, compte: string) => {
    const updated = [...csvLines];
    const lineIndex = updated.findIndex(line => line.id === lineId);

    if (lineIndex === -1) return;

    const currentLibelle = updated[lineIndex].libelle;

    // Update current line
    updated[lineIndex].compte = compte;

    // Auto-fill all lines with same libellé (except balance lines)
    updated.forEach((line) => {
      if (line.id !== lineId && line.libelle === currentLibelle && !line.isBalanceLine) {
        line.compte = compte;
      }
    });

    setCsvLines(updated);

    // Enregistrer l'association libellé-compte dans la base de données
    if (compte && !updated[lineIndex].isBalanceLine && entrepriseId) {
      const newMap = { ...libelleCompteMap, [currentLibelle]: compte };
      setLibelleCompteMap(newMap);

      // Enregistrer dans la base de données
      libelleCompteMapsApi.upsert(entrepriseId, currentLibelle, compte).catch((err) => {
        console.error('Erreur enregistrement association:', err);
      });
    }
  };

  const handleNumeroPieceChange = (lineId: string, numeroPiece: string) => {
    const updated = [...csvLines];
    const lineIndex = updated.findIndex(line => line.id === lineId);

    if (lineIndex === -1) return;

    updated[lineIndex].numeroPiece = numeroPiece;
    setCsvLines(updated);
  };

  const handleNextStep = () => {
    if (step === 'select' && selectedJournal) {
      setStep('upload');
    } else if (step === 'upload' && csvFile) {
      parseCSV();
    }
  };

  const handleSaveAssociations = async () => {
    if (!entrepriseId) return;

    try {
      // Parcourir toutes les lignes et sauvegarder les associations
      const uniqueAssociations = new Map<string, string>();

      csvLines.forEach((line) => {
        if (line.compte && !line.isBalanceLine) {
          uniqueAssociations.set(line.libelle, line.compte);
        }
      });

      let saved = 0;
      for (const [libelle, compte] of uniqueAssociations.entries()) {
        await libelleCompteMapsApi.upsert(entrepriseId, libelle, compte);
        saved++;
      }

      alert(`${saved} association(s) sauvegardée(s) avec succès !`);
    } catch (err) {
      console.error('Erreur sauvegarde associations:', err);
      alert('Erreur lors de la sauvegarde des associations');
    }
  };

  const checkAllComptesRemplis = (): boolean => {
    return csvLines.every(line => line.compte && line.compte.trim() !== '');
  };

  const handlePrepareImport = () => {
    if (!checkAllComptesRemplis()) {
      alert('⚠️ Tous les comptes doivent être remplis avant l\'import !');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmImport = async () => {
    if (!entrepriseId || !selectedExercice || !selectedJournal) return;

    setImporting(true);
    try {
      let importedCount = 0;

      if (modeContrepartie === 'ligne') {
        // Mode : Une contrepartie par ligne CSV
        for (const line of csvLines) {
          if (line.isBalanceLine) continue; // Ignorer les lignes de solde

          const montant = Math.abs(line.montant);
          const isNegative = line.montant < 0;

          const ecriture = {
            entreprise_id: entrepriseId,
            exercice_id: selectedExercice,
            journal_id: selectedJournal,
            date_ecriture: line.date,
            numero_piece: line.numeroPiece,
            libelle: line.libelle,
            lignes: [
              {
                numero_compte: line.compte!,
                libelle_compte: line.libelle,
                debit: isNegative ? montant : 0,
                credit: isNegative ? 0 : montant,
              },
              {
                numero_compte: compteContrepartie,
                libelle_compte: line.libelle,
                debit: isNegative ? 0 : montant,
                credit: isNegative ? montant : 0,
              },
            ],
          };

          await ecrituresApi.create(ecriture);
          importedCount++;
        }
      } else {
        // Mode : Une pièce par mois avec toutes les lignes + contrepartie

        // Grouper les lignes par mois
        const monthGroups: { [month: string]: CSVLine[] } = {};
        csvLines.filter(line => !line.isBalanceLine).forEach(line => {
          if (!monthGroups[line.month!]) {
            monthGroups[line.month!] = [];
          }
          monthGroups[line.month!].push(line);
        });

        // Pour chaque mois, créer une seule écriture avec toutes les lignes + contrepartie
        for (const [month, lines] of Object.entries(monthGroups)) {
          const [year, monthNum] = month.split('-');
          const numeroPiece = `Relevé ${monthNum}/${year}`;

          // Trouver la dernière date du mois
          const lastDate = lines[lines.length - 1].date;

          // Créer les lignes comptables
          const lignesComptables = [];

          // 1. Ajouter toutes les lignes du CSV
          for (const line of lines) {
            const montant = Math.abs(line.montant);
            const isNegative = line.montant < 0;

            lignesComptables.push({
              numero_compte: line.compte!,
              libelle_compte: line.libelle,
              debit: isNegative ? montant : 0,
              credit: isNegative ? 0 : montant,
            });
          }

          // 2. Calculer le solde total du mois
          const soldeTotal = lines.reduce((sum, line) => sum + line.montant, 0);
          const montantContrepartie = Math.abs(soldeTotal);
          const isContrepartieDebit = soldeTotal > 0; // Si solde positif, contrepartie en débit

          // 3. Ajouter la ligne de contrepartie
          lignesComptables.push({
            numero_compte: compteContrepartie,
            libelle_compte: `Solde ${month}`,
            debit: isContrepartieDebit ? montantContrepartie : 0,
            credit: isContrepartieDebit ? 0 : montantContrepartie,
          });

          // Créer l'écriture avec toutes les lignes
          const ecriture = {
            entreprise_id: entrepriseId,
            exercice_id: selectedExercice,
            journal_id: selectedJournal,
            date_ecriture: lastDate,
            numero_piece: numeroPiece,
            libelle: `Relevé du mois de ${monthNum}/${year}`,
            lignes: lignesComptables,
          };

          await ecrituresApi.create(ecriture);
          importedCount++;
        }
      }

      alert(`✓ ${importedCount} écriture(s) importée(s) avec succès !`);
      setShowConfirmModal(false);

      // Retour au dashboard
      router.push(`/dashboard/${entrepriseId}`);
    } catch (err) {
      console.error('Erreur import:', err);
      alert('Erreur lors de l\'import: ' + (err as any).message);
    } finally {
      setImporting(false);
    }
  };

  if (!entrepriseId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Import CSV</h2>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import CSV</h2>
            {entreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              </p>
            )}
          </div>

          {/* Steps indicator */}
          <div className="mb-8 flex items-center justify-center">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${step === 'select' ? 'text-blue-600 font-bold' : step === 'upload' || step === 'preview' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'select' ? 'bg-blue-600 text-white' : step === 'upload' || step === 'preview' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  1
                </div>
                <span>Sélection journal</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600 font-bold' : step === 'preview' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : step === 'preview' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  2
                </div>
                <span>Upload CSV</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  3
                </div>
                <span>Prévisualisation</span>
              </div>
            </div>
          </div>

          {/* Step 1: Select Journal */}
          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exercice
                </label>
                <select
                  value={selectedExercice || ''}
                  onChange={(e) => setSelectedExercice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un exercice</option>
                  {entreprise?.exercices?.map((ex: any) => (
                    <option key={ex.id} value={ex.id}>
                      Exercice {ex.annee}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Journal *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {journaux.map((journal) => (
                    <button
                      key={journal.id}
                      onClick={() => setSelectedJournal(journal.id)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        selectedJournal === journal.id
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      <div className="font-bold text-lg">{journal.code}</div>
                      <div className="text-sm text-gray-600">{journal.libelle}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de contrepartie *
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setModeContrepartie('mensuel')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      modeContrepartie === 'mensuel'
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <div className="font-bold">Mensuel</div>
                    <div className="text-sm text-gray-600">Une ligne par mois</div>
                  </button>
                  <button
                    onClick={() => setModeContrepartie('ligne')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      modeContrepartie === 'ligne'
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <div className="font-bold">Par ligne</div>
                    <div className="text-sm text-gray-600">Une contrepartie par ligne</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compte de contrepartie *
                </label>
                <input
                  type="text"
                  value={compteContrepartie}
                  onChange={(e) => setCompteContrepartie(e.target.value)}
                  placeholder="Ex: 5121"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  list="comptes-contrepartie-list"
                />
                <datalist id="comptes-contrepartie-list">
                  {comptes
                    .filter(c => c.numero_compte.startsWith('5')) // Comptes financiers
                    .map((compte) => (
                      <option key={compte.id} value={compte.numero_compte}>
                        {compte.numero_compte} - {compte.libelle}
                      </option>
                    ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  {modeContrepartie === 'mensuel'
                    ? 'Une écriture de contrepartie sera créée le dernier jour de chaque mois'
                    : 'Une ligne de contrepartie sera créée pour chaque ligne CSV'
                  }
                </p>
              </div>

              <button
                onClick={handleNextStep}
                disabled={!selectedJournal || !compteContrepartie.trim()}
                className={`w-full py-3 rounded-lg font-semibold ${
                  selectedJournal && compteContrepartie.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Suivant →
              </button>
            </div>
          )}

          {/* Step 2: Upload CSV */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  <strong>Journal sélectionné :</strong> {journaux.find(j => j.id === selectedJournal)?.code} - {journaux.find(j => j.id === selectedJournal)?.libelle}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier CSV *
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {csvFile && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ Fichier sélectionné : {csvFile.name}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Format attendu :</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Séparateur : point-virgule (;)</li>
                  <li>• Colonnes : Date de la valeur (UTC) ; Libellé ; Montant total (TTC)</li>
                  <li>• Format date : DD-MM-YYYY HH:MM:SS</li>
                  <li>• Format montant : avec virgule (ex: -50,00)</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!csvFile}
                  className={`flex-1 py-3 rounded-lg font-semibold ${
                    csvFile
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Analyser le fichier →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  ✓ Fichier analysé : <strong>{csvLines.length} lignes</strong> détectées
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-800 transition-colors"
                        onClick={() => handleSort('date')}
                      >
                        Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-800 transition-colors"
                        onClick={() => handleSort('libelle')}
                      >
                        Libellé {sortColumn === 'libelle' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-800 transition-colors"
                        onClick={() => handleSort('montant')}
                      >
                        Montant {sortColumn === 'montant' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Compte</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">N° Pièce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getSortedLines().map((line, idx) => (
                      <tr key={idx} className={line.isBalanceLine ? 'bg-yellow-50 hover:bg-yellow-100 border-t-2 border-yellow-300' : 'hover:bg-blue-50'}>
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono">{line.date}</td>
                        <td className={`px-4 py-3 text-sm ${line.isBalanceLine ? 'font-bold text-yellow-800' : ''}`}>
                          {line.isBalanceLine && '⚖️ '}{line.libelle}
                          {line.isBalanceLine && (
                            <span className="ml-2 text-xs bg-yellow-200 px-2 py-1 rounded">
                              Compte: {compteContrepartie}
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${line.montant < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {line.montant.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            line.isBalanceLine
                              ? 'bg-yellow-200 text-yellow-900'
                              : line.montant < 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {line.isBalanceLine ? 'Solde' : line.montant < 0 ? 'Débit' : 'Crédit'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="text"
                            value={line.compte || ''}
                            onChange={(e) => handleCompteChange(line.id, e.target.value)}
                            placeholder="Numéro compte"
                            className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                            list={`comptes-list-${line.id}`}
                          />
                          <datalist id={`comptes-list-${line.id}`}>
                            {comptes.map((compte) => (
                              <option key={compte.id} value={compte.numero_compte}>
                                {compte.numero_compte} - {compte.libelle}
                              </option>
                            ))}
                          </datalist>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="text"
                            value={line.numeroPiece || ''}
                            onChange={(e) => handleNumeroPieceChange(line.id, e.target.value)}
                            placeholder="N° pièce"
                            className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-semibold">
                  ⚠️ Les données sont prêtes pour le traitement manuel
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  Aucune écriture ne sera créée automatiquement. Vous devrez mapper manuellement chaque ligne.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveAssociations}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    💾 Sauvegarder les associations
                  </button>
                  <button
                    onClick={() => {
                      setStep('select');
                      setCsvFile(null);
                      setCsvLines([]);
                    }}
                    className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
                  >
                    ← Recommencer
                  </button>
                </div>

                <button
                  onClick={handlePrepareImport}
                  disabled={!checkAllComptesRemplis()}
                  className={`w-full py-4 rounded-lg font-bold text-lg ${
                    checkAllComptesRemplis()
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {checkAllComptesRemplis()
                    ? '✓ Importer les écritures comptables'
                    : '⚠️ Remplir tous les comptes avant import'
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modale de confirmation d'import */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Confirmer l'import
              </h3>

              <div className="mb-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 font-semibold">
                    📊 Récapitulatif de l'import
                  </p>
                  <ul className="mt-2 text-sm text-blue-800 space-y-1">
                    <li>• Nombre de lignes : <strong>{csvLines.length}</strong></li>
                    <li>• Journal : <strong>{journaux.find(j => j.id === selectedJournal)?.code}</strong></li>
                    <li>• Exercice : <strong>{entreprise?.exercices?.find((ex: any) => ex.id === selectedExercice)?.annee}</strong></li>
                    <li>• Compte de contrepartie : <strong>{compteContrepartie}</strong></li>
                    <li>• Mode : <strong>{modeContrepartie === 'mensuel' ? 'Contrepartie mensuelle (dernier jour)' : 'Contrepartie par ligne'}</strong></li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-900 font-semibold">
                    ⚠️ Attention
                  </p>
                  <p className="mt-2 text-sm text-yellow-800">
                    Cette action va créer <strong>{csvLines.length} écritures comptables</strong> dans votre base de données.
                    Cette opération est irréversible.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={importing}
                  className="flex-1 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Import en cours...' : 'Confirmer l\'import'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
