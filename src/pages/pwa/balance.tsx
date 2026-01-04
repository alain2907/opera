import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getAllEntreprises,
  getExercicesByEntreprise,
  getAllEcritures,
  getAllComptes,
} from '../../lib/storageAdapter';
import PWANavbar from '../../components/PWANavbar';

interface LigneBalance {
  numero_compte: string;
  libelle: string;
  total_debit: number;
  total_credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

export default function BalancePWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [lignesBalance, setLignesBalance] = useState<LigneBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [exercices, setExercices] = useState<any[]>([]);

  // Filtres
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [exerciceId, setExerciceId] = useState<number | undefined>(undefined);
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([]);
  const [compteDebut, setCompteDebut] = useState('');
  const [compteFin, setCompteFin] = useState('');
  const [inclureComptesVides, setInclureComptesVides] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadExercices(selectedEntreprise);
    }
  }, [selectedEntreprise]);

  async function loadData() {
    const data = await getAllEntreprises();
    setEntreprises(data);
    if (data.length > 0) {
      setSelectedEntreprise(data[0].id);
    }
  }

  async function loadExercices(entrepriseId: number) {
    const data = await getExercicesByEntreprise(entrepriseId);
    console.log('[Balance PWA] Exercices chargés:', data);

    // Dédoublonner par ID (garder le premier de chaque ID)
    const uniqueExercices = data.filter((ex: any, index: number, self: any[]) =>
      index === self.findIndex((e: any) => e.id === ex.id)
    );

    setExercices(uniqueExercices);
  }

  async function loadBalance() {
    if (!selectedEntreprise) return;

    setLoading(true);
    try {
      // Récupérer toutes les écritures
      const ecritures = await getAllEcritures();
      const comptes = await getAllComptes();

      // Filtrer par exercice si sélectionné
      let ecrituresFiltrees = exerciceId
        ? ecritures.filter((e: any) => e.exerciceId === exerciceId)
        : ecritures;

      // Filtrer par dates si spécifiées
      if (dateDebut) {
        ecrituresFiltrees = ecrituresFiltrees.filter((e: any) => e.date >= dateDebut);
      }
      if (dateFin) {
        ecrituresFiltrees = ecrituresFiltrees.filter((e: any) => e.date <= dateFin);
      }

      // Filtrer par classes
      if (classesSelectionnees.length > 0) {
        ecrituresFiltrees = ecrituresFiltrees.filter((e: any) => {
          const classe = e.compteNumero.charAt(0);
          return classesSelectionnees.includes(classe);
        });
      }

      // Filtrer par intervalle de comptes
      if (compteDebut) {
        ecrituresFiltrees = ecrituresFiltrees.filter((e: any) => e.compteNumero >= compteDebut);
      }
      if (compteFin) {
        ecrituresFiltrees = ecrituresFiltrees.filter((e: any) => e.compteNumero <= compteFin);
      }

      // Calculer la balance
      const balanceMap = new Map<string, LigneBalance>();

      ecrituresFiltrees.forEach((ecriture: any) => {
        const numeroCompte = ecriture.compteNumero;
        if (!balanceMap.has(numeroCompte)) {
          const compte = comptes.find((c: any) => c.numero === numeroCompte);
          balanceMap.set(numeroCompte, {
            numero_compte: numeroCompte,
            libelle: compte?.nom || `Compte ${numeroCompte}`,
            total_debit: 0,
            total_credit: 0,
            solde_debiteur: 0,
            solde_crediteur: 0,
          });
        }

        const ligne = balanceMap.get(numeroCompte)!;
        ligne.total_debit += ecriture.debit || 0;
        ligne.total_credit += ecriture.credit || 0;
      });

      // Calculer les soldes
      const lignes = Array.from(balanceMap.values()).map((ligne) => {
        const solde = ligne.total_debit - ligne.total_credit;
        if (solde > 0) {
          ligne.solde_debiteur = solde;
          ligne.solde_crediteur = 0;
        } else {
          ligne.solde_debiteur = 0;
          ligne.solde_crediteur = Math.abs(solde);
        }
        return ligne;
      });

      // Filtrer les comptes vides si nécessaire
      const lignesFinales = inclureComptesVides
        ? lignes
        : lignes.filter(
            (ligne) => ligne.total_debit > 0 || ligne.total_credit > 0
          );

      // Trier par numéro de compte
      lignesFinales.sort((a, b) => a.numero_compte.localeCompare(b.numero_compte));

      setLignesBalance(lignesFinales);
    } catch (err) {
      console.error('Erreur chargement balance:', err);
      alert('Erreur lors du chargement de la balance');
    } finally {
      setLoading(false);
    }
  }

  const handleClasseToggle = (classe: string) => {
    setClassesSelectionnees((prev) =>
      prev.includes(classe) ? prev.filter((c) => c !== classe) : [...prev, classe]
    );
  };

  const calculerTotaux = () => {
    const totalDebit = lignesBalance.reduce((sum, ligne) => sum + ligne.total_debit, 0);
    const totalCredit = lignesBalance.reduce((sum, ligne) => sum + ligne.total_credit, 0);
    const totalSoldeDebiteur = lignesBalance.reduce((sum, ligne) => sum + ligne.solde_debiteur, 0);
    const totalSoldeCrediteur = lignesBalance.reduce((sum, ligne) => sum + ligne.solde_crediteur, 0);

    // Comptes de bilan (classes 1 à 5)
    const comptesBilan = lignesBalance.filter((ligne) => {
      const classe = ligne.numero_compte.charAt(0);
      return ['1', '2', '3', '4', '5'].includes(classe);
    });
    const totalBilanDebit = comptesBilan.reduce((sum, ligne) => sum + ligne.total_debit, 0);
    const totalBilanCredit = comptesBilan.reduce((sum, ligne) => sum + ligne.total_credit, 0);
    const totalBilanSoldeDebiteur = comptesBilan.reduce((sum, ligne) => sum + ligne.solde_debiteur, 0);
    const totalBilanSoldeCrediteur = comptesBilan.reduce((sum, ligne) => sum + ligne.solde_crediteur, 0);

    // Comptes de résultat (classes 6 et 7)
    const comptesResultat = lignesBalance.filter((ligne) => {
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
      totalResultatSoldeCrediteur,
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

    const headers = ['N° Compte', 'Libellé', 'Total Débit', 'Total Crédit', 'Solde Débiteur', 'Solde Créditeur'];

    const rows = lignesBalance.map((ligne) => [
      ligne.numero_compte,
      ligne.libelle,
      ligne.total_debit.toFixed(2),
      ligne.total_credit.toFixed(2),
      ligne.solde_debiteur.toFixed(2),
      ligne.solde_crediteur.toFixed(2),
    ]);

    const totaux = calculerTotaux();
    rows.push([
      '',
      'TOTAL GÉNÉRAL',
      totaux.totalDebit.toFixed(2),
      totaux.totalCredit.toFixed(2),
      totaux.totalSoldeDebiteur.toFixed(2),
      totaux.totalSoldeCrediteur.toFixed(2),
    ]);

    rows.push([
      '',
      'TOTAL BILAN (Classes 1-5)',
      totaux.totalBilanDebit.toFixed(2),
      totaux.totalBilanCredit.toFixed(2),
      totaux.totalBilanSoldeDebiteur.toFixed(2),
      totaux.totalBilanSoldeCrediteur.toFixed(2),
    ]);

    rows.push([
      '',
      'TOTAL RÉSULTAT (Classes 6-7)',
      totaux.totalResultatDebit.toFixed(2),
      totaux.totalResultatCredit.toFixed(2),
      totaux.totalResultatSoldeDebiteur.toFixed(2),
      totaux.totalResultatSoldeCrediteur.toFixed(2),
    ]);

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    const entreprise = entreprises.find((e) => e.id === selectedEntreprise);
    link.setAttribute('href', url);
    link.setAttribute('download', `balance_comptable_${entreprise?.nom || 'export'}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totaux = calculerTotaux();

  return (
    <div className="min-h-screen bg-gray-50">
      <PWANavbar />

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/pwa')} className="text-gray-600 hover:text-gray-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Balance Comptable</h1>
              {selectedEntreprise && exerciceId && (
                <div className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold">Entreprise :</span> {entreprises.find(e => e.id === selectedEntreprise)?.raison_sociale || entreprises.find(e => e.id === selectedEntreprise)?.nom || 'N/A'}
                  {' • '}
                  <span className="font-semibold">Exercice :</span> {exercices.find(ex => ex.id === exerciceId)?.annee || 'N/A'} {exercices.find(ex => ex.id === exerciceId)?.cloture ? '(Clôturé)' : '(En cours)'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Sélection entreprise */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
            <select
              value={selectedEntreprise || ''}
              onChange={(e) => setSelectedEntreprise(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {entreprises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtres */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exercice</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte de début</label>
              <input
                type="text"
                value={compteDebut}
                onChange={(e) => setCompteDebut(e.target.value)}
                placeholder="Ex: 401000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte de fin</label>
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
                <span className="text-sm font-medium text-gray-700">Afficher comptes sans mouvement</span>
              </label>
            </div>
          </div>

          {/* Classes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Classes de comptes</label>
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

          {/* Boutons */}
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
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
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

          {/* Table */}
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
                    <tr key={ligne.numero_compte} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">{ligne.numero_compte}</td>
                      <td className="px-4 py-3 text-sm">{ligne.libelle}</td>
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

                  {/* Totaux généraux */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX GÉNÉRAUX
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{formatMontant(totaux.totalDebit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{formatMontant(totaux.totalCredit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Totaux BILAN */}
                  <tr className="bg-blue-50 font-semibold border-t-2 border-blue-300">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX BILAN (Classes 1-5)
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{formatMontant(totaux.totalBilanDebit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{formatMontant(totaux.totalBilanCredit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalBilanSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalBilanSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Totaux RÉSULTAT */}
                  <tr className="bg-green-50 font-semibold">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX RÉSULTAT (Classes 6-7)
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{formatMontant(totaux.totalResultatDebit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">{formatMontant(totaux.totalResultatCredit)}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalResultatSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalResultatSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Résultat net */}
                  {(() => {
                    const resultatNet = totaux.totalResultatSoldeCrediteur - totaux.totalResultatSoldeDebiteur;
                    const estBenefice = resultatNet > 0;
                    const estPerte = resultatNet < 0;

                    return (
                      <tr
                        className={`font-bold border-t-2 ${
                          estBenefice
                            ? 'bg-green-100 border-green-400'
                            : estPerte
                            ? 'bg-red-100 border-red-400'
                            : 'bg-gray-100 border-gray-400'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm" colSpan={2}>
                          {estBenefice ? 'BÉNÉFICE' : estPerte ? 'PERTE' : 'RÉSULTAT NUL'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono" colSpan={2}></td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-mono font-bold ${
                            estBenefice ? 'text-green-700' : estPerte ? 'text-red-700' : 'text-gray-700'
                          }`}
                          colSpan={2}
                        >
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
              <p className="text-gray-500">Cliquez sur "Calculer la balance" pour afficher les résultats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
