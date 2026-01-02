import { useState, useEffect } from 'react';
import { useEntreprise } from '../contexts/EntrepriseContext';
import TopMenu from '../components/TopMenu';

interface LigneTVA {
  taux: number;
  base_ht: number;
  montant_tva: number;
}

interface DeclarationTVA {
  periode: string;
  tva_collectee: LigneTVA[];
  tva_deductible: LigneTVA[];
  total_tva_collectee: number;
  total_tva_deductible: number;
  tva_a_payer: number;
  credit_tva: number;
}

export default function DeclarationTVAPage() {
  const { entreprise, exercice } = useEntreprise();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declaration, setDeclaration] = useState<DeclarationTVA | null>(null);

  // Période sélectionnée
  const [mois, setMois] = useState<number>(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (exercice) {
      const dateDebut = new Date(exercice.date_debut);
      setAnnee(dateDebut.getFullYear());
      setMois(dateDebut.getMonth() + 1);
    }
  }, [exercice]);

  const calculerDeclaration = async () => {
    if (!entreprise || !exercice) return;

    setLoading(true);
    setError(null);
    setDeclaration(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/tva/declaration?` +
        `entreprise_id=${entreprise.id}&` +
        `exercice_id=${exercice.id}&` +
        `mois=${mois}&` +
        `annee=${annee}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors du calcul de la déclaration');
      }

      const data = await response.json();
      setDeclaration(data);
    } catch (err: any) {
      console.error('Erreur calcul déclaration:', err);
      setError(err.message || 'Erreur lors du calcul de la déclaration');
    } finally {
      setLoading(false);
    }
  };

  const genererEcritures = async () => {
    if (!entreprise || !exercice || !declaration) return;

    if (!confirm('Générer les écritures de déclaration de TVA ?\n\nCela va créer une écriture comptable pour la TVA à payer ou le crédit de TVA.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/tva/generer-ecritures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entreprise_id: entreprise.id,
          exercice_id: exercice.id,
          mois,
          annee,
          declaration,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la génération des écritures');
      }

      alert('Écritures générées avec succès');
    } catch (err: any) {
      console.error('Erreur génération écritures:', err);
      setError(err.message || 'Erreur lors de la génération des écritures');
    } finally {
      setLoading(false);
    }
  };

  const exporterCSV = () => {
    if (!declaration) return;

    const lines: string[] = [];
    lines.push('Déclaration de TVA');
    lines.push(`Période;${getNomMois(mois)} ${annee}`);
    lines.push('');

    lines.push('TVA COLLECTÉE');
    lines.push('Taux;Base HT;Montant TVA');
    declaration.tva_collectee.forEach(ligne => {
      lines.push(`${ligne.taux}%;${ligne.base_ht.toFixed(2)};${ligne.montant_tva.toFixed(2)}`);
    });
    lines.push(`TOTAL;;${declaration.total_tva_collectee.toFixed(2)}`);
    lines.push('');

    lines.push('TVA DÉDUCTIBLE');
    lines.push('Taux;Base HT;Montant TVA');
    declaration.tva_deductible.forEach(ligne => {
      lines.push(`${ligne.taux}%;${ligne.base_ht.toFixed(2)};${ligne.montant_tva.toFixed(2)}`);
    });
    lines.push(`TOTAL;;${declaration.total_tva_deductible.toFixed(2)}`);
    lines.push('');

    lines.push('SOLDE');
    if (declaration.tva_a_payer > 0) {
      lines.push(`TVA à payer;;${declaration.tva_a_payer.toFixed(2)}`);
    } else if (declaration.credit_tva > 0) {
      lines.push(`Crédit de TVA;;${declaration.credit_tva.toFixed(2)}`);
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `declaration_tva_${annee}_${String(mois).padStart(2, '0')}.csv`;
    link.click();
  };

  const getNomMois = (m: number): string => {
    const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return mois[m - 1] || '';
  };

  if (!entreprise || !exercice) {
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
              Veuillez sélectionner une entreprise pour accéder à la déclaration de TVA
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Déclaration de TVA</h2>
          <p className="text-gray-600 mb-6">
            Calculer la TVA collectée et déductible pour une période donnée
          </p>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {/* Sélection période */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mois
              </label>
              <select
                value={mois}
                onChange={(e) => setMois(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value={1}>Janvier</option>
                <option value={2}>Février</option>
                <option value={3}>Mars</option>
                <option value={4}>Avril</option>
                <option value={5}>Mai</option>
                <option value={6}>Juin</option>
                <option value={7}>Juillet</option>
                <option value={8}>Août</option>
                <option value={9}>Septembre</option>
                <option value={10}>Octobre</option>
                <option value={11}>Novembre</option>
                <option value={12}>Décembre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Année
              </label>
              <input
                type="number"
                value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <button
              onClick={calculerDeclaration}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Calcul...' : 'Calculer'}
            </button>
          </div>

          {/* Déclaration */}
          {declaration && (
            <div className="space-y-6">
              {/* En-tête */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4">
                <h3 className="text-xl font-bold">
                  Déclaration de TVA - {getNomMois(mois)} {annee}
                </h3>
                <p className="text-sm text-blue-100">
                  {entreprise.raison_sociale}
                </p>
              </div>

              {/* TVA Collectée */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-green-50 border-b border-green-200 p-4">
                  <h4 className="text-lg font-semibold text-green-800">TVA Collectée (Ventes)</h4>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Taux</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Base HT</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Montant TVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {declaration.tva_collectee.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-center text-gray-500 text-sm">
                          Aucune TVA collectée
                        </td>
                      </tr>
                    ) : (
                      declaration.tva_collectee.map((ligne, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-semibold text-green-600">{ligne.taux}%</td>
                          <td className="px-4 py-3 text-right font-mono">{ligne.base_ht.toFixed(2)} €</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-green-600">
                            {ligne.montant_tva.toFixed(2)} €
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-green-50 border-t-2 border-green-300">
                    <tr>
                      <td className="px-4 py-3 font-bold text-green-800">TOTAL</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-green-800 text-lg">
                        {declaration.total_tva_collectee.toFixed(2)} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* TVA Déductible */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-orange-50 border-b border-orange-200 p-4">
                  <h4 className="text-lg font-semibold text-orange-800">TVA Déductible (Achats)</h4>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Taux</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Base HT</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Montant TVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {declaration.tva_deductible.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-center text-gray-500 text-sm">
                          Aucune TVA déductible
                        </td>
                      </tr>
                    ) : (
                      declaration.tva_deductible.map((ligne, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-semibold text-orange-600">{ligne.taux}%</td>
                          <td className="px-4 py-3 text-right font-mono">{ligne.base_ht.toFixed(2)} €</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-orange-600">
                            {ligne.montant_tva.toFixed(2)} €
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-orange-50 border-t-2 border-orange-300">
                    <tr>
                      <td className="px-4 py-3 font-bold text-orange-800">TOTAL</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-orange-800 text-lg">
                        {declaration.total_tva_deductible.toFixed(2)} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Solde */}
              <div className={`border-2 rounded-lg overflow-hidden ${
                declaration.tva_a_payer > 0 ? 'border-red-300' : 'border-blue-300'
              }`}>
                <div className={`p-6 ${
                  declaration.tva_a_payer > 0 ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className={`text-xl font-bold mb-2 ${
                        declaration.tva_a_payer > 0 ? 'text-red-800' : 'text-blue-800'
                      }`}>
                        {declaration.tva_a_payer > 0 ? 'TVA à payer' : 'Crédit de TVA'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        TVA collectée : {declaration.total_tva_collectee.toFixed(2)} €
                        <br />
                        TVA déductible : {declaration.total_tva_deductible.toFixed(2)} €
                      </p>
                    </div>
                    <div className={`text-4xl font-bold font-mono ${
                      declaration.tva_a_payer > 0 ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {declaration.tva_a_payer > 0
                        ? declaration.tva_a_payer.toFixed(2)
                        : declaration.credit_tva.toFixed(2)
                      } €
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={exporterCSV}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exporter CSV
                </button>
                <button
                  onClick={genererEcritures}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Générer les écritures
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
