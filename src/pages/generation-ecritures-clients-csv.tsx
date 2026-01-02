import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { ecrituresApi } from '../api/ecritures';
import { journauxApi, type Journal } from '../api/journaux';
import { comptesApi, type Compte } from '../api/comptes';
import axios from 'axios';

interface CSVRow {
  [key: string]: string;
}

interface EcritureGeneree {
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

export default function GenerationEcrituresClientsCSVPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [ecritures, setEcritures] = useState<EcritureGeneree[]>([]);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Configuration
  const [journal, setJournal] = useState('VE');
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [tauxTVA, setTauxTVA] = useState(0);
  const [compteProduit, setCompteProduit] = useState('7');
  const [compteTVA, setCompteTVA] = useState('44571');
  const [numeroFactureDebut, setNumeroFactureDebut] = useState<number | null>(null);

  // Charger le prochain numéro de facture au montage
  useEffect(() => {
    if (entreprise && exercice) {
      axios
        .get(`http://localhost:3001/api/factures/prochain-numero?entrepriseId=${entreprise.id}&exerciceId=${exercice.id}`)
        .then((res) => {
          setNumeroFactureDebut(res.data.numero);
        })
        .catch((err) => {
          console.error('Erreur chargement numéro facture:', err);
          setNumeroFactureDebut(1);
        });
    }
  }, [entreprise, exercice]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCsvData([]);
      setHeaders([]);
      setEcritures([]);
    }
  };

  const parseCSV = async () => {
    if (!file) {
      alert('Veuillez sélectionner un fichier CSV');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        alert('Le fichier CSV est vide');
        setLoading(false);
        return;
      }

      // Première ligne = en-têtes
      const headerLine = lines[0];
      const parsedHeaders = headerLine.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
      setHeaders(parsedHeaders);

      // Lignes suivantes = données
      const rows: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));

        const row: CSVRow = {};
        parsedHeaders.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }

      setCsvData(rows);
    } catch (err) {
      console.error('Erreur lors de la lecture du CSV:', err);
      alert('Erreur lors de la lecture du fichier CSV');
    } finally {
      setLoading(false);
    }
  };

  const genererEcritures = async () => {
    if (csvData.length === 0) {
      alert('Veuillez d\'abord charger un fichier CSV');
      return;
    }

    if (!entreprise) {
      alert('Entreprise non sélectionnée');
      return;
    }

    setLoading(true);
    try {
      // Charger tous les comptes clients
      const comptes = await comptesApi.getAll(entreprise.id);

      const nouvellesEcritures: EcritureGeneree[] = [];
      let numeroFacture = numeroFactureDebut;

      csvData.forEach((row) => {
        // Chercher le compte (format attendu: 411xxx)
        const numeroCompte = row['Compte'] || row['compte'] || row['Numéro'] || row['numero'];
        const solde = parseFloat(row['Solde'] || row['solde'] || row['Montant'] || row['montant'] || '0');
        const libelle = row['Libellé'] || row['libelle'] || row['Intitulé'] || row['intitule'] || '';

        // Ne traiter que les comptes 411 et 412 avec solde créditeur (négatif dans le CSV)
        if (numeroCompte && (numeroCompte.startsWith('411') || numeroCompte.startsWith('412')) && solde < 0) {
          // Trouver le compte client dans le plan comptable
          const compteClient = comptes.find((c: Compte) => c.numero_compte === numeroCompte);

          if (!compteClient) {
            console.warn(`Compte ${numeroCompte} non trouvé dans le plan comptable`);
            return;
          }

          // Utiliser les paramètres associés au compte ou les valeurs par défaut
          const tauxTVACompte = compteClient.taux_tva !== undefined && compteClient.taux_tva !== null ? compteClient.taux_tva : tauxTVA;
          const compteProduitCompte = compteClient.compte_charge || compteProduit;
          const compteTVACompte = compteClient.compte_tva || compteTVA;

          const montantTTC = Math.abs(solde);
          // Si taux TVA = 0, pas de TVA : montant TTC = montant HT
          const montantHT = tauxTVACompte > 0 ? montantTTC / (1 + tauxTVACompte / 100) : montantTTC;
          const montantTVACalc = montantTTC - montantHT;

          // Date au DÉBUT du mois (jour 1)
          const dateEcriture = `${annee}-${String(mois).padStart(2, '0')}-01`;

          // Générer le numéro de facture formaté F-001, F-002, etc.
          const numFacture = `F-${String(numeroFacture).padStart(3, '0')}`;

          nouvellesEcritures.push({
            date: dateEcriture,
            journal: journal,
            numeroFacture: numFacture,
            libelle: `Facture ${numFacture} ${mois}/${annee} ${libelle || compteClient.libelle}`,
            compteClient: numeroCompte,
            nomClient: compteClient.libelle,
            montantDebit: montantTTC,
            compteProduit: compteProduitCompte,
            montantProduit: montantHT,
            compteTVA: compteTVACompte,
            montantTVA: montantTVACalc,
            tauxTVA: tauxTVACompte,
          });

          numeroFacture++;
        }
      });

      setEcritures(nouvellesEcritures);

      if (nouvellesEcritures.length === 0) {
        alert('Aucune écriture générée. Vérifiez que le CSV contient des comptes 411/412 créditeurs présents dans le plan comptable.');
      } else {
        setShowValidation(false); // Masquer la validation si on regénère
      }
    } catch (err) {
      console.error('Erreur lors de la génération:', err);
      alert('Erreur lors de la génération des écritures');
    } finally {
      setLoading(false);
    }
  };

  const mettreDansBrouillard = () => {
    setShowValidation(true);
  };

  const enregistrerEcritures = async () => {
    if (ecritures.length === 0) {
      alert('Aucune écriture à enregistrer');
      return;
    }

    if (!entreprise || !exercice) {
      alert('Entreprise ou exercice non sélectionné');
      return;
    }

    setLoading(true);
    try {
      // Récupérer le journal
      const journaux = await journauxApi.findByEntreprise(entreprise.id);
      const journalObj = journaux.find((j: Journal) => j.code === journal);

      if (!journalObj) {
        alert(`Journal ${journal} introuvable`);
        setLoading(false);
        return;
      }

      let nbCreees = 0;

      // Créer les écritures une par une
      for (const ecriture of ecritures) {
        const lignes = [
          {
            numero_compte: ecriture.compteClient,
            libelle_compte: ecriture.libelle,
            debit: ecriture.montantDebit,
            credit: 0,
          },
          {
            numero_compte: ecriture.compteProduit,
            libelle_compte: ecriture.libelle,
            debit: 0,
            credit: ecriture.montantProduit,
          },
        ];

        // N'ajouter la ligne TVA que si le taux est supérieur à 0
        if (ecriture.tauxTVA > 0) {
          lignes.push({
            numero_compte: ecriture.compteTVA,
            libelle_compte: ecriture.libelle,
            debit: 0,
            credit: ecriture.montantTVA,
          });
        }

        await ecrituresApi.create({
          entreprise_id: entreprise.id,
          exercice_id: exercice.id,
          journal_id: journalObj.id,
          date_ecriture: ecriture.date,
          numero_piece: ecriture.numeroFacture,
          libelle: ecriture.libelle,
          lignes,
        });

        nbCreees++;
      }

      // Incrémenter le compteur de factures pour l'exercice
      await axios.post('http://localhost:3001/api/factures/incrementer', {
        entrepriseId: entreprise.id,
        exerciceId: exercice.id,
        nbFactures: nbCreees,
      });

      alert(`✓ ${nbCreees} écriture(s) enregistrée(s) avec succès dans le journal ${journal}`);

      // Réinitialiser
      setEcritures([]);
      setCsvData([]);
      setFile(null);

      // Recharger le prochain numéro de facture
      const res = await axios.get(`http://localhost:3001/api/factures/prochain-numero?entrepriseId=${entreprise.id}&exerciceId=${exercice.id}`);
      setNumeroFactureDebut(res.data.numero);

    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement:', err);
      alert(`Erreur : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Génération d'écritures clients depuis CSV</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Génération d'écritures clients depuis Balance Progressive
            </h2>
            <p className="text-gray-600">
              Génère des factures clients (411/412 créditeurs) avec numérotation automatique F-001, F-002...
            </p>
          </div>

          {/* Configuration */}
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Journal
                </label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mois
                </label>
                <select
                  value={mois}
                  onChange={(e) => setMois(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° facture début
                </label>
                <input
                  type="number"
                  value={numeroFactureDebut ?? ''}
                  onChange={(e) => setNumeroFactureDebut(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="1"
                  disabled={true}
                  title="Numéro automatique géré par l'exercice"
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-green-700 bg-green-100 rounded p-3">
              ℹ️ Date = 1er du mois • Numérotation automatique F-001, F-002... conservée sur l'exercice • Les comptes de produits, TVA et taux sont définis dans le plan comptable pour chaque client
            </div>
          </div>

          {/* Sélection du fichier */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichier CSV de Balance Progressive (comptes 411/412 créditeurs)
            </label>
            <div className="flex gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={parseCSV}
                disabled={!file || loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
              >
                {loading ? 'Lecture...' : '📂 Charger'}
              </button>
            </div>
          </div>

          {/* Actions */}
          {csvData.length > 0 && !showValidation && (
            <div className="mb-6 flex gap-4">
              <button
                onClick={genererEcritures}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                ⚙️ Générer les factures
              </button>
              {ecritures.length > 0 && (
                <button
                  onClick={mettreDansBrouillard}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  📋 Mettre en brouillard
                </button>
              )}
            </div>
          )}

          {/* Validation Brouillard */}
          {showValidation && (
            <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-6">
              <h3 className="text-xl font-bold text-yellow-900 mb-4">
                ⚠️ Brouillard - Validation des écritures
              </h3>
              <p className="text-yellow-800 mb-4">
                {ecritures.length} facture{ecritures.length > 1 ? 's' : ''} prête{ecritures.length > 1 ? 's' : ''} à être enregistrée{ecritures.length > 1 ? 's' : ''} dans le journal <strong>{journal}</strong>.
                Vérifiez les données avant validation.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={enregistrerEcritures}
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
                    setEcritures([]);
                    setCsvData([]);
                  }}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
                >
                  ❌ Annuler tout
                </button>
              </div>
            </div>
          )}

          {/* Aperçu des écritures générées */}
          {ecritures.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Factures générées ({ecritures.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Journal</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">N° Facture</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Libellé</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Compte</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Débit</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Crédit</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold">TVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ecritures.map((ecriture, idx) => (
                      <>
                        {/* Ligne Client */}
                        <tr key={`${idx}-client`} className="hover:bg-green-50 transition-colors bg-green-50">
                          <td className="px-4 py-2 text-sm">{ecriture.date}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.journal}</td>
                          <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{ecriture.numeroFacture}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.libelle}</td>
                          <td className="px-4 py-2 text-sm font-mono text-green-600 font-semibold">{ecriture.compteClient}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">{ecriture.montantDebit.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">-</td>
                          <td className="px-4 py-2 text-sm text-center"></td>
                        </tr>
                        {/* Ligne Produit */}
                        <tr key={`${idx}-produit`} className="hover:bg-green-50 transition-colors">
                          <td className="px-4 py-2 text-sm">{ecriture.date}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.journal}</td>
                          <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{ecriture.numeroFacture}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.libelle}</td>
                          <td className="px-4 py-2 text-sm font-mono text-blue-600">{ecriture.compteProduit}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">-</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">{ecriture.montantProduit.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-center">{ecriture.tauxTVA === 0 ? 'Non soumis' : ''}</td>
                        </tr>
                        {/* Ligne TVA - affichée seulement si taux > 0 */}
                        {ecriture.tauxTVA > 0 && (
                          <tr key={`${idx}-tva`} className="hover:bg-green-50 transition-colors">
                            <td className="px-4 py-2 text-sm">{ecriture.date}</td>
                            <td className="px-4 py-2 text-sm">{ecriture.journal}</td>
                            <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{ecriture.numeroFacture}</td>
                            <td className="px-4 py-2 text-sm">{ecriture.libelle}</td>
                            <td className="px-4 py-2 text-sm font-mono text-blue-600">{ecriture.compteTVA}</td>
                            <td className="px-4 py-2 text-sm text-right font-mono">-</td>
                            <td className="px-4 py-2 text-sm text-right font-mono">{ecriture.montantTVA.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-center text-orange-600 font-semibold">{ecriture.tauxTVA}%</td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {csvData.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Sélectionnez le fichier CSV de balance progressive et cliquez sur "Charger"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
