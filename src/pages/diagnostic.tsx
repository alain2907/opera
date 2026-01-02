import { useState } from 'react';
import { useRouter } from 'next/router';

export default function DiagnosticPage() {
  const router = useRouter();
  const [installLog, setInstallLog] = useState<string>('');
  const [backendLog, setBackendLog] = useState<string>('');
  const [backendErrorLog, setBackendErrorLog] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<string>('');
  const [launchctlStatus, setLaunchctlStatus] = useState<string>('');
  const [nodeVersion, setNodeVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);

    try {
      // 1. Vérifier si le backend local répond
      try {
        const response = await fetch('http://localhost:3001/api', {
          signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
          setBackendStatus('✅ Backend local accessible sur http://localhost:3001');
        } else {
          setBackendStatus('❌ Backend répond mais avec erreur HTTP ' + response.status);
        }
      } catch (error) {
        setBackendStatus('❌ Backend local ne répond pas sur http://localhost:3001');
      }

      // 2. Appeler une API locale qui lit les fichiers
      const diagResponse = await fetch('http://localhost:3001/api/diagnostic', {
        signal: AbortSignal.timeout(5000),
      });

      if (diagResponse.ok) {
        const data = await diagResponse.json();
        setInstallLog(data.installLog || 'Fichier non trouvé');
        setBackendLog(data.backendLog || 'Fichier non trouvé');
        setBackendErrorLog(data.backendErrorLog || 'Fichier non trouvé');
        setLaunchctlStatus(data.launchctlStatus || 'Non disponible');
        setNodeVersion(data.nodeVersion || 'Non disponible');
      } else {
        setInstallLog('❌ Impossible de récupérer les logs (backend non accessible)');
      }
    } catch (error) {
      setInstallLog('❌ Erreur : Le backend local ne répond pas. Il n\'est probablement pas installé ou démarré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🔧 Diagnostic d'installation
            </h1>
            <p className="text-gray-600 text-lg">
              Vérifiez l'état de votre installation
            </p>
          </div>

          {/* Instructions simples */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3">📋 Instructions</h2>
            <ol className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>Cliquez sur le bouton "Lancer le diagnostic" ci-dessous</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>Attendez quelques secondes</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>Faites une capture d'écran de cette page</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-600">4.</span>
                <span>Envoyez la capture d'écran à votre contact technique</span>
              </li>
            </ol>
          </div>

          {/* Bouton de diagnostic */}
          <div className="text-center mb-8">
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-8 rounded-lg transition-all shadow-lg text-lg"
            >
              {loading ? '⏳ Diagnostic en cours...' : '🔍 Lancer le diagnostic'}
            </button>
          </div>

          {/* Résultats */}
          {(backendStatus || installLog) && (
            <div className="space-y-6">
              {/* Statut du backend */}
              {backendStatus && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">🌐 Statut du backend</h3>
                  <p className={`font-mono text-sm ${backendStatus.startsWith('✅') ? 'text-green-700' : 'text-red-700'}`}>
                    {backendStatus}
                  </p>
                </div>
              )}

              {/* Version Node.js */}
              {nodeVersion && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">📦 Version Node.js</h3>
                  <p className="font-mono text-sm text-gray-700">{nodeVersion}</p>
                </div>
              )}

              {/* Statut LaunchAgent */}
              {launchctlStatus && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">⚙️ Service de démarrage automatique</h3>
                  <pre className="font-mono text-xs text-gray-700 whitespace-pre-wrap">{launchctlStatus}</pre>
                </div>
              )}

              {/* Log d'installation */}
              {installLog && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">📄 Log d'installation</h3>
                  <pre className="font-mono text-xs text-gray-700 whitespace-pre-wrap max-h-96 overflow-auto bg-white p-3 rounded border">
                    {installLog}
                  </pre>
                </div>
              )}

              {/* Log du backend */}
              {backendLog && backendLog !== 'Fichier non trouvé' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">📝 Log du backend (dernières lignes)</h3>
                  <pre className="font-mono text-xs text-gray-700 whitespace-pre-wrap max-h-96 overflow-auto bg-white p-3 rounded border">
                    {backendLog}
                  </pre>
                </div>
              )}

              {/* Log d'erreurs */}
              {backendErrorLog && backendErrorLog !== 'Fichier non trouvé' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">⚠️ Log d'erreurs du backend</h3>
                  <pre className="font-mono text-xs text-red-700 whitespace-pre-wrap max-h-96 overflow-auto bg-white p-3 rounded border">
                    {backendErrorLog}
                  </pre>
                </div>
              )}
            </div>
          )}

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
