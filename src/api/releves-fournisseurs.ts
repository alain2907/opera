import { localApiGet, localApiPost, localApiDelete } from '../lib/dualApiClient';

export interface FournisseurDebiteur {
  compte: string;
  solde: number;
}

export interface ReleveFournisseur {
  id: number;
  entreprise_id: number;
  exercice_id: number;
  mois: number;
  annee: number;
  compte_fournisseur: string;
  montant_releve: number;
  ecriture_id: number;
  date_creation: string;
}

export const relevesFournisseursApi = {
  async trouverFournisseursDebiteurs(
    entrepriseId: number,
    exerciceId: number,
    mois: number,
    annee: number,
  ): Promise<FournisseurDebiteur[]> {
    return localApiGet<FournisseurDebiteur[]>('/releves-fournisseurs/fournisseurs-debiteurs', {
      params: { entreprise_id: entrepriseId, exercice_id: exerciceId, mois, annee },
    });
  },

  async traiterReleveFournisseur(
    entrepriseId: number,
    exerciceId: number,
    mois: number,
    annee: number,
    compteFournisseur: string,
    montant: number,
    compteContrepartie: string,
  ): Promise<ReleveFournisseur> {
    return localApiPost<ReleveFournisseur>('/releves-fournisseurs/traiter-un', {
      entreprise_id: entrepriseId,
      exercice_id: exerciceId,
      mois,
      annee,
      compte_fournisseur: compteFournisseur,
      montant,
      compte_contrepartie: compteContrepartie,
    });
  },

  async traiterTousLesReleves(
    entrepriseId: number,
    exerciceId: number,
    mois: number,
    annee: number,
    compteContrepartie: string,
  ): Promise<ReleveFournisseur[]> {
    return localApiPost<ReleveFournisseur[]>('/releves-fournisseurs/traiter-tous', {
      entreprise_id: entrepriseId,
      exercice_id: exerciceId,
      mois,
      annee,
      compte_contrepartie: compteContrepartie,
    });
  },

  async listerRelevesFournisseurs(entrepriseId: number, exerciceId?: number): Promise<ReleveFournisseur[]> {
    return localApiGet<ReleveFournisseur[]>('/releves-fournisseurs/liste', {
      params: { entreprise_id: entrepriseId, exercice_id: exerciceId },
    });
  },

  async supprimerReleveFournisseur(id: number): Promise<void> {
    await localApiDelete<void>(`/releves-fournisseurs/${id}`);
  },
};
