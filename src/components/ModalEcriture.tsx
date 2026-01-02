import { useState, useEffect, useRef } from 'react';
import { ecrituresApi } from '../api/ecritures';

interface ModalEcritureProps {
  ecritureId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ModalEcriture({ ecritureId, onClose, onUpdate }: ModalEcritureProps) {
  const [ecriture, setEcriture] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modeEdition, setModeEdition] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [saving, setSaving] = useState(false);

  // États d'édition
  const [dateEcriture, setDateEcriture] = useState('');
  const [numeroPiece, setNumeroPiece] = useState('');
  const [libelle, setLibelle] = useState('');
  const [lignes, setLignes] = useState<any[]>([]);

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEcriture();
  }, [ecritureId]);

  const loadEcriture = async () => {
    try {
      setLoading(true);
      const data = await ecrituresApi.getOne(ecritureId);
      setEcriture(data);

      // Initialiser les états d'édition
      setDateEcriture(data.date_ecriture.split('T')[0]);
      setNumeroPiece(data.numero_piece);
      setLibelle(data.libelle);
      setLignes(data.lignes || []);
    } catch (err) {
      console.error('Erreur chargement écriture:', err);
      alert('Erreur lors du chargement de l\'écriture');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ecriture) return;

    // Validation
    const totalDebit = lignes.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = lignes.reduce((sum, l) => sum + Number(l.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert('⚠️ L\'écriture n\'est pas équilibrée ! Débit et Crédit doivent être égaux.');
      return;
    }

    try {
      setSaving(true);
      await ecrituresApi.update(ecritureId, {
        journal_id: ecriture.journal_id,
        exercice_id: ecriture.exercice_id,
        entreprise_id: ecriture.entreprise_id,
        date_ecriture: dateEcriture,
        numero_piece: numeroPiece,
        libelle: libelle,
        lignes: lignes.map(l => ({
          numero_compte: l.numero_compte,
          libelle_compte: l.libelle_compte,
          debit: Number(l.debit),
          credit: Number(l.credit),
        })),
      });

      alert('✅ Écriture modifiée avec succès !');
      setModeEdition(false);
      await loadEcriture();
      onUpdate?.();
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      alert(`❌ Erreur lors de la sauvegarde : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (pleinEcran) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || pleinEcran) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const updateLigne = (index: number, field: string, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setLignes(newLignes);
  };

  const ajouterLigne = () => {
    setLignes([...lignes, {
      numero_compte: '',
      libelle_compte: '',
      debit: 0,
      credit: 0,
    }]);
  };

  const supprimerLigne = (index: number) => {
    if (lignes.length <= 2) {
      alert('Une écriture doit avoir au minimum 2 lignes');
      return;
    }
    const newLignes = lignes.filter((_, i) => i !== index);
    setLignes(newLignes);
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

  const modalStyle = pleinEcran
    ? { width: '100vw', height: 'calc(100vh - 64px)', maxWidth: 'none', maxHeight: 'none', borderRadius: 0 }
    : {
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'auto',
      };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4 pt-20"
      onClick={onClose}
      style={{ top: '64px' }}
    >
      <div
        ref={modalRef}
        style={modalStyle}
        className={`bg-white rounded-lg shadow-2xl ${
          pleinEcran ? '' : 'max-w-5xl w-full max-h-[90vh]'
        } overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Draggable */}
        <div
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between"
          onMouseDown={handleMouseDown}
          style={{ cursor: pleinEcran ? 'default' : (isDragging ? 'grabbing' : 'grab') }}
        >
          <h2 className="text-2xl font-bold">
            {modeEdition ? '✏️ Modification de l\'écriture' : '📝 Détail de l\'écriture'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPleinEcran(!pleinEcran)}
              className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
              title={pleinEcran ? 'Mode fenêtre' : 'Plein écran'}
            >
              {pleinEcran ? '⊡' : '⊞'}
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">⏳ Chargement...</p>
            </div>
          ) : ecriture ? (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Informations générales</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Date</p>
                    {modeEdition ? (
                      <input
                        type="date"
                        value={dateEcriture}
                        onChange={(e) => setDateEcriture(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold"
                      />
                    ) : (
                      <p className="font-semibold">{formatDate(ecriture.date_ecriture)}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">N° Pièce</p>
                    {modeEdition ? (
                      <input
                        type="text"
                        value={numeroPiece}
                        onChange={(e) => setNumeroPiece(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-semibold"
                      />
                    ) : (
                      <p className="font-semibold font-mono">{ecriture.numero_piece}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Journal</p>
                    <p className="font-semibold">{ecriture.journal?.code || '-'}</p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-xs text-gray-600 mb-1">Libellé</p>
                    {modeEdition ? (
                      <input
                        type="text"
                        value={libelle}
                        onChange={(e) => setLibelle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold"
                      />
                    ) : (
                      <p className="font-semibold">{ecriture.libelle}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lignes d'écriture */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Lignes comptables</h3>
                  {modeEdition && (
                    <button
                      onClick={ajouterLigne}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                    >
                      ➕ Ajouter une ligne
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Compte</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Libellé</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b">Débit</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b">Crédit</th>
                        {modeEdition && (
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {lignes.map((ligne: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm border-b">
                            {modeEdition ? (
                              <input
                                type="text"
                                value={ligne.numero_compte}
                                onChange={(e) => updateLigne(index, 'numero_compte', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded font-mono font-semibold text-blue-700"
                              />
                            ) : (
                              <span className="font-mono font-semibold text-blue-700">{ligne.numero_compte}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm border-b">
                            {modeEdition ? (
                              <input
                                type="text"
                                value={ligne.libelle_compte}
                                onChange={(e) => updateLigne(index, 'libelle_compte', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            ) : (
                              ligne.libelle_compte
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right border-b">
                            {modeEdition ? (
                              <input
                                type="number"
                                step="0.01"
                                value={ligne.debit}
                                onChange={(e) => updateLigne(index, 'debit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded font-mono text-right"
                              />
                            ) : ligne.debit > 0 ? (
                              <span className="text-green-700 font-semibold font-mono">
                                {formatMontant(ligne.debit)} €
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right border-b">
                            {modeEdition ? (
                              <input
                                type="number"
                                step="0.01"
                                value={ligne.credit}
                                onChange={(e) => updateLigne(index, 'credit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded font-mono text-right"
                              />
                            ) : ligne.credit > 0 ? (
                              <span className="text-orange-700 font-semibold font-mono">
                                {formatMontant(ligne.credit)} €
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          {modeEdition && (
                            <td className="px-4 py-3 text-sm text-center border-b">
                              <button
                                onClick={() => supprimerLigne(index)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold"
                                title="Supprimer cette ligne"
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}

                      {/* Ligne de totaux */}
                      <tr className="bg-blue-100 font-bold">
                        <td className="px-4 py-3 text-sm" colSpan={2}>
                          TOTAUX
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-green-800">
                          {formatMontant(
                            lignes.reduce((sum, l) => sum + Number(l.debit), 0)
                          )} €
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-orange-800">
                          {formatMontant(
                            lignes.reduce((sum, l) => sum + Number(l.credit), 0)
                          )} €
                        </td>
                        {modeEdition && <td className="border-b"></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Validation */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Équilibre de l'écriture</p>
                    <p className="text-lg font-bold">
                      {(() => {
                        const totalDebit = lignes.reduce((sum, l) => sum + Number(l.debit), 0);
                        const totalCredit = lignes.reduce((sum, l) => sum + Number(l.credit), 0);
                        const equilibree = Math.abs(totalDebit - totalCredit) < 0.01;
                        return equilibree ? (
                          <span className="text-green-700">✓ Équilibrée</span>
                        ) : (
                          <span className="text-red-700">✗ Non équilibrée (diff: {formatMontant(Math.abs(totalDebit - totalCredit))} €)</span>
                        );
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">ID Écriture</p>
                    <p className="text-lg font-bold font-mono text-gray-900">#{ecriture.id}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-red-500 text-lg">❌ Écriture non trouvée</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
          <div>
            {modeEdition && (
              <button
                onClick={() => {
                  setModeEdition(false);
                  loadEcriture();
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ❌ Annuler
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {!modeEdition && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Fermer
              </button>
            )}
            {modeEdition ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400"
              >
                {saving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
              </button>
            ) : (
              <button
                onClick={() => setModeEdition(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                ✏️ Modifier
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
