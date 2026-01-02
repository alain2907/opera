/**
 * Export FEC automatique avant fermeture de session
 */

import { getAllEntreprises, getAllExercices, getAllEcritures, getAllComptes } from './storageAdapter';

/**
 * Génère un fichier FEC (Fichier des Écritures Comptables) au format TSV personnalisé (22 colonnes)
 */
async function generateFECContent(): Promise<string> {
  const entreprises = await getAllEntreprises();
  const exercices = await getAllExercices();
  const ecritures = await getAllEcritures();
  const comptes = await getAllComptes();

  if (entreprises.length === 0 || ecritures.length === 0) {
    console.log('[Auto Export FEC] Aucune donnée à exporter');
    return '';
  }

  // En-tête FEC personnalisé (22 colonnes séparées par des tabulations)
  const header = [
    'JournalCode',
    'JournalLib',
    'EcritureNum',
    'EcritureDate',
    'CompteNum',
    'CompteLib',
    'CompAuxNum',
    'CompAuxLib',
    'PieceRef',
    'PieceDate',
    'EcritureLib',
    'Debit',
    'Credit',
    'EcritureLet',
    'DateLet',
    'ValidDate',
    'Montantdevise',
    'Idevise',
    'DateEcheance',
    'SectionCode',
    'SectionNom',
    'Reference'
  ].join('\t');

  // Lignes FEC
  const lines = ecritures.map((ecriture: any) => {
    const compte = comptes.find((c: any) => c.numero_compte === ecriture.compteNumero);
    const dateStr = ecriture.date.replace(/-/g, ''); // YYYYMMDD

    return [
      ecriture.journalCode || 'OD',
      ecriture.journalLibelle || 'Opérations Diverses',
      ecriture.numeroPiece || '',
      dateStr,
      ecriture.compteNumero,
      compte?.nom || compte?.libelle || '',
      '', // CompAuxNum
      '', // CompAuxLib
      ecriture.numeroPiece || '',
      dateStr,
      ecriture.libelle || '',
      (ecriture.debit || 0).toFixed(2).replace('.', ','),
      (ecriture.credit || 0).toFixed(2).replace('.', ','),
      '', // EcritureLet
      '', // DateLet
      dateStr, // ValidDate
      '', // Montantdevise
      '', // Idevise
      '', // DateEcheance
      '', // SectionCode
      '', // SectionNom
      ecriture.reference || '' // Reference
    ].join('\t');
  });

  return [header, ...lines].join('\n');
}

/**
 * Déclenche le téléchargement automatique d'un fichier (dans Downloads)
 */
async function downloadFEC(content: string, filename: string) {
  if (!content) return;

  // Téléchargement automatique dans le dossier Downloads
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`[Auto Export] Fichier téléchargé: ${filename}`);
}

/**
 * Génère un backup complet JSON de toute la base IndexedDB
 */
async function generateDatabaseBackup(): Promise<string> {
  const entreprises = await getAllEntreprises();
  const exercices = await getAllExercices();
  const ecritures = await getAllEcritures();
  const comptes = await getAllComptes();

  const backup = {
    version: 3,
    exportDate: new Date().toISOString(),
    data: {
      entreprises,
      exercices,
      ecritures,
      comptes
    }
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Export automatique FEC lors de la déconnexion
 */
export async function autoExportFECOnLogout(): Promise<boolean> {
  try {
    console.log('[Auto Export FEC] Début export automatique');

    const content = await generateFECContent();

    if (!content) {
      console.log('[Auto Export FEC] Aucune donnée à sauvegarder');
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup-fec-${timestamp}.txt`;

    await downloadFEC(content, filename);

    console.log('[Auto Export FEC] Export réussi:', filename);
    return true;
  } catch (error) {
    console.error('[Auto Export FEC] Erreur:', error);
    return false;
  }
}

/**
 * Export automatique de la base complète lors de la déconnexion
 */
export async function autoExportDatabaseOnLogout(): Promise<boolean> {
  try {
    console.log('[Auto Export DB] Début export base complète');

    const content = await generateDatabaseBackup();

    if (!content || content === '{"version":3,"exportDate":"","data":{"entreprises":[],"exercices":[],"ecritures":[],"comptes":[]}}') {
      console.log('[Auto Export DB] Aucune donnée à sauvegarder');
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup-db-${timestamp}.json`;

    await downloadFEC(content, filename);

    console.log('[Auto Export DB] Export réussi:', filename);
    return true;
  } catch (error) {
    console.error('[Auto Export DB] Erreur:', error);
    return false;
  }
}

/**
 * Initialise l'export automatique sur événements de fermeture
 */
export function initAutoExportFEC() {
  // Export avant fermeture de la page/onglet
  window.addEventListener('beforeunload', (event) => {
    // Note: beforeunload ne peut pas faire d'appels async
    // On utilise sendBeacon ou on stocke une demande d'export
    const shouldExport = localStorage.getItem('firebase_user');
    if (shouldExport) {
      // Marquer pour export au prochain chargement si pas fait
      localStorage.setItem('pending_fec_export', 'true');
    }
  });

  // Vérifier si export en attente au chargement
  if (typeof window !== 'undefined') {
    const pendingExport = localStorage.getItem('pending_fec_export');
    if (pendingExport === 'true') {
      localStorage.removeItem('pending_fec_export');
      // Exporter après un court délai pour laisser l'app charger
      setTimeout(() => {
        autoExportFECOnLogout();
      }, 2000);
    }
  }
}

/**
 * Export manuel déclenché par bouton déconnexion
 */
export async function exportBeforeLogout(): Promise<void> {
  // Export FEC
  const exportedFEC = await autoExportFECOnLogout();

  // Export base complète JSON
  const exportedDB = await autoExportDatabaseOnLogout();

  if (exportedFEC || exportedDB) {
    // Petit délai pour laisser les téléchargements se terminer
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
