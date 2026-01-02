import { useState, useEffect } from 'react';
import { ecrituresApi, type Ecriture } from '../../api/ecritures';
import { comptesApi, type Compte } from '../../api/comptes';
import { journauxApi, type Journal } from '../../api/journaux';
import { useEntreprise } from '../../contexts/EntrepriseContext';
import { useWindows } from '../../contexts/WindowContext';
import { exportToCsv, formatDateForFilename } from '../../utils/csvExport';
import EcritureWindow from './EcritureWindow';

interface LigneGrandLivre {
  ecritureId: number;
  date: string;
  journal: string;
  numeroPiece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

interface CompteGrandLivre {
  numero_compte: string;
  libelle_compte: string;
  lignes: LigneGrandLivre[];
  soldeInitial: number;
  soldeFinal: number;
}

interface GrandLivreWindowProps {
  numeroCompte?: string;
}

export default function GrandLivreWindow({ numeroCompte }: GrandLivreWindowProps = {}) {
  const { entreprise, exercice } = useEntreprise();
  const { openWindow } = useWindows();
  const [grandLivre, setGrandLivre] = useState<CompteGrandLivre[]>([]);
  const [loading, setLoading] = useState(true);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [filterClasse, setFilterClasse] = useState<string>('');
  const [filterCompte, setFilterCompte] = useState<string>(numeroCompte || '');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [filterCompteDebut, setFilterCompteDebut] = useState<string>('');
  const [filterCompteFin, setFilterCompteFin] = useState<string>('');

  useEffect(() => {
    if (entreprise) {
      loadComptes(entreprise.id);
      loadJournaux(entreprise.id);
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
      calculerGrandLivre();
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

  const loadJournaux = async (id: number) => {
    try {
      const data = await journauxApi.findByEntreprise(id);
      setJournaux(data);
    } catch (err) {
      console.error('Erreur chargement journaux:', err);
    }
  };

  const calculerGrandLivre = async () => {
    if (!entreprise || !exercice) return;

    setLoading(true);
    try {
      const ecritures = await ecrituresApi.getAll(entreprise.id, exercice.id);

      const lignesParCompte: { [key: string]: LigneGrandLivre[] } = {};

      // Filtrer par période
      const dateDebutFilter = new Date(dateDebut);
      const dateFinFilter = new Date(dateFin);

      ecritures
        .filter((ecriture: Ecriture) => {
          const dateEcriture = new Date(ecriture.date_ecriture);
          return dateEcriture >= dateDebutFilter && dateEcriture <= dateFinFilter;
        })
        .sort((a, b) => new Date(a.date_ecriture).getTime() - new Date(b.date_ecriture).getTime())
        .forEach((ecriture: Ecriture) => {
          ecriture.lignes.forEach((ligne) => {
            const compte = ligne.numero_compte;
            if (!lignesParCompte[compte]) {
              lignesParCompte[compte] = [];
            }

            const journal = journaux.find(j => j.id === ecriture.journal_id);
            const codeJournal = journal?.code || '';

            lignesParCompte[compte].push({
              ecritureId: ecriture.id!,
              date: ecriture.date_ecriture,
              journal: codeJournal,
              numeroPiece: ecriture.numero_piece || '',
              libelle: ligne.libelle_compte,
              debit: Number(ligne.debit) || 0,
              credit: Number(ligne.credit) || 0,
              solde: 0,
            });
          });
        });

      const grandLivreData: CompteGrandLivre[] = Object.keys(lignesParCompte)
        .sort()
        .map((numeroCompte) => {
          const lignes = lignesParCompte[numeroCompte];
          let soldeProgressif = 0;

          lignes.forEach((ligne) => {
            soldeProgressif += ligne.debit - ligne.credit;
            ligne.solde = soldeProgressif;
          });

          const compte = comptes.find(c => c.numero_compte === numeroCompte);
          const libelleCompte = compte?.libelle || 'Compte inconnu';

          return {
            numero_compte: numeroCompte,
            libelle_compte: libelleCompte,
            lignes,
            soldeInitial: 0,
            soldeFinal: soldeProgressif,
          };
        })
        .filter(compte => compte.lignes.length > 0);

      setGrandLivre(grandLivreData);
    } catch (err) {
      console.error('Erreur calcul grand livre:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGrandLivre = grandLivre.filter(compte => {
    if (filterClasse && !compte.numero_compte.startsWith(filterClasse)) {
      return false;
    }
    if (filterCompte && !compte.numero_compte.includes(filterCompte)) {
      return false;
    }
    // Filtre par plage de comptes
    if (filterCompteDebut && compte.numero_compte < filterCompteDebut) {
      return false;
    }
    if (filterCompteFin && compte.numero_compte > filterCompteFin) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const handleExportCsv = () => {
    const csvData: any[] = [];

    filteredGrandLivre.forEach(compte => {
      compte.lignes.forEach(ligne => {
        csvData.push({
          'Compte': compte.numero_compte,
          'Libellé Compte': compte.libelle_compte,
          'Date': new Date(ligne.date).toLocaleDateString('fr-FR'),
          'Journal': ligne.journal,
          'N° Pièce': ligne.numeroPiece,
          'Libellé': ligne.libelle,
          'Débit': ligne.debit,
          'Crédit': ligne.credit,
          'Solde': ligne.solde,
        });
      });
    });

    const filename = `grand_livre_${entreprise?.raison_sociale.replace(/\s/g, '_')}_${formatDateForFilename()}.csv`;
    exportToCsv(csvData, filename);
  };

  const handleEcritureClick = (ecritureId: number, numeroPiece: string) => {
    // Ouvrir une nouvelle fenêtre avec les détails de l'écriture
    openWindow(
      `Écriture ${numeroPiece}`,
      <EcritureWindow ecritureId={ecritureId} />,
      800,
      600
    );
  };

  return (
    <div className="h-full flex flex-col p-4 bg-white">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Grand Livre</h3>
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

        {/* Classe */}
        <select
          value={filterClasse}
          onChange={(e) => {
            setFilterClasse(e.target.value);
            // Auto-remplir la plage de comptes selon la classe
            if (e.target.value) {
              setFilterCompteDebut(e.target.value);
              setFilterCompteFin(e.target.value + '9999999');
              setFilterCompte('');
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
              onChange={(e) => {
                setFilterCompteDebut(e.target.value);
                setFilterClasse('');
                setFilterCompte('');
              }}
              placeholder="Ex: 401"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Au compte</label>
            <input
              type="text"
              value={filterCompteFin}
              onChange={(e) => {
                setFilterCompteFin(e.target.value);
                setFilterClasse('');
                setFilterCompte('');
              }}
              placeholder="Ex: 409"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>
        </div>

        {/* Recherche libre */}
        <input
          type="text"
          value={filterCompte}
          onChange={(e) => {
            setFilterCompte(e.target.value);
            setFilterClasse('');
            setFilterCompteDebut('');
            setFilterCompteFin('');
          }}
          placeholder="Recherche compte (ex: 512)..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
        />
      </div>

      {/* Grand Livre */}
      <div className="flex-1 overflow-auto">
        {filteredGrandLivre.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune écriture trouvée
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGrandLivre.map((compte, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* En-tête compte */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold font-mono">{compte.numero_compte}</h4>
                    <p className="text-xs text-blue-100">{compte.libelle_compte}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold font-mono ${
                      compte.soldeFinal >= 0 ? 'text-green-100' : 'text-red-100'
                    }`}>
                      {compte.soldeFinal >= 0 ? '+' : ''}{compte.soldeFinal.toFixed(2)} €
                    </p>
                  </div>
                </div>

                {/* Lignes */}
                <table className="min-w-full bg-white text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-500">Date</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500">Jrn</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500">Pièce</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500">Libellé</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500">Débit</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500">Crédit</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500">Solde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {compte.lignes.map((ligne, ligneIdx) => (
                      <tr
                        key={ligneIdx}
                        className="hover:bg-blue-50 cursor-pointer"
                        onClick={() => handleEcritureClick(ligne.ecritureId, ligne.numeroPiece)}
                        title="Cliquer pour voir l'écriture complète"
                      >
                        <td className="px-2 py-2 font-mono">{new Date(ligne.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-2 py-2 font-mono font-semibold text-blue-600">{ligne.journal}</td>
                        <td className="px-2 py-2 font-mono hover:underline">{ligne.numeroPiece}</td>
                        <td className="px-2 py-2">{ligne.libelle}</td>
                        <td className="px-2 py-2 text-right font-mono">{ligne.debit > 0 ? ligne.debit.toFixed(2) : ''}</td>
                        <td className="px-2 py-2 text-right font-mono">{ligne.credit > 0 ? ligne.credit.toFixed(2) : ''}</td>
                        <td className={`px-2 py-2 text-right font-mono font-semibold ${
                          ligne.solde >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {ligne.solde.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-600">
        {filteredGrandLivre.length} compte{filteredGrandLivre.length > 1 ? 's' : ''} affiché{filteredGrandLivre.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}
