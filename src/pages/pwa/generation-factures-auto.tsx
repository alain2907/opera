import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PWANavbar from '../../components/PWANavbar';
import {
  getAllEntreprises,
  getAllExercices,
  getAllEcritures,
  getAllComptes,
  createCompte,
  createEcriture,
} from '../../lib/storageAdapter';

interface ClientBalance {
  compteClient: string;
  nomClient: string;
  solde: number;
  tauxTVA: number;
  compteProduit: string;
  compteTVA: string;
}

interface FactureGeneree {
  date: string;
  journal: string;
  numeroFacture: string;
  libelle: string;
  compteClient: string;
  nomClient: string;
  montantDebit: number;
  compteProduit: string;
  montantProduit: number;
  compteTVA: string;
  montantTVA: number;
  tauxTVA: number;
}

export default function GenerationFacturesAutoPWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [exercices, setExercices] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const [typeJournal, setTypeJournal] = useState<'VE' | 'HA'>('VE');
  const [journal, setJournal] = useState('VE');
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [numeroFactureDebut, setNumeroFactureDebut] = useState(1);

  const [balancesClients, setBalancesClients] = useState<ClientBalance[]>([]);
  const [factures, setFactures] = useState<FactureGeneree[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const entreprisesData = await getAllEntreprises();
      setEntreprises(entreprisesData);

      // Récupérer entreprise et exercice depuis localStorage
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
          setSelectedExercice(Number(exerciceActiveId));
        } else if (exercicesEntreprise.length > 0) {
          setSelectedExercice(exercicesEntreprise[0].id);
        }
      } else if (entreprisesData.length > 0) {
        setSelectedEntreprise(entreprisesData[0].id);

        const exercicesData = await getAllExercices();
        const exercicesEntreprise = exercicesData.filter((ex: any) => {
          const entId = ex.entrepriseId || ex.entreprise_id;
          return entId === entreprisesData[0].id;
        });
        setExercices(exercicesEntreprise);

        if (exercicesEntreprise.length > 0) {
          setSelectedExercice(exercicesEntreprise[0].id);
        }
      }
    } catch (err) {
      console.error('Erreur chargement:', err);
    }
  }

  const chargerBalanceClients = async () => {
    if (!selectedEntreprise || !selectedExercice) {
      alert('Entreprise ou exercice non sélectionné');
      return;
    }

    setLoading(true);
    try {
      const comptes = await getAllComptes();
      const ecritures = await getAllEcritures();

      // Filtrer écritures par exercice et mois
      const ecrituresFiltrees = ecritures.filter((e: any) => {
        const exId = e.exerciceId || e.exercice_id;
        if (exId !== selectedExercice) return false;

        const date = new Date(e.date);
        return date.getMonth() + 1 === mois && date.getFullYear() === annee;
      });

      // Calculer les soldes par compte client/fournisseur
      const soldesMap = new Map<string, number>();

      ecrituresFiltrees.forEach((e: any) => {
        const compte = e.compteNumero || e.compte_numero;
        const debit = e.debit || 0;
        const credit = e.credit || 0;

        // Comptes 411/412 pour VE (clients), 401/402 pour HA (fournisseurs)
        const prefixes = typeJournal === 'VE' ? ['411', '412'] : ['401', '402'];
        if (prefixes.some(p => compte?.startsWith(p))) {
          const soldeActuel = soldesMap.get(compte) || 0;
          soldesMap.set(compte, soldeActuel + debit - credit);
        }
      });

      // Créer les balances clients/fournisseurs
      const balances: ClientBalance[] = [];

      soldesMap.forEach((solde, numeroCompte) => {
        if (solde === 0) return; // Ignorer les soldes nuls

        const compte = comptes.find((c: any) => (c.numero || c.numeroCompte) === numeroCompte);
        const nomClient = compte?.nom || compte?.libelle || `Compte ${numeroCompte}`;

        // DEBUG: Afficher la structure du compte pour diagnostic
        console.log(`[GenFactures] Compte ${numeroCompte}:`, compte);

        // Récupérer TVA et comptes depuis le compte ou valeurs par défaut
        const tauxTVA = compte?.taux_tva ?? compte?.tauxTva ?? compte?.tauxTVA ?? 0;
        const compteProduit = compte?.compte_charge || compte?.compteCharge || (typeJournal === 'VE' ? '7' : '6');
        const compteTVA = compte?.compte_tva || compte?.compteTva || compte?.compteTVA || (typeJournal === 'VE' ? '44571' : '44566');

        console.log(`[GenFactures] ${numeroCompte} -> Taux: ${tauxTVA}%, Compte: ${compteProduit}, TVA: ${compteTVA}`);

        balances.push({
          compteClient: numeroCompte,
          nomClient,
          solde: Math.abs(solde),
          tauxTVA,
          compteProduit,
          compteTVA,
        });
      });

      setBalancesClients(balances);
      setFactures([]);
    } catch (err) {
      console.error('Erreur chargement balance:', err);
      alert('Erreur lors du chargement de la balance');
    } finally {
      setLoading(false);
    }
  };

  const genererFactures = () => {
    if (balancesClients.length === 0) {
      alert(typeJournal === 'VE' ? 'Aucun client à facturer ce mois-ci' : 'Aucun fournisseur à facturer ce mois-ci');
      return;
    }

    const nouvellesFactures: FactureGeneree[] = [];
    let numeroFacture = numeroFactureDebut;

    balancesClients.forEach((client) => {
      if (client.solde === 0) return;

      const montantTTC = client.solde;
      const montantHT = client.tauxTVA > 0 ? montantTTC / (1 + client.tauxTVA / 100) : montantTTC;
      const montantTVACalc = montantTTC - montantHT;

      const dateEcriture = `${annee}-${String(mois).padStart(2, '0')}-01`;

      let numFacture: string;
      let label: string;

      if (typeJournal === 'VE') {
        const prefixe = `${annee}${String(mois).padStart(2, '0')}`;
        numFacture = `${prefixe}-${String(numeroFacture).padStart(3, '0')}`;
        label = `Facture ${numFacture} ${client.nomClient}`;
        numeroFacture++;
      } else {
        numFacture = client.nomClient;
        label = `Facture Fournisseur ${mois}/${annee} ${client.nomClient}`;
      }

      nouvellesFactures.push({
        date: dateEcriture,
        journal: journal,
        numeroFacture: numFacture,
        libelle: label,
        compteClient: client.compteClient,
        nomClient: client.nomClient,
        montantDebit: montantTTC,
        compteProduit: client.compteProduit,
        montantProduit: montantHT,
        compteTVA: client.compteTVA,
        montantTVA: montantTVACalc,
        tauxTVA: client.tauxTVA,
      });
    });

    setFactures(nouvellesFactures);
  };

  const mettreDansBrouillard = () => {
    setShowValidation(true);
  };

  const enregistrerFactures = async () => {
    if (factures.length === 0) {
      alert('Aucune facture à enregistrer');
      return;
    }

    if (!selectedEntreprise || !selectedExercice) {
      alert('Entreprise ou exercice non sélectionné');
      return;
    }

    setLoading(true);
    try {
      // 1. Collecter tous les comptes utilisés
      const comptesUtilises = new Set<string>();
      factures.forEach(facture => {
        comptesUtilises.add(facture.compteClient);
        comptesUtilises.add(facture.compteProduit);
        if (facture.tauxTVA > 0) {
          comptesUtilises.add(facture.compteTVA);
        }
      });

      // 2. Vérifier quels comptes existent déjà
      const comptesExistants = await getAllComptes();
      const numerosExistants = new Set(comptesExistants.map((c: any) => c.numero || c.numeroCompte || c.numero_compte));

      // 3. Créer les comptes manquants
      for (const numeroCompte of comptesUtilises) {
        if (!numerosExistants.has(numeroCompte)) {
          let type = 'produit';
          if (numeroCompte.startsWith('6')) {
            type = 'charge';
          } else if (numeroCompte.startsWith('4')) {
            type = 'tiers';
          } else if (numeroCompte.startsWith('5')) {
            type = 'financier';
          } else if (numeroCompte.startsWith('7')) {
            type = 'produit';
          }

          await createCompte({
            numero: numeroCompte,
            nom: `Compte ${numeroCompte}`,
            type: type,
          });
          console.log(`[GenFactures] Compte créé: ${numeroCompte}`);
        }
      }

      let nbCreees = 0;

      for (const facture of factures) {
        if (typeJournal === 'VE') {
          // Journal VE (Ventes) : Débit client / Crédit produit + TVA collectée
          await createEcriture({
            exerciceId: selectedExercice,
            date: facture.date,
            journal: facture.journal,
            pieceRef: facture.numeroFacture,
            libelle: facture.libelle,
            compteNumero: facture.compteClient,
            debit: facture.montantDebit,
            credit: 0,
          });

          await createEcriture({
            exerciceId: selectedExercice,
            date: facture.date,
            journal: facture.journal,
            pieceRef: facture.numeroFacture,
            libelle: facture.libelle,
            compteNumero: facture.compteProduit,
            debit: 0,
            credit: facture.montantProduit,
          });

          if (facture.tauxTVA > 0) {
            await createEcriture({
              exerciceId: selectedExercice,
              date: facture.date,
              journal: facture.journal,
              pieceRef: facture.numeroFacture,
              libelle: facture.libelle,
              compteNumero: facture.compteTVA,
              debit: 0,
              credit: facture.montantTVA,
            });
          }
        } else {
          // Journal HA (Achats) : Débit charge + TVA déductible / Crédit fournisseur
          await createEcriture({
            exerciceId: selectedExercice,
            date: facture.date,
            journal: facture.journal,
            pieceRef: facture.numeroFacture,
            libelle: facture.libelle,
            compteNumero: facture.compteProduit,
            debit: facture.montantProduit,
            credit: 0,
          });

          if (facture.tauxTVA > 0) {
            await createEcriture({
              exerciceId: selectedExercice,
              date: facture.date,
              journal: facture.journal,
              pieceRef: facture.numeroFacture,
              libelle: facture.libelle,
              compteNumero: facture.compteTVA,
              debit: facture.montantTVA,
              credit: 0,
            });
          }

          await createEcriture({
            exerciceId: selectedExercice,
            date: facture.date,
            journal: facture.journal,
            pieceRef: facture.numeroFacture,
            libelle: facture.libelle,
            compteNumero: facture.compteClient,
            debit: 0,
            credit: facture.montantDebit,
          });
        }

        nbCreees++;
      }

      // Sauvegarder le prochain numéro de facture si VE
      if (typeJournal === 'VE') {
        localStorage.setItem(`pwa_prochainNumeroFacture_${selectedExercice}`, String(numeroFactureDebut + nbCreees));
      }

      alert(`✓ ${nbCreees} facture(s) enregistrée(s) avec succès dans le journal ${journal}`);

      setFactures([]);
      setBalancesClients([]);
      setShowValidation(false);
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement:', err);
      alert(`Erreur : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const entrepriseActive = entreprises.find(e => e.id === selectedEntreprise);
  const exerciceActif = exercices.find(ex => ex.id === selectedExercice);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <PWANavbar />

      {/* Header */}
      <div className="bg-white shadow mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Génération automatique de factures</h1>
              <p className="text-gray-600 mt-1">
                {typeJournal === 'VE'
                  ? 'Génère automatiquement les factures clients depuis la balance (comptes 411/412)'
                  : 'Génère automatiquement les factures fournisseurs depuis la balance (comptes 401/402)'}
              </p>
              {entrepriseActive && exerciceActif && (
                <div className="text-lg font-bold text-blue-600 mt-2">
                  Entreprise : {entrepriseActive.raison_sociale || entrepriseActive.nom}
                  {' • '}
                  Exercice : {exerciceActif.annee} {exerciceActif.cloture ? '(Clôturé)' : '(En cours)'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Configuration */}
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Période et configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={typeJournal}
                  onChange={(e) => {
                    const newType = e.target.value as 'VE' | 'HA';
                    setTypeJournal(newType);
                    setJournal(newType);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="VE">VE - Ventes (Clients)</option>
                  <option value="HA">HA - Achats (Fournisseurs)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Journal
                </label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mois
                </label>
                <select
                  value={mois}
                  onChange={(e) => setMois(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Année
                </label>
                <input
                  type="number"
                  value={annee}
                  onChange={(e) => setAnnee(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {typeJournal === 'VE' ? 'N° facture début' : 'N° pièce'}
                </label>
                <input
                  type={typeJournal === 'VE' ? 'number' : 'text'}
                  value={typeJournal === 'VE' ? numeroFactureDebut : 'Nom fournisseur'}
                  onChange={(e) => typeJournal === 'VE' && setNumeroFactureDebut(Number(e.target.value))}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${typeJournal === 'VE' ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-100'}`}
                  min={typeJournal === 'VE' ? '1' : undefined}
                  disabled={typeJournal === 'HA'}
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-purple-700 bg-purple-100 rounded p-3">
              {typeJournal === 'VE'
                ? 'ℹ️ Génération automatique depuis la balance • Numérotation F-001, F-002... conservée sur l\'exercice'
                : 'ℹ️ Génération automatique depuis la balance • Numéro de pièce = nom du fournisseur'}
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={chargerBalanceClients}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? '⏳ Chargement...' : '📊 Charger balance du mois'}
            </button>
            {balancesClients.length > 0 && factures.length === 0 && (
              <button
                onClick={genererFactures}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                ⚙️ Générer les factures
              </button>
            )}
            {factures.length > 0 && !showValidation && (
              <button
                onClick={mettreDansBrouillard}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
              >
                📋 Mettre en brouillard
              </button>
            )}
          </div>

          {/* Balance clients */}
          {balancesClients.length > 0 && factures.length === 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {typeJournal === 'VE' ? 'Clients' : 'Fournisseurs'} à facturer ({balancesClients.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Compte</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Solde</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">TVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {balancesClients.map((client, idx) => (
                      <tr key={idx} className="hover:bg-purple-50 transition-colors">
                        <td className="px-4 py-2 text-sm font-mono text-purple-600 font-semibold">{client.compteClient}</td>
                        <td className="px-4 py-2 text-sm">{client.nomClient}</td>
                        <td className="px-4 py-2 text-sm text-right font-mono">{client.solde.toFixed(2)} €</td>
                        <td className="px-4 py-2 text-sm text-center">
                          {client.tauxTVA === 0 ? (
                            <span className="text-gray-600">Non soumis</span>
                          ) : (
                            <span className="text-orange-600 font-semibold">{client.tauxTVA}%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Brouillard */}
          {showValidation && (
            <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-6">
              <h3 className="text-xl font-bold text-yellow-900 mb-4">
                ⚠️ Brouillard - Validation des factures
              </h3>
              <p className="text-yellow-800 mb-4">
                {factures.length} facture{factures.length > 1 ? 's' : ''} prête{factures.length > 1 ? 's' : ''} à être enregistrée{factures.length > 1 ? 's' : ''} dans le journal <strong>{journal}</strong>.
                Vérifiez les données avant validation.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={enregistrerFactures}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                >
                  {loading ? '⏳ Enregistrement...' : '✅ Valider et enregistrer dans le journal'}
                </button>
                <button
                  onClick={() => setShowValidation(false)}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 font-medium"
                >
                  ✏️ Modifier le brouillard
                </button>
                <button
                  onClick={() => {
                    setShowValidation(false);
                    setFactures([]);
                    setBalancesClients([]);
                  }}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
                >
                  ❌ Annuler tout
                </button>
              </div>
            </div>
          )}

          {/* Aperçu des factures générées */}
          {factures.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Factures générées ({factures.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Journal</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">N° Facture</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Compte</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Débit</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Crédit</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">TVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {factures.map((facture, idx) => (
                      <>
                        <tr key={`${idx}-client`} className="hover:bg-purple-50 transition-colors bg-purple-50">
                          <td className="px-4 py-2 text-sm">{facture.date}</td>
                          <td className="px-4 py-2 text-sm">{facture.journal}</td>
                          <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{facture.numeroFacture}</td>
                          <td className="px-4 py-2 text-sm font-mono text-purple-600 font-semibold">{facture.compteClient}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            {typeJournal === 'VE' ? facture.montantDebit.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            {typeJournal === 'HA' ? facture.montantDebit.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-center"></td>
                        </tr>
                        <tr key={`${idx}-produit`} className="hover:bg-purple-50 transition-colors">
                          <td className="px-4 py-2 text-sm">{facture.date}</td>
                          <td className="px-4 py-2 text-sm">{facture.journal}</td>
                          <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{facture.numeroFacture}</td>
                          <td className="px-4 py-2 text-sm">
                            <input
                              type="text"
                              value={facture.compteProduit}
                              onChange={(e) => {
                                const newFactures = [...factures];
                                newFactures[idx].compteProduit = e.target.value;
                                setFactures(newFactures);
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded font-mono text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            {typeJournal === 'HA' ? facture.montantProduit.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono">
                            {typeJournal === 'VE' ? facture.montantProduit.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-center">{facture.tauxTVA === 0 ? 'Non soumis' : ''}</td>
                        </tr>
                        {facture.tauxTVA > 0 && (
                          <tr key={`${idx}-tva`} className="hover:bg-purple-50 transition-colors">
                            <td className="px-4 py-2 text-sm">{facture.date}</td>
                            <td className="px-4 py-2 text-sm">{facture.journal}</td>
                            <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{facture.numeroFacture}</td>
                            <td className="px-4 py-2 text-sm">
                              <input
                                type="text"
                                value={facture.compteTVA}
                                onChange={(e) => {
                                  const newFactures = [...factures];
                                  newFactures[idx].compteTVA = e.target.value;
                                  setFactures(newFactures);
                                }}
                                className="w-24 px-2 py-1 border border-gray-300 rounded font-mono text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-mono">
                              {typeJournal === 'HA' ? facture.montantTVA.toFixed(2) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-mono">
                              {typeJournal === 'VE' ? facture.montantTVA.toFixed(2) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-center text-orange-600 font-semibold">{facture.tauxTVA}%</td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {balancesClients.length === 0 && factures.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Sélectionnez un mois et cliquez sur "Charger balance du mois"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
