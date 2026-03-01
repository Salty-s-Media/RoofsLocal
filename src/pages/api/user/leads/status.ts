import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
 * Updates a lead's dashboard status and/or revenue in the LOCAL database.
 * This NEVER touches HubSpot — dashboard pipeline is fully decoupled.
 *
 * Body: { contactId: string, contractorId: string, status?: string, revenue?: number }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { contactId, contractorId, status, revenue } = req.body;

  if (!contactId || typeof contactId !== "string") {
    return res.status(400).json({ error: "contactId is required" });
  }

  if (!contractorId || typeof contractorId !== "string") {
    return res.status(400).json({ error: "contractorId is required" });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` });
  }

  // Enforce revenue constraints at the API boundary
  if (status === "SOLD" && (revenue === undefined || revenue === null || revenue <= 0)) {
    return res.status(400).json({ error: "Revenue must be greater than 0 when status is SOLD" });
  }

  if (status && status !== "SOLD" && revenue !== undefined && revenue !== null && revenue > 0) {
    return res.status(400).json({ error: "Revenue must be 0 when status is not SOLD" });
  }

  // Build the update data
  const data: { status?: string; revenue?: number } = {};

  if (status) {
    data.status = status;
    if (status !== "SOLD") {
      data.revenue = 0;
    }
  }

  if (revenue !== undefined && revenue !== null) {
    data.revenue = revenue;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  try {
    // Upsert: create the row if it doesn't exist yet, update if it does
    const updated = await prisma.leadStatus.upsert({
      where: {
        hubspotContactId_contractorId: {
          hubspotContactId: contactId,
          contractorId,
        },
      },
      update: data,
      create: {
        hubspotContactId: contactId,
        contractorId,
        status: data.status ?? "NEW_LEAD",
        revenue: data.revenue ?? 0,
      },
    });

    return res.status(200).json({ success: true, leadStatus: updated });
  } catch (error) {
    console.error("Error updating lead status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
