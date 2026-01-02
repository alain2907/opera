import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getAllEntreprises,
  getExercicesByEntreprise,
  getAllEcritures,
  createEcriture,
  getAllComptes,
  createCompte,
} from '../../lib/storageAdapter';
import PWANavbar from '../../components/PWANavbar';

interface FECLine {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: string;
  CompteNum: string;
  CompteLib: string;
  CompAuxNum: string;
  CompAuxLib: string;
  PieceRef: string;
  PieceDate: string;
  EcritureLib: string;
  Debit: string;
  Credit: string;
  EcritureLet: string;
  DateLet: string;
  ValidDate: string;
  Montantdevise: string;
  Idevise: string;
}

export default function FECPWA() {
  const router = useRouter();
  const [mode, setMode] = useState<'import' | 'export'>('import');
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [exercices, setExercices] = useState<any[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ imported?: number; errors?: string[] } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadExercices(selectedEntreprise);
    }
  }, [selectedEntreprise]);

  async function loadData() {
    const data = await getAllEntreprises();
    setEntreprises(data);

    // Récupérer l'entreprise et l'exercice actifs depuis localStorage
    const entrepriseActiveId = localStorage.getItem('pwa_entreprise_active_id');
    const exerciceActiveId = localStorage.getItem('pwa_exercice_actif_id');

    if (entrepriseActiveId) {
      setSelectedEntreprise(Number(entrepriseActiveId));
      if (exerciceActiveId) {
        setSelectedExercice(Number(exerciceActiveId));
      }
    } else if (data.length > 0) {
      setSelectedEntreprise(data[0].id);
    }
  }

  async function loadExercices(entrepriseId: number) {
    const data = await getExercicesByEntreprise(entrepriseId);
    setExercices(data);
    if (data.length > 0) {
      // Sélectionner le dernier exercice
      const dernier = data.sort((a, b) => b.annee - a.annee)[0];
      setSelectedExercice(dernier.id);
    }
  }

  function parseFECDate(dateStr: string): string {
    // Format FEC: YYYYMMDD → YYYY-MM-DD
    if (!dateStr || dateStr.length !== 8) return '';
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  function fixEncoding(text: string): string {
    if (!text) return text;

    const replacements: { [key: string]: string } = {
      'Ã©': 'é',
      'Ã¨': 'è',
      'Ã ': 'à',
      'Ã´': 'ô',
      'Ã®': 'î',
      'Ã§': 'ç',
      'Ã¹': 'ù',
      'Ã»': 'û',
      'Ã¢': 'â',
      'Ãª': 'ê',
      'Ã«': 'ë',
      'Ã¯': 'ï',
      'Ã¼': 'ü',
      'Ã‰': 'É',
      'Ã€': 'À',
      'Ã‡': 'Ç',
      'Å"': 'œ',
      'Ã¦': 'æ',
      'Ã': 'Œ',
      '�': 'é',
    };

    let result = text;
    for (const [bad, good] of Object.entries(replacements)) {
      result = result.replace(new RegExp(bad, 'g'), good);
    }
    return result;
  }

  function parseFrenchDecimal(value: string): number {
    if (!value || value === '') return 0;
    return parseFloat(value.replace(',', '.'));
  }

  async function handleImportFEC() {
    if (!file || !selectedExercice) {
      alert('Fichier et exercice requis');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      // Lire le fichier avec l'encodage Windows-1252 (utilisé par les logiciels comptables français)
      const arrayBuffer = await file.arrayBuffer();
      const content = new TextDecoder('windows-1252').decode(arrayBuffer);
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      // Skip header
      const dataLines = lines.slice(1);

      const fecLines: FECLine[] = dataLines.map((line) => {
        const parts = line.split('\t');
        return {
          JournalCode: parts[0] || '',
          JournalLib: fixEncoding(parts[1] || ''),
          EcritureNum: parts[2] || '',
          EcritureDate: parts[3] || '',
          CompteNum: parts[4] || '',
          CompteLib: fixEncoding(parts[5] || ''),
          CompAuxNum: parts[6] || '',
          CompAuxLib: fixEncoding(parts[7] || ''),
          PieceRef: parts[8] || '',
          PieceDate: parts[9] || '',
          EcritureLib: fixEncoding(parts[10] || ''),
          Debit: parts[11] || '0',
          Credit: parts[12] || '0',
          EcritureLet: parts[13] || '',
          DateLet: parts[14] || '',
          ValidDate: parts[15] || '',
          Montantdevise: parts[16] || '',
          Idevise: parts[17] || '',
        };
      });

      // Créer les comptes manquants
      const comptes = await getAllComptes();
      const comptesExistants = new Set(comptes.map((c) => c.numero));
      const comptesACreer = new Set<string>();

      fecLines.forEach((line) => {
        if (line.CompteNum && !comptesExistants.has(line.CompteNum)) {
          comptesACreer.add(line.CompteNum);
        }
      });

      for (const numero of comptesACreer) {
        const fecLine = fecLines.find((l) => l.CompteNum === numero);
        let type = 'autre';
        if (numero.startsWith('1')) type = 'capitaux';
        else if (numero.startsWith('2')) type = 'immobilisation';
        else if (numero.startsWith('3')) type = 'stock';
        else if (numero.startsWith('4')) type = 'tiers';
        else if (numero.startsWith('5')) type = 'financier';
        else if (numero.startsWith('6')) type = 'charge';
        else if (numero.startsWith('7')) type = 'produit';
        else if (numero.startsWith('8')) type = 'special';

        await createCompte({
          numero,
          nom: fecLine?.CompteLib || `Compte ${numero}`,
          type,
        });
      }

      // Créer les écritures
      let imported = 0;
      for (const line of fecLines) {
        const date = parseFECDate(line.EcritureDate);
        if (!date) continue;

        const debit = parseFrenchDecimal(line.Debit);
        const credit = parseFrenchDecimal(line.Credit);

        await createEcriture({
          exerciceId: selectedExercice,
          date,
          journal: line.JournalCode,
          pieceRef: line.PieceRef,
          libelle: line.EcritureLib,
          compteNumero: line.CompteNum,
          debit: debit > 0 ? debit : undefined,
          credit: credit > 0 ? credit : undefined,
        });

        imported++;
      }

      setResult({ imported, errors: [] });
    } catch (error: any) {
      setResult({ imported: 0, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  }

  async function handleExportFEC() {
    if (!selectedExercice) {
      alert('Veuillez sélectionner un exercice');
      return;
    }

    setExporting(true);

    try {
      const ecritures = await getAllEcritures();
      const exerciceEcritures = ecritures.filter((e: any) => e.exerciceId === selectedExercice);

      if (exerciceEcritures.length === 0) {
        alert('Aucune écriture à exporter');
        setExporting(false);
        return;
      }

      // Générer le FEC
      const header = [
        'JournalCode',
        'JournalLib',
        'EcritureNum',
        'EcritureDate',
        'CompteNum',
        'CompteLib',
        'CompAuxNum',
        'CompAuxLib',
        'PieceRef',
        'PieceDate',
        'EcritureLib',
        'Debit',
        'Credit',
        'EcritureLet',
        'DateLet',
        'ValidDate',
        'Montantdevise',
        'Idevise',
      ].join('\t');

      const lines = [header];

      exerciceEcritures.forEach((ecriture: any, index: number) => {
        const dateFEC = ecriture.date.replace(/-/g, ''); // YYYY-MM-DD → YYYYMMDD
        const debit = ecriture.debit ? ecriture.debit.toFixed(2).replace('.', ',') : '0,00';
        const credit = ecriture.credit ? ecriture.credit.toFixed(2).replace('.', ',') : '0,00';

        const line = [
          ecriture.journal || 'OD',
          'Opérations Diverses',
          String(index + 1),
          dateFEC,
          ecriture.compteNumero,
          '', // CompteLib (vide)
          '', // CompAuxNum
          '', // CompAuxLib
          ecriture.pieceRef || '',
          dateFEC, // PieceDate = EcritureDate
          ecriture.libelle || '',
          debit,
          credit,
          '', // EcritureLet
          '', // DateLet
          dateFEC, // ValidDate
          '', // Montantdevise
          '', // Idevise
        ].join('\t');

        lines.push(line);
      });

      const fecContent = lines.join('\n');

      // Télécharger le fichier
      const blob = new Blob([fecContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const exercice = exercices.find((ex) => ex.id === selectedExercice);
      a.download = `FEC_${exercice?.annee || 'export'}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      alert(`Exporté ${exerciceEcritures.length} écritures`);
    } catch (error: any) {
      alert('Erreur lors de l\'export : ' + error.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PWANavbar />

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/pwa')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">FEC (Fichier des Écritures Comptables)</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('import')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                mode === 'import'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📥 Importer FEC
            </button>
            <button
              onClick={() => setMode('export')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                mode === 'export'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📤 Exporter FEC
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {/* Import */}
          {mode === 'import' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier FEC (.txt)
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Format : colonnes séparées par des tabulations (TSV)
                </p>
                <input
                  type="file"
                  accept=".txt,.fec"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                onClick={handleImportFEC}
                disabled={importing || !file}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Import en cours...' : 'Importer FEC'}
              </button>

              {result && (
                <div
                  className={`p-4 rounded-lg ${
                    result.errors && result.errors.length > 0
                      ? 'bg-red-50 text-red-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  {result.imported !== undefined && (
                    <p className="font-medium">✅ {result.imported} écritures importées</p>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Erreurs :</p>
                      <ul className="list-disc list-inside">
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Export */}
          {mode === 'export' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  ℹ️ L'export FEC génère un fichier au format réglementaire (TSV) contenant toutes
                  les écritures de l'exercice sélectionné.
                </p>
              </div>

              <button
                onClick={handleExportFEC}
                disabled={exporting || !selectedExercice}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Export en cours...' : 'Télécharger FEC'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
