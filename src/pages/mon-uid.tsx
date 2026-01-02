import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';

export default function MonUIDPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push('/login-firebase');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const copyToClipboard = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Mon identifiant Firebase</h1>
          <p className="text-gray-600 mb-8">
            Utilisez cet identifiant pour configurer votre backend local
          </p>

          {/* User Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Email</div>
            <div className="font-medium text-gray-800">{user?.email}</div>
          </div>

          {/* Firebase UID */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Firebase UID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={user?.uid || ''}
                readOnly
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              📋 Configuration du backend local
            </h2>
            <ol className="space-y-3 text-sm text-gray-700">
              <li>
                <strong>1.</strong> Copiez votre Firebase UID ci-dessus
              </li>
              <li>
                <strong>2.</strong> Ouvrez un terminal et naviguez vers le dossier du projet
              </li>
              <li>
                <strong>3.</strong> Exécutez le script de configuration:
                <div className="mt-2 p-3 bg-gray-800 text-white rounded font-mono text-xs">
                  ./setup-user.sh
                </div>
              </li>
              <li>
                <strong>4.</strong> Collez votre Firebase UID quand demandé
              </li>
              <li>
                <strong>5.</strong> Démarrez le backend local:
                <div className="mt-2 p-3 bg-gray-800 text-white rounded font-mono text-xs">
                  cd backend && npm run start:dev
                </div>
              </li>
            </ol>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => router.push('/dashboard-firebase')}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Retour au dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
