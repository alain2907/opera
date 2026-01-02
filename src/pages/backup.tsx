import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { backupApi, type Backup } from '../api/backup';

export default function BackupPage() {
  const router = useRouter();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const data = await backupApi.listBackups();
      setBackups(data);
    } catch (err) {
      console.error('Erreur chargement sauvegardes:', err);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await backupApi.exportDatabase();

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comptabilite-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert('✓ Base de données exportée avec succès !');
      await loadBackups();
    } catch (err) {
      console.error('Erreur export:', err);
      alert('Erreur lors de l\'export de la base de données');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('⚠️ ATTENTION: Cette action va remplacer votre base de données actuelle.\n\nUne sauvegarde automatique sera créée avant l\'import.\n\nConfirmer ?')) {
      event.target.value = '';
      return;
    }

    setImporting(true);
    try {
      await backupApi.importDatabase(file);
      alert('✓ Base de données restaurée avec succès !\n\nVeuillez recharger la page.');
      window.location.reload();
    } catch (err) {
      console.error('Erreur import:', err);
      alert('Erreur lors de l\'import de la base de données');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-6xl mx-auto p-8">
        <button
          onClick={() => router.push('/')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sauvegarde & Restauration</h2>
            <p className="text-gray-600">
              Gérez les sauvegardes de votre comptabilité
            </p>
          </div>

          {/* Actions principales */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Export */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl">💾</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 mb-2">
                    Créer une sauvegarde
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    Téléchargez une copie complète de votre base de données.
                    Une copie sera également sauvegardée sur votre ordinateur.
                  </p>
                  <button
                    onClick={handleExport}
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      loading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {loading ? 'Export en cours...' : '📥 Télécharger la sauvegarde'}
                  </button>
                </div>
              </div>
            </div>

            {/* Import */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border-2 border-orange-200">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-900 mb-2">
                    Restaurer une sauvegarde
                  </h3>
                  <p className="text-sm text-orange-700 mb-4">
                    Remplacez votre base de données actuelle par une sauvegarde.
                    <span className="font-semibold"> Une sauvegarde automatique sera créée avant.</span>
                  </p>
                  <label className={`block w-full py-3 rounded-lg font-semibold text-center transition-colors cursor-pointer ${
                    importing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}>
                    {importing ? 'Import en cours...' : '📤 Sélectionner un fichier'}
                    <input
                      type="file"
                      accept=".db,.sqlite"
                      onChange={handleImport}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des sauvegardes */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Sauvegardes disponibles
            </h3>

            {backups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune sauvegarde automatique trouvée
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm text-gray-900 font-semibold">
                          {backup.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(backup.date).toLocaleString('fr-FR')} • {formatFileSize(backup.size)}
                        </p>
                      </div>
                      <div className="text-2xl">📁</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Informations sauvegarde automatique */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-2xl">⚙️</div>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 mb-2">
                  Sauvegarde automatique configurée
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Quotidienne à 2h du matin (heure de Paris)</li>
                  <li>✓ Conservation des 7 dernières sauvegardes</li>
                  <li>✓ Uniquement si des opérations ont été effectuées</li>
                  <li>✓ Suppression automatique des anciennes sauvegardes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Avertissement */}
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-2">
                  Conseils de sauvegarde
                </p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Les sauvegardes automatiques sont créées chaque jour à 2h</li>
                  <li>• Téléchargez régulièrement une sauvegarde sur un disque externe</li>
                  <li>• Testez vos sauvegardes en les restaurant sur un environnement de test</li>
                  <li>• Conservez des copies importantes hors site (cloud, autre ordinateur)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
