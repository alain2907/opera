import { localApiGet, localApiPost, localApiPatch, localApiDelete } from '../lib/dualApiClient';

export interface Compte {
  id?: number;
  entreprise_id: number;
  numero_compte: string;
  libelle: string;
  taux_tva?: number;
  compte_charge?: string | null;
  compte_tva?: string | null;
}

export const comptesApi = {
  async getAll(entrepriseId: number, exerciceId?: number): Promise<Compte[]> {
    const params = new URLSearchParams({ entreprise_id: entrepriseId.toString() });
    if (exerciceId) {
      params.append('exercice_id', exerciceId.toString());
    }
    return localApiGet<Compte[]>(`/comptes?${params}`);
  },

  async findByEntreprise(entrepriseId: number): Promise<Compte[]> {
    return localApiGet<Compte[]>(`/comptes?entreprise_id=${entrepriseId}`);
  },

  async search(entrepriseId: number, query: string): Promise<Compte[]> {
    return localApiGet<Compte[]>(`/comptes/search?entreprise_id=${entrepriseId}&q=${query}`);
  },

  async create(compte: Omit<Compte, 'id'>): Promise<Compte> {
    return localApiPost<Compte>('/comptes', compte);
  },

  async update(id: number, data: { libelle?: string; taux_tva?: number | null; compte_charge?: string | null; compte_tva?: string | null }): Promise<Compte> {
    return localApiPatch<Compte>(`/comptes/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return localApiDelete<void>(`/comptes/${id}`);
  },

  async fusionner(entrepriseId: number, comptesSource: string[], compteDestination: string): Promise<{ nb_lignes_transferees: number; nb_comptes_supprimes: number }> {
    return localApiPost<{ nb_lignes_transferees: number; nb_comptes_supprimes: number }>('/comptes/fusionner', {
      entreprise_id: entrepriseId,
      comptes_source: comptesSource,
      compte_destination: compteDestination,
    });
  },
};
