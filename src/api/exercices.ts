import { localApiGet, localApiPost, localApiPatch, localApiDelete } from '../lib/dualApiClient';

export interface Exercice {
  id?: number;
  entreprise_id: number;
  annee: number;
  date_debut: string;
  date_fin: string;
  cloture?: boolean;
  date_creation?: string;
}

export const exercicesApi = {
  async getAll(): Promise<Exercice[]> {
    return localApiGet<Exercice[]>('/exercices');
  },

  async getByEntreprise(entrepriseId: number): Promise<Exercice[]> {
    return localApiGet<Exercice[]>(`/exercices/entreprise/${entrepriseId}`);
  },

  async getOne(id: number): Promise<Exercice> {
    return localApiGet<Exercice>(`/exercices/${id}`);
  },

  async create(exercice: Partial<Exercice>): Promise<Exercice> {
    return localApiPost<Exercice>('/exercices', exercice);
  },

  async update(id: number, exercice: Partial<Exercice>): Promise<Exercice> {
    return localApiPatch<Exercice>(`/exercices/${id}`, exercice);
  },

  async delete(id: number): Promise<void> {
    await localApiDelete<void>(`/exercices/${id}`);
  },
};
