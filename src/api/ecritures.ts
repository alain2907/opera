import { localApiGet, localApiPost, localApiPatch, localApiDelete } from '../lib/dualApiClient';

export interface LigneEcriture {
  id?: number;
  numero_compte: string;
  libelle_compte: string;
  debit: number;
  credit: number;
}

export interface Ecriture {
  id?: number;
  journal_id: number;
  exercice_id: number;
  entreprise_id: number;
  date_ecriture: string;
  numero_piece: string;
  libelle: string;
  lignes: LigneEcriture[];
  date_creation?: string;
  journal?: {
    id: number;
    code: string;
    libelle: string;
  };
}

export const ecrituresApi = {
  async getAll(
    entrepriseId: number,
    exerciceId?: number,
    journalId?: number,
    dateDebut?: string,
    dateFin?: string,
  ): Promise<Ecriture[]> {
    const params = new URLSearchParams({ entreprise_id: entrepriseId.toString() });
    if (exerciceId) {
      params.append('exercice_id', exerciceId.toString());
    }
    if (journalId) {
      params.append('journal_id', journalId.toString());
    }
    if (dateDebut) {
      params.append('dateDebut', dateDebut);
    }
    if (dateFin) {
      params.append('dateFin', dateFin);
    }
    return localApiGet<Ecriture[]>(`/ecritures?${params}`);
  },

  async getOne(id: number): Promise<Ecriture> {
    return localApiGet<Ecriture>(`/ecritures/${id}`);
  },

  async create(ecriture: Omit<Ecriture, 'id' | 'date_creation'>): Promise<Ecriture> {
    return localApiPost<Ecriture>('/ecritures', ecriture);
  },

  async update(id: number, ecriture: Omit<Ecriture, 'id' | 'date_creation'>): Promise<Ecriture> {
    return localApiPatch<Ecriture>(`/ecritures/${id}`, ecriture);
  },

  async delete(id: number): Promise<void> {
    return localApiDelete<void>(`/ecritures/${id}`);
  },

  async deleteAll(entrepriseId: number, exerciceId?: number): Promise<{ deleted: number; message: string }> {
    const params = new URLSearchParams({ entreprise_id: entrepriseId.toString() });
    if (exerciceId) {
      params.append('exercice_id', exerciceId.toString());
    }
    return localApiDelete<{ deleted: number; message: string }>(`/ecritures?${params}`);
  },
};
