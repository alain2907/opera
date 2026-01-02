/**
 * Adaptateur de stockage qui bascule automatiquement entre :
 * - Backend local (SQLite) via API
 * - IndexedDB (navigateur) en mode PWA
 */

import { detectBackendMode, getCurrentBackendMode } from './backendDetection';
import * as indexedDB from './indexedDB';
import { localApiGet, localApiPost, localApiPut, localApiPatch, localApiDelete } from './dualApiClient';

// ============= ENTREPRISES =============

export async function getAllEntreprises() {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any[]>('/entreprises');
  } else {
    return indexedDB.getAllEntreprises();
  }
}

export async function getEntreprise(id: number) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any>(`/entreprises/${id}`);
  } else {
    return indexedDB.getEntreprise(id);
  }
}

export async function createEntreprise(data: any) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiPost<any>('/entreprises', data);
  } else {
    return indexedDB.createEntreprise(data);
  }
}

export async function updateEntreprise(id: number, data: any) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiPut<any>(`/entreprises/${id}`, data);
  } else {
    return indexedDB.updateEntreprise(id, data);
  }
}

export async function deleteEntreprise(id: number) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiDelete<any>(`/entreprises/${id}`);
  } else {
    return indexedDB.deleteEntreprise(id);
  }
}

// ============= EXERCICES =============

export async function getAllExercices() {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any[]>('/exercices');
  } else {
    return indexedDB.getAllExercices();
  }
}

export async function getExercicesByEntreprise(entrepriseId: number) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any[]>(`/exercices?entrepriseId=${entrepriseId}`);
  } else {
    return indexedDB.getExercicesByEntreprise(entrepriseId);
  }
}

export async function getExercice(id: number) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any>(`/exercices/${id}`);
  } else {
    return indexedDB.getExercice(id);
  }
}

export async function createExercice(data: any) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiPost<any>('/exercices', data);
  } else {
    return indexedDB.createExercice(data);
  }
}

export async function updateExercice(id: number, data: any) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiPatch<any>(`/exercices/${id}`, data);
  } else {
    return indexedDB.updateExercice(id, data);
  }
}

export async function deleteExercice(id: number) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiDelete<any>(`/exercices/${id}`);
  } else {
    return indexedDB.deleteExercice(id);
  }
}

// ============= ÉCRITURES =============

export async function getAllEcritures() {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any[]>('/ecritures');
  } else {
    return indexedDB.getAllEcritures();
  }
}

export async function getEcrituresByExercice(exerciceId: number) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any[]>(`/ecritures?exerciceId=${exerciceId}`);
  } else {
    return indexedDB.getEcrituresByExercice(exerciceId);
  }
}

export async function getEcriture(id: number) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any>(`/ecritures/${id}`);
  } else {
    return indexedDB.getEcriture(id);
  }
}

export async function createEcriture(data: any) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiPost<any>('/ecritures', data);
  } else {
    return indexedDB.createEcriture(data);
  }
}

export async function updateEcriture(id: number, data: any) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiPatch<any>(`/ecritures/${id}`, data);
  } else {
    return indexedDB.updateEcriture(id, data);
  }
}

export async function deleteEcriture(id: number) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiDelete<any>(`/ecritures/${id}`);
  } else {
    return indexedDB.deleteEcriture(id);
  }
}

export async function clearEcritures() {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    throw new Error('clearEcritures uniquement disponible en mode PWA');
  } else {
    return indexedDB.clearEcritures();
  }
}

// ============= COMPTES =============

export async function getAllComptes() {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any[]>('/comptes');
  } else {
    return indexedDB.getAllComptes();
  }
}

export async function getCompte(numero: string) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiGet<any>(`/comptes/${numero}`);
  } else {
    return indexedDB.getCompte(numero);
  }
}

export async function createCompte(data: any) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiPost<any>('/comptes', data);
  } else {
    return indexedDB.createCompte(data);
  }
}

export async function updateCompte(numero: string, data: any) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiPatch<any>(`/comptes/${numero}`, data);
  } else {
    return indexedDB.updateCompte(numero, data);
  }
}

export async function deleteCompte(numero: string) {
  const mode = await detectBackendMode();

  if (mode === 'local') {
    return localApiDelete<any>(`/comptes/${numero}`);
  } else {
    return indexedDB.deleteCompte(numero);
  }
}

/**
 * Retourne le mode de stockage actuellement utilisé
 */
export function getStorageMode(): 'local' | 'cloud' | null {
  return getCurrentBackendMode();
}

/**
 * Exporte toutes les données IndexedDB au format JSON
 * Utile pour backup ou migration
 */
export async function exportAllData() {
  const mode = getCurrentBackendMode();

  if (mode !== 'cloud') {
    throw new Error('Export disponible uniquement en mode cloud (IndexedDB)');
  }

  const entreprises = await indexedDB.getAllEntreprises();
  const exercices = await indexedDB.getAllExercices();
  const ecritures = await indexedDB.getAllEcritures();
  const comptes = await indexedDB.getAllComptes();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      entreprises,
      exercices,
      ecritures,
      comptes,
    },
  };
}

/**
 * Importe des données au format JSON dans IndexedDB
 */
export async function importAllData(jsonData: any) {
  const mode = getCurrentBackendMode();

  if (mode !== 'cloud') {
    throw new Error('Import disponible uniquement en mode cloud (IndexedDB)');
  }

  const { data } = jsonData;

  // Importer les données dans l'ordre des dépendances
  if (data.entreprises) {
    for (const entreprise of data.entreprises) {
      await indexedDB.createEntreprise(entreprise);
    }
  }

  if (data.exercices) {
    for (const exercice of data.exercices) {
      await indexedDB.createExercice(exercice);
    }
  }

  if (data.comptes) {
    for (const compte of data.comptes) {
      await indexedDB.createCompte(compte);
    }
  }

  if (data.ecritures) {
    for (const ecriture of data.ecritures) {
      await indexedDB.createEcriture(ecriture);
    }
  }

  return {
    imported: {
      entreprises: data.entreprises?.length || 0,
      exercices: data.exercices?.length || 0,
      comptes: data.comptes?.length || 0,
      ecritures: data.ecritures?.length || 0,
    },
  };
}
