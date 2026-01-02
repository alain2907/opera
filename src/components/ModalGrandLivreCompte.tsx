import { useState, useEffect } from 'react';
import { grandLivreApi, type LigneGrandLivre } from '../api/grand-livre';
import { useEntreprise } from '../contexts/EntrepriseContext';
import ModalEcriture from './ModalEcriture';

interface ModalGrandLivreCompteProps {
  numeroCompte: string;
  libelleCompte: string;
  onClose: () => void;
}

export default function ModalGrandLivreCompte({ numeroCompte, libelleCompte, onClose }: ModalGrandLivreCompteProps) {
  const { entreprise } = useEntreprise();
  const [lignes, setLignes] = useState<LigneGrandLivre[]>([]);
  const [loading, setLoading] = useState(true);
  const [ecritureSelectionnee, setEcritureSelectionnee] = useState<number | null>(null);

  useEffect(() => {
    loadGrandLivreCompte();
  }, [numeroCompte]);

  const loadGrandLivreCompte = async () => {
    if (!entreprise) return;

    try {
      setLoading(true);
      const data = await grandLivreApi.getGrandLivre({
        entreprise_id: entreprise.id,
        compte_debut: numeroCompte,
        compte_fin: numeroCompte,
      });
      setLignes(data);
    } catch (err) {
      console.error('Erreur chargement grand livre:', err);
      alert('Erreur lors du chargement du grand livre');
    } finally {
      setLoading(false);
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  const calculerTotaux = () => {
    const totalDebit = lignes.reduce((sum, ligne) => sum + ligne.debit, 0);
    const totalCredit = lignes.reduce((sum, ligne) => sum + ligne.credit, 0);
    const solde = totalDebit - totalCredit;
    return { totalDebit, totalCredit, solde };
  };

  const totaux = calculerTotaux();

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4"
        onClick={onClose}
        style={{ top: '64px' }}
      >
        <div
          className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">📘 Grand Livre du compte {numeroCompte}</h2>
              <p className="text-sm text-blue-100">{libelleCompte}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">⏳ Chargement...</p>
              </div>
            ) : lignes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune écriture trouvée pour ce compte</p>
              </div>
            ) : (
              <>
                {/* Totaux */}
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <p className="text-xs text-green-600 mb-1">Total Débit</p>
                    <p className="text-xl font-bold text-green-900">{formatMontant(totaux.totalDebit)} €</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                    <p className="text-xs text-orange-600 mb-1">Total Crédit</p>
                    <p className="text-xl font-bold text-orange-900">{formatMontant(totaux.totalCredit)} €</p>
                  </div>
                  <div className={`border rounded-lg px-4 py-3 ${
                    totaux.solde >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-xs mb-1 ${totaux.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Solde
                    </p>
                    <p className={`text-xl font-bold ${totaux.solde >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {formatMontant(totaux.solde)} €
                    </p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">N° Pièce</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Libellé</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Débit</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Crédit</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Solde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {lignes.map((ligne, index) => (
                        <tr
                          key={index}
                          onClick={() => setEcritureSelectionnee(ligne.ecriture_id)}
                          className="hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Cliquer pour voir le détail de l'écriture"
                        >
                          <td className="px-4 py-2 text-sm">
                            {formatDate(ligne.date_ecriture)}
                          </td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-600">
                            {ligne.numero_piece}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {ligne.libelle_ecriture}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            {ligne.debit > 0 ? formatMontant(ligne.debit) + ' €' : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            {ligne.credit > 0 ? formatMontant(ligne.credit) + ' €' : '-'}
                          </td>
                          <td className={`px-4 py-2 text-sm text-right font-mono font-semibold ${
                            ligne.solde >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {formatMontant(ligne.solde)} €
                          </td>
                        </tr>
                      ))}

                      {/* Totaux */}
                      <tr className="bg-blue-100 font-bold">
                        <td className="px-4 py-3 text-sm" colSpan={3}>
                          TOTAL {numeroCompte}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-green-800">
                          {formatMontant(totaux.totalDebit)} €
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-orange-800">
                          {formatMontant(totaux.totalCredit)} €
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-mono ${
                          totaux.solde >= 0 ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {formatMontant(totaux.solde)} €
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Écriture */}
      {ecritureSelectionnee && (
        <ModalEcriture
          ecritureId={ecritureSelectionnee}
          onClose={() => setEcritureSelectionnee(null)}
          onUpdate={() => {
            // Recharger le Grand Livre du compte
            loadGrandLivreCompte();
          }}
        />
      )}
    </>
  );
}
