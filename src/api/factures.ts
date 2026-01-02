import { localApiCall } from '../lib/dualApiClient';

export interface ClientBalance {
  compteClient: string;
  nomClient: string;
  solde: number;
  tauxTVA: number;
  compteProduit: string;
  compteTVA: string;
}

export const facturesApi = {
  async getProchainNumero(
    entrepriseId: number,
    exerciceId: number
  ): Promise<{ numero: number }> {
    const response = await localApiCall(
      `/factures/prochain-numero?entrepriseId=${entrepriseId}&exerciceId=${exerciceId}`,
      { method: 'GET' }
    );
    return response.json();
  },

  async getBalanceClients(
    entrepriseId: number,
    exerciceId: number,
    mois: number,
    annee: number,
    typeJournal?: 'VE' | 'HA'
  ): Promise<{ balances: ClientBalance[] }> {
    const typeParam = typeJournal ? `&typeJournal=${typeJournal}` : '';
    const response = await localApiCall(
      `/factures/balance-clients?entrepriseId=${entrepriseId}&exerciceId=${exerciceId}&mois=${mois}&annee=${annee}${typeParam}`,
      { method: 'GET' }
    );
    return response.json();
  },

  async incrementerNumero(
    entrepriseId: number,
    exerciceId: number,
    nbFactures: number
  ): Promise<{ success: boolean }> {
    const response = await localApiCall('/factures/incrementer', {
      method: 'POST',
      body: JSON.stringify({ entrepriseId, exerciceId, nbFactures }),
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  },
};
