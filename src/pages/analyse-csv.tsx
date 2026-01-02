import { useState } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';

interface CSVRow {
  [key: string]: string;
}

export default function AnalyseCSVPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [encoding, setEncoding] = useState<string>('UTF-8');
  const [delimiter, setDelimiter] = useState<string>(';');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCsvData([]);
      setHeaders([]);
    }
  };

  const parseCSV = async () => {
    if (!file) {
      alert('Veuillez sélectionner un fichier CSV');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        alert('Le fichier CSV est vide');
        setLoading(false);
        return;
      }

      // Première ligne = en-têtes
      const headerLine = lines[0];
      const parsedHeaders = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      setHeaders(parsedHeaders);

      // Lignes suivantes = données
      const rows: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));

        const row: CSVRow = {};
        parsedHeaders.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }

      setCsvData(rows);
    } catch (err) {
      console.error('Erreur lors de la lecture du CSV:', err);
      alert('Erreur lors de la lecture du fichier CSV');
    } finally {
      setLoading(false);
    }
  };

  const generateScript = () => {
    if (csvData.length === 0) {
      alert('Veuillez d\'abord charger et analyser un fichier CSV');
      return;
    }

    // Générer un script basé sur les données CSV
    let script = `// Script généré automatiquement à partir du CSV\n`;
    script += `// Fichier: ${file?.name}\n`;
    script += `// Nombre de lignes: ${csvData.length}\n`;
    script += `// Colonnes: ${headers.join(', ')}\n\n`;

    script += `const data = ${JSON.stringify(csvData, null, 2)};\n\n`;
    script += `// TODO: Ajouter la logique de traitement ici\n`;
    script += `console.log('Nombre d\\'enregistrements:', data.length);\n`;

    // Créer un blob et télécharger
    const blob = new Blob([script], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script_${file?.name.replace('.csv', '')}.js`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Analyse CSV</h2>
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
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Analyse de fichier CSV
            </h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              {exercice && (
                <span className="ml-4">
                  Exercice : {new Date(exercice.date_debut).getFullYear()}
                </span>
              )}
            </p>
          </div>

          {/* Configuration */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Encodage
              </label>
              <select
                value={encoding}
                onChange={(e) => setEncoding(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTF-8">UTF-8</option>
                <option value="ISO-8859-1">ISO-8859-1</option>
                <option value="Windows-1252">Windows-1252</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Séparateur
              </label>
              <select
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value=";">Point-virgule (;)</option>
                <option value=",">Virgule (,)</option>
                <option value="\t">Tabulation</option>
              </select>
            </div>
          </div>

          {/* Sélection du fichier */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichier CSV
            </label>
            <div className="flex gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={parseCSV}
                disabled={!file || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {loading ? 'Analyse...' : '🔍 Analyser'}
              </button>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Fichier sélectionné : <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Statistiques */}
          {csvData.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-bold text-lg">{csvData.length}</span> ligne{csvData.length > 1 ? 's' : ''} de données
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-green-700">
                    <span className="font-bold text-lg">{headers.length}</span> colonne{headers.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                  <button
                    onClick={generateScript}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    📜 Générer un script
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Aperçu des données */}
          {csvData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Aperçu des données (premières {Math.min(10, csvData.length)} lignes)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                      {headers.map((header, idx) => (
                        <th key={idx} className="px-4 py-3 text-left text-sm font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {csvData.slice(0, 10).map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{rowIdx + 1}</td>
                        {headers.map((header, colIdx) => (
                          <td key={colIdx} className="px-4 py-3 text-sm text-gray-900">
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 10 && (
                <p className="mt-4 text-sm text-gray-600 text-center">
                  ... et {csvData.length - 10} ligne{csvData.length - 10 > 1 ? 's' : ''} supplémentaire{csvData.length - 10 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {csvData.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Sélectionnez un fichier CSV et cliquez sur "Analyser" pour voir son contenu
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
