import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import { getDB } from '../../lib/indexedDB';
import { createCompte } from '../../lib/storageAdapter';

export default function VerifierComptesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [comptesManquants, setComptesManquants] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    verifierComptes();
  }, []);

  const verifierComptes = async () => {
    setLoading(true);
    try {
      const db = await getDB();

      // 1. Récupérer tous les comptes existants
      const comptesExistants = await db.getAll('comptes');
      const numerosExistants = new Set(comptesExistants.map((c: any) => c.numero));

      // 2. Récupérer tous les comptes utilisés dans les écritures
      const ecritures = await db.getAll('ecritures');
      const comptesUtilises = new Set<string>();

      ecritures.forEach((e: any) => {
        const compte = e.compteNumero || e.compte_numero;
        if (compte) {
          comptesUtilises.add(compte);
        }
      });

      // 3. Trouver les comptes manquants
      const manquants: string[] = [];
      comptesUtilises.forEach(compte => {
        if (!numerosExistants.has(compte)) {
          manquants.push(compte);
        }
      });

      manquants.sort();
      setComptesManquants(manquants);
    } catch (err) {
      console.error('Erreur vérification comptes:', err);
      alert('Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const creerComptesManquants = async () => {
    if (!confirm(`Voulez-vous créer ${comptesManquants.length} compte(s) manquant(s) ?`)) {
      return;
    }

    setCreating(true);
    try {
      for (const numeroCompte of comptesManquants) {
        let type = 'autre';
        if (numeroCompte.startsWith('1')) {
          type = 'capitaux';
        } else if (numeroCompte.startsWith('2')) {
          type = 'immobilisation';
        } else if (numeroCompte.startsWith('3')) {
          type = 'stock';
        } else if (numeroCompte.startsWith('4')) {
          type = 'tiers';
        } else if (numeroCompte.startsWith('5')) {
          type = 'financier';
        } else if (numeroCompte.startsWith('6')) {
          type = 'charge';
        } else if (numeroCompte.startsWith('7')) {
          type = 'produit';
        } else if (numeroCompte.startsWith('8')) {
          type = 'special';
        }

        await createCompte({
          numero: numeroCompte,
          nom: `Compte ${numeroCompte}`,
          type: type,
        });
      }

      alert(`✓ ${comptesManquants.length} compte(s) créé(s)`);
      verifierComptes();
    } catch (err) {
      console.error('Erreur création comptes:', err);
      alert('Erreur lors de la création des comptes');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Vérification en cours...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <PWANavbar />
      <div className="max-w-7xl mx-auto p-8 pt-24">
        <button
          onClick={() => router.push('/pwa/plan-comptable')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au plan comptable
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Vérification des comptes
          </h2>

          {comptesManquants.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800">
                ✓ Tous les comptes utilisés dans les écritures existent dans la table comptes
              </p>
            </div>
          ) : (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                <p className="text-orange-800 font-semibold mb-2">
                  ⚠️ {comptesManquants.length} compte(s) manquant(s) trouvé(s)
                </p>
                <p className="text-orange-700 text-sm">
                  Ces comptes sont utilisés dans les écritures mais n'existent pas dans la table comptes.
                </p>
              </div>

              <div className="mb-6">
                <button
                  onClick={creerComptesManquants}
                  disabled={creating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
                >
                  {creating ? 'Création en cours...' : `✚ Créer ${comptesManquants.length} compte(s)`}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Numéro de compte</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Type (calculé)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {comptesManquants.map((compte, index) => {
                      let type = 'autre';
                      if (compte.startsWith('1')) type = 'capitaux';
                      else if (compte.startsWith('2')) type = 'immobilisation';
                      else if (compte.startsWith('3')) type = 'stock';
                      else if (compte.startsWith('4')) type = 'tiers';
                      else if (compte.startsWith('5')) type = 'financier';
                      else if (compte.startsWith('6')) type = 'charge';
                      else if (compte.startsWith('7')) type = 'produit';
                      else if (compte.startsWith('8')) type = 'special';

                      return (
                        <tr key={compte} className="hover:bg-orange-50">
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-mono font-semibold text-orange-600">
                            {compte}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                              {type}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
