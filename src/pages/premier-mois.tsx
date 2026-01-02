import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { ecrituresApi, type Ecriture } from '../api/ecritures';

export default function PremierMoisPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');

  useEffect(() => {
    if (!entreprise || !exercice) {
      router.push('/selection-entreprise');
      return;
    }

    // Calculer le premier mois de l'exercice
    const debut = new Date(exercice.date_debut);
    const finPremierMois = new Date(debut.getFullYear(), debut.getMonth() + 1, 0); // Dernier jour du mois

    setDateDebut(exercice.date_debut);
    setDateFin(finPremierMois.toISOString().split('T')[0]);

    loadEcritures();
  }, [entreprise, exercice, router]);

  const loadEcritures = async () => {
    if (!entreprise || !exercice) return;

    try {
      setLoading(true);

      // ⚙️ Calculer le premier mois en "YYYY-MM-DD"
      const debutStr = exercice.date_debut.substring(0, 10);
      const debut = new Date(debutStr + 'T00:00:00');

      const finPremierMoisDate = new Date(debut);
      finPremierMoisDate.setMonth(finPremierMoisDate.getMonth() + 1);
      finPremierMoisDate.setDate(0); // dernier jour du mois
      finPremierMoisDate.setHours(23, 59, 59, 999);

      const finStr = finPremierMoisDate.toISOString().substring(0, 10);

      console.log('[Premier mois] Filtrage SQL avec dateDebut:', debutStr, 'dateFin:', finStr);

      // 🔥 Filtrer directement en SQL au lieu de charger toutes les écritures
      const data = await ecrituresApi.getAll(
        entreprise.id,
        exercice.id,
        undefined, // journalId
        debutStr,  // dateDebut
        finStr,    // dateFin
      );

      console.log('[Premier mois] Écritures du premier mois:', data.length);

      // Trier par ordre chronologique (ASC) au lieu de DESC
      const sorted = data.sort((a: Ecriture, b: Ecriture) => {
        const dateA = new Date(a.date_ecriture).getTime();
        const dateB = new Date(b.date_ecriture).getTime();
        if (dateA !== dateB) return dateA - dateB;
        // Si même date, trier par ID
        return (a.id || 0) - (b.id || 0);
      });

      setEcritures(sorted);
    } catch (err) {
      console.error('Erreur lors du chargement des écritures:', err);
      alert('Erreur lors du chargement des écritures du premier mois');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette écriture ?')) return;

    try {
      await ecrituresApi.delete(id);
      await loadEcritures();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de l\'écriture');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getTotalDebit = (lignes: any[]) => {
    return lignes.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  };

  const getTotalCredit = (lignes: any[]) => {
    return lignes.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  };

  if (!entreprise || !exercice) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Premier mois de l'exercice</h2>
            <p className="text-gray-600 mt-2">
              Période : {formatDate(dateDebut)} au {formatDate(dateFin)}
            </p>
            <p className="text-sm text-gray-500">
              {ecritures.length} écriture{ecritures.length > 1 ? 's' : ''}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement...</p>
            </div>
          ) : ecritures.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune écriture pour le premier mois de cet exercice
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Journal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pièce</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ecritures.map((ecriture) => {
                    const totalDebit = getTotalDebit(ecriture.lignes);
                    const totalCredit = getTotalCredit(ecriture.lignes);
                    const isEquilibre = Math.abs(totalDebit - totalCredit) < 0.01;

                    return (
                      <tr
                        key={ecriture.id}
                        className={`hover:bg-blue-50 ${!isEquilibre ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(ecriture.date_ecriture)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                          {ecriture.journal?.code || ecriture.journal_id}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">
                          {ecriture.numero_piece}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ecriture.libelle}
                          {!isEquilibre && (
                            <span className="ml-2 text-xs text-red-600 font-semibold">
                              ⚠️ Non équilibré
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {totalDebit.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {totalCredit.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-sm text-right space-x-2">
                          <button
                            onClick={() => router.push(`/premier-mois/edit/${ecriture.id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(ecriture.id!)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
