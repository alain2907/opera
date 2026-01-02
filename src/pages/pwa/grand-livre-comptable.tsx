import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEntreprises,
  getAllExercices,
  getAllEcritures,
} from '../../lib/storageAdapter';

interface LigneGrandLivre {
  date: string;
  pieceRef: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  ecritureId: number;
}

interface CompteGrandLivre {
  numeroCompte: string;
  libelleCompte: string;
  lignes: LigneGrandLivre[];
  soldeInitial: number;
  totalDebit: number;
  totalCredit: number;
  soldeFinal: number;
}

export default function GrandLivreComptablePWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [comptesGroupes, setComptesGroupes] = useState<CompteGrandLivre[]>([]);
  const [comptesOuverts, setComptesOuverts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [ecritureDetaillee, setEcritureDetaillee] = useState<any>(null);
  const [toutesLignesEcriture, setToutesLignesEcriture] = useState<any[]>([]);

  // Filtres
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [exerciceId, setExerciceId] = useState<number | undefined>(undefined);
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([]);
  const [compteDebut, setCompteDebut] = useState('');
  const [compteFin, setCompteFin] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadGrandLivre();
    }
  }, [selectedEntreprise, exerciceId, dateDebut, dateFin, classesSelectionnees, compteDebut, compteFin]);

  async function loadData() {
    try {
      const entreprisesData = await getAllEntreprises();
      setEntreprises(entreprisesData);

      // Récupérer entreprise depuis localStorage
      const entrepriseActiveId = localStorage.getItem('pwa_entreprise_active_id');
      const exerciceActiveId = localStorage.getItem('pwa_exercice_actif_id');

      if (entrepriseActiveId) {
        setSelectedEntreprise(Number(entrepriseActiveId));

        const exercicesData = await getAllExercices();
        const exercicesEntreprise = exercicesData.filter((ex: any) => {
          const entId = ex.entrepriseId || ex.entreprise_id;
          return entId === Number(entrepriseActiveId);
        });
        setExercices(exercicesEntreprise);

        if (exerciceActiveId) {
          setExerciceId(Number(exerciceActiveId));
        }
      } else if (entreprisesData.length > 0) {
        setSelectedEntreprise(entreprisesData[0].id);

        const exercicesData = await getAllExercices();
        const exercicesEntreprise = exercicesData.filter((ex: any) => {
          const entId = ex.entrepriseId || ex.entreprise_id;
          return entId === entreprisesData[0].id;
        });
        setExercices(exercicesEntreprise);
      }
    } catch (err) {
      console.error('Erreur chargement:', err);
    }
  }

  const loadGrandLivre = async () => {
    if (!selectedEntreprise) return;

    setLoading(true);
    try {
      const ecritures = await getAllEcritures();

      // Filtrer par entreprise et exercice
      let ecrituresFiltrees = ecritures.filter((e: any) => {
        const exId = e.exerciceId || e.exercice_id;

        // Filtrer par exercice si spécifié
        if (exerciceId && exId !== exerciceId) return false;

        // Vérifier que l'écriture appartient à l'entreprise sélectionnée
        const exercice = exercices.find((ex: any) => ex.id === exId);
        if (!exercice) return false;

        const entId = exercice.entrepriseId || exercice.entreprise_id;
        if (entId !== selectedEntreprise) return false;

        // Filtrer par date
        if (dateDebut && e.date < dateDebut) return false;
        if (dateFin && e.date > dateFin) return false;

        const compte = e.compteNumero || e.compte_numero;

        // Filtrer par classe
        if (classesSelectionnees.length > 0) {
          const classe = compte?.charAt(0);
          if (!classesSelectionnees.includes(classe)) return false;
        }

        // Filtrer par plage de comptes
        if (compteDebut && compte < compteDebut) return false;
        if (compteFin && compte > compteFin) return false;

        return true;
      });

      // Grouper par compte et calculer soldes progressifs
      const comptesMap = new Map<string, CompteGrandLivre>();

      ecrituresFiltrees.forEach((e: any) => {
        const numeroCompte = e.compteNumero || e.compte_numero;
        const libelle = e.libelle || '';

        if (!comptesMap.has(numeroCompte)) {
          comptesMap.set(numeroCompte, {
            numeroCompte,
            libelleCompte: libelle,
            lignes: [],
            soldeInitial: 0,
            totalDebit: 0,
            totalCredit: 0,
            soldeFinal: 0,
          });
        }

        const compte = comptesMap.get(numeroCompte)!;

        const debit = e.debit || 0;
        const credit = e.credit || 0;
        compte.totalDebit += debit;
        compte.totalCredit += credit;

        // Calculer solde progressif
        const soldePrecedent = compte.lignes.length > 0
          ? compte.lignes[compte.lignes.length - 1].solde
          : 0;

        const soldeCourant = soldePrecedent + debit - credit;

        compte.lignes.push({
          date: e.date,
          journal: e.journal || '',
          pieceRef: e.pieceRef || e.numero_piece || '',
          libelle: e.libelle || '',
          debit,
          credit,
          solde: soldeCourant,
          ecritureId: e.id,
        });
      });

      // Calculer solde final pour chaque compte
      const comptes = Array.from(comptesMap.values()).map(compte => {
        compte.soldeFinal = compte.totalDebit - compte.totalCredit;
        return compte;
      });

      // Trier par numéro de compte
      comptes.sort((a, b) => a.numeroCompte.localeCompare(b.numeroCompte));

      setComptesGroupes(comptes);
    } catch (err) {
      console.error('Erreur chargement grand livre:', err);
      alert('Erreur lors du chargement du grand livre');
    } finally {
      setLoading(false);
    }
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
    setComptesOuverts(new Set(comptesGroupes.map(c => c.numeroCompte)));
  };

  const chargerDetailEcriture = async (ligne: LigneGrandLivre) => {
    try {
      const toutesEcritures = await getAllEcritures();

      // Trouver l'écriture par ID
      const ecriturePrincipale = toutesEcritures.find((e: any) => e.id === ligne.ecritureId);
      if (!ecriturePrincipale) {
        console.error('Écriture non trouvée:', ligne.ecritureId);
        return;
      }

      const pieceRef = ecriturePrincipale.pieceRef || ecriturePrincipale.piece_ref;
      const journalId = ecriturePrincipale.journalId || ecriturePrincipale.journal_id;

      let lignesEcriture: any[];

      // Filtrage intelligent : relevés mensuels SANS date, autres AVEC date
      const principalJournal = ecriturePrincipale.journal || '';
      const isReleveMensuel = /^(Relevé|banque|BANQUE)/i.test(pieceRef || '');

      lignesEcriture = toutesEcritures.filter((e: any) => {
        const ref = e.pieceRef || e.piece_ref;
        const eJournal = e.journal || '';
        const eDate = e.date;

        if (isReleveMensuel) {
          // Relevé mensuel : même pieceRef + même journal (SANS date)
          return ref === pieceRef && eJournal === principalJournal;
        } else {
          // Écriture normale : même pieceRef + même date + même journal
          return ref === pieceRef && eDate === ecriturePrincipale.date && eJournal === principalJournal;
        }
      });

      // Trier par ordre d'insertion (id)
      lignesEcriture.sort((a: any, b: any) => (a.id || 0) - (b.id || 0));

      setEcritureDetaillee(ecriturePrincipale);
      setToutesLignesEcriture(lignesEcriture);
    } catch (err) {
      console.error('Erreur chargement détail écriture:', err);
    }
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

  const entrepriseActive = entreprises.find(e => e.id === selectedEntreprise);
  const totauxGeneraux = calculerTotauxGeneraux();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />

      <div className="max-w-7xl mx-auto p-8 pt-24">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">📘 Grand Livre Comptable</h2>
            {entrepriseActive && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{entrepriseActive.raison_sociale || entrepriseActive.nom}</span>
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
                  <p className="text-2xl font-bold text-purple-900">
                    {comptesGroupes.reduce((sum, c) => sum + c.lignes.length, 0)}
                  </p>
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
              </div>
            </>
          )}

          {/* Grand Livre par compte (Accordéon) */}
          {comptesGroupes.length > 0 && (
            <div className="space-y-3">
              {comptesGroupes.map((compte) => {
                const estOuvert = comptesOuverts.has(compte.numeroCompte);

                return (
                  <div key={compte.numeroCompte} className="border border-gray-300 rounded-lg overflow-hidden">
                    {/* En-tête du compte */}
                    <button
                      onClick={() => toggleCompte(compte.numeroCompte)}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{estOuvert ? '▼' : '▶'}</span>
                        <div className="text-left">
                          <p className="font-bold text-lg text-blue-900 font-mono">
                            {compte.numeroCompte}
                          </p>
                          <p className="text-sm text-gray-700">{compte.libelleCompte}</p>
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
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Journal</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">N° Pièce</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Libellé</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Débit</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Crédit</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Solde</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {compte.lignes.map((ligne, index) => (
                              <tr
                                key={index}
                                className="hover:bg-blue-100 transition-colors cursor-pointer"
                                onClick={() => chargerDetailEcriture(ligne)}
                                title="Cliquer pour voir le détail de l'écriture complète"
                              >
                                <td className="px-3 py-2 text-sm font-semibold text-blue-700">
                                  {ligne.journal || '-'}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {formatDate(ligne.date)}
                                </td>
                                <td className="px-3 py-2 text-sm font-mono text-gray-600">
                                  {ligne.pieceRef}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {ligne.libelle}
                                </td>
                                <td className="px-3 py-2 text-sm text-right font-mono">
                                  {ligne.debit > 0 ? formatMontant(ligne.debit) + ' €' : '-'}
                                </td>
                                <td className="px-3 py-2 text-sm text-right font-mono">
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
                                TOTAL {compte.numeroCompte}
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
                Sélectionnez vos filtres pour afficher le grand livre
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Détail Écriture */}
      {ecritureDetaillee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => setEcritureDetaillee(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-green-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    📝 Détail de l'écriture
                  </h2>
                  <p className="text-sm text-green-100">
                    Date: {new Date(ecritureDetaillee.date).toLocaleDateString('fr-FR')} |
                    N° Pièce: {ecritureDetaillee.pieceRef || ecritureDetaillee.piece_ref || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const pieceRef = ecritureDetaillee.pieceRef || ecritureDetaillee.piece_ref;
                      if (pieceRef) {
                        router.push(`/pwa/ecritures?piece=${encodeURIComponent(pieceRef)}`);
                      } else {
                        alert('Impossible d\'éditer cette écriture : référence manquante');
                      }
                    }}
                    className="px-4 py-2 bg-white text-green-600 rounded hover:bg-green-50 transition-colors font-semibold text-sm"
                  >
                    ✏️ Éditer
                  </button>
                  <button
                    onClick={() => setEcritureDetaillee(null)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Table toutes les lignes */}
            <div className="p-6 overflow-auto max-h-[calc(85vh-180px)]">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-sm">Compte</th>
                    <th className="text-left p-3 font-semibold text-sm">Libellé</th>
                    <th className="text-right p-3 font-semibold text-sm">Débit</th>
                    <th className="text-right p-3 font-semibold text-sm">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {toutesLignesEcriture.map((ligne, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm font-mono font-semibold">
                        {ligne.compteNumero || ligne.compte_numero}
                      </td>
                      <td className="p-3 text-sm">{ligne.libelle || '-'}</td>
                      <td className="p-3 text-sm text-right font-mono">
                        {ligne.debit ? `${formatMontant(ligne.debit)} €` : '-'}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {ligne.credit ? `${formatMontant(ligne.credit)} €` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">TOTAL</td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(toutesLignesEcriture.reduce((sum, l) => sum + (l.debit || 0), 0))} €
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(toutesLignesEcriture.reduce((sum, l) => sum + (l.credit || 0), 0))} €
                    </td>
                  </tr>
                </tfoot>
              </table>

              {toutesLignesEcriture.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune ligne trouvée</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
