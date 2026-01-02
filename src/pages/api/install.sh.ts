import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Lire le script d'installation depuis le dossier public
  const scriptPath = path.join(process.cwd(), 'public', 'install-mac.sh');

  try {
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

    // Retourner le script avec le bon Content-Type
    res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="install-mac.sh"');
    res.status(200).send(scriptContent);
  } catch (error) {
    console.error('Erreur lors de la lecture du script:', error);
    res.status(500).json({ error: 'Script non trouvé' });
  }
}
