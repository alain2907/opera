import { localApiGet, localApiPost, localApiPatch, localApiDelete } from '../lib/dualApiClient';

export interface Journal {
  id?: number;
  entreprise_id: number;
  code: string;
  libelle: string;
  actif: boolean;
  date_creation: string;
}

export const journauxApi = {
  async findByEntreprise(entrepriseId: number): Promise<Journal[]> {
    return localApiGet<Journal[]>(`/journaux?entreprise_id=${entrepriseId}`);
  },

  async getById(id: number): Promise<Journal> {
    return localApiGet<Journal>(`/journaux/${id}`);
  },

  async create(journal: Omit<Journal, 'id' | 'date_creation'>): Promise<Journal> {
    return localApiPost<Journal>('/journaux', journal);
  },

  async update(id: number, journal: Partial<Journal>): Promise<Journal> {
    return localApiPatch<Journal>(`/journaux/${id}`, journal);
  },

  async delete(id: number): Promise<void> {
    await localApiDelete<void>(`/journaux/${id}`);
  },
};
