import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEntreprises,
  getAllExercices,
  getAllEcritures,
  getAllComptes
} from '../../lib/storageAdapter';

interface Entreprise {
  id: number;
  raison_sociale?: string;
  nom?: string;
}

interface Exercice {
  id: number;
  entreprise_id?: number;
  entrepriseId?: number;
  annee: number;
  date_debut?: string;
  dateDebut?: string;
  date_fin?: string;
  dateFin?: string;
}

interface Ecriture {
  id: number;
  exercice_id?: number;
  exerciceId?: number;
  date: string;
  debit?: number;
  credit?: number;
  compteNumero?: string;
  compte_numero?: string;
  libelle?: string;
}

interface Compte {
  numero_compte?: string;
  numeroCompte?: string;
  nom?: string;
  libelle?: string;
}

interface LigneBalance {
  numero_compte: string;
  libelle: string;
  soldes_par_periode: number[];
  solde_total: number;
}

interface PeriodeLabel {
  label: string;
  debut: Date;
  fin: Date;
}

export default function BalanceProgressiveComptablePWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedEntrepriseId, setSelectedEntrepriseId] = useState<number | null>(null);
  const [balanceData, setBalanceData] = useState<{ periodes: PeriodeLabel[]; lignes: LigneBalance[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [compteSelectionne, setCompteSelectionne] = useState<{ numero: string; libelle: string } | null>(null);

  // Filtres
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [exerciceId, setExerciceId] = useState<number | undefined>(undefined);
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([]);
  const [compteDebut, setCompteDebut] = useState('');
  const [compteFin, setCompteFin] = useState('');
  const [inclureComptesVides, setInclureComptesVides] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Charger la balance automatiquement quand l'entreprise est sélectionnée
  useEffect(() => {
    if (selectedEntrepriseId) {
      loadBalance();
    }
  }, [selectedEntrepriseId, exerciceId, dateDebut, dateFin, classesSelectionnees, compteDebut, compteFin, inclureComptesVides]);

  const loadInitialData = async () => {
    try {
      const allEntreprises = await getAllEntreprises();
      setEntreprises(allEntreprises);

      const allExercices = await getAllExercices();

      // Dédoublonner par ID
      const uniqueExercices = allExercices.filter((ex: any, index: number, self: any[]) =>
        index === self.findIndex((e: any) => e.id === ex.id)
      );

      setExercices(uniqueExercices);

      // Sélectionner la première entreprise par défaut
      if (allEntreprises.length > 0) {
        setSelectedEntrepriseId(allEntreprises[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
    }
  };

  const loadBalance = async () => {
    if (!selectedEntrepriseId) return;

    setLoading(true);
    try {
      // Récupérer toutes les données nécessaires
      const allEcritures = await getAllEcritures();
      const allComptes = await getAllComptes();

      // Filtrer les écritures selon les critères
      let ecrituresFiltrees = allEcritures.filter((e: Ecriture) => {
        const exerciceIdField = e.exerciceId || e.exercice_id;

        // Filtrer par exercice si spécifié
        if (exerciceId && exerciceIdField !== exerciceId) {
          return false;
        }

        // Vérifier que l'écriture appartient à un exercice de l'entreprise sélectionnée
        const exercice = exercices.find((ex) => ex.id === exerciceIdField);
        if (!exercice) return false;

        const entrepriseIdField = exercice.entrepriseId || exercice.entreprise_id;
        if (entrepriseIdField !== selectedEntrepriseId) {
          return false;
        }

        // Filtrer par date
        const ecritureDate = new Date(e.dateEcriture || e.date_ecriture || e.date);
        if (dateDebut && ecritureDate < new Date(dateDebut)) return false;
        if (dateFin && ecritureDate > new Date(dateFin)) return false;

        return true;
      });

      // Déterminer la plage de dates
      let debut: Date;
      let fin: Date;

      if (dateDebut && dateFin) {
        debut = new Date(dateDebut);
        fin = new Date(dateFin);
      } else if (exerciceId) {
        const exercice = exercices.find((ex) => ex.id === exerciceId);
        if (exercice) {
          debut = new Date(exercice.dateDebut || exercice.date_debut || `${exercice.annee}-01-01`);
          fin = new Date(exercice.dateFin || exercice.date_fin || `${exercice.annee}-12-31`);
        } else {
          debut = new Date();
          fin = new Date();
        }
      } else {
        // Utiliser toutes les écritures pour déterminer la plage
        if (ecrituresFiltrees.length === 0) {
          setBalanceData({ periodes: [], lignes: [] });
          setLoading(false);
          return;
        }

        const dates = ecrituresFiltrees.map((e: Ecriture) =>
          new Date(e.dateEcriture || e.date_ecriture || e.date)
        );
        debut = new Date(Math.min(...dates.map(d => d.getTime())));
        fin = new Date(Math.max(...dates.map(d => d.getTime())));
      }

      // Générer les périodes mensuelles
      const periodes: PeriodeLabel[] = [];
      const currentDate = new Date(debut.getFullYear(), debut.getMonth(), 1);
      const endDate = new Date(fin.getFullYear(), fin.getMonth(), 1);

      while (currentDate <= endDate) {
        const moisDebut = new Date(currentDate);
        const moisFin = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        periodes.push({
          label: `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`,
          debut: moisDebut,
          fin: moisFin,
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Calculer les soldes progressifs par compte
      const comptesMap = new Map<string, LigneBalance>();

      // Initialiser tous les comptes
      allComptes.forEach((compte: Compte) => {
        const numeroCompte = compte.numeroCompte || compte.numero_compte || '';
        const libelle = compte.libelle || compte.nom || '';

        // Filtrer par classe si spécifié
        if (classesSelectionnees.length > 0) {
          const classe = numeroCompte.charAt(0);
          if (!classesSelectionnees.includes(classe)) return;
        }

        // Filtrer par plage de comptes
        if (compteDebut && numeroCompte < compteDebut) return;
        if (compteFin && numeroCompte > compteFin) return;

        comptesMap.set(numeroCompte, {
          numero_compte: numeroCompte,
          libelle,
          soldes_par_periode: new Array(periodes.length).fill(0),
          solde_total: 0,
        });
      });

      // Calculer les mouvements par période
      ecrituresFiltrees.forEach((ecriture: Ecriture) => {
        const ecritureDate = new Date(ecriture.date);
        const numeroCompte = ecriture.compteNumero || ecriture.compte_numero || '';
        const libelleCompte = ecriture.libelle || '';

        // Créer le compte s'il n'existe pas déjà
        if (!comptesMap.has(numeroCompte)) {
          // Filtrer par classe si spécifié
          if (classesSelectionnees.length > 0) {
            const classe = numeroCompte.charAt(0);
            if (!classesSelectionnees.includes(classe)) return;
          }

          // Filtrer par plage de comptes
          if (compteDebut && numeroCompte < compteDebut) return;
          if (compteFin && numeroCompte > compteFin) return;

          comptesMap.set(numeroCompte, {
            numero_compte: numeroCompte,
            libelle: libelleCompte,
            soldes_par_periode: new Array(periodes.length).fill(0),
            solde_total: 0,
          });
        }

        const compteData = comptesMap.get(numeroCompte);
        if (!compteData) return;

        const mouvement = (ecriture.debit || 0) - (ecriture.credit || 0);

        // Trouver la période de cette écriture
        const periodeIndex = periodes.findIndex(
          (p) => ecritureDate >= p.debut && ecritureDate <= p.fin
        );

        if (periodeIndex !== -1) {
          // Ajouter le mouvement à cette période ET à toutes les périodes suivantes (progressif)
          for (let i = periodeIndex; i < periodes.length; i++) {
            compteData.soldes_par_periode[i] += mouvement;
          }
          compteData.solde_total += mouvement;
        }
      });

      // Convertir en array et filtrer les comptes vides si nécessaire
      let lignes = Array.from(comptesMap.values());

      if (!inclureComptesVides) {
        lignes = lignes.filter((ligne) => ligne.solde_total !== 0);
      }

      // Trier par numéro de compte
      lignes.sort((a, b) => a.numero_compte.localeCompare(b.numero_compte));

      setBalanceData({ periodes, lignes });
    } catch (err) {
      console.error('Erreur calcul balance progressive:', err);
      alert('Erreur lors du calcul de la balance progressive');
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

  const calculerTotaux = () => {
    if (!balanceData) return { totauxParPeriode: [], total: 0 };

    const totauxParPeriode = balanceData.periodes.map((_, periodeIndex) => {
      return balanceData.lignes.reduce((sum, ligne) => sum + ligne.soldes_par_periode[periodeIndex], 0);
    });

    const total = balanceData.lignes.reduce((sum, ligne) => sum + ligne.solde_total, 0);

    return { totauxParPeriode, total };
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  const selectedEntreprise = entreprises.find((e) => e.id === selectedEntrepriseId);
  const exercicesFiltres = exercices.filter((ex) => {
    const entrepriseIdField = ex.entrepriseId || ex.entreprise_id;
    return entrepriseIdField === selectedEntrepriseId;
  });
  const totaux = calculerTotaux();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />
      <div className="max-w-7xl mx-auto p-8 pt-24">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Balance Progressive Comptable</h2>

            {/* Sélection entreprise */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <select
                value={selectedEntrepriseId || ''}
                onChange={(e) => setSelectedEntrepriseId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner une entreprise</option>
                {entreprises.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.raison_sociale || ent.nom}
                  </option>
                ))}
              </select>
            </div>

            {selectedEntreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{selectedEntreprise.raison_sociale || selectedEntreprise.nom}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Affiche le solde cumulé de chaque compte à la fin de chaque période (mensuelle)
            </p>
          </div>

          {/* Filtres */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                {exercicesFiltres.map((ex) => (
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

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inclureComptesVides}
                  onChange={(e) => setInclureComptesVides(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Afficher comptes sans mouvement
                </span>
              </label>
            </div>
          </div>

          {/* Classes */}
          <div className="mb-6">
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

          {/* Bouton Calculer */}
          <div className="mb-6">
            <button
              onClick={loadBalance}
              disabled={loading || !selectedEntrepriseId}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Calcul en cours...' : 'Calculer la balance progressive'}
            </button>
          </div>

          {/* Stats */}
          {balanceData && balanceData.lignes.length > 0 && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-600 mb-1">Comptes</p>
                <p className="text-xl font-bold text-blue-900">{balanceData.lignes.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-xs text-green-600 mb-1">Périodes</p>
                <p className="text-xl font-bold text-green-900">{balanceData.periodes.length} mois</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                <p className="text-xs text-purple-600 mb-1">Solde Final</p>
                <p className={`text-xl font-bold ${totaux.total >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatMontant(totaux.total)} €
                </p>
              </div>
            </div>
          )}

          {/* Table de la balance progressive */}
          {balanceData && balanceData.lignes.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th className="px-4 py-3 text-left text-sm font-semibold sticky left-0 bg-blue-600 z-10">Numéro</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold sticky left-20 bg-blue-600 z-10">Libellé</th>
                    {balanceData.periodes.map((periode, index) => (
                      <th key={index} className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">
                        {periode.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-sm font-semibold bg-blue-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balanceData.lignes.map((ligne) => (
                    <tr
                      key={ligne.numero_compte}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600 sticky left-0 bg-white">
                        {ligne.numero_compte}
                      </td>
                      <td className="px-4 py-3 text-sm sticky left-20 bg-white">
                        {ligne.libelle}
                      </td>
                      {ligne.soldes_par_periode.map((solde, index) => (
                        <td
                          key={index}
                          className={`px-4 py-3 text-sm text-right font-mono whitespace-nowrap ${
                            solde >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {formatMontant(solde)}
                        </td>
                      ))}
                      <td className={`px-4 py-3 text-sm text-right font-mono font-bold whitespace-nowrap ${
                        ligne.solde_total >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatMontant(ligne.solde_total)}
                      </td>
                    </tr>
                  ))}

                  {/* Ligne de totaux */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-sm sticky left-0 bg-gray-100" colSpan={2}>
                      TOTAUX
                    </td>
                    {totaux.totauxParPeriode.map((total, index) => (
                      <td key={index} className={`px-4 py-3 text-sm text-right font-mono whitespace-nowrap ${
                        total >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatMontant(total)}
                      </td>
                    ))}
                    <td className={`px-4 py-3 text-sm text-right font-mono whitespace-nowrap ${
                      totaux.total >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatMontant(totaux.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!loading && (!balanceData || balanceData.lignes.length === 0) && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {selectedEntrepriseId
                  ? 'Cliquez sur "Calculer la balance progressive" pour afficher les résultats'
                  : 'Sélectionnez une entreprise pour continuer'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
