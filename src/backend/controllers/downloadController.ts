import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDownloads = async (req: Request, res: Response) => {
  try {
    const downloads = await prisma.downloads.findMany();
    res.json(downloads);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching downloads' });
  }
};

export const getDownloadById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const download = await prisma.downloads.findUnique({ where: { id } });
    if (download) {
      res.json(download);
    } else {
      res.status(404).json({ error: 'Download not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the download' });
  }
};
