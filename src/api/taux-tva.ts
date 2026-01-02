import { localApiGet, localApiPost, localApiPatch, localApiDelete } from '../lib/dualApiClient';

export interface TauxTVA {
  id?: number;
  entreprise_id: number;
  libelle: string;
  taux: number;
  type: 'collectee' | 'deductible';
  actif?: boolean;
}

export const tauxTvaApi = {
  async getAll(entrepriseId: number): Promise<TauxTVA[]> {
    return localApiGet<TauxTVA[]>(`/taux-tva?entreprise_id=${entrepriseId}`);
  },

  async getOne(id: number): Promise<TauxTVA> {
    return localApiGet<TauxTVA>(`/taux-tva/${id}`);
  },

  async create(taux: Omit<TauxTVA, 'id'>): Promise<TauxTVA> {
    return localApiPost<TauxTVA>('/taux-tva', taux);
  },

  async update(id: number, data: Partial<TauxTVA>): Promise<TauxTVA> {
    return localApiPatch<TauxTVA>(`/taux-tva/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return localApiDelete<void>(`/taux-tva/${id}`);
  },
};
