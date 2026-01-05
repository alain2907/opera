import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEntreprises,
  getAllExercices,
  getAllEcritures,
  getAllComptes,
} from '../../lib/storageAdapter';

export default function RechercheEcrituresPWA() {
  const router = useRouter();

  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [ecrituresFiltrees, setEcrituresFiltrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [sortColumn, setSortColumn] = useState<'date' | 'journal' | 'compte' | 'pieceRef' | 'libelle' | 'debit' | 'credit'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [ecritureDetaillee, setEcritureDetaillee] = useState<any>(null);
  const [toutesLignesEcriture, setToutesLignesEcriture] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadExercices();
    }
  }, [selectedEntreprise]);

  useEffect(() => {
    if (selectedExercice) {
      loadEcritures();
    }
  }, [selectedExercice]);

  async function loadData() {
    try {
      const [entData, comptesData] = await Promise.all([
        getAllEntreprises(),
        getAllComptes()
      ]);
      setEntreprises(entData);
      setComptes(comptesData);

      // Entreprise active par défaut
      const entrepriseActiveId = localStorage.getItem('pwa_entreprise_active_id');
      if (entrepriseActiveId) {
        setSelectedEntreprise(Number(entrepriseActiveId));
      } else if (entData.length > 0) {
        setSelectedEntreprise(entData[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  }

  async function loadExercices() {
    if (!selectedEntreprise) return;

    try {
      const exData = await getAllExercices();
      const exercicesFiltered = exData.filter((ex: any) => {
        const entId = ex.entrepriseId || ex.entreprise_id;
        return entId === selectedEntreprise;
      });
      setExercices(exercicesFiltered);

      // Exercice actif par défaut
      const exerciceActiveId = localStorage.getItem('pwa_exercice_actif_id');
      if (exerciceActiveId) {
        const exerciceFound = exercicesFiltered.find((ex: any) => ex.id === Number(exerciceActiveId));
        if (exerciceFound) {
          setSelectedExercice(Number(exerciceActiveId));
        } else if (exercicesFiltered.length > 0) {
          setSelectedExercice(exercicesFiltered[0].id);
        }
      } else if (exercicesFiltered.length > 0) {
        setSelectedExercice(exercicesFiltered[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  }

  async function loadEcritures() {
    if (!selectedExercice) return;

    setLoading(true);
    try {
      const allEcritures = await getAllEcritures();

      // Filtrer par exercice
      const filtered = allEcritures.filter((e: any) => {
        const exId = e.exerciceId || e.exercice_id;
        return exId === selectedExercice;
      });

      setEcritures(filtered);
      setEcrituresFiltrees(filtered);
    } catch (error) {
      console.error('Erreur chargement écritures:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!searchTerm.trim()) {
      setEcrituresFiltrees(ecritures);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = ecritures.filter((e: any) => {
      const libelle = (e.libelle || '').toLowerCase();
      const pieceRef = (e.pieceRef || e.piece_ref || '').toLowerCase();
      const compte = (e.compteNumero || e.compte_numero || '').toLowerCase();
      const journal = (e.journal || '').toLowerCase();

      // Trouver le nom du compte
      const compteData = comptes.find((c: any) => (c.numero || c.numeroCompte) === (e.compteNumero || e.compte_numero));
      const nomCompte = (compteData?.nom || compteData?.libelle || '').toLowerCase();

      return libelle.includes(term) ||
             pieceRef.includes(term) ||
             compte.includes(term) ||
             nomCompte.includes(term) ||
             journal.includes(term);
    });

    setEcrituresFiltrees(filtered);
  }, [searchTerm, ecritures, comptes]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedEcritures = () => {
    return [...ecrituresFiltrees].sort((a: any, b: any) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'date':
          aValue = a.date;
          bValue = b.date;
          break;
        case 'journal':
          aValue = a.journal || '';
          bValue = b.journal || '';
          break;
        case 'compte':
          aValue = a.compteNumero || a.compte_numero || '';
          bValue = b.compteNumero || b.compte_numero || '';
          break;
        case 'pieceRef':
          aValue = a.pieceRef || a.piece_ref || '';
          bValue = b.pieceRef || b.piece_ref || '';
          break;
        case 'libelle':
          aValue = a.libelle || '';
          bValue = b.libelle || '';
          break;
        case 'debit':
          aValue = a.debit || 0;
          bValue = b.debit || 0;
          break;
        case 'credit':
          aValue = a.credit || 0;
          bValue = b.credit || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const getCompteNom = (numeroCompte: string) => {
    const compte = comptes.find((c: any) => (c.numero || c.numeroCompte) === numeroCompte);
    return compte?.nom || compte?.libelle || '';
  };

  const chargerDetailEcriture = async (ecriture: any) => {
    try {
      const pieceRef = ecriture.pieceRef || ecriture.piece_ref;
      const numeroEcriture = ecriture.numeroEcriture;

      let lignesEcriture: any[];

      if (numeroEcriture) {
        // Filtrer par numeroEcriture
        lignesEcriture = ecritures.filter((e: any) => e.numeroEcriture === numeroEcriture);
      } else if (pieceRef) {
        // Filtrage intelligent : relevés mensuels SANS date, autres AVEC date
        const isReleveMensuel = /^(Relevé|banque|BANQUE)/i.test(pieceRef);
        const principalJournal = ecriture.journal || '';

        lignesEcriture = ecritures.filter((e: any) => {
          const ref = e.pieceRef || e.piece_ref;
          const eJournal = e.journal || '';
          const eDate = e.date;

          if (isReleveMensuel) {
            // Relevé mensuel : même pieceRef + même journal (SANS date)
            return ref === pieceRef && eJournal === principalJournal;
          } else {
            // Écriture normale : même pieceRef + même date + même journal
            return ref === pieceRef && eDate === ecriture.date && eJournal === principalJournal;
          }
        });
      } else {
        // Fallback: juste cette ligne
        lignesEcriture = [ecriture];
      }

      // Trier par ordre d'insertion (id)
      lignesEcriture.sort((a: any, b: any) => (a.id || 0) - (b.id || 0));

      setEcritureDetaillee(ecriture);
      setToutesLignesEcriture(lignesEcriture);
    } catch (err) {
      console.error('Erreur chargement détail écriture:', err);
    }
  };

  const entrepriseActive = entreprises.find(e => e.id === selectedEntreprise);
  const exerciceActif = exercices.find(ex => ex.id === selectedExercice);

  const totalDebit = ecrituresFiltrees.reduce((sum, e: any) => sum + (e.debit || 0), 0);
  const totalCredit = ecrituresFiltrees.reduce((sum, e: any) => sum + (e.credit || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <PWANavbar />

      <div className="max-w-7xl mx-auto p-8 pt-24">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* En-tête */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Recherche dans les écritures</h1>
            <p className="text-gray-600">Recherchez dans tous les champs : libellé, pièce, compte, journal...</p>
            {entrepriseActive && exerciceActif && (
              <div className="text-lg font-bold text-blue-600 mt-2">
                Entreprise : {entrepriseActive.raison_sociale || entrepriseActive.nom}
                {' • '}
                Exercice : {exerciceActif.annee} {exerciceActif.cloture ? '(Clôturé)' : '(En cours)'}
              </div>
            )}
          </div>

          {/* Sélecteurs */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Entreprise
              </label>
              <select
                value={selectedEntreprise || ''}
                onChange={(e) => setSelectedEntreprise(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                {entreprises.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.raison_sociale || ent.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Exercice
              </label>
              <select
                value={selectedExercice || ''}
                onChange={(e) => setSelectedExercice(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Sélectionner --</option>
                {exercices.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.annee} {ex.cloture ? '(Clôturé)' : '(En cours)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Champ de recherche */}
          {ecritures.length > 0 && (
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Rechercher dans toutes les écritures (libellé, pièce, compte, journal, nom du compte)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-4 pl-10 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-green-600 text-lg">{ecrituresFiltrees.length}</span> résultat(s) trouvé(s) sur {ecritures.length} écriture(s)
                  </p>
                  {ecrituresFiltrees.length > 0 && (
                    <p className="text-sm text-gray-600">
                      Total: <span className="font-semibold text-green-600">{formatMontant(totalDebit)} €</span> débit •
                      <span className="font-semibold text-red-600 ml-2">{formatMontant(totalCredit)} €</span> crédit
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Résultats */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : ecritures.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-lg">Sélectionnez un exercice pour commencer</p>
            </div>
          ) : ecrituresFiltrees.length === 0 && searchTerm ? (
            <div className="text-center py-12 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-700 text-lg font-semibold">Aucun résultat trouvé</p>
              <p className="text-yellow-600 text-sm mt-2">Essayez avec d'autres mots-clés</p>
            </div>
          ) : searchTerm && ecrituresFiltrees.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-green-800"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortColumn === 'date' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-green-800"
                      onClick={() => handleSort('journal')}
                    >
                      <div className="flex items-center gap-1">
                        Journal
                        {sortColumn === 'journal' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      N° Écriture
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-green-800"
                      onClick={() => handleSort('compte')}
                    >
                      <div className="flex items-center gap-1">
                        Compte
                        {sortColumn === 'compte' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-green-800"
                      onClick={() => handleSort('pieceRef')}
                    >
                      <div className="flex items-center gap-1">
                        N° Pièce
                        {sortColumn === 'pieceRef' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-green-800"
                      onClick={() => handleSort('libelle')}
                    >
                      <div className="flex items-center gap-1">
                        Libellé
                        {sortColumn === 'libelle' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-green-800"
                      onClick={() => handleSort('debit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Débit
                        {sortColumn === 'debit' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-green-800"
                      onClick={() => handleSort('credit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Crédit
                        {sortColumn === 'credit' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getSortedEcritures().map((ecriture: any, index) => (
                    <tr
                      key={ecriture.id || index}
                      className="hover:bg-green-50 transition-colors cursor-pointer"
                      onClick={() => chargerDetailEcriture(ecriture)}
                      title="Cliquer pour voir le détail de l'écriture complète"
                    >
                      <td className="px-4 py-3 text-sm">
                        {formatDate(ecriture.date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">
                        {ecriture.journal}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-purple-600 font-semibold">
                        {ecriture.numeroEcriture || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-mono font-bold text-gray-900">
                          {ecriture.compteNumero || ecriture.compte_numero}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getCompteNom(ecriture.compteNumero || ecriture.compte_numero)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {ecriture.pieceRef || ecriture.piece_ref || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {ecriture.libelle}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                        {ecriture.debit ? formatMontant(ecriture.debit) + ' €' : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-red-700">
                        {ecriture.credit ? formatMontant(ecriture.credit) + ' €' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-green-100 font-bold border-t-2 border-green-300">
                    <td colSpan={6} className="px-4 py-3 text-sm text-right">
                      TOTAUX ({ecrituresFiltrees.length} écriture(s))
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totalDebit)} €
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-red-700">
                      {formatMontant(totalCredit)} €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-lg">👆 Utilisez le champ de recherche ci-dessus</p>
              <p className="text-gray-400 text-sm mt-2">{ecritures.length} écriture(s) disponible(s) dans cet exercice</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Détail Écriture */}
      {ecritureDetaillee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => setEcritureDetaillee(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-green-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    📝 Détail de l'écriture
                  </h2>
                  <p className="text-sm text-green-100">
                    Date: {formatDate(ecritureDetaillee.date)} |
                    Journal: {ecritureDetaillee.journal} |
                    N° Pièce: {ecritureDetaillee.pieceRef || ecritureDetaillee.piece_ref || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => setEcritureDetaillee(null)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Table toutes les lignes */}
            <div className="p-6 overflow-auto max-h-[calc(85vh-180px)]">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-sm">Compte</th>
                    <th className="text-left p-3 font-semibold text-sm">Nom du compte</th>
                    <th className="text-left p-3 font-semibold text-sm">Libellé</th>
                    <th className="text-right p-3 font-semibold text-sm">Débit</th>
                    <th className="text-right p-3 font-semibold text-sm">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {toutesLignesEcriture.map((ligne, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm font-mono font-semibold">
                        {ligne.compteNumero || ligne.compte_numero}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {getCompteNom(ligne.compteNumero || ligne.compte_numero)}
                      </td>
                      <td className="p-3 text-sm">{ligne.libelle || '-'}</td>
                      <td className="p-3 text-sm text-right font-mono">
                        {ligne.debit ? `${formatMontant(ligne.debit)} €` : '-'}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {ligne.credit ? `${formatMontant(ligne.credit)} €` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">TOTAL</td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(toutesLignesEcriture.reduce((sum, l) => sum + (l.debit || 0), 0))} €
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(toutesLignesEcriture.reduce((sum, l) => sum + (l.credit || 0), 0))} €
                    </td>
                  </tr>
                </tfoot>
              </table>

              {toutesLignesEcriture.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune ligne trouvée</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
