import { localApiGet, localApiPut } from '../lib/dualApiClient';

export interface LigneCompteResultat {
  section: string;
  ligne_libelle: string;
  code_poste: string;
  niveau: number;
  montant_n: number;
  montant_n_1?: number;
  ordre_affichage: number;
  categorie: string;
}

export interface ResultatCompteResultat {
  produits_exploitation: LigneCompteResultat[];
  charges_exploitation: LigneCompteResultat[];
  resultat_exploitation: number;
  produits_financiers: LigneCompteResultat[];
  charges_financieres: LigneCompteResultat[];
  resultat_financier: number;
  resultat_courant_avant_impots: number;
  produits_exceptionnels: LigneCompteResultat[];
  charges_exceptionnelles: LigneCompteResultat[];
  resultat_exceptionnel: number;
  participation_salaries: number;
  impots_benefices: number;
  resultat_net: number;
  total_produits: number;
  total_charges: number;
}

export interface DetailCompte {
  numero_compte: string;
  libelle: string;
  solde: number;
}

export interface DetailLigneCompteResultat {
  ligne_libelle: string;
  code_poste: string;
  comptes: DetailCompte[];
  total: number;
  compte_debut: string | null;
  compte_fin: string | null;
  comptes_specifiques: string | null;
}

export const compteResultatApi = {
  getCompteResultat: async (params: {
    entreprise_id: number;
    exercice_id: number;
    date_debut: string;
    date_fin: string;
    comparatif?: boolean;
    exercice_id_n_1?: number;
    date_debut_n_1?: string;
    date_fin_n_1?: string;
  }): Promise<ResultatCompteResultat> => {
    const queryParams = new URLSearchParams({
      entreprise_id: params.entreprise_id.toString(),
      exercice_id: params.exercice_id.toString(),
      date_debut: params.date_debut,
      date_fin: params.date_fin,
    });

    if (params.comparatif !== undefined) {
      queryParams.append('comparatif', params.comparatif.toString());
    }
    if (params.exercice_id_n_1) {
      queryParams.append('exercice_id_n_1', params.exercice_id_n_1.toString());
    }
    if (params.date_debut_n_1) {
      queryParams.append('date_debut_n_1', params.date_debut_n_1);
    }
    if (params.date_fin_n_1) {
      queryParams.append('date_fin_n_1', params.date_fin_n_1);
    }

    return localApiGet<ResultatCompteResultat>(`/compte-resultat?${queryParams}`);
  },

  getDetailLigne: async (params: {
    code_poste: string;
    entreprise_id: number;
    exercice_id: number;
    date_debut: string;
    date_fin: string;
  }): Promise<DetailLigneCompteResultat> => {
    const queryParams = new URLSearchParams({
      code_poste: params.code_poste,
      entreprise_id: params.entreprise_id.toString(),
      exercice_id: params.exercice_id.toString(),
      date_debut: params.date_debut,
      date_fin: params.date_fin,
    });

    return localApiGet<DetailLigneCompteResultat>(`/compte-resultat/detail?${queryParams}`);
  },

  updateMapping: async (
    code_poste: string,
    compte_debut: string,
    compte_fin: string,
  ): Promise<any> => {
    return localApiPut(`/compte-resultat/mapping`, {
      code_poste,
      compte_debut,
      compte_fin,
    });
  },
};
