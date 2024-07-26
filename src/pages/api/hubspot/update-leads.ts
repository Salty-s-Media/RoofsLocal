// pages/api/updateContacts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

interface Contact {
  id: string;
  properties: {
    owner: string;
    hs_lead_status: string;
  };
}

interface REQ {
  company: string;
  idResults: string[];
}

async function batchUpdateContacts(
  contactIds: string[],
  propertiesToUpdate: Partial<Contact>
) {
  const updateRequests = contactIds.map((id) => ({
    id,
    properties: propertiesToUpdate.properties,
  }));

  const requestBody = {
    inputs: updateRequests,
  };

  try {
    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/batch/update",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HUBSPOT_API_KEY}`, 
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const resp = await response.text();
      throw new Error(
        `Batch update failed with status ${response.status}: ${resp}`
      );
    }

    const responseBody = await response.json();

    return responseBody;
  } catch (error) {
    console.error("Error during batch update:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "PATCH") {
    try {
      let { company, idResults }: REQ = req.body;

      if (!idResults) {
        res.status(500).json({ error: "Failed to receive a zip" });
        return;
      }

      console.log("Contact IDs: ", idResults);
      const propertiesToUpdate = {
        properties: {
          owner: `${company}`,
          hs_lead_status: "CONNECTED",
        },
      };

      const data = await batchUpdateContacts(idResults, propertiesToUpdate);

      res.status(200).json({ message: "The update worked" });
    } catch (error) {
      console.error("Error during operation:", error);
      res.status(500).json({ error: "Failed to update contacts' owner" });
    }
  } else {
    // Handle any other HTTP method
    res.setHeader("Allow", ["PATCH"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
