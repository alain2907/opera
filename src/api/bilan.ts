import { localApiGet, localApiPut } from '../lib/dualApiClient';

export interface LigneBilan {
  section: string;
  ligne_libelle: string;
  code_poste: string;
  niveau: number;
  montant_n: number;
  montant_n_1?: number;
  ordre_affichage: number;
}

export interface ResultatBilan {
  actif: LigneBilan[];
  passif: LigneBilan[];
  total_actif: number;
  total_passif: number;
  equilibre: boolean;
}

export interface GetBilanParams {
  entreprise_id: number;
  exercice_id: number;
  date_cloture: string;
  comparatif?: boolean;
  exercice_id_n_1?: number;
  date_cloture_n_1?: string;
}

export interface DetailCompte {
  numero_compte: string;
  libelle: string;
  solde: number;
}

export interface DetailLigneBilan {
  ligne_libelle: string;
  code_poste: string;
  comptes: DetailCompte[];
  total: number;
  compte_debut: string | null;
  compte_fin: string | null;
  comptes_specifiques: string | null;
}

export interface GetDetailLigneParams {
  code_poste: string;
  entreprise_id: number;
  exercice_id: number;
  date_cloture: string;
}

export const bilanApi = {
  async getBilan(params: GetBilanParams): Promise<ResultatBilan> {
    const queryParams = new URLSearchParams({
      entreprise_id: params.entreprise_id.toString(),
      exercice_id: params.exercice_id.toString(),
      date_cloture: params.date_cloture,
    });

    if (params.comparatif !== undefined) {
      queryParams.append('comparatif', params.comparatif.toString());
    }
    if (params.exercice_id_n_1) {
      queryParams.append('exercice_id_n_1', params.exercice_id_n_1.toString());
    }
    if (params.date_cloture_n_1) {
      queryParams.append('date_cloture_n_1', params.date_cloture_n_1);
    }

    return localApiGet<ResultatBilan>(`/bilan?${queryParams}`);
  },

  async getDetailLigne(params: GetDetailLigneParams): Promise<DetailLigneBilan> {
    const queryParams = new URLSearchParams({
      code_poste: params.code_poste,
      entreprise_id: params.entreprise_id.toString(),
      exercice_id: params.exercice_id.toString(),
      date_cloture: params.date_cloture,
    });

    return localApiGet<DetailLigneBilan>(`/bilan/detail?${queryParams}`);
  },

  async updateMapping(code_poste: string, compte_debut: string, compte_fin: string): Promise<void> {
    return localApiPut(`/bilan/mapping`, {
      code_poste,
      compte_debut,
      compte_fin,
    });
  },
};
