import { useRouter } from 'next/router';
import { useState } from 'react';

export default function ReparerPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const repairCommand = `launchctl unload ~/Library/LaunchAgents/com.comptabilite.france.backend.plist 2>/dev/null; sleep 2; launchctl load ~/Library/LaunchAgents/com.comptabilite.france.backend.plist; sleep 3; curl -s http://localhost:3001 && echo "✅ Backend réparé!" || echo "❌ Backend ne répond toujours pas"`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(repairCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🔧 Réparer le Backend
            </h1>
            <p className="text-gray-600 text-lg">
              Redémarrage automatique du backend en 1 clic
            </p>
          </div>

          {/* Instructions principales */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-8 mb-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🛠️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Réparation automatique</h2>
              <p className="text-gray-700 mb-6">
                Si le backend ne répond pas, téléchargez l'outil de réparation.<br />
                Il va simplement <strong>redémarrer le service</strong> sans rien supprimer.
              </p>

              <a
                href="https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/ComptabiliteFrance-Repair.pkg"
                download="ComptabiliteFrance-Repair.pkg"
                className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-lg transition-all shadow-lg text-lg"
              >
                ⬇️ Télécharger l'outil de réparation
              </a>
            </div>
          </div>

          {/* Instructions d'utilisation */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Mode d'emploi</h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                <span>Cliquez sur le bouton ci-dessus pour télécharger <code className="bg-gray-100 px-2 py-1 rounded text-sm">ComptabiliteFrance-Repair.pkg</code></span>
              </li>
              <li className="flex gap-3">
                <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                <span><strong>Double-cliquez</strong> sur le fichier téléchargé</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                <span>Suivez l'assistant d'installation</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</span>
                <span>Entrez votre <strong>mot de passe Mac</strong> quand demandé</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">5</span>
                <span>Une notification vous confirmera que le backend est réparé ✅</span>
              </li>
            </ol>
          </div>

          {/* Ce que ça fait */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">✅ Ce que fait la réparation</h2>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Arrête le service backend</li>
              <li>✓ Redémarre le service backend</li>
              <li>✓ Vérifie que le backend répond</li>
              <li>✓ Affiche une notification de confirmation</li>
            </ul>
            <p className="mt-4 text-sm text-green-700 font-semibold">
              ✅ Vos données ne sont PAS supprimées
            </p>
          </div>

          {/* Si ça ne marche toujours pas */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">⚠️ Si ça ne fonctionne toujours pas</h2>
            <p className="text-gray-700 mb-4">
              Si le backend ne répond toujours pas après la réparation, il faut <strong>réinstaller complètement</strong> :
            </p>
            <div className="flex gap-4">
              <a
                href="/desinstaller"
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                1️⃣ Désinstaller
              </a>
              <a
                href="/installation"
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                2️⃣ Réinstaller
              </a>
            </div>
          </div>

          {/* Vérifier après réparation */}
          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🔍 Vérifier que ça fonctionne</h2>
            <p className="text-gray-700 mb-4">
              Après la réparation, vous pouvez vérifier que le backend répond :
            </p>
            <a
              href="/logs"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              📋 Voir les logs du backend
            </a>
            <p className="text-gray-500 text-sm mt-2">
              Si cette page s'affiche sans erreur 404, le backend fonctionne ✅
            </p>
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
