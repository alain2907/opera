/**
 * Script de migration pour générer les numéros d'écritures pour les écritures existantes
 */

import * as indexedDB from './indexedDB';

export async function migrateNumeroEcriture() {
  console.log('🔄 Début de la migration des numéros d\'écritures...');

  try {
    // Charger toutes les écritures
    const allEcritures = await indexedDB.getAllEcritures();
    console.log(`📊 ${allEcritures.length} écritures trouvées`);

    // Filtrer celles sans numeroEcriture
    const ecrituresSansNumero = allEcritures.filter((e: any) => !e.numeroEcriture);
    console.log(`📝 ${ecrituresSansNumero.length} écritures à migrer`);

    if (ecrituresSansNumero.length === 0) {
      console.log('✅ Aucune migration nécessaire');
      return { success: true, migrated: 0 };
    }

    // Grouper par journal + mois + date + pieceRef
    const groupes = new Map<string, any[]>();
    ecrituresSansNumero.forEach((e: any) => {
      const date = e.date || '';
      const mois = date.substring(0, 7); // AAAA-MM
      const pieceRef = e.pieceRef || e.piece_ref || '';
      const journal = e.journal || 'XX';

      // Clé de groupement : journal + date + pieceRef (pour les écritures normales)
      // Pour les journaux de banque, on groupe par journal + mois
      const key = journal === 'BQ'
        ? `${journal}-${mois}`
        : `${journal}-${date}-${pieceRef}`;

      if (!groupes.has(key)) {
        groupes.set(key, []);
      }
      groupes.get(key)!.push(e);
    });

    console.log(`📦 ${groupes.size} écritures uniques trouvées`);

    // Générer un numéro pour chaque groupe
    let totalMigrated = 0;
    const compteurs: Record<string, number> = {};

    for (const [key, lignes] of groupes.entries()) {
      if (lignes.length === 0) continue;

      // Extraire les infos du premier élément
      const premiere = lignes[0];
      const date = premiere.date || '';
      const [year, month] = date.split('-');
      const journal = premiere.journal || 'XX';

      // Générer le compteur pour ce journal/mois
      const cleMois = `${journal}-${year}-${month}`;
      if (!compteurs[cleMois]) {
        // Trouver le max existant pour ce mois
        const ecrituresMois = allEcritures.filter((e: any) => {
          if (!e.numeroEcriture) return false;
          return e.numeroEcriture.startsWith(cleMois);
        });
        const maxNum = ecrituresMois.reduce((max: number, e: any) => {
          const parts = e.numeroEcriture.split('-');
          const num = parseInt(parts[3]) || 0;
          return Math.max(max, num);
        }, 0);
        compteurs[cleMois] = maxNum;
      }

      // Incrémenter le compteur
      compteurs[cleMois]++;
      const numeroEcriture = `${cleMois}-${String(compteurs[cleMois]).padStart(4, '0')}`;

      // Mettre à jour toutes les lignes de ce groupe
      for (const ligne of lignes) {
        await indexedDB.updateEcriture(ligne.id, { numeroEcriture });
        totalMigrated++;
      }

      console.log(`✅ Écriture ${numeroEcriture} : ${lignes.length} ligne(s)`);
    }

    console.log(`🎉 Migration terminée : ${totalMigrated} lignes mises à jour`);
    return { success: true, migrated: totalMigrated, ecritures: groupes.size };

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  }
}
