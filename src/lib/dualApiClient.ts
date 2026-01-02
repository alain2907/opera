import { auth } from './firebase';
import { detectBackendMode, type BackendMode } from './backendDetection';

// URLs des backends
const isDev = process.env.NODE_ENV !== 'production';
const LOCAL_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const CLOUD_API_URL = process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://violent-karon-gestion3008-free-e7089456.koyeb.app/api';

// Mode de fonctionnement : 'local', 'cloud' ou 'auto'
// - 'local': accès direct au backend SQLite (localhost:3001)
// - 'cloud': accès direct à Koyeb (sans proxy WebSocket)
// - 'auto': détection automatique (défaut)
const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'auto';

// Debug: décommenter pour diagnostiquer les problèmes de configuration
// if (typeof window !== 'undefined') {
//   console.log('[DualApiClient] Configuration:', {
//     NODE_ENV: process.env.NODE_ENV,
//     isDev,
//     API_MODE,
//     NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE,
//     NEXT_PUBLIC_CLOUD_API_URL: process.env.NEXT_PUBLIC_CLOUD_API_URL,
//     LOCAL_API_URL,
//     CLOUD_API_URL
//   });
// }

/**
 * Détermine le mode backend à utiliser
 */
async function getBackendMode(): Promise<BackendMode> {
  if (API_MODE === 'auto') {
    return await detectBackendMode();
  }
  return API_MODE as BackendMode;
}

/**
 * Client API dual pour gérer les deux backends :
 * - Backend local (SQLite) : données comptables
 * - Backend cloud (Koyeb) : authentification/licences
 */

/**
 * Wrapper pour appeler le backend (LOCAL ou CLOUD selon détection automatique)
 */
export async function localApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = auth?.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Déterminer le mode backend
  const mode = await getBackendMode();

  // En mode cloud, on passe directement par Koyeb
  if (mode === 'cloud') {
    if (!user?.uid) {
      throw new Error('User must be authenticated to use cloud mode');
    }

    // Appeler Koyeb directement (pas de proxy WebSocket)
    const url = endpoint.startsWith('http') ? endpoint : `${CLOUD_API_URL}${endpoint}`;

    return fetch(url, {
      ...options,
      headers,
    });
  }

  // En mode local, accès direct au backend local
  const url = endpoint.startsWith('http') ? endpoint : `${LOCAL_API_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Wrapper pour appeler le backend CLOUD (Koyeb)
 */
export async function cloudApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = auth?.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${CLOUD_API_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

// ============= HELPERS BACKEND LOCAL (SQLite) =============

export async function localApiGet<T>(endpoint: string): Promise<T> {
  const response = await localApiCall(endpoint, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function localApiPost<T>(endpoint: string, data: any): Promise<T> {
  const response = await localApiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function localApiPut<T>(endpoint: string, data: any): Promise<T> {
  const response = await localApiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function localApiPatch<T>(endpoint: string, data: any): Promise<T> {
  const response = await localApiCall(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function localApiDelete<T>(endpoint: string): Promise<T> {
  const response = await localApiCall(endpoint, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// ============= HELPERS BACKEND CLOUD (Koyeb) =============

export async function cloudApiGet<T>(endpoint: string): Promise<T> {
  const response = await cloudApiCall(endpoint, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function cloudApiPost<T>(endpoint: string, data: any): Promise<T> {
  const response = await cloudApiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function cloudApiPut<T>(endpoint: string, data: any): Promise<T> {
  const response = await cloudApiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function cloudApiPatch<T>(endpoint: string, data: any): Promise<T> {
  const response = await cloudApiCall(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function cloudApiDelete<T>(endpoint: string): Promise<T> {
  const response = await cloudApiCall(endpoint, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// ============= COMPATIBILITÉ ANCIENNE API =============
// Par défaut, apiCall pointe vers le backend LOCAL (SQLite)
export const apiCall = localApiCall;
export const apiGet = localApiGet;
export const apiPost = localApiPost;
export const apiPut = localApiPut;
export const apiDelete = localApiDelete;
