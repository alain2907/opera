import { useState, useEffect } from 'react';
import { ecrituresApi, type Ecriture } from '../../api/ecritures';
import { comptesApi, type Compte } from '../../api/comptes';
import { useEntreprise } from '../../contexts/EntrepriseContext';
import { useWindows } from '../../contexts/WindowContext';
import { exportToCsv, formatDateForFilename } from '../../utils/csvExport';
import GrandLivreWindow from './GrandLivreWindow';

interface LigneBalance {
  numero_compte: string;
  libelle: string;
  debitTotal: number;
  creditTotal: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export default function BalanceWindow() {
  const { entreprise, exercice } = useEntreprise();
  const { openWindow } = useWindows();
  const [balance, setBalance] = useState<LigneBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [filterClasse, setFilterClasse] = useState<string>('');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [filterCompteDebut, setFilterCompteDebut] = useState<string>('');
  const [filterCompteFin, setFilterCompteFin] = useState<string>('');

  useEffect(() => {
    if (entreprise) {
      loadComptes(entreprise.id);
    }
  }, [entreprise]);

  useEffect(() => {
    if (exercice) {
      setDateDebut(exercice.date_debut);
      setDateFin(exercice.date_fin);
    }
  }, [exercice]);

  useEffect(() => {
    if (entreprise && exercice && comptes.length > 0 && dateDebut && dateFin) {
      calculerBalance();
    }
  }, [entreprise, exercice, comptes, dateDebut, dateFin]);

  const loadComptes = async (id: number) => {
    try {
      const data = await comptesApi.getAll(id);
      setComptes(data);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    }
  };

  const calculerBalance = async () => {
    if (!entreprise || !exercice) return;

    setLoading(true);
    try {
      const ecritures = await ecrituresApi.getAll(entreprise.id, exercice.id);

      const totauxParCompte: { [key: string]: { debit: number; credit: number } } = {};

      // Filtrer par période
      const dateDebutFilter = new Date(dateDebut);
      const dateFinFilter = new Date(dateFin);

      ecritures
        .filter((ecriture: Ecriture) => {
          const dateEcriture = new Date(ecriture.date_ecriture);
          return dateEcriture >= dateDebutFilter && dateEcriture <= dateFinFilter;
        })
        .forEach((ecriture: Ecriture) => {
          ecriture.lignes.forEach((ligne) => {
            const compte = ligne.numero_compte;
            if (!totauxParCompte[compte]) {
              totauxParCompte[compte] = { debit: 0, credit: 0 };
            }
            totauxParCompte[compte].debit += Number(ligne.debit) || 0;
            totauxParCompte[compte].credit += Number(ligne.credit) || 0;
          });
        });

      const balanceData: LigneBalance[] = Object.keys(totauxParCompte)
        .sort()
        .map((numeroCompte) => {
          const totaux = totauxParCompte[numeroCompte];
          const solde = totaux.debit - totaux.credit;

          const compte = comptes.find(c => c.numero_compte === numeroCompte);
          const libelle = compte?.libelle || 'Compte inconnu';

          return {
            numero_compte: numeroCompte,
            libelle,
            debitTotal: totaux.debit,
            creditTotal: totaux.credit,
            soldeDebiteur: solde > 0 ? solde : 0,
            soldeCrediteur: solde < 0 ? Math.abs(solde) : 0,
          };
        })
        .filter(ligne => ligne.debitTotal !== 0 || ligne.creditTotal !== 0);

      setBalance(balanceData);
    } catch (err) {
      console.error('Erreur calcul balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBalance = balance.filter(ligne => {
    // Filtre par classe
    if (filterClasse && !ligne.numero_compte.startsWith(filterClasse)) {
      return false;
    }

    // Filtre par plage de comptes
    if (filterCompteDebut && ligne.numero_compte < filterCompteDebut) {
      return false;
    }
    if (filterCompteFin && ligne.numero_compte > filterCompteFin) {
      return false;
    }

    return true;
  });

  const totaux = filteredBalance.reduce(
    (acc, ligne) => ({
      debit: acc.debit + ligne.debitTotal,
      credit: acc.credit + ligne.creditTotal,
      soldeDebiteur: acc.soldeDebiteur + ligne.soldeDebiteur,
      soldeCrediteur: acc.soldeCrediteur + ligne.soldeCrediteur,
    }),
    { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const handleExportCsv = () => {
    const csvData = filteredBalance.map(ligne => ({
      'Compte': ligne.numero_compte,
      'Libellé': ligne.libelle,
      'Débit': ligne.debitTotal,
      'Crédit': ligne.creditTotal,
      'Solde Débiteur': ligne.soldeDebiteur,
      'Solde Créditeur': ligne.soldeCrediteur,
    }));

    // Ajouter la ligne de totaux
    csvData.push({
      'Compte': 'TOTAUX',
      'Libellé': '',
      'Débit': totaux.debit,
      'Crédit': totaux.credit,
      'Solde Débiteur': totaux.soldeDebiteur,
      'Solde Créditeur': totaux.soldeCrediteur,
    });

    const filename = `balance_${entreprise?.raison_sociale.replace(/\s/g, '_')}_${formatDateForFilename()}.csv`;
    exportToCsv(csvData, filename);
  };

  const handleCompteClick = (numeroCompte: string, libelle: string) => {
    openWindow(
      `Grand Livre - ${numeroCompte} ${libelle}`,
      <GrandLivreWindow numeroCompte={numeroCompte} />,
      1100,
      700
    );
  };

  return (
    <div className="h-full flex flex-col p-4 bg-white">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Balance Comptable</h3>
          <p className="text-sm text-gray-600">
            {entreprise?.raison_sociale} - Exercice {exercice && new Date(exercice.date_debut).getFullYear()}
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
          title="Exporter en CSV"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-4 space-y-3">
        {/* Période */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Classe de comptes */}
        <select
          value={filterClasse}
          onChange={(e) => {
            setFilterClasse(e.target.value);
            // Auto-remplir la plage de comptes selon la classe
            if (e.target.value) {
              setFilterCompteDebut(e.target.value);
              setFilterCompteFin(e.target.value + '9999999');
            } else {
              setFilterCompteDebut('');
              setFilterCompteFin('');
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">Toutes les classes</option>
          <option value="1">Classe 1 - Capitaux</option>
          <option value="2">Classe 2 - Immobilisations</option>
          <option value="3">Classe 3 - Stocks</option>
          <option value="4">Classe 4 - Tiers</option>
          <option value="5">Classe 5 - Financiers</option>
          <option value="6">Classe 6 - Charges</option>
          <option value="7">Classe 7 - Produits</option>
        </select>

        {/* Plage de comptes */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Du compte</label>
            <input
              type="text"
              value={filterCompteDebut}
              onChange={(e) => setFilterCompteDebut(e.target.value)}
              placeholder="Ex: 401"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Au compte</label>
            <input
              type="text"
              value={filterCompteFin}
              onChange={(e) => setFilterCompteFin(e.target.value)}
              placeholder="Ex: 409"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 overflow-auto">
        {filteredBalance.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune écriture pour cet exercice
          </div>
        ) : (
          <table className="min-w-full bg-white border border-gray-200 text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Débit</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Crédit</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Solde Déb.</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Solde Créd.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBalance.map((ligne, idx) => (
                <tr key={idx} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleCompteClick(ligne.numero_compte, ligne.libelle)}>
                  <td className="px-3 py-2 font-mono text-blue-600 font-semibold hover:underline">{ligne.numero_compte}</td>
                  <td className="px-3 py-2 text-gray-700">{ligne.libelle}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">
                    {ligne.debitTotal > 0 ? ligne.debitTotal.toFixed(2) : ''}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">
                    {ligne.creditTotal > 0 ? ligne.creditTotal.toFixed(2) : ''}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">
                    {ligne.soldeDebiteur > 0 ? ligne.soldeDebiteur.toFixed(2) : ''}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">
                    {ligne.soldeCrediteur > 0 ? ligne.soldeCrediteur.toFixed(2) : ''}
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-bold sticky bottom-0">
                <td colSpan={2} className="px-3 py-2 text-blue-900">TOTAUX</td>
                <td className="px-3 py-2 text-right font-mono text-blue-900">{totaux.debit.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono text-blue-900">{totaux.credit.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono text-blue-900">{totaux.soldeDebiteur.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono text-blue-900">{totaux.soldeCrediteur.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-600">
        {filteredBalance.length} compte{filteredBalance.length > 1 ? 's' : ''} •
        Équilibre : {Math.abs(totaux.debit - totaux.credit) < 0.01 ? '✅' : '⚠️ Déséquilibrée'}
      </div>
    </div>
  );
}
