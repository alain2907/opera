import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { ecrituresApi, type Ecriture } from '../api/ecritures';
import { comptesApi, type Compte } from '../api/comptes';
import { journauxApi, type Journal } from '../api/journaux';
import { useEntreprise } from '../contexts/EntrepriseContext';

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

export default function GrandLivrePage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [grandLivre, setGrandLivre] = useState<CompteGrandLivre[]>([]);
  const [loading, setLoading] = useState(true);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [journaux, setJournaux] = useState<Journal[]>([]);
  const [filterClasse, setFilterClasse] = useState<string>('');
  const [filterCompte, setFilterCompte] = useState<string>('');

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
    }
  }, [entreprise, router]);

  useEffect(() => {
    if (entreprise) {
      loadComptes(entreprise.id);
      loadJournaux(entreprise.id);
    }
  }, [entreprise]);

  useEffect(() => {
    if (entreprise && exercice && comptes.length > 0) {
      calculerGrandLivre();
    }
  }, [entreprise, exercice, comptes]);

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

      // Grouper les lignes par compte
      const lignesParCompte: { [key: string]: LigneGrandLivre[] } = {};

      ecritures
        .sort((a, b) => new Date(a.date_ecriture).getTime() - new Date(b.date_ecriture).getTime())
        .forEach((ecriture: Ecriture) => {
          ecriture.lignes.forEach((ligne) => {
            const compte = ligne.numero_compte;
            if (!lignesParCompte[compte]) {
              lignesParCompte[compte] = [];
            }

            // Trouver le code du journal
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
              solde: 0, // Sera calculé ci-dessous
            });
          });
        });

      // Calculer le solde progressif pour chaque compte
      const grandLivreData: CompteGrandLivre[] = Object.keys(lignesParCompte)
        .sort()
        .map((numeroCompte) => {
          const lignes = lignesParCompte[numeroCompte];
          let soldeProgressif = 0;

          // Calculer le solde progressif
          lignes.forEach((ligne) => {
            soldeProgressif += ligne.debit - ligne.credit;
            ligne.solde = soldeProgressif;
          });

          // Récupérer le libellé du compte
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

  // Filtrage
  const filteredGrandLivre = grandLivre.filter(compte => {
    if (filterClasse && !compte.numero_compte.startsWith(filterClasse)) {
      return false;
    }
    if (filterCompte && !compte.numero_compte.includes(filterCompte)) {
      return false;
    }
    return true;
  });

  if (!entreprise) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Grand Livre</h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
            </p>
          </div>

          {/* Filtres */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classe de comptes
              </label>
              <select
                value={filterClasse}
                onChange={(e) => setFilterClasse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recherche compte
              </label>
              <input
                type="text"
                value={filterCompte}
                onChange={(e) => setFilterCompte(e.target.value)}
                placeholder="Ex: 512"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📄 Imprimer
            </button>
          </div>

          {/* Grand Livre */}
          {filteredGrandLivre.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Aucune écriture pour cet exercice</p>
              <button
                onClick={() => router.push('/saisie')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Créer la première écriture
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredGrandLivre.map((compte, idx) => (
                <div key={idx} className="break-inside-avoid">
                  {/* En-tête du compte */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold font-mono">{compte.numero_compte}</h3>
                        <p className="text-blue-100 text-sm">{compte.libelle_compte}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90">Solde final</p>
                        <p className={`text-xl font-bold font-mono ${
                          compte.soldeFinal >= 0 ? 'text-green-100' : 'text-red-100'
                        }`}>
                          {compte.soldeFinal >= 0 ? '+' : ''}{compte.soldeFinal.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lignes du compte */}
                  <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-lg">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Journal
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            N° Pièce
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Libellé
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Débit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Crédit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Solde
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {compte.lignes.map((ligne, ligneIdx) => (
                          <tr
                            key={ligneIdx}
                            onClick={() => router.push(`/ecritures/${ligne.ecritureId}`)}
                            className="hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">
                              {new Date(ligne.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                              {ligne.journal}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-700">
                              {ligne.numeroPiece}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {ligne.libelle}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                              {ligne.debit > 0 ? ligne.debit.toFixed(2) : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                              {ligne.credit > 0 ? ligne.credit.toFixed(2) : ''}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                              ligne.solde >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {ligne.solde.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="mt-6 text-sm text-gray-600">
                <p>{filteredGrandLivre.length} compte{filteredGrandLivre.length > 1 ? 's' : ''} affiché{filteredGrandLivre.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
