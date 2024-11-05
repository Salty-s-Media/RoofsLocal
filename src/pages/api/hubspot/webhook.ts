import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { NextApiRequest, NextApiResponse } from "next";
import { format } from "path";

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const resend = new Resend(process.env.RESEND_API_KEY);
const GHL_API_KEY = process.env.GHL_API_KEY;
const saltysMediaNumber = process.env.GHL_SALTYS_MEDIA_PHONE_NUMBER;

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

      if (contractor?.hubspotKey != null) {
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
      }

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
 
      const phoneNumber = contractor?.phone;
      const formattedPhoneNumber = phoneNumber && !phoneNumber.startsWith('+') ? `+1${phoneNumber}` : phoneNumber;
      
      const ghlResponse = await fetch("https://services.leadconnectorhq.com/contacts/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${contractor?.ghlKey}`,
          version: "2021-07-28"
        },
        body: JSON.stringify({
          firstName: lead.firstname,
          lastName: lead.lastname,
          email: lead.email,
          phone: formattedPhoneNumber,
          postalCode: lead.zip,
          locationId: contractor?.ghlLocationId ? contractor.ghlLocationId : "",
        }),
      });
      console.log("GHL create response: ", ghlResponse);
      const ghlResponse2 = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GHL_API_KEY}`,
          version: "2021-04-15"
        },
        body: JSON.stringify({
          type: "SMS",
          contactId: contractor?.ghlContactId ? contractor.ghlContactId : "",
          message: `A new lead was just pushed to you hubspot account by Roofs Local! \n${lead.firstname} ${lead.lastname} - ${lead.email} - ${lead.phone} - ${lead.zip}`,
          fromNumber: saltysMediaNumber,
          toNumber: formattedPhoneNumber
        }),
      });
      console.log("GHL text response: ", ghlResponse2);
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
