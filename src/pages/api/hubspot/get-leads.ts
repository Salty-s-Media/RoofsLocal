import { NextApiRequest, NextApiResponse } from "next";

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
  if (req.method === "POST") {
    const { zipCodes } = req.body;

    // Initialize an array to hold all results
    let allResults: Contact[] = [];

    // Iterate over each zip code
    for (const zipCode of zipCodes) {
      // Construct the filter group for the current zip code
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

        // Filter first by OPEN leads for ZIP
        const filteredResults = data.results.filter(
          (contact: HSLead) => contact.properties.hs_lead_status === "OPEN"
        );

        // Map the filtered results to the desired output format
        const results = filteredResults.map((contact: Contact) => ({
          id: contact.id,
          ...contact.properties,
        }));

        // Add the results to the allResults array
        allResults = [...allResults, ...results];
      } catch (error) {
        console.error(
          `Error processing zip code ${zipCode} from HubSpot:`,
          error
        );
      }
    }

    // Prepare the response
    const totalCount = allResults.length;
    const ids = allResults.map((contact) => contact.id);
    const customerInfo = allResults;

    res.status(200).json({
      count: totalCount,
      ids: ids,
      customerInfo: customerInfo,
    });
  } else {
    res.status(405).send({ message: "Method Not Allowed" });
  }
}
