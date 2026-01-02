import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { entreprisesApi, type Entreprise } from './api/entreprises';
import { ecrituresApi, type Ecriture, type LigneEcriture } from './api/ecritures';
import { PLAN_COMPTABLE, searchCompte, getLibelleCompte } from './data/planComptable';

function App() {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nextNumPiece, setNextNumPiece] = useState('');

  const [formData, setFormData] = useState({
    journal_id: 1,
    exercice_id: 1,
    date_ecriture: new Date().toISOString().split('T')[0],
    numero_piece: '',
    libelle: '',
  });

  const [lignes, setLignes] = useState<LigneEcriture[]>([
    { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
    { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
  ]);

  const [suggestions, setSuggestions] = useState<Record<number, Array<{ code: string; libelle: string }>>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadEntreprises();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadEcritures();
    }
  }, [selectedEntreprise]);

  useEffect(() => {
    if (ecritures.length > 0) {
      const lastPiece = ecritures[0]?.numero_piece;
      if (lastPiece) {
        const num = parseInt(lastPiece.replace(/\D/g, '')) || 0;
        setNextNumPiece(String(num + 1).padStart(4, '0'));
      } else {
        setNextNumPiece('0001');
      }
    } else {
      setNextNumPiece('0001');
    }
  }, [ecritures]);

  useEffect(() => {
    if (nextNumPiece && !formData.numero_piece) {
      setFormData(prev => ({ ...prev, numero_piece: nextNumPiece }));
    }
  }, [nextNumPiece]);

  const loadEntreprises = async () => {
    try {
      const data = await entreprisesApi.getAll();
      setEntreprises(data);
      if (data.length > 0) {
        setSelectedEntreprise(data[0].id!);
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const loadEcritures = async () => {
    if (!selectedEntreprise) return;
    try {
      const data = await ecrituresApi.getAll(selectedEntreprise);
      setEcritures(data);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const totalDebit = lignes.reduce((sum, l) => sum + Number(l.debit), 0);
      const totalCredit = lignes.reduce((sum, l) => sum + Number(l.credit), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Écriture non équilibrée: Débit=${totalDebit.toFixed(2)} / Crédit=${totalCredit.toFixed(2)}`);
      }

      const lignesValides = lignes.filter(l => l.numero_compte && (l.debit > 0 || l.credit > 0));

      if (lignesValides.length < 2) {
        throw new Error('Au moins 2 lignes sont requises');
      }

      await ecrituresApi.create({
        ...formData,
        lignes: lignesValides.map(l => ({
          numero_compte: l.numero_compte,
          libelle_compte: l.libelle_compte,
          debit: Number(l.debit),
          credit: Number(l.credit),
        })),
      });

      setSuccess('Écriture enregistrée avec succès !');
      const newNextNum = String(parseInt(nextNumPiece) + 1).padStart(4, '0');
      setNextNumPiece(newNextNum);
      
      setFormData({
        journal_id: 1,
        exercice_id: 1,
        date_ecriture: new Date().toISOString().split('T')[0],
        numero_piece: newNextNum,
        libelle: '',
      });
      setLignes([
        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
        { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 },
      ]);
      loadEcritures();
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const addLigne = () => {
    setLignes([...lignes, { numero_compte: '', libelle_compte: '', debit: 0, credit: 0 }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 2) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof LigneEcriture, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    
    if (field === 'numero_compte') {
      const results = searchCompte(value);
      setSuggestions(prev => ({ ...prev, [index]: results }));
      setShowSuggestions(prev => ({ ...prev, [index]: value.length > 0 && results.length > 0 }));
      
      const exactMatch = getLibelleCompte(value);
      if (exactMatch && !newLignes[index].libelle_compte) {
        newLignes[index].libelle_compte = exactMatch;
      }
    }
    
    setLignes(newLignes);
    updateLibelleAuto(newLignes);
  };

  const selectSuggestion = (index: number, code: string, libelle: string) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], numero_compte: code, libelle_compte: libelle };
    setLignes(newLignes);
    setShowSuggestions(prev => ({ ...prev, [index]: false }));
    updateLibelleAuto(newLignes);
  };

  const updateLibelleAuto = (currentLignes: LigneEcriture[]) => {
    if (formData.libelle) return;
    
    const premiereLigne = currentLignes[0];
    if (premiereLigne?.libelle_compte) {
      setFormData(prev => ({ ...prev, libelle: premiereLigne.libelle_compte }));
    }
  };

  const totalDebit = lignes.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lignes.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Comptabilité France</h1>
          <p className="text-gray-600 mb-8">Saisie d'écritures comptables</p>

          {entreprises.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Entreprise</label>
              <select
                value={selectedEntreprise || ''}
                onChange={(e) => setSelectedEntreprise(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {entreprises.map((e) => (
                  <option key={e.id} value={e.id}>{e.raison_sociale}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Nouvelle écriture</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={formData.date_ecriture}
                  onChange={(e) => setFormData({ ...formData, date_ecriture: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">N° Pièce (auto)</label>
                <input
                  type="text"
                  value={formData.numero_piece}
                  onChange={(e) => setFormData({ ...formData, numero_piece: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Auto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Journal</label>
                <select
                  value={formData.journal_id}
                  onChange={(e) => setFormData({ ...formData, journal_id: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={1}>Achats</option>
                  <option value={2}>Ventes</option>
                  <option value={3}>Banque</option>
                  <option value={4}>Caisse</option>
                  <option value={5}>OD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Libellé * <span className="text-xs text-gray-500">(suggéré automatiquement)</span>
              </label>
              <input
                type="text"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Se remplit automatiquement..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Lignes d'écriture</h3>
                <button
                  type="button"
                  onClick={addLigne}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                >
                  + Ajouter ligne
                </button>
              </div>

              <div className="space-y-3">
                {lignes.map((ligne, index) => (
                  <div key={index} className="relative">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded border">
                      <div className="col-span-2 relative">
                        <input
                          type="text"
                          placeholder="Compte"
                          value={ligne.numero_compte}
                          onChange={(e) => updateLigne(index, 'numero_compte', e.target.value)}
                          onFocus={() => setShowSuggestions(prev => ({ ...prev, [index]: suggestions[index]?.length > 0 }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        {showSuggestions[index] && suggestions[index]?.length > 0 && (
                          <div className="absolute z-10 w-64 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                            {suggestions[index].map((sugg, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => selectSuggestion(index, sugg.code, sugg.libelle)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs"
                              >
                                <span className="font-mono font-semibold">{sugg.code}</span>
                                <span className="ml-2 text-gray-600">{sugg.libelle}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Libellé (modifiable)"
                          value={ligne.libelle_compte}
                          onChange={(e) => updateLigne(index, 'libelle_compte', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Débit"
                          value={ligne.debit || ''}
                          onChange={(e) => updateLigne(index, 'debit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Crédit"
                          value={ligne.credit || ''}
                          onChange={(e) => updateLigne(index, 'credit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        {lignes.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeLigne(index)}
                            className="text-red-600 hover:text-red-800 text-xl"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-3 bg-gray-100 rounded">
                <div className="grid grid-cols-12 gap-2 font-semibold">
                  <div className="col-span-7 text-right">Totaux:</div>
                  <div className={`col-span-2 text-right ${!isBalanced && totalDebit > 0 ? 'text-red-600' : ''}`}>
                    {totalDebit.toFixed(2)} €
                  </div>
                  <div className={`col-span-2 text-right ${!isBalanced && totalCredit > 0 ? 'text-red-600' : ''}`}>
                    {totalCredit.toFixed(2)} €
                  </div>
                  <div className="col-span-1"></div>
                </div>
                {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
                  <p className="text-red-600 text-sm mt-2">⚠️ Non équilibrée</p>
                )}
                {isBalanced && totalDebit > 0 && (
                  <p className="text-green-600 text-sm mt-2">✓ Équilibrée</p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !isBalanced}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-lg"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>

          {ecritures.length > 0 && (
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Dernières écritures ({ecritures.length})
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {ecritures.map((e) => (
                  <div key={e.id} className="p-3 bg-gray-50 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{e.libelle}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(e.date_ecriture).toLocaleDateString('fr-FR')}
                          {e.numero_piece && ` • N° ${e.numero_piece}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {e.lignes?.reduce((sum, l) => sum + Number(l.debit), 0).toFixed(2)} €
                        </p>
                        <p className="text-xs text-gray-500">{e.lignes?.length || 0} lignes</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
