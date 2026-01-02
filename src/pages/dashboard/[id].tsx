import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { entreprisesApi, type Entreprise } from '../../api/entreprises';
import { exercicesApi, type Exercice } from '../../api/exercices';
import { ecrituresApi, type Ecriture } from '../../api/ecritures';
import TopMenu from '../../components/TopMenu';

export default function DashboardPage() {
  const router = useRouter();
  const { id, exercice } = router.query;
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntreprise, setEditedEntreprise] = useState<Partial<Entreprise>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showExerciceModal, setShowExerciceModal] = useState(false);
  const [newExercice, setNewExercice] = useState({
    annee: new Date().getFullYear(),
    date_debut: `${new Date().getFullYear()}-01-01`,
    date_fin: `${new Date().getFullYear()}-12-31`,
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

  useEffect(() => {
    if (id) {
      loadEntreprise();
    }
  }, [id]);

  useEffect(() => {
    if (entreprise) {
      loadEcritures();
    }
  }, [entreprise, exercice]);

  const loadEntreprise = async () => {
    try {
      const data = await entreprisesApi.getOne(Number(id));
      setEntreprise(data);
      setEditedEntreprise(data);
      // Sauvegarder l'ID de l'entreprise en cours dans localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentEntrepriseId', String(id));
      }
    } catch (err) {
      console.error('Erreur chargement entreprise:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEcritures = async () => {
    if (!entreprise?.id) {
      return;
    }

    const exerciceActuel = exercice
      ? entreprise.exercices?.find((ex: any) => ex.id === Number(exercice))
      : entreprise.exercices?.sort((a: any, b: any) => b.annee - a.annee)[0];

    if (!exerciceActuel) {
      return;
    }

    try {
      const data = await ecrituresApi.getAll(entreprise.id, exerciceActuel.id);
      setEcritures(data);
      calculerSoldes(data);
    } catch (err) {
      console.error('[Dashboard] Erreur chargement écritures:', err);
    }
  };

  const calculerSoldes = (ecritures: Ecriture[]) => {
    let produits = 0;
    let charges = 0;
    let ventesMarchandises = 0;
    let coutAchat = 0;
    let productionVendue = 0;

    ecritures.forEach(ecriture => {
      ecriture.lignes.forEach(ligne => {
        const compte = ligne.numero_compte;
        const montant = Number(ligne.credit) - Number(ligne.debit);

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
    });

    const margeCommerciale = ventesMarchandises - coutAchat;
    const valeurAjoutee = produits - charges + margeCommerciale;
    const ebe = valeurAjoutee; // Simplifié
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
      // Exclure les champs en lecture seule
      const { id, exercices, date_creation, date_modification, ...dataToUpdate } = editedEntreprise;

      // Nettoyer les données : convertir les chaînes vides en null
      const cleanedData = Object.entries(dataToUpdate).reduce((acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
      }, {} as any);

      const updated = await entreprisesApi.update(entreprise.id, cleanedData);
      setEntreprise(updated);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      const errorMsg = err.response?.data?.message || 'Erreur lors de la sauvegarde';
      alert(Array.isArray(errorMsg) ? errorMsg.join('\n') : errorMsg);
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
      await exercicesApi.create({
        entreprise_id: entreprise.id,
        ...newExercice,
      });
      setShowExerciceModal(false);
      await loadEntreprise(); // Recharger l'entreprise avec les exercices
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!entreprise) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 m-8">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Entreprise introuvable</p>
          <button
            onClick={() => router.push('/liste')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  // Trouver l'exercice actuel : celui spécifié dans l'URL, ou le plus récent
  const exerciceActuel = exercice
    ? entreprise.exercices?.find((ex: any) => ex.id === Number(exercice))
    : entreprise.exercices?.sort((a: any, b: any) => b.annee - a.annee)[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <TopMenu />
      <div className="max-w-7xl mx-auto p-8">
        {/* Bouton retour */}
        <button
          onClick={() => router.push('/liste')}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Retour à la liste
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* En-tête avec infos entreprise */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-3xl font-bold text-gray-900">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedEntreprise.raison_sociale || ''}
                    onChange={(e) => handleChange('raison_sociale', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  entreprise.raison_sociale
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
                      {new Date(exerciceActuel.date_debut).toLocaleDateString('fr-FR')} → {new Date(exerciceActuel.date_fin).toLocaleDateString('fr-FR')}
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

          {/* Soldes intermédiaires de gestion */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Soldes Intermédiaires de Gestion (SIG)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Indicateur
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Montant (€)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">Ventes de marchandises</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">{soldes.ventesMarchandises.toFixed(2)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">- Coût d'achat des marchandises vendues</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">{soldes.coutAchat.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-blue-50 font-semibold">
                    <td className="px-6 py-4 text-sm text-blue-900">= Marge commerciale</td>
                    <td className="px-6 py-4 text-sm text-right text-blue-900 font-mono">{soldes.margeCommerciale.toFixed(2)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">Production vendue</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-mono">{soldes.productionVendue.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-green-50 font-semibold">
                    <td className="px-6 py-4 text-sm text-green-900">= Valeur ajoutée</td>
                    <td className="px-6 py-4 text-sm text-right text-green-900 font-mono">{soldes.valeurAjoutee.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-blue-50 font-semibold">
                    <td className="px-6 py-4 text-sm text-blue-900">= Excédent brut d'exploitation (EBE)</td>
                    <td className="px-6 py-4 text-sm text-right text-blue-900 font-mono">{soldes.ebe.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-green-50 font-bold">
                    <td className="px-6 py-4 text-sm text-green-900">= Résultat d'exploitation</td>
                    <td className="px-6 py-4 text-sm text-right text-green-900 font-mono">{soldes.resultatExploitation.toFixed(2)}</td>
                  </tr>
                  <tr className={`bg-gradient-to-r font-bold text-lg ${
                    soldes.resultatNet >= 0
                      ? 'from-green-100 to-green-50'
                      : 'from-red-100 to-red-50'
                  }`}>
                    <td className={`px-6 py-4 ${soldes.resultatNet >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      = Résultat net
                    </td>
                    <td className={`px-6 py-4 text-right font-mono ${soldes.resultatNet >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {soldes.resultatNet.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Boutons d'actions rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/saisie')}
              className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              ✏️ Nouvelle saisie
            </button>
            <button
              onClick={() => router.push('/ecritures')}
              className="p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
            >
              📋 Liste écritures
            </button>
            <button
              onClick={() => router.push('/balance')}
              className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
            >
              ⚖️ Balance
            </button>
            <button
              onClick={() => router.push('/grand-livre')}
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
                    value={newExercice.date_debut}
                    onChange={(e) => setNewExercice({ ...newExercice, date_debut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={newExercice.date_fin}
                    onChange={(e) => setNewExercice({ ...newExercice, date_fin: e.target.value })}
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
