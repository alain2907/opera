import { localApiCall } from '../lib/dualApiClient';

export interface Backup {
  name: string;
  size: number;
  date: Date;
}

export const backupApi = {
  async exportDatabase(): Promise<Blob> {
    const response = await localApiCall('/backup/export', { method: 'GET' });
    return response.blob();
  },

  async importDatabase(file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await localApiCall('/backup/import', {
      method: 'POST',
      body: formData,
      headers: {}, // Ne pas définir Content-Type, le navigateur le fera automatiquement pour FormData
    });
    return response.json();
  },

  async listBackups(): Promise<Backup[]> {
    const response = await localApiCall('/backup/list', { method: 'GET' });
    return response.json();
  },
};
