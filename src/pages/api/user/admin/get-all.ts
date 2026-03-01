import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Contractor } from '@prisma/client';

const prisma = new PrismaClient();

interface ContractorWithStats extends Contractor {
  leadsSent: number;
  revenueCollected: number;
}

/**
 * Counts SOLD leads from the local LeadStatus table for a contractor.
 * No HubSpot calls needed — dashboard status is fully local.
 */
async function countSoldLeadsForContractor(
  contractorId: string
): Promise<number> {
  return prisma.leadStatus.count({
    where: {
      contractorId,
      status: 'SOLD',
    },
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const contractors = await prisma.contractor.findMany();

    const statsPromises = contractors.map(
      async (contractor): Promise<ContractorWithStats> => {
        const leadsSent = await countSoldLeadsForContractor(contractor.id);
        const revenueCollected = leadsSent * contractor.pricePerLead;

        return {
          ...contractor,
          leadsSent,
          revenueCollected,
        };
      }
    );

    const result = await Promise.all(statsPromises);

    return res.status(200).json({ contractors: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
