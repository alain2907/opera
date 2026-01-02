import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';

export default function ConfigurerBackendPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [machineKey, setMachineKey] = useState<string>('');
  const [copied, setCopied] = useState<string>('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push('/login-firebase');
        return;
      }
      setUser(currentUser);
      setLoading(false);

      // Générer ou récupérer une machine key depuis localStorage
      const savedKey = localStorage.getItem('machine_key');
      if (savedKey) {
        setMachineKey(savedKey);
      } else {
        generateMachineKey();
      }
    });

    return () => unsubscribe();
  }, [router]);

  const generateMachineKey = () => {
    const key = `machine-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setMachineKey(key);
    localStorage.setItem('machine_key', key);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const downloadConfigScript = () => {
    const script = `#!/bin/bash

###############################################################################
# Script de configuration automatique - Comptabilité France
# Ce script configure votre backend local pour se connecter à Koyeb
###############################################################################

set -e  # Arrêter en cas d'erreur

echo "🔧 Configuration du backend Comptabilité France"
echo "================================================"
echo ""

PLIST_FILE="$HOME/Library/LaunchAgents/com.comptabilite.france.backend.plist"
CLOUD_API_URL="https://violent-karon-gestion3008-free-e7089456.koyeb.app/api"
USER_ID="${user?.uid || ''}"
MACHINE_KEY="${machineKey}"

# Vérifier que le fichier plist existe
if [ ! -f "$PLIST_FILE" ]; then
    echo "❌ Erreur: Le backend n'est pas installé"
    echo "Veuillez d'abord installer le backend avec:"
    echo "curl -fsSL https://compta-france.vercel.app/api/install.sh | bash"
    exit 1
fi

echo "1/4 Arrêt du service..."
launchctl unload "$PLIST_FILE" 2>/dev/null || true

echo "2/4 Sauvegarde du fichier original..."
cp "$PLIST_FILE" "$PLIST_FILE.backup"

echo "3/4 Ajout des variables d'environnement..."

# Utiliser Python pour éditer le fichier plist (plus fiable que sed)
python3 - <<EOF
import plistlib
import sys

plist_path = "$PLIST_FILE"

# Lire le fichier plist
with open(plist_path, 'rb') as f:
    plist = plistlib.load(f)

# Ajouter les variables d'environnement
if 'EnvironmentVariables' not in plist:
    plist['EnvironmentVariables'] = {}

plist['EnvironmentVariables']['CLOUD_API_URL'] = "$CLOUD_API_URL"
plist['EnvironmentVariables']['USER_ID'] = "$USER_ID"
plist['EnvironmentVariables']['MACHINE_KEY'] = "$MACHINE_KEY"

# Écrire le fichier plist
with open(plist_path, 'wb') as f:
    plistlib.dump(plist, f)

print("✅ Variables ajoutées avec succès")
EOF

echo "4/4 Redémarrage du service..."
launchctl load "$PLIST_FILE"

echo ""
echo "✅ Configuration terminée avec succès !"
echo ""
echo "Vérification de la connexion..."
sleep 3

# Vérifier les logs
if tail -n 20 "$HOME/Library/Logs/ComptabiliteFrance/backend.log" | grep -q "Connecté au serveur Koyeb"; then
    echo "✅ Backend connecté à Koyeb avec succès !"
else
    echo "⚠️  Vérifiez les logs pour plus de détails:"
    echo "tail -f ~/Library/Logs/ComptabiliteFrance/backend.log"
fi

echo ""
echo "Vous pouvez maintenant utiliser l'application sur:"
echo "https://compta-france.vercel.app"
echo ""
`;

    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'configurer-backend.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const installDir = "~/Library/Application Support/ComptabiliteFrance";
  const dataDir = "~/Documents/ComptabiliteFrance";
  const plistFile = "~/Library/LaunchAgents/com.comptabilite.france.backend.plist";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">⚙️ Configurer le Backend Local</h1>
          <p className="text-gray-600 mb-8">
            Configuration de la connexion WebSocket entre votre backend local et Koyeb
          </p>

          {/* Étape 1 : Vérifier l'installation */}
          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Étape 1 : Vérifier l'installation</h2>
            <p className="text-gray-700 mb-4">
              Assurez-vous d'avoir installé le backend local avec la commande :
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              curl -fsSL https://compta-france.vercel.app/api/install.sh | bash
            </div>
            <p className="text-sm text-gray-600">
              Si ce n'est pas fait, allez sur <a href="/telecharger" className="text-blue-600 hover:underline">/telecharger</a>
            </p>
          </div>

          {/* Étape 2 : Informations de connexion */}
          <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🔑 Étape 2 : Vos identifiants de connexion</h2>

            <div className="space-y-4">
              {/* Firebase UID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Firebase UID (USER_ID)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={user?.uid || ''}
                    readOnly
                    className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(user?.uid || '', 'uid')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {copied === 'uid' ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
              </div>

              {/* Machine Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Clé Machine (MACHINE_KEY)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={machineKey}
                    readOnly
                    className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(machineKey, 'key')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {copied === 'key' ? '✓ Copié' : 'Copier'}
                  </button>
                  <button
                    onClick={generateMachineKey}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Regénérer
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Étape 3 : Configuration automatique */}
          <div className="mb-8 p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🚀 Étape 3 : Configuration automatique</h2>

            <p className="text-gray-700 mb-6">
              Téléchargez le script de configuration et double-cliquez dessus pour configurer automatiquement votre backend.
            </p>

            <div className="bg-white border-2 border-purple-300 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">📥</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Script de configuration</h3>
                  <p className="text-sm text-gray-600">
                    Configure automatiquement les variables d'environnement et redémarre le backend
                  </p>
                </div>
              </div>

              <button
                onClick={downloadConfigScript}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg text-lg"
              >
                📥 Télécharger le script de configuration
              </button>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">📝 Instructions d'utilisation :</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-2">
                <li>Cliquez sur le bouton ci-dessus pour télécharger le script</li>
                <li>Allez dans votre dossier "Téléchargements"</li>
                <li>Double-cliquez sur le fichier <code className="bg-gray-200 px-2 py-1 rounded">configurer-backend.sh</code></li>
                <li>Si macOS vous demande l'autorisation, cliquez sur "Ouvrir"</li>
                <li>Le Terminal s'ouvre et configure automatiquement le backend</li>
                <li>Attendez le message "✅ Configuration terminée avec succès !"</li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">💡 Que fait ce script ?</span><br/>
                Il arrête le backend, ajoute vos identifiants (USER_ID et MACHINE_KEY), puis redémarre le backend pour qu'il se connecte à Koyeb automatiquement.
              </p>
            </div>
          </div>

          {/* Architecture */}
          <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">📖 Comment ça fonctionne ?</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <span>1.</span>
                <span>Votre backend local se connecte à Koyeb via WebSocket</span>
              </div>
              <div className="flex items-start gap-2">
                <span>2.</span>
                <span>Koyeb route vos requêtes depuis le frontend vers votre backend local</span>
              </div>
              <div className="flex items-start gap-2">
                <span>3.</span>
                <span>Toutes vos données restent 100% locales sur votre machine (SQLite)</span>
              </div>
              <div className="flex items-start gap-2">
                <span>4.</span>
                <span>Koyeb ne voit que les commandes, jamais les données comptables</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/dashboard-firebase')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
            >
              ← Retour au dashboard
            </button>
            <button
              onClick={() => router.push('/telecharger')}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-semibold"
            >
              Télécharger le backend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
