import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../../../components/TopMenu';
import { useEntreprise } from '../../../contexts/EntrepriseContext';
import { ecrituresApi, type Ecriture } from '../../../api/ecritures';
import { journauxApi, type Journal } from '../../../api/journaux';
import EditableCell from '../../../components/EditableCell';

interface EcritureParMois {
  mois: string; // "2025-01"
  ecritures: Ecriture[];
  totalDebit: number;
  totalCredit: number;
}

export default function JournalEcrituresPage() {
  const router = useRouter();
  const { code, dateDebut, dateFin } = router.query;
  const { entreprise, exercice } = useEntreprise();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [ecrituresParMois, setEcrituresParMois] = useState<EcritureParMois[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entreprise || !exercice) {
      router.push('/selection-entreprise');
      return;
    }
    if (code) {
      loadData();
    }
  }, [entreprise, exercice, code, dateDebut, dateFin]);

  const loadData = async () => {
    if (!entreprise || !exercice || !code) return;

    try {
      setLoading(true);

      // Charger le journal
      const journaux = await journauxApi.findByEntreprise(entreprise.id);
      const foundJournal = journaux.find(j => j.code === code);
      if (!foundJournal) {
        alert(`Journal ${code} non trouvé`);
        router.push('/journaux-list');
        return;
      }
      setJournal(foundJournal);

      // Charger les écritures du journal avec filtres de date
      const ecrituresJournal = await ecrituresApi.getAll(
        entreprise.id,
        exercice.id,
        foundJournal.id,
        dateDebut as string | undefined,
        dateFin as string | undefined
      );

      // Grouper par mois
      const grouped = groupByMonth(ecrituresJournal);
      setEcrituresParMois(grouped);
    } catch (err) {
      console.error('Erreur lors du chargement des écritures:', err);
      alert('Erreur lors du chargement des écritures');
    } finally {
      setLoading(false);
    }
  };

  const groupByMonth = (ecritures: Ecriture[]): EcritureParMois[] => {
    // Trier par date
    const sorted = [...ecritures].sort((a, b) =>
      new Date(a.date_ecriture).getTime() - new Date(b.date_ecriture).getTime()
    );

    // Grouper par mois
    const map = new Map<string, Ecriture[]>();
    sorted.forEach(ecriture => {
      const date = new Date(ecriture.date_ecriture);
      const mois = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!map.has(mois)) {
        map.set(mois, []);
      }
      map.get(mois)!.push(ecriture);
    });

    // Convertir en tableau avec totaux
    return Array.from(map.entries()).map(([mois, ecritures]) => {
      let totalDebit = 0;
      let totalCredit = 0;

      ecritures.forEach(ecriture => {
        ecriture.lignes.forEach(ligne => {
          totalDebit += Number(ligne.debit) || 0;
          totalCredit += Number(ligne.credit) || 0;
        });
      });

      return {
        mois,
        ecritures,
        totalDebit,
        totalCredit,
      };
    });
  };

  const formatMois = (mois: string) => {
    const [year, month] = mois.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  // Fonctions de sauvegarde pour les cellules éditables
  const handleUpdateEcriture = async (ecritureId: number, field: string, value: string | number) => {
    try {
      const ecriture = ecrituresParMois
        .flatMap(g => g.ecritures)
        .find(e => e.id === ecritureId);

      if (!ecriture) return;

      const updatedData: any = { ...ecriture, [field]: value };
      await ecrituresApi.update(ecritureId, updatedData);

      // Recharger les données
      await loadData();
    } catch (error) {
      console.error('Erreur mise à jour écriture:', error);
      throw error;
    }
  };

  const handleUpdateLigne = async (ecritureId: number, ligneId: number, field: string, value: string | number) => {
    try {
      // Ici il faudra une API pour mettre à jour une ligne spécifique
      // Pour l'instant on met à jour toute l'écriture
      const ecriture = ecrituresParMois
        .flatMap(g => g.ecritures)
        .find(e => e.id === ecritureId);

      if (!ecriture) return;

      const updatedLignes = ecriture.lignes.map(l => {
        if (l.id === ligneId) {
          return { ...l, [field]: value };
        }
        return l;
      });

      await ecrituresApi.update(ecritureId, { ...ecriture, lignes: updatedLignes });

      // Recharger les données
      await loadData();
    } catch (error) {
      console.error('Erreur mise à jour ligne:', error);
      throw error;
    }
  };

  if (!entreprise || !exercice) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.push('/journaux-list')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                Écritures du journal {code}
              </h2>
            </div>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              {journal && (
                <span className="ml-4">
                  Journal : <span className="font-semibold">{journal.libelle}</span>
                </span>
              )}
              {exercice && (
                <span className="ml-4">
                  Exercice : {new Date(exercice.date_debut).getFullYear()}
                </span>
              )}
            </p>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : ecrituresParMois.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune écriture trouvée pour ce journal sur cet exercice
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pour chaque mois */}
              {ecrituresParMois.map((groupe) => (
                <div key={groupe.mois} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header du mois */}
                  <div className="bg-blue-600 text-white px-6 py-3">
                    <h3 className="text-lg font-bold">
                      📅 {formatMois(groupe.mois)}
                    </h3>
                    <p className="text-sm text-blue-100">
                      {groupe.ecritures.length} écriture{groupe.ecritures.length > 1 ? 's' : ''} -
                      Débit: {groupe.totalDebit.toFixed(2)} € -
                      Crédit: {groupe.totalCredit.toFixed(2)} €
                    </p>
                  </div>

                  {/* Table des écritures */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pièce</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé écriture</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débit</th>
                          <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {groupe.ecritures.map((ecriture) => {
                          // Calculer l'équilibre de l'écriture
                          const totalDebit = ecriture.lignes.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
                          const totalCredit = ecriture.lignes.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
                          const isEquilibre = Math.abs(totalDebit - totalCredit) < 0.01;

                          return ecriture.lignes.map((ligne, idx) => (
                            <tr key={`${ecriture.id}-${idx}`} className={`hover:bg-blue-50 ${!isEquilibre ? 'bg-red-50' : ''}`}>
                              <td className="px-3 py-3 text-xs font-mono text-gray-500">
                                {ecriture.id ? `E${String(ecriture.id).padStart(4, '0')}` : ''}
                              </td>
                              <td className="px-1 py-1">
                                <EditableCell
                                  value={ecriture.date_ecriture}
                                  type="date"
                                  className="text-sm text-gray-700"
                                  onSave={(val) => handleUpdateEcriture(ecriture.id!, 'date_ecriture', val)}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <EditableCell
                                  value={ecriture.numero_piece}
                                  className="text-sm font-mono text-gray-700"
                                  onSave={(val) => handleUpdateEcriture(ecriture.id!, 'numero_piece', val)}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <EditableCell
                                  value={ligne.numero_compte}
                                  className="text-sm font-mono text-blue-600 font-semibold"
                                  onSave={(val) => handleUpdateLigne(ecriture.id!, ligne.id!, 'numero_compte', val)}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <EditableCell
                                  value={ecriture.libelle}
                                  className="text-sm text-gray-700"
                                  onSave={(val) => handleUpdateEcriture(ecriture.id!, 'libelle', val)}
                                />
                                {!isEquilibre && idx === 0 && (
                                  <span className="ml-2 text-xs text-red-600 font-semibold">
                                    ⚠️ Non équilibré
                                  </span>
                                )}
                              </td>
                              <td className="px-1 py-1 text-right">
                                <EditableCell
                                  value={Number(ligne.debit) || 0}
                                  type="number"
                                  className="text-sm font-mono text-gray-900 text-right"
                                  onSave={(val) => handleUpdateLigne(ecriture.id!, ligne.id!, 'debit', val)}
                                />
                              </td>
                              <td className="px-1 py-1 text-right">
                                <EditableCell
                                  value={Number(ligne.credit) || 0}
                                  type="number"
                                  className="text-sm font-mono text-gray-900 text-right"
                                  onSave={(val) => handleUpdateLigne(ecriture.id!, ligne.id!, 'credit', val)}
                                />
                              </td>
                            </tr>
                          ));
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                          <td colSpan={5} className="px-3 py-3 text-right text-sm text-gray-700">
                            Total du mois :
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-blue-600 font-mono">
                            {groupe.totalDebit.toFixed(2)} €
                          </td>
                          <td className="px-3 py-3 text-right text-sm text-blue-600 font-mono">
                            {groupe.totalCredit.toFixed(2)} €
                          </td>
                        </tr>
                        {Math.abs(groupe.totalDebit - groupe.totalCredit) >= 0.01 && (
                          <tr className="bg-red-100">
                            <td colSpan={7} className="px-3 py-2 text-center text-sm text-red-700 font-semibold">
                              ⚠️ ATTENTION : Le mois n'est pas équilibré (différence : {Math.abs(groupe.totalDebit - groupe.totalCredit).toFixed(2)} €)
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))}

              {/* Total général */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-blue-900 mb-4">
                  📊 Total général - Journal {code}
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Nombre d'écritures</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {ecrituresParMois.reduce((sum, g) => sum + g.ecritures.length, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Débit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {ecrituresParMois.reduce((sum, g) => sum + g.totalDebit, 0).toFixed(2)} €
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Crédit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {ecrituresParMois.reduce((sum, g) => sum + g.totalCredit, 0).toFixed(2)} €
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Équilibre</p>
                    {(() => {
                      const totalD = ecrituresParMois.reduce((sum, g) => sum + g.totalDebit, 0);
                      const totalC = ecrituresParMois.reduce((sum, g) => sum + g.totalCredit, 0);
                      const diff = Math.abs(totalD - totalC);
                      return diff < 0.01 ? (
                        <p className="text-2xl font-bold text-green-600">✅ OK</p>
                      ) : (
                        <p className="text-2xl font-bold text-red-600">❌ {diff.toFixed(2)} €</p>
                      );
                    })()}
                  </div>
                </div>
                {(() => {
                  const totalD = ecrituresParMois.reduce((sum, g) => sum + g.totalDebit, 0);
                  const totalC = ecrituresParMois.reduce((sum, g) => sum + g.totalCredit, 0);
                  return Math.abs(totalD - totalC) >= 0.01 && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
                      <strong>⚠️ ALERTE :</strong> Le journal n'est pas équilibré. Vérifiez les écritures marquées en rouge.
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
