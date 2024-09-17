import { NextApiRequest, NextApiResponse } from 'next';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const CONTRACTOR_API_KEY = process.env.DEMO_HUBSPOT_API_KEY;

interface WebhookData {
  total: number,
  results: [
    {
      id: string;
      properties: {
        id: string;
        hs_lead_status: string;
        firstname: string;
        lastname: string;
        email: string;
        phone: string;
        plan: string | null;
        job_status: string | null;
        createdate?: string;
        lastmodifieddate?: string;
        zip: string | null;
        company: string | null;
      }
    }
  ]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { body } = req;

    console.log('Webhook received:', body[0]);
    const objectId: string = body[0].objectId;

    const postData = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hs_object_id",
              operator: "EQ",
              value: objectId,
            },
          ],
        },
      ],
      properties: [
        "id",
        "hs_lead_status",
        "firstname",
        "lastname",
        "email",
        "phone",
        // "plan",
        // "job_status",
        "contact_owner",
        "zip"
      ],
    };

    try {
      const hubspotResponse = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify(postData),
        }
      );

      if (!hubspotResponse.ok) {
        const errorBody = await hubspotResponse.text();
        throw new Error(
          `HubSpot API request failed with status ${hubspotResponse.status}: ${errorBody}`
        );
      }

      const data: WebhookData = await hubspotResponse.json();
      console.log(data);
      if (data.total === 0) {
        throw new Error(`No contact found with hs_object_id: ${objectId}`);
      }
      const lead = data.results[0].properties;

      console.log('New lead data from webhook: ', lead);
      
      delete lead.createdate;
      delete lead.lastmodifieddate;

      lead.company = "Roofs Local";

      const createData = {
        properties: lead
      }

      console.log(createData)

      const createContactResponse = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CONTRACTOR_API_KEY}`,
          },
          body: JSON.stringify(createData),
        }
      );

      if (!createContactResponse.ok) {
        const errorBody = await createContactResponse.text();
        throw new Error(
          `HubSpot API request to create contact failed with status ${createContactResponse.status}: ${errorBody}`
        );
      }

      const createContactResult = await createContactResponse.json();
      console.log('Contact created in HubSpot: ', createContactResult);
    } catch (error) {
      console.error(
        `Error processing webhook data from HubSpot:`,
        body.objectId, error
      );
    }

    res.status(200).json({ message: 'Webhook received successfully' });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}