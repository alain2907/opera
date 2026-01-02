import { useRouter } from 'next/router';

export default function TelechargerPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">💻 Télécharger Comptabilité France</h1>
            <p className="text-gray-600 text-lg">
              Application desktop avec backend local SQLite
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* macOS */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-green-100 rounded-lg p-6 text-center">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">macOS</h3>
              <p className="text-sm text-gray-600 mb-4">macOS 10.12+</p>

              {/* Installation simple (recommandée) */}
              <div className="mb-4">
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-3">
                  <p className="text-sm text-green-800 font-bold mb-3">✨ Installation simple (recommandée)</p>
                  <p className="text-xs text-gray-700 mb-3">
                    1. Cliquez sur "Télécharger"<br/>
                    2. Double-cliquez sur le fichier .pkg<br/>
                    3. Suivez l'assistant d'installation<br/>
                    4. C'est tout !
                  </p>
                  <a
                    href="https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/ComptabiliteFrance-Installer.pkg"
                    download="ComptabiliteFrance-Installer.pkg"
                    className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition"
                  >
                    📦 Télécharger l'installeur PKG
                  </a>
                </div>
                <p className="text-xs text-gray-600">
                  ✓ Installeur macOS standard<br/>
                  ✓ Installation 100% automatique<br/>
                  ✓ Seulement 4.7 KB
                </p>
              </div>

              {/* Options avancées */}
              <details className="border-t pt-4">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 font-semibold mb-2">
                  Options avancées ▼
                </summary>
                <div className="space-y-3 mt-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Via Terminal (curl) :</p>
                    <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs break-all">
                      curl -fsSL https://gestion3008.vercel.app/api/install.sh | bash
                    </code>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Téléchargement backend.zip :</p>
                    <a
                      href="https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/backend.zip"
                      download="backend.zip"
                      className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                    >
                      Télécharger backend.zip
                    </a>
                    <p className="text-xs text-gray-500 mt-1">(82 MB - Installation manuelle requise)</p>
                  </div>
                </div>
              </details>

              <p className="text-xs text-gray-500 mt-3">Intel & Apple Silicon</p>
            </div>

            {/* Windows */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">🪟</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Windows</h3>
              <p className="text-sm text-gray-600 mb-4">Windows 10+</p>
              <a
                href="https://github.com/alainnataf/comptabilite-france/releases/latest/download/Comptabilite-France-Setup.exe"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Télécharger .exe
              </a>
              <p className="text-xs text-gray-500 mt-2">Installeur</p>
            </div>

            {/* Linux */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">🐧</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Linux</h3>
              <p className="text-sm text-gray-600 mb-4">Ubuntu 18.04+</p>
              <a
                href="https://github.com/alainnataf/comptabilite-france/releases/latest/download/Comptabilite-France.AppImage"
                className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Télécharger .AppImage
              </a>
              <p className="text-xs text-gray-500 mt-2">Portable</p>
            </div>
          </div>

          {/* Features */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">✨ Fonctionnalités</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Démarrage automatique</strong> du backend local avec SQLite</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Données 100% locales</strong> sur votre machine (privacy-first)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Synchronisation cloud</strong> via Koyeb (logique métier uniquement)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Multi-entreprise</strong> et multi-exercice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Plan comptable français</strong> conforme (PCG)</span>
              </li>
            </ul>
          </div>

          {/* Installation Backend Local (macOS) */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🚀 Installation rapide Backend Local (macOS)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Pour utiliser la version web avec backend local (1 commande) :
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              curl -fsSL https://compta-france.vercel.app/api/install.sh | bash
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>✓ Installe le backend NestJS + SQLite sur votre machine</p>
              <p>✓ Configure le démarrage automatique (LaunchAgent)</p>
              <p>✓ Données 100% locales dans ~/Documents/ComptabiliteFrance/</p>
              <p>✓ Utilisez ensuite https://compta-france.vercel.app</p>
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Installation Applications Desktop</h3>

            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2"> macOS</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Téléchargez le fichier <code className="bg-gray-200 px-2 py-1 rounded">Comptabilite-France-mac.zip</code></li>
                  <li>Décompressez le fichier ZIP</li>
                  <li>Glissez <code className="bg-gray-200 px-2 py-1 rounded">Comptabilite France.app</code> dans Applications</li>
                  <li>Double-cliquez pour lancer</li>
                  <li className="text-yellow-700">⚠️ Si macOS bloque l'app : Préférences Système → Sécurité → "Ouvrir quand même"</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-2">🪟 Windows</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Téléchargez l'installeur <code className="bg-gray-200 px-2 py-1 rounded">Comptabilite-France-Setup.exe</code></li>
                  <li>Lancez l'installeur et suivez les instructions</li>
                  <li>L'application sera installée dans <code className="bg-gray-200 px-2 py-1 rounded">C:\Program Files\Comptabilite France</code></li>
                  <li>Lancez depuis le menu Démarrer</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-2">🐧 Linux</h4>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Téléchargez <code className="bg-gray-200 px-2 py-1 rounded">Comptabilite-France.AppImage</code></li>
                  <li>Rendez le fichier exécutable : <code className="bg-gray-200 px-2 py-1 rounded text-xs">chmod +x Comptabilite-France.AppImage</code></li>
                  <li>Double-cliquez pour lancer (ou <code className="bg-gray-200 px-2 py-1 rounded text-xs">./Comptabilite-France.AppImage</code>)</li>
                </ol>
              </div>
            </div>
          </div>

          {/* System Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">💻 Configuration requise</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold mb-2"> macOS</h4>
                <ul className="space-y-1">
                  <li>• macOS 10.12 ou supérieur</li>
                  <li>• 2 GB RAM minimum</li>
                  <li>• 500 MB espace disque</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🪟 Windows</h4>
                <ul className="space-y-1">
                  <li>• Windows 10 ou supérieur</li>
                  <li>• 2 GB RAM minimum</li>
                  <li>• 500 MB espace disque</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🐧 Linux</h4>
                <ul className="space-y-1">
                  <li>• Ubuntu 18.04+ ou équivalent</li>
                  <li>• 2 GB RAM minimum</li>
                  <li>• 500 MB espace disque</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/dashboard-firebase')}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              ← Retour au dashboard
            </button>
            <a
              href="https://github.com/alainnataf/comptabilite-france/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Voir toutes les versions →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
