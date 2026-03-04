import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { contractorId } = req.query;
    if (!contractorId || typeof contractorId !== 'string') {
      return res.status(400).json({ error: 'contractorId required' });
    }

    const overrides = await prisma.leadStatusOverride.findMany({
      where: { contractorId },
    });

    // Return as a simple { [contactId]: status } map
    const map: Record<string, string> = {};
    for (const o of overrides) {
      map[o.contactId] = o.status;
    }
    return res.status(200).json(map);
  }

  if (req.method === 'PUT') {
    const { contactId, contractorId, status } = req.body;
    if (!contactId || !contractorId || !status) {
      return res.status(400).json({ error: 'contactId, contractorId, and status required' });
    }

    const override = await prisma.leadStatusOverride.upsert({
      where: { contactId },
      create: { contactId, contractorId, status },
      update: { status },
    });

    return res.status(200).json(override);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}