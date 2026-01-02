import { localApiCall } from '../lib/dualApiClient';

export interface ImportFECResult {
  success: boolean;
  imported: number;
  errors: string[];
}

export const fecApi = {
  async importFEC(
    file: File,
    entrepriseId: number,
    exerciceId: number
  ): Promise<ImportFECResult> {
    // Lire le contenu du fichier
    const content = await file.text();

    const response = await localApiCall('/fec/import', {
      method: 'POST',
      body: JSON.stringify({
        content,
        exerciceId,
        entreprise_id: entrepriseId,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  },
};
