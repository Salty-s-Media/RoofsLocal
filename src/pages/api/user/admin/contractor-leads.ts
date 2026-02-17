import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

interface HubSpotFilter {
  propertyName: string;
  operator: string;
  value: string;
}

interface HubSpotContact {
  id: string;
  properties: {
    firstname: string;
    lastname: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    zip: string;
    createdate: string;
  };
}

interface HubSpotSearchResponse {
  total: number;
  results: HubSpotContact[];
  paging?: {
    next?: { after: string };
  };
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  createdAt: string;
}

const LEAD_PROPERTIES = [
  'firstname',
  'lastname',
  'phone',
  'email',
  'address',
  'city',
  'zip',
  'createdate',
];

function mapContact(contact: HubSpotContact): Lead {
  return {
    id: contact.id,
    firstName: contact.properties.firstname || '',
    lastName: contact.properties.lastname || '',
    phone: contact.properties.phone || '',
    email: contact.properties.email || '',
    streetAddress: contact.properties.address || '',
    city: contact.properties.city || '',
    zipCode: contact.properties.zip || '',
    createdAt: contact.properties.createdate || '',
  };
}

/**
 * Fetches all CONNECTED leads from HubSpot for a contractor by company name,
 * filtered by date range. Paginates through all results.
 */
async function fetchLeadsForContractor(
  companyName: string,
  startDate?: string,
  endDate?: string
): Promise<Lead[]> {
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

  const allLeads: Lead[] = [];
  let after: string | undefined;

  do {
    try {
      const body: Record<string, unknown> = {
        filterGroups: [{ filters }],
        properties: LEAD_PROPERTIES,
        limit: 100,
      };
      if (after) body.after = after;

      const response = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) break;

      const data: HubSpotSearchResponse = await response.json();
      allLeads.push(...data.results.map(mapContact));
      after = data.paging?.next?.after;
    } catch (error) {
      console.error(`Error fetching leads for ${companyName}:`, error);
      break;
    }
  } while (after);

  // Sort newest first
  allLeads.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return allLeads;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const { contractorId, startDate, endDate } = req.query;

  if (!contractorId || typeof contractorId !== 'string') {
    return res.status(400).json({ error: 'contractorId is required' });
  }

  try {
    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    const start = typeof startDate === 'string' ? startDate : undefined;
    const end = typeof endDate === 'string' ? endDate : undefined;

    const leads = await fetchLeadsForContractor(contractor.company, start, end);
    const leadsSent = leads.length;
    const revenueCollected = leadsSent * contractor.pricePerLead;

    return res.status(200).json({
      contractorName: contractor.company,
      leadsSent,
      revenueCollected,
      leads,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}