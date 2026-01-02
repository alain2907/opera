import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEntreprises,
  getAllExercices,
  getAllEcritures,
  deleteEcriture,
  clearEcritures,
} from '../../lib/storageAdapter';

type TableView = 'entreprises' | 'exercices' | 'ecritures';

export default function GestionEcrituresPWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [ecritures, setEcritures] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableView>('ecritures');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [entreprisesData, exercicesData, ecrituresData] = await Promise.all([
        getAllEntreprises(),
        getAllExercices(),
        getAllEcritures()
      ]);
      setEntreprises(entreprisesData);
      setExercices(exercicesData);
      setEcritures(ecrituresData);

      console.log('[DB View] Entreprises:', entreprisesData.length);
      console.log('[DB View] Exercices:', exercicesData.length);
      console.log('[DB View] Écritures:', ecrituresData.length);
    } catch (err) {
      console.error('Erreur chargement DB:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEcriture(id: number) {
    if (!confirm('Supprimer cette écriture ?')) return;
    try {
      await deleteEcriture(id);
      await loadAllData();
      alert('Écriture supprimée');
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  }

  async function handleClearEcritures() {
    if (!confirm('Supprimer TOUTES les écritures ?\n\nCette action est irréversible !')) return;
    try {
      await clearEcritures();
      await loadAllData();
      alert('Toutes les écritures ont été supprimées');
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  }

  // Fonction pour obtenir toutes les clés d'un objet (colonnes)
  function getAllKeys(data: any[]): string[] {
    const keysSet = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => keysSet.add(key));
    });
    return Array.from(keysSet);
  }

  // Fonction pour formater une valeur
  function formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'number') return value.toString();
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-'))) {
      try {
        return new Date(value).toLocaleString('fr-FR');
      } catch {
        return value.toString();
      }
    }
    return value.toString();
  }

  // Données de la table sélectionnée
  let currentData: any[] = [];
  let currentColumns: string[] = [];

  if (selectedTable === 'entreprises') {
    currentData = entreprises;
    currentColumns = getAllKeys(entreprises);
  } else if (selectedTable === 'exercices') {
    currentData = exercices;
    currentColumns = getAllKeys(exercices);
  } else {
    currentData = ecritures;
    currentColumns = getAllKeys(ecritures);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />
      <div className="max-w-full mx-auto p-4 pt-24">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Vue Base de Données IndexedDB</h2>

          {/* Sélecteur de table */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTable('entreprises')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedTable === 'entreprises'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏢 Entreprises ({entreprises.length})
              </button>
              <button
                onClick={() => setSelectedTable('exercices')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedTable === 'exercices'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📅 Exercices ({exercices.length})
              </button>
              <button
                onClick={() => setSelectedTable('ecritures')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedTable === 'ecritures'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📝 Écritures ({ecritures.length})
              </button>
            </div>

            {selectedTable === 'ecritures' && (
              <button
                onClick={handleClearEcritures}
                disabled={ecritures.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold"
              >
                🗑️ Vider les écritures
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-600">
              Table <strong>{selectedTable}</strong> : <strong>{currentData.length}</strong> ligne(s) × <strong>{currentColumns.length}</strong> colonne(s)
            </p>
          </div>

          {/* Vue dynamique de la table */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Aucune donnée dans cette table</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    {currentColumns.map((col, idx) => (
                      <th
                        key={col}
                        className={`px-3 py-2 text-left font-semibold border-r border-blue-500 ${
                          idx === 0 ? 'sticky left-0 bg-blue-600 z-10' : ''
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                    {selectedTable === 'ecritures' && (
                      <th className="px-3 py-2 text-center font-semibold">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {currentData.map((row, rowIdx) => {
                    const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                    return (
                      <tr key={rowIdx} className={`${rowBg} hover:bg-blue-50 border-b border-gray-200`}>
                        {currentColumns.map((col, colIdx) => {
                          const value = row[col];
                          const formattedValue = formatValue(value);

                          return (
                            <td
                              key={col}
                              className={`px-3 py-2 border-r border-gray-200 font-mono text-gray-700 ${
                                colIdx === 0 ? 'sticky left-0 bg-inherit font-semibold' : ''
                              }`}
                              style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              title={formattedValue}
                            >
                              {formattedValue}
                            </td>
                          );
                        })}
                        {selectedTable === 'ecritures' && (
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleDeleteEcriture(row.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 font-semibold"
                            >
                              ✕
                            </button>
                          </td>
                        )}
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
