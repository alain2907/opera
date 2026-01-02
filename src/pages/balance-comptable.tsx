import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import ModalGrandLivreCompte from '../components/ModalGrandLivreCompte';
import { balanceApi, type LigneBalance } from '../api/balance';
import { exercicesApi, type Exercice } from '../api/exercices';
import { useEntreprise } from '../contexts/EntrepriseContext';

export default function BalanceComptablePage() {
  const router = useRouter();
  const { entreprise } = useEntreprise();
  const [lignesBalance, setLignesBalance] = useState<LigneBalance[]>([]);
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
      const data = await balanceApi.getBalance({
        entreprise_id: entreprise.id,
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined,
        exercice_id: exerciceId,
        classes: classesSelectionnees.length > 0 ? classesSelectionnees : undefined,
        compte_debut: compteDebut || undefined,
        compte_fin: compteFin || undefined,
        inclure_comptes_vides: inclureComptesVides,
      });
      setLignesBalance(data);
    } catch (err) {
      console.error('Erreur chargement balance:', err);
      alert('Erreur lors du chargement de la balance');
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
    const totalDebit = lignesBalance.reduce((sum, ligne) => sum + ligne.total_debit, 0);
    const totalCredit = lignesBalance.reduce((sum, ligne) => sum + ligne.total_credit, 0);
    const totalSoldeDebiteur = lignesBalance.reduce((sum, ligne) => sum + ligne.solde_debiteur, 0);
    const totalSoldeCrediteur = lignesBalance.reduce((sum, ligne) => sum + ligne.solde_crediteur, 0);

    // Comptes de bilan (classes 1 à 5)
    const comptesBilan = lignesBalance.filter(ligne => {
      const classe = ligne.numero_compte.charAt(0);
      return ['1', '2', '3', '4', '5'].includes(classe);
    });
    const totalBilanDebit = comptesBilan.reduce((sum, ligne) => sum + ligne.total_debit, 0);
    const totalBilanCredit = comptesBilan.reduce((sum, ligne) => sum + ligne.total_credit, 0);
    const totalBilanSoldeDebiteur = comptesBilan.reduce((sum, ligne) => sum + ligne.solde_debiteur, 0);
    const totalBilanSoldeCrediteur = comptesBilan.reduce((sum, ligne) => sum + ligne.solde_crediteur, 0);

    // Comptes de résultat (classes 6 et 7)
    const comptesResultat = lignesBalance.filter(ligne => {
      const classe = ligne.numero_compte.charAt(0);
      return ['6', '7'].includes(classe);
    });
    const totalResultatDebit = comptesResultat.reduce((sum, ligne) => sum + ligne.total_debit, 0);
    const totalResultatCredit = comptesResultat.reduce((sum, ligne) => sum + ligne.total_credit, 0);
    const totalResultatSoldeDebiteur = comptesResultat.reduce((sum, ligne) => sum + ligne.solde_debiteur, 0);
    const totalResultatSoldeCrediteur = comptesResultat.reduce((sum, ligne) => sum + ligne.solde_crediteur, 0);

    return {
      totalDebit,
      totalCredit,
      totalSoldeDebiteur,
      totalSoldeCrediteur,
      totalBilanDebit,
      totalBilanCredit,
      totalBilanSoldeDebiteur,
      totalBilanSoldeCrediteur,
      totalResultatDebit,
      totalResultatCredit,
      totalResultatSoldeDebiteur,
      totalResultatSoldeCrediteur
    };
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  const exporterCSV = () => {
    if (lignesBalance.length === 0) {
      alert('Aucune donnée à exporter. Veuillez d\'abord calculer la balance.');
      return;
    }

    // En-tête CSV
    const headers = [
      'N° Compte',
      'Libellé',
      'Total Débit',
      'Total Crédit',
      'Solde Débiteur',
      'Solde Créditeur'
    ];

    // Lignes de données
    const rows = lignesBalance.map(ligne => [
      ligne.numero_compte,
      ligne.libelle_compte,
      ligne.total_debit.toFixed(2),
      ligne.total_credit.toFixed(2),
      ligne.solde_debiteur.toFixed(2),
      ligne.solde_crediteur.toFixed(2)
    ]);

    // Ligne totaux
    const totaux = calculerTotaux();
    rows.push([
      '',
      'TOTAL GÉNÉRAL',
      totaux.totalDebit.toFixed(2),
      totaux.totalCredit.toFixed(2),
      totaux.totalSoldeDebiteur.toFixed(2),
      totaux.totalSoldeCrediteur.toFixed(2)
    ]);

    // Total Bilan
    rows.push([
      '',
      'TOTAL BILAN (Classes 1-5)',
      totaux.totalBilanDebit.toFixed(2),
      totaux.totalBilanCredit.toFixed(2),
      totaux.totalBilanSoldeDebiteur.toFixed(2),
      totaux.totalBilanSoldeCrediteur.toFixed(2)
    ]);

    // Total Résultat
    rows.push([
      '',
      'TOTAL RÉSULTAT (Classes 6-7)',
      totaux.totalResultatDebit.toFixed(2),
      totaux.totalResultatCredit.toFixed(2),
      totaux.totalResultatSoldeDebiteur.toFixed(2),
      totaux.totalResultatSoldeCrediteur.toFixed(2)
    ]);

    // Créer le contenu CSV
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Créer le fichier et déclencher le téléchargement
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `balance_comptable_${entreprise?.raison_sociale || 'export'}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Balance Comptable</h2>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Balance Comptable</h2>
            {entreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              </p>
            )}
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

          {/* Boutons Calculer et Exporter */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={loadBalance}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Calcul en cours...' : 'Calculer la balance'}
            </button>
            {lignesBalance.length > 0 && (
              <button
                onClick={exporterCSV}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Exporter CSV
              </button>
            )}
          </div>

          {/* Stats */}
          {lignesBalance.length > 0 && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-600 mb-1">Comptes</p>
                <p className="text-xl font-bold text-blue-900">{lignesBalance.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-xs text-green-600 mb-1">Total Débit</p>
                <p className="text-xl font-bold text-green-900">{formatMontant(totaux.totalDebit)} €</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                <p className="text-xs text-orange-600 mb-1">Total Crédit</p>
                <p className="text-xl font-bold text-orange-900">{formatMontant(totaux.totalCredit)} €</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                <p className="text-xs text-purple-600 mb-1">Équilibre</p>
                <p className="text-xl font-bold text-purple-900">
                  {formatMontant(Math.abs(totaux.totalDebit - totaux.totalCredit))} €
                </p>
              </div>
            </div>
          )}

          {/* Table de la balance */}
          {lignesBalance.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Numéro</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Libellé</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Total Débit</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Total Crédit</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Solde Débiteur</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Solde Créditeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lignesBalance.map((ligne) => (
                    <tr
                      key={ligne.numero_compte}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => setCompteSelectionne({ numero: ligne.numero_compte, libelle: ligne.libelle })}
                      title="Cliquer pour voir le grand livre du compte"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                        {ligne.numero_compte}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {ligne.libelle}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {ligne.total_debit > 0 ? formatMontant(ligne.total_debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {ligne.total_credit > 0 ? formatMontant(ligne.total_credit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                        {ligne.solde_debiteur > 0 ? formatMontant(ligne.solde_debiteur) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                        {ligne.solde_crediteur > 0 ? formatMontant(ligne.solde_crediteur) : '-'}
                      </td>
                    </tr>
                  ))}

                  {/* Ligne de totaux généraux */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX GÉNÉRAUX
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Ligne de totaux BILAN */}
                  <tr className="bg-blue-50 font-semibold border-t-2 border-blue-300">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX BILAN (Classes 1-5)
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalBilanDebit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalBilanCredit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalBilanSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalBilanSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Ligne de totaux RÉSULTAT */}
                  <tr className="bg-green-50 font-semibold">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX RÉSULTAT (Classes 6-7)
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalResultatDebit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalResultatCredit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalResultatSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalResultatSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Ligne de résultat net (bénéfice ou perte) */}
                  {(() => {
                    const resultatNet = totaux.totalResultatSoldeCrediteur - totaux.totalResultatSoldeDebiteur;
                    const estBenefice = resultatNet > 0;
                    const estPerte = resultatNet < 0;

                    return (
                      <tr className={`font-bold border-t-2 ${estBenefice ? 'bg-green-100 border-green-400' : estPerte ? 'bg-red-100 border-red-400' : 'bg-gray-100 border-gray-400'}`}>
                        <td className="px-4 py-3 text-sm" colSpan={2}>
                          {estBenefice ? 'BÉNÉFICE' : estPerte ? 'PERTE' : 'RÉSULTAT NUL'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono" colSpan={2}>
                          {/* Vide */}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${estBenefice ? 'text-green-700' : estPerte ? 'text-red-700' : 'text-gray-700'}`} colSpan={2}>
                          {formatMontant(Math.abs(resultatNet))} €
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {!loading && lignesBalance.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Cliquez sur "Calculer la balance" pour afficher les résultats
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
