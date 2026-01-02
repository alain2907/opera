import { useState, useEffect } from 'react';
import { useEntreprise } from '../../contexts/EntrepriseContext';
import { ecrituresApi } from '../../api/ecritures';

interface EcritureWindowProps {
  ecritureId: number;
}

export default function EcritureWindow({ ecritureId }: EcritureWindowProps) {
  const { entreprise, exercice } = useEntreprise();
  const [ecriture, setEcriture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEcriture();
  }, [ecritureId, entreprise, exercice]);

  const loadEcriture = async () => {
    if (!entreprise || !exercice) return;

    setLoading(true);
    setError(null);
    try {
      const ecritures = await ecrituresApi.getAll(entreprise.id, exercice.id);
      const found = ecritures.find((e: any) => e.id === ecritureId);
      if (found) {
        setEcriture(found);
      } else {
        setError('Écriture non trouvée');
      }
    } catch (err: any) {
      console.error('Erreur chargement écriture:', err);
      setError(err.message || 'Erreur lors du chargement de l\'écriture');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!ecriture) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Écriture non trouvée</p>
      </div>
    );
  }

  const totalDebit = ecriture.lignes.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
  const totalCredit = ecriture.lignes.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Journal :</span>
            <span className="ml-2 font-semibold">{ecriture.journal?.code} - {ecriture.journal?.libelle}</span>
          </div>
          <div>
            <span className="text-gray-600">Date :</span>
            <span className="ml-2 font-semibold">
              {new Date(ecriture.date_ecriture).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <div>
            <span className="text-gray-600">N° Pièce :</span>
            <span className="ml-2 font-mono font-semibold">{ecriture.numero_piece}</span>
          </div>
          <div>
            <span className="text-gray-600">Libellé :</span>
            <span className="ml-2 font-medium">{ecriture.libelle}</span>
          </div>
        </div>
      </div>

      {/* Tableau des lignes */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Compte</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Libellé</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Débit</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Crédit</th>
            </tr>
          </thead>
          <tbody>
            {ecriture.lignes.map((ligne: any, index: number) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-sm text-blue-600 font-semibold">
                  {ligne.numero_compte}
                </td>
                <td className="px-3 py-2 text-sm text-gray-700">
                  {ligne.libelle_compte}
                </td>
                <td className="px-3 py-2 text-right text-sm font-mono">
                  {ligne.debit > 0 ? Number(ligne.debit).toFixed(2) + ' €' : ''}
                </td>
                <td className="px-3 py-2 text-right text-sm font-mono">
                  {ligne.credit > 0 ? Number(ligne.credit).toFixed(2) + ' €' : ''}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
              <td colSpan={2} className="px-3 py-2 text-right text-sm">
                TOTAUX :
              </td>
              <td className={'px-3 py-2 text-right text-sm font-mono ' + (!isBalanced && totalDebit > 0 ? 'text-red-600' : 'text-green-600')}>
                {totalDebit.toFixed(2)} €
              </td>
              <td className={'px-3 py-2 text-right text-sm font-mono ' + (!isBalanced && totalCredit > 0 ? 'text-red-600' : 'text-green-600')}>
                {totalCredit.toFixed(2)} €
              </td>
            </tr>
            {!isBalanced && (
              <tr>
                <td colSpan={4} className="px-3 py-2 text-center text-sm text-red-600 font-semibold">
                  ⚠️ Écriture non équilibrée
                </td>
              </tr>
            )}
            {isBalanced && (
              <tr>
                <td colSpan={4} className="px-3 py-2 text-center text-sm text-green-600 font-semibold">
                  ✓ Écriture équilibrée
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Informations supplémentaires */}
      <div className="mt-6 text-xs text-gray-500 space-y-1">
        <div>
          <span className="font-medium">Créée le :</span>
          {' '}
          {new Date(ecriture.date_creation).toLocaleString('fr-FR')}
        </div>
        {ecriture.date_modification && (
          <div>
            <span className="font-medium">Modifiée le :</span>
            {' '}
            {new Date(ecriture.date_modification).toLocaleString('fr-FR')}
          </div>
        )}
      </div>
    </div>
  );
}
