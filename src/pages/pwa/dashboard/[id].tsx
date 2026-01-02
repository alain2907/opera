import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getEntreprise,
  getExercicesByEntreprise,
  createExercice,
  updateEntreprise,
  getAllEcritures
} from '../../../lib/storageAdapter';
import PWANavbar from '../../../components/PWANavbar';

interface Entreprise {
  id: number;
  raison_sociale?: string;
  nom?: string;
  siret?: string;
  forme_juridique?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  email?: string;
  telephone?: string;
  notes?: string;
  actif?: boolean;
}

interface Exercice {
  id: number;
  entrepriseId: number;
  annee: number;
  dateDebut: string;
  dateFin: string;
  cloture: boolean;
}

interface Ecriture {
  id: number;
  exerciceId: number;
  date: string;
  journal: string;
  libelle: string;
  debit?: number;
  credit?: number;
  compteNumero: string;
}

export default function PWADashboardPage() {
  const router = useRouter();
  const { id, exercice } = router.query;
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntreprise, setEditedEntreprise] = useState<Partial<Entreprise>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showExerciceModal, setShowExerciceModal] = useState(false);
  const [newExercice, setNewExercice] = useState({
    annee: new Date().getFullYear(),
    dateDebut: `${new Date().getFullYear()}-01-01`,
    dateFin: `${new Date().getFullYear()}-12-31`,
  });
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [soldes, setSoldes] = useState({
    produits: 0,
    charges: 0,
    resultat: 0,
    ventesMarchandises: 0,
    coutAchat: 0,
    margeCommerciale: 0,
    productionVendue: 0,
    valeurAjoutee: 0,
    ebe: 0,
    resultatExploitation: 0,
    resultatNet: 0,
  });
  const [balanceLines, setBalanceLines] = useState<Array<{
    numeroCompte: string;
    libelle: string;
    debit: number;
    credit: number;
    solde: number;
    totalMouvement: number;
  }>>([]);

  useEffect(() => {
    if (id) {
      loadEntreprise();
    }
  }, [id]);

  useEffect(() => {
    if (entreprise && exercices.length > 0) {
      loadEcritures();
    }
  }, [entreprise, exercice, exercices]);

  const loadEntreprise = async () => {
    try {
      setLoading(true);
      const entrepriseData = await getEntreprise(Number(id));
      setEntreprise(entrepriseData);
      setEditedEntreprise(entrepriseData);

      // Enregistrer l'entreprise active dans localStorage pour les autres pages PWA
      localStorage.setItem('pwa_entreprise_active_id', String(id));

      const exercicesData = await getExercicesByEntreprise(Number(id));
      console.log('[Dashboard] Exercices chargés:', exercicesData);
      setExercices(exercicesData);

      // Si un exercice est spécifié dans l'URL, l'enregistrer aussi
      if (exercice) {
        localStorage.setItem('pwa_exercice_actif_id', String(exercice));
      } else if (exercicesData.length > 0) {
        // Sinon, prendre le plus récent non clôturé
        const exerciceEnCours = exercicesData
          .sort((a: any, b: any) => b.annee - a.annee)
          .find((ex: any) => !ex.cloture) || exercicesData[0];
        if (exerciceEnCours) {
          localStorage.setItem('pwa_exercice_actif_id', String(exerciceEnCours.id));
        }
      }
    } catch (err) {
      console.error('Erreur chargement entreprise:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEcritures = async () => {
    if (!entreprise?.id || exercices.length === 0) {
      return;
    }

    const exerciceActuel = exercice
      ? exercices.find((ex) => ex.id === Number(exercice))
      : exercices.sort((a, b) => b.annee - a.annee)[0];

    if (!exerciceActuel) {
      return;
    }

    try {
      const data = await getAllEcritures();
      console.log('[Dashboard] Toutes les écritures:', data);
      console.log('[Dashboard] Exercice actuel ID:', exerciceActuel.id);

      // Support both exerciceId and exercice_id
      const ecrituresFiltered = data.filter((e: any) => {
        const exId = e.exerciceId || e.exercice_id;
        return exId === exerciceActuel.id;
      });

      console.log('[Dashboard] Écritures filtrées:', ecrituresFiltered);
      setEcritures(ecrituresFiltered);
      calculerSoldes(ecrituresFiltered);
      calculerBalance(ecrituresFiltered);
    } catch (err) {
      console.error('[Dashboard PWA] Erreur chargement écritures:', err);
    }
  };

  const calculerSoldes = (ecritures: Ecriture[]) => {
    let produits = 0;
    let charges = 0;
    let ventesMarchandises = 0;
    let coutAchat = 0;
    let productionVendue = 0;

    ecritures.forEach(ecriture => {
      const compte = ecriture.compteNumero;
      const montant = (ecriture.credit || 0) - (ecriture.debit || 0);

      // Produits (classe 7)
      if (compte.startsWith('70')) {
        ventesMarchandises += montant;
      }
      if (compte.startsWith('7')) {
        produits += montant;
        if (compte.startsWith('70') || compte.startsWith('71') || compte.startsWith('72')) {
          productionVendue += montant;
        }
      }

      // Charges (classe 6)
      if (compte.startsWith('607')) {
        coutAchat += Math.abs(montant);
      }
      if (compte.startsWith('6')) {
        charges += Math.abs(montant);
      }
    });

    const margeCommerciale = ventesMarchandises - coutAchat;
    const valeurAjoutee = produits - charges + margeCommerciale;
    const ebe = valeurAjoutee;
    const resultatExploitation = produits - charges;
    const resultatNet = resultatExploitation;

    setSoldes({
      produits,
      charges,
      resultat: resultatNet,
      ventesMarchandises,
      coutAchat,
      margeCommerciale,
      productionVendue,
      valeurAjoutee,
      ebe,
      resultatExploitation,
      resultatNet,
    });
  };

  const calculerBalance = (ecritures: Ecriture[]) => {
    // Group ecritures by account number
    const comptes = new Map<string, { debit: number; credit: number; libelle: string }>();

    ecritures.forEach(ecriture => {
      // Support both field names: compteNumero, compte_numero, numeroCompte, numero_compte
      const numeroCompte = ecriture.compteNumero || (ecriture as any).compte_numero ||
                          (ecriture as any).numeroCompte || (ecriture as any).numero_compte || '';
      const debit = ecriture.debit || (ecriture as any).debit || 0;
      const credit = ecriture.credit || (ecriture as any).credit || 0;
      const libelle = ecriture.libelle || (ecriture as any).libelle || '';

      if (!numeroCompte) return;

      if (!comptes.has(numeroCompte)) {
        comptes.set(numeroCompte, { debit: 0, credit: 0, libelle });
      }

      const compte = comptes.get(numeroCompte)!;
      compte.debit += debit;
      compte.credit += credit;
      // Keep the first non-empty libelle
      if (!compte.libelle && libelle) {
        compte.libelle = libelle;
      }
    });

    // Convert to array and calculate solde
    const balanceArray = Array.from(comptes.entries()).map(([numeroCompte, data]) => ({
      numeroCompte,
      libelle: data.libelle || `Compte ${numeroCompte}`,
      debit: data.debit,
      credit: data.credit,
      solde: data.debit - data.credit,
      totalMouvement: data.debit + data.credit,
    }));

    // Filter out accounts with no movements and sort by total movement
    const balanceFiltered = balanceArray
      .filter(line => line.totalMouvement > 0)
      .sort((a, b) => b.totalMouvement - a.totalMouvement);

    // Keep top 20 accounts
    setBalanceLines(balanceFiltered.slice(0, 20));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedEntreprise(entreprise || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedEntreprise(entreprise || {});
  };

  const handleSave = async () => {
    if (!entreprise?.id) return;

    setIsSaving(true);
    try {
      await updateEntreprise(entreprise.id, editedEntreprise);
      const updated = await getEntreprise(entreprise.id);
      setEntreprise(updated);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof Entreprise, value: string) => {
    setEditedEntreprise(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateExercice = async () => {
    if (!entreprise?.id) return;

    setIsSaving(true);
    try {
      await createExercice({
        entrepriseId: entreprise.id,
        annee: newExercice.annee,
        dateDebut: newExercice.dateDebut,
        dateFin: newExercice.dateFin,
        cloture: false,
      });
      setShowExerciceModal(false);
      await loadEntreprise();
      alert('Exercice créé avec succès !');
    } catch (err) {
      console.error('Erreur création exercice:', err);
      alert('Erreur lors de la création de l\'exercice');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!entreprise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Entreprise introuvable</p>
            <button
              onClick={() => router.push('/pwa')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Retour au dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const exerciceActuel = exercice
    ? exercices.find((ex) => ex.id === Number(exercice))
    : exercices.sort((a, b) => b.annee - a.annee)[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <PWANavbar />

      <div className="max-w-7xl mx-auto p-8">
        {/* Bouton retour */}
        <button
          onClick={() => router.push('/pwa')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour au dashboard
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* En-tête avec infos entreprise */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-3xl font-bold text-gray-900">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedEntreprise.raison_sociale || editedEntreprise.nom || ''}
                    onChange={(e) => handleChange('raison_sociale', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  entreprise.raison_sociale || entreprise.nom
                )}
              </h2>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    ✏️ Modifier
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">SIRET</label>
                      <input
                        type="text"
                        value={editedEntreprise.siret || ''}
                        onChange={(e) => handleChange('siret', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Forme juridique</label>
                      <input
                        type="text"
                        value={editedEntreprise.forme_juridique || ''}
                        onChange={(e) => handleChange('forme_juridique', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Adresse</label>
                      <input
                        type="text"
                        value={editedEntreprise.adresse || ''}
                        onChange={(e) => handleChange('adresse', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Code postal</label>
                        <input
                          type="text"
                          value={editedEntreprise.code_postal || ''}
                          onChange={(e) => handleChange('code_postal', e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Ville</label>
                        <input
                          type="text"
                          value={editedEntreprise.ville || ''}
                          onChange={(e) => handleChange('ville', e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-600 space-y-1">
                    {entreprise.siret && <p>SIRET: {entreprise.siret}</p>}
                    {entreprise.forme_juridique && <p>Forme juridique: {entreprise.forme_juridique}</p>}
                    {entreprise.adresse && <p>Adresse: {entreprise.adresse}</p>}
                    {entreprise.code_postal && entreprise.ville && (
                      <p>{entreprise.code_postal} {entreprise.ville}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">Email</label>
                      <input
                        type="email"
                        value={editedEntreprise.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Téléphone</label>
                      <input
                        type="tel"
                        value={editedEntreprise.telephone || ''}
                        onChange={(e) => handleChange('telephone', e.target.value)}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-600 space-y-1">
                    {entreprise.email && <p>Email: {entreprise.email}</p>}
                    {entreprise.telephone && <p>Téléphone: {entreprise.telephone}</p>}
                  </div>
                )}
              </div>
              <div className="text-right">
                {exerciceActuel ? (
                  <>
                    <h3 className="text-xl font-semibold text-blue-900">
                      Exercice {exerciceActuel.annee}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(exerciceActuel.dateDebut || (exerciceActuel as any).date_debut).toLocaleDateString('fr-FR')} → {new Date(exerciceActuel.dateFin || (exerciceActuel as any).date_fin).toLocaleDateString('fr-FR')}
                    </p>
                    {exerciceActuel.cloture && (
                      <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        Exercice clôturé
                      </span>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500">
                    <p className="mb-2">Aucun exercice</p>
                    <button
                      onClick={() => setShowExerciceModal(true)}
                      className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                    >
                      + Créer un exercice
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Notes */}
          <div className="mb-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              📝 Notes
            </h3>
            {isEditing ? (
              <textarea
                value={editedEntreprise.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Ajoutez des notes concernant cette entreprise..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 min-h-[120px]"
              />
            ) : (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {entreprise.notes || (
                  <p className="text-gray-400 italic">Aucune note pour le moment. Cliquez sur "Modifier" pour en ajouter.</p>
                )}
              </div>
            )}
          </div>

          {/* Cartes de statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <h3 className="text-sm font-medium text-green-800 mb-2">Produits d'exploitation</h3>
              <p className="text-3xl font-bold text-green-900">{soldes.produits.toFixed(2)} €</p>
              <p className="text-xs text-green-600 mt-1">Comptes 70-74</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
              <h3 className="text-sm font-medium text-red-800 mb-2">Charges d'exploitation</h3>
              <p className="text-3xl font-bold text-red-900">{soldes.charges.toFixed(2)} €</p>
              <p className="text-xs text-red-600 mt-1">Comptes 60-64</p>
            </div>
            <div className={`p-6 bg-gradient-to-br rounded-lg border ${
              soldes.resultat >= 0
                ? 'from-blue-50 to-blue-100 border-blue-200'
                : 'from-red-50 to-red-100 border-red-200'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${soldes.resultat >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                Résultat d'exploitation
              </h3>
              <p className={`text-3xl font-bold ${soldes.resultat >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                {soldes.resultat.toFixed(2)} €
              </p>
              <p className={`text-xs mt-1 ${soldes.resultat >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                Produits - Charges
              </p>
            </div>
          </div>

          {/* Balance Comptable */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Balance Comptable</h3>
              {exerciceActuel && (
                <button
                  onClick={() => router.push(`/pwa/balance-comptable?entreprise=${entreprise.id}&exercice=${exerciceActuel.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
                >
                  Voir balance complète
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Numéro compte
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Libellé
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Débit (€)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Crédit (€)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Solde (€)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balanceLines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Aucune écriture comptable pour cet exercice
                      </td>
                    </tr>
                  ) : (
                    <>
                      {balanceLines.map((line, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono font-semibold">
                            {line.numeroCompte}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">
                            {line.libelle}
                          </td>
                          <td className="px-6 py-3 text-sm text-right text-gray-900 font-mono">
                            {line.debit.toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-sm text-right text-gray-900 font-mono">
                            {line.credit.toFixed(2)}
                          </td>
                          <td className={`px-6 py-3 text-sm text-right font-mono font-semibold ${
                            line.solde >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {line.solde.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                        <td className="px-4 py-3 text-sm text-blue-900" colSpan={2}>
                          TOTAUX
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-blue-900 font-mono">
                          {balanceLines.reduce((sum, line) => sum + line.debit, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-blue-900 font-mono">
                          {balanceLines.reduce((sum, line) => sum + line.credit, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-sm text-right text-blue-900 font-mono">
                          {balanceLines.reduce((sum, line) => sum + line.solde, 0).toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            {balanceLines.length > 0 && (
              <p className="mt-2 text-xs text-gray-500 italic">
                Affichage des 20 comptes avec le plus de mouvements
              </p>
            )}
          </div>

          {/* Boutons d'actions rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/pwa/saisie')}
              className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              ✏️ Nouvelle saisie
            </button>
            <button
              onClick={() => router.push('/pwa/ecritures')}
              className="p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
            >
              📋 Liste écritures
            </button>
            <button
              onClick={() => router.push('/pwa/balance')}
              className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
            >
              ⚖️ Balance
            </button>
            <button
              onClick={() => router.push('/pwa/grand-livre')}
              className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition"
            >
              📖 Grand livre
            </button>
          </div>
        </div>

        {/* Modal création exercice */}
        {showExerciceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold mb-6">Créer un nouvel exercice</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année
                  </label>
                  <input
                    type="number"
                    value={newExercice.annee}
                    onChange={(e) => setNewExercice({ ...newExercice, annee: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={newExercice.dateDebut}
                    onChange={(e) => setNewExercice({ ...newExercice, dateDebut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={newExercice.dateFin}
                    onChange={(e) => setNewExercice({ ...newExercice, dateFin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateExercice}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? 'Création...' : 'Créer'}
                </button>
                <button
                  onClick={() => setShowExerciceModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
