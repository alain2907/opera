import { useState } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import { getDB } from '../../lib/indexedDB';

export default function CorrigerAccents() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ecritures: number; comptes: number } | null>(null);

  function fixEncoding(text: string): string {
    if (!text) return text;

    const replacements: { [key: string]: string } = {
      'Ã©': 'é',
      'Ã¨': 'è',
      'Ã ': 'à',
      'Ã´': 'ô',
      'Ã®': 'î',
      'Ã§': 'ç',
      'Ã¹': 'ù',
      'Ã»': 'û',
      'Ã¢': 'â',
      'Ãª': 'ê',
      'Ã«': 'ë',
      'Ã¯': 'ï',
      'Ã¼': 'ü',
      'Ã‰': 'É',
      'Ã€': 'À',
      'Ã‡': 'Ç',
      'Å"': 'œ',
      'Ã¦': 'æ',
      'Ã': 'Œ',
      '�': 'é',
    };

    let result = text;
    for (const [bad, good] of Object.entries(replacements)) {
      result = result.replace(new RegExp(bad, 'g'), good);
    }
    return result;
  }

  async function corrigerAccents() {
    if (!confirm('Voulez-vous corriger tous les accents dans la base de données ?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const db = await getDB();

      // Corriger les écritures
      const ecritures = await db.getAll('ecritures');
      let ecrituresCorrigees = 0;

      for (const ecriture of ecritures) {
        const libelleOriginal = ecriture.libelle || '';
        const libelleCorrige = fixEncoding(libelleOriginal);

        if (libelleOriginal !== libelleCorrige) {
          const updated = {
            ...ecriture,
            libelle: libelleCorrige,
            updatedAt: new Date().toISOString(),
          };
          await db.put('ecritures', updated);
          ecrituresCorrigees++;
        }
      }

      // Corriger les comptes
      const comptes = await db.getAll('comptes');
      let comptesCorrigees = 0;

      for (const compte of comptes) {
        const nomOriginal = compte.nom || '';
        const nomCorrige = fixEncoding(nomOriginal);

        if (nomOriginal !== nomCorrige) {
          const updated = {
            ...compte,
            nom: nomCorrige,
            updatedAt: new Date().toISOString(),
          };
          await db.put('comptes', updated);
          comptesCorrigees++;
        }
      }

      setResult({
        ecritures: ecrituresCorrigees,
        comptes: comptesCorrigees,
      });

      alert(`✅ Correction terminée !\n${ecrituresCorrigees} écriture(s) corrigée(s)\n${comptesCorrigees} compte(s) corrigé(s)`);
    } catch (error: any) {
      console.error('Erreur correction:', error);
      alert('Erreur lors de la correction : ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <PWANavbar />
      <div className="max-w-4xl mx-auto p-8 pt-24">
        <button
          onClick={() => router.push('/pwa/database')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour à la base de données
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 Correction des accents
          </h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Que fait cet outil ?</h3>
            <p className="text-yellow-800 text-sm mb-2">
              Cet outil corrige les problèmes d'encodage des accents dans la base de données IndexedDB.
            </p>
            <p className="text-yellow-800 text-sm mb-2">
              <strong>Exemples de corrections :</strong>
            </p>
            <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
              <li>"R�serve l�gale" → "Réserve légale"</li>
              <li>"Soci�t�" → "Société"</li>
              <li>"Op�rations" → "Opérations"</li>
              <li>"Int�r�ts" → "Intérêts"</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Tables concernées</h3>
            <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
              <li><strong>Écritures</strong> : correction du champ "libelle"</li>
              <li><strong>Comptes</strong> : correction du champ "nom"</li>
            </ul>
          </div>

          <button
            onClick={corrigerAccents}
            disabled={loading}
            className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg"
          >
            {loading ? '🔄 Correction en cours...' : '✨ Corriger tous les accents'}
          </button>

          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold text-green-900 mb-2">✅ Correction terminée</h3>
              <div className="space-y-2 text-green-800">
                <p>
                  <strong>{result.ecritures}</strong> écriture(s) corrigée(s)
                </p>
                <p>
                  <strong>{result.comptes}</strong> compte(s) corrigé(s)
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              💡 <strong>Astuce :</strong> Après la correction, vous pouvez vérifier les données corrigées
              sur la page <a href="/pwa/database" className="text-blue-600 hover:underline">Base de données</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
