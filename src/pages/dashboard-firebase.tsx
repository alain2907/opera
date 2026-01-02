import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface UserData {
  user: {
    id: string;
    email: string;
    firebase_uid: string;
  };
  license: {
    status: string;
    plan: string;
    expiresAt: string;
  } | null;
}

interface BackendStatus {
  backendReachable: boolean;
  linkedToThisUser: boolean;
  hasDatabase: boolean;
}

type DashboardState = 'loading' | 'install' | 'configure' | 'ready';

export default function DashboardFirebase() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardState, setDashboardState] = useState<DashboardState>('loading');
  const [checkingBackend, setCheckingBackend] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login-firebase');
        setLoading(false);
        return;
      }

      try {
        // Récupérer les données depuis Firebase directement
        const data: UserData = {
          user: {
            id: user.uid,
            email: user.email || '',
            firebase_uid: user.uid,
          },
          license: null, // Pas de gestion de licences
        };

        setUserData(data);

        // Vérifier l'état du backend local
        await checkBackendStatus(user.uid);
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login-firebase');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const checkBackendStatus = async (firebaseUid: string) => {
    try {
      setCheckingBackend(true);

      // PRIORITÉ 1: Vérifier si le backend local est accessible directement
      try {
        const localResponse = await fetch('http://localhost:3001/api/entreprises', {
          method: 'GET',
          signal: AbortSignal.timeout(2000), // Timeout rapide de 2 secondes
        });

        if (localResponse.ok) {
          console.log('✅ Backend local détecté sur localhost:3001');
          // Backend local accessible directement
          setDashboardState('ready');
          return;
        }
      } catch (localError) {
        console.log('Backend local non accessible directement, essai via Koyeb...');
      }

      // PRIORITÉ 2: Appeler Koyeb pour vérifier l'état du backend local via WebSocket
      const cloudApiUrl = process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://violent-karon-gestion3008-free-e7089456.koyeb.app/api';
      const statusResponse = await fetch(`${cloudApiUrl}/proxy/backend/status?userId=${firebaseUid}`, {
        method: 'GET',
        signal: AbortSignal.timeout(35000), // Timeout 35 secondes (backend timeout = 30s)
      });

      if (!statusResponse.ok) {
        throw new Error('Erreur Koyeb');
      }

      const data = await statusResponse.json();

      if (!data.connected || data.machines.length === 0) {
        // Aucun backend connecté pour cet utilisateur
        setDashboardState('install');
        return;
      }

      const machine = data.machines[0];

      if (machine.userId === firebaseUid && machine.hasDatabase) {
        // Tout est configuré
        setDashboardState('ready');
      } else if (machine.hasDatabase) {
        // Backend présent mais pas lié à ce userId
        setDashboardState('configure');
      } else {
        // Backend connecté mais pas de database
        setDashboardState('configure');
      }
    } catch (error) {
      console.log('Backend local non connecté via Koyeb:', error);
      // Backend pas installé ou pas connecté
      setDashboardState('install');
    } finally {
      setCheckingBackend(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('firebase_user');
      localStorage.removeItem('firebase_token');
      router.push('/login-firebase');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const licenseExpired = userData.license && new Date(userData.license.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🔥 Dashboard Firebase</h1>
              <p className="text-gray-600 mt-2">Bienvenue dans votre espace</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
            >
              Déconnexion
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Informations utilisateur */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">👤 Utilisateur</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="font-medium text-gray-800">{userData.user.email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">ID:</span>
                  <p className="font-mono text-xs text-gray-600">{userData.user.id}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Firebase UID:</span>
                  <p className="font-mono text-xs text-gray-600">{userData.user.firebase_uid}</p>
                </div>
              </div>
            </div>

            {/* Informations licence */}
            <div className={`border rounded-lg p-6 ${licenseExpired ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">📜 Licence</h2>
              {userData.license ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Plan:</span>
                    <p className="font-medium text-gray-800 uppercase">{userData.license.plan}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Statut:</span>
                    <p className="font-medium text-gray-800 uppercase">{userData.license.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Expire le:</span>
                    <p className={`font-medium ${licenseExpired ? 'text-red-600' : 'text-gray-800'}`}>
                      {new Date(userData.license.expiresAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {licenseExpired && (
                    <div className="mt-4 bg-red-100 border border-red-300 rounded p-3">
                      <p className="text-sm text-red-800 font-medium">⚠️ Votre licence a expiré</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">Aucune licence active</p>
              )}
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">✅ Authentification Firebase</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ Authentification réussie avec Firebase Auth</li>
              <li>✓ Token Firebase vérifié par le backend</li>
              <li>✓ Utilisateur créé/synchronisé dans PostgreSQL</li>
              <li>✓ Licence générée automatiquement (30 jours trial)</li>
            </ul>
          </div>

          {/* État du backend - 3 cas possibles */}
          {checkingBackend ? (
            <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Vérification du backend local...</p>
            </div>
          ) : dashboardState === 'install' ? (
            // État 1 : Backend non détecté - Afficher les deux options
            <div className="mt-8 space-y-6">
              {/* Section Nouvel utilisateur */}
              <div className="p-6 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-4xl">🆕</div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Nouvel utilisateur
                    </h2>
                  </div>
                  <p className="text-gray-700">
                    Première utilisation ? Installez le backend local sur votre Mac.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">📦 Ce qui sera installé :</h3>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>✓ Backend local (serveur NestJS + SQLite)</li>
                      <li>✓ Base de données locale dans <code className="bg-gray-100 px-1 rounded text-xs">Documents/ComptabiliteFrance/</code></li>
                      <li>✓ Démarrage automatique à chaque ouverture de session</li>
                      <li>✓ Données 100% sur votre ordinateur</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push('/installation')}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg"
                    >
                      📥 Installer le logiciel
                    </button>
                    <button
                      onClick={() => router.push('/telecharger')}
                      className="flex-1 bg-white hover:bg-gray-50 text-orange-600 font-semibold py-4 px-6 rounded-lg border-2 border-orange-600 transition-all"
                    >
                      📘 Téléchargements
                    </button>
                  </div>
                </div>
              </div>

              {/* Section Utilisateur habituel */}
              <div className="p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-4xl">🔧</div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Utilisateur habituel
                    </h2>
                  </div>
                  <p className="text-gray-700">
                    Le backend est installé mais ne répond pas ? Gérez le service.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">🛠️ Actions disponibles :</h3>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>• Arrêter le service backend</li>
                      <li>• Relancer le service backend</li>
                      <li>• Vérifier les logs d'erreurs</li>
                      <li>• Réinitialiser la configuration</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        const cmd = 'launchctl unload ~/Library/LaunchAgents/com.comptabilite.france.backend.dev.plist';
                        navigator.clipboard.writeText(cmd);
                        alert('Commande copiée ! Collez-la dans le Terminal pour arrêter le service.');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                    >
                      🛑 Arrêter le service
                    </button>
                    <button
                      onClick={() => {
                        const cmd = 'launchctl load ~/Library/LaunchAgents/com.comptabilite.france.backend.dev.plist';
                        navigator.clipboard.writeText(cmd);
                        alert('Commande copiée ! Collez-la dans le Terminal pour démarrer le service.');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                    >
                      🚀 Démarrer le service
                    </button>
                    <button
                      onClick={() => {
                        const cmd = 'tail -f ~/Library/Logs/ComptabiliteFrance/backend-dev.log';
                        navigator.clipboard.writeText(cmd);
                        alert('Commande copiée ! Collez-la dans le Terminal pour voir les logs en temps réel.');
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                    >
                      📋 Voir les logs
                    </button>
                    <button
                      onClick={() => {
                        const cmds = [
                          'launchctl unload ~/Library/LaunchAgents/com.comptabilite.france.backend.dev.plist',
                          'sleep 2',
                          'launchctl load ~/Library/LaunchAgents/com.comptabilite.france.backend.dev.plist'
                        ].join(' && ');
                        navigator.clipboard.writeText(cmds);
                        alert('Commandes copiées ! Collez-les dans le Terminal pour redémarrer le service.');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                    >
                      🔄 Redémarrer le service
                    </button>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">💡 Astuce :</span> Cliquez sur un bouton pour copier la commande, puis collez-la dans le Terminal (⌘+V).
                    </p>
                  </div>

                  <div className="pt-4 border-t border-blue-200 space-y-3">
                    <button
                      onClick={() => router.push('/desinstaller')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                    >
                      🗑️ Désinstaller complètement
                    </button>
                    <button
                      onClick={() => router.push('/diagnostic')}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                    >
                      🔧 Diagnostic complet (pour support technique)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : dashboardState === 'configure' ? (
            // État 2 : Backend installé mais pas configuré
            <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Étape 2 : Configurer cet ordinateur
                </h2>
                <p className="text-gray-700">
                  Le backend est installé, mais il n'est pas encore lié à votre compte.
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">🔗 Configuration requise :</h3>
                  <ul className="text-sm text-gray-700 space-y-1 ml-4">
                    <li>✓ Lier le backend à votre compte Firebase</li>
                    <li>✓ Configurer les variables d'environnement</li>
                    <li>✓ Activer la connexion WebSocket avec Koyeb</li>
                  </ul>
                </div>

                <button
                  onClick={() => router.push('/configurer-backend')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg"
                >
                  ⚙️ Configurer cet ordinateur maintenant
                </button>
              </div>
            </div>
          ) : (
            // État 3 : Tout est OK
            <div className="mt-8 p-6 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  Ce Mac est correctement configuré
                </h2>
                <p className="text-gray-700">
                  Votre backend local fonctionne et est connecté à votre compte.
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => router.push('/selection-entreprise')}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg"
                  >
                    📊 Gérer mes entreprises
                  </button>
                  <button
                    onClick={() => router.push('/dashboard-firebase')}
                    className="bg-white hover:bg-gray-50 text-green-600 font-semibold py-4 px-6 rounded-lg border-2 border-green-600 transition-all"
                  >
                    📂 Ouvrir mon dossier comptable
                  </button>
                </div>

                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800 font-semibold">
                    Options avancées
                  </summary>
                  <div className="mt-3 space-y-2 pl-4">
                    <a
                      href="/desinstaller"
                      className="block text-red-600 hover:underline font-semibold"
                    >
                      → Désinstaller complètement le backend
                    </a>
                    <a
                      href="/telecharger"
                      className="block text-blue-600 hover:underline"
                    >
                      → Réinstaller le programme sur cet ordinateur
                    </a>
                    <a
                      href="/configurer-backend"
                      className="block text-blue-600 hover:underline"
                    >
                      → Reconfigurer la connexion
                    </a>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
