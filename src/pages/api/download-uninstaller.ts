import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // Télécharger le fichier depuis R2
    const response = await fetch(
      'https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/desinstaller.command',
    );

    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const fileContent = await response.text();

    // Forcer le téléchargement avec les bons headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="desinstaller.command"',
    );
    res.status(200).send(fileContent);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
}
