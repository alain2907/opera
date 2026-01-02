import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import ModalGrandLivreCompte from '../components/ModalGrandLivreCompte';
import { balanceProgressiveApi, type BalanceProgressiveResult } from '../api/balance-progressive';
import { exercicesApi, type Exercice } from '../api/exercices';
import { useEntreprise } from '../contexts/EntrepriseContext';

export default function BalanceProgressiveComptablePage() {
  const router = useRouter();
  const { entreprise } = useEntreprise();
  const [balanceData, setBalanceData] = useState<BalanceProgressiveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [compteSelectionne, setCompteSelectionne] = useState<{ numero: string; libelle: string } | null>(null);

  // Filtres
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [exerciceId, setExerciceId] = useState<number | undefined>(undefined);
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([]);
  const [compteDebut, setCompteDebut] = useState('');
  const [compteFin, setCompteFin] = useState('');
  const [inclureComptesVides, setInclureComptesVides] = useState(false);

  useEffect(() => {
    if (entreprise) {
      loadExercices(entreprise.id);
    }
  }, [entreprise]);

  const loadExercices = async (entrepriseId: number) => {
    try {
      const data = await exercicesApi.getByEntreprise(entrepriseId);
      setExercices(data);
    } catch (err) {
      console.error('Erreur chargement exercices:', err);
    }
  };

  const loadBalance = async () => {
    if (!entreprise) return;

    setLoading(true);
    try {
      const data = await balanceProgressiveApi.getBalanceProgressive({
        entreprise_id: entreprise.id,
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined,
        exercice_id: exerciceId,
        classes: classesSelectionnees.length > 0 ? classesSelectionnees : undefined,
        compte_debut: compteDebut || undefined,
        compte_fin: compteFin || undefined,
        inclure_comptes_vides: inclureComptesVides,
      });
      setBalanceData(data);
    } catch (err) {
      console.error('Erreur chargement balance progressive:', err);
      alert('Erreur lors du chargement de la balance progressive');
    } finally {
      setLoading(false);
    }
  };

  const handleClasseToggle = (classe: string) => {
    setClassesSelectionnees(prev =>
      prev.includes(classe)
        ? prev.filter(c => c !== classe)
        : [...prev, classe]
    );
  };

  const calculerTotaux = () => {
    if (!balanceData) return { totauxParPeriode: [], total: 0 };

    const totauxParPeriode = balanceData.periodes.map((_, periodeIndex) => {
      return balanceData.lignes.reduce((sum, ligne) => sum + ligne.soldes_par_periode[periodeIndex], 0);
    });

    const total = balanceData.lignes.reduce((sum, ligne) => sum + ligne.solde_total, 0);

    return { totauxParPeriode, total };
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Balance Progressive</h2>
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

  const totaux = calculerTotaux();

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Balance Progressive</h2>
            {entreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Affiche le solde cumulé de chaque compte à la fin de chaque période (mensuelle)
            </p>
          </div>

          {/* Filtres */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exercice
              </label>
              <select
                value={exerciceId || ''}
                onChange={(e) => setExerciceId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les exercices</option>
                {exercices.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    Exercice {ex.annee}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compte de début
              </label>
              <input
                type="text"
                value={compteDebut}
                onChange={(e) => setCompteDebut(e.target.value)}
                placeholder="Ex: 401000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compte de fin
              </label>
              <input
                type="text"
                value={compteFin}
                onChange={(e) => setCompteFin(e.target.value)}
                placeholder="Ex: 409999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inclureComptesVides}
                  onChange={(e) => setInclureComptesVides(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Afficher comptes sans mouvement
                </span>
              </label>
            </div>
          </div>

          {/* Classes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classes de comptes
            </label>
            <div className="flex flex-wrap gap-2">
              {['1', '2', '3', '4', '5', '6', '7'].map((classe) => (
                <button
                  key={classe}
                  onClick={() => handleClasseToggle(classe)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    classesSelectionnees.includes(classe)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Classe {classe}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton Calculer */}
          <div className="mb-6">
            <button
              onClick={loadBalance}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Calcul en cours...' : 'Calculer la balance progressive'}
            </button>
          </div>

          {/* Stats */}
          {balanceData && balanceData.lignes.length > 0 && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-600 mb-1">Comptes</p>
                <p className="text-xl font-bold text-blue-900">{balanceData.lignes.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-xs text-green-600 mb-1">Périodes</p>
                <p className="text-xl font-bold text-green-900">{balanceData.periodes.length} mois</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                <p className="text-xs text-purple-600 mb-1">Solde Final</p>
                <p className={`text-xl font-bold ${totaux.total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatMontant(totaux.total)} €
                </p>
              </div>
            </div>
          )}

          {/* Table de la balance progressive */}
          {balanceData && balanceData.lignes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th className="px-4 py-3 text-left text-sm font-semibold sticky left-0 bg-blue-600 z-10">Numéro</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold sticky left-20 bg-blue-600 z-10">Libellé</th>
                    {balanceData.periodes.map((periode, index) => (
                      <th key={index} className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">
                        {periode.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-sm font-semibold bg-blue-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balanceData.lignes.map((ligne) => (
                    <tr
                      key={ligne.numero_compte}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => setCompteSelectionne({ numero: ligne.numero_compte, libelle: ligne.libelle })}
                      title="Cliquer pour voir le grand livre du compte"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600 sticky left-0 bg-white">
                        {ligne.numero_compte}
                      </td>
                      <td className="px-4 py-3 text-sm sticky left-20 bg-white">
                        {ligne.libelle}
                      </td>
                      {ligne.soldes_par_periode.map((solde, index) => (
                        <td
                          key={index}
                          className={`px-4 py-3 text-sm text-right font-mono whitespace-nowrap ${
                            solde >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {formatMontant(solde)}
                        </td>
                      ))}
                      <td className={`px-4 py-3 text-sm text-right font-mono font-bold whitespace-nowrap ${
                        ligne.solde_total >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatMontant(ligne.solde_total)}
                      </td>
                    </tr>
                  ))}

                  {/* Ligne de totaux */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-sm sticky left-0 bg-gray-100" colSpan={2}>
                      TOTAUX
                    </td>
                    {totaux.totauxParPeriode.map((total, index) => (
                      <td key={index} className={`px-4 py-3 text-sm text-right font-mono whitespace-nowrap ${
                        total >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatMontant(total)}
                      </td>
                    ))}
                    <td className={`px-4 py-3 text-sm text-right font-mono whitespace-nowrap ${
                      totaux.total >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatMontant(totaux.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!loading && (!balanceData || balanceData.lignes.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Cliquez sur "Calculer la balance progressive" pour afficher les résultats
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Grand Livre Compte */}
      {compteSelectionne && (
        <ModalGrandLivreCompte
          numeroCompte={compteSelectionne.numero}
          libelleCompte={compteSelectionne.libelle}
          onClose={() => setCompteSelectionne(null)}
        />
      )}
    </div>
  );
}
