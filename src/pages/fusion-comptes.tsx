import { useState, useEffect } from 'react';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { comptesApi, type Compte } from '../api/comptes';
import TopMenu from '../components/TopMenu';

export default function FusionComptesPage() {
  const { entreprise } = useEntreprise();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sélection
  const [comptesSource, setComptesSource] = useState<string[]>([]);
  const [compteDestination, setCompteDestination] = useState<string>('');
  const [searchSource, setSearchSource] = useState<string>('');
  const [searchDestination, setSearchDestination] = useState<string>('');

  useEffect(() => {
    if (entreprise) {
      loadComptes();
    }
  }, [entreprise]);

  const loadComptes = async () => {
    if (!entreprise) return;
    try {
      const data = await comptesApi.getAll(entreprise.id);
      setComptes(data.sort((a, b) => a.numero_compte.localeCompare(b.numero_compte)));
    } catch (err: any) {
      console.error('Erreur chargement comptes:', err);
      setError('Erreur lors du chargement des comptes');
    }
  };

  const toggleCompteSource = (numeroCompte: string) => {
    if (comptesSource.includes(numeroCompte)) {
      setComptesSource(comptesSource.filter(c => c !== numeroCompte));
    } else {
      setComptesSource([...comptesSource, numeroCompte]);
    }
  };

  const handleFusion = async () => {
    if (!entreprise) return;

    if (comptesSource.length === 0) {
      setError('Veuillez sélectionner au moins un compte source');
      return;
    }

    if (!compteDestination) {
      setError('Veuillez sélectionner un compte de destination');
      return;
    }

    if (comptesSource.includes(compteDestination)) {
      setError('Le compte de destination ne peut pas être dans la liste des comptes sources');
      return;
    }

    const confirmMsg = `Voulez-vous vraiment fusionner ${comptesSource.length} compte(s) vers le compte ${compteDestination} ?\n\nCette opération va :\n- Transférer toutes les écritures des comptes sources vers le compte destination\n- Supprimer les comptes sources\n\nCette action est IRRÉVERSIBLE.`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await comptesApi.fusionner(entreprise.id, comptesSource, compteDestination);
      setSuccess(`Fusion réussie : ${result.nb_lignes_transferees} ligne(s) transférée(s), ${result.nb_comptes_supprimes} compte(s) supprimé(s)`);

      // Réinitialiser
      setComptesSource([]);
      setCompteDestination('');
      await loadComptes();
    } catch (err: any) {
      console.error('Erreur fusion:', err);
      setError(err.message || 'Erreur lors de la fusion des comptes');
    } finally {
      setLoading(false);
    }
  };

  const filteredComptesSource = comptes.filter(c =>
    !compteDestination || c.numero_compte !== compteDestination
  ).filter(c =>
    !searchSource ||
    c.numero_compte.includes(searchSource) ||
    c.libelle.toLowerCase().includes(searchSource.toLowerCase())
  );

  const filteredComptesDestination = comptes.filter(c =>
    !comptesSource.includes(c.numero_compte)
  ).filter(c =>
    !searchDestination ||
    c.numero_compte.includes(searchDestination) ||
    c.libelle.toLowerCase().includes(searchDestination.toLowerCase())
  );

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Aucune entreprise sélectionnée
            </h3>
            <p className="text-gray-500">
              Veuillez sélectionner une entreprise pour accéder à la fusion de comptes
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fusion de comptes</h2>
          <p className="text-gray-600 mb-6">
            Transférer les écritures de plusieurs comptes vers un compte unique
          </p>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              {success}
            </div>
          )}

          {/* Avertissement */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">Attention</h3>
                <p className="text-sm text-yellow-700">
                  La fusion de comptes est une opération irréversible. Toutes les écritures des comptes sources seront transférées vers le compte de destination, puis les comptes sources seront supprimés.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comptes sources */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Comptes sources ({comptesSource.length} sélectionné{comptesSource.length > 1 ? 's' : ''})
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Sélectionnez les comptes à fusionner
              </p>

              <input
                type="text"
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value)}
                placeholder="Rechercher un compte..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
              />

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                {filteredComptesSource.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Aucun compte trouvé
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredComptesSource.map((compte) => (
                      <label
                        key={compte.id}
                        className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={comptesSource.includes(compte.numero_compte)}
                          onChange={() => toggleCompteSource(compte.numero_compte)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-mono font-semibold text-blue-600 text-sm">
                            {compte.numero_compte}
                          </div>
                          <div className="text-xs text-gray-600">
                            {compte.libelle}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Compte destination */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Compte de destination
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Sélectionnez le compte qui recevra toutes les écritures
              </p>

              <input
                type="text"
                value={searchDestination}
                onChange={(e) => setSearchDestination(e.target.value)}
                placeholder="Rechercher un compte..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
              />

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                {filteredComptesDestination.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Aucun compte trouvé
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredComptesDestination.map((compte) => (
                      <label
                        key={compte.id}
                        className="flex items-center gap-3 p-3 hover:bg-green-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="compte_destination"
                          checked={compteDestination === compte.numero_compte}
                          onChange={() => setCompteDestination(compte.numero_compte)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-mono font-semibold text-green-600 text-sm">
                            {compte.numero_compte}
                          </div>
                          <div className="text-xs text-gray-600">
                            {compte.libelle}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Récapitulatif */}
          {comptesSource.length > 0 && compteDestination && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Récapitulatif de la fusion</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-blue-700">Comptes sources :</span>
                  <div className="ml-4 mt-1 space-y-1">
                    {comptesSource.map(num => {
                      const compte = comptes.find(c => c.numero_compte === num);
                      return (
                        <div key={num} className="font-mono text-blue-600">
                          {num} - {compte?.libelle}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700">Compte de destination :</span>
                  <div className="ml-4 mt-1 font-mono text-green-600">
                    {compteDestination} - {comptes.find(c => c.numero_compte === compteDestination)?.libelle}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de fusion */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleFusion}
              disabled={loading || comptesSource.length === 0 || !compteDestination}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Fusion en cours...' : 'Fusionner les comptes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
