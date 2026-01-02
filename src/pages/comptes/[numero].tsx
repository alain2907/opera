import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../../components/TopMenu';
import { ecrituresApi, type Ecriture } from '../../api/ecritures';
import { comptesApi, type Compte } from '../../api/comptes';
import { journauxApi, type Journal } from '../../api/journaux';
import { useEntreprise } from '../../contexts/EntrepriseContext';

interface Mouvement {
  date: string;
  journal: string;
  piece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  ecritureId: number;
}

export default function CompteDetailPage() {
  const router = useRouter();
  const { numero } = router.query;
  const { entreprise, exercice } = useEntreprise();
  const [compte, setCompte] = useState<Compte | null>(null);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLibelle, setEditedLibelle] = useState('');
  const [journaux, setJournaux] = useState<Journal[]>([]);

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
    }
  }, [entreprise, router]);

  useEffect(() => {
    if (entreprise) {
      loadJournaux(entreprise.id);
    }
  }, [entreprise]);

  useEffect(() => {
    if (entreprise && exercice && numero && journaux.length > 0) {
      loadCompte();
      loadMouvements();
    }
  }, [entreprise, exercice, numero, journaux]);

  const loadCompte = async () => {
    if (!entreprise || !exercice) return;

    try {
      const comptes = await comptesApi.getAll(entreprise.id, exercice.id);
      const compteFound = comptes.find(c => c.numero_compte === numero);
      setCompte(compteFound || null);
      setEditedLibelle(compteFound?.libelle || '');
    } catch (err) {
      console.error('Erreur chargement compte:', err);
    }
  };

  const loadMouvements = async () => {
    if (!entreprise || !exercice) return;

    setLoading(true);
    try {
      const ecritures = await ecrituresApi.getAll(entreprise.id, exercice.id);

      const mouvementsData: Mouvement[] = [];
      let solde = 0;

      // Trier les écritures par date
      const ecrituresSorted = ecritures.sort((a, b) =>
        new Date(a.date_ecriture).getTime() - new Date(b.date_ecriture).getTime()
      );

      ecrituresSorted.forEach((ecriture: Ecriture) => {
        ecriture.lignes.forEach((ligne) => {
          if (ligne.numero_compte === numero) {
            const debit = Number(ligne.debit) || 0;
            const credit = Number(ligne.credit) || 0;
            solde += debit - credit;

            mouvementsData.push({
              date: ecriture.date_ecriture,
              journal: getJournalName(ecriture.journal_id),
              piece: ecriture.numero_piece || '-',
              libelle: ligne.libelle_compte,
              debit,
              credit,
              solde,
              ecritureId: ecriture.id!,
            });
          }
        });
      });

      setMouvements(mouvementsData);
    } catch (err) {
      console.error('Erreur chargement mouvements:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJournaux = async (entrepriseId: number) => {
    try {
      const data = await journauxApi.findByEntreprise(entrepriseId);
      setJournaux(data);
    } catch (err) {
      console.error('Erreur chargement journaux:', err);
    }
  };

  const getJournalName = (journalId: number) => {
    const journal = journaux.find(j => j.id === journalId);
    return journal?.code || `J${journalId}`;
  };

  const handleSaveLibelle = async () => {
    if (!compte?.id) return;

    try {
      await comptesApi.update(compte.id, {
        ...compte,
        libelle: editedLibelle,
      });
      setCompte({ ...compte, libelle: editedLibelle });
      setIsEditing(false);
    } catch (err) {
      console.error('Erreur sauvegarde libellé:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const totaux = mouvements.reduce(
    (acc, mvt) => ({
      debit: acc.debit + mvt.debit,
      credit: acc.credit + mvt.credit,
    }),
    { debit: 0, credit: 0 }
  );

  const soldeFinal = totaux.debit - totaux.credit;

  if (!entreprise) {
    return null;
  }

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
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* En-tête du compte */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Compte {numero}
                </h2>
                {isEditing ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={editedLibelle}
                      onChange={(e) => setEditedLibelle(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Libellé du compte"
                    />
                    <button
                      onClick={handleSaveLibelle}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedLibelle(compte?.libelle || '');
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <p className="text-gray-600 text-lg">{compte?.libelle || 'Compte sans libellé'}</p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      ✏️ Modifier
                    </button>
                  </div>
                )}
                {entreprise && (
                  <p className="text-sm text-gray-500 mt-2">
                    Entreprise : {entreprise.raison_sociale}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">Solde</p>
                <p className={`text-3xl font-bold ${
                  soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {soldeFinal.toFixed(2)} €
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {soldeFinal >= 0 ? 'Débiteur' : 'Créditeur'}
                </p>
              </div>
            </div>
          </div>

          {/* Info exercice */}
          <div className="mb-6">
            <p className="text-sm text-gray-700">
              Exercice : <span className="font-semibold">{exercice?.annee}</span>
              {' '}({new Date(exercice?.date_debut || '').toLocaleDateString('fr-FR')} - {new Date(exercice?.date_fin || '').toLocaleDateString('fr-FR')})
            </p>
          </div>

          {/* Liste des mouvements */}
          {mouvements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun mouvement pour ce compte sur cet exercice</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Journal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      N° Pièce
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Libellé
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Débit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Crédit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Solde
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mouvements.map((mvt, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(mvt.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">{mvt.journal}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{mvt.piece}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{mvt.libelle}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {mvt.debit > 0 ? mvt.debit.toFixed(2) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {mvt.credit > 0 ? mvt.credit.toFixed(2) : ''}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                        mvt.solde >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {mvt.solde.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => router.push(`/journaux-edition?ecriture=${mvt.ecritureId}`)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Ligne de totaux */}
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-sm text-blue-900">TOTAUX</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-blue-900">
                      {totaux.debit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-blue-900">
                      {totaux.credit.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono ${
                      soldeFinal >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {soldeFinal.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 text-sm text-gray-600">
                <p>{mouvements.length} mouvement{mouvements.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
