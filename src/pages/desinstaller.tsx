import { useRouter } from 'next/router';

export default function DesinstallerPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🗑️ Désinstallation Comptabilité France
            </h1>
            <p className="text-gray-600 text-lg">
              Désinstallation automatique en 3 clics
            </p>
          </div>

          {/* Instructions principales */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-8 mb-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Désinstalleur automatique</h2>
              <p className="text-gray-700 mb-6">
                Téléchargez le désinstalleur et double-cliquez dessus.<br />
                Tout sera supprimé automatiquement.
              </p>

              <a
                href="https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/ComptabiliteFrance-Uninstaller.pkg"
                download="ComptabiliteFrance-Uninstaller.pkg"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg transition-all shadow-lg text-lg"
              >
                ⬇️ Télécharger le désinstalleur
              </a>
            </div>
          </div>

          {/* Instructions d'utilisation */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Mode d'emploi</h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                <span>Cliquez sur le bouton ci-dessus pour télécharger <code className="bg-gray-100 px-2 py-1 rounded text-sm">ComptabiliteFrance-Uninstaller.pkg</code></span>
              </li>
              <li className="flex gap-3">
                <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                <span><strong>Double-cliquez</strong> sur le fichier téléchargé</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                <span>Suivez l'assistant d'installation (qui désinstalle en réalité)</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</span>
                <span>Entrez votre <strong>mot de passe Mac</strong> quand demandé</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">5</span>
                <span>Attendez le message "L'installation a réussi" → <strong>C'est fini !</strong></span>
              </li>
            </ol>
          </div>

          {/* Ce qui sera supprimé */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">⚠️ Ce qui sera supprimé</h2>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Le service de démarrage automatique</li>
              <li>✓ L'application backend</li>
              <li>✓ <strong className="text-red-600">Toutes vos données comptables</strong></li>
              <li>✓ Les fichiers de logs</li>
            </ul>
            <p className="mt-4 text-sm text-red-600 font-semibold">
              ⚠️ Attention : Cette opération est irréversible !
            </p>
          </div>

          {/* Success message */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3">✅ Après la désinstallation</h2>
            <p className="text-gray-700 mb-4">
              Une fois la désinstallation terminée, vous pouvez réinstaller le backend avec la nouvelle version.
            </p>
            <button
              onClick={() => router.push('/installation')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              🔄 Réinstaller le backend
            </button>
          </div>

          {/* Navigation */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/dashboard-firebase')}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              ← Retour au dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
