import { localApiGet, localApiPost, localApiPatch, localApiDelete } from '../lib/dualApiClient';

export interface Entreprise {
  id?: number;
  raison_sociale: string;
  siret?: string;
  forme_juridique?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  capital_social?: number;
  numero_tva_intra?: string;
  code_naf?: string;
  regime_fiscal?: string;
  notes?: string;
  actif?: boolean;
  exercices?: any[];
}

export const entreprisesApi = {
  async getAll(): Promise<Entreprise[]> {
    return localApiGet<Entreprise[]>('/entreprises');
  },

  async getOne(id: number): Promise<Entreprise> {
    return localApiGet<Entreprise>(`/entreprises/${id}`);
  },

  async create(entreprise: Entreprise): Promise<Entreprise> {
    return localApiPost<Entreprise>('/entreprises', entreprise);
  },

  async update(id: number, entreprise: Partial<Entreprise>): Promise<Entreprise> {
    return localApiPatch<Entreprise>(`/entreprises/${id}`, entreprise);
  },

  async delete(id: number): Promise<void> {
    return localApiDelete<void>(`/entreprises/${id}`);
  },
};
