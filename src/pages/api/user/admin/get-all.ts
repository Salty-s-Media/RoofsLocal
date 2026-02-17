import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Contractor } from '@prisma/client';

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

interface ContractorWithStats extends Contractor {
  leadsSent: number;
  revenueCollected: number;
}

interface HubSpotFilter {
  propertyName: string;
  operator: string;
  value: string;
}

interface HubSpotSearchResponse {
  total: number;
}

/**
 * Counts CONNECTED leads in HubSpot for a contractor by company name + date range.
 * Single API call per contractor — no zip batching needed.
 */
async function countLeadsForContractor(
  companyName: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  const filters: HubSpotFilter[] = [
    { propertyName: 'hs_lead_status', operator: 'EQ', value: 'CONNECTED' },
    { propertyName: 'company', operator: 'EQ', value: companyName },
  ];

  if (startDate) {
    filters.push({
      propertyName: 'createdate',
      operator: 'GTE',
      value: new Date(startDate).getTime().toString(),
    });
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filters.push({
      propertyName: 'createdate',
      operator: 'LTE',
      value: end.getTime().toString(),
    });
  }

  try {
    const response = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [{ filters }],
          properties: ['hs_lead_status'],
          limit: 1,
        }),
      }
    );

    if (response.ok) {
      const data: HubSpotSearchResponse = await response.json();
      return data.total ?? 0;
    }
    return 0;
  } catch (error) {
    console.error(`Error counting leads for ${companyName}:`, error);
    return 0;
  }
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
    const { startDate, endDate } = req.query;
    const start = typeof startDate === 'string' ? startDate : undefined;
    const end = typeof endDate === 'string' ? endDate : undefined;

    const contractors = await prisma.contractor.findMany();

    // One HubSpot call per contractor — safe to parallelize
    const statsPromises = contractors.map(
      async (contractor): Promise<ContractorWithStats> => {
        const leadsSent = await countLeadsForContractor(
          contractor.company,
          start,
          end
        );
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