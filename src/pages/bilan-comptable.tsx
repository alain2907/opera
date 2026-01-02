import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { bilanApi, type LigneBilan, type ResultatBilan, type DetailLigneBilan } from '../api/bilan';
import { exercicesApi, type Exercice } from '../api/exercices';
import { useEntreprise } from '../contexts/EntrepriseContext';

export default function BilanComptablePage() {
  const router = useRouter();
  const { entreprise } = useEntreprise();
  const [resultatBilan, setResultatBilan] = useState<ResultatBilan | null>(null);
  const [loading, setLoading] = useState(false);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [detailLigne, setDetailLigne] = useState<DetailLigneBilan | null>(null);
  const [selectedLigne, setSelectedLigne] = useState<string | null>(null);

  // Filtres
  const [exerciceId, setExerciceId] = useState<number | undefined>(undefined);
  const [dateCloture, setDateCloture] = useState('');
  const [comparatif, setComparatif] = useState(false);
  const [exerciceIdN1, setExerciceIdN1] = useState<number | undefined>(undefined);
  const [dateClotureN1, setDateClotureN1] = useState('');

  useEffect(() => {
    if (entreprise) {
      loadExercices(entreprise.id);
    }
  }, [entreprise]);

  const loadExercices = async (entrepriseId: number) => {
    try {
      const data = await exercicesApi.getByEntreprise(entrepriseId);
      setExercices(data.sort((a, b) => b.annee - a.annee));

      // Sélectionner le dernier exercice par défaut
      if (data.length > 0) {
        const dernierExercice = data[0];
        setExerciceId(dernierExercice.id);
        setDateCloture(dernierExercice.date_fin);

        // Si comparatif, sélectionner l'exercice N-1
        if (data.length > 1) {
          const exerciceN1 = data[1];
          setExerciceIdN1(exerciceN1.id);
          setDateClotureN1(exerciceN1.date_fin);
        }
      }
    } catch (err) {
      console.error('Erreur chargement exercices:', err);
    }
  };

  const loadBilan = async () => {
    if (!entreprise || !exerciceId || !dateCloture) {
      alert('Veuillez sélectionner un exercice et une date de clôture');
      return;
    }

    setLoading(true);
    try {
      const data = await bilanApi.getBilan({
        entreprise_id: entreprise.id,
        exercice_id: exerciceId,
        date_cloture: dateCloture,
        comparatif,
        exercice_id_n_1: comparatif ? exerciceIdN1 : undefined,
        date_cloture_n_1: comparatif ? dateClotureN1 : undefined,
      });
      setResultatBilan(data);
    } catch (err) {
      console.error('Erreur chargement bilan:', err);
      alert('Erreur lors du chargement du bilan');
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  const formatMontantEuro = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(montant);
  };

  const handleLigneClick = async (ligne: LigneBilan) => {
    // Tout est cliquable
    if (!entreprise || !exerciceId || !dateCloture) return;

    try {
      setSelectedLigne(ligne.code_poste);
      const detail = await bilanApi.getDetailLigne({
        code_poste: ligne.code_poste,
        entreprise_id: entreprise.id,
        exercice_id: exerciceId,
        date_cloture: dateCloture,
      });
      setDetailLigne(detail);
    } catch (err: any) {
      console.error('Erreur chargement détail:', err);
      alert('Erreur lors du chargement du détail');
    }
  };

  const fermerDetail = () => {
    setSelectedLigne(null);
    setDetailLigne(null);
  };

  const renderLigneBilan = (ligne: LigneBilan) => {
    // Styles selon le niveau - tout est cliquable
    const niveauStyles = {
      1: 'font-bold text-sm bg-blue-700 text-white uppercase hover:bg-blue-600 cursor-pointer',
      2: 'font-semibold text-sm bg-blue-100 text-blue-900 pl-4 hover:bg-blue-50 cursor-pointer',
      3: 'text-sm pl-8 hover:bg-blue-50 cursor-pointer',
    };

    const style = niveauStyles[ligne.niveau as keyof typeof niveauStyles] || '';

    return (
      <tr
        key={`${ligne.section}-${ligne.ordre_affichage}`}
        className={style}
        onClick={() => handleLigneClick(ligne)}
      >
        <td className="px-3 py-2 text-xs text-gray-500">{ligne.code_poste}</td>
        <td className="px-3 py-2">{ligne.ligne_libelle}</td>
        <td className="px-3 py-2 text-right font-mono">
          {ligne.montant_n > 0 ? formatMontant(ligne.montant_n) : '-'}
        </td>
        {comparatif && (
          <td className="px-3 py-2 text-right font-mono text-gray-600">
            {ligne.montant_n_1 !== undefined && ligne.montant_n_1 > 0
              ? formatMontant(ligne.montant_n_1)
              : '-'}
          </td>
        )}
      </tr>
    );
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Bilan Comptable</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 mb-4">
                ⚠️ Veuillez d'abord sélectionner une entreprise
              </p>
              <button
                onClick={() => router.push('/selection-entreprise')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Choisir une entreprise
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => router.push(`/dashboard/${entreprise.id}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Bilan Comptable</h2>
            {entreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              </p>
            )}
          </div>

          {/* Filtres */}
          <div className="mb-6 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exercice (année N)
                </label>
                <select
                  value={exerciceId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setExerciceId(id);
                    const ex = exercices.find((ex) => ex.id === id);
                    if (ex) setDateCloture(ex.date_fin);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un exercice</option>
                  {exercices.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      Exercice {ex.annee} ({ex.date_debut} au {ex.date_fin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de clôture
                </label>
                <input
                  type="date"
                  value={dateCloture}
                  onChange={(e) => setDateCloture(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comparatif}
                  onChange={(e) => setComparatif(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Afficher le comparatif avec l'exercice précédent (N-1)
                </span>
              </label>
            </div>

            {comparatif && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exercice N-1
                  </label>
                  <select
                    value={exerciceIdN1 || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setExerciceIdN1(id);
                      const ex = exercices.find((ex) => ex.id === id);
                      if (ex) setDateClotureN1(ex.date_fin);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un exercice</option>
                    {exercices.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        Exercice {ex.annee}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de clôture N-1
                  </label>
                  <input
                    type="date"
                    value={dateClotureN1}
                    onChange={(e) => setDateClotureN1(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={loadBilan}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
              >
                {loading ? 'Calcul en cours...' : 'Générer le bilan'}
              </button>
            </div>
          </div>

          {/* Affichage du bilan */}
          {resultatBilan && (
            <div>
              {/* Stats */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-green-600 mb-1">Total ACTIF</p>
                  <p className="text-xl font-bold text-green-900">
                    {formatMontant(resultatBilan.total_actif)} €
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-orange-600 mb-1">Total PASSIF</p>
                  <p className="text-xl font-bold text-orange-900">
                    {formatMontant(resultatBilan.total_passif)} €
                  </p>
                </div>
                <div
                  className={`border rounded-lg px-4 py-3 ${
                    resultatBilan.equilibre
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <p
                    className={`text-xs mb-1 ${
                      resultatBilan.equilibre ? 'text-blue-600' : 'text-red-600'
                    }`}
                  >
                    Équilibre
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      resultatBilan.equilibre ? 'text-blue-900' : 'text-red-900'
                    }`}
                  >
                    {resultatBilan.equilibre ? '✓ OK' : '✗ Déséquilibré'}
                  </p>
                </div>
              </div>

              {/* Tableau 2 colonnes : ACTIF | PASSIF */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ACTIF */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3">
                    <h3 className="text-lg font-bold">ACTIF</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 text-xs">
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Libellé</th>
                          <th className="px-3 py-2 text-right">Montant N</th>
                          {comparatif && <th className="px-3 py-2 text-right">Montant N-1</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {resultatBilan.actif.map(renderLigneBilan)}
                        {/* Total ACTIF */}
                        <tr className="bg-green-600 text-white font-bold">
                          <td className="px-3 py-3" colSpan={2}>
                            TOTAL ACTIF
                          </td>
                          <td className="px-3 py-3 text-right font-mono">
                            {formatMontant(resultatBilan.total_actif)}
                          </td>
                          {comparatif && <td className="px-3 py-3"></td>}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PASSIF */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-3">
                    <h3 className="text-lg font-bold">PASSIF</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 text-xs">
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Libellé</th>
                          <th className="px-3 py-2 text-right">Montant N</th>
                          {comparatif && <th className="px-3 py-2 text-right">Montant N-1</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {resultatBilan.passif.map(renderLigneBilan)}
                        {/* Total PASSIF */}
                        <tr className="bg-orange-600 text-white font-bold">
                          <td className="px-3 py-3" colSpan={2}>
                            TOTAL PASSIF
                          </td>
                          <td className="px-3 py-3 text-right font-mono">
                            {formatMontant(resultatBilan.total_passif)}
                          </td>
                          {comparatif && <td className="px-3 py-3"></td>}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Boutons d'export */}
              <div className="mt-6 flex gap-4">
                <button
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                  onClick={() => alert('Export PDF en développement')}
                >
                  📄 Exporter en PDF
                </button>
                <button
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  onClick={() => alert('Export Excel en développement')}
                >
                  📊 Exporter en Excel
                </button>
              </div>
            </div>
          )}

          {!loading && !resultatBilan && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Cliquez sur "Générer le bilan" pour afficher les résultats
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal détail comptes */}
      {detailLigne && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{detailLigne.ligne_libelle}</h3>
                <p className="text-sm opacity-90">Code: {detailLigne.code_poste}</p>
              </div>
              <button
                onClick={fermerDetail}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">N° Compte</th>
                    <th className="text-left p-3 font-semibold">Libellé</th>
                    <th className="text-right p-3 font-semibold">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLigne.comptes.map((compte) => (
                    <tr key={compte.numero_compte} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono">{compte.numero_compte}</td>
                      <td className="p-3">{compte.libelle}</td>
                      <td className="p-3 text-right font-mono">{formatMontantEuro(compte.solde)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">Total:</td>
                    <td className="p-3 text-right font-mono">{formatMontantEuro(detailLigne.total)}</td>
                  </tr>
                </tfoot>
              </table>

              {detailLigne.comptes.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Aucun compte dans le plan comptable pour cette ligne
                  </p>
                  <button
                    onClick={() => router.push('/plan-comptable')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Ajouter des comptes au plan comptable
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
