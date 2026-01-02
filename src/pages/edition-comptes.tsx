import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TopMenu from '../components/TopMenu';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { ecrituresApi, type Ecriture } from '../api/ecritures';

interface LigneCompte {
  date: Date;
  journal: string;
  piece: string;
  libelle: string;
  compte: string;
  debit: number;
  credit: number;
  solde: number;
}

export default function EditionComptesPage() {
  const router = useRouter();
  const { entreprise, exercice } = useEntreprise();
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [compteDebut, setCompteDebut] = useState('');
  const [compteFin, setCompteFin] = useState('');
  const [lignes, setLignes] = useState<LigneCompte[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entreprise) {
      router.push('/selection-entreprise');
    }
  }, [entreprise, router]);

  useEffect(() => {
    if (exercice) {
      // Initialiser avec les dates de l'exercice
      const debut = new Date(exercice.date_debut);
      const fin = new Date(exercice.date_fin);
      setDateDebut(debut.toISOString().split('T')[0]);
      setDateFin(fin.toISOString().split('T')[0]);
    }
  }, [exercice]);

  const editerComptes = async () => {
    if (!entreprise || !exercice || !dateDebut || !dateFin) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      // Récupérer toutes les écritures
      const ecritures = await ecrituresApi.getAll(entreprise.id, exercice.id);

      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);

      const lignesFiltered: LigneCompte[] = [];
      let soldesCumules: { [compte: string]: number } = {};

      // Trier les écritures par date
      ecritures.sort(
        (a, b) =>
          new Date(a.date_ecriture).getTime() - new Date(b.date_ecriture).getTime()
      );

      ecritures.forEach((ecriture) => {
        const dateEcriture = new Date(ecriture.date_ecriture);

        // Filtrer par date
        if (dateEcriture < debut || dateEcriture > fin) return;

        ecriture.lignes.forEach((ligne) => {
          // Filtrer par plage de comptes
          if (compteDebut && ligne.numero_compte < compteDebut) return;
          if (compteFin && ligne.numero_compte > compteFin) return;

          // Initialiser le solde si nécessaire
          if (!soldesCumules[ligne.numero_compte]) {
            soldesCumules[ligne.numero_compte] = 0;
          }

          const debit = Number(ligne.debit) || 0;
          const credit = Number(ligne.credit) || 0;
          soldesCumules[ligne.numero_compte] += debit - credit;

          lignesFiltered.push({
            date: dateEcriture,
            journal: ecriture.journal.code,
            piece: ecriture.numero_piece,
            libelle: ligne.libelle_compte || ecriture.libelle,
            compte: ligne.numero_compte,
            debit,
            credit,
            solde: soldesCumules[ligne.numero_compte],
          });
        });
      });

      setLignes(lignesFiltered);
    } catch (err) {
      console.error('Erreur chargement écritures:', err);
      alert('Erreur lors du chargement des écritures');
    } finally {
      setLoading(false);
    }
  };

  const exporterCSV = async () => {
    let csv = 'Date;Journal;Pièce;Libellé;Compte;Débit;Crédit;Solde\n';
    lignes.forEach((ligne) => {
      csv += `${ligne.date.toLocaleDateString('fr-FR')};${ligne.journal};${ligne.piece};${ligne.libelle};${ligne.compte};${ligne.debit.toFixed(2)};${ligne.credit.toFixed(2)};${ligne.solde.toFixed(2)}\n`;
    });

    const filename = `edition_comptes_${dateDebut}_${dateFin}.csv`;

    try {
      const res = await fetch('http://localhost:3001/api/export/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content: csv }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`✓ Fichier exporté : ${result.filename}\nDans le dossier : exports/`);
      } else {
        alert(`Erreur d'export : ${result.error}`);
      }
    } catch (e: any) {
      alert(`Erreur d'export : ${e?.message ?? 'Erreur inconnue'}`);
    }
  };

  const imprimer = () => {
    window.print();
  };

  if (!entreprise) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Édition des comptes
            </h2>
            <p className="text-gray-600">
              Entreprise : <span className="font-semibold">{entreprise.raison_sociale}</span>
              {exercice && (
                <span className="ml-4">
                  Exercice : {new Date(exercice.date_debut).getFullYear()}
                </span>
              )}
            </p>
          </div>

          {/* Filtres */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début *
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
                Date de fin *
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
                Compte début (optionnel)
              </label>
              <input
                type="text"
                value={compteDebut}
                onChange={(e) => setCompteDebut(e.target.value)}
                placeholder="Ex: 401"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compte fin (optionnel)
              </label>
              <input
                type="text"
                value={compteFin}
                onChange={(e) => setCompteFin(e.target.value)}
                placeholder="Ex: 401ZZZ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={editerComptes}
              disabled={loading || !dateDebut || !dateFin}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Chargement...' : '🔍 Afficher'}
            </button>
            {lignes.length > 0 && (
              <>
                <button
                  onClick={exporterCSV}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  📥 Exporter CSV
                </button>
                <button
                  onClick={imprimer}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  🖨️ Imprimer
                </button>
              </>
            )}
          </div>

          {/* Résultats */}
          {lignes.length === 0 && !loading ? (
            <div className="text-center py-12 text-gray-500">
              Sélectionnez les dates et cliquez sur "Afficher" pour voir les écritures
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement en cours...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Journal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Pièce
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Libellé
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Compte
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Débit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Crédit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Solde
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lignes.map((ligne, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {ligne.date.toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                        {ligne.journal}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                        {ligne.piece}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {ligne.libelle}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                        {ligne.compte}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {ligne.debit > 0 ? ligne.debit.toFixed(2) : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-gray-900">
                        {ligne.credit > 0 ? ligne.credit.toFixed(2) : ''}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm text-right font-mono font-semibold ${
                          ligne.solde > 0
                            ? 'text-red-600'
                            : ligne.solde < 0
                            ? 'text-green-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {ligne.solde.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 text-sm text-gray-600">
                <p>
                  {lignes.length} ligne{lignes.length > 1 ? 's' : ''} affichée
                  {lignes.length > 1 ? 's' : ''}
                </p>
                <p className="mt-2">
                  📅 Période : du {new Date(dateDebut).toLocaleDateString('fr-FR')} au{' '}
                  {new Date(dateFin).toLocaleDateString('fr-FR')}
                </p>
                {(compteDebut || compteFin) && (
                  <p className="mt-1">
                    📊 Comptes : de {compteDebut || '(début)'} à {compteFin || '(fin)'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
