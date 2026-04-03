import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { Parser } from 'json2csv';
import Stripe from 'stripe';

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
    // 1. Fetch both pools BEFORE any status changes so they don't
    //    overlap. IN_PROGRESS leads are leftovers from a previous run
    //    where GHL succeeded but billing failed. OPEN leads are new.
    const openLeads = await getOpenLeads();
    console.log(`${openLeads.length} open leads`);
    const unpaidLeads = await getUnpaidLeads();
    console.log(`${unpaidLeads.length} unpaid leads`);

    // 2. Immediately claim OPEN leads by marking them IN_PROGRESS so
    //    a concurrent or subsequent cron run can't re-fetch them.
    if (openLeads.length > 0) {
      await updateHubspotLeads(openLeads, 'IN_PROGRESS');
      console.log(
        `Claimed ${openLeads.length} open leads — marked IN_PROGRESS`
      );
    }

    // 3. Round-robin match ONLY the new OPEN leads.
    const contractorOpenLeadsMap = await matchLeads(openLeads);

    // 4. For IN_PROGRESS leads the contractor's company name is already
    //    stamped on the HubSpot contact. Look it up instead of
    //    re-running round-robin (which would re-increment zip counts
    //    and could re-route the lead to a different contractor).
    //
    //    Leads whose company is still unset never completed GHL sync —
    //    route them through matchLeads + handleOpenLeads so they get
    //    synced and billed (or land in the retry pool for next run).
    const { assigned: contractorUnpaidLeadsMap, unassigned: unsyncedLeads } =
      await resolveLeadsByCompany(unpaidLeads);

    if (unsyncedLeads.length > 0) {
      console.log(
        `${unsyncedLeads.length} IN_PROGRESS leads need GHL sync`
      );
    }
    const contractorUnsyncedLeadsMap = await matchLeads(unsyncedLeads);

    // 5. Process OPEN leads + unsynced IN_PROGRESS leads through GHL +
    //    HubSpot sync. Only leads whose GHL contact was created
    //    successfully make it into the billing set.
    const successfulOpenLeadsMap =
      await handleOpenLeads(contractorOpenLeadsMap);
    const successfulUnsyncedLeadsMap =
      await handleOpenLeads(contractorUnsyncedLeadsMap);

    // 6. Merge all three sets and charge.
    const mergedLeadsMap = mergeLeadsMaps(
      mergeLeadsMaps(successfulOpenLeadsMap, successfulUnsyncedLeadsMap),
      contractorUnpaidLeadsMap
    );

    await chargeForLeads(mergedLeadsMap);

    res.status(200).json({ message: 'Cron job executed successfully' });
  } catch (error) {
    console.error('Error executing cron job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// Lead fetching
// ---------------------------------------------------------------------------

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
        'company',
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

// ---------------------------------------------------------------------------
// Round-robin matching (OPEN leads only)
// ---------------------------------------------------------------------------

async function matchLeads(leads: any[]) {
  const contractorLeadsMap: { [key: string]: any[] } = {};

  for (const lead of leads) {
    try {
      const zip = lead.zip?.substring(0, 5);
      if (!zip) {
        console.warn(`Lead ${lead.id} has no zip code, skipping`);
        continue;
      }

      const contractors = await prisma.contractor.findMany({
        where: { zipCodes: { has: zip } },
        orderBy: { id: 'asc' },
      });

      if (contractors.length === 0) continue;

      const contractor = await prisma.$transaction(async (tx) => {
        const contractorIds = contractors.map((c) => c.id);

        const existingCounts = await tx.contractorZipCount.findMany({
          where: {
            zipCode: zip,
            contractorId: { in: contractorIds },
          },
        });

        const countMap = new Map(
          existingCounts.map((c) => [c.contractorId, c.assignedCount])
        );

        let bestContractor = contractors[0];
        let bestCount = countMap.get(contractors[0].id) ?? 0;

        for (let i = 1; i < contractors.length; i++) {
          const count = countMap.get(contractors[i].id) ?? 0;
          if (count < bestCount) {
            bestCount = count;
            bestContractor = contractors[i];
          }
        }

        await tx.contractorZipCount.upsert({
          where: {
            contractorId_zipCode: {
              contractorId: bestContractor.id,
              zipCode: zip,
            },
          },
          create: {
            contractorId: bestContractor.id,
            zipCode: zip,
            assignedCount: 1,
          },
          update: {
            assignedCount: { increment: 1 },
          },
        });

        return bestContractor;
      });

      if (!contractorLeadsMap[contractor.id]) {
        contractorLeadsMap[contractor.id] = [];
      }
      contractorLeadsMap[contractor.id].push(lead);
    } catch (error) {
      console.error(`Failed to match lead ${lead.id}, skipping:`, error);
      continue;
    }
  }

  return contractorLeadsMap;
}

// ---------------------------------------------------------------------------
// Company-name resolution (IN_PROGRESS leads only)
// ---------------------------------------------------------------------------

async function resolveLeadsByCompany(leads: any[]): Promise<{
  assigned: { [key: string]: any[] };
  unassigned: any[];
}> {
  const assigned: { [key: string]: any[] } = {};
  const unassigned: any[] = [];

  if (leads.length === 0) return { assigned, unassigned };

  const allContractors = await prisma.contractor.findMany();
  const companyMap = new Map(
    allContractors
      .filter((c) => c.company)
      .map((c) => [c.company!.toLowerCase(), c])
  );

  for (const lead of leads) {
    const companyName = lead.company?.trim();

    if (
      !companyName ||
      companyName.toLowerCase() === 'unknown company' ||
      companyName.toLowerCase() === 'roofs local'
    ) {
      console.log(
        `IN_PROGRESS lead ${lead.id} has no contractor assignment ` +
          `(company="${companyName}"), routing through GHL sync`
      );
      unassigned.push(lead);
      continue;
    }

    const contractor = companyMap.get(companyName.toLowerCase());

    if (!contractor) {
      console.warn(
        `IN_PROGRESS lead ${lead.id} has unrecognised company ` +
          `"${companyName}", routing through GHL sync`
      );
      unassigned.push(lead);
      continue;
    }

    if (!assigned[contractor.id]) {
      assigned[contractor.id] = [];
    }
    assigned[contractor.id].push(lead);
  }

  return { assigned, unassigned };
}

// ---------------------------------------------------------------------------
// Lead processing (GHL + HubSpot sync)
// ---------------------------------------------------------------------------

async function handleOpenLeads(contractorLeadsMap: { [key: string]: any[] }) {
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

      const ghlData = await createGHLContact(lead, contractor);
      if (ghlData) {
        await createGHLOpporunity(ghlData.contact.id, lead, contractor);

        // Stamp the contractor's company name AFTER GHL succeeds.
        // resolveLeadsByCompany reads this on billing retries, so it
        // must only be set once GHL sync is confirmed done.
        await updateHubspotCompany(lead, contractor);

        if (!successfulLeadsMap[contractorId]) {
          successfulLeadsMap[contractorId] = [];
        }
        successfulLeadsMap[contractorId].push(lead);
      } else {
        console.warn(
          `GHL contact creation failed for lead ${lead.id}, ` +
            `will retry on next run (lead stays IN_PROGRESS)`
        );

        // Undo the round-robin increment so the count stays accurate.
        const zip = lead.zip?.substring(0, 5);
        if (zip) {
          await prisma.contractorZipCount.update({
            where: {
              contractorId_zipCode: {
                contractorId: contractorId,
                zipCode: zip,
              },
            },
            data: { assignedCount: { decrement: 1 } },
          });
        }
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

// ---------------------------------------------------------------------------
// Billing (old-style atomic paymentIntent)
// ---------------------------------------------------------------------------

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

      // Mark leads as CONNECTED before charging so a concurrent run
      // won't pick them up. If the charge fails we revert to IN_PROGRESS.
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
          await updateHubspotLeads(leads, 'IN_PROGRESS');
          continue;
        }

        console.log(
          `Charged ${contractor.email} $${cost / 100} USD for ${leads.length} leads`
        );

        try {
          await sendEmail(contractor, leads);
        } catch (emailError) {
          console.error(
            `Email delivery failed for ${contractor.email}:`,
            emailError
          );
        }
      } catch (chargeError) {
        console.error(
          'Charge failed, reverting leads to IN_PROGRESS:',
          chargeError
        );
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

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HubSpot helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}