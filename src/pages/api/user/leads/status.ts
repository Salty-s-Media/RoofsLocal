import { NextApiRequest, NextApiResponse } from "next";

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

const VALID_STATUSES = [
  "NEW_LEAD",
  "APPOINTMENT_SCHEDULED",
  "APPOINTMENT_COMPLETED",
  "NOT_SOLD",
  "SOLD",
  "DEAD",
];

/**
 * PATCH /api/user/leads/status
 *
 * Updates a HubSpot contact's hs_lead_status and/or lead_revenue.
 * When status changes away from SOLD, revenue is automatically reset to 0.
 *
 * Body: { contactId: string, status?: string, revenue?: number }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { contactId, status, revenue } = req.body;

  if (!contactId || typeof contactId !== "string") {
    return res.status(400).json({ error: "contactId is required" });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` });
  }

  const properties: Record<string, string> = {};

  if (status) {
    properties.hs_lead_status = status;
    // If changing to any status other than SOLD, reset revenue to 0
    if (status !== "SOLD") {
      properties.lead_revenue = "0";
    }
  }

  if (revenue !== undefined && revenue !== null) {
    properties.lead_revenue = String(revenue);
  }

  if (Object.keys(properties).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
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
        body: JSON.stringify({ properties }),
      }
    );

    if (!hubspotResponse.ok) {
      const errorBody = await hubspotResponse.text();
      console.error(
        `HubSpot update failed for contact ${contactId}: ${hubspotResponse.status} - ${errorBody}`
      );
      return res
        .status(hubspotResponse.status)
        .json({ error: "Failed to update HubSpot contact" });
    }

    const updated = await hubspotResponse.json();
    return res.status(200).json({ success: true, contact: updated });
  } catch (error) {
    console.error("Error updating HubSpot contact:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}