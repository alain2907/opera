/**
 * API Client - Redirection vers le système dual
 *
 * Ce fichier est conservé pour compatibilité.
 * Par défaut, toutes les requêtes vont vers le backend LOCAL (SQLite).
 *
 * Pour utiliser le backend cloud (Railway), importez depuis dualApiClient :
 * import { cloudApiGet, cloudApiPost, ... } from '@/lib/dualApiClient';
 */

export {
  apiCall,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  localApiCall,
  localApiGet,
  localApiPost,
  localApiPut,
  localApiPatch,
  localApiDelete,
  cloudApiCall,
  cloudApiGet,
  cloudApiPost,
  cloudApiPut,
  cloudApiPatch,
  cloudApiDelete,
} from './dualApiClient';
