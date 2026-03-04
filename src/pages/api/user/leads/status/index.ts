import { NextApiRequest, NextApiResponse } from "next";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contactId, revenue } = req.body;

  if (!contactId || revenue === undefined) {
    return res.status(400).json({ error: "contactId and revenue required" });
  }

  try {
    const hubspotResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            lead_revenue: String(revenue),
          },
        }),
      }
    );

    if (!hubspotResponse.ok) {
      const errorBody = await hubspotResponse.text();
      console.error(
        `HubSpot PATCH error for contact "${contactId}": status=${hubspotResponse.status} body=${errorBody}`
      );
      return res.status(hubspotResponse.status).json({ error: "Failed to update HubSpot contact" });
    }

    const data = await hubspotResponse.json();
    return res.status(200).json({ success: true, contact: data });
  } catch (error) {
    console.error("Error updating lead revenue:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}