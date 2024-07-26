/*
  ************** IMPORTANT **************
  NEVER RUN THIS LOCALLY, FOR PROD ONLY
  ***************************************
*/

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient as PrismaClientProd } from '@prisma/client';
import { PrismaClient as PrismaClientDev } from '@prisma-dev/client';

// Initialize two Prisma Clients for two different databases
const prismaProd = new PrismaClientProd();
const prismaDev = new PrismaClientDev({ 
  datasources: { 
    db: { 
      url: process.env.POSTGRES_DEV_PRISMA_URL, 
      directUrl: process.env.POSTGRES_DEV_URL_NON_POOLING
}}});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.VERCEL_ENV !== 'production') {
    return res.status(403).json({ error: 'Forbidden: Only runs in production' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const data = await prismaProd.contractor.findMany();

    await prismaDev.contractor.createMany({
      data,
      skipDuplicates: true,
    });

    res.status(200).json({ message: 'Data copied successfully' });
  } catch (error) {
    console.error('Error copying data:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prismaProd.$disconnect();
    await prismaDev.$disconnect();
  }
}
