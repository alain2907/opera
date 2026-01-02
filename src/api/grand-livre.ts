import { localApiGet } from '../lib/dualApiClient';

export interface LigneGrandLivre {
  ecriture_id: number;
  date_ecriture: string;
  numero_piece: string;
  libelle_ecriture: string;
  numero_compte: string;
  libelle_compte: string;
  debit: number;
  credit: number;
  solde: number;
}

export const grandLivreApi = {
  async getGrandLivre(params: {
    entreprise_id: number;
    date_debut?: string;
    date_fin?: string;
    exercice_id?: number;
    classes?: string[];
    compte_debut?: string;
    compte_fin?: string;
  }): Promise<LigneGrandLivre[]> {
    const queryParams = new URLSearchParams({
      entreprise_id: params.entreprise_id.toString(),
    });

    if (params.date_debut) {
      queryParams.append('date_debut', params.date_debut);
    }
    if (params.date_fin) {
      queryParams.append('date_fin', params.date_fin);
    }
    if (params.exercice_id) {
      queryParams.append('exercice_id', params.exercice_id.toString());
    }
    if (params.classes && params.classes.length > 0) {
      queryParams.append('classes', params.classes.join(','));
    }
    if (params.compte_debut) {
      queryParams.append('compte_debut', params.compte_debut);
    }
    if (params.compte_fin) {
      queryParams.append('compte_fin', params.compte_fin);
    }

    return localApiGet<LigneGrandLivre[]>(`/grand-livre?${queryParams}`);
  },
};
