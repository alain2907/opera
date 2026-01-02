import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../../../components/TopMenu';
import { journauxApi, type Journal } from '../../../api/journaux';
import { useEntreprise } from '../../../contexts/EntrepriseContext';

export default function JournalEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { entreprise } = useEntreprise();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    actif: true,
  });

  const isNew = id === 'nouveau';

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
      return;
    }

    if (isNew) {
      setLoading(false);
    } else if (id && typeof id === 'string') {
      loadJournal(parseInt(id));
    }
  }, [id, entreprise, router]);

  const loadJournal = async (journalId: number) => {
    setLoading(true);
    setError(null);
    try {
      const journal = await journauxApi.getById(journalId);
      setFormData({
        code: journal.code,
        libelle: journal.libelle,
        actif: journal.actif,
      });
    } catch (err: any) {
      console.error('Erreur chargement journal:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement du journal');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!entreprise) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (isNew) {
        await journauxApi.create({
          entreprise_id: entreprise.id,
          code: formData.code.toUpperCase(),
          libelle: formData.libelle,
          actif: formData.actif,
        });
        setSuccess('Journal créé avec succès');
        setTimeout(() => router.push('/journaux'), 1500);
      } else {
        await journauxApi.update(parseInt(id as string), {
          code: formData.code.toUpperCase(),
          libelle: formData.libelle,
          actif: formData.actif,
        });
        setSuccess('Journal modifié avec succès');
        setTimeout(() => router.push('/journaux'), 1500);
      }
    } catch (err: any) {
      console.error('Erreur enregistrement journal:', err);
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  if (!entreprise) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-3xl mx-auto p-8">
        <button
          onClick={() => router.push('/journaux')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour à la liste
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isNew ? 'Nouveau journal' : 'Modifier le journal'}
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code du journal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="Ex: AC, VE, BQ..."
                maxLength={10}
                required
                disabled={submitting}
              />
              <p className="mt-1 text-sm text-gray-500">
                Code court identifiant le journal (2-10 caractères)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Libellé <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Journal des achats"
                required
                disabled={submitting}
              />
              <p className="mt-1 text-sm text-gray-500">
                Description complète du journal
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.actif}
                  onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={submitting}
                />
                <span className="text-sm font-medium text-gray-700">Journal actif</span>
              </label>
              <p className="mt-1 ml-6 text-sm text-gray-500">
                Seuls les journaux actifs apparaissent dans la saisie des écritures
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Journaux standards</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>AC</strong> - Journal des achats</li>
                <li><strong>VE</strong> - Journal des ventes</li>
                <li><strong>BQ</strong> - Journal de banque</li>
                <li><strong>CA</strong> - Journal de caisse</li>
                <li><strong>OD</strong> - Journal des opérations diverses</li>
              </ul>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {submitting ? 'Enregistrement...' : (isNew ? 'Créer le journal' : 'Enregistrer les modifications')}
              </button>
              <button
                type="button"
                onClick={() => router.push('/journaux')}
                disabled={submitting}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
