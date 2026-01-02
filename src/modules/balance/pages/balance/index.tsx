import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../../../../components/TopMenu';
import { useEntreprise } from '../../../../contexts/EntrepriseContext';

export default function BalanceSelectionPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [filterClasse, setFilterClasse] = useState<string>('');
  const [filterCompteDebut, setFilterCompteDebut] = useState<string>('');
  const [filterCompteFin, setFilterCompteFin] = useState<string>('');

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
    }
  }, [entreprise, router]);

  useEffect(() => {
    if (exercice) {
      setDateDebut(exercice.date_debut);
      setDateFin(exercice.date_fin);
    }
  }, [exercice]);

  const handleAfficher = () => {
    if (!dateDebut || !dateFin) {
      alert('Veuillez sélectionner une période');
      return;
    }

    const params = new URLSearchParams({
      dateDebut,
      dateFin,
    });

    if (filterClasse) params.append('classe', filterClasse);
    if (filterCompteDebut) params.append('compteDebut', filterCompteDebut);
    if (filterCompteFin) params.append('compteFin', filterCompteFin);

    router.push(`/balance/affichage?${params.toString()}`);
  };

  const setRaccourciPeriode = (type: 'mois-en-cours' | 'mois-dernier' | 'exercice') => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (type === 'mois-en-cours') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      setDateDebut(firstDay.toISOString().split('T')[0]);
      setDateFin(lastDay.toISOString().split('T')[0]);
    } else if (type === 'mois-dernier') {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      setDateDebut(firstDay.toISOString().split('T')[0]);
      setDateFin(lastDay.toISOString().split('T')[0]);
    } else if (type === 'exercice' && exercice) {
      setDateDebut(exercice.date_debut);
      setDateFin(exercice.date_fin);
    }
  };

  if (!entreprise) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Balance Comptable</h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Sélectionnez une période et des filtres optionnels
            </p>
          </div>

          {/* Période */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Période <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Date début</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Date fin</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRaccourciPeriode('mois-en-cours')}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Mois en cours
              </button>
              <button
                type="button"
                onClick={() => setRaccourciPeriode('mois-dernier')}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Mois dernier
              </button>
              <button
                type="button"
                onClick={() => setRaccourciPeriode('exercice')}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Exercice complet
              </button>
            </div>
          </div>

          {/* Classe de comptes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classe de comptes (optionnel)
            </label>
            <select
              value={filterClasse}
              onChange={(e) => {
                setFilterClasse(e.target.value);
                // Auto-remplir la plage de comptes selon la classe
                if (e.target.value) {
                  setFilterCompteDebut(e.target.value);
                  setFilterCompteFin(e.target.value + '9999999');
                } else {
                  setFilterCompteDebut('');
                  setFilterCompteFin('');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les classes</option>
              <option value="1">Classe 1 - Capitaux</option>
              <option value="2">Classe 2 - Immobilisations</option>
              <option value="3">Classe 3 - Stocks</option>
              <option value="4">Classe 4 - Tiers</option>
              <option value="5">Classe 5 - Financiers</option>
              <option value="6">Classe 6 - Charges</option>
              <option value="7">Classe 7 - Produits</option>
            </select>
          </div>

          {/* Plage de comptes */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plage de comptes (optionnel)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Du compte</label>
                <input
                  type="text"
                  value={filterCompteDebut}
                  onChange={(e) => setFilterCompteDebut(e.target.value)}
                  placeholder="Ex: 401"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Au compte</label>
                <input
                  type="text"
                  value={filterCompteFin}
                  onChange={(e) => setFilterCompteFin(e.target.value)}
                  placeholder="Ex: 409"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bouton Afficher */}
          <div className="flex justify-end">
            <button
              onClick={handleAfficher}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Afficher la balance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
