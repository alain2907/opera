import { useState, useEffect } from 'react';
import { Entreprise } from '../../api/entreprises';

interface EntrepriseFormProps {
  entreprise?: Entreprise;
  onSubmit: (data: Partial<Entreprise>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EntrepriseForm({ entreprise, onSubmit, onCancel, isLoading }: EntrepriseFormProps) {
  const [formData, setFormData] = useState<Partial<Entreprise>>({
    raison_sociale: '',
    siret: '',
    forme_juridique: '',
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
    email: '',
    capital_social: undefined,
    numero_tva_intra: '',
    code_naf: '',
    regime_fiscal: 'Réel Normal',
    notes: '',
    actif: true,
  });

  useEffect(() => {
    if (entreprise) {
      setFormData(entreprise);
    }
  }, [entreprise]);

  const handleChange = (field: keyof Entreprise, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.raison_sociale?.trim()) {
      alert('La raison sociale est obligatoire');
      return;
    }

    // Nettoyer les données
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      acc[key] = value === '' ? null : value;
      return acc;
    }, {} as any);

    await onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations principales */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Informations principales</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raison sociale <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.raison_sociale || ''}
              onChange={(e) => handleChange('raison_sociale', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="Ex: SARL DUPONT COMPTA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forme juridique
            </label>
            <select
              value={formData.forme_juridique || ''}
              onChange={(e) => handleChange('forme_juridique', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Sélectionner --</option>
              <option value="SARL">SARL</option>
              <option value="SAS">SAS</option>
              <option value="SASU">SASU</option>
              <option value="EURL">EURL</option>
              <option value="SA">SA</option>
              <option value="SNC">SNC</option>
              <option value="Auto-entrepreneur">Auto-entrepreneur</option>
              <option value="EI">EI (Entreprise Individuelle)</option>
              <option value="Association">Association</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SIRET
            </label>
            <input
              type="text"
              value={formData.siret || ''}
              onChange={(e) => handleChange('siret', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="14 chiffres"
              maxLength={14}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code NAF
            </label>
            <input
              type="text"
              value={formData.code_naf || ''}
              onChange={(e) => handleChange('code_naf', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 6920Z"
            />
          </div>
        </div>
      </div>

      {/* Coordonnées */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📍 Coordonnées</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            <input
              type="text"
              value={formData.adresse || ''}
              onChange={(e) => handleChange('adresse', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Numéro et nom de rue"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code postal
              </label>
              <input
                type="text"
                value={formData.code_postal || ''}
                onChange={(e) => handleChange('code_postal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="75001"
                maxLength={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville
              </label>
              <input
                type="text"
                value={formData.ville || ''}
                onChange={(e) => handleChange('ville', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Paris"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.telephone || ''}
                onChange={(e) => handleChange('telephone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="01 23 45 67 89"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="contact@entreprise.fr"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Informations fiscales */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">💰 Informations fiscales</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capital social (€)
            </label>
            <input
              type="number"
              value={formData.capital_social || ''}
              onChange={(e) => handleChange('capital_social', e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="10000"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro TVA intracommunautaire
            </label>
            <input
              type="text"
              value={formData.numero_tva_intra || ''}
              onChange={(e) => handleChange('numero_tva_intra', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="FR12345678901"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Régime fiscal
            </label>
            <select
              value={formData.regime_fiscal || ''}
              onChange={(e) => handleChange('regime_fiscal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="Réel Normal">Réel Normal</option>
              <option value="Réel Simplifié">Réel Simplifié</option>
              <option value="Micro-entreprise">Micro-entreprise</option>
              <option value="Micro-BIC">Micro-BIC</option>
              <option value="Micro-BNC">Micro-BNC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 Notes</h3>

        <textarea
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
          rows={4}
          placeholder="Notes internes sur l'entreprise..."
        />
      </div>

      {/* Statut */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <input
          type="checkbox"
          id="actif"
          checked={formData.actif ?? true}
          onChange={(e) => handleChange('actif', e.target.checked)}
          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor="actif" className="text-sm font-medium text-gray-700 cursor-pointer">
          Entreprise active
        </label>
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Enregistrement...' : entreprise ? 'Modifier l\'entreprise' : 'Créer l\'entreprise'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
