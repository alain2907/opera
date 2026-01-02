import { localApiGet, localApiPost, localApiDelete } from '../lib/dualApiClient';

export interface LibelleCompteMap {
  id: number;
  entreprise_id: number;
  libelle: string;
  numero_compte: string;
  date_creation: Date;
  date_modification: Date;
}

export const libelleCompteMapsApi = {
  async findByEntreprise(entrepriseId: number): Promise<LibelleCompteMap[]> {
    return localApiGet<LibelleCompteMap[]>(`/libelle-compte-maps?entreprise_id=${entrepriseId}`);
  },

  async upsert(
    entrepriseId: number,
    libelle: string,
    numeroCompte: string,
  ): Promise<LibelleCompteMap> {
    return localApiPost<LibelleCompteMap>('/libelle-compte-maps', {
      entreprise_id: entrepriseId,
      libelle,
      numero_compte: numeroCompte,
    });
  },

  async delete(id: number): Promise<void> {
    await localApiDelete<void>(`/libelle-compte-maps/${id}`);
  },
};
