import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getStorageMode } from '../../lib/storageAdapter';
import { getAllEntreprises, getAllExercices } from '../../lib/storageAdapter';
import { checkLicenseWithCache, type LicenseCheckResult } from '../../lib/licenseCheck';
import { exportBeforeLogout } from '../../lib/autoExportFEC';
import { resetDatabase, deleteDB } from '../../lib/indexedDB';
import PWANavbar from '../../components/PWANavbar';

export default function PWADashboard() {
  const router = useRouter();
  const [storageMode, setStorageMode] = useState<'local' | 'cloud' | null>(null);
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseCheck, setLicenseCheck] = useState<LicenseCheckResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Vérifier la licence Firebase
      const firebaseUser = localStorage.getItem('firebase_user');
      if (!firebaseUser) {
        // Si pas connecté, nettoyer toutes les données et rediriger
        console.log('[PWA] Utilisateur non connecté, nettoyage des données');
        await deleteDB();
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
          const name = c.trim().split("=")[0];
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
        });
        router.push('/login-firebase');
        return;
      }

      const userData = JSON.parse(firebaseUser);
      const license = await checkLicenseWithCache(userData.user.uid);
      setLicenseCheck(license);

      // Si la licence n'est pas valide, bloquer l'accès
      if (!license.valid) {
        return; // On affiche le message d'erreur au lieu du dashboard
      }

      const mode = getStorageMode();
      setStorageMode(mode);

      const [entreprisesData, exercicesData] = await Promise.all([
        getAllEntreprises(),
        getAllExercices(),
      ]);

      setEntreprises(entreprisesData);
      setExercices(exercicesData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!confirm('Voulez-vous sauvegarder vos données avant de vous déconnecter ?\n\nUn fichier FEC sera téléchargé automatiquement.')) {
      // Déconnexion sans export
      localStorage.clear();
      sessionStorage.clear();

      // Supprimer IndexedDB
      await deleteDB();

      // Supprimer uniquement les cookies de comptaweb.vercel.app
      document.cookie.split(";").forEach((c) => {
        const name = c.trim().split("=")[0];
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
      });

      router.push('/login-firebase');
      return;
    }

    setLoading(true);
    try {
      // Export automatique FEC + DB
      await exportBeforeLogout();

      // Déconnexion complète
      localStorage.clear();
      sessionStorage.clear();

      // Supprimer IndexedDB
      await deleteDB();

      // Supprimer uniquement les cookies de comptaweb.vercel.app
      document.cookie.split(";").forEach((c) => {
        const name = c.trim().split("=")[0];
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
      });

      alert('✅ Sauvegarde réussie ! Vous pouvez ré-importer ce fichier plus tard.');
      router.push('/login-firebase');
    } catch (error) {
      console.error('Erreur export:', error);
      alert('⚠️ Erreur lors de l\'export. Données non sauvegardées.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Afficher erreur de licence
  if (licenseCheck && !licenseCheck.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-4">{licenseCheck.message}</p>

          {licenseCheck.status === 'suspended' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                Votre licence a été suspendue. Veuillez contacter le support pour réactiver votre compte.
              </p>
            </div>
          )}

          {licenseCheck.status === 'expired' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800">
                Votre licence a expiré le {licenseCheck.expiration_date ? new Date(licenseCheck.expiration_date).toLocaleDateString('fr-FR') : ''}.
                Renouvelez votre abonnement pour continuer à utiliser l'application.
              </p>
            </div>
          )}

          <button
            onClick={() => router.push('/login-firebase')}
            className="w-full mt-4 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PWANavbar />

      {/* Header */}
      <div className="bg-white shadow mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Comptabilité France</h1>
              <p className="text-sm text-gray-500 mt-1">
                Mode {storageMode === 'cloud' ? '☁️ Cloud (IndexedDB)' : '💻 Backend Local'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/pwa/backup')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                💾 Backup
              </button>
              <button
                onClick={() => router.push('/pwa/entreprises')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Nouvelle entreprise
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Entreprises</p>
                <p className="text-2xl font-semibold text-gray-900">{entreprises.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Exercices</p>
                <p className="text-2xl font-semibold text-gray-900">{exercices.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Stockage</p>
                <p className="text-lg font-semibold text-gray-900">
                  {storageMode === 'cloud' ? 'Local' : 'Backend'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty state ou liste entreprises */}
        {entreprises.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Aucune donnée comptable</h3>
            <p className="mt-1 text-sm text-gray-500">
              Commencez par créer une entreprise ou importez une sauvegarde FEC
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => router.push('/pwa/entreprises')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                + Créer une entreprise
              </button>

              <span className="text-gray-400">ou</span>

              <button
                onClick={() => router.push('/pwa/fec')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                📥 Importer une sauvegarde FEC
              </button>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Astuce</h4>
              <p className="text-xs text-blue-800">
                Vos données sont stockées localement dans votre navigateur (IndexedDB).
                Pensez à exporter régulièrement un fichier FEC pour sauvegarder vos données.
              </p>
              <p className="text-xs text-blue-800 mt-2">
                Un export automatique est proposé à chaque déconnexion.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Mes entreprises</h2>
            </div>
            <ul className="divide-y divide-gray-200">
              {entreprises.map((entreprise) => {
                const entrepriseExercices = exercices.filter(
                  (ex) => ex.entrepriseId === entreprise.id
                );
                const premierExercice = entrepriseExercices.sort((a: any, b: any) => b.annee - a.annee)[0];
                return (
                  <li
                    key={entreprise.id}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (premierExercice) {
                        router.push(`/pwa/dashboard/${entreprise.id}?exercice=${premierExercice.id}`);
                      } else {
                        router.push(`/pwa/dashboard/${entreprise.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {entreprise.nom}
                        </h3>
                        {entreprise.siret && (
                          <p className="text-sm text-gray-500">SIRET: {entreprise.siret}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {entrepriseExercices.length} exercice(s)
                          </p>
                        </div>
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/pwa/entreprises')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Entreprises</p>
                <p className="text-xs text-gray-500">Gérer mes entreprises</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/pwa/exercices')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Exercices</p>
                <p className="text-xs text-gray-500">Gérer les exercices</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/pwa/saisie')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Saisie</p>
                <p className="text-xs text-gray-500">Saisir des écritures</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/pwa/balance')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Balance</p>
                <p className="text-xs text-gray-500">Consulter la balance</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/pwa/fec')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">FEC</p>
                <p className="text-xs text-gray-500">Import/Export FEC</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
