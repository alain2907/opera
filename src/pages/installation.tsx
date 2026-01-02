import { useRouter } from 'next/router';
import { useState } from 'react';

export default function InstallationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              📦 Installation Comptabilité France
            </h1>
            <p className="text-gray-600 text-lg">
              Guide d'installation simplifié pour Mac
            </p>
            <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg">
              ⏱️ Temps estimé : <strong>5 minutes</strong>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      currentStep >= step
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        currentStep > step ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Node.js</span>
              <span>Backend</span>
              <span>Terminé</span>
            </div>
          </div>

          {/* Step 1: Node.js */}
          <div className={`mb-8 ${currentStep !== 1 && 'opacity-50'}`}>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">📦</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Étape 1 : Installer Node.js
                  </h2>
                  <p className="text-gray-600">
                    Requis pour faire fonctionner le backend
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    📝 Instructions :
                  </h3>
                  <ol className="space-y-2 text-gray-700">
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">1.</span>
                      <span>Cliquez sur le bouton ci-dessous pour télécharger Node.js</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">2.</span>
                      <span>
                        Double-cliquez sur le fichier <code className="bg-gray-100 px-2 py-1 rounded text-sm">node-v*.pkg</code> téléchargé
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">3.</span>
                      <span>Suivez l'assistant d'installation (cliquez sur "Continuer" plusieurs fois)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">4.</span>
                      <span>Entrez votre mot de passe Mac quand demandé</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-blue-600">5.</span>
                      <span>Attendez la fin de l'installation (environ 1 minute)</span>
                    </li>
                  </ol>
                </div>

                <a
                  href="https://nodejs.org/dist/v20.18.1/node-v20.18.1.pkg"
                  download
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg text-center"
                  onClick={() => {
                    setTimeout(() => setCurrentStep(2), 2000);
                  }}
                >
                  ⬇️ Télécharger Node.js (LTS 20.18.1)
                </a>

                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">💡 Note :</span> Node.js est gratuit et open-source. C'est un logiciel sûr utilisé par des millions de développeurs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Backend */}
          <div className={`mb-8 ${currentStep !== 2 && 'opacity-50'}`}>
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">🚀</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Étape 2 : Installer le Backend
                  </h2>
                  <p className="text-gray-600">
                    Le logiciel de comptabilité local
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    📝 Instructions :
                  </h3>
                  <ol className="space-y-2 text-gray-700">
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">1.</span>
                      <span>Cliquez sur le bouton ci-dessous pour télécharger l'installeur</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">2.</span>
                      <span>
                        Double-cliquez sur le fichier <code className="bg-gray-100 px-2 py-1 rounded text-sm">ComptabiliteFrance-Installer.pkg</code>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">3.</span>
                      <span>Cliquez sur "Continuer" puis "Installer"</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-green-600">4.</span>
                      <span>Attendez le message "Installation terminée avec succès"</span>
                    </li>
                  </ol>
                </div>

                <a
                  href="https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/ComptabiliteFrance-Installer.pkg"
                  download
                  className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg text-center"
                  onClick={() => {
                    setTimeout(() => setCurrentStep(3), 2000);
                  }}
                >
                  ⬇️ Télécharger l'installeur Backend
                </a>

                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">ℹ️ Info :</span> Le backend s'installera dans <code className="bg-gray-100 px-1 rounded text-xs">~/Library/Application Support/ComptabiliteFrance/</code> et démarrera automatiquement à chaque ouverture de session.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Success */}
          <div className={`mb-8 ${currentStep !== 3 && 'opacity-50'}`}>
            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Installation terminée !
                </h2>
                <p className="text-gray-600 mb-6">
                  Vous pouvez maintenant utiliser l'application
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/dashboard-firebase')}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg"
                  >
                    🚀 Accéder à l'application
                  </button>

                  <div className="bg-white border border-purple-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      ✅ Ce qui a été installé :
                    </h3>
                    <ul className="text-sm text-gray-700 space-y-1 text-left">
                      <li>✓ Node.js v20.18.1 (runtime JavaScript)</li>
                      <li>✓ Backend NestJS + SQLite (serveur local)</li>
                      <li>
                        ✓ Base de données dans{' '}
                        <code className="bg-gray-100 px-1 rounded text-xs">
                          ~/Documents/ComptabiliteFrance/
                        </code>
                      </li>
                      <li>✓ Démarrage automatique du backend</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">💚 Privacy-first :</span>{' '}
                      Toutes vos données restent sur votre ordinateur. Le backend cloud ne traite que la logique métier, jamais vos données comptables.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Help section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              ❓ Besoin d'aide ?
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <details>
                <summary className="cursor-pointer hover:text-gray-900 font-semibold">
                  ⚠️ L'installation a échoué
                </summary>
                <div className="mt-2 ml-4 space-y-1">
                  <p>Si l'installation du backend échoue :</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Vérifiez que Node.js est bien installé (Étape 1)</li>
                    <li>Essayez de fermer et rouvrir le Terminal</li>
                    <li>Redémarrez votre Mac</li>
                    <li>Recommencez l'installation</li>
                  </ol>
                </div>
              </details>

              <details>
                <summary className="cursor-pointer hover:text-gray-900 font-semibold">
                  🔒 macOS bloque l'installation
                </summary>
                <div className="mt-2 ml-4 space-y-1">
                  <p>Si macOS affiche "Application non vérifiée" :</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Allez dans Préférences Système → Confidentialité et sécurité</li>
                    <li>Cherchez le message concernant l'installeur</li>
                    <li>Cliquez sur "Ouvrir quand même"</li>
                  </ol>
                </div>
              </details>

              <details>
                <summary className="cursor-pointer hover:text-gray-900 font-semibold">
                  🗑️ Désinstaller
                </summary>
                <div className="mt-2 ml-4">
                  <p>Pour désinstaller complètement :</p>
                  <code className="block bg-gray-900 text-green-400 p-2 rounded text-xs mt-2">
                    launchctl unload ~/Library/LaunchAgents/com.comptabilite.france.backend.plist<br />
                    rm -rf ~/Library/Application\ Support/ComptabiliteFrance<br />
                    rm -rf ~/Documents/ComptabiliteFrance<br />
                    rm ~/Library/LaunchAgents/com.comptabilite.france.backend.plist
                  </code>
                </div>
              </details>
            </div>
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
