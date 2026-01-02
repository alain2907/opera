import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { fecApi, type ImportFECResult } from '../api/fec';
import { entreprisesApi, type Entreprise } from '../api/entreprises';

export default function ImportFECPage() {
  const router = useRouter();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportFECResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);

  // Récupérer l'ID entreprise depuis l'URL ou localStorage
  const { id: urlId } = router.query;
  const [entrepriseId, setEntrepriseId] = useState<number | null>(null);

  useEffect(() => {
    // Priorité 1: ID dans l'URL
    if (urlId) {
      setEntrepriseId(Number(urlId));
    } else if (typeof window !== 'undefined') {
      // Priorité 2: localStorage
      const savedId = localStorage.getItem('currentEntrepriseId');
      if (savedId) {
        setEntrepriseId(Number(savedId));
      }
    }
  }, [urlId]);

  useEffect(() => {
    if (entrepriseId) {
      loadEntreprise(entrepriseId);
    }
  }, [entrepriseId]);

  const loadEntreprise = async (entrepriseId: number) => {
    try {
      const data = await entreprisesApi.getOne(entrepriseId);
      setEntreprise(data);
      // Sélectionner le dernier exercice par défaut
      if (data.exercices && data.exercices.length > 0) {
        const dernierExercice = data.exercices.sort((a: any, b: any) => b.annee - a.annee)[0];
        setSelectedExercice(dernierExercice.id);
      }
    } catch (err) {
      console.error('Erreur chargement entreprise:', err);
      setError('Erreur lors du chargement de l\'entreprise');
    }
  };

  const handleImportFEC = async () => {
    if (!importFile || !entreprise?.id || !selectedExercice) {
      setError('Fichier et exercice requis');
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await fecApi.importFEC(
        importFile,
        entreprise.id,
        selectedExercice
      );
      setImportResult(result);
      if (result.imported > 0) {
        setTimeout(() => {
          router.push('/dashboard-firebase');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erreur lors de l\'importation');
    } finally {
      setImporting(false);
    }
  };

  if (!entrepriseId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Import FEC</h2>
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

  if (!entreprise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => router.push('/dashboard-firebase')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import FEC</h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
            </p>
          </div>

          <div className="space-y-6">
            {/* Sélection exercice uniquement */}
            {entreprise.exercices && entreprise.exercices.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exercice comptable
                </label>
                <select
                  value={selectedExercice || ''}
                  onChange={(e) => setSelectedExercice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un exercice</option>
                  {entreprise.exercices.map((ex: any) => (
                    <option key={ex.id} value={ex.id}>
                      Exercice {ex.annee} ({new Date(ex.date_debut).toLocaleDateString('fr-FR')} - {new Date(ex.date_fin).toLocaleDateString('fr-FR')})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  ⚠️ Aucun exercice créé pour cette entreprise. Veuillez d'abord créer un exercice.
                </p>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <p className="text-sm text-gray-600 mb-4">
                Sélectionnez un fichier FEC (Fichier des Écritures Comptables) au format texte tabulé.
              </p>
              <input
                type="file"
                accept=".txt,.fec"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                    setImportResult(null);
                    setError(null);
                  }
                }}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {importFile && (
                <p className="mt-2 text-sm text-gray-700">
                  Fichier sélectionné : <span className="font-medium">{importFile.name}</span>
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Format attendu :</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Fichier texte avec tabulations comme séparateurs</li>
                <li>• Première ligne : en-têtes de colonnes</li>
                <li>• Colonnes : JournalCode, JournalLib, EcritureNum, EcritureDate, CompteNum, CompteLib, etc.</li>
                <li>• Les écritures sont groupées par EcritureNum (même numéro = même pièce)</li>
                <li>• Format de date : AAAAMMJJ (ex: 20250115)</li>
                <li>• Décimales avec virgule (ex: 13,20)</li>
              </ul>
            </div>

            <button
              onClick={handleImportFEC}
              disabled={!importFile || !selectedExercice || importing}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                !importFile || !selectedExercice || importing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {importing ? 'Importation en cours...' : 'Importer le fichier FEC'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {importResult && (
              <div className={`rounded-lg p-4 ${
                importResult.imported > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <h3 className="font-semibold mb-2">Résultat de l'importation :</h3>
                <p className="text-sm mb-2">
                  <span className="font-medium">{importResult.imported}</span> écriture(s) importée(s) avec succès
                </p>
                {importResult.imported > 0 && (
                  <p className="text-xs text-green-700 mt-2">
                    Redirection vers le dashboard dans 2 secondes...
                  </p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-700 mb-1">
                      {importResult.errors.length} erreur(s) :
                    </p>
                    <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li className="font-medium">... et {importResult.errors.length - 10} autre(s) erreur(s)</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
