import { localApiGet } from '../lib/dualApiClient';

export interface LigneBalance {
  numero_compte: string;
  libelle: string;
  total_debit: number;
  total_credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

export const balanceApi = {
  async getBalance(params: {
    entreprise_id: number;
    date_debut?: string;
    date_fin?: string;
    exercice_id?: number;
    classes?: string[];
    compte_debut?: string;
    compte_fin?: string;
    inclure_comptes_vides?: boolean;
  }): Promise<LigneBalance[]> {
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
    if (params.inclure_comptes_vides !== undefined) {
      queryParams.append('inclure_comptes_vides', params.inclure_comptes_vides.toString());
    }

    return localApiGet<LigneBalance[]>(`/balance?${queryParams}`);
  },
};
