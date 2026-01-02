import { useState, useEffect } from 'react';
import { Journal } from '../../api/journaux';

interface JournalFormProps {
  entrepriseId: number;
  journal?: Journal;
  onSubmit: (data: Partial<Journal>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function JournalForm({
  entrepriseId,
  journal,
  onSubmit,
  onCancel,
  isLoading = false,
}: JournalFormProps) {
  const [formData, setFormData] = useState<Partial<Journal>>({
    entreprise_id: entrepriseId,
    code: '',
    libelle: '',
    actif: true,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (journal) {
      setFormData({
        entreprise_id: journal.entreprise_id,
        code: journal.code,
        libelle: journal.libelle,
        actif: journal.actif,
      });
    }
  }, [journal]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.code?.trim()) {
      newErrors.code = 'Le code est obligatoire';
    } else if (formData.code.length > 10) {
      newErrors.code = 'Le code ne peut pas dépasser 10 caractères';
    }

    if (!formData.libelle?.trim()) {
      newErrors.libelle = 'Le libellé est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Informations du journal - Bleu */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          📖 Informations du journal
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code du journal *
            </label>
            <input
              type="text"
              value={formData.code || ''}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              placeholder="Ex: AC, VE, BQ, CA, OD"
              maxLength={10}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              } ${isLoading ? 'bg-gray-100' : ''}`}
            />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Code court (2-3 lettres majuscules)
            </p>
          </div>

          {/* Libellé */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Libellé *
            </label>
            <input
              type="text"
              value={formData.libelle || ''}
              onChange={(e) => handleChange('libelle', e.target.value)}
              placeholder="Ex: Achats, Ventes, Banque, Caisse, Opérations Diverses"
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.libelle ? 'border-red-500' : 'border-gray-300'
              } ${isLoading ? 'bg-gray-100' : ''}`}
            />
            {errors.libelle && <p className="mt-1 text-sm text-red-600">{errors.libelle}</p>}
          </div>
        </div>
      </div>

      {/* Section 2: Statut - Gris */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          🔘 Statut
        </h3>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.actif || false}
              onChange={(e) => handleChange('actif', e.target.checked)}
              disabled={isLoading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm font-medium text-gray-700">
            {formData.actif ? '✅ Journal actif' : '❌ Journal inactif'}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Un journal inactif ne peut plus être utilisé pour de nouvelles écritures
        </p>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Enregistrement...</span>
            </>
          ) : (
            <span>{journal ? 'Mettre à jour' : 'Créer le journal'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
