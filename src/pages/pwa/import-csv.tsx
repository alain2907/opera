import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getAllEntreprises,
  getExercicesByEntreprise,
  getAllComptes,
  createCompte,
  createEcriture,
} from '../../lib/storageAdapter';
import PWANavbar from '../../components/PWANavbar';

interface CSVLine {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  dateOriginal: string;
  montantOriginal: string;
  isBalanceLine?: boolean;
  month?: string;
  compte?: string;
  numeroPiece?: string;
}

export default function ImportCSVPWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [exercices, setExercices] = useState<any[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLines, setCsvLines] = useState<CSVLine[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [compteContrepartie, setCompteContrepartie] = useState<string>('512000');
  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [importing, setImporting] = useState(false);
  const [libelleCompteMap, setLibelleCompteMap] = useState<{ [key: string]: string }>({});
  const [modeContrepartie, setModeContrepartie] = useState<'mensuel' | 'ligne'>('mensuel');

  useEffect(() => {
    loadData();
    loadMapFromLocalStorage();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadExercices(selectedEntreprise);
      loadComptes();
    }
  }, [selectedEntreprise]);

  async function loadData() {
    const data = await getAllEntreprises();
    setEntreprises(data);
    if (data.length > 0) {
      setSelectedEntreprise(data[0].id);
    }
  }

  async function loadExercices(entrepriseId: number) {
    const data = await getExercicesByEntreprise(entrepriseId);
    setExercices(data);
    if (data.length > 0) {
      setSelectedExercice(data[0].id);
    }
  }

  async function loadComptes() {
    const data = await getAllComptes();
    setComptes(data);
  }

  function loadMapFromLocalStorage() {
    const saved = localStorage.getItem('pwa_libelleCompteMap');
    if (saved) {
      setLibelleCompteMap(JSON.parse(saved));
    }
  }

  function saveMapToLocalStorage(map: { [key: string]: string }) {
    localStorage.setItem('pwa_libelleCompteMap', JSON.stringify(map));
  }

  function findCompteForLibelle(libelle: string): string | undefined {
    // Exact match
    if (libelleCompteMap[libelle]) {
      return libelleCompteMap[libelle];
    }

    // Prefix match (longest first)
    const matchingKeys = Object.keys(libelleCompteMap)
      .filter((key) => libelle.startsWith(key))
      .sort((a, b) => b.length - a.length);

    if (matchingKeys.length > 0) {
      return libelleCompteMap[matchingKeys[0]];
    }

    return undefined;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const text = await file.text();
    parseCSV(text);
  }

  function parseCSV(text: string) {
    const lines = text.split('\n').filter((line) => line.trim());
    const dataLines = lines.slice(1); // Skip header

    console.log('🔍 Parsing CSV avec libelleCompteMap:', libelleCompteMap);
    console.log('📊 Nombre de mappings:', Object.keys(libelleCompteMap).length);

    const parsed: CSVLine[] = dataLines
      .map((line, index) => {
        const parts = line.split(';');
        if (parts.length < 3) return null;

        const dateOriginal = parts[0].trim();
        const libelle = parts[1].trim();
        const montantOriginal = parts[2].trim();

        // Parse date DD-MM-YYYY to YYYY-MM-DD
        const dateParts = dateOriginal.split(' ')[0].split('-');
        const date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

        // Parse montant
        const montant = parseFloat(montantOriginal.replace(',', '.'));

        const month = `${dateParts[2]}-${dateParts[1]}`; // YYYY-MM

        // Pré-remplir compte si déjà enregistré
        const comptePredefini = findCompteForLibelle(libelle);
        if (comptePredefini) {
          console.log(`✅ Compte trouvé pour "${libelle}": ${comptePredefini}`);
        }

        return {
          id: `line-${index}-${Date.now()}`,
          date,
          libelle,
          montant,
          dateOriginal,
          montantOriginal,
          month,
          compte: comptePredefini,
          numeroPiece: '',
        };
      })
      .filter((line): line is CSVLine => line !== null);

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
        id: `balance-${month}-${Date.now()}`,
        date: lastDate,
        libelle: `Solde ${month}`,
        montant: -solde,
        dateOriginal: lastDate,
        montantOriginal: (-solde).toFixed(2).replace('.', ','),
        month,
        isBalanceLine: true,
        compte: compteContrepartie,
        numeroPiece: modeContrepartie === 'mensuel' ? `Relevé ${monthNum}/${year}` : pieceCounter.toString(),
      });

      if (modeContrepartie === 'ligne') {
        pieceCounter++;
      }
    });

    setCsvLines(withBalanceLines);
    setStep('preview');
  }

  function handleCompteChange(lineId: string, compte: string) {
    const currentLine = csvLines.find(line => line.id === lineId);
    if (!currentLine) return;

    const currentLibelle = currentLine.libelle;

    // Mettre à jour la ligne courante + toutes les lignes avec le même libellé (sauf lignes de solde)
    setCsvLines((prev) =>
      prev.map((line) =>
        (line.id === lineId || (line.libelle === currentLibelle && !line.isBalanceLine))
          ? { ...line, compte }
          : line
      )
    );

    // Sauvegarder l'association libellé → compte (sauf pour lignes de solde)
    if (compte && compte.trim() !== '' && !currentLine.isBalanceLine) {
      const newMap = { ...libelleCompteMap, [currentLibelle]: compte };
      setLibelleCompteMap(newMap);
      saveMapToLocalStorage(newMap);
    }
  }

  function handleSaveMapping(libelle: string, compte: string) {
    const newMap = { ...libelleCompteMap, [libelle]: compte };
    setLibelleCompteMap(newMap);
    saveMapToLocalStorage(newMap);
  }

  async function handleImport() {
    if (!selectedExercice) {
      alert('Veuillez sélectionner un exercice');
      return;
    }

    // Vérifier que toutes les lignes ont un compte
    const lignesSansCompte = csvLines.filter((line) => !line.compte);
    if (lignesSansCompte.length > 0) {
      alert(`${lignesSansCompte.length} ligne(s) sans compte défini`);
      return;
    }

    // Confirmation de mise en garde
    const confirmation = confirm(
      `⚠️ ATTENTION ⚠️\n\n` +
      `Vous allez importer ${csvLines.filter(l => !l.isBalanceLine).length} ligne(s) dans l'exercice.\n\n` +
      `Cette action va créer des écritures comptables.\n\n` +
      `Voulez-vous continuer ?`
    );

    if (!confirmation) {
      return;
    }

    setImporting(true);

    try {
      // Créer les comptes manquants
      const comptesExistants = new Set(comptes.map((c) => c.numero));
      const comptesACreer = new Set<string>();

      csvLines.forEach((line) => {
        if (line.compte && !comptesExistants.has(line.compte)) {
          comptesACreer.add(line.compte);
        }
        if (!comptesExistants.has(compteContrepartie)) {
          comptesACreer.add(compteContrepartie);
        }
      });

      for (const numeroCompte of comptesACreer) {
        let type = 'autre';
        if (numeroCompte.startsWith('1')) {
          type = 'capitaux';
        } else if (numeroCompte.startsWith('2')) {
          type = 'immobilisation';
        } else if (numeroCompte.startsWith('3')) {
          type = 'stock';
        } else if (numeroCompte.startsWith('4')) {
          type = 'tiers';
        } else if (numeroCompte.startsWith('5')) {
          type = 'financier';
        } else if (numeroCompte.startsWith('6')) {
          type = 'charge';
        } else if (numeroCompte.startsWith('7')) {
          type = 'produit';
        } else if (numeroCompte.startsWith('8')) {
          type = 'special';
        }

        await createCompte({
          numero: numeroCompte,
          nom: `Compte ${numeroCompte}`,
          type: type,
        });
      }

      let importedCount = 0;

      if (modeContrepartie === 'ligne') {
        // Mode : Une contrepartie par ligne CSV
        for (const line of csvLines) {
          if (line.isBalanceLine) continue; // Ignorer les lignes de solde

          const montant = Math.abs(line.montant);
          const isNegative = line.montant < 0;

          // Ligne principale
          await createEcriture({
            exerciceId: selectedExercice,
            date: line.date,
            journal: 'BQ',
            pieceRef: line.numeroPiece,
            libelle: line.libelle,
            compteNumero: line.compte!,
            debit: isNegative ? montant : undefined,
            credit: isNegative ? undefined : montant,
          });

          // Ligne de contrepartie
          await createEcriture({
            exerciceId: selectedExercice,
            date: line.date,
            journal: 'BQ',
            pieceRef: line.numeroPiece,
            libelle: line.libelle,
            compteNumero: compteContrepartie,
            debit: isNegative ? undefined : montant,
            credit: isNegative ? montant : undefined,
          });

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

        // Pour chaque mois, créer toutes les lignes + contrepartie
        for (const [month, lines] of Object.entries(monthGroups)) {
          const [year, monthNum] = month.split('-');
          const numeroPiece = `Relevé ${monthNum}/${year}`;

          // Trouver la dernière date du mois
          const lastDate = lines[lines.length - 1].date;

          // 1. Créer toutes les lignes du CSV
          for (const line of lines) {
            const montant = Math.abs(line.montant);
            const isNegative = line.montant < 0;

            await createEcriture({
              exerciceId: selectedExercice,
              date: line.date,
              journal: 'BQ',
              pieceRef: numeroPiece,
              libelle: line.libelle,
              compteNumero: line.compte!,
              debit: isNegative ? montant : undefined,
              credit: isNegative ? undefined : montant,
            });
          }

          // 2. Calculer le solde total du mois
          const soldeTotal = lines.reduce((sum, line) => sum + line.montant, 0);
          const montantContrepartie = Math.abs(soldeTotal);
          const isContrepartieDebit = soldeTotal > 0; // Si solde positif, contrepartie en débit

          // 3. Ajouter la ligne de contrepartie
          await createEcriture({
            exerciceId: selectedExercice,
            date: lastDate,
            journal: 'BQ',
            pieceRef: numeroPiece,
            libelle: `Solde ${month}`,
            compteNumero: compteContrepartie,
            debit: isContrepartieDebit ? montantContrepartie : undefined,
            credit: isContrepartieDebit ? undefined : montantContrepartie,
          });

          importedCount++;
        }
      }

      // Sauvegarder tous les mappings libellé → compte pour les prochains imports
      const newMappings: { [key: string]: string } = { ...libelleCompteMap };
      csvLines.filter(line => !line.isBalanceLine && line.compte).forEach(line => {
        newMappings[line.libelle] = line.compte!;
      });
      setLibelleCompteMap(newMappings);
      saveMapToLocalStorage(newMappings);
      console.log('💾 Mappings sauvegardés:', newMappings);

      alert(`✓ ${importedCount} écriture(s) importée(s) avec succès !`);
      setStep('done');
    } catch (error) {
      console.error('Erreur import:', error);
      alert('Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PWANavbar />

      {/* Header */}
      <div className="bg-white shadow">
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
              <h1 className="text-3xl font-bold text-gray-900">Import CSV</h1>
            </div>
            {selectedEntreprise && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Entreprise active</p>
                <p className="text-lg font-semibold text-gray-900">
                  {entreprises.find(e => e.id === selectedEntreprise)?.raison_sociale ||
                   entreprises.find(e => e.id === selectedEntreprise)?.nom}
                </p>
                {selectedExercice && (
                  <p className="text-sm text-gray-600">
                    Exercice {exercices.find(ex => ex.id === selectedExercice)?.annee}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'select' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">1. Sélection</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entreprise
                </label>
                <select
                  value={selectedEntreprise || ''}
                  onChange={(e) => setSelectedEntreprise(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.raison_sociale || e.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exercice
                </label>
                <select
                  value={selectedExercice || ''}
                  onChange={(e) => setSelectedExercice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {exercices.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.annee}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de contrepartie
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
                  Compte de contrepartie (banque)
                </label>
                <input
                  type="text"
                  value={compteContrepartie}
                  onChange={(e) => setCompteContrepartie(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="512000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {modeContrepartie === 'mensuel'
                    ? 'Une écriture de contrepartie sera créée le dernier jour de chaque mois'
                    : 'Une ligne de contrepartie sera créée pour chaque ligne CSV'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier CSV
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Format : date;libellé;montant (date : DD-MM-YYYY, montant : avec virgule)
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    2. Prévisualisation ({csvLines.length} lignes)
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('select')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {importing ? 'Import en cours...' : 'Importer'}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 font-semibold">Mode : {modeContrepartie === 'mensuel' ? 'Mensuel' : 'Par ligne'}</p>
                  <p className="text-sm text-blue-800 mt-1">
                    {modeContrepartie === 'mensuel'
                      ? 'Les lignes seront regroupées par mois avec une seule contrepartie par mois'
                      : 'Chaque ligne CSV aura sa propre contrepartie'
                    }
                  </p>
                  <p className="text-sm text-blue-800">
                    Compte de contrepartie : <strong>{compteContrepartie}</strong>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Libellé
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Montant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Compte
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        N° Pièce
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {csvLines.map((line, idx) => (
                      <tr
                        key={line.id}
                        className={line.isBalanceLine ? 'bg-yellow-50 hover:bg-yellow-100 border-t-2 border-yellow-300' : 'hover:bg-blue-50'}
                      >
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                          {line.date}
                        </td>
                        <td className={`px-4 py-3 text-sm ${line.isBalanceLine ? 'font-bold text-yellow-800' : 'text-gray-900'}`}>
                          {line.libelle}
                          {line.isBalanceLine && (
                            <span className="ml-2 text-xs bg-yellow-200 px-2 py-1 rounded">
                              Compte: {compteContrepartie}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono">
                          <span
                            className={
                              line.montant < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'
                            }
                          >
                            {line.montant.toFixed(2)} €
                          </span>
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            list={`comptes-datalist-${line.id}`}
                            value={line.compte || ''}
                            onChange={(e) =>
                              handleCompteChange(line.id, e.target.value)
                            }
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                            placeholder="Ex: 606100"
                          />
                          <datalist id={`comptes-datalist-${line.id}`}>
                            {comptes
                              .filter(c =>
                                !line.compte ||
                                c.numero.includes(line.compte) ||
                                c.nom?.toLowerCase().includes(line.compte.toLowerCase())
                              )
                              .slice(0, 50)
                              .map(c => (
                                <option key={c.numero} value={c.numero}>
                                  {c.numero} - {c.nom}
                                </option>
                              ))
                            }
                          </datalist>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={line.numeroPiece || ''}
                            readOnly
                            className="w-32 px-2 py-1 border border-gray-200 rounded text-sm bg-gray-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import terminé !</h2>
            <p className="text-gray-600 mb-6">
              Les écritures ont été importées avec succès
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setCsvLines([]);
                  setStep('select');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Nouvel import
              </button>
              <button
                onClick={() => router.push('/pwa')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
