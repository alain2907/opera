import { useRouter } from 'next/router';
import { useState } from 'react';

export default function GuideInstallationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            💼 Comptabilité France
          </h1>
          <p className="text-2xl text-gray-600 mb-2">
            Démarrer en 4 étapes simples
          </p>
          <p className="text-gray-500">
            Aucune connaissance technique requise • 100% automatique
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    currentStep >= step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {currentStep > step ? '✓' : step}
                </div>
                {step < 4 && (
                  <div
                    className={`h-1 w-20 mx-2 ${
                      currentStep > step ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Étape 1 */}
          <div
            className={`bg-white rounded-2xl shadow-xl p-8 border-4 ${
              currentStep === 1 ? 'border-blue-400' : 'border-transparent'
            }`}
          >
            <div className="flex items-start gap-6">
              <div className="text-6xl">1️⃣</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Créer votre compte
                </h2>
                <p className="text-gray-600 mb-4">
                  ⏱️ 2 minutes • Gratuit
                </p>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700">
                    📧 Créez un compte avec votre email et un mot de passe
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCurrentStep(2);
                    router.push('/login-firebase');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all shadow-lg"
                >
                  → Créer mon compte
                </button>
              </div>
            </div>
          </div>

          {/* Étape 2 */}
          <div
            className={`bg-white rounded-2xl shadow-xl p-8 border-4 ${
              currentStep === 2 ? 'border-purple-400' : 'border-transparent'
            }`}
          >
            <div className="flex items-start gap-6">
              <div className="text-6xl">2️⃣</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Installer l'application
                </h2>
                <p className="text-gray-600 mb-4">
                  ⏱️ 5 minutes • Installation automatique
                </p>
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    📥 Que faire ?
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
                    <li>Cliquez sur "Télécharger l'installeur" ci-dessous</li>
                    <li>Allez dans votre dossier "Téléchargements"</li>
                    <li>Double-cliquez sur le fichier téléchargé</li>
                    <li>Attendez la fin de l'installation</li>
                  </ol>
                </div>
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-6">
                  <p className="text-xs text-gray-700">
                    ⚠️ Si macOS vous demande l'autorisation, cliquez sur "Ouvrir"
                  </p>
                </div>
                <a
                  href="/api/download-installer"
                  download="installer-backend.sh"
                  onClick={() => setCurrentStep(3)}
                  className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all shadow-lg"
                >
                  📥 Télécharger l'installeur
                </a>
              </div>
            </div>
          </div>

          {/* Étape 3 */}
          <div
            className={`bg-white rounded-2xl shadow-xl p-8 border-4 ${
              currentStep === 3 ? 'border-green-400' : 'border-transparent'
            }`}
          >
            <div className="flex items-start gap-6">
              <div className="text-6xl">3️⃣</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Configurer (une seule fois)
                </h2>
                <p className="text-gray-600 mb-4">
                  ⏱️ 2 minutes • Configuration automatique
                </p>
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    ⚙️ Que faire ?
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
                    <li>Connectez-vous avec votre compte créé à l'étape 1</li>
                    <li>Allez sur la page de configuration</li>
                    <li>Téléchargez le script de configuration</li>
                    <li>Double-cliquez sur le fichier téléchargé</li>
                    <li>Attendez le message "✅ Configuration terminée"</li>
                  </ol>
                </div>
                <button
                  onClick={() => {
                    setCurrentStep(4);
                    router.push('/configurer-backend');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all shadow-lg"
                >
                  → Configurer mon application
                </button>
              </div>
            </div>
          </div>

          {/* Étape 4 */}
          <div
            className={`bg-white rounded-2xl shadow-xl p-8 border-4 ${
              currentStep === 4 ? 'border-pink-400' : 'border-transparent'
            }`}
          >
            <div className="flex items-start gap-6">
              <div className="text-6xl">4️⃣</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Commencer votre comptabilité !
                </h2>
                <p className="text-gray-600 mb-4">
                  ⏱️ Immédiat • Prêt à utiliser
                </p>
                <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700 mb-3">
                    ✅ Votre application est installée et configurée !
                  </p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>✓ Données 100% locales sur votre ordinateur</li>
                    <li>✓ Connexion sécurisée à votre compte</li>
                    <li>✓ Plan comptable français conforme</li>
                    <li>✓ Multi-entreprise et multi-exercice</li>
                  </ul>
                </div>
                <button
                  onClick={() => router.push('/dashboard-firebase')}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all shadow-lg"
                >
                  🚀 Ouvrir mon application
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            ❓ Besoin d'aide ?
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">📖</div>
              <h4 className="font-semibold text-gray-800 mb-2">Documentation</h4>
              <p className="text-sm text-gray-600">
                Guides détaillés et tutoriels
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">💬</div>
              <h4 className="font-semibold text-gray-800 mb-2">Support</h4>
              <p className="text-sm text-gray-600">
                Assistance par email
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🎥</div>
              <h4 className="font-semibold text-gray-800 mb-2">Vidéos</h4>
              <p className="text-sm text-gray-600">
                Tutoriels vidéo pas à pas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
