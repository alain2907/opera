import { useEffect, useState } from 'react';
import axios from 'axios';

interface LogsData {
  install: string;
  backend: string;
  backendError: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await axios.get('http://localhost:3001/logs');
        setLogs(response.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Impossible de se connecter au backend');
        setLoading(false);
      }
    };

    fetchLogs();
    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-xl">Chargement des logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-2">❌ Erreur de connexion</h2>
            <p className="text-red-200 mb-4">{error}</p>
            <div className="bg-gray-800 p-4 rounded">
              <p className="font-mono text-sm mb-2">Le backend ne répond pas sur http://localhost:3001</p>
              <p className="text-gray-400 text-sm">Vérifiez que l'installation s'est bien déroulée :</p>
              <ol className="list-decimal list-inside text-gray-400 text-sm mt-2 space-y-1">
                <li>Ouvrez le Terminal (Spotlight → chercher "Terminal")</li>
                <li>Collez cette commande : <code className="bg-gray-700 px-2 py-1 rounded">launchctl list | grep comptabilite</code></li>
                <li>Si rien ne s'affiche, le backend n'est pas lancé</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📋 Logs du Backend</h1>
          <p className="text-gray-400">Dernière mise à jour : {new Date().toLocaleString('fr-FR')}</p>
        </div>

        {/* Logs d'installation */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-3 text-green-400">📦 Log d'installation</h2>
            <pre className="bg-black p-4 rounded overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">
              {logs?.install || 'Aucun log d\'installation trouvé'}
            </pre>
          </div>
        </div>

        {/* Logs d'erreur (en rouge si non vide) */}
        {logs?.backendError && logs.backendError.trim() && (
          <div className="mb-6">
            <div className="bg-red-900 border border-red-700 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-3 text-red-400">🚨 Erreurs du backend</h2>
              <pre className="bg-black p-4 rounded overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap text-red-300">
                {logs.backendError}
              </pre>
            </div>
          </div>
        )}

        {/* Logs normaux du backend */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-3 text-blue-400">💻 Logs du backend</h2>
            <pre className="bg-black p-4 rounded overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">
              {logs?.backend || 'Aucun log backend trouvé'}
            </pre>
          </div>
        </div>

        {/* Bouton de retour */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
