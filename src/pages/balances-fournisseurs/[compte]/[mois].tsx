import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../../../components/TopMenu';
import { useEntreprise } from '../../../contexts/EntrepriseContext';
import { ecrituresApi, type Ecriture } from '../../../api/ecritures';

export default function DetailMoisFournisseurPage() {
  const router = useRouter();
  const { compte, mois } = router.query;
  const { entreprise, exercice } = useEntreprise();
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
    }
  }, [entreprise, router]);

  useEffect(() => {
    if (entreprise && exercice && compte && mois) {
      chargerEcritures();
    }
  }, [entreprise, exercice, compte, mois]);

  const chargerEcritures = async () => {
    if (!entreprise || !exercice || !compte || !mois) return;

    setLoading(true);
    try {
      // Récupérer toutes les écritures de l'exercice
      const toutesEcritures = await ecrituresApi.getAll(entreprise.id, exercice.id);

      // Filtrer les écritures pour ce compte et jusqu'à ce mois (cumulé depuis début exercice)
      const moisCible = parseInt(mois as string);
      const dateDebut = new Date(exercice.date_debut);
      const anneeCible = dateDebut.getFullYear();
      // Pour obtenir le dernier jour du mois N : new Date(annee, N+1, 0)
      // Exemple: pour mars (mois=3), new Date(2025, 4, 0) = 31 mars
      const dateLimite = new Date(anneeCible, moisCible + 1, 0, 23, 59, 59, 999);

      const ecrituresFiltrees = toutesEcritures.filter((ecriture) => {
        const dateEcriture = new Date(ecriture.date_ecriture);
        // Vérifier si l'écriture contient une ligne avec ce compte
        const aLigne = ecriture.lignes.some((ligne) => ligne.numero_compte === compte);
        // Vérifier si la date est dans la période
        const dansLaPeriode =
          dateEcriture >= dateDebut && dateEcriture <= dateLimite;
        return aLigne && dansLaPeriode;
      });

      // Trier par date
      ecrituresFiltrees.sort(
        (a, b) =>
          new Date(a.date_ecriture).getTime() - new Date(b.date_ecriture).getTime()
      );

      setEcritures(ecrituresFiltrees);
    } catch (err) {
      console.error('Erreur chargement écritures:', err);
      alert('Erreur lors du chargement des écritures');
    } finally {
      setLoading(false);
    }
  };

  const getNomMois = (moisNum: number) => {
    const noms = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];
    return noms[moisNum - 1] || '';
  };

  // Calculer les totaux cumulés
  let soldeCumule = 0;
  const ecrituresAvecSolde = ecritures.map((ecriture) => {
    const ligneCompte = ecriture.lignes.find((l) => l.numero_compte === compte);
    const debit = ligneCompte?.debit || 0;
    const credit = ligneCompte?.credit || 0;
    soldeCumule += Number(debit) - Number(credit);
    return {
      ...ecriture,
      debitCompte: debit,
      creditCompte: credit,
      soldeCumule,
    };
  });

  if (!entreprise) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => router.push(`/balances-fournisseurs/${compte}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour aux balances mensuelles
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Détail des écritures - {compte}
            </h2>
            <p className="text-gray-600">
              Période : <span className="font-semibold">Janvier à {getNomMois(parseInt(mois as string))}</span>
            </p>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              {exercice && (
                <span className="ml-4">
                  Exercice : {new Date(exercice.date_debut).getFullYear()}
                </span>
              )}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : ecrituresAvecSolde.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Aucune écriture pour cette période</p>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ecrituresAvecSolde.map((ecriture) => {
                    const ligneCompte = ecriture.lignes.find(
                      (l) => l.numero_compte === compte
                    );
                    return (
                      <tr
                        key={ecriture.id}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(ecriture.date_ecriture).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                          {ecriture.journal.code}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ligneCompte?.libelle || ecriture.libelle}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {ecriture.debitCompte > 0
                            ? Number(ecriture.debitCompte).toFixed(2)
                            : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                          {ecriture.creditCompte > 0
                            ? Number(ecriture.creditCompte).toFixed(2)
                            : ''}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                            ecriture.soldeCumule > 0
                              ? 'text-red-600'
                              : ecriture.soldeCumule < 0
                              ? 'text-green-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {ecriture.soldeCumule.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 text-sm text-gray-600">
                <p>
                  {ecrituresAvecSolde.length} écriture{ecrituresAvecSolde.length > 1 ? 's' : ''}{' '}
                  affichée{ecrituresAvecSolde.length > 1 ? 's' : ''}
                </p>
                <p className="mt-2">
                  Solde final :{' '}
                  <span
                    className={`font-semibold ${
                      soldeCumule > 0 ? 'text-red-600' : soldeCumule < 0 ? 'text-green-600' : ''
                    }`}
                  >
                    {soldeCumule.toFixed(2)}
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
