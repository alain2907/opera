import { useState } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { ecrituresApi } from '../api/ecritures';
import { journauxApi, type Journal } from '../api/journaux';
import { comptesApi, type Compte } from '../api/comptes';

interface CSVRow {
  [key: string]: string;
}

interface EcritureGeneree {
  date: string;
  journal: string;
  libelle: string;
  compteFournisseur: string;
  nomFournisseur: string;
  montantCredit: number;
  compteCharge: string;
  montantCharge: number;
  compteTVA: string;
  montantTVA: number;
  tauxTVA: number;
}

export default function GenerationEcrituresCSVPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [ecritures, setEcritures] = useState<EcritureGeneree[]>([]);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Configuration
  const [journal, setJournal] = useState('HA');
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [tauxTVA, setTauxTVA] = useState(20);
  const [compteCharge, setCompteCharge] = useState('6');
  const [compteTVA, setCompteTVA] = useState('44566');

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
      // Charger tous les comptes fournisseurs
      const comptes = await comptesApi.getAll(entreprise.id);

      const nouvellesEcritures: EcritureGeneree[] = [];

      csvData.forEach((row) => {
        // Chercher le compte (format attendu: 401xxx)
        const numeroCompte = row['Compte'] || row['compte'] || row['Numéro'] || row['numero'];
        const solde = parseFloat(row['Solde'] || row['solde'] || row['Montant'] || row['montant'] || '0');
        const libelle = row['Libellé'] || row['libelle'] || row['Intitulé'] || row['intitule'] || '';

        // Ne traiter que les comptes 401 avec solde débiteur (positif)
        if (numeroCompte && numeroCompte.startsWith('401') && solde > 0) {
          // Trouver le compte fournisseur dans le plan comptable
          const compteFournisseur = comptes.find((c: Compte) => c.numero_compte === numeroCompte);

          if (!compteFournisseur) {
            console.warn(`Compte ${numeroCompte} non trouvé dans le plan comptable`);
            return;
          }

          // Utiliser les paramètres associés au compte ou les valeurs par défaut
          const tauxTVACompte = compteFournisseur.taux_tva || tauxTVA;
          const compteChargeCompte = compteFournisseur.compte_charge || compteCharge;
          const compteTVACompte = compteFournisseur.compte_tva || compteTVA;

          const montantTTC = Math.abs(solde);
          const montantHT = montantTTC / (1 + tauxTVACompte / 100);
          const montantTVACalc = montantTTC - montantHT;

          const dernierJour = new Date(annee, mois, 0).getDate();
          const dateEcriture = `${annee}-${String(mois).padStart(2, '0')}-${String(dernierJour).padStart(2, '0')}`;

          nouvellesEcritures.push({
            date: dateEcriture,
            journal: journal,
            libelle: `Relevé ${mois}/${annee} ${libelle || compteFournisseur.libelle}`,
            compteFournisseur: numeroCompte,
            nomFournisseur: compteFournisseur.libelle,
            montantCredit: montantTTC,
            compteCharge: compteChargeCompte,
            montantCharge: montantHT,
            compteTVA: compteTVACompte,
            montantTVA: montantTVACalc,
            tauxTVA: tauxTVACompte,
          });
        }
      });

      setEcritures(nouvellesEcritures);

      if (nouvellesEcritures.length === 0) {
        alert('Aucune écriture générée. Vérifiez que le CSV contient des comptes 401 débiteurs présents dans le plan comptable.');
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
            numero_compte: ecriture.compteCharge,
            libelle_compte: ecriture.libelle,
            debit: ecriture.montantCharge,
            credit: 0,
          },
          {
            numero_compte: ecriture.compteTVA,
            libelle_compte: ecriture.libelle,
            debit: ecriture.montantTVA,
            credit: 0,
          },
          {
            numero_compte: ecriture.compteFournisseur,
            libelle_compte: ecriture.libelle,
            debit: 0,
            credit: ecriture.montantCredit,
          },
        ];

        await ecrituresApi.create({
          entreprise_id: entreprise.id,
          exercice_id: exercice.id,
          journal_id: journalObj.id,
          date_ecriture: ecriture.date,
          numero_piece: ecriture.nomFournisseur,
          libelle: ecriture.libelle,
          lignes,
        });

        nbCreees++;
      }

      alert(`✓ ${nbCreees} écriture(s) enregistrée(s) avec succès dans le journal ${journal}`);

      // Réinitialiser
      setEcritures([]);
      setCsvData([]);
      setFile(null);

    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement:', err);
      alert(`Erreur : ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <TopMenu />
        <div className="max-w-6xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Génération d'écritures depuis CSV</h2>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Génération d'écritures depuis Balance Progressive
            </h2>
            <p className="text-gray-600">
              Génère des écritures de relevés fournisseurs (401 débiteurs) avec TVA et charges
            </p>
          </div>

          {/* Configuration */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Journal
                </label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mois
                </label>
                <select
                  value={mois}
                  onChange={(e) => setMois(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-blue-700 bg-blue-100 rounded p-3">
              ℹ️ Les comptes de charges, TVA et taux sont définis dans le plan comptable pour chaque fournisseur
            </div>
          </div>

          {/* Sélection du fichier */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichier CSV de Balance Progressive (comptes 401 débiteurs)
            </label>
            <div className="flex gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={parseCSV}
                disabled={!file || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
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
                ⚙️ Générer les écritures
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
                {ecritures.length} écriture{ecritures.length > 1 ? 's' : ''} prête{ecritures.length > 1 ? 's' : ''} à être enregistrée{ecritures.length > 1 ? 's' : ''} dans le journal <strong>{journal}</strong>.
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
                Écritures générées ({ecritures.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Journal</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Pièce</th>
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
                        {/* Ligne Charge */}
                        <tr key={`${idx}-charge`} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-2 text-sm">{ecriture.date}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.journal}</td>
                          <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{ecriture.nomFournisseur}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.libelle}</td>
                          <td className="px-4 py-2 text-sm font-mono text-blue-600">{ecriture.compteCharge}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">{ecriture.montantCharge.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">-</td>
                          <td className="px-4 py-2 text-sm text-center"></td>
                        </tr>
                        {/* Ligne TVA */}
                        <tr key={`${idx}-tva`} className="hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-2 text-sm">{ecriture.date}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.journal}</td>
                          <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{ecriture.nomFournisseur}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.libelle}</td>
                          <td className="px-4 py-2 text-sm font-mono text-blue-600">{ecriture.compteTVA}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">{ecriture.montantTVA.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">-</td>
                          <td className="px-4 py-2 text-sm text-center text-orange-600 font-semibold">{ecriture.tauxTVA}%</td>
                        </tr>
                        {/* Ligne Fournisseur */}
                        <tr key={`${idx}-frs`} className="hover:bg-blue-50 transition-colors bg-green-50">
                          <td className="px-4 py-2 text-sm">{ecriture.date}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.journal}</td>
                          <td className="px-4 py-2 text-sm text-purple-600 font-semibold">{ecriture.nomFournisseur}</td>
                          <td className="px-4 py-2 text-sm">{ecriture.libelle}</td>
                          <td className="px-4 py-2 text-sm font-mono text-green-600 font-semibold">{ecriture.compteFournisseur}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">-</td>
                          <td className="px-4 py-2 text-sm text-right font-mono">{ecriture.montantCredit.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-center"></td>
                        </tr>
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
