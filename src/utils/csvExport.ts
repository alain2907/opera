/**
 * Convertit un tableau d'objets en CSV
 */
export function exportToCsv(data: any[], filename: string, headers?: string[]) {
  if (data.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  // Si headers n'est pas fourni, utiliser les clés du premier objet
  const csvHeaders = headers || Object.keys(data[0]);

  // Créer les lignes CSV
  const csvRows = [
    // En-têtes
    csvHeaders.join(';'),
    // Données
    ...data.map(row =>
      csvHeaders.map(header => {
        const value = row[header];
        // Gérer les valeurs null/undefined
        if (value === null || value === undefined) return '';
        // Gérer les nombres
        if (typeof value === 'number') return value.toString().replace('.', ',');
        // Gérer les chaînes (échapper les guillemets et entourer de guillemets si contient point-virgule)
        const stringValue = String(value);
        if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(';')
    )
  ];

  // Créer le blob avec BOM pour UTF-8
  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Télécharger
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formate une date pour le nom de fichier
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}
