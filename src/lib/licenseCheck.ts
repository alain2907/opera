/**
 * Vérification de licence via Koyeb
 */

const CLOUD_API_URL = process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://violent-karon-gestion3008-free-e7089456.koyeb.app/api';

export interface LicenseCheckResult {
  valid: boolean;
  status: 'active' | 'trial' | 'suspended' | 'expired' | 'not_found';
  expiration_date?: string;
  max_entreprises?: number;
  message: string;
}

/**
 * Vérifie la validité de la licence pour un utilisateur Firebase
 */
export async function checkLicense(firebaseUid: string): Promise<LicenseCheckResult> {
  try {
    const response = await fetch(`${CLOUD_API_URL}/licenses/check/${firebaseUid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('[License Check] API non disponible (TypeORM désactivé sur Koyeb) - Mode trial activé');

    // En cas d'erreur réseau ou API désactivée, on permet l'accès en mode trial
    return {
      valid: true, // Mode trial
      status: 'trial',
      message: 'Mode trial - Base de données non activée sur le backend',
    };
  }
}

/**
 * Stocke le résultat de la vérification dans localStorage
 * pour éviter de re-vérifier à chaque rechargement de page
 */
export function cacheLicenseResult(firebaseUid: string, result: LicenseCheckResult): void {
  const cacheData = {
    firebaseUid,
    result,
    timestamp: Date.now(),
  };

  localStorage.setItem('license_check', JSON.stringify(cacheData));
}

/**
 * Récupère le résultat de licence depuis le cache
 * Retourne null si le cache est expiré (>24h) ou invalide
 */
export function getCachedLicenseResult(firebaseUid: string): LicenseCheckResult | null {
  try {
    const cached = localStorage.getItem('license_check');
    if (!cached) return null;

    const data = JSON.parse(cached);

    // Vérifier que c'est le bon utilisateur
    if (data.firebaseUid !== firebaseUid) return null;

    // Vérifier l'expiration du cache (24 heures)
    const expirationTime = 24 * 60 * 60 * 1000; // 24h en ms
    if (Date.now() - data.timestamp > expirationTime) return null;

    return data.result;
  } catch (error) {
    console.error('[License Check] Erreur lecture cache:', error);
    return null;
  }
}

/**
 * Vérifie la licence avec cache
 */
export async function checkLicenseWithCache(firebaseUid: string): Promise<LicenseCheckResult> {
  // Essayer le cache d'abord
  const cached = getCachedLicenseResult(firebaseUid);
  if (cached) {
    console.log('[License Check] Utilisation du cache');
    return cached;
  }

  // Sinon, vérifier avec l'API
  const result = await checkLicense(firebaseUid);

  // Mettre en cache
  cacheLicenseResult(firebaseUid, result);

  return result;
}
