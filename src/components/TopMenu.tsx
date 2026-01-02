import { useState } from 'react';
import { useRouter } from 'next/router';
import { useEntreprise } from '../contexts/EntrepriseContext';
import { useWindows } from '../contexts/WindowContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import BalanceWindow from './windows/BalanceWindow';
import GrandLivreWindow from './windows/GrandLivreWindow';

interface MenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
}

interface TopMenuSection {
  label: string;
  items: MenuItem[];
}

export default function TopMenu() {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { entreprise, exercice, exercices, setExerciceId } = useEntreprise();
  const { openWindow } = useWindows();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login-firebase');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const topMenus: TopMenuSection[] = [
    {
      label: 'Fichier',
      items: [
        { label: 'Créer une entreprise…', action: () => router.push('/entreprises') },
        { label: 'Modifier l\'entreprise…', action: () => router.push('/entreprises') },
        { label: 'Supprimer une entreprise…', action: () => router.push('/entreprises') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Créer un dossier de comptabilité…', action: () => alert('Création de dossier à venir') },
        { label: 'Ouvrir la comptabilité d\'une entreprise…', action: () => router.push('/liste') },
        { label: 'Fermer la comptabilité en cours', action: () => router.push('/') },
        { label: 'Vérifier la comptabilité en cours…', action: () => alert('Vérification à venir') },
        { label: 'Supprimer un dossier de comptabilité…', action: () => alert('Suppression de dossier à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Importer…', action: () => router.push('/import') },
        { label: 'Exporter…', action: () => alert('Export à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Ouvrir le dossier des exports…', action: async () => {
          try {
            const res = await fetch('http://localhost:3001/api/export/open-folder');
            if (res.ok) {
              const data = await res.json();
              alert(`Dossier ouvert : ${data.directory}`);
            }
          } catch (e) {
            alert('Impossible d\'ouvrir le dossier exports');
          }
        }},
        { label: 'Liste des exports…', action: () => router.push('/exports') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Ouvrir le dossier des scripts…', action: async () => {
          try {
            const res = await fetch('http://localhost:3001/api/scripts/open-folder');
            if (res.ok) {
              const data = await res.json();
              alert(`Dossier ouvert : ${data.directory}`);
            }
          } catch (e) {
            alert('Impossible d\'ouvrir le dossier scripts');
          }
        }},
        { label: 'Ouvrir le dossier des imports (uploads)…', action: async () => {
          try {
            const res = await fetch('http://localhost:3001/api/uploads/open-folder');
            if (res.ok) {
              const data = await res.json();
              alert(`Dossier ouvert : ${data.directory}`);
            }
          } catch (e) {
            alert('Impossible d\'ouvrir le dossier uploads');
          }
        }},
        { label: 'Analyse CSV…', action: () => router.push('/analyse-csv') },
        { label: 'Génération écritures fournisseurs CSV…', action: () => router.push('/generation-ecritures-csv') },
        { label: 'Génération écritures clients CSV…', action: () => router.push('/generation-ecritures-clients-csv') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Génération factures automatique…', action: () => router.push('/generation-factures-auto') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Sauvegarde & Restauration…', action: () => router.push('/backup') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Gérer les relevés bancaires…', action: () => alert('Gestion des relevés à venir') },
        { label: 'Intégrer les relevés bancaires…', action: () => alert('Intégration des relevés à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Liste des entreprises…', action: () => router.push('/liste') },
        { label: 'Liste des institutions…', action: () => alert('Liste des institutions à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Format d\'impression…', action: () => alert('Format d\'impression à venir') },
        { label: 'Imprimer…', action: () => window.print() },
      ]
    },
    {
      label: 'Édition',
      items: [
        { label: 'Saisie rapide', action: () => router.push('/saisie') },
        { label: 'Nouvelle écriture', action: () => router.push('/saisie') },
        { label: 'Modifier écriture', action: () => router.push('/ecritures') },
      ]
    },
    {
      label: 'Paramétrage',
      items: [
        { label: 'Entreprises', action: () => router.push('/entreprises') },
        { label: 'Plan comptable', action: () => router.push('/plan-comptable') },
        { label: 'Journaux', action: () => router.push('/journaux-list') },
        { label: 'Associations libellés-comptes', action: () => router.push('/libelle-compte-maps') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Fusion de comptes…', action: () => router.push('/fusion-comptes') },
        { label: '—', action: () => {}, separator: true },
        { label: 'TVA Collectée', action: () => router.push('/tva-collectee') },
        { label: 'TVA Déductible', action: () => router.push('/tva-deductible') },
      ]
    },
    {
      label: 'Écritures',
      items: [
        { label: 'Saisie au kilomètre', action: () => router.push('/saisie') },
        { label: 'Liste des écritures', action: () => router.push('/ecritures') },
        { label: 'Rechercher', action: () => router.push('/ecritures') },
      ]
    },
    {
      label: 'Comptes',
      items: [
        { label: 'Plan comptable…', action: () => router.push('/plan-comptable') },
        { label: 'Balance…', action: () => router.push('/balance') },
        { label: 'Bilan…', action: () => router.push('/bilan') },
        { label: 'Résultat…', action: () => router.push('/resultat') },
        { label: 'Compte de Résultat (CERFA 2052-2053)…', action: () => router.push('/compte-resultat-cerfa') },
        { label: 'Comparatif de balances…', action: () => alert('Comparatif de balances à venir') },
        { label: 'Comparatif de résultats…', action: () => alert('Comparatif de résultats à venir') },
        { label: 'Lettrage automatique…', action: () => alert('Lettrage automatique à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Balances fournisseurs…', action: () => router.push('/balances-fournisseurs') },
      ]
    },
    {
      label: 'États',
      items: [
        { label: 'Premier mois', action: () => router.push('/premier-mois') },
        { label: 'Première écriture', action: () => router.push('/premiere-ecriture') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Balance progressive', action: () => router.push('/balance-progressive') },
        { label: 'Balance âgée', action: () => alert('Balance âgée à venir') },
        { label: 'Comparatif de balances', action: () => alert('Comparatif de balances à venir') },
        { label: 'Comparatif de résultats', action: () => alert('Comparatif de résultats à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Édition des journaux', action: () => router.push('/journaux-edition') },
        { label: 'Journal centralisateur', action: () => alert('Journal centralisateur à venir') },
        { label: 'Grand livre', action: () => openWindow(`Grand Livre #${Date.now()}`, <GrandLivreWindow key={Date.now()} />, 1100, 700) },
        { label: '—', action: () => {}, separator: true },
        { label: 'Bilan et compte de résultat', action: () => router.push('/bilan') },
        { label: 'Compte de Résultat (CERFA 2052-2053)', action: () => router.push('/compte-resultat-cerfa') },
        { label: 'Règles d\'affectation des comptes', action: () => alert('Règles d\'affectation à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Déclaration de TVA…', action: () => router.push('/declaration-tva') },
        { label: 'Déclaration de TVA UE', action: () => alert('Déclaration de TVA UE à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Résultat analytique', action: () => alert('Résultat analytique à venir') },
        { label: 'Grand livre analytique', action: () => alert('Grand livre analytique à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'État de rapprochement bancaire', action: () => alert('État de rapprochement bancaire à venir') },
        { label: 'Notes associées aux comptes', action: () => alert('Notes associées aux comptes à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'Calcul et liquidation de l\'IS 2024 et au-delà', action: () => alert('Calcul et liquidation de l\'IS à venir') },
        { label: 'Dotation aux provisions pour congés', action: () => alert('Dotation aux provisions pour congés à venir') },
        { label: 'Soldes Intermédiaires de Gestion', action: () => alert('Soldes Intermédiaires de Gestion à venir') },
        { label: '—', action: () => {}, separator: true },
        { label: 'États personnalisés…', action: () => alert('États personnalisés à venir') },
        { label: 'Impression rapide…', action: () => window.print() },
      ]
    },
    {
      label: 'Modèles',
      items: [
        { label: 'Écritures types', action: () => alert('Modèles à venir') },
        { label: 'Abonnements', action: () => alert('Abonnements à venir') },
      ]
    },
    {
      label: 'Modules',
      items: [
        { label: 'Balance Comptable', action: () => router.push('/balance-comptable') },
        { label: 'Balance Progressive Comptable', action: () => router.push('/balance-progressive-comptable') },
        { label: 'Bilan Actif', action: () => router.push('/bilan-actif') },
        { label: 'Bilan Passif', action: () => router.push('/bilan-passif') },
        { label: 'Compte de Résultat (CERFA)', action: () => router.push('/compte-resultat-cerfa') },
        { label: 'Grand Livre Comptable', action: () => router.push('/grand-livre-comptable') },
      ]
    },
    {
      label: 'Fenêtre',
      items: [
        { label: 'Réorganiser', action: () => {} },
      ]
    },
    {
      label: 'Aide',
      items: [
        { label: 'Documentation', action: () => window.open('https://github.com/alain2907/comptabilite-france', '_blank') },
        { label: 'À propos', action: () => alert('Comptabilité France v1.0\nGestion comptable française') },
      ]
    },
  ];

  // Ne pas afficher le menu si aucune entreprise n'est sélectionnée
  if (!entreprise) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="flex items-center px-4">
        {topMenus.map((menu) => (
          <div
            key={menu.label}
            className="relative"
            onMouseEnter={() => setOpenMenu(menu.label)}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              className={`px-4 py-3 text-sm font-medium hover:bg-blue-500 transition-colors ${
                openMenu === menu.label ? 'bg-blue-500' : ''
              }`}
            >
              {menu.label}
            </button>

            {openMenu === menu.label && (
              <div className="absolute left-0 top-full bg-white text-gray-800 shadow-xl rounded-b-lg min-w-[250px] py-2 z-50">
                {menu.items.map((item, idx) => (
                  item.separator ? (
                    <div key={idx} className="border-t border-gray-200 my-1" />
                  ) : (
                    <button
                      key={idx}
                      onClick={() => {
                        item.action();
                        setOpenMenu(null);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm transition-colors"
                    >
                      {item.label}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="ml-auto flex items-center gap-4">
          <div className="text-sm opacity-90">
            <span className="font-semibold">{entreprise.raison_sociale}</span>
            {exercice && exercices.length > 0 && (
              <span className="ml-3 inline-flex items-center gap-2">
                Exercice
                <select
                  value={exercice.id}
                  onChange={(e) => setExerciceId(parseInt(e.target.value))}
                  className="bg-blue-500 text-white px-2 py-1 rounded border border-blue-400 hover:bg-blue-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {exercices.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {new Date(ex.date_debut).getFullYear()}
                    </option>
                  ))}
                </select>
              </span>
            )}
          </div>
          <button
            onClick={() => router.push('/selection-entreprise')}
            className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-400 rounded transition-colors"
          >
            Changer
          </button>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1 bg-red-500 hover:bg-red-400 rounded transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
