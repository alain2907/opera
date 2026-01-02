import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { bilanApi, ResultatBilan, LigneBilan, DetailLigneBilan } from '../api/bilan';
import { useEntreprise } from '../contexts/EntrepriseContext';

export default function BilanActif() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [bilan, setBilan] = useState<ResultatBilan | null>(null);
  const [detailLigne, setDetailLigne] = useState<DetailLigneBilan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editCompteDebut, setEditCompteDebut] = useState('');
  const [editCompteFin, setEditCompteFin] = useState('');

  // Filtres
  const [dateCloture, setDateCloture] = useState('');

  useEffect(() => {
    if (exercice) {
      setDateCloture(exercice.date_fin);
    }
  }, [exercice]);

  useEffect(() => {
    if (entreprise && exercice && dateCloture) {
      chargerBilan();
    }
  }, [entreprise, exercice, dateCloture]);

  const chargerBilan = async () => {
    if (!entreprise || !exercice || !dateCloture) return;

    try {
      setLoading(true);
      setError('');
      const data = await bilanApi.getBilan({
        entreprise_id: entreprise.id,
        exercice_id: exercice.id,
        date_cloture: dateCloture,
        comparatif: false,
      });
      setBilan(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du bilan');
    } finally {
      setLoading(false);
    }
  };

  const handleLigneClick = async (ligne: LigneBilan) => {
    // Tout est cliquable
    if (!entreprise || !exercice || !dateCloture) return;

    try {
      const detail = await bilanApi.getDetailLigne({
        code_poste: ligne.code_poste,
        entreprise_id: entreprise.id,
        exercice_id: exercice.id,
        date_cloture: dateCloture,
      });
      setDetailLigne(detail);
      setEditCompteDebut(detail.compte_debut || '');
      setEditCompteFin(detail.compte_fin || '');
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du détail');
    }
  };

  const fermerDetail = () => {
    setDetailLigne(null);
    setEditMode(false);
  };

  const sauvegarderMapping = async () => {
    if (!detailLigne) return;

    try {
      // Appeler l'API pour sauvegarder le mapping
      await bilanApi.updateMapping(
        detailLigne.code_poste,
        editCompteDebut,
        editCompteFin,
      );

      setEditMode(false);

      // Recharger le détail
      if (entreprise && exercice && dateCloture) {
        const detail = await bilanApi.getDetailLigne({
          code_poste: detailLigne.code_poste,
          entreprise_id: entreprise.id,
          exercice_id: exercice.id,
          date_cloture: dateCloture,
        });
        setDetailLigne(detail);
      }

      // Recharger le bilan complet pour voir les changements
      chargerBilan();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du mapping');
    }
  };

  const formaterMontant = (montant: number) => {
    const valeurAbsolue = Math.abs(montant);
    const montantFormate = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(valeurAbsolue);

    // Si négatif, afficher avec parenthèses
    return montant < 0 ? `(${montantFormate})` : montantFormate;
  };

  const getLigneStyle = (niveau: number, montant: number) => {
    const baseStyle = 'py-2 border-b border-gray-200 hover:bg-blue-50 cursor-pointer';

    if (niveau === 1) {
      return `${baseStyle} bg-blue-50 font-bold text-lg`;
    }
    if (niveau === 2) {
      return `${baseStyle} bg-gray-50 font-semibold pl-4`;
    }
    return `${baseStyle} pl-8 ${montant === 0 ? 'text-gray-400' : ''}`;
  };

  if (loading) {
    return (
      <>
        <TopMenu />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Chargement du bilan actif...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <TopMenu />
        <div className="container mx-auto p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopMenu />
      <div className="container mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bilan Actif</h1>
        <button
          onClick={() => router.push('/bilan-passif')}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Voir le Passif →
        </button>
      </div>

      {entreprise && (
        <div className="mb-4 text-gray-700">
          <strong>{entreprise.raison_sociale}</strong> - Exercice {exercice?.annee}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white p-4 rounded shadow mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date clôture</label>
          <input
            type="date"
            value={dateCloture}
            onChange={(e) => setDateCloture(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={chargerBilan}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Tableau ACTIF */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">ACTIF</h2>
          <div className="text-xl font-bold">{formaterMontant(bilan?.total_actif || 0)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3 font-semibold">Libellé</th>
                <th className="text-center p-3 font-semibold w-32">Code</th>
                <th className="text-right p-3 font-semibold w-48">Montant</th>
              </tr>
            </thead>
            <tbody>
              {bilan?.actif.map((ligne) => (
                <tr
                  key={ligne.code_poste}
                  className={getLigneStyle(ligne.niveau, ligne.montant_n)}
                  onClick={() => handleLigneClick(ligne)}
                >
                  <td className="p-3">{ligne.ligne_libelle}</td>
                  <td className="text-center p-3 text-sm text-gray-600">{ligne.code_poste}</td>
                  <td className="text-right p-3 font-mono">
                    {ligne.montant_n !== 0 ? formaterMontant(ligne.montant_n) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détail comptes */}
      {detailLigne && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-blue-600 text-white p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold">{detailLigne.ligne_libelle}</h3>
                  <p className="text-sm opacity-90">Code: {detailLigne.code_poste}</p>
                </div>
                <button
                  onClick={fermerDetail}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {!editMode ? (
                <div className="flex items-center gap-4">
                  <p className="text-sm opacity-90">
                    Plage de comptes: {detailLigne.compte_debut === detailLigne.compte_fin
                      ? `${detailLigne.compte_debut}*`
                      : `${detailLigne.compte_debut || '?'} à ${detailLigne.compte_fin || '?'}`}
                  </p>
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-xs px-3 py-1 bg-white text-blue-600 rounded hover:bg-gray-100"
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Comptes:</span>
                  <input
                    type="text"
                    value={editCompteDebut}
                    onChange={(e) => setEditCompteDebut(e.target.value)}
                    className="px-2 py-1 rounded text-gray-900 w-20"
                    placeholder="Début"
                  />
                  <span className="text-sm">à</span>
                  <input
                    type="text"
                    value={editCompteFin}
                    onChange={(e) => setEditCompteFin(e.target.value)}
                    className="px-2 py-1 rounded text-gray-900 w-20"
                    placeholder="Fin"
                  />
                  <button
                    onClick={sauvegarderMapping}
                    className="text-xs px-3 py-1 bg-white text-blue-600 rounded hover:bg-gray-100"
                  >
                    Sauvegarder
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">N° Compte</th>
                    <th className="text-left p-3 font-semibold">Libellé</th>
                    <th className="text-right p-3 font-semibold">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLigne.comptes.map((compte) => (
                    <tr key={compte.numero_compte} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono">{compte.numero_compte}</td>
                      <td className="p-3">{compte.libelle}</td>
                      <td className="p-3 text-right font-mono">{formaterMontant(compte.solde)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">Total:</td>
                    <td className="p-3 text-right font-mono">{formaterMontant(detailLigne.total)}</td>
                  </tr>
                </tfoot>
              </table>

              {detailLigne.comptes.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Aucun compte dans le plan comptable pour cette ligne
                  </p>
                  <button
                    onClick={() => router.push('/plan-comptable')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Ajouter des comptes au plan comptable
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
