import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

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
 * Fetches SOLD leads for a contractor.
 * Uses the local LeadStatus table to find which leads are SOLD,
 * then fetches their contact details from HubSpot.
 */
async function fetchSoldLeadsForContractor(
  contractorId: string
): Promise<Lead[]> {
  // 1. Get SOLD lead IDs from local DB
  //    If the LeadStatus table hasn't been migrated yet, return empty.
  let soldStatuses: { hubspotContactId: string }[];
  try {
    soldStatuses = await prisma.leadStatus.findMany({
      where: {
        contractorId,
        status: 'SOLD',
      },
      select: { hubspotContactId: true },
    });
  } catch (err) {
    console.error(
      `[contractor-leads] LeadStatus query failed (migration may not be applied yet):`,
      err
    );
    return [];
  }

  if (soldStatuses.length === 0) return [];

  const soldIds = soldStatuses.map((s) => s.hubspotContactId);

  // 2. Fetch contact details from HubSpot for those IDs
  const allLeads: Lead[] = [];

  // Batch in chunks of 100
  for (let i = 0; i < soldIds.length; i += 100) {
    const chunk = soldIds.slice(i, i + 100);

    try {
      const response = await fetch(
        'https://api.hubapi.com/crm/v3/objects/contacts/batch/read',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify({
            properties: LEAD_PROPERTIES,
            inputs: chunk.map((id) => ({ id })),
          }),
        }
      );

      if (!response.ok) break;

      const data = await response.json();
      if (data.results) {
        allLeads.push(...data.results.map(mapContact));
      }
    } catch (error) {
      console.error(`Error fetching contacts from HubSpot:`, error);
      break;
    }
  }

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

  const { contractorId } = req.query;

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

    const leads = await fetchSoldLeadsForContractor(contractorId);
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
