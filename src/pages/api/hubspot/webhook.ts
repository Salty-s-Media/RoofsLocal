import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);

interface WebhookData {
  total: number;
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
        plan?: string | null;
        job_status?: string | null;
        createdate?: string;
        lastmodifieddate?: string;
        zip: string | null;
        company?: string | null;
      };
    }
  ];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    // await new Promise(resolve => setTimeout(resolve, 5000));
    const { body } = req;

    console.log("Webhook received:", body[0]);
    const objectId: string = body[0].objectId;
    console.log("Object ID:", objectId);

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
        "zip",
      ],
    };

    try {
      console.log(postData);
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
      const data = await hubspotResponse.json();
      console.log("HubSpot response received:", data);

      if (data.total === 0) {
        throw new Error(`No contact found with hs_object_id: ${objectId}`);
      }
      const lead = data.results[0].properties;

      console.log("New lead data from webhook: ", lead);

      const zip = lead.zip;
      const contractor = await prisma.contractor.findFirst({
        where: {
          zipCodes: {
            has: zip,
          },
        },
      });

      const contractorKey = contractor?.hubspotKey;

      if (!contractor) {
        res
          .status(200)
          .json({
            message: `No contractor found for zip code: ${zip}, nothing done`,
          });
      }

      delete lead.createdate;
      delete lead.lastmodifieddate;

      lead.company = "Roofs Local";

      const createData = {
        properties: lead,
      };

      const createContactResponse = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${contractorKey}`,
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
      console.log("Contact created in HubSpot: ", createContactResult);

      await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts/batch/update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify({
            inputs: [
              {
                id: objectId,
                properties: {
                  hs_lead_status: "IN_PROGRESS",
                },
              },
            ],
          }),
        }
      );

      resend.emails.send({
        from: "Roofs Local <info@roofslocal.app>",
        to: contractor?.email ? [contractor.email] : [],
        subject: "Roofs Local: New Lead",
        text: `A new lead was just pushed to you hubspot account by Roofs Local! \n${lead.firstname} ${lead.lastname} - ${lead.email} - ${lead.phone} - ${lead.zip}`,
      });
    } catch (error) {
      console.error(
        `Error processing webhook data from HubSpot:`,
        objectId,
        error
      );
      res.status(500).send({ error: error });
      return;
    }

    res.status(200).json({ message: "Lead imported into contractor Hubspot" });
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
