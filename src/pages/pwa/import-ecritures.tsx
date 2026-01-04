import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Papa from 'papaparse';
import {
  getAllEntreprises,
  getExercicesByEntreprise,
  createEcriture,
} from '../../lib/storageAdapter';
import PWANavbar from '../../components/PWANavbar';

interface CSVEcriture {
  date: string;
  journal: string;
  pieceRef: string;
  compteNumero: string;
  libelle: string;
  debit: string;
  credit: string;
}

interface EcritureValidation {
  pieceRef: string;
  journal: string;
  mois: string;
  totalDebit: number;
  totalCredit: number;
  equilibree: boolean;
  lignes: CSVEcriture[];
}

export default function ImportEcrituresPWA() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [selectedEntreprise, setSelectedEntreprise] = useState<number | null>(null);
  const [exercices, setExercices] = useState<any[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<number | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [ecritures, setEcritures] = useState<EcritureValidation[]>([]);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [importing, setImporting] = useState(false);
  const [entrepriseValidated, setEntrepriseValidated] = useState(false);
  const [exerciceValidated, setExerciceValidated] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEntreprise) {
      loadExercices(selectedEntreprise);
    }
  }, [selectedEntreprise]);

  async function loadData() {
    const data = await getAllEntreprises();
    setEntreprises(data);
    if (data.length > 0) {
      const entrepriseActive = data.find((e: any) => e.actif) || data[0];
      setSelectedEntreprise(entrepriseActive.id);
    }
  }

  async function loadExercices(entrepriseId: number) {
    const data = await getExercicesByEntreprise(entrepriseId);
    setExercices(data);
    if (data.length > 0) {
      // Trouver l'exercice en cours (non clôturé)
      const exerciceEnCours = data.find((ex: any) => !ex.cloture) || data[0];
      setSelectedExercice(exerciceEnCours.id);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  }

  function parseCSV() {
    if (!csvFile) {
      alert('Veuillez sélectionner un fichier CSV');
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const lignes = results.data as CSVEcriture[];

        // Validation des colonnes
        if (lignes.length === 0) {
          setErreurs(['Le fichier CSV est vide']);
          return;
        }

        const premiereeLigne = lignes[0];
        const colonnesRequises = ['date', 'journal', 'pieceRef', 'compteNumero', 'libelle', 'debit', 'credit'];
        const colonnesManquantes = colonnesRequises.filter(col => !(col in premiereeLigne));

        if (colonnesManquantes.length > 0) {
          setErreurs([`Colonnes manquantes : ${colonnesManquantes.join(', ')}`]);
          return;
        }

        // Grouper par pieceRef + journal + mois
        const groupes = new Map<string, CSVEcriture[]>();

        lignes.forEach((ligne, index) => {
          // Valider le format de la date
          const dateMatch = ligne.date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (!dateMatch) {
            setErreurs([`Ligne ${index + 2}: Format de date invalide "${ligne.date}". Utilisez JJ/MM/AAAA`]);
            return;
          }

          const [_, jour, mois, annee] = dateMatch;
          const moisAnnee = `${mois}/${annee}`;
          const cle = `${ligne.pieceRef}|${ligne.journal}|${moisAnnee}`;

          if (!groupes.has(cle)) {
            groupes.set(cle, []);
          }
          groupes.get(cle)!.push(ligne);
        });

        // Valider l'équilibre de chaque groupe
        const validations: EcritureValidation[] = [];
        const erreursValidation: string[] = [];

        groupes.forEach((lignesGroupe, cle) => {
          const [pieceRef, journal, mois] = cle.split('|');

          let totalDebit = 0;
          let totalCredit = 0;

          // Filtrer les lignes vides (debit=0 ET credit=0)
          const lignesNonVides = lignesGroupe.filter(ligne => {
            const debit = parseFloat(ligne.debit) || 0;
            const credit = parseFloat(ligne.credit) || 0;
            return !(debit === 0 && credit === 0);
          });

          lignesNonVides.forEach(ligne => {
            const debit = parseFloat(ligne.debit) || 0;
            const credit = parseFloat(ligne.credit) || 0;
            totalDebit += debit;
            totalCredit += credit;
          });

          // Vérifier l'équilibre (avec tolérance de 0.01 pour les arrondis)
          const equilibree = Math.abs(totalDebit - totalCredit) < 0.01;

          if (!equilibree) {
            erreursValidation.push(
              `❌ Écriture déséquilibrée : Pièce "${pieceRef}" | Journal "${journal}" | Mois "${mois}" → Débit: ${totalDebit.toFixed(2)}€ ≠ Crédit: ${totalCredit.toFixed(2)}€ (écart: ${Math.abs(totalDebit - totalCredit).toFixed(2)}€)`
            );
          }

          validations.push({
            pieceRef,
            journal,
            mois,
            totalDebit,
            totalCredit,
            equilibree,
            lignes: lignesNonVides, // Stocker uniquement les lignes non vides
          });
        });

        if (erreursValidation.length > 0) {
          setErreurs(erreursValidation);
          setEcritures([]);
          return;
        }

        // Toutes les écritures sont valides
        setEcritures(validations);
        setErreurs([]);
        setStep('preview');
      },
      error: (error) => {
        setErreurs([`Erreur de lecture du fichier : ${error.message}`]);
      },
    });
  }

  async function importEcritures() {
    if (!selectedExercice) {
      alert('Veuillez sélectionner un exercice');
      return;
    }

    setImporting(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const ecriture of ecritures) {
        for (const ligne of ecriture.lignes) {
          const debit = parseFloat(ligne.debit) || 0;
          const credit = parseFloat(ligne.credit) || 0;

          // Ignorer silencieusement les lignes vides (debit=0 ET credit=0)
          if (debit === 0 && credit === 0) {
            continue;
          }

          // Parser la date JJ/MM/AAAA → AAAA-MM-JJ
          const [jour, mois, annee] = ligne.date.split('/');
          const dateISO = `${annee}-${mois}-${jour}`;

          const ligneData = {
            exerciceId: selectedExercice,
            date: dateISO,
            journal: ligne.journal,
            pieceRef: ligne.pieceRef,
            compteNumero: ligne.compteNumero,
            libelle: ligne.libelle,
            debit,
            credit,
          };

          try {
            await createEcriture(ligneData);
            successCount++;
          } catch (err) {
            console.error('Erreur création ligne:', err);
            errorCount++;
          }
        }
      }

      alert(`✅ Import terminé !\n\n${successCount} lignes importées\n${errorCount} erreurs`);
      setStep('done');
    } catch (err) {
      console.error('Erreur import:', err);
      alert('❌ Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PWANavbar />

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-6">
            📥 Import d'écritures comptables (CSV)
          </h1>

          {/* Sélection entreprise et exercice */}
          {step === 'select' && (
            <>
              {/* Étape 1: Sélection de l'entreprise */}
              <div className={`border-2 rounded-lg p-6 mb-6 ${entrepriseValidated ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'}`}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  {entrepriseValidated ? '✅ Étape 1: Entreprise validée' : '1️⃣ Étape 1: Sélection de l\'entreprise'}
                </h2>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Entreprise
                  </label>
                  <select
                    value={selectedEntreprise || ''}
                    onChange={(e) => {
                      setSelectedEntreprise(Number(e.target.value));
                      setEntrepriseValidated(false);
                      setExerciceValidated(false);
                      setSelectedExercice(null);
                    }}
                    disabled={entrepriseValidated}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Sélectionner une entreprise</option>
                    {entreprises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.raison_sociale || e.nom}
                      </option>
                    ))}
                  </select>
                </div>
                {!entrepriseValidated ? (
                  <button
                    onClick={() => setEntrepriseValidated(true)}
                    disabled={!selectedEntreprise}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    ✓ Valider l'entreprise
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEntrepriseValidated(false);
                      setExerciceValidated(false);
                      setSelectedExercice(null);
                    }}
                    className="w-full bg-gray-500 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                  >
                    ✎ Modifier l'entreprise
                  </button>
                )}
              </div>

              {/* Étape 2: Sélection de l'exercice */}
              {entrepriseValidated && (
                <div className={`border-2 rounded-lg p-6 mb-6 ${exerciceValidated ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'}`}>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {exerciceValidated ? '✅ Étape 2: Exercice validé' : '2️⃣ Étape 2: Sélection de l\'exercice'}
                  </h2>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Exercice
                    </label>
                    <select
                      value={selectedExercice || ''}
                      onChange={(e) => {
                        setSelectedExercice(Number(e.target.value));
                        setExerciceValidated(false);
                      }}
                      disabled={exerciceValidated}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Sélectionner un exercice</option>
                      {exercices.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.annee} {ex.cloture ? '(Clôturé)' : '(En cours)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!exerciceValidated ? (
                    <button
                      onClick={() => setExerciceValidated(true)}
                      disabled={!selectedExercice}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      ✓ Valider l'exercice
                    </button>
                  ) : (
                    <button
                      onClick={() => setExerciceValidated(false)}
                      className="w-full bg-gray-500 text-white py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    >
                      ✎ Modifier l'exercice
                    </button>
                  )}
                </div>
              )}

              {/* Format attendu */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-blue-800">📋 Format CSV attendu :</h3>
                  <a
                    href="/modele-import-ecritures.csv"
                    download
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    ⬇️ Télécharger le modèle
                  </a>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Colonnes :</strong> date, journal, pieceRef, compteNumero, libelle, debit, credit</p>
                  <p><strong>Date :</strong> JJ/MM/AAAA (ex: 01/05/2025)</p>
                  <p><strong>Journal :</strong> AC, VE, BQ, CA, OD</p>
                  <p><strong>pieceRef :</strong> Numéro de pièce unique (même numéro = même écriture)</p>
                  <p><strong>Débit/Crédit :</strong> Montant décimal ou vide</p>
                  <p className="text-red-600 font-semibold mt-2">
                    ⚠️ Chaque écriture (pieceRef + journal + mois) doit être équilibrée (total débit = total crédit)
                  </p>
                </div>
              </div>

              {/* Sélection fichier - uniquement si entreprise et exercice validés */}
              {exerciceValidated && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fichier CSV
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  {/* Erreurs */}
                  {erreurs.length > 0 && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-red-800 mb-2">❌ Erreurs détectées :</h3>
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {erreurs.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                      <p className="text-red-600 font-semibold mt-3">
                        L'import est rejeté. Corrigez les erreurs et réessayez.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={parseCSV}
                    disabled={!csvFile || !entrepriseValidated || !exerciceValidated}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    📊 Prévisualiser les écritures
                  </button>
                </>
              )}
            </>
          )}

          {/* Prévisualisation */}
          {step === 'preview' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-green-600 mb-4">
                  ✅ {ecritures.length} écriture(s) valide(s) prête(s) à importer
                </h2>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {ecritures.map((ecriture, idx) => (
                    <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-gray-800">
                          📄 Pièce: {ecriture.pieceRef} | Journal: {ecriture.journal} | Mois: {ecriture.mois}
                        </h3>
                        <span className="text-green-600 font-semibold">
                          ✓ Équilibrée ({ecriture.totalDebit.toFixed(2)}€)
                        </span>
                      </div>

                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Compte</th>
                            <th className="p-2 text-left">Libellé</th>
                            <th className="p-2 text-right">Débit</th>
                            <th className="p-2 text-right">Crédit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ecriture.lignes.map((ligne, lidx) => (
                            <tr key={lidx} className="border-t">
                              <td className="p-2">{ligne.date}</td>
                              <td className="p-2 font-mono">{ligne.compteNumero}</td>
                              <td className="p-2">{ligne.libelle}</td>
                              <td className="p-2 text-right font-mono">
                                {ligne.debit ? parseFloat(ligne.debit).toFixed(2) : '-'}
                              </td>
                              <td className="p-2 text-right font-mono">
                                {ligne.credit ? parseFloat(ligne.credit).toFixed(2) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setStep('select');
                    setCsvFile(null);
                    setEcritures([]);
                    setErreurs([]);
                    setEntrepriseValidated(false);
                    setExerciceValidated(false);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  ← Annuler
                </button>
                <button
                  onClick={importEcritures}
                  disabled={importing}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? '⏳ Import en cours...' : '✅ Importer les écritures'}
                </button>
              </div>
            </>
          )}

          {/* Terminé */}
          {step === 'done' && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-4">Import terminé !</h2>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push('/pwa/ecritures')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  📝 Voir les écritures
                </button>
                <button
                  onClick={() => {
                    setStep('select');
                    setCsvFile(null);
                    setEcritures([]);
                    setErreurs([]);
                    setEntrepriseValidated(false);
                    setExerciceValidated(false);
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                >
                  🔄 Nouvel import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
