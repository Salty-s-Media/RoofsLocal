import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { Parser } from 'json2csv';
import Stripe from 'stripe';
import axios from 'axios';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);
const json2csvParser = new Parser();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL;

// Only process leads created within the last 7 days
const MAX_LEAD_AGE_DAYS = 7;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const openLeads = await getOpenLeads();
    console.log(`${openLeads.length} open leads`);
    const unpaidLeads = await getUnpaidLeads();
    console.log(`${unpaidLeads.length} unpaid leads`);

    const contractorOpenLeadsMap = await matchLeads(openLeads);
    const contractorUnpaidLeadsMap = await matchLeads(unpaidLeads);

    const successfulOpenLeadsMap = await handleOpenLeads(contractorOpenLeadsMap);

    const mergedLeadsMap = mergeLeadsMaps(
      successfulOpenLeadsMap,
      contractorUnpaidLeadsMap
    );

    await chargeForLeads(mergedLeadsMap);

    res.status(200).json({ message: 'Cron job executed successfully' });
  } catch (error) {
    console.error('Error executing cron job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getOpenLeads() {
  return getHubspotLeads('OPEN');
}

async function getUnpaidLeads() {
  return getHubspotLeads('IN_PROGRESS');
}

async function getHubspotLeads(status: string) {
  let allResults: any[] = [];
  let after: string | undefined = undefined;
  const limit = 100;

  // Only fetch leads created within the allowed window
  const cutoffTimestamp = String(
    Date.now() - MAX_LEAD_AGE_DAYS * 24 * 60 * 60 * 1000
  );

  do {
    const requestBody: any = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hs_lead_status',
              operator: 'EQ',
              value: status,
            },
            {
              propertyName: 'createdate',
              operator: 'GTE',
              value: cutoffTimestamp,
            },
          ],
        },
      ],
      properties: [
        'id',
        'firstname',
        'lastname',
        'email',
        'phone',
        'address',
        'city',
        'zip',
      ],
      limit: limit,
    };

    if (after) {
      requestBody.after = after;
    }

    const hubspotResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!hubspotResponse.ok) {
      const errorBody = await hubspotResponse.text();
      throw new Error(
        `Failed to get ${status} leads (page with after=${after}): ${hubspotResponse.status} - ${errorBody}`
      );
    }

    const data = await hubspotResponse.json();
    if (data.results && data.results.length > 0) {
      allResults = allResults.concat(data.results);
    }

    after = data.paging?.next?.after;
  } while (after);

  return allResults.map((result: any) => ({
    ...result.properties,
    id: result.id,
  }));
}

async function matchLeads(leads: any[]) {
  const contractorLeadsMap: { [key: string]: any[] } = {};

  for (const lead of leads) {
    const contractor = await prisma.contractor.findFirst({
      where: {
        zipCodes: {
          has: lead.zip.substring(0, 5),
        },
      },
    });
    if (contractor) {
      if (!contractorLeadsMap[contractor.id]) {
        contractorLeadsMap[contractor.id] = [];
      }
      contractorLeadsMap[contractor.id].push(lead);
    }
  }

  return contractorLeadsMap;
}

async function handleOpenLeads(contractorLeadsMap: { [key: string]: any[] }) {
  // Returns a new map containing only leads that were successfully processed
  // (i.e. GHL contact + opportunity created). Failed leads are left untouched
  // in the original map but excluded from billing and CONNECTED status.
  const successfulLeadsMap: { [key: string]: any[] } = {};

  for (const contractorId in contractorLeadsMap) {
    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      console.error(`Contractor with ID ${contractorId} not found`);
      continue;
    }

    const leads = contractorLeadsMap[contractorId];

    for (const lead of leads) {
      await delay(1000);
      await importHubspotContact(lead, contractor);
      await updateHubspotCompany(lead, contractor);
      const ghlData = await createGHLContact(lead, contractor);
      if (ghlData) {
        await createGHLOpporunity(ghlData.contact.id, lead, contractor);
        if (!successfulLeadsMap[contractorId]) {
          successfulLeadsMap[contractorId] = [];
        }
        successfulLeadsMap[contractorId].push(lead);
      } else {
        console.warn(`GHL contact creation failed for lead ${lead.id}, excluding from billing`);
      }
    }
  }

  return successfulLeadsMap;
}

async function importHubspotContact(contact: any, contractor: any) {
  const contractorKey = contractor?.hubspotKey;

  delete contact.createdate;
  delete contact.lastmodifieddate;
  contact.company = 'Roofs Local';

  const createData = {
    properties: contact,
  };

  if (contractor?.hubspotKey != null && contractor?.hubspotKey != '') {
    const hubspotResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${contractorKey}`,
        },
        body: JSON.stringify(createData),
      }
    );

    if (!hubspotResponse.ok) {
      const errorBody = await hubspotResponse.text();
      console.warn(
        `Failed to create HubSpot contract: ${hubspotResponse.status} - ${errorBody}`
      );
      return;
    }

    const createContactResult = await hubspotResponse.json();
    console.log('HubSpot contact created: ', createContactResult);
  }
}

async function updateHubspotCompany(contact: any, contractor: any) {
  const hubspotResponse = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts/batch/update',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: [
          {
            id: contact.id,
            properties: {
              company: contractor?.company || 'Unknown Company',
            },
          },
        ],
      }),
    }
  );

  if (!hubspotResponse.ok) {
    const errorBody = await hubspotResponse.text();
    console.warn(
      `Failed to update HubSpot contact: ${hubspotResponse.status} - ${errorBody}`
    );
    return;
  }

  const updateContactResult = await hubspotResponse.json();
  console.log('HubSpot contact updated: ', updateContactResult);
}

async function createGHLContact(contact: any, contractor: any) {
  const phoneNumber = contact.phone;
  const formattedPhoneNumber =
    phoneNumber && !phoneNumber.startsWith('+')
      ? `+1${phoneNumber}`
      : phoneNumber;

  const ghlRequestBody = {
    firstName: contact.firstname,
    lastName: contact.lastname,
    email: contact.email,
    phone: formattedPhoneNumber,
    address1: contact.address,
    city: contact.city,
    postalCode: contact.zip,
    locationId: contractor?.ghlLocationId ? contractor.ghlLocationId : '',
  };

  const ghlResponse = await fetch(
    'https://services.leadconnectorhq.com/contacts/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contractor?.ghlKey}`,
        version: '2021-07-28',
      },
      body: JSON.stringify(ghlRequestBody),
    }
  );

  if (!ghlResponse.ok) {
    const errorBody = await ghlResponse.text();
    console.warn(
      `Failed to create contact: ${ghlResponse.status} - ${errorBody}`
    );
    return null;
  }

  console.log('GHL contact created: ', ghlResponse);
  const ghlData = await ghlResponse.json();
  return ghlData;
}

async function createGHLOpporunity(
  contactId: string,
  contact: any,
  contractor: any
) {
  const ghlResponse = await fetch(
    'https://services.leadconnectorhq.com/opportunities/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${contractor?.ghlKey}`,
        version: '2021-07-28',
      },
      body: JSON.stringify({
        pipelineId: contractor?.ghlPipelineId ? contractor.ghlPipelineId : '',
        pipelineStageId: contractor?.ghlPipelineStageId
          ? contractor.ghlPipelineStageId
          : '',
        locationId: contractor?.ghlLocationId ? contractor.ghlLocationId : '',
        name: `${contact.firstname} ${contact.lastname}`,
        status: 'open',
        contactId: contactId,
      }),
    }
  );

  if (!ghlResponse.ok) {
    const errorBody = await ghlResponse.text();
    console.warn(
      `Failed to create GHL opportunity: ${ghlResponse.status} - ${errorBody}`
    );
    return;
  }

  console.log('GHL create oportunity response: ', ghlResponse);
}

function mergeLeadsMaps(
  map1: { [key: string]: any[] },
  map2: { [key: string]: any[] }
) {
  const mergedMap: { [key: string]: any[] } = { ...map1 };

  for (const key in map2) {
    if (mergedMap[key]) {
      mergedMap[key] = [...mergedMap[key], ...map2[key]];
    } else {
      mergedMap[key] = map2[key];
    }
  }

  return mergedMap;
}

async function chargeForLeads(contractorLeadsMap: { [key: string]: any[] }) {
  for (const contractorId in contractorLeadsMap) {
    await delay(1000);
    try {
      const contractor = await prisma.contractor.findUnique({
        where: { id: contractorId },
      });

      if (!contractor) {
        console.error(`Contractor with ID ${contractorId} not found`);
        continue;
      }

      const leads = contractorLeadsMap[contractorId];

      if (leads.length === 0) continue;

      // --- Duplicate billing protection ---
      // Mark leads as CONNECTED *before* charging so a concurrent run won't pick them up.
      // If the charge fails we revert them back to IN_PROGRESS.
      await updateHubspotLeads(leads, 'CONNECTED');

      const cost = leads.length * contractor.pricePerLead;
      const leadIds = leads.map((l: any) => l.id);

      try {
        const payment = await chargeContractor(
          contractor.stripeSessionId,
          cost,
          {
            contractorId: contractor.id,
            contractorEmail: contractor.email,
            leadCount: String(leads.length),
            pricePerLead: String(contractor.pricePerLead),
            // Stripe metadata values are capped at 500 chars; truncate if needed
            leadIds: leadIds.join(',').substring(0, 500),
            billedAt: new Date().toISOString(),
          },
          `${leads.length} leads for ${contractor.email} at $${
            contractor.pricePerLead / 100
          }/lead`
        );

        if (payment.status !== 'succeeded') {
          console.error("Payment didn't process:", payment.status);
          // Revert leads so they get picked up on the next run
          await updateHubspotLeads(leads, 'IN_PROGRESS');
          continue;
        }

        console.log(
          `Charged ${contractor.email} $${cost / 100} USD for ${leads.length} leads`
        );
      } catch (chargeError) {
        console.error('Charge failed, reverting leads to IN_PROGRESS:', chargeError);
        await updateHubspotLeads(leads, 'IN_PROGRESS');
      }
    } catch (error) {
      console.error('Error charging contractor:', error);
    }
  }
}

async function chargeContractor(
  sessionId: string,
  amount: number,
  metadata: Record<string, string>,
  description: string
) {
  const currentSession = await stripe.checkout.sessions.retrieve(sessionId);
  const setupIntentId = currentSession.setup_intent;
  const customerId = currentSession.customer;

  const setupIntent = await stripe.setupIntents.retrieve(
    setupIntentId as string
  );
  const paymentMethodId = setupIntent.payment_method;

  const payment = await stripe.paymentIntents.create({
    customer: customerId as string,
    payment_method: paymentMethodId as string,
    amount: amount,
    currency: 'usd',
    confirm: true,
    return_url: `${BASE_URL}/orders`,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
    setup_future_usage: 'off_session',
    metadata,
    description,
  });

  return payment;
}

async function sendEmail(contractor: any, leads: any[]) {
  resend.emails.send({
    from: 'Roofs Local <info@roofslocal.app>',
    to: [contractor.email],
    subject: 'Leads',
    text: `Attached are ${contractor.email}'s leads: ${
      leads.length
    } for zip codes ${contractor.zipCodes}. Charged ${
      (leads.length * contractor.pricePerLead) / 100
    } USD.`,
    attachments: [
      {
        filename: 'leads.csv',
        content: Buffer.from(json2csvParser.parse(leads)).toString('base64'),
      },
    ],
  });
}

async function updateHubspotLeads(leads: any[], status: string = 'CONNECTED') {
  const updateRequests = leads.map((lead) => ({
    id: lead.id,
    properties: { hs_lead_status: status },
  }));

  const requestBody = {
    inputs: updateRequests,
  };

  const response = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts/batch/update',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const resp = await response.text();
    throw new Error(
      `Failed HubSpot batch update: ${response.status} - ${resp}`
    );
  }

  const responseBody = await response.json();
  console.log(`Updated HubSpot leads to ${status}:`, responseBody);
  return responseBody;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}