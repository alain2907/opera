import { useState } from 'react';

export default function InstallationSimplePage() {
  const [copied, setCopied] = useState<string | null>(null);

  const timestamp = Date.now();
  const installCommand = `curl -fsSL "https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/install-backend-clean.sh?v=${timestamp}" | bash`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              📦 Installation Comptabilité France
            </h1>
            <p className="text-gray-600 text-lg">
              Installation automatique du backend local
            </p>
            <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              ⏱️ Temps estimé : <strong>2 minutes</strong>
            </div>
          </div>

          {/* Installation en 1 commande */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-green-300 rounded-lg p-8 mb-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Installation en 1 commande</h2>
              <p className="text-gray-700 mb-6">
                Copiez cette commande, collez-la dans le Terminal, et c'est tout !
              </p>
            </div>

            <div className="bg-black text-green-400 p-6 rounded-lg font-mono text-sm overflow-x-auto mb-4">
              {installCommand}
            </div>

            <div className="text-center">
              <button
                onClick={() => copyToClipboard(installCommand, 'install')}
                className={`${
                  copied === 'install'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-bold py-4 px-8 rounded-lg transition-all shadow-lg text-lg`}
              >
                {copied === 'install' ? '✓ Copié !' : '📋 Copier la commande'}
              </button>
            </div>
          </div>

          {/* Mode d'emploi */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Mode d'emploi</h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                <div className="flex-1">
                  <span>Ouvrez le <strong>Terminal</strong></span>
                  <p className="text-sm text-gray-500 mt-1">Spotlight (Cmd+Espace) → tapez "Terminal" → Entrée</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                <div className="flex-1">
                  <span>Cliquez sur <strong>"📋 Copier la commande"</strong> ci-dessus</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                <div className="flex-1">
                  <span><strong>Collez</strong> dans le Terminal (Cmd+V) et appuyez sur <strong>Entrée</strong></span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</span>
                <div className="flex-1">
                  <span>Le script vous demandera votre <strong>USER_ID</strong></span>
                  <p className="text-sm text-gray-500 mt-1">
                    Trouvez-le sur : <a href="/mon-uid" className="text-blue-600 hover:underline" target="_blank">https://gestion3008.vercel.app/mon-uid</a>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">✓</span>
                <div className="flex-1">
                  <span>Le backend s'installe et démarre automatiquement ✅</span>
                </div>
              </li>
            </ol>
          </div>

          {/* Ce qui sera installé */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Ce qui sera installé</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span>Backend NestJS dans <code className="bg-white px-2 py-1 rounded text-sm">~/Library/Application Support/ComptabiliteFrance</code></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span>Base de données SQLite</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span>Service de démarrage automatique (LaunchAgent)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span>Logs dans <code className="bg-white px-2 py-1 rounded text-sm">~/Library/Logs/ComptabiliteFrance</code></span>
              </li>
            </ul>
            <p className="mt-4 text-sm text-green-700 font-semibold">
              ✅ Aucun droit administrateur requis - tout s'installe sous votre utilisateur
            </p>
          </div>

          {/* Vérification */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-100 border-2 border-indigo-300 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">✅ Vérifier que ça fonctionne</h2>
            <p className="text-gray-700 mb-4">
              Une fois l'installation terminée :
            </p>
            <ol className="space-y-2 text-gray-700 mb-4">
              <li>1. Ouvrez Safari et allez sur : <code className="bg-white px-2 py-1 rounded">http://localhost:3001/api</code></li>
              <li>2. Si vous voyez "Hello World" → <strong className="text-green-600">C'est bon !</strong> ✅</li>
            </ol>
            <p className="text-gray-700 mb-4">
              Ensuite, allez sur l'application web :
            </p>
            <a
              href="https://gestion3008.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              🚀 Ouvrir l'application
            </a>
          </div>

          {/* Désinstallation */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🗑️ Désinstallation</h2>
            <p className="text-gray-700 mb-4">
              Pour désinstaller complètement le backend :
            </p>
            <div className="bg-black text-red-400 p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4">
              curl -fsSL https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/uninstall-backend-clean.sh | bash
            </div>
            <button
              onClick={() => copyToClipboard('curl -fsSL https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/uninstall-backend-clean.sh | bash', 'uninstall')}
              className={`${
                copied === 'uninstall'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white font-bold py-2 px-4 rounded-lg transition-all text-sm`}
            >
              {copied === 'uninstall' ? '✓ Copié !' : '📋 Copier'}
            </button>
          </div>

          {/* Aide */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">❓ Besoin d'aide ?</h2>
            <p className="text-gray-700 mb-4">
              Si vous rencontrez un problème, vérifiez les logs :
            </p>
            <div className="bg-black text-yellow-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              tail -f ~/Library/Logs/ComptabiliteFrance/backend-error.log
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 text-center">
            <a
              href="/"
              className="inline-block px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              ← Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
