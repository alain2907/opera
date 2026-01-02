import { useState, useEffect } from 'react';
import { Compte } from '../../types/compte';

interface CompteFormProps {
  entrepriseId?: number;
  compte?: Compte;
  onSubmit: (data: Partial<Compte>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CompteForm({ entrepriseId, compte, onSubmit, onCancel, isLoading = false }: CompteFormProps) {
  const [formData, setFormData] = useState<Partial<Compte>>({
    entreprise_id: entrepriseId || compte?.entreprise_id || 0,
    numero_compte: compte?.numero_compte || '',
    libelle: compte?.libelle || '',
    actif: compte?.actif ?? true,
    taux_tva: compte?.taux_tva ?? null,
    compte_charge: compte?.compte_charge || null,
    compte_tva: compte?.compte_tva || null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (compte) {
      setFormData({
        entreprise_id: compte.entreprise_id,
        numero_compte: compte.numero_compte,
        libelle: compte.libelle,
        actif: compte.actif,
        taux_tva: compte.taux_tva,
        compte_charge: compte.compte_charge,
        compte_tva: compte.compte_tva,
      });
    }
  }, [compte]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numero_compte?.trim()) {
      newErrors.numero_compte = 'Le numéro de compte est obligatoire';
    } else if (formData.numero_compte.length > 20) {
      newErrors.numero_compte = 'Le numéro de compte ne peut pas dépasser 20 caractères';
    }

    if (!formData.libelle?.trim()) {
      newErrors.libelle = 'Le libellé est obligatoire';
    } else if (formData.libelle.length > 255) {
      newErrors.libelle = 'Le libellé ne peut pas dépasser 255 caractères';
    }

    if (formData.taux_tva !== null && formData.taux_tva !== undefined) {
      const taux = Number(formData.taux_tva);
      if (isNaN(taux) || taux < 0 || taux > 100) {
        newErrors.taux_tva = 'Le taux de TVA doit être entre 0 et 100';
      }
    }

    if (formData.compte_charge && formData.compte_charge.length > 20) {
      newErrors.compte_charge = 'Le compte de charge ne peut pas dépasser 20 caractères';
    }

    if (formData.compte_tva && formData.compte_tva.length > 20) {
      newErrors.compte_tva = 'Le compte de TVA ne peut pas dépasser 20 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const handleChange = (field: keyof Compte, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Informations du compte (Bleu) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Informations du compte</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de compte <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.numero_compte || ''}
              onChange={(e) => handleChange('numero_compte', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.numero_compte ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={20}
              required
              disabled={isLoading}
            />
            {errors.numero_compte && (
              <p className="text-red-500 text-sm mt-1">{errors.numero_compte}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Libellé <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.libelle || ''}
              onChange={(e) => handleChange('libelle', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.libelle ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={255}
              required
              disabled={isLoading}
            />
            {errors.libelle && (
              <p className="text-red-500 text-sm mt-1">{errors.libelle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Configuration TVA (Vert) */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Configuration TVA</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taux de TVA (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.taux_tva ?? ''}
              onChange={(e) => handleChange('taux_tva', e.target.value ? parseFloat(e.target.value) : null)}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.taux_tva ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.taux_tva && (
              <p className="text-red-500 text-sm mt-1">{errors.taux_tva}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compte de charge
            </label>
            <input
              type="text"
              value={formData.compte_charge || ''}
              onChange={(e) => handleChange('compte_charge', e.target.value || null)}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.compte_charge ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={20}
              disabled={isLoading}
            />
            {errors.compte_charge && (
              <p className="text-red-500 text-sm mt-1">{errors.compte_charge}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compte de TVA
            </label>
            <input
              type="text"
              value={formData.compte_tva || ''}
              onChange={(e) => handleChange('compte_tva', e.target.value || null)}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.compte_tva ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={20}
              disabled={isLoading}
            />
            {errors.compte_tva && (
              <p className="text-red-500 text-sm mt-1">{errors.compte_tva}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Statut (Gris) */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut</h3>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="actif"
            checked={formData.actif ?? true}
            onChange={(e) => handleChange('actif', e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            disabled={isLoading}
          />
          <label htmlFor="actif" className="ml-2 block text-sm text-gray-700">
            Compte actif
          </label>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-4 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          disabled={isLoading}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? 'Enregistrement...' : compte ? 'Mettre à jour' : 'Créer'}
        </button>
      </div>
    </form>
  );
}
