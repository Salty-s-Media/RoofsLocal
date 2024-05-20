import { Request, Response } from 'express';
import prisma from '../prisma';
import { GetDownloadsParams, CountDownloadsParams } from '@/shared/downloadTypes';

export const createDownload = async (req: Request, res: Response) => {
  const data = { data: req.body };
  try {
    const download = await prisma.downloads.create(data);
    res.json(download);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating the download' });
  }
};

export const getDownloads = async (req: Request, res: Response) => {
  const params = req.params as GetDownloadsParams;
  try {
    const downloads = await prisma.downloads.findMany(params);
    res.json(downloads);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the download' });
  }
};

export const updateDownload = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = {
    where: { id },
    data: req.body
  };
  try {
    const download = await prisma.downloads.update(data);
    res.json(download);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while updating the download' });
  }
};

export const deleteDownload = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.downloads.delete({ where: { id } });
    res.json({ message: 'Download deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while deleting the download' });
  }
};

export const countDownloads = async (req: Request, res: Response) => {
  const params = req.params as CountDownloadsParams;
  try {
    const count = await prisma.downloads.count(params);
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while counting downloads' });
  }
};
