import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

interface Contact {
  id: string;
  properties: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
  };
}
interface HSLead {
  id: string;
  properties: {
    hs_lead_status: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    const { id } = req.query;

    if (typeof id !== "string") {
      res.status(400).json({ error: "Invalid contractor ID" });
      return;
    }

    try {
      const contractor = await prisma.contractor.findUnique({
        where: { id },
        select: { boughtZipCodes: true },
      });

      if (!contractor) {
        res.status(404).json({ error: "Contractor not found" });
        return;
      }

      const { boughtZipCodes } = contractor;

      let allResults: Contact[] = [];

      for (const zipCode of boughtZipCodes) {
        const postData = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "zip",
                  operator: "EQ",
                  value: zipCode,
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

          const data = await hubspotResponse.json();

          const filteredResults = data.results.filter(
            (contact: HSLead) =>
              contact.properties.hs_lead_status === "OPEN"
          );

          const results = filteredResults.map((contact: Contact) => ({
            id: contact.id,
            ...contact.properties,
          }));

          allResults = [...allResults, ...results];
        } catch (error) {
          console.error(
            `Error processing zip code ${zipCode} from HubSpot:`,
            error
          );
        }
      }

      const totalCount = allResults.length;
      const ids = allResults.map((contact) => contact.id);
      const customerInfo = allResults;

      res.status(200).json({
        count: totalCount,
        ids: ids,
        customerInfo: customerInfo,
      });
    } catch (error) {
      console.error("Error fetching contractor data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).send({ message: "Method Not Allowed" });
  }
}
