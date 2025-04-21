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
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN as string;

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

    await handleOpenLeads(contractorOpenLeadsMap);

    const mergedLeadsMap = mergeLeadsMaps(
      contractorOpenLeadsMap,
      contractorUnpaidLeadsMap
    );

    const validatedLeadsMap = await validateLeads(mergedLeadsMap);

    await chargeForLeads(validatedLeadsMap);

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
  const hubspotResponse = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'hs_lead_status',
                operator: 'EQ',
                value: status,
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
      }),
    }
  );

  if (!hubspotResponse.ok) {
    const errorBody = await hubspotResponse.text();
    throw new Error(
      `Failed to get ${status} leads: ${hubspotResponse.status} - ${errorBody}`
    );
  }

  const data = await hubspotResponse.json();
  return data.results.map((result: any) => ({
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
      } else {
        leads.splice(leads.indexOf(lead), 1);
      }
    }
  }
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
      const cost = leads.length * contractor.pricePerLead;

      if (leads.length > 0) {
        const payment = await chargeContractor(
          contractor.stripeSessionId,
          cost
        );
        if (payment.status != 'succeeded') {
          console.error("Payment didn't process:", payment.status);
          continue;
        }
        console.log(
          `Charged ${contractor.email} ${cost / 100} USD for ${leads.length
          } leads`
        );
        // TOGGLE OFF
        // sendEmail(contractor, leads);
        await updateHubspotLeads(leads);
      }
    } catch (error) {
      console.error('Error charging contractor:', error);
    }
  }
}

async function chargeContractor(sessionId: string, amount: number) {
  // Retrieve the Session from the success URL, and charge customer;
  const currentSession = await stripe.checkout.sessions.retrieve(sessionId);
  const setupIntentId = currentSession.setup_intent;
  const customerId = currentSession.customer;

  // Retrieve the setup intent to get the payment method ID
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
  });

  return payment;
}

async function sendEmail(contractor: any, leads: any[]) {
  resend.emails.send({
    from: 'Roofs Local <info@roofslocal.app>', // TODO: Change for production
    to: [contractor.email],
    subject: 'Leads',
    text: `Attached are ${contractor.email}'s leads: ${leads.length
      } for zip codes ${contractor.zipCodes}. Charged ${(leads.length * contractor.pricePerLead) / 100
      } USD.`,
    attachments: [
      {
        filename: 'leads.csv',
        content: Buffer.from(json2csvParser.parse(leads)).toString('base64'), // Attach leads as CSV
      },
    ],
  });
}

async function updateHubspotLeads(leads: any[]) {
  const updateRequests = leads.map((lead) => ({
    id: lead.id,
    properties: { hs_lead_status: 'CONNECTED' },
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
  console.log('Updated HubSpot leads:', responseBody);
  return responseBody;
}

async function validateLeads(contractorLeadsMap: { [key: string]: any[] }): Promise<{ [key: string]: any[] }> {
  const validatedLeadsMap: { [key: string]: any[] } = {};

  for (const contractorId in contractorLeadsMap) {
    const leads = contractorLeadsMap[contractorId];
    const validLeads = leads.filter(async (lead) => {
      const phoneNumber = lead.phone
      console.log(`Validating phone number: ${phoneNumber}`);

      // has to meet +1 123 123 1234 EIC standard.
      let phn: string = phoneNumber;

      const formattedPhone = phn.startsWith('+')
        ? phn.substring(2).replace(/[\(\)\-]/g, '')
        : phn.replace(/[\(\)\-]/g, '');

      const phoneNumberPattern =
        /^(\+1\s)??(1\s)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

      if (phoneNumberPattern.test(formattedPhone))
        try {
          const response = await axios.get(
            `https://lookups.twilio.com/v2/PhoneNumbers/${formattedPhone}?Fields=line_type_intelligence`,
            {
              auth: {
                username: TWILIO_ACCOUNT_SID,
                password: TWILIO_AUTH_TOKEN,
              },
            }
          );

          if (response.data) {
            const result = response.data;

            if (result.country_code === 'US') {
              if (
                result.line_type_intelligence &&
                result.line_type_intelligence.carrier_name
              ) {
                console.log(
                  `Customer has ${result.line_type_intelligence.carrier_name} as their carrier.`
                );
                console.log('Phone number is valid');
                return true;
              }
            }
          } else {
            console.log('Could not validate phone number');
            return false;
          }
        } catch (error) {
          console.error('Lookup error:', error);
          return false
        }
    });

    if (validLeads.length > 0) {
      validatedLeadsMap[contractorId] = validLeads;
    }
  }

  return validatedLeadsMap;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
