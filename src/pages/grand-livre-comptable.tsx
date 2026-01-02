import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import ModalEcriture from '../components/ModalEcriture';
import { grandLivreApi, type LigneGrandLivre } from '../api/grand-livre';
import { exercicesApi, type Exercice } from '../api/exercices';
import { useEntreprise } from '../contexts/EntrepriseContext';

interface CompteGrandLivre {
  numero_compte: string;
  libelle_compte: string;
  lignes: LigneGrandLivre[];
  soldeInitial: number;
  totalDebit: number;
  totalCredit: number;
  soldeFinal: number;
}

export default function GrandLivreComptablePage() {
  const router = useRouter();
  const { entreprise } = useEntreprise();

  // États - TOUS les hooks doivent être déclarés AVANT tout return
  const [lignesGrandLivre, setLignesGrandLivre] = useState<LigneGrandLivre[]>([]);
  const [comptesGroupes, setComptesGroupes] = useState<CompteGrandLivre[]>([]);
  const [comptesOuverts, setComptesOuverts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [ecritureSelectionnee, setEcritureSelectionnee] = useState<number | null>(null);

  // Filtres
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [exerciceId, setExerciceId] = useState<number | undefined>(undefined);
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([]);
  const [compteDebut, setCompteDebut] = useState('');
  const [compteFin, setCompteFin] = useState('');

  useEffect(() => {
    if (entreprise) {
      loadExercices(entreprise.id);
    }
  }, [entreprise]);

  useEffect(() => {
    if (lignesGrandLivre.length > 0) {
      grouperParCompte();
    }
  }, [lignesGrandLivre]);

  const loadExercices = async (entrepriseId: number) => {
    try {
      const data = await exercicesApi.getByEntreprise(entrepriseId);
      setExercices(data);
    } catch (err) {
      console.error('Erreur chargement exercices:', err);
    }
  };

  const loadGrandLivre = async () => {
    if (!entreprise) return;

    setLoading(true);
    try {
      const data = await grandLivreApi.getGrandLivre({
        entreprise_id: entreprise.id,
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined,
        exercice_id: exerciceId,
        classes: classesSelectionnees.length > 0 ? classesSelectionnees : undefined,
        compte_debut: compteDebut || undefined,
        compte_fin: compteFin || undefined,
      });
      setLignesGrandLivre(data);
    } catch (err) {
      console.error('Erreur chargement grand livre:', err);
      alert('Erreur lors du chargement du grand livre');
    } finally {
      setLoading(false);
    }
  };

  const grouperParCompte = () => {
    const comptesMap = new Map<string, CompteGrandLivre>();

    lignesGrandLivre.forEach((ligne) => {
      const key = ligne.numero_compte;

      if (!comptesMap.has(key)) {
        comptesMap.set(key, {
          numero_compte: ligne.numero_compte,
          libelle_compte: ligne.libelle_compte,
          lignes: [],
          soldeInitial: 0,
          totalDebit: 0,
          totalCredit: 0,
          soldeFinal: 0,
        });
      }

      const compte = comptesMap.get(key)!;
      compte.lignes.push(ligne);
      compte.totalDebit += ligne.debit;
      compte.totalCredit += ligne.credit;
    });

    // Calculer solde final pour chaque compte
    const comptes = Array.from(comptesMap.values()).map(compte => {
      compte.soldeFinal = compte.totalDebit - compte.totalCredit;
      return compte;
    });

    // Trier par numéro de compte
    comptes.sort((a, b) => a.numero_compte.localeCompare(b.numero_compte));

    setComptesGroupes(comptes);
  };

  const handleClasseToggle = (classe: string) => {
    setClassesSelectionnees(prev =>
      prev.includes(classe)
        ? prev.filter(c => c !== classe)
        : [...prev, classe]
    );
  };

  const toggleCompte = (numeroCompte: string) => {
    setComptesOuverts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(numeroCompte)) {
        newSet.delete(numeroCompte);
      } else {
        newSet.add(numeroCompte);
      }
      return newSet;
    });
  };

  const ouvrirTousComptes = () => {
    setComptesOuverts(new Set(comptesGroupes.map(c => c.numero_compte)));
  };

  const fermerTousComptes = () => {
    setComptesOuverts(new Set());
  };

  const calculerTotauxGeneraux = () => {
    const totalDebit = comptesGroupes.reduce((sum, compte) => sum + compte.totalDebit, 0);
    const totalCredit = comptesGroupes.reduce((sum, compte) => sum + compte.totalCredit, 0);
    return { totalDebit, totalCredit };
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  const exporterPDF = () => {
    alert('Export PDF en cours de développement...');
  };

  const exporterExcel = () => {
    alert('Export Excel en cours de développement...');
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Grand Livre Comptable</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 mb-4">
                ⚠️ Veuillez d'abord sélectionner une entreprise
              </p>
              <button
                onClick={() => router.push('/selection-entreprise')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Choisir une entreprise
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totauxGeneraux = calculerTotauxGeneraux();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => router.push(`/dashboard/${entreprise.id}`)}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">📘 Grand Livre Comptable</h2>
            {entreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              </p>
            )}
          </div>

          {/* Filtres */}
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Filtres</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exercice
                </label>
                <select
                  value={exerciceId || ''}
                  onChange={(e) => setExerciceId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les exercices</option>
                  {exercices.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      Exercice {ex.annee}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compte de début
                </label>
                <input
                  type="text"
                  value={compteDebut}
                  onChange={(e) => setCompteDebut(e.target.value)}
                  placeholder="Ex: 401000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Compte de fin
                </label>
                <input
                  type="text"
                  value={compteFin}
                  onChange={(e) => setCompteFin(e.target.value)}
                  placeholder="Ex: 409999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Classes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classes de comptes
              </label>
              <div className="flex flex-wrap gap-2">
                {['1', '2', '3', '4', '5', '6', '7'].map((classe) => (
                  <button
                    key={classe}
                    onClick={() => handleClasseToggle(classe)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      classesSelectionnees.includes(classe)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Classe {classe}
                  </button>
                ))}
              </div>
            </div>

            {/* Bouton Générer */}
            <button
              onClick={loadGrandLivre}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? '⏳ Génération en cours...' : '✨ Générer le grand livre'}
            </button>
          </div>

          {/* Stats */}
          {comptesGroupes.length > 0 && (
            <>
              <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-blue-600 mb-1">Comptes</p>
                  <p className="text-2xl font-bold text-blue-900">{comptesGroupes.length}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-purple-600 mb-1">Écritures</p>
                  <p className="text-2xl font-bold text-purple-900">{lignesGrandLivre.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-green-600 mb-1">Total Débit</p>
                  <p className="text-xl font-bold text-green-900">{formatMontant(totauxGeneraux.totalDebit)} €</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-orange-600 mb-1">Total Crédit</p>
                  <p className="text-xl font-bold text-orange-900">{formatMontant(totauxGeneraux.totalCredit)} €</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  onClick={ouvrirTousComptes}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  ⬇️ Ouvrir tous les comptes
                </button>
                <button
                  onClick={fermerTousComptes}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  ⬆️ Fermer tous les comptes
                </button>
                <button
                  onClick={exporterPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  📄 Exporter en PDF
                </button>
                <button
                  onClick={exporterExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  📊 Exporter en Excel
                </button>
              </div>
            </>
          )}

          {/* Grand Livre par compte (Accordéon) */}
          {comptesGroupes.length > 0 && (
            <div className="space-y-3">
              {comptesGroupes.map((compte) => {
                const estOuvert = comptesOuverts.has(compte.numero_compte);

                return (
                  <div key={compte.numero_compte} className="border border-gray-300 rounded-lg overflow-hidden">
                    {/* En-tête du compte */}
                    <button
                      onClick={() => toggleCompte(compte.numero_compte)}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{estOuvert ? '▼' : '▶'}</span>
                        <div className="text-left">
                          <p className="font-bold text-lg text-blue-900 font-mono">
                            {compte.numero_compte}
                          </p>
                          <p className="text-sm text-gray-700">{compte.libelle_compte}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Débit</p>
                          <p className="font-bold text-green-700 font-mono">{formatMontant(compte.totalDebit)} €</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Crédit</p>
                          <p className="font-bold text-orange-700 font-mono">{formatMontant(compte.totalCredit)} €</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Solde</p>
                          <p className={`font-bold font-mono text-lg ${
                            compte.soldeFinal >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {formatMontant(compte.soldeFinal)} €
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Écritures</p>
                          <p className="font-bold text-blue-700">{compte.lignes.length}</p>
                        </div>
                      </div>
                    </button>

                    {/* Détail des écritures */}
                    {estOuvert && (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100 border-t border-gray-300">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">N° Pièce</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Libellé</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Débit</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Crédit</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Solde</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {compte.lignes.map((ligne, index) => (
                              <tr
                                key={index}
                                onClick={() => setEcritureSelectionnee(ligne.ecriture_id)}
                                className="hover:bg-blue-100 transition-colors cursor-pointer"
                                title="Cliquer pour voir le détail de l'écriture"
                              >
                                <td className="px-4 py-2 text-sm">
                                  {formatDate(ligne.date_ecriture)}
                                </td>
                                <td className="px-4 py-2 text-sm font-mono text-gray-600">
                                  {ligne.numero_piece}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {ligne.libelle_ecriture}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-mono">
                                  {ligne.debit > 0 ? formatMontant(ligne.debit) + ' €' : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-mono">
                                  {ligne.credit > 0 ? formatMontant(ligne.credit) + ' €' : '-'}
                                </td>
                                <td className={`px-4 py-2 text-sm text-right font-mono font-semibold ${
                                  ligne.solde >= 0 ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {formatMontant(ligne.solde)} €
                                </td>
                              </tr>
                            ))}

                            {/* Ligne de totaux pour ce compte */}
                            <tr className="bg-blue-100 font-bold">
                              <td className="px-4 py-2 text-sm" colSpan={3}>
                                TOTAL {compte.numero_compte}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-mono text-green-800">
                                {formatMontant(compte.totalDebit)} €
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-mono text-orange-800">
                                {formatMontant(compte.totalCredit)} €
                              </td>
                              <td className={`px-4 py-2 text-sm text-right font-mono ${
                                compte.soldeFinal >= 0 ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {formatMontant(compte.soldeFinal)} €
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Totaux généraux */}
              <div className="border-2 border-blue-600 rounded-lg overflow-hidden mt-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">TOTAUX GÉNÉRAUX</h3>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-blue-200">Total Débit</p>
                        <p className="font-bold text-xl font-mono">{formatMontant(totauxGeneraux.totalDebit)} €</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-200">Total Crédit</p>
                        <p className="font-bold text-xl font-mono">{formatMontant(totauxGeneraux.totalCredit)} €</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-200">Solde Global</p>
                        <p className="font-bold text-2xl font-mono">{formatMontant(totauxGeneraux.totalDebit - totauxGeneraux.totalCredit)} €</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && comptesGroupes.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-lg mb-2">
                📘 Aucun résultat
              </p>
              <p className="text-gray-400 text-sm">
                Sélectionnez vos filtres et cliquez sur "Générer le grand livre"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Écriture */}
      {ecritureSelectionnee && (
        <ModalEcriture
          ecritureId={ecritureSelectionnee}
          onClose={() => setEcritureSelectionnee(null)}
          onUpdate={() => {
            // Recharger le Grand Livre après modification
            loadGrandLivre();
          }}
        />
      )}
    </div>
  );
}
