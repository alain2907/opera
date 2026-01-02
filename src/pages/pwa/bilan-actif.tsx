import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import { calculerBilan, LigneBilan, ResultatBilan, getDetailLigne, DetailLigneBilan, updateMapping, resetMapping } from '../../lib/bilan-service';
import { getDB } from '../../lib/indexedDB';

export default function BilanActifPWA() {
  const router = useRouter();
  const [bilan, setBilan] = useState<ResultatBilan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entrepriseNom, setEntrepriseNom] = useState('');
  const [exerciceLibelle, setExerciceLibelle] = useState('');
  const [dateCloture, setDateCloture] = useState('');
  const [exerciceId, setExerciceId] = useState<number | null>(null);
  const [detailLigne, setDetailLigne] = useState<DetailLigneBilan | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editCompteDebut, setEditCompteDebut] = useState('');
  const [editCompteFin, setEditCompteFin] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (exerciceId && dateCloture) {
      chargerBilan();
    }
  }, [exerciceId, dateCloture]);

  const loadData = async () => {
    try {
      const db = await getDB();

      // Récupérer l'entreprise et l'exercice actifs
      const entrepriseIdStr = localStorage.getItem('pwa_entreprise_active_id');
      const exerciceIdStr = localStorage.getItem('pwa_exercice_actif_id');

      if (!entrepriseIdStr || !exerciceIdStr) {
        setError('Veuillez d\'abord sélectionner une entreprise et un exercice');
        setLoading(false);
        return;
      }

      const entrepriseId = parseInt(entrepriseIdStr, 10);
      const exId = parseInt(exerciceIdStr, 10);

      // Charger l'entreprise
      const entreprise = await db.get('entreprises', entrepriseId);
      if (entreprise) {
        setEntrepriseNom(entreprise.raisonSociale || entreprise.raison_sociale || '');
      }

      // Charger l'exercice
      const exercice = await db.get('exercices', exId);
      if (exercice) {
        const annee = exercice.annee;
        setExerciceLibelle(`Exercice ${annee}`);
        setDateCloture(exercice.dateFin || exercice.date_fin);
        setExerciceId(exId);
      }
    } catch (err: any) {
      console.error('Erreur chargement données:', err);
      setError(err.message || 'Erreur lors du chargement');
      setLoading(false);
    }
  };

  const chargerBilan = async () => {
    if (!exerciceId || !dateCloture) return;

    try {
      setLoading(true);
      setError('');
      const data = await calculerBilan({
        exercice_id: exerciceId,
        date_cloture: dateCloture,
      });
      setBilan(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du calcul du bilan');
    } finally {
      setLoading(false);
    }
  };

  const handleLigneClick = async (ligne: LigneBilan) => {
    if (!exerciceId || !dateCloture) return;

    try {
      const detail = await getDetailLigne({
        code_poste: ligne.code_poste,
        exercice_id: exerciceId,
        date_cloture: dateCloture,
      });
      setDetailLigne(detail);
      setEditCompteDebut(detail.compte_debut || '');
      setEditCompteFin(detail.compte_fin || '');
      setEditMode(false);
    } catch (err: any) {
      console.error('Erreur chargement détail:', err);
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
      await updateMapping(
        detailLigne.code_poste,
        editCompteDebut,
        editCompteFin,
      );

      setEditMode(false);

      // Recharger le détail
      if (exerciceId && dateCloture) {
        const detail = await getDetailLigne({
          code_poste: detailLigne.code_poste,
          exercice_id: exerciceId,
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

  const reinitialiserMapping = async () => {
    if (!detailLigne) return;

    try {
      // Supprimer la personnalisation
      await resetMapping(detailLigne.code_poste);

      setEditMode(false);

      // Recharger le détail avec les valeurs par défaut
      if (exerciceId && dateCloture) {
        const detail = await getDetailLigne({
          code_poste: detailLigne.code_poste,
          exercice_id: exerciceId,
          date_cloture: dateCloture,
        });
        setDetailLigne(detail);
        setEditCompteDebut(detail.compte_debut || '');
        setEditCompteFin(detail.compte_fin || '');
      }

      // Recharger le bilan complet
      chargerBilan();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation du mapping');
    }
  };

  const formaterMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(montant);
  };

  const getLigneStyle = (niveau: number, montant: number) => {
    const baseStyle = 'py-2 px-4 border-b border-gray-200';

    if (niveau === 0) {
      // Titres principaux (ACTIF IMMOBILISÉ, ACTIF CIRCULANT, etc.)
      return `${baseStyle} bg-blue-100 font-bold text-lg text-blue-900`;
    }

    if (niveau === 1) {
      // Sous-titres et totaux (IMMOBILISATIONS INCORPORELLES, TOTAL, etc.)
      return `${baseStyle} bg-blue-50 font-semibold text-blue-800`;
    }

    // Lignes détaillées (niveau 2)
    if (montant === 0) {
      return `${baseStyle} pl-8 text-gray-400`;
    }
    return `${baseStyle} pl-8`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <PWANavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Chargement du bilan actif...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <PWANavbar />
        <div className="max-w-7xl mx-auto p-6 pt-24">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <button
            onClick={() => router.push('/pwa')}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            ← Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!bilan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <PWANavbar />
        <div className="max-w-7xl mx-auto p-6 pt-24">
          <div className="text-gray-600">Aucune donnée disponible</div>
        </div>
      </div>
    );
  }

  // Filter only ACTIF section
  const lignesActif = bilan.actif;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />
      <div className="max-w-7xl mx-auto p-6 pt-24">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bilan - ACTIF (CERFA 2050)
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div>
              <span className="font-semibold">Entreprise :</span> {entrepriseNom}
            </div>
            <div>
              <span className="font-semibold">Exercice :</span> {exerciceLibelle}
            </div>
            <div>
              <span className="font-semibold">Date de clôture :</span> {dateCloture}
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de clôture
              </label>
              <input
                type="date"
                value={dateCloture}
                onChange={(e) => setDateCloture(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Tableau du bilan actif */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Libellé
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Code
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Montant (€)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lignesActif.map((ligne, index) => (
                <tr
                  key={`actif-${index}`}
                  className={`${getLigneStyle(ligne.niveau, ligne.montant_n)} cursor-pointer hover:bg-blue-100`}
                  onClick={() => handleLigneClick(ligne)}
                >
                  <td className="px-4 py-2">{ligne.ligne_libelle}</td>
                  <td className="px-4 py-2 text-center text-xs text-gray-500">
                    {ligne.code_poste}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {ligne.montant_n !== 0 ? formaterMontant(ligne.montant_n) : '-'}
                  </td>
                </tr>
              ))}

              {/* TOTAL GÉNÉRAL ACTIF */}
              <tr className="bg-gradient-to-r from-blue-100 to-blue-200 border-t-4 border-blue-400">
                <td className="px-4 py-4 font-bold text-2xl text-blue-900">
                  TOTAL GÉNÉRAL ACTIF
                </td>
                <td className="px-4 py-4 text-center text-xs font-bold">1A</td>
                <td className="px-4 py-4 text-right font-mono font-bold text-2xl text-blue-900">
                  {formaterMontant(bilan.total_actif)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Equilibre du bilan */}
        {bilan.equilibre ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            ✓ Bilan équilibré (Actif = Passif)
          </div>
        ) : (
          <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded mb-6">
            ⚠ Attention : Le bilan n'est pas équilibré. Actif: {formaterMontant(bilan.total_actif)} - Passif: {formaterMontant(bilan.total_passif)}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => router.push('/pwa/bilan-passif')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voir le Passif →
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Imprimer
          </button>
          <button
            onClick={() => router.push('/pwa')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Retour au dashboard
          </button>
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
                  {detailLigne.comptes_specifiques ? (
                    <>
                      <p className="text-sm opacity-90">
                        Formule: {detailLigne.comptes_specifiques.substring(0, 100)}...
                      </p>
                      <button
                        onClick={reinitialiserMapping}
                        className="text-xs px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Réinitialiser
                      </button>
                    </>
                  ) : (
                    <>
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
                      <button
                        onClick={reinitialiserMapping}
                        className="text-xs px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Réinitialiser
                      </button>
                    </>
                  )}
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
                    Aucun compte trouvé pour cette ligne
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
