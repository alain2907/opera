import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import { calculerCompteResultat, LigneCompteResultat, ResultatCompteResultat } from '../../lib/compte-resultat-service';
import { getDB } from '../../lib/indexedDB';

export default function CompteResultatCerfaPWA() {
  const router = useRouter();
  const [compteResultat, setCompteResultat] = useState<ResultatCompteResultat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entrepriseNom, setEntrepriseNom] = useState('');
  const [exerciceLibelle, setExerciceLibelle] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [exerciceId, setExerciceId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (exerciceId && dateDebut && dateFin) {
      chargerCompteResultat();
    }
  }, [exerciceId, dateDebut, dateFin]);

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
        setDateDebut(exercice.dateDebut || exercice.date_debut);
        setDateFin(exercice.dateFin || exercice.date_fin);
        setExerciceId(exId);
      }
    } catch (err: any) {
      console.error('Erreur chargement données:', err);
      setError(err.message || 'Erreur lors du chargement');
      setLoading(false);
    }
  };

  const chargerCompteResultat = async () => {
    if (!exerciceId || !dateDebut || !dateFin) return;

    try {
      setLoading(true);
      setError('');
      const data = await calculerCompteResultat({
        exercice_id: exerciceId,
        date_debut: dateDebut,
        date_fin: dateFin,
      });
      setCompteResultat(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du calcul du compte de résultat');
    } finally {
      setLoading(false);
    }
  };

  const formaterMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(montant);
  };

  const getLigneStyle = (niveau: number, montant: number, section: string) => {
    const baseStyle = 'py-2 px-4 border-b border-gray-200';

    if (niveau === 1) {
      // Titres principaux
      if (section === 'PRODUITS') {
        return `${baseStyle} bg-green-100 font-bold text-lg text-green-900`;
      }
      if (section === 'CHARGES') {
        return `${baseStyle} bg-red-100 font-bold text-lg text-red-900`;
      }
      if (section === 'RESULTAT') {
        return `${baseStyle} bg-blue-100 font-bold text-xl text-blue-900`;
      }
    }

    if (niveau === 2) {
      // Totaux et sous-totaux
      if (section === 'PRODUITS') {
        return `${baseStyle} bg-green-50 font-semibold text-green-800`;
      }
      if (section === 'CHARGES') {
        return `${baseStyle} bg-red-50 font-semibold text-red-800`;
      }
      if (section === 'RESULTAT') {
        const bgColor = montant >= 0 ? 'bg-green-50' : 'bg-red-50';
        const textColor = montant >= 0 ? 'text-green-800' : 'text-red-800';
        return `${baseStyle} ${bgColor} font-semibold ${textColor}`;
      }
    }

    // Lignes détaillées
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
          <div className="text-xl">Chargement du compte de résultat...</div>
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

  if (!compteResultat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <PWANavbar />
        <div className="max-w-7xl mx-auto p-6 pt-24">
          <div className="text-gray-600">Aucune donnée disponible</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />
      <div className="max-w-7xl mx-auto p-6 pt-24">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Compte de Résultat (CERFA 2052-2053)
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div>
              <span className="font-semibold">Entreprise :</span> {entrepriseNom}
            </div>
            <div>
              <span className="font-semibold">Exercice :</span> {exerciceLibelle}
            </div>
            <div>
              <span className="font-semibold">Période :</span> {dateDebut} au {dateFin}
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Tableau du compte de résultat */}
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
              {/* PRODUITS D'EXPLOITATION */}
              {compteResultat.produits_exploitation.map((ligne, index) => (
                <tr
                  key={`prod-exploit-${index}`}
                  className={getLigneStyle(ligne.niveau, ligne.montant_n, ligne.section)}
                >
                  <td className="px-4 py-2">{ligne.ligne_libelle}</td>
                  <td className="px-4 py-2 text-center text-xs text-gray-500">
                    {ligne.code_cerfa || ligne.code_poste}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {ligne.niveau > 1 && formaterMontant(ligne.montant_n)}
                  </td>
                </tr>
              ))}

              {/* CHARGES D'EXPLOITATION */}
              {compteResultat.charges_exploitation.map((ligne, index) => (
                <tr
                  key={`charges-exploit-${index}`}
                  className={getLigneStyle(ligne.niveau, ligne.montant_n, ligne.section)}
                >
                  <td className="px-4 py-2">{ligne.ligne_libelle}</td>
                  <td className="px-4 py-2 text-center text-xs text-gray-500">
                    {ligne.code_cerfa || ligne.code_poste}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {ligne.niveau > 1 && formaterMontant(ligne.montant_n)}
                  </td>
                </tr>
              ))}

              {/* RÉSULTAT D'EXPLOITATION */}
              <tr className="bg-blue-50">
                <td className="px-4 py-3 font-bold text-blue-900">
                  1 – RÉSULTAT D'EXPLOITATION (I – II)
                </td>
                <td className="px-4 py-3 text-center text-xs">GG</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                  {formaterMontant(compteResultat.resultat_exploitation)}
                </td>
              </tr>

              {/* PRODUITS FINANCIERS */}
              {compteResultat.produits_financiers.map((ligne, index) => (
                <tr
                  key={`prod-fin-${index}`}
                  className={getLigneStyle(ligne.niveau, ligne.montant_n, ligne.section)}
                >
                  <td className="px-4 py-2">{ligne.ligne_libelle}</td>
                  <td className="px-4 py-2 text-center text-xs text-gray-500">
                    {ligne.code_cerfa || ligne.code_poste}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {ligne.niveau > 1 && formaterMontant(ligne.montant_n)}
                  </td>
                </tr>
              ))}

              {/* CHARGES FINANCIÈRES */}
              {compteResultat.charges_financieres.map((ligne, index) => (
                <tr
                  key={`charges-fin-${index}`}
                  className={getLigneStyle(ligne.niveau, ligne.montant_n, ligne.section)}
                >
                  <td className="px-4 py-2">{ligne.ligne_libelle}</td>
                  <td className="px-4 py-2 text-center text-xs text-gray-500">
                    {ligne.code_cerfa || ligne.code_poste}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {ligne.niveau > 1 && formaterMontant(ligne.montant_n)}
                  </td>
                </tr>
              ))}

              {/* RÉSULTAT FINANCIER */}
              <tr className="bg-blue-50">
                <td className="px-4 py-3 font-bold text-blue-900">
                  2 – RÉSULTAT FINANCIER (V – VI)
                </td>
                <td className="px-4 py-3 text-center text-xs">GV</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                  {formaterMontant(compteResultat.resultat_financier)}
                </td>
              </tr>

              {/* RÉSULTAT COURANT AVANT IMPÔTS */}
              <tr className="bg-blue-100">
                <td className="px-4 py-3 font-bold text-blue-900">
                  3 – RÉSULTAT COURANT AVANT IMPÔTS
                </td>
                <td className="px-4 py-3 text-center text-xs">GW</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                  {formaterMontant(compteResultat.resultat_courant_avant_impots)}
                </td>
              </tr>

              {/* PRODUITS EXCEPTIONNELS */}
              {compteResultat.produits_exceptionnels.map((ligne, index) => (
                <tr
                  key={`prod-except-${index}`}
                  className={getLigneStyle(ligne.niveau, ligne.montant_n, ligne.section)}
                >
                  <td className="px-4 py-2">{ligne.ligne_libelle}</td>
                  <td className="px-4 py-2 text-center text-xs text-gray-500">
                    {ligne.code_cerfa || ligne.code_poste}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {ligne.niveau > 1 && formaterMontant(ligne.montant_n)}
                  </td>
                </tr>
              ))}

              {/* CHARGES EXCEPTIONNELLES */}
              {compteResultat.charges_exceptionnelles.map((ligne, index) => (
                <tr
                  key={`charges-except-${index}`}
                  className={getLigneStyle(ligne.niveau, ligne.montant_n, ligne.section)}
                >
                  <td className="px-4 py-2">{ligne.ligne_libelle}</td>
                  <td className="px-4 py-2 text-center text-xs text-gray-500">
                    {ligne.code_cerfa || ligne.code_poste}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {ligne.niveau > 1 && formaterMontant(ligne.montant_n)}
                  </td>
                </tr>
              ))}

              {/* RÉSULTAT EXCEPTIONNEL */}
              <tr className="bg-blue-50">
                <td className="px-4 py-3 font-bold text-blue-900">
                  4 – RÉSULTAT EXCEPTIONNEL (VII – VIII)
                </td>
                <td className="px-4 py-3 text-center text-xs">HI</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                  {formaterMontant(compteResultat.resultat_exceptionnel)}
                </td>
              </tr>

              {/* PARTICIPATION ET IMPÔTS */}
              <tr className="bg-red-50">
                <td className="px-4 py-2 font-semibold text-red-800">
                  Participation des salariés aux résultats de l'entreprise (IX)
                </td>
                <td className="px-4 py-2 text-center text-xs">HJ</td>
                <td className="px-4 py-2 text-right font-mono text-red-800">
                  {formaterMontant(compteResultat.participation_salaries)}
                </td>
              </tr>
              <tr className="bg-red-50">
                <td className="px-4 py-2 font-semibold text-red-800">
                  Impôts sur les bénéfices (X)
                </td>
                <td className="px-4 py-2 text-center text-xs">HK</td>
                <td className="px-4 py-2 text-right font-mono text-red-800">
                  {formaterMontant(compteResultat.impots_benefices)}
                </td>
              </tr>

              {/* TOTAUX */}
              <tr className="bg-green-100">
                <td className="px-4 py-3 font-bold text-green-900 text-lg">
                  TOTAL DES PRODUITS (I + III + V + VII)
                </td>
                <td className="px-4 py-3 text-center text-xs">HL</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-green-900 text-lg">
                  {formaterMontant(compteResultat.total_produits)}
                </td>
              </tr>
              <tr className="bg-red-100">
                <td className="px-4 py-3 font-bold text-red-900 text-lg">
                  TOTAL DES CHARGES (II + IV + VI + VIII + IX + X)
                </td>
                <td className="px-4 py-3 text-center text-xs">HM</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-red-900 text-lg">
                  {formaterMontant(compteResultat.total_charges)}
                </td>
              </tr>

              {/* RÉSULTAT NET */}
              <tr
                className={
                  compteResultat.resultat_net >= 0
                    ? 'bg-gradient-to-r from-green-100 to-green-200 border-t-4 border-green-400'
                    : 'bg-gradient-to-r from-red-100 to-red-200 border-t-4 border-red-400'
                }
              >
                <td className="px-4 py-4 font-bold text-2xl">
                  <span
                    className={
                      compteResultat.resultat_net >= 0 ? 'text-green-900' : 'text-red-900'
                    }
                  >
                    5 – {compteResultat.resultat_net >= 0 ? 'BÉNÉFICE' : 'PERTE'}
                  </span>
                </td>
                <td className="px-4 py-4 text-center text-xs font-bold">HN</td>
                <td className="px-4 py-4 text-right font-mono font-bold text-2xl">
                  <span
                    className={
                      compteResultat.resultat_net >= 0 ? 'text-green-900' : 'text-red-900'
                    }
                  >
                    {formaterMontant(Math.abs(compteResultat.resultat_net))}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📄 Imprimer
          </button>
          <button
            onClick={() => router.push('/pwa')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Retour au dashboard
          </button>
        </div>
      </div>

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
