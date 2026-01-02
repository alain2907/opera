import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';

type ExportFile = {
  filename: string;
  size: number;
  created: string;
  modified: string;
};

type ExportsResp = {
  files: ExportFile[];
  directory: string;
};

export default function ExportsPage() {
  const router = useRouter();
  const [data, setData] = useState<ExportsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('http://localhost:3001/api/export/list');
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ExportsResp;
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function openFolder() {
    try {
      const res = await fetch('http://localhost:3001/api/export/open-folder');
      if (res.ok) {
        const result = await res.json();
        alert(`Dossier ouvert : ${result.directory}`);
      }
    } catch (e: any) {
      alert(`Erreur : ${e?.message ?? 'Impossible d\'ouvrir le dossier'}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    const mb = kb / 1024;
    return mb.toFixed(1) + ' MB';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopMenu />
      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Exports CSV</h1>
          <div className="flex gap-3">
            <button
              onClick={load}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Chargement…' : 'Actualiser'}
            </button>
            <button
              onClick={openFolder}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              📁 Ouvrir le dossier
            </button>
          </div>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            Erreur : {err}
          </div>
        )}

        {data && (
          <>
            <div className="bg-white p-4 rounded-lg shadow mb-4">
              <p className="text-sm text-gray-600">
                Dossier : <code className="bg-gray-100 px-2 py-1 rounded">{data.directory}</code>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {data.files.length} fichier{data.files.length > 1 ? 's' : ''} exporté{data.files.length > 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nom du fichier
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Taille
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de création
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dernière modification
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.files.map((f) => (
                      <tr key={f.filename} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
                          {f.filename}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {formatSize(f.size)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {new Date(f.created).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {new Date(f.modified).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.files.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun fichier exporté
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
