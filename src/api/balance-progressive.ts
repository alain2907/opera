import { localApiGet } from '../lib/dualApiClient';

export interface Periode {
  label: string; // "Jan 2025", "Fév 2025", etc.
  start: string; // "2025-01-01"
  end: string;   // "2025-01-31"
}

export interface LigneBalanceProgressive {
  numero_compte: string;
  libelle: string;
  soldes_par_periode: number[]; // Un solde cumulé par période
  solde_total: number; // Solde à la fin de la dernière période
}

export interface BalanceProgressiveResult {
  periodes: Periode[];
  lignes: LigneBalanceProgressive[];
}

export const balanceProgressiveApi = {
  async getBalanceProgressive(params: {
    entreprise_id: number;
    date_debut?: string;
    date_fin?: string;
    exercice_id?: number;
    classes?: string[];
    compte_debut?: string;
    compte_fin?: string;
    inclure_comptes_vides?: boolean;
  }): Promise<BalanceProgressiveResult> {
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

    return localApiGet<BalanceProgressiveResult>(`/balance-progressive?${queryParams}`);
  },
};
