import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEcritures,
  getAllExercices,
  getAllEntreprises,
  getAllComptes,
} from '../../lib/storageAdapter';

interface Ecriture {
  id: number;
  date: string;
  journal: string;
  pieceRef?: string;
  piece_ref?: string;
  libelle: string;
  debit?: number;
  credit?: number;
  compteNumero?: string;
  compte_numero?: string;
  exerciceId?: number;
  exercice_id?: number;
}

export default function ExtraitComptePWA() {
  const router = useRouter();
  const { compte, exercice: exerciceParam } = router.query;

  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomCompte, setNomCompte] = useState('');
  const [solde, setSolde] = useState(0);
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [selectedExerciceId, setSelectedExerciceId] = useState<number | null>(null);
  const [comptes, setComptes] = useState<any[]>([]);
  const [sortColumn, setSortColumn] = useState<'date' | 'journal' | 'pieceRef' | 'libelle' | 'debit' | 'credit' | 'solde'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (compte && router.isReady) {
      if (exerciceParam) {
        setSelectedExerciceId(Number(exerciceParam));
      }
      loadEcritures();
    }
  }, [compte, selectedExerciceId, router.isReady]);

  async function loadData() {
    const [entData, exData, comptesData] = await Promise.all([
      getAllEntreprises(),
      getAllExercices(),
      getAllComptes()
    ]);
    setEntreprises(entData);
    setExercices(exData);
    setComptes(comptesData.sort((a: any, b: any) => a.numero.localeCompare(b.numero)));
  }

  async function loadEcritures() {
    if (!compte) return;

    setLoading(true);
    try {
      const allEcritures = await getAllEcritures();

      // Filtrer par compte
      let filtered = allEcritures.filter((e: Ecriture) => {
        const compteNumero = e.compteNumero || e.compte_numero;
        return compteNumero === compte;
      });

      // Filtrer par exercice si sélectionné
      if (selectedExerciceId) {
        filtered = filtered.filter((e: Ecriture) => {
          const exId = e.exerciceId || e.exercice_id;
          return exId === selectedExerciceId;
        });
      }

      // Trier par date
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculer solde progressif
      let soldeProgressif = 0;
      const ecrituresAvecSolde = filtered.map((e) => {
        soldeProgressif += (e.debit || 0) - (e.credit || 0);
        return {
          ...e,
          soldeProgressif
        };
      });

      setEcritures(ecrituresAvecSolde as any);
      setSolde(soldeProgressif);

      // Récupérer le nom du compte depuis la première écriture
      if (filtered.length > 0) {
        setNomCompte(router.query.nom as string || compte as string);
      }
    } catch (error) {
      console.error('Erreur chargement écritures:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
  }

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedEcritures = () => {
    const sorted = [...ecritures].sort((a: any, b: any) => {
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
        case 'solde':
          aValue = a.soldeProgressif || 0;
          bValue = b.soldeProgressif || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PWANavbar />

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* En-tête */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 mb-2">
                📖 Extrait de compte {compte}
              </h1>
              <p className="text-gray-600 mb-1">{nomCompte}</p>
              {selectedExerciceId && exercices.length > 0 && (
                <div className="text-lg font-bold text-blue-600">
                  {(() => {
                    const exercice = exercices.find(ex => ex.id === selectedExerciceId);
                    if (!exercice) return null;
                    const entrepriseId = exercice.entrepriseId || exercice.entreprise_id;
                    const entreprise = entreprises.find(ent => ent.id === entrepriseId);
                    return (
                      <>
                        Entreprise : {entreprise?.raison_sociale || entreprise?.nom || 'N/A'}
                        {' • '}
                        Exercice : {exercice.annee} {exercice.cloture ? '(Clôturé)' : '(En cours)'}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Retour
            </button>
          </div>

          {/* Filtres */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Compte
              </label>
              <select
                value={compte || ''}
                onChange={(e) => {
                  const nouveauCompte = e.target.value;
                  const compteData = comptes.find(c => c.numero === nouveauCompte);
                  if (nouveauCompte) {
                    router.push(`/pwa/extrait-compte?compte=${nouveauCompte}&nom=${encodeURIComponent(compteData?.nom || nouveauCompte)}&exercice=${selectedExerciceId || ''}`);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              >
                <option value="">-- Sélectionner un compte --</option>
                {comptes.map((c) => (
                  <option key={c.numero} value={c.numero}>
                    {c.numero} - {c.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Exercice
              </label>
              <select
                value={selectedExerciceId || ''}
                onChange={(e) => setSelectedExerciceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les exercices</option>
                {exercices.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.annee} {ex.cloture ? '(Clôturé)' : '(En cours)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="bg-blue-50 p-4 rounded-lg w-full">
                <p className="text-sm text-gray-600">Solde au {new Date().toLocaleDateString('fr-FR')}</p>
                <p className={`text-2xl font-bold ${solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMontant(Math.abs(solde))} € {solde >= 0 ? 'Débiteur' : 'Créditeur'}
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          ) : ecritures.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune écriture trouvée pour ce compte</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-800"
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
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-800"
                      onClick={() => handleSort('journal')}
                    >
                      <div className="flex items-center gap-1">
                        Journal
                        {sortColumn === 'journal' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-800"
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
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-blue-800"
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
                      className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-800"
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
                      className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-800"
                      onClick={() => handleSort('credit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Crédit
                        {sortColumn === 'credit' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-blue-800"
                      onClick={() => handleSort('solde')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Solde
                        {sortColumn === 'solde' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getSortedEcritures().map((ecriture: any, index) => {
                    // Extraire le mois de la date de l'écriture
                    const moisEcriture = ecriture.date ? ecriture.date.substring(0, 7) : '';
                    const journal = ecriture.journal || '';

                    // Trouver l'entreprise de l'exercice
                    const exercice = exercices.find(ex => ex.id === selectedExerciceId);
                    const entrepriseId = exercice ? (exercice.entrepriseId || exercice.entreprise_id) : null;

                    return (
                    <tr
                      key={ecriture.id || index}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Rediriger vers consultation-journaux avec les filtres appropriés
                        const params = new URLSearchParams({
                          journal,
                          month: moisEcriture,
                          exercice: String(selectedExerciceId || ''),
                          entreprise: String(entrepriseId || ''),
                        });
                        router.push(`/pwa/consultation-journaux?${params.toString()}`);
                      }}
                    >
                      <td className="px-4 py-3 text-sm">
                        {new Date(ecriture.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {ecriture.journal}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {ecriture.pieceRef || ecriture.piece_ref || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {ecriture.libelle}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                        {ecriture.debit ? formatMontant(ecriture.debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-red-700">
                        {ecriture.credit ? formatMontant(ecriture.credit) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                        ecriture.soldeProgressif >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatMontant(Math.abs(ecriture.soldeProgressif))} {ecriture.soldeProgressif >= 0 ? 'D' : 'C'}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Total */}
          {ecritures.length > 0 && (
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold text-gray-700">
                  {ecritures.length} écriture(s)
                </p>
                <p className="text-lg font-semibold text-gray-700">
                  Solde final : <span className={solde >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatMontant(Math.abs(solde))} € {solde >= 0 ? 'Débiteur' : 'Créditeur'}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
