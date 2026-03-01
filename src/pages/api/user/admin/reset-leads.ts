import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

/**
 * POST /api/user/admin/reset-leads
 *
 * Resets ALL leads across ALL contractors to status = NEW_LEAD, revenue = 0.
 * This is a one-time migration endpoint for pipeline reset.
 *
 * Paginates through all contractors, fetches their leads from HubSpot,
 * and batch-updates each lead to NEW_LEAD + revenue 0.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const contractors = await prisma.contractor.findMany({
      select: { company: true },
    });

    let totalUpdated = 0;

    for (const contractor of contractors) {
      const leadIds = await fetchAllLeadIds(contractor.company);
      if (leadIds.length === 0) continue;

      // Batch update in chunks of 100 (HubSpot limit)
      for (let i = 0; i < leadIds.length; i += 100) {
        const chunk = leadIds.slice(i, i + 100);
        await batchResetLeads(chunk);
        totalUpdated += chunk.length;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Reset ${totalUpdated} leads to NEW_LEAD with revenue 0`,
      totalUpdated,
    });
  } catch (error) {
    console.error("Error resetting leads:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function fetchAllLeadIds(companyName: string): Promise<string[]> {
  const ids: string[] = [];
  let after: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            { propertyName: "company", operator: "EQ", value: companyName },
          ],
        },
      ],
      properties: ["hs_lead_status"],
      limit: 100,
    };
    if (after) body.after = after;

    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) break;

    const data = await response.json();
    for (const result of data.results) {
      ids.push(result.id);
    }
    after = data.paging?.next?.after;
  } while (after);

  return ids;
}

async function batchResetLeads(leadIds: string[]): Promise<void> {
  const inputs = leadIds.map((id) => ({
    id,
    properties: {
      hs_lead_status: "NEW_LEAD",
      lead_revenue: "0",
    },
  }));

  const response = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts/batch/update",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
      },
      body: JSON.stringify({ inputs }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Batch reset failed: ${response.status} - ${errorBody}`);
  }
}
