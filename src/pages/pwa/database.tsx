import { useState, useEffect } from 'react';
import PWANavbar from '../../components/PWANavbar';
import { getDB } from '../../lib/indexedDB';

interface TableInfo {
  name: string;
  count: number;
  columns: string[];
  rows: any[];
}

export default function DatabaseViewer() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatabase();
  }, []);

  async function loadDatabase() {
    setLoading(true);
    try {
      const db = await getDB();
      const tableNames = Array.from(db.objectStoreNames);

      console.log('[Database Viewer] Tables trouvées:', tableNames);

      const tableInfos: TableInfo[] = [];

      for (const tableName of tableNames) {
        const tx = db.transaction(tableName, 'readonly');
        const store = tx.objectStore(tableName);
        const allRows = await store.getAll();

        // Obtenir toutes les colonnes (clés) de tous les objets
        const columnsSet = new Set<string>();
        allRows.forEach(row => {
          Object.keys(row).forEach(key => columnsSet.add(key));
        });

        tableInfos.push({
          name: tableName,
          count: allRows.length,
          columns: Array.from(columnsSet),
          rows: allRows,
        });

        console.log(`[Database Viewer] Table ${tableName}: ${allRows.length} lignes, ${columnsSet.size} colonnes`);
      }

      setTables(tableInfos);
      if (tableInfos.length > 0 && !selectedTable) {
        setSelectedTable(tableInfos[0].name);
      }
    } catch (err) {
      console.error('[Database Viewer] Erreur chargement DB:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (typeof value === 'number') return value.toString();

    // Formater les dates
    if (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-')) {
      try {
        const date = new Date(value);
        return date.toLocaleString('fr-FR');
      } catch {
        return value;
      }
    }

    return value.toString();
  }

  const currentTable = tables.find(t => t.name === selectedTable);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />
      <div className="max-w-full mx-auto p-4 pt-24">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">🗄️ Navigateur IndexedDB</h2>
            <p className="text-sm text-gray-600 mt-1">Base: <code className="bg-gray-100 px-2 py-1 rounded">ComptabiliteFrance</code></p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement de la base de données...</p>
            </div>
          ) : (
            <>
              {/* Liste des tables (sidebar) */}
              <div className="grid grid-cols-5 gap-6">
                <div className="col-span-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm">Tables ({tables.length})</h3>
                  <div className="space-y-1">
                    {tables.map(table => (
                      <button
                        key={table.name}
                        onClick={() => setSelectedTable(table.name)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedTable === table.name
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono">{table.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            selectedTable === table.name
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {table.count}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contenu de la table */}
                <div className="col-span-4">
                  {currentTable ? (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 font-mono">{currentTable.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {currentTable.count} ligne(s) × {currentTable.columns.length} colonne(s)
                          </p>
                        </div>
                        <button
                          onClick={loadDatabase}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 font-semibold"
                        >
                          🔄 Actualiser
                        </button>
                      </div>

                      {currentTable.count === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-gray-500">Table vide - Aucune donnée</p>
                          <p className="text-xs text-gray-400 mt-2">Colonnes définies : {currentTable.columns.length > 0 ? currentTable.columns.join(', ') : 'aucune'}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-300 rounded-lg">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                <th className="px-2 py-2 text-left font-semibold border-r border-blue-500 bg-blue-700 sticky left-0 z-10">
                                  #
                                </th>
                                {currentTable.columns.map((col, idx) => (
                                  <th
                                    key={col}
                                    className={`px-3 py-2 text-left font-semibold border-r border-blue-500 ${
                                      col === 'id' ? 'bg-blue-700 sticky left-8 z-10' : ''
                                    }`}
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {currentTable.rows.map((row, rowIdx) => {
                                const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                                return (
                                  <tr key={rowIdx} className={`${rowBg} hover:bg-blue-50 border-b border-gray-200`}>
                                    <td className="px-2 py-2 text-gray-500 font-mono text-xs border-r border-gray-200 bg-inherit sticky left-0 z-5">
                                      {rowIdx + 1}
                                    </td>
                                    {currentTable.columns.map((col) => {
                                      const value = row[col];
                                      const formattedValue = formatValue(value);
                                      const isId = col === 'id';

                                      return (
                                        <td
                                          key={col}
                                          className={`px-3 py-2 border-r border-gray-200 font-mono ${
                                            isId ? 'font-bold text-blue-600 bg-inherit sticky left-8 z-5' : 'text-gray-700'
                                          }`}
                                          style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                          title={formattedValue}
                                        >
                                          {formattedValue || <span className="text-gray-300">null</span>}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Sélectionnez une table</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
