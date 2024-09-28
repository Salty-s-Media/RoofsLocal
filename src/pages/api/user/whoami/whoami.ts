import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { parse } from 'cookie';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const sessionId = cookies.sessionId;

    if (!sessionId) {
      return res.status(401).json({ error: 'You are not logged in.' });
    }

    const contractors = await prisma.contractor.findMany();
    let currentUser = null;

    for (const contractor of contractors) {
      if (contractor.sessionExpiry && new Date(contractor.sessionExpiry) < new Date()) {
        continue;
      }
      const match = await bcrypt.compare(sessionId, contractor.sessionId);
      if (match) {
        currentUser = contractor;
        break;
      }
    }

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { password, sessionId: storedSessionId, ...rest } = currentUser;
    res.status(200).json(rest);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
