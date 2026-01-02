/**
 * Détection automatique du backend disponible
 * - Teste si backend local (localhost:3001) répond
 * - Si oui : mode 'local'
 * - Si non : mode 'cloud' (Koyeb direct, sans proxy)
 */

const LOCAL_BACKEND_URL = 'http://localhost:3001/api';
const DETECTION_TIMEOUT = 2000; // 2 secondes max pour détecter le backend local

export type BackendMode = 'local' | 'cloud';

let cachedMode: BackendMode | null = null;
let detectionPromise: Promise<BackendMode> | null = null;

/**
 * Teste si le backend local est accessible
 */
async function isLocalBackendAvailable(): Promise<boolean> {
  // Pages PWA : toujours mode cloud (IndexedDB uniquement)
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pwa')) {
    console.log('[Backend Detection] Page PWA, mode cloud forcé (IndexedDB)');
    return false;
  }

  // Si on n'est pas en localhost, pas de backend local possible
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    console.log('[Backend Detection] Pas en localhost, mode cloud forcé');
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DETECTION_TIMEOUT);

    const response = await fetch(LOCAL_BACKEND_URL, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
    });

    clearTimeout(timeoutId);

    // Vérifier que la réponse est bien du backend (pas une erreur CORS ou 404)
    if (response.ok) {
      const text = await response.text();
      // Le backend local répond "Hello World" ou similaire
      return text.length > 0;
    }

    return false;
  } catch (error: any) {
    // Backend local non disponible (timeout, connexion refusée, CORS, etc.)
    console.log('[Backend Detection] Erreur détection backend local:', error.message);
    return false;
  }
}

/**
 * Détecte le mode backend à utiliser
 * Résultat mis en cache pour éviter les détections répétées
 */
export async function detectBackendMode(): Promise<BackendMode> {
  // Si déjà détecté, retourner le résultat en cache
  if (cachedMode) {
    return cachedMode;
  }

  // Si détection en cours, attendre le résultat
  if (detectionPromise) {
    return detectionPromise;
  }

  // Lancer la détection
  detectionPromise = (async () => {
    const isLocalAvailable = await isLocalBackendAvailable();
    cachedMode = isLocalAvailable ? 'local' : 'cloud';

    console.log(`[Backend Detection] Mode détecté: ${cachedMode}`);

    return cachedMode;
  })();

  return detectionPromise;
}

/**
 * Force la re-détection du backend
 * Utile après un changement d'état (installation, démarrage du backend local, etc.)
 */
export function resetBackendDetection(): void {
  cachedMode = null;
  detectionPromise = null;
  console.log('[Backend Detection] Cache réinitialisé');
}

/**
 * Retourne le mode actuellement détecté (sans re-détecter)
 * Retourne null si pas encore détecté
 */
export function getCurrentBackendMode(): BackendMode | null {
  // Pages PWA : toujours forcer mode cloud, même si cachedMode est 'local'
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pwa')) {
    return 'cloud';
  }
  return cachedMode;
}
