import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { ecrituresApi } from '../api/ecritures';
import { journauxApi, type Journal } from '../api/journaux';
import { facturesApi, type ClientBalance } from '../api/factures';

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

export default function GenerationFacturesAutoPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const [typeJournal, setTypeJournal] = useState<'VE' | 'HA'>('VE');
  const [journal, setJournal] = useState('VE');
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [numeroFactureDebut, setNumeroFactureDebut] = useState<number | null>(null);

  const [balancesClients, setBalancesClients] = useState<ClientBalance[]>([]);
  const [factures, setFactures] = useState<FactureGeneree[]>([]);

  // Charger le prochain numéro de facture
  useEffect(() => {
    if (entreprise?.id && exercice?.id) {
      facturesApi
        .getProchainNumero(entreprise.id, exercice.id)
        .then((res) => {
          setNumeroFactureDebut(res.numero);
        })
        .catch((err) => {
          console.error('Erreur chargement numéro facture:', err);
          setNumeroFactureDebut(1);
        });
    }
  }, [entreprise, exercice]);

  const chargerBalanceClients = async () => {
    if (!entreprise?.id || !exercice?.id) {
      alert('Entreprise ou exercice non sélectionné');
      return;
    }

    setLoading(true);
    try {
      const res = await facturesApi.getBalanceClients(
        entreprise.id,
        exercice.id,
        mois,
        annee,
        typeJournal
      );
      setBalancesClients(res.balances);
      setFactures([]);
    } catch (err) {
      console.error('Erreur chargement balance:', err);
      alert('Erreur lors du chargement de la balance clients');
    } finally {
      setLoading(false);
    }
  };

  const genererFactures = () => {
    if (balancesClients.length === 0) {
      alert(typeJournal === 'VE' ? 'Aucun client à facturer ce mois-ci' : 'Aucun fournisseur à facturer ce mois-ci');
      return;
    }

    if (typeJournal === 'VE' && numeroFactureDebut === null) {
      alert('Numéro de facture non disponible');
      return;
    }

    const nouvellesFactures: FactureGeneree[] = [];
    let numeroFacture = numeroFactureDebut || 1;

    balancesClients.forEach((client) => {
      // Ne générer une facture que si le solde est non nul
      if (client.solde === 0) {
        return;
      }

      const montantTTC = client.solde;
      const montantHT = client.tauxTVA > 0 ? montantTTC / (1 + client.tauxTVA / 100) : montantTTC;
      const montantTVACalc = montantTTC - montantHT;

      const dateEcriture = `${annee}-${String(mois).padStart(2, '0')}-01`;

      let numFacture: string;
      let label: string;

      if (typeJournal === 'VE') {
        // Pour VE: numérotation F-001, F-002...
        numFacture = `F-${String(numeroFacture).padStart(3, '0')}`;
        label = `Facture ${numFacture} ${mois}/${annee} ${client.nomClient}`;
        numeroFacture++;
      } else {
        // Pour HA: numéro de pièce = nom du fournisseur
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

    if (!entreprise?.id || !exercice?.id) {
      alert('Entreprise ou exercice non sélectionné');
      return;
    }

    const entrepriseId = entreprise.id;
    const exerciceId = exercice.id;

    setLoading(true);
    try {
      const journaux = await journauxApi.findByEntreprise(entrepriseId);
      const journalObj = journaux.find((j: Journal) => j.code === journal);

      if (!journalObj) {
        alert(`Journal ${journal} introuvable`);
        setLoading(false);
        return;
      }

      let nbCreees = 0;

      for (const facture of factures) {
        let lignes;

        if (typeJournal === 'VE') {
          // Journal VE (Ventes) : Débit client / Crédit produit + TVA collectée
          lignes = [
            {
              numero_compte: facture.compteClient,
              libelle_compte: facture.libelle,
              debit: facture.montantDebit,
              credit: 0,
            },
            {
              numero_compte: facture.compteProduit,
              libelle_compte: facture.libelle,
              debit: 0,
              credit: facture.montantProduit,
            },
          ];

          if (facture.tauxTVA > 0) {
            lignes.push({
              numero_compte: facture.compteTVA,
              libelle_compte: facture.libelle,
              debit: 0,
              credit: facture.montantTVA,
            });
          }
        } else {
          // Journal HA (Achats) : Débit charge + TVA déductible / Crédit fournisseur
          lignes = [
            {
              numero_compte: facture.compteProduit,
              libelle_compte: facture.libelle,
              debit: facture.montantProduit,
              credit: 0,
            },
          ];

          if (facture.tauxTVA > 0) {
            lignes.push({
              numero_compte: facture.compteTVA,
              libelle_compte: facture.libelle,
              debit: facture.montantTVA,
              credit: 0,
            });
          }

          lignes.push({
            numero_compte: facture.compteClient,
            libelle_compte: facture.libelle,
            debit: 0,
            credit: facture.montantDebit,
          });
        }

        await ecrituresApi.create({
          entreprise_id: entrepriseId,
          exercice_id: exerciceId,
          journal_id: journalObj.id,
          date_ecriture: facture.date,
          numero_piece: facture.numeroFacture,
          libelle: facture.libelle,
          lignes,
        });

        nbCreees++;
      }

      // Incrémenter le compteur uniquement pour les factures VE (clients)
      if (typeJournal === 'VE') {
        await facturesApi.incrementerNumero(entrepriseId, exerciceId, nbCreees);
        const res = await facturesApi.getProchainNumero(entrepriseId, exerciceId);
        setNumeroFactureDebut(res.numero);
      }

      alert(`✓ ${nbCreees} facture(s) enregistrée(s) avec succès dans le journal ${journal}`);

      setFactures([]);
      setBalancesClients([]);

    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement:', err);
      alert(`Erreur : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Génération automatique de factures clients</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 mb-4">
                ⚠️ Veuillez d'abord sélectionner une entreprise
              </p>
              <button
                onClick={() => router.push('/liste')}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Génération automatique de factures
            </h2>
            <p className="text-gray-600">
              {typeJournal === 'VE'
                ? 'Génère automatiquement les factures clients depuis la balance progressive (comptes 411/412)'
                : 'Génère automatiquement les factures fournisseurs depuis la balance progressive (comptes 401/402)'}
            </p>
          </div>

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
                <div className="flex gap-2">
                  <input
                    type={typeJournal === 'VE' ? 'number' : 'text'}
                    value={typeJournal === 'VE' ? (numeroFactureDebut ?? '') : 'Nom fournisseur'}
                    onChange={(e) => typeJournal === 'VE' && setNumeroFactureDebut(Number(e.target.value))}
                    className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg ${typeJournal === 'VE' ? 'focus:ring-2 focus:ring-purple-500' : 'bg-gray-100'}`}
                    min={typeJournal === 'VE' ? '1' : undefined}
                    disabled={typeJournal === 'HA'}
                    title={typeJournal === 'HA' ? 'Le numéro de pièce est le nom du fournisseur' : undefined}
                  />
                  {typeJournal === 'VE' && (
                    <button
                      onClick={async () => {
                        if (!entreprise?.id || !exercice?.id) return;
                        const res = await facturesApi.getProchainNumero(entreprise.id, exercice.id);
                        setNumeroFactureDebut(res.numero);
                      }}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                      title="Recharger le numéro depuis la base"
                    >
                      🔄
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm text-purple-700 bg-purple-100 rounded p-3">
              {typeJournal === 'VE'
                ? 'ℹ️ Génération automatique depuis la balance progressive • Numérotation F-001, F-002... conservée sur l\'exercice'
                : 'ℹ️ Génération automatique depuis la balance progressive • Numéro de pièce = nom du fournisseur'}
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
