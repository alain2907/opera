import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { localApiCall } from '../lib/dualApiClient';

type ApiRow = {
  account: string;
  label: string;
  debitCum: number;
  creditCum: number;
  balance: number;
  sense: 'Débiteur' | 'Créditeur' | 'Nul';
};

type ApiResp = {
  period: string;
  rows: ApiRow[];
  totals: { debitCum: number; creditCum: number; diff: number };
};

type Mouvement = {
  date: string;
  journal: string;
  piece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
};

type MouvementsResp = {
  compte: string;
  label: string;
  mouvements: Mouvement[];
  solde: number;
};

export default function BalanceProgressivePage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [compteDebut, setCompteDebut] = useState<string>('');
  const [compteFin, setCompteFin] = useState<string>('');
  const [classe, setClasse] = useState<string>('');
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedCompte, setSelectedCompte] = useState<string | null>(null);
  const [mouvements, setMouvements] = useState<MouvementsResp | null>(null);
  const [loadingMouvements, setLoadingMouvements] = useState(false);

  async function load(p: string, debut?: string, fin?: string, cl?: string) {
    if (!entreprise || !exercice) {
      setErr('Aucune entreprise ou exercice sélectionné');
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({
        to: p,
        entrepriseId: entreprise.id.toString(),
        exerciceId: exercice.id.toString(),
      });

      if (debut) params.append('compteDebut', debut);
      if (fin) params.append('compteFin', fin);
      if (cl) params.append('classe', cl);

      const res = await localApiCall(
        `/etats/balance-progressive?${params.toString()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ApiResp;
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadMouvements(compte: string) {
    if (!entreprise || !exercice) return;

    setLoadingMouvements(true);
    setSelectedCompte(compte);
    try {
      const params = new URLSearchParams({
        compte,
        to: period,
        exerciceId: exercice.id.toString(),
      });

      const res = await localApiCall(
        `/etats/mouvements-compte?${params.toString()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as MouvementsResp;
      setMouvements(json);
    } catch (e: any) {
      alert(`Erreur: ${e?.message ?? 'Impossible de charger les mouvements'}`);
      setSelectedCompte(null);
    } finally {
      setLoadingMouvements(false);
    }
  }

  async function exportBalanceCSV() {
    if (!data || !entreprise || !exercice) return;

    const csvRows: string[] = [];

    // En-tête
    csvRows.push('Compte;Intitulé;Débits cumulés;Crédits cumulés;Solde;Sens');

    // Lignes de données
    data.rows.forEach((r) => {
      csvRows.push(
        `${r.account};${r.label};${r.debitCum.toFixed(2)};${r.creditCum.toFixed(2)};${r.balance.toFixed(2)};${r.sense}`
      );
    });

    // Ligne de totaux
    csvRows.push(
      `TOTAUX;;${data.totals.debitCum.toFixed(2)};${data.totals.creditCum.toFixed(2)};${(data.totals.debitCum - data.totals.creditCum).toFixed(2)};`
    );

    const csvContent = csvRows.join('\n');
    const filename = `balance_progressive_${entreprise.raison_sociale.replace(/\s+/g, '_')}_${data.period}.csv`;

    try {
      const res = await fetch('http://localhost:3001/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: csvContent }),
      });

      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      alert(`Fichier exporté : ${result.filename}\nDans le dossier : exports/`);
    } catch (e: any) {
      alert(`Erreur d'export : ${e?.message ?? 'Erreur inconnue'}`);
    }
  }

  async function exportMouvementsCSV() {
    if (!mouvements || !entreprise || !exercice) return;

    const csvRows: string[] = [];

    // En-tête
    csvRows.push('Date;Journal;Pièce;Libellé;Débit;Crédit;Solde');

    // Lignes de données
    mouvements.mouvements.forEach((m) => {
      csvRows.push(
        `${new Date(m.date).toLocaleDateString('fr-FR')};${m.journal};${m.piece};${m.libelle.replace(/;/g, ',')};${m.debit.toFixed(2)};${m.credit.toFixed(2)};${m.solde.toFixed(2)}`
      );
    });

    // Ligne de totaux
    csvRows.push(`SOLDE FINAL;;;;;${mouvements.solde.toFixed(2)}`);

    const csvContent = csvRows.join('\n');
    const filename = `mouvements_compte_${mouvements.compte}_${period}.csv`;

    try {
      const res = await fetch('http://localhost:3001/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: csvContent }),
      });

      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      alert(`Fichier exporté : ${result.filename}\nDans le dossier : exports/`);
    } catch (e: any) {
      alert(`Erreur d'export : ${e?.message ?? 'Erreur inconnue'}`);
    }
  }

  useEffect(() => {
    if (entreprise && exercice) {
      load(period, compteDebut, compteFin, classe);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entreprise, exercice]);

  if (!entreprise || !exercice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopMenu />
        <div className="p-8 text-center">
          <p className="text-gray-600">Veuillez sélectionner une entreprise et un exercice</p>
          <button
            onClick={() => router.push('/selection-entreprise')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sélectionner une entreprise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu />
      <main className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Balance progressive</h1>

        <form
          className="bg-white p-6 rounded-lg shadow mb-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            load(period, compteDebut, compteFin, classe);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Période jusqu'à :
              </label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classe (1 à 9) :
              </label>
              <select
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes les classes</option>
                <option value="1">Classe 1 - Capitaux</option>
                <option value="2">Classe 2 - Immobilisations</option>
                <option value="3">Classe 3 - Stocks</option>
                <option value="4">Classe 4 - Tiers</option>
                <option value="5">Classe 5 - Financiers</option>
                <option value="6">Classe 6 - Charges</option>
                <option value="7">Classe 7 - Produits</option>
                <option value="8">Classe 8 - Spéciaux</option>
                <option value="9">Classe 9 - Analytique</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compte début :
              </label>
              <input
                type="text"
                value={compteDebut}
                onChange={(e) => setCompteDebut(e.target.value)}
                placeholder="Ex: 401000"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compte fin :
              </label>
              <input
                type="text"
                value={compteFin}
                onChange={(e) => setCompteFin(e.target.value)}
                placeholder="Ex: 409999"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              disabled={loading}
            >
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
            <button
              type="button"
              onClick={() => {
                setClasse('');
                setCompteDebut('');
                setCompteFin('');
                load(period, '', '', '');
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
            >
              Réinitialiser filtres
            </button>
            {data && data.rows.length > 0 && (
              <button
                type="button"
                onClick={exportBalanceCSV}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
              >
                📥 Exporter CSV
              </button>
            )}
          </div>
        </form>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            Erreur : {err}
          </div>
        )}

        {data && (
          <>
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <p className="text-sm text-gray-600">
                Cumul depuis début d'exercice jusqu'à <strong>{data.period}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Entreprise : {entreprise.raison_sociale} • Exercice {new Date(exercice.date_debut).getFullYear()}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Compte
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Intitulé
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Débits cumulés
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Crédits cumulés
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solde
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sens
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.rows.map((r) => (
                      <tr
                        key={r.account}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => loadMouvements(r.account)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-blue-600 hover:text-blue-800 font-medium">
                          {r.account}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.label}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          {r.debitCum.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                          {r.creditCum.toFixed(2)} €
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                          r.balance > 0 ? 'text-green-600' : r.balance < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {r.balance.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            r.sense === 'Débiteur' ? 'bg-green-100 text-green-800' :
                            r.sense === 'Créditeur' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {r.sense}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900" colSpan={2}>
                        Totaux
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {data.totals.debitCum.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {data.totals.creditCum.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {(data.totals.debitCum - data.totals.creditCum).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {data.rows.length === 0 && (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                Aucune écriture trouvée pour cette période
              </div>
            )}
          </>
        )}

        {/* Modal des mouvements */}
        {selectedCompte && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setSelectedCompte(null);
              setMouvements(null);
            }}
          >
            <div
              className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* En-tête du modal */}
              <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">
                    Mouvements du compte {selectedCompte}
                  </h2>
                  {mouvements && (
                    <p className="text-sm text-blue-100 mt-1">
                      {mouvements.label} • Solde: {mouvements.solde.toFixed(2)} €
                    </p>
                  )}
                </div>
                <div className="flex gap-3 items-center">
                  {mouvements && mouvements.mouvements.length > 0 && (
                    <button
                      onClick={exportMouvementsCSV}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors text-sm font-medium"
                    >
                      📥 Exporter CSV
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCompte(null);
                      setMouvements(null);
                    }}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Contenu du modal */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                {loadingMouvements && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Chargement des mouvements...</p>
                  </div>
                )}

                {mouvements && !loadingMouvements && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Journal
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Pièce
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Libellé
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Débit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Crédit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Solde
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {mouvements.mouvements.map((m, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {new Date(m.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                              {m.journal}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {m.piece}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate">
                              {m.libelle}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {m.debit > 0 ? `${m.debit.toFixed(2)} €` : ''}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {m.credit > 0 ? `${m.credit.toFixed(2)} €` : ''}
                            </td>
                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                              m.solde > 0 ? 'text-green-600' : m.solde < 0 ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {m.solde.toFixed(2)} €
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-900">
                            Solde final
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${
                            mouvements.solde > 0 ? 'text-green-600' : mouvements.solde < 0 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {mouvements.solde.toFixed(2)} €
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {mouvements.mouvements.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Aucun mouvement pour ce compte
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
