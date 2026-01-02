import { useState } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import { getDB } from '../../lib/indexedDB';

export default function ImportJSONV6() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const [stats, setStats] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setStats(null);

    try {
      // Lire le fichier JSON
      const text = await file.text();
      const data = JSON.parse(text);

      console.log('[Import] Fichier JSON chargé:', data);

      // Vérifier que c'est bien un format v6
      if (data.version !== 6) {
        throw new Error(`Format non supporté: v${data.version}. Attendu: v6`);
      }

      // Ouvrir IndexedDB
      const db = await getDB();

      let stats = {
        entreprises: 0,
        exercices: 0,
        ecritures: 0,
        lignes: 0,
        comptes: 0,
        journaux: 0,
      };

      // IMPORTANT: Vider d'abord toutes les données existantes
      console.log('[Import] Suppression des données existantes...');
      await db.clear('entreprises');
      await db.clear('exercices');
      await db.clear('ecritures');
      await db.clear('comptes');
      await db.clear('journaux');

      // Importer les entreprises
      if (data.data.entreprises) {
        for (const entreprise of data.data.entreprises) {
          await db.add('entreprises', {
            ...entreprise,
            createdAt: entreprise.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          stats.entreprises++;
        }
      }

      // Importer les exercices
      if (data.data.exercices) {
        for (const exercice of data.data.exercices) {
          await db.add('exercices', {
            ...exercice,
            createdAt: exercice.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          stats.exercices++;
        }
      }

      // Importer les comptes
      if (data.data.comptes) {
        for (const compte of data.data.comptes) {
          await db.put('comptes', {
            numero: compte.numero || compte.numeroCompte || compte.numero_compte,
            nom: compte.nom || compte.libelle || '',
            type: compte.type || 'General',
            createdAt: compte.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          stats.comptes++;
        }
      }

      // Importer les journaux
      if (data.data.journaux) {
        for (const journal of data.data.journaux) {
          await db.put('journaux', {
            code: journal.code,
            libelle: journal.libelle,
            type: journal.type || 'Général',
            createdAt: journal.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          stats.journaux++;
        }
      }

      // Importer les écritures v6 (format groupé avec lignes[])
      // Les ÉCLATER en lignes individuelles pour IndexedDB v5
      if (data.data.ecritures) {
        console.log('[Import] Import des écritures v6...');

        for (const ecriture of data.data.ecritures) {
          if (!ecriture.lignes || !Array.isArray(ecriture.lignes)) {
            console.warn('[Import] Écriture sans lignes, ignorée:', ecriture);
            continue;
          }

          // Pour chaque ligne de l'écriture groupée, créer une ligne individuelle
          for (const ligne of ecriture.lignes) {
            await db.add('ecritures', {
              exerciceId: ecriture.exerciceId,
              date: ecriture.date,
              journal: ecriture.journal,
              pieceRef: ecriture.pieceRef,
              libelle: ligne.libelle || ecriture.libelle,
              compteNumero: ligne.compteNumero,
              debit: ligne.debit || undefined,
              credit: ligne.credit || undefined,
              createdAt: ecriture.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any);

            stats.lignes++;
          }

          stats.ecritures++;
        }
      }

      setStats(stats);
      setResult({
        success: `Import réussi ! ${stats.entreprises} entreprises, ${stats.exercices} exercices, ${stats.ecritures} écritures (${stats.lignes} lignes), ${stats.comptes} comptes, ${stats.journaux} journaux.`
      });

      console.log('[Import] Terminé avec succès:', stats);

    } catch (err: any) {
      console.error('[Import] Erreur:', err);
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PWANavbar />
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Import JSON v6</h1>
          <button
            onClick={() => router.push('/pwa/balance-comptable')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            ← Retour
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Importer les données</h2>

          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Attention :</strong> L'import va <strong>SUPPRIMER TOUTES</strong> les données existantes
              et les remplacer par celles du fichier JSON.
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              Assurez-vous d'avoir une sauvegarde avant de continuer.
            </p>
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">
              Sélectionnez le fichier JSON v6 :
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          {loading && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800">Import en cours...</p>
            </div>
          )}

          {result?.success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 font-semibold">✅ {result.success}</p>
              {stats && (
                <div className="mt-4 space-y-1 text-sm">
                  <p>• Entreprises: {stats.entreprises}</p>
                  <p>• Exercices: {stats.exercices}</p>
                  <p>• Écritures: {stats.ecritures}</p>
                  <p>• Lignes d'écriture: {stats.lignes}</p>
                  <p>• Comptes: {stats.comptes}</p>
                  <p>• Journaux: {stats.journaux}</p>
                </div>
              )}
              <button
                onClick={() => router.push('/pwa/balance-comptable')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                → Voir la balance comptable
              </button>
            </div>
          )}

          {result?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-semibold">❌ Erreur</p>
              <p className="text-red-700 text-sm mt-2">{result.error}</p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Format attendu</h2>
          <p className="text-sm text-gray-600 mb-2">
            Le fichier JSON doit avoir cette structure :
          </p>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "version": 6,
  "exportedAt": "2025-12-04T...",
  "data": {
    "entreprises": [...],
    "exercices": [...],
    "ecritures": [
      {
        "id": 1,
        "exerciceId": 1,
        "date": "2025-01-01",
        "journal": "AN",
        "pieceRef": "Report",
        "libelle": "...",
        "lignes": [
          {
            "compteNumero": "101",
            "libelle": "...",
            "credit": 8000
          },
          ...
        ],
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "comptes": [...],
    "journaux": [...]
  }
}`}
          </pre>
        </div>
      </div>
    </>
  );
}
