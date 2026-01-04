/**
 * Génère un numéro d'écriture unique au format JOURNAL-AAAA-MM-NNNN
 */

import { getAllEcritures } from './storageAdapter';

export async function generateNumeroEcriture(journal: string, date: string): Promise<string> {
  const [year, month] = date.split('-');
  const cleMois = `${journal}-${year}-${month}`;

  // Charger toutes les écritures existantes
  const allEcritures = await getAllEcritures();

  // Trouver le numéro maximum pour ce journal/mois
  const ecrituresMois = allEcritures.filter((e: any) => {
    if (!e.numeroEcriture) return false;
    return e.numeroEcriture.startsWith(cleMois);
  });

  const maxNum = ecrituresMois.reduce((max: number, e: any) => {
    const parts = e.numeroEcriture.split('-');
    const num = parseInt(parts[3]) || 0;
    return Math.max(max, num);
  }, 0);

  // Générer le nouveau numéro
  const nouveauNum = maxNum + 1;
  return `${cleMois}-${String(nouveauNum).padStart(4, '0')}`;
}
