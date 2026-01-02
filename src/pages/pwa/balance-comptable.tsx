import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEntreprises,
  getAllExercices,
  getAllEcritures,
  getAllComptes
} from '../../lib/storageAdapter';
import { getLibelleCompte } from '../../data/planComptable';

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
  nom_compte: string;
  total_debit: number;
  total_credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

export default function BalanceComptablePWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedEntrepriseId, setSelectedEntrepriseId] = useState<number | null>(null);
  const [lignesBalance, setLignesBalance] = useState<LigneBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [compteSelectionne, setCompteSelectionne] = useState<{ numero: string; libelle: string } | null>(null);
  const [ecrituresCompte, setEcrituresCompte] = useState<any[]>([]);
  const [ecritureDetaillee, setEcritureDetaillee] = useState<any>(null);
  const [toutesLignesEcriture, setToutesLignesEcriture] = useState<any[]>([]);

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

      // Récupérer l'entreprise et l'exercice depuis localStorage (défini par le dashboard)
      const entrepriseActiveId = localStorage.getItem('pwa_entreprise_active_id');
      const exerciceActiveId = localStorage.getItem('pwa_exercice_actif_id');

      if (entrepriseActiveId) {
        setSelectedEntrepriseId(Number(entrepriseActiveId));

        if (exerciceActiveId) {
          setExerciceId(Number(exerciceActiveId));
        } else {
          // Trouver l'exercice en cours de cette entreprise (le plus récent non clôturé)
          const exercicesEntreprise = uniqueExercices.filter((ex: any) => {
            const entId = ex.entrepriseId || ex.entreprise_id;
            return entId === Number(entrepriseActiveId);
          });

          // Trier par année décroissante et prendre le premier non clôturé
          const exerciceEnCours = exercicesEntreprise
            .sort((a: any, b: any) => b.annee - a.annee)
            .find((ex: any) => !ex.cloture) || exercicesEntreprise[0];

          if (exerciceEnCours) {
            setExerciceId(exerciceEnCours.id);
          }
        }
      } else {
        // Fallback : sélectionner l'entreprise active (celle marquée comme active) ou la première
        const entrepriseActive = allEntreprises.find((e: any) => e.actif === true) || allEntreprises[0];

        if (entrepriseActive) {
          setSelectedEntrepriseId(entrepriseActive.id);

          // Trouver l'exercice en cours
          const exercicesEntreprise = uniqueExercices.filter((ex: any) => {
            const entId = ex.entrepriseId || ex.entreprise_id;
            return entId === entrepriseActive.id;
          });

          const exerciceEnCours = exercicesEntreprise
            .sort((a: any, b: any) => b.annee - a.annee)
            .find((ex: any) => !ex.cloture) || exercicesEntreprise[0];

          if (exerciceEnCours) {
            setExerciceId(exerciceEnCours.id);
          }
        }
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

      // Calculer la balance à partir des écritures
      const comptesMap = new Map<string, LigneBalance>();

      // Initialiser tous les comptes du plan comptable
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
          nom_compte: libelle,
          total_debit: 0,
          total_credit: 0,
          solde_debiteur: 0,
          solde_crediteur: 0,
        });
      });

      // Calculer les totaux à partir des écritures
      ecrituresFiltrees.forEach((ecriture: Ecriture) => {
        const numeroCompte = ecriture.compteNumero || ecriture.compte_numero || '';

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

          // Chercher le nom du compte : 1) plan comptable standard, 2) comptes personnalisés dans la base, 3) numéro
          const comptePersonnalise = allComptes.find((c: Compte) =>
            (c.numeroCompte || c.numero_compte) === numeroCompte
          );

          const nomCompte = getLibelleCompte(numeroCompte)
            || comptePersonnalise?.libelle
            || comptePersonnalise?.nom
            || numeroCompte;

          comptesMap.set(numeroCompte, {
            numero_compte: numeroCompte,
            nom_compte: nomCompte,
            total_debit: 0,
            total_credit: 0,
            solde_debiteur: 0,
            solde_crediteur: 0,
          });
        }

        const compteData = comptesMap.get(numeroCompte);
        if (!compteData) return;

        // Ajouter les montants
        compteData.total_debit += ecriture.debit || 0;
        compteData.total_credit += ecriture.credit || 0;
      });

      // Calculer les soldes débiteurs et créditeurs
      comptesMap.forEach((compte) => {
        const difference = compte.total_debit - compte.total_credit;
        if (difference > 0) {
          compte.solde_debiteur = difference;
          compte.solde_crediteur = 0;
        } else if (difference < 0) {
          compte.solde_debiteur = 0;
          compte.solde_crediteur = Math.abs(difference);
        } else {
          compte.solde_debiteur = 0;
          compte.solde_crediteur = 0;
        }
      });

      // Convertir en array et filtrer les comptes vides si nécessaire
      let lignes = Array.from(comptesMap.values());

      if (!inclureComptesVides) {
        lignes = lignes.filter((ligne) => ligne.total_debit !== 0 || ligne.total_credit !== 0);
      }

      // Trier par numéro de compte
      lignes.sort((a, b) => a.numero_compte.localeCompare(b.numero_compte));

      setLignesBalance(lignes);
    } catch (err) {
      console.error('Erreur chargement balance:', err);
      alert('Erreur lors du chargement de la balance');
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

  const chargerGrandLivreCompte = async (numeroCompte: string, libelle: string) => {
    try {
      const ecritures = await getAllEcritures();

      // Filtrer les écritures du compte
      let ecrituresFiltrees = ecritures.filter((e: Ecriture) => {
        const compte = e.compteNumero || e.compte_numero;
        return compte === numeroCompte;
      });

      // Filtrer par exercice si sélectionné
      if (exerciceId) {
        ecrituresFiltrees = ecrituresFiltrees.filter((e: Ecriture) => {
          const exId = e.exerciceId || e.exercice_id;
          return exId === exerciceId;
        });
      }

      // Filtrer par période si spécifiée
      if (dateDebut) {
        ecrituresFiltrees = ecrituresFiltrees.filter((e: Ecriture) => e.date >= dateDebut);
      }
      if (dateFin) {
        ecrituresFiltrees = ecrituresFiltrees.filter((e: Ecriture) => e.date <= dateFin);
      }

      // Trier par date
      ecrituresFiltrees.sort((a: Ecriture, b: Ecriture) => a.date.localeCompare(b.date));

      // Calculer le solde progressif
      let solde = 0;
      const ecrituresAvecSolde = ecrituresFiltrees.map((e: Ecriture) => {
        const debit = e.debit || 0;
        const credit = e.credit || 0;
        solde += debit - credit;
        return {
          ...e,
          solde
        };
      });

      setCompteSelectionne({ numero: numeroCompte, libelle });
      setEcrituresCompte(ecrituresAvecSolde);
    } catch (err) {
      console.error('Erreur chargement grand-livre:', err);
    }
  };

  const chargerDetailEcriture = async (ecriture: any) => {
    try {
      const toutesEcritures = await getAllEcritures();

      // Regrouper par pieceRef ou par date si pas de pieceRef
      const pieceRef = ecriture.pieceRef || ecriture.piece_ref;
      const journalId = ecriture.journalId || ecriture.journal_id;

      let lignesEcriture: any[];

      // Filtrage intelligent : relevés mensuels SANS date, autres AVEC date
      const ecritureJournal = ecriture.journal || '';
      const isReleveMensuel = /^(Relevé|banque|BANQUE)/i.test(pieceRef || '');

      lignesEcriture = toutesEcritures.filter((e: any) => {
        const ref = e.pieceRef || e.piece_ref;
        const eJournal = e.journal || '';
        const eDate = e.date;

        if (isReleveMensuel) {
          // Relevé mensuel : même pieceRef + même journal (SANS date)
          return ref === pieceRef && eJournal === ecritureJournal;
        } else {
          // Écriture normale : même pieceRef + même date + même journal
          return ref === pieceRef && eDate === ecriture.date && eJournal === ecritureJournal;
        }
      });

      // Trier par ordre d'insertion (id)
      lignesEcriture.sort((a: any, b: any) => (a.id || 0) - (b.id || 0));

      setEcritureDetaillee(ecriture);
      setToutesLignesEcriture(lignesEcriture);
    } catch (err) {
      console.error('Erreur chargement détail écriture:', err);
    }
  };

  const calculerTotaux = () => {
    const totalDebit = lignesBalance.reduce((sum, ligne) => sum + ligne.total_debit, 0);
    const totalCredit = lignesBalance.reduce((sum, ligne) => sum + ligne.total_credit, 0);
    const totalSoldeDebiteur = lignesBalance.reduce((sum, ligne) => sum + ligne.solde_debiteur, 0);
    const totalSoldeCrediteur = lignesBalance.reduce((sum, ligne) => sum + ligne.solde_crediteur, 0);

    // Comptes de bilan (classes 1 à 5)
    const comptesBilan = lignesBalance.filter(ligne => {
      const classe = ligne.numero_compte.charAt(0);
      return ['1', '2', '3', '4', '5'].includes(classe);
    });
    const totalBilanDebit = comptesBilan.reduce((sum, ligne) => sum + ligne.total_debit, 0);
    const totalBilanCredit = comptesBilan.reduce((sum, ligne) => sum + ligne.total_credit, 0);
    const totalBilanSoldeDebiteur = comptesBilan.reduce((sum, ligne) => sum + ligne.solde_debiteur, 0);
    const totalBilanSoldeCrediteur = comptesBilan.reduce((sum, ligne) => sum + ligne.solde_crediteur, 0);

    // Comptes de résultat (classes 6 et 7)
    const comptesResultat = lignesBalance.filter(ligne => {
      const classe = ligne.numero_compte.charAt(0);
      return ['6', '7'].includes(classe);
    });
    const totalResultatDebit = comptesResultat.reduce((sum, ligne) => sum + ligne.total_debit, 0);
    const totalResultatCredit = comptesResultat.reduce((sum, ligne) => sum + ligne.total_credit, 0);
    const totalResultatSoldeDebiteur = comptesResultat.reduce((sum, ligne) => sum + ligne.solde_debiteur, 0);
    const totalResultatSoldeCrediteur = comptesResultat.reduce((sum, ligne) => sum + ligne.solde_crediteur, 0);

    return {
      totalDebit,
      totalCredit,
      totalSoldeDebiteur,
      totalSoldeCrediteur,
      totalBilanDebit,
      totalBilanCredit,
      totalBilanSoldeDebiteur,
      totalBilanSoldeCrediteur,
      totalResultatDebit,
      totalResultatCredit,
      totalResultatSoldeDebiteur,
      totalResultatSoldeCrediteur
    };
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant);
  };

  const exporterCSV = () => {
    if (lignesBalance.length === 0) {
      alert('Aucune donnée à exporter. Veuillez d\'abord calculer la balance.');
      return;
    }

    const selectedEntreprise = entreprises.find((e) => e.id === selectedEntrepriseId);

    // En-tête CSV
    const headers = [
      'N° Compte',
      'Nom du compte',
      'Total Débit',
      'Total Crédit',
      'Solde Débiteur',
      'Solde Créditeur'
    ];

    // Lignes de données
    const rows = lignesBalance.map(ligne => [
      ligne.numero_compte,
      ligne.nom_compte,
      ligne.total_debit.toFixed(2),
      ligne.total_credit.toFixed(2),
      ligne.solde_debiteur.toFixed(2),
      ligne.solde_crediteur.toFixed(2)
    ]);

    // Ligne totaux
    const totaux = calculerTotaux();
    rows.push([
      '',
      'TOTAL GÉNÉRAL',
      totaux.totalDebit.toFixed(2),
      totaux.totalCredit.toFixed(2),
      totaux.totalSoldeDebiteur.toFixed(2),
      totaux.totalSoldeCrediteur.toFixed(2)
    ]);

    // Total Bilan
    rows.push([
      '',
      'TOTAL BILAN (Classes 1-5)',
      totaux.totalBilanDebit.toFixed(2),
      totaux.totalBilanCredit.toFixed(2),
      totaux.totalBilanSoldeDebiteur.toFixed(2),
      totaux.totalBilanSoldeCrediteur.toFixed(2)
    ]);

    // Total Résultat
    rows.push([
      '',
      'TOTAL RÉSULTAT (Classes 6-7)',
      totaux.totalResultatDebit.toFixed(2),
      totaux.totalResultatCredit.toFixed(2),
      totaux.totalResultatSoldeDebiteur.toFixed(2),
      totaux.totalResultatSoldeCrediteur.toFixed(2)
    ]);

    // Résultat Net
    const resultatNet = totaux.totalResultatSoldeCrediteur - totaux.totalResultatSoldeDebiteur;
    const estBenefice = resultatNet > 0;
    const estPerte = resultatNet < 0;
    rows.push([
      '',
      estBenefice ? 'BÉNÉFICE' : estPerte ? 'PERTE' : 'RÉSULTAT NUL',
      '',
      '',
      '',
      Math.abs(resultatNet).toFixed(2)
    ]);

    // Créer le contenu CSV
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Créer le fichier et déclencher le téléchargement
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `balance_comptable_${selectedEntreprise?.raison_sociale || selectedEntreprise?.nom || 'export'}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Balance Comptable</h2>

            {selectedEntreprise && (
              <p className="text-gray-600">
                Entreprise : <span className="font-semibold">{selectedEntreprise.raison_sociale || selectedEntreprise.nom}</span>
              </p>
            )}
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

          {/* Boutons Calculer et Exporter */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={loadBalance}
              disabled={loading || !selectedEntrepriseId}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Calcul en cours...' : 'Calculer la balance'}
            </button>
            {lignesBalance.length > 0 && (
              <button
                onClick={exporterCSV}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Exporter CSV
              </button>
            )}
          </div>

          {/* Stats */}
          {lignesBalance.length > 0 && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-xs text-blue-600 mb-1">Comptes</p>
                <p className="text-xl font-bold text-blue-900">{lignesBalance.length}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-xs text-green-600 mb-1">Total Débit</p>
                <p className="text-xl font-bold text-green-900">{formatMontant(totaux.totalDebit)} €</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                <p className="text-xs text-orange-600 mb-1">Total Crédit</p>
                <p className="text-xl font-bold text-orange-900">{formatMontant(totaux.totalCredit)} €</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                <p className="text-xs text-purple-600 mb-1">Équilibre</p>
                <p className="text-xl font-bold text-purple-900">
                  {formatMontant(Math.abs(totaux.totalDebit - totaux.totalCredit))} €
                </p>
              </div>
            </div>
          )}

          {/* Table de la balance */}
          {lignesBalance.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Numéro</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Nom du compte</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Total Débit</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Total Crédit</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Solde Débiteur</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Solde Créditeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lignesBalance.map((ligne) => (
                    <tr
                      key={ligne.numero_compte}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => chargerGrandLivreCompte(ligne.numero_compte, ligne.nom_compte)}
                      title="Cliquer pour voir le grand-livre du compte"
                    >
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-600">
                        {ligne.numero_compte}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {ligne.nom_compte}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {ligne.total_debit > 0 ? formatMontant(ligne.total_debit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {ligne.total_credit > 0 ? formatMontant(ligne.total_credit) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                        {ligne.solde_debiteur > 0 ? formatMontant(ligne.solde_debiteur) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                        {ligne.solde_crediteur > 0 ? formatMontant(ligne.solde_crediteur) : '-'}
                      </td>
                    </tr>
                  ))}

                  {/* Ligne de totaux généraux */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX GÉNÉRAUX
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Ligne de totaux BILAN */}
                  <tr className="bg-blue-50 font-semibold border-t-2 border-blue-300">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX BILAN (Classes 1-5)
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalBilanDebit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalBilanCredit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalBilanSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalBilanSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Ligne de totaux RÉSULTAT */}
                  <tr className="bg-green-50 font-semibold">
                    <td className="px-4 py-3 text-sm" colSpan={2}>
                      TOTAUX RÉSULTAT (Classes 6-7)
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalResultatDebit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatMontant(totaux.totalResultatCredit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-green-700">
                      {formatMontant(totaux.totalResultatSoldeDebiteur)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-orange-700">
                      {formatMontant(totaux.totalResultatSoldeCrediteur)}
                    </td>
                  </tr>

                  {/* Ligne de résultat net (bénéfice ou perte) */}
                  {(() => {
                    const resultatNet = totaux.totalResultatSoldeCrediteur - totaux.totalResultatSoldeDebiteur;
                    const estBenefice = resultatNet > 0;
                    const estPerte = resultatNet < 0;

                    return (
                      <tr className={`font-bold border-t-2 ${estBenefice ? 'bg-green-100 border-green-400' : estPerte ? 'bg-red-100 border-red-400' : 'bg-gray-100 border-gray-400'}`}>
                        <td className="px-4 py-3 text-sm" colSpan={2}>
                          {estBenefice ? 'BÉNÉFICE' : estPerte ? 'PERTE' : 'RÉSULTAT NUL'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono" colSpan={2}>
                          {/* Vide */}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${estBenefice ? 'text-green-700' : estPerte ? 'text-red-700' : 'text-gray-700'}`} colSpan={2}>
                          {formatMontant(Math.abs(resultatNet))} €
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {!loading && lignesBalance.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {selectedEntrepriseId
                  ? 'Cliquez sur "Calculer la balance" pour afficher les résultats'
                  : 'Sélectionnez une entreprise pour continuer'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Grand-Livre */}
      {compteSelectionne && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setCompteSelectionne(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    📘 Grand Livre du compte {compteSelectionne.numero}
                  </h2>
                  <p className="text-blue-100">{compteSelectionne.nom_compte}</p>
                </div>
                <button
                  onClick={() => setCompteSelectionne(null)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Totaux */}
              <div className="mt-4 grid grid-cols-3 gap-4 bg-blue-700 rounded-lg p-4">
                <div>
                  <p className="text-sm text-blue-200">Total Débit</p>
                  <p className="text-xl font-bold">
                    {formatMontant(ecrituresCompte.reduce((sum, e) => sum + (e.debit || 0), 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-200">Total Crédit</p>
                  <p className="text-xl font-bold">
                    {formatMontant(ecrituresCompte.reduce((sum, e) => sum + (e.credit || 0), 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-blue-200">Solde</p>
                  <p className="text-xl font-bold">
                    {formatMontant(ecrituresCompte[ecrituresCompte.length - 1]?.solde || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Table écritures */}
            <div className="p-6 overflow-auto max-h-[calc(90vh-280px)]">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-sm">Journal</th>
                    <th className="text-left p-3 font-semibold text-sm">Date</th>
                    <th className="text-left p-3 font-semibold text-sm">N° Pièce</th>
                    <th className="text-left p-3 font-semibold text-sm">Libellé</th>
                    <th className="text-right p-3 font-semibold text-sm">Débit</th>
                    <th className="text-right p-3 font-semibold text-sm">Crédit</th>
                    <th className="text-right p-3 font-semibold text-sm">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {ecrituresCompte.map((ecriture, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-blue-100 cursor-pointer transition-colors"
                      onClick={() => chargerDetailEcriture(ecriture)}
                      title="Cliquer pour voir le détail de l'écriture complète"
                    >
                      <td className="p-3 text-sm font-semibold text-blue-700">
                        {ecriture.journal || '-'}
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(ecriture.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3 text-sm font-mono">{ecriture.pieceRef || ecriture.piece_ref || '-'}</td>
                      <td className="p-3 text-sm">{ecriture.libelle || '-'}</td>
                      <td className="p-3 text-sm text-right font-mono">
                        {ecriture.debit ? formatMontant(ecriture.debit) : '-'}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {ecriture.credit ? formatMontant(ecriture.credit) : '-'}
                      </td>
                      <td className="p-3 text-sm text-right font-mono font-semibold">
                        {formatMontant(ecriture.solde)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="p-3 text-right">TOTAL {compteSelectionne.numero}</td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(ecrituresCompte.reduce((sum, e) => sum + (e.debit || 0), 0))}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(ecrituresCompte.reduce((sum, e) => sum + (e.credit || 0), 0))}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(ecrituresCompte[ecrituresCompte.length - 1]?.solde || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {ecrituresCompte.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune écriture pour ce compte</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Écriture */}
      {ecritureDetaillee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4"
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
                    ID: #{ecritureDetaillee.id || 'N/A'} |
                    Date: {new Date(ecritureDetaillee.date).toLocaleDateString('fr-FR')} |
                    N° Pièce: {ecritureDetaillee.pieceRef || ecritureDetaillee.piece_ref || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const ecritureId = ecritureDetaillee.id;
                      if (ecritureId) {
                        router.push(`/pwa/ecritures?id=${ecritureId}`);
                      } else {
                        alert('Impossible d\'éditer cette écriture : ID manquant');
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
                        {ligne.debit ? formatMontant(ligne.debit) : '-'}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {ligne.credit ? formatMontant(ligne.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold sticky bottom-0">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">TOTAL</td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(toutesLignesEcriture.reduce((sum, l) => sum + (l.debit || 0), 0))}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatMontant(toutesLignesEcriture.reduce((sum, l) => sum + (l.credit || 0), 0))}
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
