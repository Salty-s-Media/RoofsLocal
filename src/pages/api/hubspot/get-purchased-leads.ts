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

interface ZipCodes {
  zipCodes: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    console.log("Getting purchased leads")
    let zipCodes: string[] = [];
    try {
      if (typeof req.body === 'string') {
        const parsedBody = JSON.parse(req.body);
        zipCodes = parsedBody.zipCodes;
      } else {
        zipCodes = req.body.zipCodes;
      }
    } catch (error) {
      console.error("Error parsing JSON:", error);
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    console.log("Zip Codes: ", zipCodes);

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
              {
                propertyName: "hs_lead_status",
                operator: "EQ",
                value: "CONNECTED",
              },
            ],
          },
        ],
        properties: [
          "firstname",
          "lastname",
          "email",
          "phone",
          "job_status",
          "plan",
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
        data.results.map((contact: Contact) => { console.log(contact['properties']) });
        console.log("HubSpot Response: ", data);

        // Map the filtered results to the desired output format
        const results = data.results.map((contact: Contact) => ({
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
