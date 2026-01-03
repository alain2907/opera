/**
 * Service de stockage IndexedDB pour mode PWA (sans backend local)
 * Stocke les données comptables localement dans le navigateur
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Schéma de la base de données IndexedDB
interface ComptaDB extends DBSchema {
  entreprises: {
    key: number;
    value: {
      id: number;
      nom?: string; // Legacy field
      raison_sociale?: string;
      siret?: string;
      forme_juridique?: string;
      code_naf?: string;
      adresse?: string;
      codePostal?: string; // Legacy field
      code_postal?: string;
      ville?: string;
      telephone?: string;
      email?: string;
      capital_social?: number;
      numero_tva_intra?: string;
      regime_fiscal?: string;
      notes?: string;
      actif?: boolean;
      backgroundColor?: string; // Couleur de fond personnalisée
      createdAt: string;
      updatedAt: string;
    };
  };
  exercices: {
    key: number;
    value: {
      id: number;
      entrepriseId: number;
      annee: number;
      dateDebut: string;
      dateFin: string;
      cloture: boolean;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 'by-entreprise': number; 'by-annee': number };
  };
  ecritures: {
    key: number;
    value: {
      id: number;
      exerciceId: number;
      date: string;
      journal: string;
      pieceRef?: string;
      libelle: string;
      debit?: number;
      credit?: number;
      compteNumero: string;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 'by-exercice': number; 'by-date': string; 'by-compte': string };
  };
  comptes: {
    key: string;
    value: {
      numero: string;
      nom: string;
      type: string;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 'by-type': string };
  };
  journaux: {
    key: string;
    value: {
      code: string;
      libelle: string;
      type: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  bilan_mappings: {
    key: string;
    value: {
      code_poste: string;
      compte_debut?: string | null;
      compte_fin?: string | null;
      comptes_specifiques?: string | null;
      [key: string]: any;
    };
  };
}

const DB_NAME = 'ComptabiliteFrance';
const DB_VERSION = 5;

let dbInstance: IDBPDatabase<ComptaDB> | null = null;

/**
 * Réinitialise complètement la base de données
 * À appeler lors de la connexion utilisateur pour garantir une base vierge
 */
export async function resetDatabase(): Promise<void> {
  console.log('[IndexedDB] Réinitialisation base pour nouvelle session');
  closeDB();
  await indexedDB.deleteDatabase(DB_NAME);
  // Attendre que la suppression soit effective
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Initialise et retourne la base de données IndexedDB
 */
export async function getDB(): Promise<IDBPDatabase<ComptaDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  // AVANT d'ouvrir la DB v3, vérifier si une ancienne v1/v2 existe et la supprimer
  const databases = await indexedDB.databases();
  const existingDB = databases.find(db => db.name === DB_NAME);
  if (existingDB && existingDB.version && existingDB.version < DB_VERSION) {
    console.log(`[IndexedDB] Ancienne version ${existingDB.version} détectée, suppression complète`);
    await indexedDB.deleteDatabase(DB_NAME);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  dbInstance = await openDB<ComptaDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`[IndexedDB] Upgrade de v${oldVersion} vers v${newVersion}`);

      // Store Entreprises
      if (!db.objectStoreNames.contains('entreprises')) {
        const entrepriseStore = db.createObjectStore('entreprises', {
          keyPath: 'id',
          autoIncrement: true,
        });
        // Pas d'index by-nom, inutile et source de problèmes
      }

      // Store Exercices
      if (!db.objectStoreNames.contains('exercices')) {
        const exerciceStore = db.createObjectStore('exercices', {
          keyPath: 'id',
          autoIncrement: true,
        });
        exerciceStore.createIndex('by-entreprise', 'entrepriseId');
        exerciceStore.createIndex('by-annee', 'annee');
      }

      // Store Écritures
      if (!db.objectStoreNames.contains('ecritures')) {
        const ecritureStore = db.createObjectStore('ecritures', {
          keyPath: 'id',
          autoIncrement: true,
        });
        ecritureStore.createIndex('by-exercice', 'exerciceId');
        ecritureStore.createIndex('by-date', 'date');
        ecritureStore.createIndex('by-compte', 'compteNumero');
      }

      // Store Comptes
      if (!db.objectStoreNames.contains('comptes')) {
        const compteStore = db.createObjectStore('comptes', {
          keyPath: 'numero',
        });
        compteStore.createIndex('by-type', 'type');
      }

      // Store Journaux
      if (!db.objectStoreNames.contains('journaux')) {
        db.createObjectStore('journaux', {
          keyPath: 'code',
        });
      }

      // Store Bilan Mappings (v5)
      if (!db.objectStoreNames.contains('bilan_mappings')) {
        db.createObjectStore('bilan_mappings', {
          keyPath: 'code_poste',
        });
      }
    },
  });

  // Initialiser les journaux par défaut après l'ouverture
  await initJournauxDefautInternal(dbInstance);

  // Normaliser les données (supprimer les doublons snake_case)
  await normalizeDataInternal(dbInstance);

  return dbInstance;
}

/**
 * Ferme la connexion à la base de données
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Supprime complètement la base de données locale
 * Utile pour réinitialiser l'application
 */
export async function deleteDB(): Promise<void> {
  closeDB();
  await indexedDB.deleteDatabase(DB_NAME);
}

// ============= CRUD Entreprises =============

export async function getAllEntreprises() {
  const db = await getDB();
  return db.getAll('entreprises');
}

export async function getEntreprise(id: number) {
  const db = await getDB();
  return db.get('entreprises', id);
}

export async function createEntreprise(data: Omit<ComptaDB['entreprises']['value'], 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDB();
  const now = new Date().toISOString();

  const entrepriseData: any = {
    ...data,
    // Ne PAS définir id, il sera auto-incrémenté par IndexedDB
    createdAt: now,
    updatedAt: now,
  };

  const id = await db.add('entreprises', entrepriseData);
  return db.get('entreprises', id);
}

export async function updateEntreprise(id: number, data: Partial<ComptaDB['entreprises']['value']>) {
  const db = await getDB();
  const existing = await db.get('entreprises', id);
  if (!existing) throw new Error(`Entreprise ${id} not found`);

  const updated: any = {
    ...existing,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  };

  await db.put('entreprises', updated);
  return updated;
}

export async function deleteEntreprise(id: number) {
  const db = await getDB();
  await db.delete('entreprises', id);
}

// ============= CRUD Exercices =============

export async function getAllExercices() {
  const db = await getDB();
  const allExercices = await db.getAll('exercices');

  // Nettoyer automatiquement les exercices avec ID invalide (0 ou undefined)
  const invalidExercices = allExercices.filter((ex: any) => !ex.id || ex.id === 0);
  if (invalidExercices.length > 0) {
    console.warn(`[IndexedDB] Nettoyage de ${invalidExercices.length} exercice(s) invalide(s)`);
    for (const ex of invalidExercices) {
      try {
        await db.delete('exercices', ex.id);
      } catch (err) {
        console.error('[IndexedDB] Erreur lors de la suppression de l\'exercice invalide:', err);
      }
    }
  }

  // Retourner uniquement les exercices valides
  return allExercices.filter((ex: any) => ex.id && ex.id > 0);
}

export async function getExercicesByEntreprise(entrepriseId: number) {
  const db = await getDB();
  const allExercices = await db.getAll('exercices');

  // Filtrer manuellement pour supporter à la fois entrepriseId et entreprise_id
  return allExercices.filter((ex: any) => {
    const exEntrepriseId = ex.entrepriseId || ex.entreprise_id;
    return exEntrepriseId === entrepriseId && ex.id && ex.id > 0;
  });
}

export async function getExercice(id: number) {
  const db = await getDB();
  return db.get('exercices', id);
}

export async function createExercice(data: Omit<ComptaDB['exercices']['value'], 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDB();
  const now = new Date().toISOString();
  const id = await db.add('exercices', {
    ...data,
    // Ne PAS définir id, il sera auto-incrémenté par IndexedDB
    createdAt: now,
    updatedAt: now,
  });
  return db.get('exercices', id);
}

export async function updateExercice(id: number, data: Partial<ComptaDB['exercices']['value']>) {
  const db = await getDB();
  const existing = await db.get('exercices', id);
  if (!existing) throw new Error(`Exercice ${id} not found`);

  const updated = {
    ...existing,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  };
  await db.put('exercices', updated);
  return updated;
}

export async function deleteExercice(id: number) {
  const db = await getDB();
  await db.delete('exercices', id);
}

// ============= CRUD Écritures =============

export async function getAllEcritures() {
  const db = await getDB();
  return db.getAll('ecritures');
}

// Vider uniquement la table écritures (garde entreprises et exercices)
export async function clearEcritures() {
  const db = await getDB();
  await db.clear('ecritures');
  console.log('[IndexedDB] Table écritures vidée');
}

export async function getEcrituresByExercice(exerciceId: number) {
  const db = await getDB();
  return db.getAllFromIndex('ecritures', 'by-exercice', exerciceId);
}

export async function getEcriture(id: number) {
  const db = await getDB();
  return db.get('ecritures', id);
}

export async function createEcriture(data: Omit<ComptaDB['ecritures']['value'], 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDB();
  const now = new Date().toISOString();
  const id = await db.add('ecritures', {
    ...data,
    // Ne PAS définir id, il sera auto-incrémenté par IndexedDB
    createdAt: now,
    updatedAt: now,
  });
  return db.get('ecritures', id);
}

export async function updateEcriture(id: number, data: Partial<ComptaDB['ecritures']['value']>) {
  const db = await getDB();
  const existing = await db.get('ecritures', id);
  if (!existing) throw new Error(`Ecriture ${id} not found`);

  const updated = {
    ...existing,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  };
  await db.put('ecritures', updated);
  return updated;
}

export async function deleteEcriture(id: number) {
  const db = await getDB();
  await db.delete('ecritures', id);
}

// ============= CRUD Comptes =============

export async function getAllComptes() {
  const db = await getDB();
  return db.getAll('comptes');
}

export async function getCompte(numero: string) {
  const db = await getDB();
  return db.get('comptes', numero);
}

export async function createCompte(data: Omit<ComptaDB['comptes']['value'], 'createdAt' | 'updatedAt'>) {
  const db = await getDB();
  const now = new Date().toISOString();
  await db.add('comptes', {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return db.get('comptes', data.numero);
}

export async function updateCompte(numero: string, data: Partial<ComptaDB['comptes']['value']>) {
  const db = await getDB();
  const existing = await db.get('comptes', numero);
  if (!existing) throw new Error(`Compte ${numero} not found`);

  const updated = {
    ...existing,
    ...data,
    numero,
    updatedAt: new Date().toISOString(),
  };
  await db.put('comptes', updated);
  return updated;
}

export async function deleteCompte(numero: string) {
  const db = await getDB();
  await db.delete('comptes', numero);
}

// ============= CRUD Journaux =============

export async function getAllJournaux() {
  const db = await getDB();
  return db.getAll('journaux');
}

export async function getJournal(code: string) {
  const db = await getDB();
  return db.get('journaux', code);
}

export async function createJournal(data: Omit<ComptaDB['journaux']['value'], 'createdAt' | 'updatedAt'>) {
  const db = await getDB();
  const now = new Date().toISOString();

  const journalData: ComptaDB['journaux']['value'] = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await db.add('journaux', journalData);
  return journalData;
}

export async function updateJournal(code: string, data: Partial<ComptaDB['journaux']['value']>) {
  const db = await getDB();
  const existing = await db.get('journaux', code);
  if (!existing) throw new Error(`Journal ${code} not found`);

  const updated: ComptaDB['journaux']['value'] = {
    ...existing,
    ...data,
    code,
    updatedAt: new Date().toISOString(),
  };

  await db.put('journaux', updated);
  return updated;
}

export async function deleteJournal(code: string) {
  const db = await getDB();
  await db.delete('journaux', code);
}

// Initialiser les journaux par défaut (version interne)
async function initJournauxDefautInternal(db: IDBPDatabase<ComptaDB>) {
  const existingJournaux = await db.getAll('journaux');

  if (existingJournaux.length === 0) {
    const journauxDefaut = [
      { code: 'AC', libelle: 'Achats', type: 'achats' },
      { code: 'VE', libelle: 'Ventes', type: 'ventes' },
      { code: 'BQ', libelle: 'Banque', type: 'tresorerie' },
      { code: 'CA', libelle: 'Caisse', type: 'tresorerie' },
      { code: 'OD', libelle: 'Opérations Diverses', type: 'operations_diverses' },
    ];

    const now = new Date().toISOString();
    for (const journal of journauxDefaut) {
      await db.add('journaux', {
        ...journal,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log('[IndexedDB] 5 journaux par défaut créés');
  }
}

// Initialiser les journaux par défaut (version publique)
export async function initJournauxDefaut() {
  const db = await getDB();
  await initJournauxDefautInternal(db);
}

// ============= Migration / Nettoyage =============

/**
 * Normalise toutes les données (version interne - appelée au démarrage)
 */
async function normalizeDataInternal(db: IDBPDatabase<ComptaDB>) {
  // Normaliser exercices
  const allExercices = await db.getAll('exercices');
  let cleanedEx = 0;
  for (const exercice of allExercices) {
    const hasSnakeCase = 'entreprise_id' in exercice || 'date_debut' in exercice || 'date_fin' in exercice;

    if (hasSnakeCase) {
      // Créer version nettoyée avec uniquement camelCase
      const cleaned_exercice: any = {
        id: exercice.id,
        entrepriseId: exercice.entrepriseId || (exercice as any).entreprise_id,
        annee: exercice.annee,
        dateDebut: exercice.dateDebut || (exercice as any).date_debut,
        dateFin: exercice.dateFin || (exercice as any).date_fin,
        cloture: exercice.cloture,
        createdAt: exercice.createdAt,
        updatedAt: exercice.updatedAt,
      };

      await db.put('exercices', cleaned_exercice);
      cleanedEx++;
    }
  }
  if (cleanedEx > 0) {
    console.log(`[IndexedDB] ${cleanedEx} exercice(s) normalisé(s) en camelCase`);
  }

  // Normaliser écritures
  const allEcritures = await db.getAll('ecritures');
  let cleanedEcr = 0;
  for (const ecriture of allEcritures) {
    const hasSnakeCase = 'exercice_id' in ecriture || 'compte_numero' in ecriture;

    if (hasSnakeCase) {
      // Créer version nettoyée
      const cleaned_ecriture: any = {
        id: ecriture.id,
        exerciceId: ecriture.exerciceId || (ecriture as any).exercice_id,
        date: ecriture.date,
        journal: ecriture.journal,
        pieceRef: ecriture.pieceRef,
        libelle: ecriture.libelle,
        debit: ecriture.debit,
        credit: ecriture.credit,
        compteNumero: ecriture.compteNumero || (ecriture as any).compte_numero,
        createdAt: ecriture.createdAt,
        updatedAt: ecriture.updatedAt,
      };

      await db.put('ecritures', cleaned_ecriture);
      cleanedEcr++;
    }
  }
  if (cleanedEcr > 0) {
    console.log(`[IndexedDB] ${cleanedEcr} écriture(s) normalisée(s) en camelCase`);
  }
}

/**
 * Normalise les exercices pour utiliser uniquement camelCase (version publique)
 */
export async function normalizeExercices() {
  const db = await getDB();
  await normalizeDataInternal(db);
}

/**
 * Normalise les écritures pour utiliser uniquement camelCase (version publique)
 */
export async function normalizeEcritures() {
  const db = await getDB();
  await normalizeDataInternal(db);
}
