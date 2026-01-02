import { useState } from 'react';
import { useRouter } from 'next/router';
import { exportAllData, importAllData } from '../../lib/storageAdapter';
import { deleteDB } from '../../lib/indexedDB';
import PWANavbar from '../../components/PWANavbar';

export default function BackupPage() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleExport() {
    try {
      setExporting(true);
      setMessage(null);

      const data = await exportAllData();

      // Créer un fichier JSON et le télécharger
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comptabilite-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        type: 'success',
        text: `✅ Export réussi : ${data.data.entreprises.length} entreprises, ${data.data.exercices.length} exercices, ${data.data.ecritures.length} écritures`,
      });
    } catch (error: any) {
      console.error('Erreur export:', error);
      setMessage({
        type: 'error',
        text: `❌ Erreur lors de l'export : ${error.message}`,
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setMessage(null);

      const text = await file.text();
      const data = JSON.parse(text);

      // Valider le format
      if (!data.version || !data.data) {
        throw new Error('Format de fichier invalide');
      }

      const result = await importAllData(data);

      setMessage({
        type: 'success',
        text: `✅ Import réussi : ${result.imported.entreprises} entreprises, ${result.imported.exercices} exercices, ${result.imported.ecritures} écritures`,
      });
    } catch (error: any) {
      console.error('Erreur import:', error);
      setMessage({
        type: 'error',
        text: `❌ Erreur lors de l'import : ${error.message}`,
      });
    } finally {
      setImporting(false);
      // Reset input pour permettre de réimporter le même fichier
      event.target.value = '';
    }
  }

  async function handleDeleteAll() {
    if (!confirm('⚠️ ATTENTION : Cette action supprimera TOUTES vos données locales de manière IRRÉVERSIBLE.\n\nVoulez-vous vraiment continuer ?')) {
      return;
    }

    if (!confirm('Dernière confirmation : Toutes vos entreprises, exercices et écritures seront supprimés. Êtes-vous sûr ?')) {
      return;
    }

    try {
      await deleteDB();
      setMessage({
        type: 'success',
        text: '✅ Base de données supprimée. Rechargement de la page...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      setMessage({
        type: 'error',
        text: `❌ Erreur lors de la suppression : ${error.message}`,
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PWANavbar />

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/pwa')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Sauvegarde & Restauration</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Export Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>💾</span> Exporter mes données
          </h2>
          <p className="text-gray-600 mb-4">
            Téléchargez une copie de toutes vos données (entreprises, exercices, écritures) au format JSON.
            Ce fichier peut être utilisé pour restaurer vos données ou les transférer vers un autre navigateur.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {exporting ? 'Export en cours...' : '📥 Télécharger la sauvegarde'}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📤</span> Importer des données
          </h2>
          <p className="text-gray-600 mb-4">
            Restaurez vos données à partir d'un fichier de sauvegarde JSON.
            <strong className="text-orange-600"> Attention : </strong>
            Les données importées s'ajouteront aux données existantes (pas de remplacement).
          </p>
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Important :</strong> Si vous voulez remplacer complètement vos données, supprimez d'abord la base de données ci-dessous, puis importez votre sauvegarde.
            </p>
          </div>
          <label className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
            {importing ? 'Import en cours...' : '📤 Choisir un fichier de sauvegarde'}
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>

        {/* Delete Section */}
        <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
          <h2 className="text-xl font-semibold text-red-900 mb-4 flex items-center gap-2">
            <span>🗑️</span> Zone dangereuse
          </h2>
          <p className="text-gray-600 mb-4">
            Supprimez complètement toutes vos données locales. Cette action est <strong className="text-red-600">irréversible</strong>.
            Assurez-vous d'avoir exporté vos données avant de continuer.
          </p>
          <button
            onClick={handleDeleteAll}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            🗑️ Supprimer toutes les données
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Bonnes pratiques</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Exportez régulièrement vos données (hebdomadaire recommandé)</li>
            <li>• Conservez vos sauvegardes dans un endroit sûr (Dropbox, Google Drive, etc.)</li>
            <li>• Avant de supprimer vos données, vérifiez que votre sauvegarde est valide</li>
            <li>• Les données sont stockées localement dans votre navigateur (IndexedDB)</li>
            <li>• En cas de changement de navigateur ou d'ordinateur, utilisez l'import pour restaurer vos données</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
